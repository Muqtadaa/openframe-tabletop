/// <reference types="@cloudflare/workers-types" />

export interface Env {
  readonly ROOMS: DurableObjectNamespace
  /**
   * Where a board's images live.
   *
   * Outside the Durable Object's storage on purpose: that storage is the
   * board's document and its update log, and putting megabytes of photograph
   * beside them would be paid for on every snapshot, every compaction and
   * every read of a board nobody is looking at pictures on.
   */
  readonly ASSETS: R2Bucket
  /**
   * `"<settle ms>,<interval ms>"`, for the rooms suite only, which cannot wait
   * minutes for a version (ADR 0019). Never set in `wrangler.toml`.
   */
  readonly HISTORY_TIMING?: string
  /**
   * A lower ceiling on a stored document, in bytes, for the rooms suite only
   * (`limits.ts`). Never set in `wrangler.toml`.
   */
  readonly DOCUMENT_CEILING_BYTES?: string
  /**
   * The kill switch (`limits.ts` `isPaused`). Anything but empty or an explicit
   * no pauses shared play: the Worker answers before any room is woken. Set by
   * the deploy workflow's `paused` input, since a value changed in the
   * dashboard is overwritten by the next deploy.
   */
  readonly ROOMS_PAUSED?: string
}
