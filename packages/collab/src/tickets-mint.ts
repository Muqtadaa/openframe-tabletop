/**
 * Making a ticket. NOT used by the room, which only verifies.
 *
 * The real minter is a Supabase function in Phase 1, running where membership
 * is and holding the private key; it cannot import this workspace, so the wire
 * form in `tickets.ts` is the contract and this is its reference. Here for the
 * tests, and so the format is exercised in both directions by the same code.
 */
import { signingInput, toBase64Url, type TicketClaims, type TicketKey } from './tickets.js'

/** The signing half of Web Crypto, stated structurally (see `TicketCrypto`). */
export interface MintCrypto {
  generateKey(
    algorithm: 'Ed25519',
    extractable: boolean,
    usages: string[],
  ): Promise<{ readonly privateKey: TicketKey; readonly publicKey: TicketKey }>
  exportKey(format: 'raw', key: TicketKey): Promise<ArrayBuffer>
  sign(algorithm: 'Ed25519', key: TicketKey, data: Uint8Array): Promise<ArrayBuffer>
}

export async function generateTicketKeys(subtle: MintCrypto): Promise<{
  readonly privateKey: TicketKey
  /** The raw public key as the room's setting carries it. */
  readonly publicKey: string
}> {
  const pair = await subtle.generateKey('Ed25519', true, ['sign', 'verify'])
  const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey))
  return { privateKey: pair.privateKey, publicKey: toBase64Url(raw) }
}

export async function mintTicket(
  claims: TicketClaims,
  privateKey: TicketKey,
  subtle: MintCrypto,
): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await subtle.sign(
    'Ed25519',
    privateKey,
    new TextEncoder().encode(signingInput(payload)),
  )
  return `${signingInput(payload)}.${toBase64Url(new Uint8Array(signature))}`
}
