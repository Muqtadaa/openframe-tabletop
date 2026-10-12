# ADR T008 · Package boundaries: `tabletop` and `system-srd5e` earn packages, later

**Status:** Accepted · 2026-10-12 · extends [ADR 0009](0009-repository-structure-two-packages.md)

## Context

OpenFrame's rule is that a package boundary is worth its cost where it stops a dependency that
matters (`docs/architecture/01-overview.md`). `packages/core` is pure, depends only on `zod` and
`fractional-indexing`, and pins that list in `architecture.test.ts`.

Tabletop adds two bodies of vocabulary: the platform's (Game, member, role, capability, Scene
metadata, Actor, Item, Encounter, Roll, GameSystem) and a rules system's (ability scores, hit
points, spell slots). The brief requires that the second never leaks into generic Scene,
collaboration or platform code, and that generic code never assumes a system's fields.

Nothing in Phase 0 needs either body of code. Creating empty packages now would make the tree look
organised and prevent nothing.

## Decision

1. **No new package in Phase 0.**
2. **`packages/tabletop`** is created in Phase 1, when the first Game code exists. It is pure
   (dependencies: `core`, `zod`). It holds the Game and membership domain, role-to-capability
   mapping, Scene metadata, the scene object types (token, wall, light, …), and the Actor / Item /
   Encounter / Roll and `GameSystem` contracts.
3. **`packages/system-srd5e`** is created in Phase 3, when the first rules code exists. It depends on
   `tabletop` (and `core`) and nothing else platform-side. Rules content lives in `content/srd5e/` as
   data with provenance and no code ([T012](T012-system-and-content-provenance.md)).
4. **Forbidden edges**, written as dependency-cruiser rules when each package exists and shown
   failing once (CLAUDE.md rule 23):
   - `core -> tabletop`, `collab -> tabletop`;
   - `tabletop`, `apps/rooms`, and the web app's `ui`, `canvas`, `scene`, `interaction` `->
system-*`. Only the web composition root (`app/`) imports a system and registers it.
5. **Until `tabletop` exists**, a vocabulary-neutrality test over `core`, `collab`, `apps/rooms` and
   the web `scene`, `canvas` and `interaction` directories fails on rules-system terms (armor class,
   hit points, spell slots, and the like) outside an explicit allowlist. It lands with the
   replacement shell (WP 0.13).
6. `packages/core` keeps its allowlist. Scene object types move to `tabletop` rather than into
   `core`, so core's vocabulary stays that of a generic collaborative spatial document.

## Alternatives considered

- **Put everything in `core`.** Rejected: the pure-domain allowlist and the "generic" claim would
  carry tabletop vocabulary, and "no 5E in generic code" would be a convention instead of a rule the
  build enforces.
- **Create `tabletop` and `system-srd5e` now.** Rejected: empty packages, no content to bound.
- **A single `game` package holding platform and system.** Rejected: it is exactly the shape that
  lets platform code import a rules system.
- **Separate packages per scene object type.** Rejected: the registry already gives one folder per
  type; a package per type buys nothing.

## Consequences

- Phase 1 begins by creating `tabletop` with its first real contents and its dependency rules.
- Moving scene types out of `core` means `core/types/` stays the generic set (frame, group, text,
  shape, sticky, image, connector, table, code, unknown, relation).
- `CLAUDE.md`'s "one object type per folder in `core/src/types/` and `web/src/views/`" gains
  `tabletop/src/types/` when the package exists.
- If a second system arrives (Phase 8) it is a sibling `system-*` package with no change to
  `tabletop` beyond what the first system's real needs already forced.
