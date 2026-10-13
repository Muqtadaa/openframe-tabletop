import { describe, expect, it } from 'vitest'

import {
  decodeHello,
  encodeHello,
  MESSAGE_HELLO,
  readMessage,
  createAwareness,
} from './protocol.js'
import * as Y from 'yjs'

describe('the hello a connection opens with', () => {
  it('carries the link, the token and the owner key, and nothing absent', () => {
    const hello = encodeHello({ key: 'k'.repeat(32), token: 't'.repeat(32), ownerKey: null })
    expect(hello[0]).toBe(MESSAGE_HELLO)
    expect(decodeHello(hello)).toEqual({
      key: 'k'.repeat(32),
      token: 't'.repeat(32),
      ownerKey: null,
      ticket: null,
    })
    expect(decodeHello(encodeHello({}))).toEqual({
      key: null,
      token: null,
      ownerKey: null,
      ticket: null,
    })
  })

  /**
   * A ticket is a fourth part, and only when there is one: what every deployed
   * client sends is unchanged, byte for byte, so a room that predates tickets
   * reads it as it always did and a room that has them reads it as no ticket.
   */
  it('adds a ticket without changing the hello of a client that has none', () => {
    const before = encodeHello({ key: 'k', token: null, ownerKey: null })
    expect(encodeHello({ key: 'k', ticket: null })).toEqual(before)
    expect(encodeHello({ key: 'k', ticket: undefined })).toEqual(before)
    // Exactly the three parts of the old encoding: type, then three strings.
    expect([...before]).toEqual([MESSAGE_HELLO, 1, 107, 0, 0])
    expect(decodeHello(before)?.ticket).toBeNull()

    const ticketed = encodeHello({ ticket: 'v1.a.b' })
    expect(decodeHello(ticketed)).toEqual({
      key: null,
      token: null,
      ownerKey: null,
      ticket: 'v1.a.b',
    })
  })

  it('is not a hello unless it says so, and an unreadable one is refused', () => {
    expect(decodeHello(new Uint8Array([0, 0, 0]))).toBeNull()
    expect(() => decodeHello(new Uint8Array([MESSAGE_HELLO, 0xff]))).toThrow()
  })

  it('is never mistaken for part of the board by the room that reads it', () => {
    const doc = new Y.Doc()
    const handled = readMessage(doc, createAwareness(doc), encodeHello({ key: 'x' }), 'a', true)
    expect(handled.content).toBe(false)
    expect(handled.reply).toBeNull()
  })
})
