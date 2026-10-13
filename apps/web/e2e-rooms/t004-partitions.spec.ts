import { HeadlessScene, moveBetween, reconcileBetween } from '@openframe/collab/headless'
import { expect, test } from '@playwright/test'

import { newRoomId } from './rooms.js'
import { knock, realSocket, TICKET_HTTP, tampered, ticketFor } from './tickets.js'

/**
 * ADR T004's gate, against a real Durable Object in ticket mode.
 *
 * `playwright.rooms.config.ts` starts a room server on 8789 that holds only the
 * PUBLIC half of a signing key. A scene is two ordinary rooms; a player's
 * ticket names the table and a GM's tickets name both, and the room is told
 * nothing about audiences. These specs show what that buys, over real sockets
 * and real storage, with no browser: the claim is about bytes on a wire.
 */

const SECRET = 'SECRET-DRAGON-7731'
const OTHER = 'SECOND-SECRET-4410'

/** A scene's two rooms. Ids fit the room-id alphabet and share a prefix, as a Phase 1 scene's would. */
function scene() {
  const id = newRoomId().replace('brd_', 'scene_')
  return { table: `${id}_table`, gm: `${id}_gm` }
}

const contains = (bytes: Uint8Array, text: string): boolean => Buffer.from(bytes).includes(text)
const anyContains = (frames: readonly Uint8Array[], text: string): boolean =>
  frames.some((frame) => contains(frame, text))

/** A scene client with a ticket for one room, recording every frame the room sends it. */
async function join(room: string, ticket?: string) {
  const frames: Uint8Array[] = []
  const given = ticket ?? (await ticketFor(room))
  const client = new HeadlessScene({
    connect: () => realSocket(room, frames),
    credentials: () => ({ ticket: given }),
  })
  await expect.poll(() => client.synced, { timeout: 15_000 }).toBe(true)
  return { client, frames }
}

test.describe('admission by ticket', () => {
  test('a genuine ticket opens the room it names, and only that room', async () => {
    const { table, gm } = scene()
    const player = await knock(table, { ticket: await ticketFor(table) })
    expect(player.admitted).toBe(true)
    player.socket.close()

    // The same person, the same ticket, the other room: put out, with no hint why.
    const refused = await knock(gm, { ticket: await ticketFor(table) })
    expect(refused.admitted).toBe(false)
    expect(refused.closed).toEqual({ code: 1008, reason: 'That ticket does not open this room' })
  })

  test('refuses what is not a ticket for this room, the same way every time', async () => {
    const { table } = scene()
    const attempts = {
      none: {},
      // The link path of every board before tickets: an unclaimed room used to be open to it.
      legacyKey: { key: 'k'.repeat(32) },
      tampered: { ticket: tampered(await ticketFor(table)) },
      expired: { ticket: await ticketFor(table, { issuedAt: -3000, expiresIn: -1000 }) },
      notYet: { ticket: await ticketFor(table, { issuedAt: 1000, expiresIn: 1500 }) },
      garbage: { ticket: 'not a ticket' },
      other: { ticket: await ticketFor(`${table}x`) },
    }
    for (const [name, hello] of Object.entries(attempts)) {
      const result = await knock(table, hello)
      expect(result.admitted, name).toBe(false)
      expect(result.closed, name).toEqual({
        code: 1008,
        reason: 'That ticket does not open this room',
      })
    }
  })

  /**
   * The hole this closes: a room nobody has set up has no keys, and no keys has
   * always meant "open to everyone as an editor". In ticket mode it means
   * nothing, whichever route asks.
   */
  test('has no route that decides by link, so a room with no keys is not open', async () => {
    const { table } = scene()
    const base = `${TICKET_HTTP}/room/${table}`
    for (const [method, path] of [
      ['POST', '/claim'],
      ['POST', '/destroy'],
      ['POST', '/password'],
      ['POST', '/owner'],
      ['GET', '/versions'],
    ] as const) {
      const response = await fetch(`${base}${path}`, { method })
      expect(response.status, `${method} ${path}`).toBe(403)
    }
  })

  test('reaches an image by ticket too, and a table ticket cannot fetch from the GM room', async () => {
    const { table, gm } = scene()
    const asset = (room: string, ticket: string | null) =>
      fetch(`${TICKET_HTTP}/room/${room}/asset/img_1`, {
        headers: ticket === null ? {} : { 'x-openframe-ticket': ticket },
      })
    // With nothing: refused. With the room's own ticket: let through to "no such image".
    expect((await asset(table, null)).status).toBe(403)
    expect((await asset(table, await ticketFor(table))).status).toBe(404)
    // A table ticket in the GM room is no ticket there.
    expect((await asset(gm, await ticketFor(table))).status).toBe(403)
    expect((await asset(gm, await ticketFor(gm))).status).toBe(404)
  })

  /**
   * Revocation is expiry, and expiry is noticed when the socket next speaks:
   * a timer to close it on the dot would keep the room awake (rule 29). The
   * ticket here ran out five seconds after it was let in and is still within
   * the minute of slack for clocks, so it gets in and is put out on its next word.
   */
  test('puts out a socket whose ticket has run out, the next time it speaks', async () => {
    test.setTimeout(30_000)
    const { table } = scene()
    const ticket = await ticketFor(table, { issuedAt: -3500, expiresIn: -55 })
    const result = await knock(table, { ticket })
    expect(result.admitted).toBe(true)
    const closed = new Promise<{ code: number; reason: string }>((resolve) => {
      result.socket.addEventListener('close', (event) =>
        resolve({ code: event.code, reason: event.reason }),
      )
    })
    await new Promise((resolve) => setTimeout(resolve, 7000))
    // A question about the time: harmless, and a message all the same.
    result.socket.send(new Uint8Array([3, 0, 0, 0, 0, 0, 0, 0, 0]))
    expect(await closed).toEqual({ code: 1008, reason: 'Your ticket has expired' })
  })
})

test.describe('a scene in two rooms', () => {
  test('never tells the player what has not been revealed, and tells them once it has', async () => {
    test.setTimeout(60_000)
    const { table, gm } = scene()
    const player = await join(table)
    const gmTable = await join(table)
    const gmPrivate = await join(gm)

    gmPrivate.client.put('obj_secret', SECRET)
    gmPrivate.client.put('obj_other', OTHER)
    gmTable.client.put('obj_open', 'a torch on the wall')
    await gmPrivate.client.flushed()
    await gmTable.client.flushed()

    // The player sees the table, and nothing else crossed their wire or their cache.
    await expect.poll(() => player.client.has('obj_open')).toBe(true)
    expect(player.client.has('obj_secret')).toBe(false)
    expect(anyContains(player.frames, SECRET)).toBe(false)
    expect(anyContains(player.frames, OTHER)).toBe(false)
    expect(contains(player.client.state(), SECRET)).toBe(false)

    // A reveal is a move between the rooms.
    const result = await moveBetween(gmTable.client, gmPrivate.client, ['obj_secret'], 'reveal')
    expect(result.moved).toEqual(['obj_secret'])
    await expect.poll(() => player.client.has('obj_secret')).toBe(true)
    expect(anyContains(player.frames, SECRET)).toBe(true)
    // Only that object: the other is still unknown to the player.
    expect(anyContains(player.frames, OTHER)).toBe(false)
    expect(contains(player.client.state(), OTHER)).toBe(false)

    // And it is out of the GM's room for good: a GM who joins afresh is not
    // handed it back, which shows the removal reached storage and not only a screen.
    const fresh = await join(gm)
    expect(fresh.client.has('obj_secret')).toBe(false)
    expect(fresh.client.has('obj_other')).toBe(true)
    expect(anyContains(fresh.frames, SECRET)).toBe(false)

    for (const side of [player, gmTable, gmPrivate, fresh]) side.client.stop()
  })

  test('a GM who crashed between the two writes finds it finished on the next connection', async () => {
    test.setTimeout(60_000)
    const { table, gm } = scene()
    const gmTable = await join(table)
    const gmPrivate = await join(gm)
    gmPrivate.client.put('obj_secret', SECRET)
    await gmPrivate.client.flushed()

    // The crash: the table room has it, confirmed; the GM's room still has it too.
    await expect(
      moveBetween(gmTable.client, gmPrivate.client, ['obj_secret'], 'reveal', {
        crashAfterDestination: true,
      }),
    ).rejects.toThrow('crashed')
    gmTable.client.stop()
    gmPrivate.client.stop()

    // A GM client comes back and finds the object in BOTH rooms, never in neither.
    const backTable = await join(table)
    const backPrivate = await join(gm)
    expect(backTable.client.has('obj_secret')).toBe(true)
    expect(backPrivate.client.has('obj_secret')).toBe(true)

    // Settling it from the stamps removes the stale copy, and that reaches the room.
    expect(reconcileBetween(backTable.client, backPrivate.client)).toEqual({
      fromExposed: [],
      fromPrivate: ['obj_secret'],
    })
    await backPrivate.client.flushed()
    backTable.client.stop()
    backPrivate.client.stop()

    const settled = await join(gm)
    expect(settled.client.has('obj_secret')).toBe(false)
    expect(anyContains(settled.frames, SECRET)).toBe(false)
    settled.client.stop()
  })
})
