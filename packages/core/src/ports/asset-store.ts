import type { AssetRef } from '../domain/document.js'
import type { AssetId } from '../domain/ids.js'

/**
 * Binary content, described structurally rather than as a DOM `Blob`.
 *
 * A browser `Blob` satisfies this interface as-is, and so does a Node buffer
 * wrapper, without `@openframe/core` ever depending on `lib.dom`. It is a small
 * illustration of the general rule: the domain names what it needs, and
 * adapters supply something that fits.
 */
export interface AssetBlob {
  readonly size: number
  readonly type: string
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * Binary content, kept deliberately outside the document.
 *
 * Objects hold an `AssetRef`; the bytes live here. That separation is what
 * keeps saves small, undo entries cheap and — later — CRDT updates viable.
 * An object may reference an asset whose bytes have not arrived yet; the
 * renderer shows a placeholder rather than blocking.
 */
export interface AssetStore {
  put(id: AssetId, blob: AssetBlob): Promise<AssetRef>
  /** A URL usable by the renderer. May be an object URL, a CDN URL or signed. */
  resolve(ref: AssetRef): Promise<string>
  delete(id: AssetId): Promise<void>
}

/**
 * An upload the store was told NO to, for a reason somebody can act on.
 *
 * Distinct from a failure of the network, which the store survives by keeping
 * the picture on this device and trying again later. A refusal is final: the
 * room will give the same answer next time (the image is too large, or the
 * board has all the images it will keep), so keeping it and retrying on every
 * open would be an upload that can never land. `message` is written for the
 * person who dropped the file in.
 */
export class AssetRefused extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssetRefused'
  }
}
