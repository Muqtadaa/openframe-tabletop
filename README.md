# OpenFrame Tabletop

A browser-based **virtual tabletop** for online tabletop roleplaying games, built
on the collaborative spatial foundation of [OpenFrame](https://github.com/Muqtadaa/open-frame).

> **Status: Phase 0.** This repository is OpenFrame at commit `8eb19c5`, with its
> AI, MCP, research-type and session-facilitation features removed, being
> re-founded as a tabletop. There is **no tabletop yet**: no Game, Scene, Token,
> grid, role, dice or game system. What exists is the foundation they will be
> built on, and the plan for building them.
> [Product truth](PRODUCT.md) · [Source audit](docs/plans/00-source-audit.md) ·
> [Phase 0 plan and actuals](docs/plans/01-phase-0-execution.md) ·
> [Decision records](docs/adr/README.md)

The working name is a working title. The product is not a whiteboard with a token
tool, and not a greenfield VTT: it keeps what OpenFrame already got right and
replaces what was about a whiteboard.

---

## What is here

Inherited from OpenFrame, verified at the baseline, and kept:

- **A canvas.** Infinite pan and zoom, culling, selection, resize, rotation,
  z-order, snapping, alignment, clipboard, and undo that is local to the person.
  Typed objects (notes, text, shapes, frames, groups, connectors, tables, code,
  images) with rich text.
- **A domain that stays pure.** `packages/core` has no React, DOM, database or
  CRDT. Every persistent change goes through one command layer. Object behaviour
  lives in a registry. Documents are versioned and migrated, and one that cannot be
  read is never written back.
- **Shared documents.** One room per document on Cloudflare Durable Objects,
  with presence, reconnection, images in R2, and version history.
- **Accounts and membership** on Supabase, never holding a document's contents.
- **Enforced boundaries and measured performance.** Dependency rules, guard tests,
  accessibility tests that read the stylesheet, and benchmarks held to budgets.

Not here, by decision: AI of any kind, the MCP server, the research object types,
dot voting, and the session timer and music. Polls and reactions are written and
tested but hidden. [The audit](docs/plans/00-source-audit.md) says why for each.

## Where it is going

Games above Scenes. A Scene reuses the board document; a Game is a catalogue of
members, roles, a game system and Scenes. Actors and Tokens are separate. The
platform knows nothing of any rules system; the first bundled one is based on the
[System Reference Document 5.2.1](https://www.dndbeyond.com/srd) under CC-BY-4.0.
Secrets are an authorization boundary, not a styling one. The plan, the phases and
the open questions are in [the brief](docs/plans/openframe-tabletop-project-plan.md).

---

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # format + typecheck + lint + boundaries + tests + build + budgets
```

Requires Node 22+ and pnpm 10+. There is no backend yet: the committed
configuration points at placeholder hosts that cannot resolve, so accounts and
shared documents are inert until Phase 1 provisions real ones.

## Structure

```
packages/core     Domain, commands, schema, ports. Pure TypeScript — no React,
                  no DOM, no database, no CRDT. Two dependencies.

packages/collab   The shared document: how a board maps onto Yjs, the room
                  protocol, presence and the change log.

apps/web          Canvas renderer, interaction layer, UI, storage adapters.

apps/rooms        The room server: a Cloudflare Worker routing to one Durable
                  Object per document, with images in R2.

supabase/         Migrations: accounts, the board list, membership, workspaces
                  and comments. Never a document's contents.

docs/             Architecture, decision records, the Tabletop plans, and the
                  OpenFrame history in docs/legacy.
```

## The ideas that carry over

1. **The domain is pure.** Enforced in CI, not merely intended.
2. **One mutation path.** Everything persistent goes through the command layer.
3. **Nothing is written during a drag.** Undo granularity, multiplayer semantics and
   performance all depend on it.
4. **Object behaviour lives in a registry.**
5. **Never write back a document you could not read.**

---

## Documentation

**[Start here →](docs/README.md)**

- [`PRODUCT.md`](PRODUCT.md) — who this is for and what is settled
- [Architecture overview](docs/architecture/01-overview.md) — the system in ten minutes
- [Decision records](docs/adr/README.md) — OpenFrame's, and the Tabletop `T001`–`T012`
- [`CLAUDE.md`](CLAUDE.md) — engineering rules for working in this repo

---

## Licence and provenance

[GNU Affero General Public License v3.0](LICENSE).

Copyright (C) 2026 Muqtadaa.

OpenFrame Tabletop is a derivative of OpenFrame, taken at commit
`8eb19c53f6ab9aa5a852909a94436fa23f776b66` with its history preserved. It is
licensed on the same terms. The AGPL's section 13 means that if you modify this and
let people use it over a network, you must offer those users the source of your
modified version. Whether a hosted Tabletop carries a source link is an owner
decision not yet taken; **if you fork and host it, section 13 binds you.**

Rules content from the SRD 5.2.1, when it ships, is separately licensed data under
CC-BY-4.0 with its own provenance and attribution (ADR T012). Nothing from the
Player's Handbook, Dungeon Master's Guide, Monster Manual, D&D Beyond Basic Rules or
any other book or site is assumed to be redistributable.
