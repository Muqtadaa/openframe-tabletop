import { afterEach, describe, expect, it } from 'vitest'

import type { ListedBoard, Services } from '../../runtime/services.js'
import { mountOnBoard, type Mounted } from '../../test-render.js'
import { PrepShell } from './PrepShell.js'

/**
 * Prep's states beyond the happy path: it says when the list could not be read,
 * and it lists only what the person runs.
 */
let ui: Mounted | null = null
afterEach(() => {
  ui?.unmount()
  ui = null
})

const find = (testId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)

const board = (over: Partial<ListedBoard>): ListedBoard => ({
  boardId: 'board_a' as ListedBoard['boardId'],
  title: 'A table',
  updatedAt: 0,
  shared: false,
  role: null,
  accessKey: null,
  viewKey: null,
  ownerKey: null,
  pinned: false,
  openedAt: 0,
  workspaceId: null,
  ...over,
})

const listing =
  (listAll: Services['boards']['listAll']) =>
  (built: Services): Services => ({ ...built, boards: { ...built.boards, listAll } })

describe('prep', () => {
  it('says so when the boards could not be listed, as an alert', async () => {
    ui = await mountOnBoard(<PrepShell />, {
      services: listing(() => Promise.reject(new Error('offline'))),
    })
    await ui.settle()
    expect(find('prep-problem')?.getAttribute('role')).toBe('alert')
  })

  it('lists what the person runs and leaves out what somebody else owns', async () => {
    ui = await mountOnBoard(<PrepShell />, {
      services: listing(() =>
        Promise.resolve([
          board({ boardId: 'board_mine' as ListedBoard['boardId'], title: 'Mine' }),
          board({
            boardId: 'brd_theirs' as ListedBoard['boardId'],
            title: 'Theirs',
            shared: true,
            role: 'editor',
          }),
        ]),
      ),
    })
    await ui.settle()
    const cards = [...document.querySelectorAll('[data-testid="prep-scene"]')].map(
      (card) => card.textContent,
    )
    expect(cards).toHaveLength(1)
    expect(cards[0]).toContain('Mine')
  })
})
