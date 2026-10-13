import { describe, expect, it } from 'vitest'

import {
  importPublicKeys,
  MAX_TICKET_CHARS,
  MAX_TICKET_LIFETIME_S,
  TICKET_SKEW_S,
  ticketExpired,
  toBase64Url,
  verifyTicket,
  type TicketClaims,
} from './tickets.js'
import { generateTicketKeys, mintTicket, type MintCrypto } from './tickets-mint.js'

/**
 * A ticket opens one room, for a while, for somebody the mint vouched for.
 *
 * Every refusal is the same answer, so each case here is a way of being turned
 * away rather than a message. The room checks nothing but a public key, and the
 * private one is generated here and goes nowhere.
 */
const subtle = crypto.subtle as unknown as Parameters<typeof generateTicketKeys>[0] &
  Parameters<typeof importPublicKeys>[1]
const NOW = 1_800_000_000_000
const ROOM = 'scene_abc_table'

const claims = (over: Partial<TicketClaims> = {}): TicketClaims => ({
  room: ROOM,
  role: 'editor',
  sub: 'user_1',
  iat: NOW / 1000 - 10,
  exp: NOW / 1000 + 600,
  ...over,
})

async function setup() {
  const mint = await generateTicketKeys(subtle)
  const keys = await importPublicKeys(mint.publicKey, subtle)
  const make = (over: Partial<TicketClaims> = {}) =>
    mintTicket(claims(over), mint.privateKey, subtle)
  const check = (ticket: string | null, room = ROOM, at = NOW) =>
    verifyTicket(ticket, keys, room, at, subtle)
  return { mint, keys, make, check }
}

describe('a genuine ticket', () => {
  it('opens the room it names, with the role it carries', async () => {
    const { make, check } = await setup()
    expect(await check(await make())).toEqual({ ok: true, claims: claims() })
    expect(await check(await make({ role: 'viewer' }))).toMatchObject({
      ok: true,
      claims: { role: 'viewer' },
    })
  })

  it('is accepted a little after it expires and a little before it starts, for clocks that differ', async () => {
    const { make, check } = await setup()
    const ticket = await make()
    expect((await check(ticket, ROOM, (claims().exp + TICKET_SKEW_S - 1) * 1000)).ok).toBe(true)
    expect((await check(ticket, ROOM, (claims().iat - TICKET_SKEW_S + 1) * 1000)).ok).toBe(true)
  })
})

describe('a ticket that is refused', () => {
  it('names another room: a table ticket does not open the GM room', async () => {
    const { make, check } = await setup()
    expect((await check(await make(), 'scene_abc_gm')).ok).toBe(false)
    expect((await check(await make({ room: 'scene_abc_gm' }))).ok).toBe(false)
  })

  it('has expired, or is not yet valid', async () => {
    const { make, check } = await setup()
    const ticket = await make()
    expect((await check(ticket, ROOM, (claims().exp + TICKET_SKEW_S + 1) * 1000)).ok).toBe(false)
    expect((await check(ticket, ROOM, (claims().iat - TICKET_SKEW_S - 1) * 1000)).ok).toBe(false)
  })

  it('lives longer than the room allows, however it was signed', async () => {
    const { make, check } = await setup()
    const iat = NOW / 1000
    const long = await make({ iat, exp: iat + MAX_TICKET_LIFETIME_S + 1 })
    expect((await check(long)).ok).toBe(false)
    const ok = await make({ iat, exp: iat + MAX_TICKET_LIFETIME_S })
    expect((await check(ok)).ok).toBe(true)
    expect((await check(await make({ iat, exp: iat - 1 }))).ok).toBe(false)
  })

  it('was signed by a key the room does not hold', async () => {
    const { check } = await setup()
    const stranger = await generateTicketKeys(subtle)
    expect((await check(await mintTicket(claims(), stranger.privateKey, subtle))).ok).toBe(false)
  })

  it('had its claims changed after signing: a viewer made an editor, a room swapped', async () => {
    const { make, check } = await setup()
    const [version, payload, signature] = (await make({ role: 'viewer' })).split('.') as [
      string,
      string,
      string,
    ]
    const forged = toBase64Url(new TextEncoder().encode(JSON.stringify(claims({ role: 'editor' }))))
    expect((await check(`${version}.${forged}.${signature}`)).ok).toBe(false)
    expect((await check(`${version}.${payload}.${signature}`)).ok).toBe(true)
  })

  it('is malformed in any way: missing, empty, truncated, wrong version, extra parts, not base64', async () => {
    const { make, check } = await setup()
    const good = await make()
    const [version, payload, signature] = good.split('.') as [string, string, string]
    for (const bad of [
      null,
      '',
      'v1',
      'v1.x',
      `${version}.${payload}`,
      `v2.${payload}.${signature}`,
      `${good}.extra`,
      `${version}.${payload}.${signature.slice(0, -4)}`,
      `${version}.${payload}.!!!`,
      `${version}.${'a'.repeat(MAX_TICKET_CHARS)}.${signature}`,
      ` ${good}`,
    ]) {
      expect((await check(bad)).ok).toBe(false)
    }
  })

  /** A signed payload that is not a ticket: the claims are only read once the signature has held. */
  it('is genuinely signed but carries claims this build does not understand', async () => {
    const { mint, check } = await setup()
    const sign = async (value: unknown) => {
      const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(value)))
      const signature = await (subtle as MintCrypto).sign(
        'Ed25519',
        mint.privateKey,
        new TextEncoder().encode(`v1.${payload}`),
      )
      return `v1.${payload}.${toBase64Url(new Uint8Array(signature))}`
    }
    for (const odd of [
      { ...claims(), role: 'owner' },
      { ...claims(), role: undefined },
      { ...claims(), room: '' },
      { ...claims(), exp: 'soon' },
      { ...claims(), iat: null },
      [],
      'text',
      null,
    ]) {
      expect((await check(await sign(odd))).ok).toBe(false)
    }
  })

  it('is presented to a room that holds no key at all', async () => {
    const { make } = await setup()
    expect((await verifyTicket(await make(), [], ROOM, NOW, subtle)).ok).toBe(false)
  })
})

describe('keys', () => {
  it('accepts a ticket from either of two keys, so one can be rotated in before the other goes', async () => {
    const a = await generateTicketKeys(subtle)
    const b = await generateTicketKeys(subtle)
    const keys = await importPublicKeys(`${a.publicKey}, ${b.publicKey}`, subtle)
    expect(keys).toHaveLength(2)
    for (const mint of [a, b]) {
      const ticket = await mintTicket(claims(), mint.privateKey, subtle)
      expect((await verifyTicket(ticket, keys, ROOM, NOW, subtle)).ok).toBe(true)
    }
  })

  it('skips what is not a key, so a typo in the setting admits nobody rather than everybody', async () => {
    expect(await importPublicKeys(undefined, subtle)).toEqual([])
    expect(await importPublicKeys('', subtle)).toEqual([])
    expect(await importPublicKeys('not-a-key,AAAA,!!!', subtle)).toEqual([])
  })
})

describe('a live socket', () => {
  it('is asked whether its ticket still stands, with the same allowance for clocks', () => {
    expect(ticketExpired({ exp: 1000 }, (1000 + TICKET_SKEW_S) * 1000)).toBe(false)
    expect(ticketExpired({ exp: 1000 }, (1000 + TICKET_SKEW_S) * 1000 + 1)).toBe(true)
  })
})
