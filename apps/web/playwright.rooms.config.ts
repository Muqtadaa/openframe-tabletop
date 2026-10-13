import { generateTicketKeys, type MintCrypto } from '@openframe/collab/tickets-mint'
import { defineConfig, devices } from '@playwright/test'

const isCI = process.env['CI'] !== undefined
const chromiumPath = process.env['OPENFRAME_CHROMIUM_PATH']
const launchOverrides =
  chromiumPath === undefined ? {} : { launchOptions: { executablePath: chromiumPath } }

const ROOM_SERVER = 'http://127.0.0.1:8787'
const PAUSED_SERVER = 'http://127.0.0.1:8788'
const TICKET_SERVER = 'http://127.0.0.1:8789'

/**
 * A fresh signing key for every run, made here so that the room server and the
 * spec that mints tickets share it without it being written anywhere. The room
 * is given only the PUBLIC half, as a deployment would be; the private half
 * travels to the spec in the environment of this one test run.
 *
 * This file is loaded again in every worker the runner starts, so it must come
 * to the same answer each time: the first load makes the key and records it in
 * the environment the workers inherit, and every later load reads it back.
 */
const subtle = crypto.subtle as unknown as MintCrypto & {
  exportKey(format: 'pkcs8' | 'jwk', key: unknown): Promise<ArrayBuffer & { x?: string }>
  importKey(
    format: 'pkcs8',
    key: Uint8Array,
    algorithm: 'Ed25519',
    extractable: boolean,
    usages: string[],
  ): Promise<unknown>
}
async function ticketPublicKey(): Promise<string> {
  const recorded = process.env['OPENFRAME_TICKET_KEY']
  if (recorded === undefined) {
    const made = await generateTicketKeys(subtle)
    process.env['OPENFRAME_TICKET_KEY'] = Buffer.from(
      await subtle.exportKey('pkcs8', made.privateKey),
    ).toString('base64')
    return made.publicKey
  }
  const key = await subtle.importKey(
    'pkcs8',
    Uint8Array.from(Buffer.from(recorded, 'base64')),
    'Ed25519',
    true,
    ['sign'],
  )
  // The public half of an Ed25519 key is the `x` of its JWK, which is the raw key, base64url.
  const jwk = (await subtle.exportKey('jwk', key)) as unknown as { x: string }
  return jwk.x
}
const ticketKeys = { publicKey: await ticketPublicKey() }

/**
 * A production build, served as the host serves it.
 *
 * Every other spec here runs against the dev server, which carries no Content
 * Security Policy — the policy is written into the page at build time, from
 * the build's own configuration. So a policy that blocked the room's socket
 * or the splash's scripts would pass this whole suite and break the live site.
 * `content-security.spec.ts` is the one spec that opens this origin instead.
 */
const PRODUCTION_BUILD = 'http://127.0.0.1:5198'
const BUILD_DIR = 'node_modules/.openframe-csp-build'

/**
 * The collaboration suite, kept separate because it needs a server.
 *
 * `pnpm test:e2e` must stay a thing anybody can run from a clean checkout with
 * no account anywhere — so the room tests, which need `wrangler` to boot a real
 * Durable Object, live here and run under `pnpm test:rooms`.
 *
 * What they prove is the phase's own "done when": two browser windows on the
 * same URL editing the same board. Everything below that line is covered
 * in-process by `packages/collab`; this is the part only a real socket can
 * answer.
 */
export default defineConfig({
  testDir: './e2e-rooms',
  // Two browsers in one test, talking to one room: running files in parallel
  // would have them competing for the same wrangler instance.
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    ...launchOverrides,
  },
  webServer: [
    {
      // `--local` is the point: a real workerd with a real SQLite-backed
      // Durable Object, and no Cloudflare account involved. History runs on
      // seconds rather than minutes, so `history.spec.ts` sees a version
      // without waiting two minutes for editing to settle. The document ceiling is
      // 10 MiB here rather than 24, so `limits.spec.ts` can reach it with a board
      // a browser can hold; the largest board any other spec makes is 6 MB.
      command:
        'pnpm --filter @openframe/rooms exec wrangler dev --port 8787 --local --var HISTORY_TIMING:1000,3000 --var DOCUMENT_CEILING_BYTES:10485760',
      url: `${ROOM_SERVER}/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      // A second room server with the kill switch thrown, for `paused.spec.ts`.
      // Its own state directory and inspector port, so the two workerds do not
      // share storage or fight over a port.
      command:
        'pnpm --filter @openframe/rooms exec wrangler dev --port 8788 --inspector-port 9230 --local --persist-to .wrangler/paused --var ROOMS_PAUSED:1',
      url: `${PAUSED_SERVER}/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      // A third, in TICKET MODE, for `t004-partitions.spec.ts` (ADR T004): every
      // connection needs a signed ticket naming the room it knocks on.
      command: `pnpm --filter @openframe/rooms exec wrangler dev --port 8789 --inspector-port 9231 --local --persist-to .wrangler/tickets --var TICKET_PUBLIC_KEYS:${ticketKeys.publicKey}`,
      url: `${TICKET_SERVER}/health`,
      // Never reused: the key is new every run, and a server left from the last
      // run would hold the old one and refuse every ticket.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm vite --port 5199 --host 127.0.0.1',
      url: 'http://127.0.0.1:5199',
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: { VITE_COLLAB_URL: 'ws://127.0.0.1:8787' },
    },
    {
      command: `pnpm vite build --outDir ${BUILD_DIR} --emptyOutDir && pnpm vite preview --outDir ${BUILD_DIR} --port 5198 --strictPort --host 127.0.0.1`,
      url: PRODUCTION_BUILD,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: { VITE_COLLAB_URL: 'ws://127.0.0.1:8787' },
    },
  ],
})
