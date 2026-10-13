import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Nothing in this repository can reach OpenFrame's own deployment.
 *
 * Tabletop began as a copy of OpenFrame, whose committed configuration named
 * OpenFrame's live Supabase project and rooms Worker. A checkout of the copy
 * would have signed people into, and written boards to, somebody else's
 * production. These are public identifiers rather than secrets, which is why
 * only a test stops them coming back: nothing about them looks wrong in a diff.
 *
 * The names are assembled from pieces so that this file is not itself a hit.
 * `docs/` is the historical record and says what it says. The MCP
 * server, which carried the same constants, has been deleted.
 */
const LIVE_IDENTIFIERS = [
  ['nayxpmxp', 'ornsjmmmedmh'],
  ['muqdara95', '.workers.dev'],
  ['sb_publishable_', 'B5U44eQkoeAl8'],
].map((pieces) => pieces.join(''))

const ROOT = resolve(process.cwd(), '../..')
const SCANNED = ['apps/web', 'apps/rooms', 'packages', 'tools', '.github', 'supabase']
const SKIPPED = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', '.wrangler'])
const TEXT = /\.(ts|tsx|js|cjs|mjs|json|toml|yml|yaml|md|css|html|sql|env)$|(^|\/)\.env$/

function files(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (SKIPPED.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...files(path))
    else if (TEXT.test(path)) out.push(path)
  }
  return out
}

describe('the repository is detached from OpenFrame’s deployment', () => {
  it('scans a real set of files', () => {
    const scanned = SCANNED.flatMap((dir) => files(join(ROOT, dir)))
    expect(scanned.length).toBeGreaterThan(300)
    expect(scanned.some((path) => path.endsWith('apps/web/.env'))).toBe(true)
    expect(scanned.some((path) => path.endsWith('apps/rooms/wrangler.toml'))).toBe(true)
  })

  it('names none of OpenFrame’s live identifiers', () => {
    const hits: string[] = []
    for (const path of SCANNED.flatMap((dir) => files(join(ROOT, dir)))) {
      const text = readFileSync(path, 'utf8')
      for (const id of LIVE_IDENTIFIERS) {
        if (text.includes(id)) hits.push(`${relative(ROOT, path)} names ${id.slice(0, 6)}…`)
      }
    }
    expect(hits).toEqual([])
  })
})
