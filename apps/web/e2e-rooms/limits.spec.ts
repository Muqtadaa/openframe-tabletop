import { expect, test, type Page } from '@playwright/test'

import { BOARD_URL } from '../e2e/routes.js'
import { join, newRoomId } from './rooms.js'

/**
 * The cost guard, against a real Durable Object.
 *
 * Cloudflare will not stop spending at a number, so the room does
 * (`apps/rooms/src/limits.ts`). The arithmetic is unit-tested there; this is
 * the wiring, which only a real socket can answer: a flood closes the sender
 * and nobody else, a full room turns the next person away, and a board past
 * its size is refused with a code the client reads.
 */

interface DebugWindow {
  readonly __openframe: {
    readonly runtime: {
      readonly dispatcher: {
        dispatch(command: unknown): { readonly ok: boolean; readonly error?: { message: string } }
      }
    }
  }
}

/**
 * Opens raw sockets to a room the way `bad-frames.spec.ts` does: a hello
 * carrying the edit link, and the room's first answer taken as admission.
 */
async function rawRoom(page: Page, room: string): Promise<void> {
  await page.goto(BOARD_URL)
  await page.evaluate(async (id) => {
    const claimed = await fetch(`http://127.0.0.1:8787/room/${id}/claim`, { method: 'POST' })
    const keys = (await claimed.json()) as { editor: string }
    const scope = window as unknown as {
      openRoom?: (id: string) => Promise<WebSocket>
      closeCode?: (socket: WebSocket) => Promise<{ code: number; reason: string }>
    }
    const hello = new Uint8Array([
      5,
      keys.editor.length,
      ...new TextEncoder().encode(keys.editor),
      0,
      0,
    ])
    scope.openRoom = (roomId) =>
      new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:8787/room/${roomId}`)
        socket.binaryType = 'arraybuffer'
        socket.onopen = () => {
          socket.addEventListener('message', () => resolve(socket), { once: true })
          socket.send(hello)
        }
        socket.onerror = () => reject(new Error('socket failed to open'))
      })
    scope.closeCode = (socket) =>
      new Promise((resolve) => {
        socket.addEventListener('close', (event) =>
          resolve({ code: event.code, reason: event.reason }),
        )
      })
  }, room)
}

test('a socket that floods is closed, and the one beside it carries on', async ({ page }) => {
  const room = newRoomId()
  await rawRoom(page, room)

  const outcome = await page.evaluate(async (id) => {
    const scope = window as unknown as {
      openRoom: (id: string) => Promise<WebSocket>
      closeCode: (socket: WebSocket) => Promise<{ code: number; reason: string }>
    }
    const bystander = await scope.openRoom(id)
    const flooder = await scope.openRoom(id)
    const closed = scope.closeCode(flooder)

    // A valid, cheap question about the time, far faster than any client asks.
    const ask = new Uint8Array([3, 0, 0, 0, 0, 0, 0, 0, 0])
    for (let i = 0; i < 400; i++) flooder.send(ask)
    const flooderEnd = await closed

    // The other socket still gets an answer.
    const answered = new Promise<boolean>((resolve) => {
      bystander.addEventListener('message', () => resolve(true), { once: true })
    })
    bystander.send(ask)
    return { flooderEnd, bystanderAnswered: await answered }
  }, room)

  expect(outcome.flooderEnd).toEqual({ code: 1008, reason: 'Sending too fast' })
  expect(outcome.bystanderAnswered).toBe(true)
})

test('the room turns away the connection after the last one it will hold', async ({ page }) => {
  const room = newRoomId()
  await rawRoom(page, room)

  const outcome = await page.evaluate(async (id) => {
    const scope = window as unknown as { openRoom: (id: string) => Promise<WebSocket> }
    const open: WebSocket[] = []
    // The room's limit is 24 live connections.
    for (let i = 0; i < 24; i++) open.push(await scope.openRoom(id))

    const refused = await new Promise<boolean>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:8787/room/${id}`)
      socket.onopen = () => resolve(false)
      socket.onerror = () => resolve(true)
    })

    // One leaves, and there is room again.
    open[0]?.close()
    await new Promise((resolve) => setTimeout(resolve, 500))
    const again = await scope.openRoom(id).then(
      () => true,
      () => false,
    )
    for (const socket of open) socket.close()
    return { refused, again }
  }, room)

  expect(outcome.refused).toBe(true)
  expect(outcome.again).toBe(true)
})

test('a board past the size a room keeps stops being sent, and says so', async ({ browser }) => {
  test.setTimeout(120_000)
  const room = newRoomId()
  const page = await join(browser, room)
  try {
    // Some twelve megabytes in one change, past the 10 MiB this suite lowers the ceiling to.
    await page.evaluate(() => {
      const text = 'A long note about what the research found. '.repeat(280)
      const objects = Array.from({ length: 1000 }, (_, n) => ({
        type: 'sticky',
        x: (n % 40) * 200,
        y: Math.floor(n / 40) * 200,
        data: { text: [{ text: `${String(n)} ${text}` }] },
      }))
      const result = (window as unknown as DebugWindow).__openframe.runtime.dispatcher.dispatch({
        kind: 'CreateObjects',
        objects,
      })
      if (!result.ok) throw new Error(result.error?.message ?? 'the command was refused')
    })

    // The room kept it, and the very next thing this editor sends is refused
    // with a code the client reads: it stops, rather than retrying into the
    // same answer, and the bar says why.
    await expect(page.getByTestId('save-state')).toHaveAttribute('data-room', 'full', {
      timeout: 60_000,
    })
    await expect(page.getByTestId('save-state')).toContainText('board full')
    // Nothing is lost: the device still holds every note.
    await expect(page.locator('[data-object-id]').first()).toBeVisible()
  } finally {
    await page.context().close()
  }
})

test('a board takes 200 images and refuses the next, with a status the client reads', async ({
  page,
}) => {
  const room = newRoomId()
  await page.goto(BOARD_URL)

  const outcome = await page.evaluate(async (id) => {
    const base = `http://127.0.0.1:8787/room/${id}`
    const claimed = await fetch(`${base}/claim`, { method: 'POST' })
    const keys = (await claimed.json()) as { editor: string }
    // A PNG header declaring 1 x 1: the signature, then the IHDR chunk.
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0,
      1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
    ])
    const put = (n: number) =>
      fetch(`${base}/asset/img_${String(n)}`, {
        method: 'PUT',
        headers: { 'content-type': 'image/png', 'x-openframe-key': keys.editor },
        body: png,
      })

    const statuses: number[] = []
    for (let n = 0; n < 201; n++) statuses.push((await put(n)).status)
    const last = await put(201)
    return { first200: statuses.slice(0, 200), next: statuses[200], reason: await last.text() }
  }, room)

  expect(outcome.first200.every((status) => status === 204)).toBe(true)
  expect(outcome.next).toBe(507)
  expect(outcome.reason).toBe('This board has reached its image limit')
})
