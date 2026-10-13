import type { AllowedImageType } from './image-policy.js'

/**
 * The smallest header each format needs for its size to be read, for tests.
 *
 * The policy reads a picture's size from its header, so a few magic bytes no
 * longer stand in for an image: an unreadable size is refused. This builds a
 * header that says `width` x `height` and nothing more — enough for the policy,
 * not a picture anything could draw. Lives beside the policy so a test in
 * another package cannot drift from what the policy actually reads.
 */
export function imageHeader(
  type: AllowedImageType,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(64))
  const view = new DataView(out.buffer)
  const text = (at: number, value: string): void => {
    for (let i = 0; i < value.length; i++) out[at + i] = value.charCodeAt(i)
  }
  switch (type) {
    case 'image/png':
      out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      view.setUint32(8, 13)
      text(12, 'IHDR')
      view.setUint32(16, width)
      view.setUint32(20, height)
      return out
    case 'image/gif':
      text(0, 'GIF89a')
      view.setUint16(6, width, true)
      view.setUint16(8, height, true)
      return out
    case 'image/jpeg':
      // SOI, then one start-of-frame segment: length, precision, height, width.
      out.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08])
      view.setUint16(7, height)
      view.setUint16(9, width)
      return out
    case 'image/webp':
      // RIFF container, extended ("VP8X") layout: 24-bit sizes, each minus one.
      text(0, 'RIFF')
      text(8, 'WEBP')
      text(12, 'VP8X')
      view.setUint32(16, 10, true)
      out[24] = (width - 1) & 0xff
      out[25] = ((width - 1) >> 8) & 0xff
      out[26] = ((width - 1) >> 16) & 0xff
      out[27] = (height - 1) & 0xff
      out[28] = ((height - 1) >> 8) & 0xff
      out[29] = ((height - 1) >> 16) & 0xff
      return out
    case 'image/avif': {
      // A file-type box naming the brand, then an `ispe` box with the size.
      view.setUint32(0, 20)
      text(4, 'ftypavif')
      view.setUint32(20, 20)
      text(24, 'ispe')
      view.setUint32(32, width)
      view.setUint32(36, height)
      return out
    }
  }
}
