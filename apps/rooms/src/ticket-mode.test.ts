import { generateTicketKeys, mintTicket, type MintCrypto } from '@openframe/collab/tickets-mint'
import type { TicketCrypto } from '@openframe/collab/tickets'
import { describe, expect, it } from 'vitest'

import { admitByTicket, ticketMode, ticketStillStands, type TicketMode } from './ticket-mode.js'

const subtle = crypto.subtle as unknown as TicketCrypto & MintCrypto
const NOW = 1_800_000_000_000

async function room(id = 'scene_1_table') {
  const minted = await generateTicketKeys(subtle)
  const mode = (await ticketMode(minted.publicKey, subtle)) as Extract<TicketMode, { on: true }>
  const ticket = (over: { room?: string; role?: 'editor' | 'viewer'; exp?: number } = {}) =>
    mintTicket(
      {
        room: over.room ?? id,
        role: over.role ?? 'editor',
        sub: 'u',
        iat: NOW / 1000,
        exp: over.exp ?? NOW / 1000 + 300,
      },
      minted.privateKey,
      subtle,
    )
  return { id, mode, ticket, minted }
}

describe('ticket mode', () => {
  it('is off when nothing is set, and ON, admitting nobody, when what is set holds no usable key', async () => {
    expect(await ticketMode(undefined, subtle)).toEqual({ on: false })
    expect(await ticketMode('  ', subtle)).toEqual({ on: false })
    // A mis-set key must not read as "no ticket mode": that would open every room.
    expect(await ticketMode('garbage', subtle)).toEqual({ on: true, keys: [] })
  })

  it('admits a genuine ticket for this room with the role it carries', async () => {
    const { id, mode, ticket } = await room()
    expect(await admitByTicket(mode, await ticket({ role: 'viewer' }), id, NOW, subtle)).toEqual({
      ok: true,
      role: 'viewer',
      exp: NOW / 1000 + 300,
    })
  })

  /**
   * The point of the partition: one person holds a ticket for the table and
   * another for the GM's room, and neither opens the other's. The room is told
   * nothing about tiers.
   */
  it('refuses a ticket for the table in the GM room, and the reverse', async () => {
    const table = await room('scene_1_table')
    const gm = await room('scene_1_gm')
    expect((await admitByTicket(gm.mode, await table.ticket(), 'scene_1_gm', NOW, subtle)).ok).toBe(
      false,
    )
    expect(
      (await admitByTicket(table.mode, await gm.ticket(), 'scene_1_table', NOW, subtle)).ok,
    ).toBe(false)
  })

  /** The legacy rule opened a room with no keys to everybody; here there is no such room. */
  it('refuses a connection with no ticket, which is what the keyless rule would have let in', async () => {
    const { id, mode } = await room()
    expect((await admitByTicket(mode, null, id, NOW, subtle)).ok).toBe(false)
  })

  it('refuses everybody when it holds no key', async () => {
    const { id, ticket } = await room()
    const empty = (await ticketMode('garbage', subtle)) as Extract<TicketMode, { on: true }>
    expect((await admitByTicket(empty, await ticket(), id, NOW, subtle)).ok).toBe(false)
  })
})

describe('a socket that has been admitted', () => {
  it('stands until its ticket, plus the allowance for clocks, has run out', () => {
    expect(ticketStillStands(undefined, NOW)).toBe(true)
    expect(ticketStillStands(NOW / 1000 + 10, NOW)).toBe(true)
    expect(ticketStillStands(NOW / 1000 - 120, NOW)).toBe(false)
  })
})
