# ADR T005 · One grid abstraction in core geometry, asked by every feature

**Status:** Accepted (direction) · 2026-10-12 · finalised in Phase 2

## Context

Today's grid is a whiteboard convenience, entirely in the web app:

- `scene/snapping.ts` defines `GRID_SIZE = 10` and snaps by default parameter at about fifteen call
  sites;
- `scene/grid.ts` paints a three-weight CSS ruling that fades across zoom decades;
- the interface's own spacing (`--of-step: 10px`) is tied to it by a comment and a test;
- core has no grid code and no concept of cell, distance or hex.

Tabletop needs gridless and square grids first, hex later, and one thing doing snapping, rulers,
token placement, movement, templates, distance and pathing. The brief forbids independent grid math
per feature.

## Decision

1. **A Scene grid is content.** It is Scene configuration (type, cell size, origin offset, scale,
   distance per cell, unit label, opacity, colour, snap mode, measurement rule), stored with the
   Scene ([T001](T001-game-to-scene-persistence.md)), not an application setting and not layout
   rhythm.
2. **One abstraction in `packages/core` geometry**: a pure `Grid` value with `snap`, `cellOf`,
   `centreOf`, `distance`, `cellsAlong` and `neighbours`, implemented for `gridless` and `square`
   first. It is in core, not `tabletop`, because the web app, the room server and later
   line-of-sight code all need it, and it knows nothing of games.
3. **Hex adds a case, not a second system.** Flat-top and pointy-top join as further variants behind
   the same interface; features written against it do not change.
4. **`GRID_SIZE` and its default parameters are replaced** by a grid passed to the snapping
   functions. The whiteboard's alignment guides are independent of the grid and stay as they are.
5. **The interface's rhythm is decoupled from the grid.** The comment and test that tie
   `--of-step` to `GRID_SIZE` are retired with the Notebook-world assertions (WP 0.11 and 0.13).
6. **Distances are in Scene units**, converted through `distance per cell`; the measurement rule
   (for example, how diagonals count) is a Scene setting interpreted by the grid, with the active
   system supplying defaults ([T003](T003-game-system-contract.md)).

## Alternatives considered

- **Grid in `tabletop`.** Rejected: it would keep geometry away from `core` consumers that cannot
  depend on `tabletop`.
- **Per-feature grid math.** Rejected by the brief; also the source of drift between snapping and
  rulers.
- **Reuse the quadrille.** Rejected: it is chrome, not content, and fades by design.

## Consequences

- Phase 2 adds the Scene grid renderer (a plane under the world transform, not the page ruling) and
  grid calibration.
- Benchmarks gain a grid-rendering and a distance-query case ([T006](T006-vision-architecture.md)
  shares the geometry budget).
- Existing snapping tests are rewritten against a `Grid`, keeping the rule that an alignment
  test must use off-grid neighbours (CLAUDE.md rule 17).
