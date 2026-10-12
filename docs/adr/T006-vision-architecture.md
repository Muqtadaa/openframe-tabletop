# ADR T006 · Vision: vocabulary fixed now, representation decided in Phases 5 and 6

**Status:** Accepted (scoped stub) · 2026-10-12 · see also
[T004](T004-player-secrecy-and-state-filtering.md)

## Context

Fog, vision and lighting are phases away (5 and 6). Their representation depends on decisions not
yet made: the audience partition ([T004](T004-player-secrecy-and-state-filtering.md)), the grid
([T005](T005-grid-and-measurement.md)), and benchmark evidence from real Scenes. Deciding more now
would be guessing.

## Decision

Only these constraints are fixed:

1. **Four distinct questions** are never collapsed into one flag: whether a user may receive an
   entity at all (visibility), whether their character currently perceives it (perception), whether
   they can manipulate it (interaction), and which of its fields they may read (knowledge).
2. **Vision modes are system-independent.** The renderer and the Scene model know generic modes; a
   system configures which of them a creature has. No rules-system term (for example a particular
   sense) appears in renderer or Scene code.
3. **Perception is derived, never stored per frame.** Current visibility comes from token vision,
   light sources, wall geometry, doors and windows, and Scene darkness; persistent exploration is
   stored state, current sight is computed (CLAUDE.md rule 16: derived geometry is asked for).
4. **A player must be able to receive the result without the inputs.** Whatever computes visibility
   cannot require sending hidden walls or hidden tokens to the player's client.
5. **Dedicated geometry benchmarks precede the feature**, measured on the stress Scene in the
   brief, held to budgets that the product has, not today's readings (CLAUDE.md rule 10).

## Not decided here

CPU against GPU responsibilities, the visibility polygon algorithm, the fog storage format, whether
exploration is per player or per party. These belong to Phases 5 and 6 and their own ADRs.

## Consequences

- Phase 5 (manual fog) may not introduce a `hidden` boolean as its model.
- This record is replaced by a full ADR at the start of Phase 5.
