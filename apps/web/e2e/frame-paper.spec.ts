import { expect, test, type Page } from '@playwright/test'

import { CANVAS, goto, viewOf } from './fixtures.js'
import { BOARD_URL } from './routes.js'

/**
 * A frame nobody has coloured is laid on the scene's paper, which is white in
 * every theme (ADR T010). It used to follow the theme, so at night it became the
 * panel stock: a bright slab turned into a dark one, and a map's own frame
 * changed colour because somebody chose a different interface. The paper is
 * scene content now, so a dark application around a frame still shows white.
 * A white somebody CHOSE stays white, as it always did.
 */
const EDITOR = '[contenteditable="true"]'

async function placeFrame(page: Page): Promise<void> {
  await goto(page, BOARD_URL)
  await page.waitForSelector('[data-testid="status-bar"]')
  await page.keyboard.press('f')
  await page.locator(CANVAS).click({ position: { x: 500, y: 350 } })
  await expect(page.locator(EDITOR)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(viewOf(page, 'frame')).toHaveCount(1)
}

const paper = (page: Page) =>
  viewOf(page, 'frame').evaluate((frame) => getComputedStyle(frame).backgroundColor)

const token = (page: Page, name: string) =>
  page.evaluate(
    (name) =>
      // Resolved through an element, so the answer is a computed rgb() like the
      // frame's rather than the stylesheet's hex.
      (() => {
        const probe = document.createElement('div')
        probe.style.background = `var(--${name})`
        document.body.append(probe)
        const colour = getComputedStyle(probe).backgroundColor
        probe.remove()
        return colour
      })(),
    name,
  )

for (const theme of ['dark', 'light'] as const) {
  test.describe(`in the ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((chosen) => {
        localStorage.setItem('openframe:theme', chosen)
      }, theme)
    })

    test('an uncoloured frame is the scene’s white, not the application’s panel', async ({
      page,
    }) => {
      await placeFrame(page)
      expect(await paper(page)).toBe(await token(page, 'sc-s-white'))
      expect(await paper(page)).toBe('rgb(255, 255, 255)')
    })

    test('marks no colour for it, and a chosen white is white', async ({ page }) => {
      await placeFrame(page)
      await page.getByTestId('frame-title').click()
      await expect(page.getByTestId('inspector')).toBeVisible()
      // No swatch is what it is drawn in, so none claims to be.
      await expect(page.locator('[data-testid^="swatch-"][aria-pressed="true"]')).toHaveCount(0)

      await page.getByTestId('swatch-white').click()
      await expect(page.getByTestId('swatch-white')).toHaveAttribute('aria-pressed', 'true')
      expect(await paper(page)).toBe(await token(page, 'sc-s-white'))
    })
  })
}

test('in the dark theme the frame is not cut from the application’s panel stock', async ({
  page,
}) => {
  await placeFrame(page)
  expect(await paper(page)).not.toBe(await token(page, 'of-panel'))
})
