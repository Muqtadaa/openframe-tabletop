import { expect, test } from '@playwright/test'

import { BOARD_URL } from '../e2e/routes.js'
import { inBucket, newRoomId } from './rooms.js'

/**
 * An upload checked by the room itself, not only by the browser.
 *
 * The policy is unit-tested in `packages/core/src/uploads` and the room's
 * reading of the body in `apps/rooms/src/assets.test.ts`. This is a client
 * that never ran the browser's check — a plain fetch with an image's type and
 * somebody else's bytes — and the bucket it must not reach.
 */
test('the room refuses markup sent as an image, and stores nothing', async ({ page }) => {
  const room = newRoomId()
  await page.goto(BOARD_URL)

  const statuses = await page.evaluate(async (id) => {
    const base = `http://127.0.0.1:8787/room/${id}`
    const claimed = await fetch(`${base}/claim`, { method: 'POST' })
    const keys = (await claimed.json()) as { editor: string }
    const put = (name: string, body: Uint8Array<ArrayBuffer>) =>
      fetch(`${base}/asset/${name}`, {
        method: 'PUT',
        headers: { 'content-type': 'image/png', 'x-openframe-key': keys.editor },
        body,
      }).then((response) => response.status)

    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    )
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0,
      1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
    ])
    return { disguised: await put('img_svg', svg), genuine: await put('img_png', png) }
  }, room)

  expect(statuses.disguised).toBe(415)
  expect(await inBucket(`${room}/img_svg`)).toBe(false)
  // And a real one still goes through, or the check above proves nothing.
  expect(statuses.genuine).toBe(204)
  expect(await inBucket(`${room}/img_png`)).toBe(true)
})

/**
 * The cost limits, against the real room: a few bytes that DECLARE a picture
 * no phone could decode are refused on what the header says, and a GIF over its
 * own lower limit is refused before its body is read.
 */
test('the room refuses an image of too many pixels and a GIF that is too large', async ({
  page,
}) => {
  const room = newRoomId()
  await page.goto(BOARD_URL)

  const statuses = await page.evaluate(async (id) => {
    const base = `http://127.0.0.1:8787/room/${id}`
    const claimed = await fetch(`${base}/claim`, { method: 'POST' })
    const keys = (await claimed.json()) as { editor: string }
    // A refusal made from the declared length alone is sent while the body is
    // still going up, and a browser may report that as a failed request rather
    // than as the 413. Either way the upload did not land, which is the claim;
    // the bucket check below is what shows it.
    const put = (type: string, name: string, body: Uint8Array<ArrayBuffer>) =>
      fetch(`${base}/asset/${name}`, {
        method: 'PUT',
        headers: { 'content-type': type, 'x-openframe-key': keys.editor },
        body,
      })
        .then((response) => response.status)
        .catch(() => 0)

    // A JPEG that says it is 12000 x 9000: 108 megapixels in 20 bytes.
    const huge = new Uint8Array([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x23, 0x28, 0x2e, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    // A GIF header over the 6 MiB GIF limit, still far under the 12 MiB image limit.
    const gif = new Uint8Array(6 * 1024 * 1024 + 1)
    gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x03, 0x58, 0x02])
    return {
      pixels: await put('image/jpeg', 'img_huge', huge),
      gif: await put('image/gif', 'img_gif', gif),
    }
  }, room)

  expect(statuses.pixels).toBe(413)
  expect([0, 413]).toContain(statuses.gif)
  expect(await inBucket(`${room}/img_huge`)).toBe(false)
  expect(await inBucket(`${room}/img_gif`)).toBe(false)
})
