import type { BoardRoom, RoomPeer } from './room.js'
import type { RoomRole } from './protocol.js'
import type { RoomSocket } from './provider.js'

/**
 * An in-memory WebSocket pair for tests that put a client and a room in one
 * process: no network, and the room's half is a `RoomPeer`.
 *
 * Shared by the provider tests and the audience tests. `received` is every
 * frame the room put on this client's wire, in order, which is what a test
 * about what a client was ever TOLD needs: a document can be cleaned, a frame
 * that arrived cannot.
 */
/** A socket pair. One end is the client's, the other is the room's peer. */
export class Wire {
  #open = false
  #openListeners: (() => void)[] = []
  #messageListeners: ((data: Uint8Array) => void)[] = []
  #closeListeners: ((code: number) => void)[] = []
  #room: BoardRoom | null = null
  #peer: RoomPeer | null = null
  /** Messages the client sent while the socket was not up. */
  delivered = 0
  /** The largest frame either side put on this wire. */
  largest = 0
  /** Every frame the ROOM sent this client, in order: what it was ever told. */
  readonly received: Uint8Array[] = []
  /** Every frame the client sent, in order, including those before it was admitted. */
  readonly sent: Uint8Array[] = []

  readonly client: RoomSocket = {
    send: (data) => {
      this.sent.push(data)
      if (!this.#open || this.#room === null || this.#peer === null) return
      this.delivered++
      this.largest = Math.max(this.largest, data.byteLength)
      this.#room.receive(this.#peer, data)
    },
    close: () => {
      this.drop()
    },
    onOpen: (listener) => this.#openListeners.push(listener),
    onMessage: (listener) => this.#messageListeners.push(listener),
    onClose: (listener) => this.#closeListeners.push(listener),
    onError: () => undefined,
  }

  /**
   * Opens the socket without admitting it, as the room does until it has read
   * the hello: the client is connected and has been told nothing.
   */
  openOnly(): void {
    this.#open = true
    for (const listener of this.#openListeners) listener()
  }

  /** Completes the connection, as a server accepting the upgrade would. */
  connectTo(room: BoardRoom, id: string, role: RoomRole = 'editor'): void {
    this.openOnly()
    this.admit(room, id, role)
  }

  /** The room, having read the hello, joins the socket. */
  admit(room: BoardRoom, id: string, role: RoomRole = 'editor'): void {
    this.#room = room
    this.#peer = {
      id,
      role,
      send: (data) => {
        this.received.push(data)
        this.largest = Math.max(this.largest, data.byteLength)
        for (const listener of this.#messageListeners) listener(data)
      },
    }
    room.join(this.#peer)
  }

  /**
   * `1006` is what a browser reports for a connection that dropped without a
   * close frame — a lost network, a restarted room — which is the ordinary
   * case and the one that SHOULD reconnect.
   */
  drop(code = 1006): void {
    if (!this.#open) return
    this.#open = false
    if (this.#room !== null && this.#peer !== null) this.#room.leave(this.#peer)
    for (const listener of this.#closeListeners) listener(code)
  }
}
