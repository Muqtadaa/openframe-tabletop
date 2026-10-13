import { describe, expect, it, vi } from 'vitest'

// The Worker module re-exports the Durable Object, which imports the Workers
// runtime; Node has no such module and nothing below runs the object.
vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }))

const { default: worker } = await import('./index.js')

import type { Env } from './env.js'

/**
 * The kill switch, at the front door.
 *
 * What matters about a pause is what it does NOT do: it wakes no room. So the
 * namespace here is a trap, and a paused Worker must never reach for it,
 * whatever the request names.
 */
function env(paused: string | undefined): { env: Env; touched: () => number } {
  let touched = 0
  const trap = new Proxy(
    {},
    {
      get: () => {
        touched += 1
        throw new Error('a room was reached')
      },
    },
  )
  return {
    env: {
      ROOMS: trap,
      ASSETS: trap,
      ...(paused === undefined ? {} : { ROOMS_PAUSED: paused }),
    } as unknown as Env,
    touched: () => touched,
  }
}

const ROOM = 'brd_abcdefgh12345678'
const ask = (path: string, init?: RequestInit) => new Request(`https://rooms.test${path}`, init)

describe('a paused Worker', () => {
  const paused = ['1', 'true', 'pasued']

  it.each(paused)('wakes no room for a board request ("%s")', async (value) => {
    const { env: bound, touched } = env(value)
    const requests = [
      ask(`/room/${ROOM}/claim`, { method: 'POST' }),
      ask(`/room/${ROOM}/asset/img_1`, { method: 'PUT', body: new Uint8Array([1]) }),
      ask(`/room/${ROOM}/asset/img_1`),
      ask(`/room/${ROOM}/versions`),
      ask(`/room/${ROOM}/password`, { method: 'POST' }),
      ask(`/room/${ROOM}/destroy`, { method: 'POST' }),
    ]
    for (const request of requests) {
      const response = await worker.fetch(request, bound)
      expect(response.status).toBe(503)
      expect(response.headers.get('Retry-After')).toBe('300')
    }
    expect(touched()).toBe(0)
  })

  it('still answers the health check and a preflight, which name no room', async () => {
    const { env: bound, touched } = env('1')
    expect((await worker.fetch(ask('/health'), bound)).status).toBe(200)
    expect(
      (await worker.fetch(ask(`/room/${ROOM}/asset/img_1`, { method: 'OPTIONS' }), bound)).status,
    ).toBe(204)
    expect(touched()).toBe(0)
  })

  it('still refuses what was never a room, as before', async () => {
    const { env: bound } = env('1')
    expect((await worker.fetch(ask('/nowhere'), bound)).status).toBe(404)
  })
})

describe('a Worker that is running', () => {
  it.each([undefined, '', '0', 'false'])('goes on to the room ("%s")', (value) => {
    const { env: bound, touched } = env(value)
    // The trap throws on first touch, synchronously: the Worker went for a room.
    expect(() => worker.fetch(ask(`/room/${ROOM}/claim`, { method: 'POST' }), bound)).toThrow(
      'a room was reached',
    )
    expect(touched()).toBeGreaterThan(0)
  })
})
