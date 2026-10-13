/**
 * One room's document, held by a client with no board and no interface.
 *
 * For tests that talk to a real room server from Node — the audience spec for
 * ADR T004 puts a player on one room and a GM on two — and it exists so that
 * code outside this package can do that without naming a `Y.Doc`
 * (`yjs-lives-only-in-collab`). Not a product API: nothing in the app reaches
 * it, and what a real GM client needs is decided when there is one.
 */
import { richFromPlain, type AnyOpenFrameObject, type ObjectId } from '@openframe/core'
import * as Y from 'yjs'

import { applyPatchesToDoc, objectsOf } from './document-map.js'
import { moveObjects, reconcileMoves, type Direction } from './move.js'
import { createAwareness, type RoomCredentials } from './protocol.js'
import { RoomProvider, type ConnectionStatus, type RoomSocket } from './provider.js'

export class HeadlessScene {
  readonly #doc = new Y.Doc()
  readonly #provider: RoomProvider
  #status: ConnectionStatus = 'connecting'

  constructor(options: {
    readonly connect: () => RoomSocket
    readonly credentials: () => RoomCredentials
  }) {
    this.#provider = new RoomProvider({
      doc: this.#doc,
      awareness: createAwareness(this.#doc),
      connect: options.connect,
      credentials: options.credentials,
      onStatus: (status) => {
        this.#status = status
      },
    })
    this.#provider.start()
  }

  get status(): ConnectionStatus {
    return this.#status
  }

  /** Whether the room has sent the board. */
  get synced(): boolean {
    return this.#provider.synced
  }

  /** Puts a sticky note saying `text` on this document. */
  put(id: string, text: string): void {
    const object = {
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
    applyPatchesToDoc(this.#doc, [{ op: 'add', id: id as ObjectId, object }])
  }

  has(id: string): boolean {
    return objectsOf(this.#doc).has(id)
  }

  /** Everything this document would save to a device: what a "local cache" holds. */
  state(): Uint8Array {
    return Y.encodeStateAsUpdate(this.#doc)
  }

  /** Resolves once the room has everything written here so far (`RoomProvider.flushed`). */
  flushed(timeoutMs?: number): Promise<void> {
    return this.#provider.flushed(timeoutMs)
  }

  stop(): void {
    this.#provider.destroy()
  }

  /** @internal for `moveBetween` and `reconcileBetween`. */
  get doc(): Y.Doc {
    return this.#doc
  }
}

/**
 * Reveals or hides `ids` between a scene's two documents, confirming each write
 * before the next. `crashAfterDestination` stops it exactly where a crash would:
 * the destination written and confirmed by its room, the source not yet cleared,
 * which is the one state a move is built to survive.
 */
export function moveBetween(
  exposed: HeadlessScene,
  hidden: HeadlessScene,
  ids: readonly string[],
  direction: Direction,
  options: { readonly crashAfterDestination?: boolean } = {},
) {
  const destination = direction === 'reveal' ? exposed : hidden
  return moveObjects({ exposed: exposed.doc, private: hidden.doc }, ids, direction, async (doc) => {
    const scene = doc === exposed.doc ? exposed : hidden
    await scene.flushed()
    if (options.crashAfterDestination === true && scene === destination) {
      throw new Error('crashed after the destination was written')
    }
  })
}

export function reconcileBetween(exposed: HeadlessScene, hidden: HeadlessScene) {
  return reconcileMoves({ exposed: exposed.doc, private: hidden.doc })
}
