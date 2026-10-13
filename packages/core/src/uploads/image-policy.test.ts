import { describe, expect, it } from 'vitest'

import { imageHeader } from './image-fixtures.js'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_GIF_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  readImageSize,
  sniffImageType,
  validateImage,
  type AllowedImageType,
} from './image-policy.js'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0])
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])
const WAV = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45])
const box = (brand: string) =>
  new Uint8Array([0, 0, 0, 0x1c, ...new TextEncoder().encode(`ftyp${brand}`), 0, 0, 0, 0])
/** A file-type box: size, "ftyp", major brand, minor version, compatible brands. */
function ftyp(major: string, compatible: readonly string[]): Uint8Array {
  const text = new TextEncoder().encode(`ftyp${major}\0\0\0\0${compatible.join('')}`)
  const size = 4 + text.length
  return new Uint8Array([0, 0, 0, size, ...text])
}
const AVIF = box('avif')
const AVIF_SEQUENCE = box('avis')
const MP4 = box('isom')
const HEIC = box('heic')
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')

describe('sniffImageType', () => {
  it('recognises every allowed format by its bytes', () => {
    expect([PNG, JPEG, GIF, WEBP, AVIF].map(sniffImageType)).toEqual([...ALLOWED_IMAGE_TYPES])
    expect(sniffImageType(AVIF_SEQUENCE)).toBe('image/avif')
  })

  it('does not recognise SVG, which is markup rather than a raster format', () => {
    expect(sniffImageType(SVG)).toBeNull()
  })

  it('does not mistake another RIFF container for WebP', () => {
    expect(sniffImageType(WAV)).toBeNull()
  })

  /** Same box, different brand: an MP4 or a HEIC is not an AVIF. */
  it('does not mistake another ISO media file for AVIF', () => {
    expect(sniffImageType(MP4)).toBeNull()
    expect(sniffImageType(HEIC)).toBeNull()
  })

  it('returns null rather than reading past the end of a short buffer', () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50]))).toBeNull()
    expect(sniffImageType(new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74]))).toBeNull()
    expect(sniffImageType(new Uint8Array())).toBeNull()
  })

  /**
   * The spec asks for the AVIF brand somewhere in the file-type box, not as its
   * major brand: a file may lead with the generic `mif1` and list `avif` among
   * its compatible brands. Such a file is a real AVIF and must be let in.
   */
  it('recognises AVIF named among the compatible brands, not only as the major one', () => {
    expect(sniffImageType(ftyp('mif1', ['mif1', 'avif', 'miaf']))).toBe('image/avif')
    expect(sniffImageType(ftyp('msf1', ['msf1', 'avis']))).toBe('image/avif')
  })

  it('does not take a HEIC that lists only generic brands for an AVIF', () => {
    expect(sniffImageType(ftyp('mif1', ['mif1', 'heic', 'miaf']))).toBeNull()
  })

  /** A brand is only a brand inside the box: bytes after it are something else. */
  it('reads brands no further than the box says it runs', () => {
    const box = ftyp('mif1', ['mif1'])
    const trailing = new Uint8Array([...box, ...new TextEncoder().encode('avif')])
    expect(sniffImageType(trailing)).toBeNull()
  })

  it('survives a box that claims to run past the end of the file', () => {
    const box = ftyp('mif1', ['avif'])
    box[3] = 0xff
    expect(sniffImageType(box)).toBe('image/avif')
    expect(sniffImageType(box.subarray(0, 18))).toBeNull()
  })
})

describe('validateImage', () => {
  it('accepts a real PNG and a real AVIF', () => {
    const png = imageHeader('image/png', 640, 480)
    const avif = imageHeader('image/avif', 640, 480)
    expect(validateImage('image/png', png, png.length)).toEqual({ ok: true, type: 'image/png' })
    expect(validateImage('image/avif', avif, avif.length)).toEqual({ ok: true, type: 'image/avif' })
  })

  it('rejects SVG outright', () => {
    expect(validateImage('image/svg+xml', SVG, SVG.length)).toEqual({
      ok: false,
      failure: { reason: 'unsupported-type', declared: 'image/svg+xml' },
    })
  })

  /** The renamed-file attack: SVG markup declared as a PNG. */
  it('rejects content that does not match its declared type', () => {
    expect(validateImage('image/png', SVG, SVG.length)).toEqual({
      ok: false,
      failure: { reason: 'content-mismatch', declared: 'image/png', actual: null },
    })
  })

  it('rejects one raster format masquerading as another', () => {
    expect(validateImage('image/png', JPEG, JPEG.length)).toMatchObject({
      ok: false,
      failure: { reason: 'content-mismatch', actual: 'image/jpeg' },
    })
  })

  it('accepts a file exactly at the size limit and rejects one byte over', () => {
    const png = imageHeader('image/png', 800, 600)
    expect(validateImage('image/png', png, MAX_IMAGE_BYTES).ok).toBe(true)
    expect(validateImage('image/png', png, MAX_IMAGE_BYTES + 1)).toMatchObject({
      ok: false,
      failure: { reason: 'too-large' },
    })
  })

  it('checks size first, so an enormous file is rejected without reading it', () => {
    expect(validateImage('application/pdf', new Uint8Array(), MAX_IMAGE_BYTES + 1)).toMatchObject({
      ok: false,
      failure: { reason: 'too-large' },
    })
  })
})

const TYPES: readonly AllowedImageType[] = [...ALLOWED_IMAGE_TYPES]

describe('readImageSize', () => {
  it.each(TYPES)('reads the size a %s header declares', (type) => {
    expect(readImageSize(imageHeader(type, 1234, 567), type)).toEqual({ width: 1234, height: 567 })
  })

  it('reads the size of the real encodings a header builder does not make', () => {
    // WebP lossy ("VP8 "): frame tag, start code 9d 01 2a, then 14-bit sizes.
    const lossy = new Uint8Array(40)
    lossy.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20])
    lossy.set([0x9d, 0x01, 0x2a, 0x40, 0x06, 0xb0, 0x04], 23) // 1600 x 1200
    expect(readImageSize(lossy, 'image/webp')).toEqual({ width: 1600, height: 1200 })

    // WebP lossless ("VP8L"): signature 0x2f, then 14-bit sizes each minus one.
    const lossless = new Uint8Array(40)
    lossless.set([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
    ])
    const bits = (640 - 1) | ((480 - 1) << 14)
    lossless.set(
      [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff],
      20,
    )
    expect(readImageSize(lossless, 'image/webp')).toEqual({ width: 640, height: 480 })
  })

  /** A JPEG's size is in its start-of-frame, which can come after other segments. */
  it('finds a JPEG size past an earlier segment', () => {
    const jpeg = new Uint8Array(64)
    // SOI, an APP0 segment of length 6, then the frame.
    jpeg.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x06, 1, 2, 3, 4, 0xff, 0xc2, 0x00, 0x11, 0x08])
    jpeg.set([0x04, 0x00, 0x08, 0x00], 15) // 1024 high, 2048 wide
    expect(readImageSize(jpeg, 'image/jpeg')).toEqual({ width: 2048, height: 1024 })
  })

  it('takes the largest AVIF extent, so a thumbnail cannot stand in for the picture', () => {
    // The builder's `ispe` says 100 x 100; add a second, later one saying 20000 x 20000.
    const avif = imageHeader('image/avif', 100, 100)
    const view = new DataView(avif.buffer)
    view.setUint32(40, 20)
    avif.set([0x69, 0x73, 0x70, 0x65], 44)
    view.setUint32(52, 20000)
    view.setUint32(56, 20000)
    expect(readImageSize(avif, 'image/avif')).toEqual({ width: 20000, height: 20000 })
  })

  it('returns null rather than reading past the end of a short buffer', () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50]))).toBeNull()
    expect(sniffImageType(new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74]))).toBeNull()
    expect(sniffImageType(new Uint8Array())).toBeNull()
  })

  /**
   * The spec asks for the AVIF brand somewhere in the file-type box, not as its
   * major brand: a file may lead with the generic `mif1` and list `avif` among
   * its compatible brands. Such a file is a real AVIF and must be let in.
   */
  it('recognises AVIF named among the compatible brands, not only as the major one', () => {
    expect(sniffImageType(ftyp('mif1', ['mif1', 'avif', 'miaf']))).toBe('image/avif')
    expect(sniffImageType(ftyp('msf1', ['msf1', 'avis']))).toBe('image/avif')
  })

  it('does not take a HEIC that lists only generic brands for an AVIF', () => {
    expect(sniffImageType(ftyp('mif1', ['mif1', 'heic', 'miaf']))).toBeNull()
  })

  /** A brand is only a brand inside the box: bytes after it are something else. */
  it('reads brands no further than the box says it runs', () => {
    const box = ftyp('mif1', ['mif1'])
    const trailing = new Uint8Array([...box, ...new TextEncoder().encode('avif')])
    expect(sniffImageType(trailing)).toBeNull()
  })

  it('survives a box that claims to run past the end of the file', () => {
    const box = ftyp('mif1', ['avif'])
    box[3] = 0xff
    expect(sniffImageType(box)).toBe('image/avif')
    expect(sniffImageType(box.subarray(0, 18))).toBeNull()
  })
})

describe('validateImage, cost limits', () => {
  it('refuses a GIF over its own, lower, limit but accepts a still of the same size', () => {
    const gif = imageHeader('image/gif', 800, 600)
    expect(validateImage('image/gif', gif, MAX_GIF_BYTES).ok).toBe(true)
    expect(validateImage('image/gif', gif, MAX_GIF_BYTES + 1)).toEqual({
      ok: false,
      failure: { reason: 'gif-too-large', byteSize: MAX_GIF_BYTES + 1 },
    })
    expect(
      validateImage('image/png', imageHeader('image/png', 800, 600), MAX_GIF_BYTES + 1).ok,
    ).toBe(true)
  })

  it.each(TYPES)('holds a %s to the pixel limit, to the pixel', (type) => {
    const side = Math.floor(Math.sqrt(MAX_IMAGE_PIXELS))
    expect(validateImage(type, imageHeader(type, side, side), 1000).ok).toBe(true)
    expect(validateImage(type, imageHeader(type, side + 1, side + 1), 1000)).toMatchObject({
      ok: false,
      failure: { reason: 'too-many-pixels' },
    })
  })

  it('refuses a file whose size cannot be read, rather than letting it through', () => {
    expect(validateImage('image/png', PNG, PNG.length)).toEqual({
      ok: false,
      failure: { reason: 'unreadable-size' },
    })
    expect(validateImage('image/png', imageHeader('image/png', 0, 10), 100)).toMatchObject({
      ok: false,
      failure: { reason: 'unreadable-size' },
    })
  })

  /** A small file can still be enormous: the whole point of a pixel limit. */
  it('refuses a few hundred bytes that declare a hundred-megapixel picture', () => {
    expect(validateImage('image/jpeg', imageHeader('image/jpeg', 12000, 9000), 300)).toMatchObject({
      ok: false,
      failure: { reason: 'too-many-pixels', width: 12000, height: 9000 },
    })
  })
})
