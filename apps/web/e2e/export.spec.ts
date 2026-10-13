import { readFile } from 'node:fs/promises'

import { richFromPlain } from '@openframe/core'
import type { Download, Page } from '@playwright/test'

import { buildBoard } from './boards.js'
import { expect, seedBoard, test } from './fixtures.js'

/**
 * A board taken out as a readout (ADR 0020): a Markdown file. What a readout says
 * about a claim and what it stands on is covered with test-only types in
 * `scene/export-markdown.test.ts`; the product ships no type that makes one.
 *
 * Seeded rather than clicked together: the subject is what leaves the board,
 * not making what is on it.
 */

test.use({ board: 'fresh' })

async function seedStudy(page: Page): Promise<void> {
  await seedBoard(
    page,
    buildBoard((board) => {
      const frame = board.add('frame', { x: 500, y: 300 }, { name: richFromPlain('Interviews') })
      board.add(
        'sticky',
        { x: 400, y: 300 },
        { text: richFromPlain('Three of five could not find the price') },
        undefined,
        frame,
      )
      board.note('People cannot find the price', { x: 1100, y: 300 })
      board.note('Somewhere else entirely', { x: 1100, y: 700 })
    }, 'Pricing study'),
  )
}

async function contents(download: Download): Promise<string> {
  const path = await download.path()
  return readFile(path, 'utf8')
}

test.describe('exporting as Markdown', () => {
  test('takes the whole board from its menu', async ({ page }) => {
    await seedStudy(page)
    await page.getByTestId('board-menu').click()
    const arrives = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'Export as Markdown' }).click()
    const download = await arrives

    expect(download.suggestedFilename()).toBe('pricing-study.md')
    const text = await contents(download)
    expect(text).toMatch(/^# Pricing study\n\nExported .+ · 4 objects\n/)
    expect(text).toContain('## Frame: Interviews')
    expect(text).toContain('Three of five could not find the price')
    expect(text).toContain('Somewhere else entirely')
    await expect(page.getByTestId('board-announcer')).toHaveText('Exported pricing-study.md')
  })

  test('is reached from the keyboard', async ({ page }) => {
    await seedStudy(page)
    await page.getByTestId('board-menu').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu', { name: 'Board' })).toBeVisible()
    // Rename, Version history…, Board overview, then Export.
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Export as Markdown' })).toBeFocused()
    const arrives = page.waitForEvent('download')
    await page.keyboard.press('Enter')
    expect((await arrives).suggestedFilename()).toBe('pricing-study.md')
    await expect(page.getByTestId('board-menu')).toBeFocused()
  })

  test('takes a frame, with what it holds and nothing else', async ({ page }) => {
    await seedStudy(page)
    // A frame is picked up by its title.
    await page
      .getByTestId('frame-title')
      .filter({ hasText: 'Interviews' })
      .click({ button: 'right' })
    const arrives = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'Export as Markdown' }).click()
    const download = await arrives

    expect(download.suggestedFilename()).toBe('pricing-study-interviews.md')
    const text = await contents(download)
    expect(text).toMatch(/^# Pricing study — Interviews\n/)
    expect(text).toContain('Three of five could not find the price')
    expect(text).not.toContain('People cannot find the price')
    expect(text).not.toContain('Somewhere else entirely')
  })

  test('takes what is selected', async ({ page }) => {
    await seedStudy(page)
    const notes = page.locator('[data-object-type="sticky"]')
    await notes.filter({ hasText: 'Somewhere else entirely' }).click()
    await notes.filter({ hasText: 'People cannot find the price' }).click({ modifiers: ['Shift'] })
    await notes.filter({ hasText: 'Somewhere else entirely' }).click({ button: 'right' })
    const arrives = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'Export as Markdown' }).click()
    const download = await arrives

    expect(download.suggestedFilename()).toBe('pricing-study-selection.md')
    const text = await contents(download)
    expect(text).toMatch(/^# Pricing study — 2 selected\n/)
    expect(text).toContain('Somewhere else entirely')
    expect(text).toContain('People cannot find the price')
    expect(text).not.toContain('## Frame')
  })

  // A readout of one note is that note; its menu already fills a laptop window.
  test('is not offered for one note', async ({ page }) => {
    await seedStudy(page)
    await page
      .locator('[data-object-type="sticky"]')
      .filter({ hasText: 'Somewhere else entirely' })
      .click({ button: 'right' })
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Export as Markdown' })).toHaveCount(0)
  })
})
