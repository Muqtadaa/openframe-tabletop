import { CANVAS, expect, goto, openBoard, test } from './fixtures.js'
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
