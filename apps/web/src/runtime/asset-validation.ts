/**
 * What may be brought onto a board, and how that is decided.
 *
 * This is policy, not storage, which is why it sits beside the runtime rather
 * than in an adapter: swapping IndexedDB for a server must not change what a
 * user is allowed to upload.
 */

/*
 * The policy itself is shared with the room that stores uploads
 * (`@openframe/core/uploads`), so the browser can never promise an upload the
 * server will refuse, nor check less than the server does.
 */
import {
  MAX_GIF_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  type ValidationFailure,
} from '@openframe/core/uploads'

export {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  sniffImageType,
  validateImage,
  type AllowedImageType,
  type ValidationFailure,
  type ValidationResult,
} from '@openframe/core/uploads'

/** Phrased for someone who dragged a file in, not for a log. */
export function describeFailure(failure: ValidationFailure): string {
  switch (failure.reason) {
    case 'too-large': {
      const mb = (failure.byteSize / 1024 / 1024).toFixed(1)
      return `That image is ${mb}MB — the limit is ${String(MAX_IMAGE_BYTES / 1024 / 1024)}MB.`
    }
    case 'unsupported-type':
      return failure.declared === 'image/svg+xml'
        ? 'SVG files are not supported. PNG, JPEG, GIF, WebP and AVIF are.'
        : `${failure.declared || 'That file'} is not a supported image. Use PNG, JPEG, GIF, WebP or AVIF.`
    case 'content-mismatch':
      return `That file is named like ${failure.declared} but its contents are ${failure.actual ?? 'not a supported image'}.`
    case 'gif-too-large': {
      const mb = (failure.byteSize / 1024 / 1024).toFixed(1)
      return `That GIF is ${mb}MB — the limit for a GIF is ${String(MAX_GIF_BYTES / 1024 / 1024)}MB.`
    }
    case 'too-many-pixels':
      return `That image is ${String(failure.width)} × ${String(failure.height)} pixels — the limit is ${String(MAX_IMAGE_PIXELS / 1_000_000)} megapixels.`
    case 'unreadable-size':
      return 'The size of that image could not be read.'
  }
}
