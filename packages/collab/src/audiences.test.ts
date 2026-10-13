import { richFromPlain, type AnyOpenFrameObject, type ObjectId } from '@openframe/core'
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'

import { applyPatchesToDoc, objectsOf } from './document-map.js'
import {
  canonicalSide,
  hideObjects,
  MOVES,
  reconcileMoves,
  revealObjects,
  sceneView,
  stampReaders,
  type Audiences,
} from './move.js'
import { createAwareness, type RoomRole } from './protocol.js'
import { RoomProvider } from './provider.js'
import { BoardRoom } from './room.js'
import { Wire } from './test-wire.js'

/**
 * ADR T004's gate, in one process: two rooms, a player on one and a GM on both,
 * a reveal that moves an object between them, and proof that what was never
 * shown to the player never reached the player's client or anything it keeps.
 *
 * The rooms are the real `BoardRoom` (the schema-agnostic relay, unchanged) and
 * the clients are the real `RoomProvider`. Admission is the Durable Object's
 * business and is tested there; here the player is simply never joined to the
 * GM's room, which is what a ticket for the table alone amounts to.
 */

const SECRET = 'SECRET-DRAGON-7731'
const OTHER = 'SECOND-SECRET-4410'

function note(id: string, text: string): AnyOpenFrameObject {
  return {
    id: id as ObjectId,
    type: 'sticky',
    dataVersion: 1,
    frame: { x: 0, y: 0, width: 180, height: 120, rotation: 0 },
    parentId: null,
    order: 'a0',
    style: {},
    locked: false,
    hidden: false,
    data: { text: richFromPlain(text) },
    meta: { createdAt: 0, createdBy: null, createdVia: 'user' },
  } as unknown as AnyOpenFrameObject
}

const put = (doc: Y.Doc, id: string, text: string): void => {
  applyPatchesToDoc(doc, [{ op: 'add', id: id as ObjectId, object: note(id, text) }])
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

/** Whether the text appears anywhere in these bytes: a Yjs update carries strings in the clear. */
const contains = (bytes: Uint8Array, text: string): boolean => Buffer.from(bytes).includes(text)
const anyFrameContains = (frames: readonly Uint8Array[], text: string): boolean =>
  frames.some((frame) => contains(frame, text))

function connect(room: BoardRoom, id: string, role: RoomRole = 'editor') {
  const doc = new Y.Doc()
  const wires: Wire[] = []
  const provider = new RoomProvider({
    doc,
    awareness: createAwareness(doc),
    onStatus: () => undefined,
    connect: () => {
      const wire = new Wire()
      wires.push(wire)
      queueMicrotask(() => {
        wire.connectTo(room, `${id}-${String(wires.length)}`, role)
      })
      return wire.client
    },
    // Reconnects run at once; a flush's timeout is never run here, so a flush
    // is settled only by the room's answer, which is the thing under test.
    setTimer: (run, ms) => {
      if (ms > 1000) return null
      queueMicrotask(run)
      return null
    },
    clearTimer: () => undefined,
  })
  provider.start()
  return { doc, provider, wires, received: () => wires.flatMap((wire) => wire.received) }
}

/** A table with a GM on both rooms and a player on one. */
async function table() {
  const tableRoom = new BoardRoom()
  const gmRoom = new BoardRoom()
  const player = connect(tableRoom, 'player', 'editor')
  const gmTable = connect(tableRoom, 'gm-table')
  const gmPrivate = connect(gmRoom, 'gm-private')
  await settle()
  const audiences: Audiences = { exposed: gmTable.doc, private: gmPrivate.doc }
  const flush = (doc: Y.Doc): Promise<void> =>
    (doc === gmTable.doc ? gmTable : gmPrivate).provider.flushed()
  return { tableRoom, gmRoom, player, gmTable, gmPrivate, audiences, flush }
}

describe('what a player is never told', () => {
  it('does not receive, hold or keep an object that lives in the GM room', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    put(t.gmTable.doc, 'obj_open', 'a torch on the wall')
    await settle()

    // The table sees what is on the table.
    expect(objectsOf(t.player.doc).has('obj_open')).toBe(true)
    // And not what is not: not in its document...
    expect(objectsOf(t.player.doc).has('obj_secret')).toBe(false)
    // ...not in the state it would save to its device...
    expect(contains(Y.encodeStateAsUpdate(t.player.doc), SECRET)).toBe(false)
    // ...not in a single frame the room ever put on its wire...
    expect(anyFrameContains(t.player.received(), SECRET)).toBe(false)
    // ...and not in the room it is connected to either.
    expect(contains(t.tableRoom.snapshot(), SECRET)).toBe(false)
    // While the GM's room does hold it, so the test is not passing on nothing.
    expect(contains(t.gmRoom.snapshot(), SECRET)).toBe(true)
  })

  it('stays that way through a reconnect, when the room sends the whole board again', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()
    t.player.wires[0]?.drop()
    await settle()
    expect(t.player.wires.length).toBeGreaterThan(1)
    expect(anyFrameContains(t.player.received(), SECRET)).toBe(false)
  })

  /**
   * The control. The design this replaces keeps everything in one document and
   * marks some objects hidden; the room relays it all. If the check above
   * cannot fail, it proves nothing, so here it is shown failing on that design.
   */
  it('would have caught the hidden flag, which is not a secrecy mechanism', async () => {
    const room = new BoardRoom()
    const player = connect(room, 'player')
    const gm = connect(room, 'gm')
    await settle()
    const flagged = note('obj_flagged', SECRET) as unknown as { hidden: boolean }
    flagged.hidden = true
    applyPatchesToDoc(gm.doc, [
      {
        op: 'add',
        id: 'obj_flagged' as ObjectId,
        object: flagged as unknown as AnyOpenFrameObject,
      },
    ])
    await settle()
    expect(anyFrameContains(player.received(), SECRET)).toBe(true)
  })
})

describe('a reveal', () => {
  it('moves an object to the table, and only that object', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    put(t.gmPrivate.doc, 'obj_other', OTHER)
    await settle()

    const result = await revealObjects(t.audiences, ['obj_secret'], t.flush)
    await settle()

    expect(result).toEqual({ moved: ['obj_secret'], skipped: [] })
    // The player has it now.
    expect(objectsOf(t.player.doc).has('obj_secret')).toBe(true)
    expect(anyFrameContains(t.player.received(), SECRET)).toBe(true)
    // It is no longer in the GM's room, and is in the table's.
    expect(contains(t.gmRoom.snapshot(), SECRET)).toBe(false)
    expect(contains(t.tableRoom.snapshot(), SECRET)).toBe(true)
    // What was not revealed is still unknown to the player.
    expect(anyFrameContains(t.player.received(), OTHER)).toBe(false)
    expect(contains(Y.encodeStateAsUpdate(t.player.doc), OTHER)).toBe(false)
  })

  it('writes the destination first and removes the source only once the room has confirmed', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()

    const order: string[] = []
    await revealObjects(t.audiences, ['obj_secret'], (doc) => {
      const here = objectsOf(t.gmTable.doc).has('obj_secret')
      const gone = !objectsOf(t.gmPrivate.doc).has('obj_secret')
      order.push(
        `${doc === t.gmTable.doc ? 'table' : 'gm'} flush: in table=${String(here)}, out of gm=${String(gone)}`,
      )
      return doc === t.gmTable.doc ? t.gmTable.provider.flushed() : t.gmPrivate.provider.flushed()
    })

    expect(order).toEqual([
      'table flush: in table=true, out of gm=false',
      'gm flush: in table=true, out of gm=true',
    ])
  })

  it('leaves the source untouched when the table room cannot confirm', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()

    await expect(
      revealObjects(t.audiences, ['obj_secret'], () => Promise.reject(new Error('unreachable'))),
    ).rejects.toThrow('unreachable')

    // Nothing was taken out of the room it came from: at worst it is in both.
    expect(objectsOf(t.gmPrivate.doc).has('obj_secret')).toBe(true)
    expect(contains(t.gmRoom.snapshot(), SECRET)).toBe(true)
  })

  it('is recoverable: after that crash the next connection finishes it, and nothing is lost or doubled', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()
    await revealObjects(t.audiences, ['obj_secret'], () =>
      Promise.reject(new Error('crash')),
    ).catch(() => undefined)
    await settle()
    // The object is in both documents, which is the state a crash leaves.
    expect(objectsOf(t.gmTable.doc).has('obj_secret')).toBe(true)
    expect(objectsOf(t.gmPrivate.doc).has('obj_secret')).toBe(true)

    expect(reconcileMoves(t.audiences)).toEqual({ fromExposed: [], fromPrivate: ['obj_secret'] })
    await settle()

    expect(objectsOf(t.gmTable.doc).has('obj_secret')).toBe(true)
    expect(objectsOf(t.gmPrivate.doc).has('obj_secret')).toBe(false)
    expect(contains(t.gmRoom.snapshot(), SECRET)).toBe(false)
    expect(objectsOf(t.player.doc).has('obj_secret')).toBe(true)
  })

  it('does nothing the second time, and nothing for an object that was never there', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()
    await revealObjects(t.audiences, ['obj_secret'], t.flush)
    const again = await revealObjects(t.audiences, ['obj_secret', 'obj_nowhere'], t.flush)
    expect(again).toEqual({ moved: [], skipped: ['obj_secret', 'obj_nowhere'] })
    expect(reconcileMoves(t.audiences)).toEqual({ fromExposed: [], fromPrivate: [] })
  })
})

describe('hiding again', () => {
  it('moves it back, and the move counts up so the later one is the one that stands', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()
    await revealObjects(t.audiences, ['obj_secret'], t.flush)
    await hideObjects(t.audiences, ['obj_secret'], t.flush)
    await settle()

    expect(objectsOf(t.gmTable.doc).has('obj_secret')).toBe(false)
    expect(objectsOf(t.gmPrivate.doc).has('obj_secret')).toBe(true)
    expect(objectsOf(t.player.doc).has('obj_secret')).toBe(false)
    const stamps = stampReaders(t.audiences)
    expect(stamps.exposed('obj_secret')).toBe(1)
    expect(stamps.private('obj_secret')).toBe(2)
    expect(t.gmPrivate.doc.getMap(MOVES).has('obj_secret')).toBe(true)
  })

  /**
   * Written down as a limit, not a defect: a move can stop a player receiving
   * anything more, but it cannot make them forget what they were shown. A
   * hide is a hide, never an un-see (ADR T004, consequences).
   */
  it('cannot take back what the player was already shown', async () => {
    const t = await table()
    put(t.gmPrivate.doc, 'obj_secret', SECRET)
    await settle()
    await revealObjects(t.audiences, ['obj_secret'], t.flush)
    await settle()
    await hideObjects(t.audiences, ['obj_secret'], t.flush)
    await settle()
    expect(objectsOf(t.player.doc).has('obj_secret')).toBe(false)
    expect(anyFrameContains(t.player.received(), SECRET)).toBe(true)
  })
})

describe('where the stamps cannot say', () => {
  it('resolves a tie toward secrecy: an ambiguity never shows a secret', () => {
    expect(canonicalSide(3, 3)).toBe('private')
    expect(canonicalSide(0, 0)).toBe('private')
    expect(canonicalSide(4, 3)).toBe('exposed')
    expect(canonicalSide(3, 4)).toBe('private')
  })

  it('settles two movers who raced, in the doc that is private, and loses neither copy', () => {
    const exposed = new Y.Doc()
    const hidden = new Y.Doc()
    put(exposed, 'obj_a', SECRET)
    put(hidden, 'obj_a', SECRET)
    // Both documents carry a stamp for it, equal: a reveal and a hide that crossed.
    exposed.getMap(MOVES).set('obj_a', { seq: 2 })
    hidden.getMap(MOVES).set('obj_a', { seq: 2 })
    expect(reconcileMoves({ exposed, private: hidden })).toEqual({
      fromExposed: ['obj_a'],
      fromPrivate: [],
    })
    expect(objectsOf(hidden).has('obj_a')).toBe(true)
    expect(objectsOf(exposed).has('obj_a')).toBe(false)
  })

  it('never removes the only copy of anything', () => {
    const exposed = new Y.Doc()
    const hidden = new Y.Doc()
    put(exposed, 'obj_a', 'open')
    put(hidden, 'obj_b', 'closed')
    expect(reconcileMoves({ exposed, private: hidden })).toEqual({
      fromExposed: [],
      fromPrivate: [],
    })
    expect(objectsOf(exposed).size).toBe(1)
    expect(objectsOf(hidden).size).toBe(1)
  })
})

describe('the GM’s one scene', () => {
  it('shows each object once, from the side the stamps name, and exposes nothing on a tie', () => {
    const exposed = new Y.Doc()
    const hidden = new Y.Doc()
    put(hidden, 'obj_private', 'a')
    put(exposed, 'obj_open', 'b')
    put(exposed, 'obj_both', 'c')
    put(hidden, 'obj_both', 'c')
    put(exposed, 'obj_tie', 'd')
    put(hidden, 'obj_tie', 'd')
    exposed.getMap(MOVES).set('obj_both', { seq: 5 })
    hidden.getMap(MOVES).set('obj_both', { seq: 4 })
    exposed.getMap(MOVES).set('obj_tie', { seq: 3 })
    hidden.getMap(MOVES).set('obj_tie', { seq: 3 })

    const audiences = { exposed, private: hidden }
    const view = sceneView(
      new Map(objectsOf(exposed)),
      new Map(objectsOf(hidden)),
      stampReaders(audiences),
    )
    expect([...view.keys()].sort()).toEqual(['obj_both', 'obj_open', 'obj_private', 'obj_tie'])
    expect(view.get('obj_both')?.side).toBe('exposed')
    expect(view.get('obj_tie')?.side).toBe('private')
    expect(view.get('obj_open')?.side).toBe('exposed')
    expect(view.get('obj_private')?.side).toBe('private')
  })
})
