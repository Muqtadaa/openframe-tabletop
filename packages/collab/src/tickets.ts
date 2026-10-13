/**
 * A ticket: who may be in WHICH room, signed by whoever knows the game.
 *
 * The room does not know who anybody is (ADR 0016) and must not call out to
 * find out (T011: a network dependency in the admission path of an object whose
 * allowance is a daily budget). So membership is decided where the membership
 * is, and the answer is handed to the person as a short-lived signed note the
 * room can check with nothing but a public key.
 *
 * A ticket names a ROOM, not a tier. "The table" and "the GM's room" are two
 * ordinary rooms, and a person's tickets are simply the rooms they may enter:
 * a player holds one, a GM holds two. The room has no idea any of this means
 * anything, which is what keeps it the schema-agnostic relay it has always been.
 *
 * Ed25519, so the room holds only a PUBLIC key. A leaked Worker cannot mint a
 * ticket, and the private key lives only where tickets are made.
 *
 * Wire form: `v1.<payload>.<signature>`, both base64url. The signature covers
 * the text `v1.<payload>` exactly as sent, never a re-encoding of the claims, so
 * there is no canonical form to disagree about.
 *
 * Pure and runtime-neutral: Web Crypto is injected, so the same code runs in
 * Node (the tests) and in workerd (the room).
 */
import type { RoomRole } from './protocol.js'

/**
 * The part of Web Crypto this needs, stated structurally.
 *
 * This package is typed for neither the DOM nor Node nor the Workers runtime,
 * and the code is the same in all three, so it names what it calls rather than
 * borrowing one runtime's type for it. `crypto.subtle` satisfies it everywhere.
 */
export interface TicketKey {
  readonly type: string
}
export interface TicketCrypto {
  importKey(
    format: 'raw',
    keyData: Uint8Array,
    algorithm: 'Ed25519',
    extractable: boolean,
    usages: string[],
  ): Promise<TicketKey>
  verify(
    algorithm: 'Ed25519',
    key: TicketKey,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean>
}

export interface TicketClaims {
  /** The room this ticket opens, exactly as the room knows itself. */
  readonly room: string
  /** What the holder may do there. */
  readonly role: RoomRole
  /** Who the holder is. Never used to decide anything in the room; it is for logs and for the mint. */
  readonly sub: string
  /** Issued at, seconds since the epoch. */
  readonly iat: number
  /** Expires, seconds since the epoch. */
  readonly exp: number
}

const VERSION = 'v1'
/** Longer than any real ticket; refuses a megabyte of garbage before parsing it. */
export const MAX_TICKET_CHARS = 1024
/** A ticket lives an hour at most, whatever the mint says: revocation is expiry, so the ceiling is the room's. */
export const MAX_TICKET_LIFETIME_S = 60 * 60
/** How far apart two honest clocks may be. */
export const TICKET_SKEW_S = 60

export type TicketVerdict =
  { readonly ok: true; readonly claims: TicketClaims } | { readonly ok: false }

/** Just the bytes of a base64url string, or null if it is not one. */
export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null
  const padded =
    text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The text a signature covers. */
export const signingInput = (payload: string): string => `${VERSION}.${payload}`

function readClaims(payload: string): TicketClaims | null {
  const bytes = fromBase64Url(payload)
  if (bytes === null) return null
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes))
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const claims = value as Record<string, unknown>
  const { room, role, sub, iat, exp } = claims
  if (typeof room !== 'string' || room === '') return null
  // A role this build does not know grants nothing: never fall through to editor.
  if (role !== 'editor' && role !== 'viewer') return null
  if (typeof sub !== 'string') return null
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return null
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null
  return { room, role, sub, iat, exp }
}

/**
 * The public keys a room accepts, from the setting that carries them: raw
 * 32-byte Ed25519 keys, base64url, separated by commas. More than one so a key
 * can be rotated without a moment when nobody can get in.
 */
export async function importPublicKeys(
  setting: string | undefined,
  subtle: TicketCrypto,
): Promise<TicketKey[]> {
  const keys: TicketKey[] = []
  for (const part of (setting ?? '').split(',')) {
    const bytes = fromBase64Url(part.trim())
    if (bytes?.length !== 32) continue
    try {
      keys.push(await subtle.importKey('raw', bytes, 'Ed25519', false, ['verify']))
    } catch {
      // A key the runtime will not import is no key; the room then admits no one.
    }
  }
  return keys
}

/**
 * Whether this ticket opens THIS room right now.
 *
 * Every refusal is the same answer: a caller learns nothing about which part
 * failed, so a forged ticket cannot be refined by probing. `room` is the
 * room's own id, never taken from the ticket or the address, and `now` is the
 * room's clock.
 */
export async function verifyTicket(
  raw: string | null,
  keys: readonly TicketKey[],
  room: string,
  nowMs: number,
  subtle: TicketCrypto,
): Promise<TicketVerdict> {
  const refused: TicketVerdict = { ok: false }
  if (raw === null || raw.length === 0 || raw.length > MAX_TICKET_CHARS) return refused
  const parts = raw.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) return refused
  const [, payload, signature] = parts as [string, string, string]

  const signed = fromBase64Url(signature)
  if (signed?.length !== 64) return refused

  const message = new TextEncoder().encode(signingInput(payload))
  let genuine = false
  for (const key of keys) {
    try {
      // Every key is tried and none short-circuits the work done on a failure.
      genuine = (await subtle.verify('Ed25519', key, signed, message)) || genuine
    } catch {
      // A malformed signature for this key: not genuine, and not an error to surface.
    }
  }
  if (!genuine) return refused

  // Only a signed payload is read at all.
  const claims = readClaims(payload)
  if (claims === null) return refused
  if (claims.room !== room) return refused

  const now = nowMs / 1000
  if (claims.exp < claims.iat || claims.exp - claims.iat > MAX_TICKET_LIFETIME_S) return refused
  if (now > claims.exp + TICKET_SKEW_S) return refused
  if (now < claims.iat - TICKET_SKEW_S) return refused

  return { ok: true, claims }
}

/** Whether an already admitted ticket still stands, for the room to ask of a live socket. */
export function ticketExpired(claims: Pick<TicketClaims, 'exp'>, nowMs: number): boolean {
  return nowMs / 1000 > claims.exp + TICKET_SKEW_S
}
