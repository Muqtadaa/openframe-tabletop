import { useEffect, useState } from 'react'

import { useOpenFrame } from '../../runtime/context.js'

/**
 * Where a person sits at the table, which decides what the interface offers them.
 *
 * Today this is the board's role under another name, because the Game and its
 * members do not exist yet (PHASE 1: members, roles and capabilities arrive with
 * T001 and T004, and this becomes a read of those). The mapping is the one the
 * brief draws: whoever owns the table runs it, whoever can edit plays at it, and
 * a viewer watches.
 *
 * A posture is for DISCLOSURE only. Hiding a control is never authorisation
 * (ADR T009, decision 4): the dispatcher and the room still refuse what a role
 * may not do, whatever this says.
 */
export type Posture = 'gm' | 'player' | 'spectator'

type Role = 'owner' | 'editor' | 'viewer'

export function postureOf(role: Role | null, readOnly: boolean): Posture {
  if (readOnly || role === 'viewer') return 'spectator'
  if (role === 'editor') return 'player'
  // `null` is a board that is this browser's own: the person who made it runs it.
  return 'gm'
}

export function usePosture(): Posture {
  const { runtime, collaboration } = useOpenFrame()
  const [role, setRole] = useState<Role | null>(collaboration?.role ?? null)
  useEffect(() => {
    if (collaboration === null || collaboration === undefined) return
    return collaboration.onRole(setRole)
  }, [collaboration])
  return postureOf(role, runtime.readOnly)
}
