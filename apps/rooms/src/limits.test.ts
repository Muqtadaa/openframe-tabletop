import { describe, expect, it } from 'vitest'

import { MAX_PENDING } from './access.js'
import {
  admitDecision,
  assetQuotaDecision,
  AttemptWindow,
  documentCeiling,
  documentIsFull,
  isPaused,
  pauseDecision,
  LIMITS,
  TokenBucket,
} from './limits.js'

describe('the token bucket', () => {
  it('lets a burst through and then refuses until it has refilled', () => {
    const bucket = new TokenBucket(10, 5, 0)
    for (let i = 0; i < 10; i++) expect(bucket.take(1, 0)).toBe(true)
    expect(bucket.take(1, 0)).toBe(false)
    // Half a second at five a second is two and a half tokens.
    expect(bucket.take(1, 500)).toBe(true)
    expect(bucket.take(1, 500)).toBe(true)
    expect(bucket.take(1, 500)).toBe(false)
  })

  it('never holds more than its burst, however long it sat idle', () => {
    const bucket = new TokenBucket(10, 5, 0)
    for (let i = 0; i < 10; i++) bucket.take(1, 0)
    // An hour idle refills to the burst and not beyond it.
    for (let i = 0; i < 10; i++) expect(bucket.take(1, 3_600_000)).toBe(true)
    expect(bucket.take(1, 3_600_000)).toBe(false)
  })

  it('takes nothing on a refusal, so a large ask does not starve small ones', () => {
    const bucket = new TokenBucket(10, 0, 0)
    expect(bucket.take(11, 0)).toBe(false)
    expect(bucket.take(10, 0)).toBe(true)
  })

  it('survives a clock that steps backwards', () => {
    const bucket = new TokenBucket(10, 5, 1000)
    expect(bucket.take(1, 0)).toBe(true)
  })
})

describe('the attempt window', () => {
  it('allows its count in a window and refuses the next', () => {
    const window = new AttemptWindow(3, 1000)
    expect([0, 100, 200].map((t) => window.record(t))).toEqual([true, true, true])
    expect(window.record(300)).toBe(false)
  })

  it('forgets attempts as they leave the window', () => {
    const window = new AttemptWindow(2, 1000)
    window.record(0)
    window.record(500)
    expect(window.record(900)).toBe(false)
    // The first is now out of the window.
    expect(window.record(1001)).toBe(true)
  })
})

describe('admitting a connection', () => {
  it('turns a connection away from a full room, and does not count the knock', () => {
    const attempts = new AttemptWindow(LIMITS.attempts.count, LIMITS.attempts.windowMs)
    for (let i = 0; i < 100; i++) {
      expect(admitDecision(LIMITS.connections, attempts, i)).toMatchObject({
        ok: false,
        status: 503,
      })
    }
    // A room that has emptied still has its whole allowance.
    expect(admitDecision(0, attempts, 200)).toEqual({ ok: true })
  })

  it('turns away a reconnect loop with a wait to honour', () => {
    const attempts = new AttemptWindow(LIMITS.attempts.count, LIMITS.attempts.windowMs)
    for (let i = 0; i < LIMITS.attempts.count; i++) {
      expect(admitDecision(3, attempts, i)).toEqual({ ok: true })
    }
    expect(admitDecision(3, attempts, 1000)).toMatchObject({
      ok: false,
      status: 429,
      retryAfterSeconds: 60,
    })
  })

  /** A table that fills its room and reconnects after a network blip never meets the limit. */
  it('never refuses a busy table', () => {
    const attempts = new AttemptWindow(LIMITS.attempts.count, LIMITS.attempts.windowMs)
    // Six people, three devices each, all rejoining twice in a minute.
    for (let i = 0; i < 6 * 3 * 2; i++) {
      expect(admitDecision(18, attempts, i * 1000)).toEqual({ ok: true })
    }
  })
})

describe('message rates', () => {
  /** What a table does: presence ten times a second from every device, plus edits. */
  it('does not trouble a busy table', () => {
    const socket = new TokenBucket(LIMITS.socketMessages.burst, LIMITS.socketMessages.perSecond, 0)
    const room = new TokenBucket(LIMITS.roomMessages.burst, LIMITS.roomMessages.perSecond, 0)
    // Eighteen devices for a minute, each at 15 messages a second.
    for (let ms = 0; ms < 60_000; ms += 1000 / 15) {
      for (let device = 0; device < 18; device++) {
        if (device === 0) expect(socket.take(1, ms)).toBe(true)
        expect(room.take(1, ms)).toBe(true)
      }
    }
  })

  it('stops a socket that floods', () => {
    const socket = new TokenBucket(LIMITS.socketMessages.burst, LIMITS.socketMessages.perSecond, 0)
    let refused = 0
    for (let i = 0; i < 1000; i++) if (!socket.take(1, i)) refused++
    expect(refused).toBeGreaterThan(0)
  })

  it('lets one maximal frame through and then refuses a second straight after', () => {
    const bytes = new TokenBucket(LIMITS.socketBytes.burst, LIMITS.socketBytes.perSecond, 0)
    expect(bytes.take(32 * 1024 * 1024, 0)).toBe(true)
    expect(bytes.take(32 * 1024 * 1024, 1000)).toBe(false)
  })
})

describe('what a board may hold', () => {
  it('refuses an image past the count, and one past the total, before reading it', () => {
    expect(assetQuotaDecision({ count: 0, bytes: 0 }, 1024)).toEqual({ ok: true })
    expect(assetQuotaDecision({ count: LIMITS.imagesPerBoard, bytes: 0 }, 1)).toMatchObject({
      ok: false,
      status: 507,
    })
    expect(
      assetQuotaDecision({ count: 1, bytes: LIMITS.imageBytesPerBoard - 10 }, 11),
    ).toMatchObject({ ok: false, status: 507 })
    expect(assetQuotaDecision({ count: 1, bytes: LIMITS.imageBytesPerBoard - 10 }, 10)).toEqual({
      ok: true,
    })
  })

  it('does not trouble a campaign: a hundred 2 MiB maps are well inside it', () => {
    expect(assetQuotaDecision({ count: 99, bytes: 99 * 2 * 1024 * 1024 }, 2 * 1024 * 1024)).toEqual(
      {
        ok: true,
      },
    )
  })

  it('calls a document full only past its ceiling', () => {
    expect(documentIsFull(LIMITS.documentBytes)).toBe(false)
    expect(documentIsFull(LIMITS.documentBytes + 1)).toBe(true)
    // A big board is a few megabytes; it is nowhere near.
    expect(documentIsFull(5 * 1024 * 1024)).toBe(false)
  })
})

describe('the document ceiling setting', () => {
  it('takes a positive whole number and nothing else, so a typo cannot lift the limit', () => {
    expect(documentCeiling('4096')).toBe(4096)
    for (const bad of [undefined, '', '0', '-5', '1.5', 'many', 'NaN', 'Infinity']) {
      expect(documentCeiling(bad)).toBe(LIMITS.documentBytes)
    }
  })

  it('is what documentIsFull is judged against', () => {
    expect(documentIsFull(5000, 4096)).toBe(true)
    expect(documentIsFull(5000)).toBe(false)
  })
})

describe('how the limits fit together', () => {
  /**
   * Connections waiting for a hello count against the room's whole allowance.
   * A waiting cap at or above it is a rule nothing can reach — the admission
   * spec used to open 32 silent sockets into a room that now holds 24 — and one
   * a stranger could use to fill every seat.
   */
  it('keeps the waiting cap under the room cap, so a stranger cannot hold every seat', () => {
    expect(MAX_PENDING).toBeLessThan(LIMITS.connections)
  })
})

describe('the kill switch', () => {
  it('runs when unset, empty or explicitly off', () => {
    for (const off of [undefined, '', '  ', '0', 'false', 'FALSE', 'no', 'off', ' Off ']) {
      expect(isPaused(off)).toBe(false)
    }
  })

  it('pauses on anything else, so a typo cannot leave it running', () => {
    for (const on of ['1', 'true', 'TRUE', 'yes', 'on', 'pasued', 'paused', 'yes please', '2']) {
      expect(isPaused(on)).toBe(true)
    }
  })

  it('lets everything through when running', () => {
    expect(pauseDecision('', 'room')).toEqual({ kind: 'run' })
    expect(pauseDecision(undefined, 'other')).toEqual({ kind: 'run' })
  })

  it('answers a socket with the pause code and refuses everything else with a long wait', () => {
    expect(pauseDecision('1', 'room')).toEqual({ kind: 'socket' })
    expect(pauseDecision('1', 'other')).toMatchObject({
      kind: 'refuse',
      status: 503,
      retryAfterSeconds: 300,
    })
  })
})
