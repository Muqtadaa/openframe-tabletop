# ADR T003 · A Game System is the smallest contract the first real system needs

**Status:** Accepted (direction) · 2026-10-12 · finalised in Phase 3 · see also
[T002](T002-actor-and-token.md), [T008](T008-package-boundaries.md),
[T012](T012-system-and-content-provenance.md)

## Context

The platform must be system-independent while shipping a useful first-party system. The brief warns
against two failures: a generic framework designed before any game exists, and a 5E model disguised
as generic. Today there is nothing to build on: no Actor, no dice, no encounter.

## Decision

1. **Build the abstraction from the first real system.** `packages/system-srd5e` is written against
   the Phase 3 needs; each extension point it forces becomes a platform contract in `tabletop`. No
   contract is designed for a system that does not exist. A second, materially different system
   (Phase 8) is what proves generality.
2. **A system registers, at the composition root only:**
   - an identifier and version (`srd5e`, never a marketing name);
   - Actor and Item _type_ definitions, each with a schema for its `system` data (validated at
     boundaries, rule 8);
   - pure functions deriving values from system data;
   - sheet components for each Actor and Item type;
   - roll formulas for its actions and its initiative rule;
   - what a Token's bars and labels read.
3. **Platform code sees a system only through those registrations.** It never imports a system
   package ([T008](T008-package-boundaries.md)) and never reads a field of `actor.system`.
4. **Rules implementation and rules content are separate.** Code in the system package; data in
   `content/<system>/` with provenance ([T012](T012-system-and-content-provenance.md)).
5. **Automation targets Levels 0 to 2** of the brief: correct record keeping, convenient rolls, basic
   state assistance (applying damage, healing and rests). Effects that modify calculations and
   deeper resolution are later.
6. **Dice are a platform service**, not part of the system: expression parsing and rolling
   (`1d20`, `2d6+4`, `4d6kh3`, `2d20kh1+7`, `1d100`), with roll metadata (roller, formula, result,
   time, visibility, context). A system supplies formulas and context.

## Alternatives considered

- **Design a full plugin API first.** Rejected: the extension surface would be guessed.
- **Hard-code 5E and abstract later.** Rejected: the cost of finding every leak is the cost this
  decision avoids by making the boundary a build rule from the start.
- **System as data only (no code).** Rejected: sheets and derived values need code; data-only
  systems can be a later, narrower kind.

## Consequences

- The first contract is expected to be wrong in places; Phase 8 is budgeted to correct it.
- Contract tests run against each registered system (schema validity, derivations, roll formulas).
- Extension isolation for third parties is out of scope ([T007](T007-extension-isolation.md)).
