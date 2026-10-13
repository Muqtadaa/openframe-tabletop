/**
 * Moving objects between two documents, for the two audiences of a scene
 * (ADR T004, T011).
 *
 * A scene has an EXPOSED document everybody at the table receives and a PRIVATE
 * one only the GM does. Showing something to the table is not a flag turned on
 * an object both audiences already hold: it is a move from the private document
 * to the exposed one, so a player's client never receives what has not been
 * shown to it. Hiding is the same move the other way.
 *
 * A move touches two documents in two rooms and cannot be one transaction, so
 * it is made recoverable instead:
 *
 *   1. Write the destination, with a STAMP in the same transaction.
 *   2. Wait until the room confirms it (`flush`).
 *   3. Only then remove the source.
 *
 * Nothing leaves one room until it is certainly in the other, so the worst a
 * crash can leave is the object in BOTH, never in neither. The stamp is what
 * makes "both" unambiguous afterwards: whichever copy carries the newer stamp
 * is the destination of the last move, and `reconcileMoves` deletes the other.
 * Re-running a finished move changes nothing.
 *
 * Where two movers race (one shows an object while another hides it) the stamps
 * tie, and a tie is resolved TOWARD SECRECY: the object stays in the private
 * document. An ambiguity must never be the thing that shows a secret.
 *
 * Objects are plain data keyed by id, and the id does not change, so what
 * points at an object keeps pointing at it across a move.
 */
import type * as Y from 'yjs'

import { objectsOf } from './document-map.js'

/** The root map holding one stamp per object this document received by a move. */
export const MOVES = 'moves'

/**
 * A stamp: how many moves this object has had, as counted by whoever made the
 * latest one. It is bumped from the highest stamp seen in EITHER document, so
 * it only ever rises for a given object.
 */
export interface MoveStamp {
  readonly seq: number
}

export interface Audiences {
  /** What the whole table receives. */
  readonly exposed: Y.Doc
  /** What only the GM receives. */
  readonly private: Y.Doc
}

export type Direction = 'reveal' | 'hide'

function stampsOf(doc: Y.Doc): Y.Map<MoveStamp> {
  return doc.getMap<MoveStamp>(MOVES)
}

const seqOf = (doc: Y.Doc, id: string): number => stampsOf(doc).get(id)?.seq ?? 0

export interface MoveResult {
  /** Ids that were moved. */
  readonly moved: readonly string[]
  /** Ids that were not in the source, because they are already where they are going or never existed. */
  readonly skipped: readonly string[]
}

/**
 * Moves `ids` in `direction`.
 *
 * `flush` must resolve only once the room serving `doc` has processed
 * everything written to it so far, and reject if it cannot say so: it is what
 * stands between "written here" and "safe there" (`RoomProvider.flushed`). If
 * it rejects, the source is left exactly as it was.
 */
export async function moveObjects(
  audiences: Audiences,
  ids: readonly string[],
  direction: Direction,
  flush: (doc: Y.Doc) => Promise<void>,
): Promise<MoveResult> {
  const from = direction === 'reveal' ? audiences.private : audiences.exposed
  const to = direction === 'reveal' ? audiences.exposed : audiences.private

  const sources = objectsOf(from)
  const present = ids.filter((id) => sources.has(id))
  const skipped = ids.filter((id) => !sources.has(id))
  if (present.length === 0) return { moved: [], skipped }

  // 1. The destination, with each object's stamp in the same transaction, so
  // the copy and the evidence it is the newer one arrive together or not at all.
  to.transact(() => {
    for (const id of present) {
      const object = sources.get(id)
      if (object === undefined) continue
      objectsOf(to).set(id, structuredClone(object))
      stampsOf(to).set(id, { seq: Math.max(seqOf(from, id), seqOf(to, id)) + 1 })
    }
  })

  // 2. Certain it is there.
  await flush(to)

  // 3. Only now out of the source.
  from.transact(() => {
    for (const id of present) sources.delete(id)
  })
  await flush(from)

  return { moved: present, skipped }
}

export const revealObjects = (
  audiences: Audiences,
  ids: readonly string[],
  flush: (doc: Y.Doc) => Promise<void>,
) => moveObjects(audiences, ids, 'reveal', flush)

export const hideObjects = (
  audiences: Audiences,
  ids: readonly string[],
  flush: (doc: Y.Doc) => Promise<void>,
) => moveObjects(audiences, ids, 'hide', flush)

/** Which document an object that is in BOTH belongs in, by the stamps. Ties go private. */
export function canonicalSide(exposedSeq: number, privateSeq: number): 'exposed' | 'private' {
  return exposedSeq > privateSeq ? 'exposed' : 'private'
}

/**
 * Finishes any move that was interrupted: an object present in both documents
 * is deleted from the one that is not its latest destination.
 *
 * Safe to run at any time and as often as you like. It only ever removes a
 * COPY, and never the last one, since an object in one document is left alone.
 * Returns the ids it cleaned up, per side.
 */
export function reconcileMoves(audiences: Audiences): {
  readonly fromExposed: readonly string[]
  readonly fromPrivate: readonly string[]
} {
  const exposed = objectsOf(audiences.exposed)
  const hidden = objectsOf(audiences.private)
  const fromExposed: string[] = []
  const fromPrivate: string[] = []
  for (const id of exposed.keys()) {
    if (!hidden.has(id)) continue
    const side = canonicalSide(seqOf(audiences.exposed, id), seqOf(audiences.private, id))
    if (side === 'exposed') fromPrivate.push(id)
    else fromExposed.push(id)
  }
  if (fromExposed.length > 0) {
    audiences.exposed.transact(() => {
      for (const id of fromExposed) exposed.delete(id)
    })
  }
  if (fromPrivate.length > 0) {
    audiences.private.transact(() => {
      for (const id of fromPrivate) hidden.delete(id)
    })
  }
  return { fromExposed, fromPrivate }
}

/**
 * What the GM sees: both documents as one scene, each object once.
 *
 * Pure, over two id-keyed maps and their stamps, so it can feed a store and be
 * tested without a document. An object in both (a move in progress) is shown
 * from the side the stamps name, the same way `reconcileMoves` settles it, so
 * the GM never sees a duplicate and never sees a secret exposed that the
 * stamps do not say is exposed.
 */
export function sceneView<T>(
  exposed: ReadonlyMap<string, T>,
  hidden: ReadonlyMap<string, T>,
  stamps: { readonly exposed: (id: string) => number; readonly private: (id: string) => number },
): Map<string, { readonly object: T; readonly side: 'exposed' | 'private' }> {
  const view = new Map<string, { readonly object: T; readonly side: 'exposed' | 'private' }>()
  for (const [id, object] of hidden) view.set(id, { object, side: 'private' })
  for (const [id, object] of exposed) {
    const other = hidden.has(id)
    if (!other || canonicalSide(stamps.exposed(id), stamps.private(id)) === 'exposed') {
      view.set(id, { object, side: 'exposed' })
    }
  }
  return view
}

/** The stamp readers for `sceneView`, over two documents. */
export function stampReaders(audiences: Audiences) {
  return {
    exposed: (id: string) => seqOf(audiences.exposed, id),
    private: (id: string) => seqOf(audiences.private, id),
  }
}
