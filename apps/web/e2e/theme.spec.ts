import { expect, test, type Page } from '@playwright/test'

import { BOARD_URL } from './routes.js'

/**
 * The boot splash's handover, and the two application themes.
 *
 * Both belong in the browser suite for the same reason: neither exists in a
 * unit test. The splash is markup in `index.html` that a module removes after
 * two animation frames, and a theme is `data-theme` surviving a real reload
 * through real storage. The last test here is ADR T010 in the browser: the
 * scene does not follow the theme.
 */

const STATUS_BAR = '[data-testid="status-bar"]'

type Choice = 'dark' | 'light'

/*
 * The theme is chosen in the account sheet — here the sign-in sheet, since
 * these pages are signed out — and the sheet is put away again after.
 */
async function chooseTheme(page: Page, theme: Choice): Promise<void> {
  await page.getByTestId('sign-in').click()
  await page.getByTestId(`theme-${theme}`).click()
  await page.keyboard.press('Escape')
}

async function themeChosen(page: Page, theme: Choice): Promise<void> {
  await page.getByTestId('sign-in').click()
  await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
}

test.describe('the boot splash', () => {
  test('covers the wait, then gets out of the way', async ({ page }) => {
    /*
     * Held open by delaying the entry module — the actual gap the splash exists
     * to cover, rather than a simulation of it.
     */
    let held = false
    await page.route('**/main.tsx*', async (route) => {
      held = true
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await route.continue()
    })

    await page.goto(BOARD_URL, { waitUntil: 'commit' })
    await expect(page.locator('#of-splash')).toBeVisible()
    expect(held).toBe(true)

    await page.waitForSelector(STATUS_BAR, { timeout: 20_000 })
    // Removed, not merely transparent: an invisible full-screen sheet would
    // swallow every click on the board underneath it.
    await expect(page.locator('#of-splash')).toHaveCount(0, { timeout: 5_000 })
  })

  /** Focus cannot reach a board that is still behind the sheet. */
  test('keeps the board out of the tab order while it is covered', async ({ page }) => {
    await page.route('**/main.tsx*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900))
      await route.continue()
    })
    await page.goto(BOARD_URL, { waitUntil: 'commit' })
    await expect(page.locator('#of-splash')).toBeVisible()
    await expect(page.locator('#root')).toHaveAttribute('inert', '')
    await page.waitForSelector(STATUS_BAR, { timeout: 20_000 })
    await expect(page.locator('#of-splash')).toHaveCount(0, { timeout: 5_000 })
    await expect(page.locator('#root')).not.toHaveAttribute('inert', /.*/)
  })

  /**
   * The application's status region is the toast, and exactly one thing may
   * hold that role. A splash that also claimed it put two live regions in
   * competition.
   */
  test('does not compete with the toast for the status role', async ({ page }) => {
    await page.route('**/main.tsx*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900))
      await route.continue()
    })
    await page.goto(BOARD_URL, { waitUntil: 'commit' })
    await expect(page.locator('#of-splash')).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('is drawn in the saved theme from the first frame', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('openframe:theme', 'light')
    })
    await page.route('**/main.tsx*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900))
      await route.continue()
    })
    await page.goto(BOARD_URL, { waitUntil: 'commit' })
    await expect(page.locator('#of-splash')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

test.describe('themes', () => {
  test('switches themes and is still there after a reload', async ({ page }) => {
    await page.goto(BOARD_URL)
    await page.waitForSelector(STATUS_BAR)

    const root = page.locator('html')
    await expect(root).not.toHaveAttribute('data-theme', /.*/)
    await themeChosen(page, 'dark')

    await chooseTheme(page, 'light')
    await expect(root).toHaveAttribute('data-theme', 'light')

    await page.reload()
    await page.waitForSelector(STATUS_BAR)
    await expect(root).toHaveAttribute('data-theme', 'light')
    await themeChosen(page, 'light')
  })

  /*
   * The browser's own chrome — the address bar on a phone, the tab strip in
   * some desktop browsers — is painted from `theme-color`.
   */
  test("tells the browser chrome the theme's surface colour, and follows a switch", async ({
    page,
  }) => {
    await page.goto(BOARD_URL)
    await page.waitForSelector(STATUS_BAR)
    const meta = page.locator('meta[name="theme-color"]')
    await expect(meta).toHaveAttribute('content', '#161a1f')

    await chooseTheme(page, 'light')
    await expect(meta).toHaveAttribute('content', '#f4f6f8')

    await page.reload()
    await page.waitForSelector(STATUS_BAR)
    await expect(meta).toHaveAttribute('content', '#f4f6f8')
  })

  test('switches back, and the default theme carries no attribute at all', async ({ page }) => {
    await page.goto(BOARD_URL)
    await page.waitForSelector(STATUS_BAR)
    await chooseTheme(page, 'light')
    await chooseTheme(page, 'dark')

    /*
     * Absent rather than `data-theme="dark"`. The base `:root` block is what
     * defines the default theme; an attribute for it would make two selectors
     * responsible for one palette.
     */
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
    await page.reload()
    await page.waitForSelector(STATUS_BAR)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
  })

  test('an OpenFrame preference is read as what it meant', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('openframe:theme', 'notebook')
    })
    await page.goto(BOARD_URL)
    await page.waitForSelector(STATUS_BAR)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  /*
   * ADR T010 in the browser: the interface moves and the scene does not. A
   * dark application around a daylight map still shows a daylight map.
   */
  test('repaints the chrome, and leaves the scene exactly as it was', async ({ page }) => {
    await page.goto(BOARD_URL)
    await page.waitForSelector(STATUS_BAR)

    const colours = async (): Promise<{ chrome: string; scene: string }> =>
      page.evaluate(() => ({
        chrome: getComputedStyle(document.body).backgroundColor,
        scene: getComputedStyle(document.querySelector('[data-testid="canvas"]')!).backgroundColor,
      }))

    const dark = await colours()
    await chooseTheme(page, 'light')
    const light = await colours()

    expect(light.chrome).not.toBe(dark.chrome)
    expect(light.scene).toBe(dark.scene)

    const luminance = (colour: string): number => {
      const [r, g, b] = (/(\d+), (\d+), (\d+)/.exec(colour) ?? []).slice(1).map(Number) as [
        number,
        number,
        number,
      ]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    // Dark and light by a wide margin: a theme that merely tinted would pass a bare inequality.
    expect(luminance(dark.chrome)).toBeLessThan(40)
    expect(luminance(light.chrome)).toBeGreaterThan(180)
  })
})
