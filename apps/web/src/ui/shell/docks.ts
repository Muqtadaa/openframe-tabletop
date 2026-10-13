import type { ReactNode } from 'react'

import { useInteractionStore } from '../../interaction/interaction-store.js'
import { OutlineIcon } from '../../controls/icons.js'
import { createElement } from 'react'
import type { Posture } from './posture.js'

/**
 * What can be docked beside the table, and who is offered it.
 *
 * A dock is a panel that opens beside the Scene, one at a time, from a rail on
 * the right edge. The rail is a LIST, read here, because the GM's live toolset
 * is far larger than a player's and a permanent bar of everything is the
 * enterprise console the owner ruled out. A phase that builds something a GM
 * needs at the table (layers, initiative, tokens, notes) registers it in this
 * list and the rail grows by one button; nothing else changes, and an entry
 * that does not exist yet is not shown as if it did.
 *
 * A dock that dismisses itself on a press outside it must ignore
 * `[data-dock-trigger]`, the rail's buttons: they toggle it, and counted as
 * outside it would close on pointerdown and open again on the click.
 *
 * Audiences are disclosure, never authorisation (see `posture.ts`).
 */
export interface DockDefinition {
  readonly id: string
  readonly label: string
  /** Shown in the button's tip, with its key. */
  readonly keys: string
  readonly audience: readonly Posture[]
  readonly icon: () => ReactNode
  /** A hook: whether this dock is open. Called once per button, in order. */
  readonly useOpen: () => boolean
  readonly toggle: () => void
}

export const DOCKS: readonly DockDefinition[] = [
  {
    id: 'outline',
    label: 'Outline',
    keys: 'Alt+S',
    // Everyone who can see the table can see what is on it.
    audience: ['gm', 'player', 'spectator'],
    icon: () => createElement(OutlineIcon),
    useOpen: () => useInteractionStore((state) => state.overviewOpen),
    toggle: () => {
      const state = useInteractionStore.getState()
      state.setOverviewOpen(!state.overviewOpen)
    },
  },
]

/** The docks a posture is offered, in rail order. */
export function docksFor(
  posture: Posture,
  docks: readonly DockDefinition[] = DOCKS,
): readonly DockDefinition[] {
  return docks.filter((dock) => dock.audience.includes(posture))
}
