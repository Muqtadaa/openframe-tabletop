/**
 * What one room will carry, decided from values, with no runtime in sight.
 *
 * Cloudflare will not stop spending at a number: past the plan's included
 * amounts, usage is billed automatically, and a budget alert only arrives the
 * day after (docs/plans/02-phase-1-prep.md). So the stop has to be ours. Every
 * limit here bounds a WORST CASE — a script, a bug, a runaway tab — and is set
 * well above anything a table of three to six people does, so that nobody
 * playing ever meets one. A "normal table never trips it" test per limit holds
 * that; the cost model that chose the numbers is in the plan.
 *
 * Same split as `access.ts` and `assets.ts`, for the same reason: a Durable
 * Object can only be exercised by deploying it, and a guard that can only be
 * run by deploying is a guard nobody runs.
 *
 * NO TIMERS (rule 29). Every window and every bucket is worked out from the
 * clock at the moment something happens, never by something waking up to reset
 * it: a timer keeps a room in memory, and a room in memory is what costs money.
 */

const MiB = 1024 * 1024

export const LIMITS = {
  /**
   * Live connections in one room. A table is three to six people, each on a
   * phone and a laptop, plus a cast screen and a reconnect overlapping its
   * predecessor.
   */
  connections: 24,
  /**
   * New connections in one rolling window: a reconnect loop or a script. Sixty
   * is every one of 24 devices rejoining twice after a network blip.
   */
  attempts: { count: 60, windowMs: 60_000 },
  /**
   * Messages from ONE socket. Presence goes out at most ten times a second
   * (rule 29) and a drag commits once (rule 4), so sixty a second sustained is
   * six times what anybody does, with room for a burst after a reconnect.
   */
  socketMessages: { burst: 120, perSecond: 60 },
  /**
   * Messages into the room from every socket together: 24 sockets each sending
   * presence at its ten a second is 240, with room for the edits on top.
   */
  roomMessages: { burst: 1200, perSecond: 400 },
  /**
   * Bytes from one socket. The burst admits one maximal frame, which is what
   * publishing a whole board is (`MAX_MESSAGE_BYTES`); the refill is what a
   * sustained flood of them cannot get past.
   */
  socketBytes: { burst: 32 * MiB, perSecond: MiB / 2 },
  /**
   * The stored document, snapshot and log. Compaction rewrites the whole
   * snapshot every sixty-four updates, so what a board costs grows with its
   * size; real boards are kilobytes to a few megabytes.
   */
  documentBytes: 24 * MiB,
  /** Images on one board. */
  imagesPerBoard: 200,
  /** All of one board's images together. */
  imageBytesPerBoard: 256 * MiB,
} as const

/** Close codes: the standard ones where one fits, so the client's ordinary reconnect handles them. */
export const CLOSE_POLICY = 1008

/**
 * A bucket that fills at a steady rate up to a burst and is drained by use.
 *
 * Refilled from the elapsed time when it is next asked, not on a schedule, so
 * a room nobody is sending to holds no state that needs waking.
 */
export class TokenBucket {
  #tokens: number
  #at: number

  constructor(
    private readonly burst: number,
    private readonly perSecond: number,
    now: number,
  ) {
    this.#tokens = burst
    this.#at = now
  }

  /** Takes `cost` if there is that much; false, taking nothing, if there is not. */
  take(cost: number, now: number): boolean {
    const elapsed = Math.max(0, now - this.#at)
    this.#at = now
    this.#tokens = Math.min(this.burst, this.#tokens + (elapsed / 1000) * this.perSecond)
    if (cost > this.#tokens) return false
    this.#tokens -= cost
    return true
  }
}

/** Counts events in a rolling window, from the timestamps themselves. */
export class AttemptWindow {
  #times: number[] = []

  constructor(
    private readonly count: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt at `now`; false if this one is over the allowance. */
  record(now: number): boolean {
    const from = now - this.windowMs
    while (this.#times.length > 0 && this.#times[0]! <= from) this.#times.shift()
    if (this.#times.length >= this.count) return false
    this.#times.push(now)
    return true
  }
}

export type AdmitDecision =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly status: number
      readonly reason: string
      readonly retryAfterSeconds: number
    }

/**
 * Whether one more connection may be accepted.
 *
 * The attempt is recorded only if the room has space, so a full room being
 * knocked on does not also use up the allowance of the people already in it.
 */
export function admitDecision(open: number, attempts: AttemptWindow, now: number): AdmitDecision {
  if (open >= LIMITS.connections) {
    return {
      ok: false,
      status: 503,
      reason: 'This board has as many people on it as it takes',
      retryAfterSeconds: 30,
    }
  }
  if (!attempts.record(now)) {
    return {
      ok: false,
      status: 429,
      reason: 'Too many attempts to join this board',
      retryAfterSeconds: 60,
    }
  }
  return { ok: true }
}

/** What a board's stored images come to. */
export interface AssetTally {
  readonly count: number
  readonly bytes: number
}

export type QuotaDecision =
  { readonly ok: true } | { readonly ok: false; readonly status: number; readonly reason: string }

/**
 * Whether a board may take one more image of `length` bytes.
 *
 * Judged on what the upload DECLARES, before its body is read, so a board at
 * its limit spends nothing on the refusal. 507 is "insufficient storage": the
 * request was fine and the board has no room, which is not the 413 of one file
 * being too big.
 */
export function assetQuotaDecision(tally: AssetTally, length: number): QuotaDecision {
  if (tally.count >= LIMITS.imagesPerBoard || tally.bytes + length > LIMITS.imageBytesPerBoard) {
    return { ok: false, status: 507, reason: 'This board has reached its image limit' }
  }
  return { ok: true }
}

/** Whether a stored document is past what a room will keep growing. */
export function documentIsFull(
  storedBytes: number,
  ceiling: number = LIMITS.documentBytes,
): boolean {
  return storedBytes > ceiling
}

/**
 * The document ceiling, from the one setting that may lower it.
 *
 * For the rooms suite, which cannot build a 24 MiB board in a browser to see
 * the room refuse it, and never set in `wrangler.toml` (the same arrangement
 * as `HISTORY_TIMING`). Anything that is not a positive whole number is
 * ignored, so a typo in a deploy cannot switch the limit off.
 */
export function documentCeiling(raw: string | undefined): number {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : LIMITS.documentBytes
}

/**
 * Whether the operator has paused shared play.
 *
 * Unset or empty is running, and so is an explicit no. ANYTHING ELSE pauses, so
 * a typo in the value ("pasued", "yes please") is a pause and not a silent
 * failure to pause: this is the lever somebody reaches for when money is going
 * out, and a lever that does nothing when it is slightly mis-set is worse than
 * none.
 */
export function isPaused(raw: string | undefined): boolean {
  const value = (raw ?? '').trim().toLowerCase()
  return value !== '' && !['0', 'false', 'no', 'off'].includes(value)
}

export type PauseDecision =
  | { readonly kind: 'run' }
  /** A WebSocket upgrade: accepted by the Worker and closed with `CLOSE_ROOMS_PAUSED`. */
  | { readonly kind: 'socket' }
  | {
      readonly kind: 'refuse'
      readonly status: number
      readonly reason: string
      readonly retryAfterSeconds: number
    }

/**
 * What a paused Worker does with a request, decided before any room is looked
 * up, so a pause wakes no Durable Object at all.
 *
 * The health check and the CORS preflight are not in `routed`: they name no
 * board and wake nothing, and a pause that broke the health check would read as
 * an outage to whatever watches it.
 */
export function pauseDecision(raw: string | undefined, routed: 'room' | 'other'): PauseDecision {
  if (!isPaused(raw)) return { kind: 'run' }
  if (routed === 'room') return { kind: 'socket' }
  return {
    kind: 'refuse',
    status: 503,
    reason: 'Shared play is paused',
    retryAfterSeconds: 300,
  }
}
