# OpenFrame Tabletop documentation

OpenFrame Tabletop is a browser-based **virtual tabletop** for online tabletop
roleplaying games, derived from OpenFrame's collaborative spatial foundation. It is
in **Phase 0**: the foundation is verified and de-scoped, and the tabletop on top of
it is not built yet. [`PRODUCT.md`](../PRODUCT.md) says what is settled and what is
not.

Much of what follows was written for OpenFrame, the structured whiteboard it
descends from. It still describes the foundation accurately where it is not marked
otherwise, and where a feature was removed the page says so. The Tabletop plans are
in [`plans/`](plans/00-source-audit.md); OpenFrame's own product and design records
are in [`legacy/`](legacy/openframe-whiteboard-product.md).

---

## Start here

| If you want to…                          | Read                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Understand the system in ten minutes     | [Architecture overview](architecture/01-overview.md)                                               |
| Know who this is for and what is settled | [`PRODUCT.md`](../PRODUCT.md) — product truth, not visual direction                                |
| Know what the interface is trying to be  | [`DESIGN.md`](../DESIGN.md) and `apps/web/.impeccable/surfaces/`                                   |
| Know where a piece of state belongs      | [State ownership](architecture/02-state-ownership.md)                                              |
| Add a new kind of canvas object          | [Object type registry](architecture/04-object-type-registry.md)                                    |
| Change what happens on the board         | [Commands and undo](architecture/05-commands-and-undo.md)                                          |
| Know what we are building next           | [The brief](plans/openframe-tabletop-project-plan.md) and [Phase 0](plans/01-phase-0-execution.md) |
| Know why something was decided           | [Decision records](adr/README.md)                                                                  |
| Work on this repo with Claude Code       | [`CLAUDE.md`](../CLAUDE.md)                                                                        |
| See how Tabletop is being derived        | [Source audit](plans/00-source-audit.md) and [Phase 0](plans/01-phase-0-execution.md)              |

---

## The five ideas

If you remember nothing else:

1. **The domain is pure.** `packages/core` has no React, no DOM, no database, no
   CRDT. It depends on `zod` and `fractional-indexing` and nothing else. This is
   enforced in CI, not merely intended.
2. **One mutation path.** Every persistent change goes through
   `CommandDispatcher.dispatch`. The UI and a collaborator's merged edit are
   callers of the same door, and any future caller will be too.
3. **Nothing is written during a drag.** A drag is transient interaction state
   until pointer-up. This single rule delivers correct undo granularity,
   correct multiplayer semantics and most of the performance budget.
4. **Object behaviour lives in the registry**, never in `switch (object.type)`.
   Adding a type is two one-line registrations plus its own folder.
5. **Never write back a document you could not read.** A board that fails to
   parse opens read-only. Losing a user's work is the one unacceptable failure.

---

## Contents

### Architecture — how the system is built

| Document                                                                 | Covers                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| [01 · Overview](architecture/01-overview.md)                             | The whole system, module boundaries, dependency direction |
| [02 · State ownership](architecture/02-state-ownership.md)               | Which state lives where, what persists, what syncs        |
| [03 · Document model](architecture/03-document-model.md)                 | Objects, frames, styles, ordering, the board document     |
| [04 · Object type registry](architecture/04-object-type-registry.md)     | Extensibility: adding `evidence` without touching the app |
| [05 · Commands and undo](architecture/05-commands-and-undo.md)           | The mutation path, patches, transactions, history         |
| [06 · Schema and migrations](architecture/06-schema-and-migrations.md)   | Versioning, migration rules, forward compatibility        |
| [07 · Persistence](architecture/07-persistence.md)                       | Where a board lives: this browser, the room, the database |
| [08 · Canvas renderer](architecture/08-canvas-renderer.md)               | DOM/SVG rendering, culling, hit testing, the escape hatch |
| [09 · Collaboration](architecture/09-collaboration.md)                   | Rooms, the shared document, presence, agents' changes     |
| [10 · Errors and degradation](architecture/10-errors-and-degradation.md) | What breaks, and how it fails safely                      |
| [11 · Security](architecture/11-security.md)                             | The threat model as built, and the known gaps             |
| [12 · Performance](architecture/12-performance.md)                       | Culling, subscriptions, measurement, benchmark boards     |

### Phases — what gets built, in what order

OpenFrame's phases 1 to 5 are history. Tabletop's phases (0 to 10) are in the
[brief](plans/openframe-tabletop-project-plan.md), and Phase 0 is
[being executed](plans/01-phase-0-execution.md).

| Phase                                                                | Status                                |
| -------------------------------------------------------------------- | ------------------------------------- |
| [Phase 1 · Foundation](phases/phase-1-foundation.md)                 | **Done**                              |
| [Phase 2 · Core canvas](phases/phase-2-core-canvas.md)               | **Done**                              |
| [Phase 3 · Structured objects](phases/phase-3-structured-objects.md) | **Done**                              |
| [Phase 4 · Collaboration](phases/phase-4-collaboration.md)           | **Done**                              |
| [Phase 5 · AI and MCP](phases/phase-5-ai-and-mcp.md)                 | OpenFrame only; removed from Tabletop |
| [Phase 5a · MCP server](phases/phase-5a-mcp-server.md)               | OpenFrame only; removed from Tabletop |

### Decision records — why things are the way they are

[Index of all ADRs →](adr/README.md)

### Reviews and operations — what was checked, and how to run it

| Document                                                                   | Contents                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| [Audit · 2026-10-08](reviews/audit-2026-10-08.md)                          | The current audit: the newer surfaces, scored and fixed |
| [Design review log](reviews/design-review.md)                              | Every surface critiqued, what was decided and fixed     |
| [Device and screen-reader validation](reviews/device-and-sr-validation.md) | What automation cannot check, as a checklist for people |
| [Parity matrix](product/parity-matrix.md)                                  | OpenFrame against Miro and FigJam (history)             |
| [Enabling facilitation](operations/enabling-facilitation.md)               | OpenFrame: music and AI, both removed from Tabletop     |
| [Music candidates](music/candidates.md)                                    | OpenFrame: where its session music came from (removed)  |

Earlier reviews ([2026-09-27](reviews/audit-2026-09-27.md),
[2026-10-02](reviews/audit-2026-10-02.md), the
[review plan](reviews/review-plan.md) and
[tracks A and B](reviews/tracks-ab-mcp.md)) are kept as records.

### Appendices — reference material

| Appendix                                                         | Contents                                            |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| [A · Technology decisions](appendices/a-technology-decisions.md) | Every dependency, why it is here, what replaces it  |
| [B · Canvas engine matrix](appendices/b-canvas-engine-matrix.md) | The comparison behind building our own renderer     |
| [C · Risks](appendices/c-risks.md)                               | Known architectural risks and their triggers        |
| [D · Deferred decisions](appendices/d-deferred-decisions.md)     | What was decided late, and what is still open       |
| [E · Testing strategy](appendices/e-testing-strategy.md)         | What is tested where, and what is not tested at all |
| [F · Glossary](appendices/f-glossary.md)                         | Terms used precisely throughout these documents     |

---

## Running the project

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # format + typecheck + lint + boundaries + tests + build + budgets
```

See the [roadmap](phases/README.md) for what is built and what is next, and
[the current audit](reviews/audit-2026-10-08.md) for what was most recently
checked and fixed. What automation cannot check — real devices, real screen
readers — is a checklist for people:
[device and screen-reader validation](reviews/device-and-sr-validation.md).
Where the product stands against its neighbours is the
[parity matrix](product/parity-matrix.md).
