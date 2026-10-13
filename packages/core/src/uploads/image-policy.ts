/**
 * What may be brought onto a board as an image, decided by its content.
 *
 * ONE policy, read by both the browser that uploads and the room that stores.
 * It used to be written twice and the two had drifted: the browser allowed
 * 20MB and refused AVIF, the room allowed 12MB and took AVIF, and only the
 * browser looked at the bytes. A server check that is weaker than the client's
 * is the only one an attacker meets, and a client check that is looser than
 * the server's is a promise the upload then breaks. Here, so neither can.
 *
 * Pure data and pure functions: no DOM, no Workers runtime, nothing to import.
 */

/**
 * SVG IS DELIBERATELY ABSENT.
 *
 * An SVG is not an image but a document: it can carry `<script>`, external
 * references, CSS and foreign objects, so rendering an untrusted one is running
 * untrusted markup. Accepting it safely means sanitising it, and a
 * half-sanitised SVG is more dangerous than a rejected one because it looks
 * handled. It can be added when there is a sanitiser to add with it — see
 * docs/architecture/11-security.md.
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

/**
 * Large enough for a photograph, small enough that a board is not free file
 * hosting and a room never has to hold much in memory to check what it got.
 */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024

/**
 * An animated GIF is held to less than a still, because a still costs its
 * bytes and a GIF costs its bytes AND every frame decoded: the usual way a
 * "map background" becomes a tab that stops responding. Six megabytes is a
 * long, detailed loop; past it the same picture is better as a video or a still.
 */
export const MAX_GIF_BYTES = 6 * 1024 * 1024

/**
 * The most pixels one image may have: 36 megapixels, 6000 x 6000.
 *
 * A byte limit alone does not bound it. A 12MB JPEG can hold well over a
 * hundred megapixels, and a browser decodes that to width x height x 4 bytes —
 * half a gigabyte for the people at the table, most of them on a phone. The
 * header says the size before anything is decoded, which is why this can be
 * checked here, by the same policy in the browser and in the room.
 */
export const MAX_IMAGE_PIXELS = 36_000_000

export type ValidationFailure =
  | { readonly reason: 'too-large'; readonly byteSize: number }
  | { readonly reason: 'unsupported-type'; readonly declared: string }
  | {
      readonly reason: 'content-mismatch'
      readonly declared: string
      readonly actual: string | null
    }
  | { readonly reason: 'gif-too-large'; readonly byteSize: number }
  | { readonly reason: 'too-many-pixels'; readonly width: number; readonly height: number }
  /** Refused rather than waved through: a limit that skips what it cannot read is not one. */
  | { readonly reason: 'unreadable-size' }

export type ValidationResult =
  | { readonly ok: true; readonly type: AllowedImageType }
  | { readonly ok: false; readonly failure: ValidationFailure }

/** Byte signatures, long enough that a false positive is not a realistic worry. */
const SIGNATURES: readonly {
  readonly type: AllowedImageType
  readonly bytes: readonly number[]
}[] = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
]

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

const ascii = (text: string): number[] => [...text].map((char) => char.charCodeAt(0))

/**
 * Identifies an image from its leading bytes.
 *
 * A declared MIME type is whatever the sender says — for a browser `File` it
 * is derived from the extension, so renaming `payload.svg` to `photo.png`
 * produces a file that claims to be a PNG. The bytes are what actually decide.
 */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  for (const { type, bytes: signature } of SIGNATURES) {
    if (startsWith(bytes, signature)) return type
  }
  // WebP is a RIFF container: "RIFF" then four size bytes then "WEBP", so both
  // halves have to match — "RIFF" alone is also WAV and AVI.
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes.subarray(8), ascii('WEBP'))) {
    return 'image/webp'
  }
  if (isAvif(bytes)) return 'image/avif'
  return null
}

const AVIF_BRANDS = [ascii('avif'), ascii('avis')]

/**
 * Whether this is an AVIF: an ISO-BMFF file whose leading file-type box names
 * an AVIF brand.
 *
 * The brand is what separates it from MP4 and HEIC, which share the box — and
 * it may be the MAJOR brand or any of the COMPATIBLE ones. The spec only asks
 * for it somewhere in the box, and real encoders lead with the generic `mif1`
 * or `msf1` and list `avif` after it. Brands are read no further than the box
 * says it runs, nor past the end of what was given.
 */
function isAvif(bytes: Uint8Array): boolean {
  if (!startsWith(bytes.subarray(4), ascii('ftyp'))) return false
  const declared = (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!
  const end = Math.min(declared >>> 0, bytes.length)
  // The major brand at 8, then a minor version at 12 that is NOT a brand, then
  // the compatible brands from 16, four bytes each.
  const offsets = [8]
  for (let at = 16; at + 4 <= end; at += 4) offsets.push(at)
  return offsets.some(
    (at) =>
      at + 4 <= end && AVIF_BRANDS.some((brand) => startsWith(bytes.subarray(at, at + 4), brand)),
  )
}

const u16le = (b: Uint8Array, at: number): number => b[at]! | (b[at + 1]! << 8)
const u32be = (b: Uint8Array, at: number): number =>
  ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0

export interface ImageSize {
  readonly width: number
  readonly height: number
}

/**
 * The pixel size an image's header declares, or null when it cannot be read.
 *
 * Read from the header alone: nothing is decoded, so this is cheap enough for
 * a Durable Object and safe on a hostile file. It reports what the file CLAIMS;
 * a lying header can only make the browser decode less than it said, never more.
 * Bounded by what it was given — every read checks the length first.
 */
export function readImageSize(bytes: Uint8Array, type: AllowedImageType): ImageSize | null {
  switch (type) {
    case 'image/png':
      // "IHDR" must be the first chunk, so the size sits at a fixed offset.
      if (bytes.length < 24 || !startsWith(bytes.subarray(12), ascii('IHDR'))) return null
      return { width: u32be(bytes, 16), height: u32be(bytes, 20) }
    case 'image/gif':
      return bytes.length < 10 ? null : { width: u16le(bytes, 6), height: u16le(bytes, 8) }
    case 'image/jpeg':
      return jpegSize(bytes)
    case 'image/webp':
      return webpSize(bytes)
    case 'image/avif':
      return avifSize(bytes)
  }
}

/** Walks the marker segments to the first start-of-frame, which carries the size. */
function jpegSize(bytes: Uint8Array): ImageSize | null {
  let at = 2
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null
    const marker = bytes[at + 1]!
    // Padding, and markers that stand alone with no length.
    if (marker === 0xff) {
      at += 1
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2
      continue
    }
    const length = (bytes[at + 2]! << 8) | bytes[at + 3]!
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) {
      if (at + 9 > bytes.length) return null
      return {
        height: (bytes[at + 5]! << 8) | bytes[at + 6]!,
        width: (bytes[at + 7]! << 8) | bytes[at + 8]!,
      }
    }
    if (length < 2) return null
    at += 2 + length
  }
  return null
}

/** The three WebP encodings each keep the size in a different place. */
function webpSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 30) return null
  const chunk = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!)
  if (chunk === 'VP8X') {
    const w = (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)) + 1
    const h = (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)) + 1
    return { width: w, height: h }
  }
  if (chunk === 'VP8 ') {
    // After the 3-byte frame tag comes the start code 9d 01 2a, then 14-bit sizes.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null
    return { width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null
    const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24)
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  return null
}

/**
 * The largest size any `ispe` (image spatial extents) box declares.
 *
 * An AVIF can hold several images — the picture, a thumbnail, an alpha plane —
 * each with its own box. Taking the largest means a small thumbnail cannot
 * stand in for a huge picture; the boxes live in the metadata at the front of
 * the file, so only that is searched.
 */
function avifSize(bytes: Uint8Array): ImageSize | null {
  const end = Math.min(bytes.length, 64 * 1024) - 12
  const tag = ascii('ispe')
  let best: ImageSize | null = null
  for (let at = 4; at < end; at++) {
    if (!startsWith(bytes.subarray(at), tag)) continue
    const width = u32be(bytes, at + 8)
    const height = u32be(bytes, at + 12)
    if (best === null || width * height > best.width * best.height) best = { width, height }
  }
  return best
}

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

/**
 * Validates an upload by size, declared type AND actual content.
 *
 * All three matter. Size is checked first because it is free and rejects the
 * pathological case before anything reads the bytes. The declared type gives a
 * clear message for the ordinary mistake of dragging in a PDF. Sniffing is the
 * one a file cannot lie about, and is what keeps a disguised SVG out.
 */
export function validateImage(
  declaredType: string,
  bytes: Uint8Array,
  byteSize: number,
): ValidationResult {
  if (byteSize > MAX_IMAGE_BYTES) return { ok: false, failure: { reason: 'too-large', byteSize } }
  if (!isAllowedImageType(declaredType)) {
    return { ok: false, failure: { reason: 'unsupported-type', declared: declaredType } }
  }
  const actual = sniffImageType(bytes)
  if (actual !== declaredType) {
    return { ok: false, failure: { reason: 'content-mismatch', declared: declaredType, actual } }
  }
  if (declaredType === 'image/gif' && byteSize > MAX_GIF_BYTES) {
    return { ok: false, failure: { reason: 'gif-too-large', byteSize } }
  }
  const size = readImageSize(bytes, declaredType)
  if (size === null || size.width < 1 || size.height < 1) {
    return { ok: false, failure: { reason: 'unreadable-size' } }
  }
  if (size.width * size.height > MAX_IMAGE_PIXELS) {
    return {
      ok: false,
      failure: { reason: 'too-many-pixels', width: size.width, height: size.height },
    }
  }
  return { ok: true, type: declaredType }
}
