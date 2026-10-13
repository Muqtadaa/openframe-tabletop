import { buildBoard } from './boards.js'
import { CANVAS, expect, goto, openBoard, seedBoard, test } from './fixtures.js'
import { localBoardUrl, HOME_URL } from './routes.js'
import { seedLocalBoard } from './seed.js'

/**
 * The tabletop shell: the library's way into preparing, the prep page itself,
 * the dock rail beside the table, and the display for a shared screen.
 *
 * All of it sits over Board data today (ADR T009): nothing here is a Game or a
 * Scene yet, and these specs say only what is true of a board.
 */

test.describe('the library', () => {
  test('names the one primary action on a row, and offers prep once', async ({ page }) => {
    await seedLocalBoard(page, 'one', 'First table')
    await seedLocalBoard(page, 'two', 'Second table')
    await goto(page, HOME_URL)

    const rows = page.getByTestId('home-boards').locator('li')
    await expect(rows).toHaveCount(2)
    await expect(rows.first().getByTestId('board-link')).toContainText('Open table')
    // Across the tables you run, so one entry and not one per row.
    await expect(page.getByTestId('library-prep')).toHaveCount(1)
  })

  test('offers no prep to somebody who runs nothing', async ({ page }) => {
    await goto(page, HOME_URL)
    await expect(page.getByTestId('library-prep')).toHaveCount(0)
  })
})

test.describe('prep', () => {
  test('lists the boards you run as scenes and opens one', async ({ page }) => {
    await seedLocalBoard(page, 'one', 'First table')
    await seedLocalBoard(page, 'two', 'Second table')
    await goto(page, HOME_URL)

    await page.getByTestId('library-prep').click()
    await expect(page.getByTestId('prep')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Scenes' })).toBeVisible()
    await expect(page.getByTestId('prep-scene')).toHaveCount(2)

    await page.getByTestId('prep-scene').filter({ hasText: 'First table' }).click()
    await expect(page.locator(CANVAS)).toBeVisible()
  })

  test('lists only sections that exist, and goes back to the library', async ({ page }) => {
    await seedLocalBoard(page, 'one')
    await goto(page, '/?prep')

    // Scenes are real today; nothing else is offered as if it were.
    await expect(page.getByRole('navigation', { name: 'Prep' }).getByRole('link')).toHaveText([
      'Scenes',
      'Back to library',
    ])
    await page.getByTestId('prep-back').click()
    await expect(page.getByTestId('home')).toBeVisible()
  })

  test('says so when there is nothing yet', async ({ page }) => {
    await goto(page, '/?prep')
    await expect(page.getByTestId('prep-empty')).toBeVisible()
  })
})

test.describe('prep on a phone', () => {
  for (const width of [320, 390]) {
    test(`fits ${String(width)}px with nothing running off the side`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await seedLocalBoard(page, 'one', 'The Sunken Library')
      await goto(page, '/?prep')
      await expect(page.getByTestId('prep-scenes')).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('the dock rail', () => {
  test.use({ board: 'open' })

  test('opens the outline beside the table, and closes it again', async ({ page }) => {
    const rail = page.getByTestId('dock-rail')
    await expect(rail).toBeVisible()
    const outline = page.getByTestId('dock-outline')
    await expect(outline).toHaveAttribute('aria-pressed', 'false')

    await outline.click()
    await expect(outline).toHaveAttribute('aria-pressed', 'true')
    const panel = page.getByTestId('board-overview')
    await expect(panel).toBeVisible()

    // Beside the rail, not over it: the panel ends where the rail begins.
    const panelBox = await panel.boundingBox()
    const railBox = await rail.boundingBox()
    expect(panelBox).not.toBeNull()
    expect(railBox).not.toBeNull()
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(railBox!.x)

    await outline.click()
    await expect(panel).toHaveCount(0)
  })
})

test.describe('the display', () => {
  test('is the table and nothing that operates it', async ({ page }) => {
    await seedLocalBoard(page, 'shown', 'On the big screen')
    await goto(page, `${localBoardUrl('shown')}&display=1`)

    await expect(page.getByTestId('display-frame')).toBeVisible()
    await expect(page.locator(CANVAS)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('On the big screen')
    for (const control of ['status-bar', 'dock-rail', 'zoom-control']) {
      await expect(page.getByTestId(control)).toHaveCount(0)
    }
    await expect(page.getByRole('toolbar')).toHaveCount(0)
  })

  test('cannot change the board', async ({ page }) => {
    await openBoard(page)
    await goto(page, `/?board=board_local&display=1`)
    await page.locator(CANVAS).click({ position: { x: 400, y: 300 } })
    await page.keyboard.press('n')
    await page.locator(CANVAS).click({ position: { x: 400, y: 300 } })
    await expect(page.locator('[data-object-type]')).toHaveCount(0)
  })
})

test.describe('the display, when the room is not live', () => {
  test('says so in words, rather than showing a frozen table', async ({ page }) => {
    // A room that accepts the socket and says nothing: the board is never admitted.
    await page.routeWebSocket(/\/room\//, () => undefined)
    await goto(page, `/?room=brd_abcdefgh12345678&k=${'e'.repeat(32)}&display=1`)
    await expect(page.getByTestId('display-status')).toHaveText('Reconnecting…')
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the outline and the record panel take turns', async ({ page }) => {
    await seedBoard(
      page,
      buildBoard((board) => {
        board.note('Cellar door: locked', { x: 200, y: 260 })
      }),
    )
    await page.locator(CANVAS).click({ position: { x: 240, y: 300 } })
    await expect(page.getByTestId('inspector')).toBeVisible()

    await page.getByTestId('dock-outline').click()
    await expect(page.getByTestId('board-overview')).toBeVisible()
    await expect(page.getByTestId('inspector')).toHaveCount(0)

    // Selecting something puts the outline away again.
    await page.locator(CANVAS).click({ position: { x: 240, y: 300 } })
    await expect(page.getByTestId('inspector')).toBeVisible()
    await expect(page.getByTestId('board-overview')).toHaveCount(0)
  })
})
