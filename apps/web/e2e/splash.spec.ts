import { expect, test, type Page } from '@playwright/test'

import { BOARD_URL, HOME_URL } from './routes.js'

/**
 * The boot splash must always END — in the board, in a failure panel, or at
 * the very least in a sentence that admits it is stuck.
 *
 * It sits at the top of the stacking order over an `inert` root, so a splash
 * that never goes is a page that cannot be used and does not say so (C3 #10).
 */

const SHARED = `/?room=brd_aaaaaaaa11111111&k=${'a'.repeat(32)}`

test('a room that fails while the board opens shows the failure, not the splash', async ({
  page,
}) => {
  // Throwing from the constructor rejects the connection before the first render.
  await page.addInitScript(() => {
    window.WebSocket = function refused() {
      throw new Error('refused')
    } as unknown as typeof WebSocket
  })
  await page.goto(SHARED)

  await expect(page.getByRole('alertdialog', { name: 'This board did not open' })).toBeVisible()
  await expect(page.locator('#of-splash')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reload' })).toBeFocused()
})

test('a splash that outlasts the watchdog says so, and offers a way out', async ({ page }) => {
  await page.clock.install()
  // The application never arrives: a network that drops the entry module.
  await page.route('**/main.tsx*', (route) => route.abort())
  await page.goto(BOARD_URL, { waitUntil: 'commit' })

  const splash = page.locator('#of-splash')
  await expect(splash).toBeVisible()
  await expect(splash).not.toContainText('Still opening')

  await page.clock.fastForward(13_000)
  await expect(splash).toContainText('Still opening')
  const reload = splash.getByRole('button', { name: 'Reload' })
  await expect(reload).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(reload).toBeFocused()
})

/**
 * The line under the artwork says what is actually opening (C3 #10). It said
 * "Opening your board" on the front door, where no board opens, and "your"
 * on somebody else's shared one.
 */
test.describe('the label', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/main.tsx*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
  })

  for (const [url, text] of [
    [BOARD_URL, 'Opening the board'],
    [SHARED, 'Opening the board'],
    [HOME_URL, 'Opening'],
    // Malformed links open the front door (`readRoute`), so the label says so.
    ['/?board=../../etc/passwd', 'Opening'],
    ['/?room=brd_short', 'Opening'],
  ] as const) {
    test(`says "${text}" on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'commit' })
      await expect(page.locator('#of-splash p')).toHaveText(text)
    })
  }
})

/**
 * How long the splash stayed after the failure was on the page. Held, it
 * would stay out the rest of the two-second hold; let go, it leaves in the
 * same frame or the next.
 */
async function heldFor(page: Page): Promise<number> {
  const marks = await page.evaluate(
    () =>
      (window as unknown as { __splashMarks: { failure?: number; splashGone?: number } })
        .__splashMarks,
  )
  if (marks.failure === undefined || marks.splashGone === undefined) {
    throw new Error(`the page never recorded both: ${JSON.stringify(marks)}`)
  }
  return Math.max(0, marks.splashGone - marks.failure)
}

/** Well inside one hold, well outside a frame or two of rendering. */
const HELD = 500

/**
 * Bad news is never held behind the artwork (C3 #10). A board that would not
 * open already took the splash away at once; the front door's failure and a
 * crash caught by the application's error boundary both waited out the
 * two-second hold — under an inert root, where an alert is never announced
 * and focus cannot land.
 */
test.describe('failures are not held', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      /*
       * When the failure was first on the page, and when the splash left it,
       * on the page's own clock. "Not held" is the gap between the two: the
       * hold would make it the rest of two seconds. Measured once both
       * happened — reading the clock after expect() had polled for them made
       * the number include the polling, and a loaded runner went past a fixed
       * budget with nothing held at all.
       */
      const marks: { failure?: number; splashGone?: number } = {}
      let seen = false
      ;(window as unknown as { __splashMarks: typeof marks }).__splashMarks = marks
      new MutationObserver(() => {
        const now = performance.now()
        if (
          marks.failure === undefined &&
          document.querySelector('[role="alertdialog"], [data-testid="home-list-problem"]')
        )
          marks.failure = now
        // Gone only once it has been there: this runs before the page is parsed.
        const splash = document.getElementById('of-splash')
        if (splash !== null) seen = true
        else if (seen && marks.splashGone === undefined) marks.splashGone = now
      }).observe(document, { childList: true, subtree: true })
    })
  })

  test('the front door says its boards could not be listed without waiting', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: {
          open() {
            throw new DOMException('The operation is insecure.', 'SecurityError')
          },
        },
      })
    })
    await page.goto(HOME_URL)
    await expect(page.getByTestId('home-list-problem')).toBeVisible()
    await expect(page.locator('#of-splash')).toHaveCount(0)
    await expect(page.locator('#root')).not.toHaveAttribute('inert', /.*/)
    expect(await heldFor(page)).toBeLessThan(HELD)
  })

  test('a crash is shown at once, with focus on Reload', async ({ page }) => {
    // Thrown from an effect, which the application's error boundary catches.
    await page.addInitScript(() => {
      window.ResizeObserver = function broken() {
        throw new Error('broken')
      } as unknown as typeof ResizeObserver
    })
    await page.goto(BOARD_URL)
    await expect(page.getByRole('alertdialog', { name: 'OpenFrame stopped' })).toBeVisible()
    await expect(page.locator('#of-splash')).toHaveCount(0)
    expect(await heldFor(page)).toBeLessThan(HELD)
    await expect(page.getByRole('button', { name: 'Reload' })).toBeFocused()
  })
})
