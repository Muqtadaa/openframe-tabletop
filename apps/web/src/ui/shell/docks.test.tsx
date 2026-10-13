import { afterEach, describe, expect, it } from 'vitest'

import { useInteractionStore } from '../../interaction/interaction-store.js'
import { mountOnBoard, type Mounted } from '../../test-render.js'
import { DockRail } from './DockRail.js'
import { docksFor, DOCKS, type DockDefinition } from './docks.js'

/**
 * The rail grows by registration and is disclosed by posture. The registry is
 * the whole of what decides who sees which dock, so it is exercised with docks
 * the product does not have yet: a GM-only one proves a player is not offered it.
 */
const ONLY_GM: DockDefinition = {
  id: 'only-gm',
  label: 'Only the GM',
  keys: 'Alt+G',
  audience: ['gm'],
  icon: () => null,
  useOpen: () => false,
  toggle: () => undefined,
}

let ui: Mounted | null = null
afterEach(() => {
  ui?.unmount()
  ui = null
  useInteractionStore.getState().setOverviewOpen(false)
})

const find = (testId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)

describe('the registry', () => {
  it('offers the outline to everyone who can see the table', () => {
    for (const posture of ['gm', 'player', 'spectator'] as const) {
      expect(docksFor(posture).map((dock) => dock.id)).toContain('outline')
    }
  })

  it('offers a dock only to the postures it names', () => {
    const docks = [...DOCKS, ONLY_GM]
    expect(docksFor('gm', docks).map((dock) => dock.id)).toContain('only-gm')
    expect(docksFor('player', docks).map((dock) => dock.id)).not.toContain('only-gm')
    expect(docksFor('spectator', docks).map((dock) => dock.id)).not.toContain('only-gm')
  })
})

describe('the rail', () => {
  it('is a button per dock, named, and pressed while its dock is open', async () => {
    ui = await mountOnBoard(<DockRail />)
    const outline = find('dock-outline')
    expect(outline?.getAttribute('aria-label')).toBe('Outline')
    expect(outline?.getAttribute('aria-pressed')).toBe('false')
    ui.act(() => {
      outline?.click()
    })
    expect(useInteractionStore.getState().overviewOpen).toBe(true)
    expect(find('dock-outline')?.getAttribute('aria-pressed')).toBe('true')
    ui.act(() => {
      find('dock-outline')?.click()
    })
    expect(useInteractionStore.getState().overviewOpen).toBe(false)
  })

  it('draws no rail at all for a posture that is offered nothing', async () => {
    ui = await mountOnBoard(<DockRail docks={[ONLY_GM]} />, {})
    // A local board is the maker's, so the GM-only dock is theirs.
    expect(find('dock-only-gm')).not.toBeNull()
    ui.unmount()
    ui = await mountOnBoard(<DockRail docks={[]} />)
    expect(find('dock-rail')).toBeNull()
  })
})
