import { expect, test } from '@playwright/test'

import { BOARD_URL } from '../e2e/routes.js'
import { newRoomId } from './rooms.js'

/**
 * The kill switch, against a real Worker with it thrown.
 *
 * `playwright.rooms.config.ts` starts a second room server on 8788 with
 * `ROOMS_PAUSED` set. The unit test (`apps/rooms/src/index.test.ts`) proves a
 * paused Worker never reaches for a room; this is what it does instead, over a
 * real socket and real requests: the code a browser can read, and the refusals
 * a client can act on.
 */
const PAUSED = 'http://127.0.0.1:8788'

test('a paused Worker closes a socket with the pause code, and wakes nothing', async ({ page }) => {
  await page.goto(BOARD_URL)
  const closed = await page.evaluate(
    (id) =>
      new Promise<{ code: number; reason: string }>((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:8788/room/${id}`)
        socket.onclose = (event) => resolve({ code: event.code, reason: event.reason })
        socket.onerror = () =>
          reject(new Error('the socket failed rather than closing with a code'))
      }),
    newRoomId(),
  )
  expect(closed).toEqual({ code: 4005, reason: 'Shared play is paused' })
})

test('a paused Worker refuses everything else with a long wait, but still says it is well', async ({
  request,
}) => {
  const room = newRoomId()
  const claim = await request.post(`${PAUSED}/room/${room}/claim`)
  const asset = await request.get(`${PAUSED}/room/${room}/asset/img_1`)
  const health = await request.get(`${PAUSED}/health`)

  expect([claim.status(), claim.headers()['retry-after']]).toEqual([503, '300'])
  expect([asset.status(), asset.headers()['retry-after']]).toEqual([503, '300'])
  expect(health.status()).toBe(200)
})
