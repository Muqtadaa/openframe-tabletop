# 01 · Phase 0 execution

← [Documentation index](../README.md) · Previous: [00 · Source audit](00-source-audit.md)

Phase 0 turns the OpenFrame whiteboard foundation into a verified, de-scoped, redesigned base
for Tabletop. It builds no VTT feature. The audit it rests on is
[00 · Source audit](00-source-audit.md); the brief is
[the project plan](openframe-tabletop-project-plan.md).

**Working rules**

- Small commits, each preceded by `pnpm verify` (CLAUDE.md). `pnpm test:e2e` as well after anything
  that touches interaction or rendering.
- A new architectural rule is broken once, on purpose, and watched failing (rule 23).
- When a whiteboard invariant stops applying, it is replaced by the corresponding VTT invariant.
  Protection is never deleted wholesale.
- Frozen fixtures and shipped migrations are never edited (rule 6).
- The source repository is read-only. Nothing here is pushed to it.
- Every change goes to `claude/funny-brahmagupta-vfutii`. `main` holds only the pristine baseline.

**Status** is updated at each gate; the last section records actuals.

---

## Sequence and dependencies

```
0.1 import ─► 0.2 baseline ─► 0.3 audit docs ─► 0.4 ADRs ─► 0.5 detach infra
                                                              │
        0.6 remove AI ─► 0.7 remove MCP ─► 0.8 remove research types ─► 0.9 de-scope facilitation
                                                              │
                  0.10 product truth ─► 0.11 split design tests ─► 0.12 Impeccable discovery
                                                                         │  (user picks direction)
                                                       0.13 tokens + shell, then document
                                                                         │
                                                       0.14 validate ─► 0.15 exit gate
```

---

## WP 0.1 — History import

Fetch `upstream/main` in full, create `main` at `8eb19c5`, push it without force, branch the
development branch from it.

**Accept:** `git diff upstream/main main` is empty; 782 commits reachable; remote `main` equals the
baseline; the source clone's `HEAD` and working tree are unchanged. **Gate G0.**

## WP 0.2 — Baseline verification, in the target

Install with the frozen lockfile, run `pnpm verify`, the benchmarks, the rooms suite and the
Chromium end-to-end suite. Record toolchain, timings, bundle sizes and every pre-existing failure
verbatim in `00-source-audit.md` §P. Nothing is fixed in this step.

**Accept:** green, or each failure is triaged as environmental or real and written down.
**Gate G1.**

## WP 0.3 — Planning artifacts

Add the brief (`openframe-tabletop-project-plan.md`), `00-source-audit.md` and this document, and
link them from `docs/README.md`.

**Accept:** `tools/docs/links.test.ts` passes. **Gate G2a.**

## WP 0.4 — ADRs T001 – T012

Written in this order: T008, T001, T011, T004, T002, T003, T005, T006, T007, T010, T012, then T009
once the shape step has run. Format: Status · Context · Decision · Alternatives considered ·
Consequences, like the inherited records. Files are `docs/adr/T0NN-<slug>.md`; `docs/adr/README.md`
gains a Tabletop section.

| ADR  | Settles                                           | Status at the end of Phase 0                         |
| ---- | ------------------------------------------------- | ---------------------------------------------------- |
| T008 | Package boundaries                                | Accepted                                             |
| T001 | Game to Scene persistence                         | Accepted (direction); finalised in Phase 1           |
| T011 | Game-level and Scene-level collaboration topology | Accepted (direction); finalised in Phase 1 / 3       |
| T004 | Player secrecy and state filtering                | Accepted (direction); spike before any hide / reveal |
| T002 | Actor and Token relationship                      | Accepted (direction); finalised in Phase 3           |
| T003 | Game System contract                              | Accepted (direction); finalised in Phase 3           |
| T005 | Grid and measurement abstraction                  | Accepted (direction); finalised in Phase 2           |
| T006 | Vision architecture                               | Accepted as a scoped stub (vocabulary only)          |
| T007 | Extension isolation                               | Accepted as a boundary note                          |
| T010 | Application theme against Scene content           | Accepted                                             |
| T012 | SRD system / content provenance                   | Accepted                                             |
| T009 | Play and Prep shell                               | Accepted after WP 0.12                               |

**Accept:** every question the brief lists is Accepted, scoped, or deferred to a named phase; none
is settled inside feature code. **Gate G2.**

## WP 0.5 — Detach from the original's infrastructure

Blank the committed values in `apps/web/.env` and `apps/rooms/wrangler.toml` that name OpenFrame's
production Supabase project and Worker. Rename the Worker and buckets to `openframe-tabletop-*`.
Adapt, do not delete, `env-file.test.ts` and `deploy-config.test.ts`. Make `deploy-rooms.yml` and
`upload-music.yml` manual-only until real resources exist. Nothing is provisioned in Phase 0.

**Accept:** nothing in the repository can reach the original's backends; verify green. **Gate G3.**

## WP 0.6 — Remove AI

Delete `core/src/ai/` and its export, `apps/rooms/src/ai/`, `AiQuotaObject`, the routes, binding,
variables and secret, and `@anthropic-ai/sdk`. Remove the web `ai` port, `app/ai-*`, the review
and sheet components, the adapter, the context-menu items, the command-facade methods, the
interaction-store flags and the specs. Keep the `ORIGINS` literals. Replace the
`anthropic-sdk-lives-only-in-rooms` rule with a ban on LLM SDKs everywhere. Mark ADRs 0018 and
0022 superseded for Tabletop.

**Accept:** verify green; the new ban rule shown failing on a deliberate violation. **Gate G4a.**

## WP 0.7 — Remove MCP

Delete `apps/mcp` and every reference listed in the audit (§G): the web devDependency, the two
rooms specs, `bench:mcp*`, the `mcp/*` budgets, the CI and nightly steps, the eslint override, the
dependency-cruiser rule, the `sibling-order-rule.test.ts` root and the lockfile entries. **Before**
deleting `mcp-cost.ts`, replace it with a core-and-collab-only transaction-cost bench (many
commands in one transaction, map copies held exactly) so rule 10's protection survives. Remove
the web agent-changes / Inbox surface; leave the `collab` change-log mechanism.

**Accept:** verify green; the replacement bench reports the same map-copy counts the old one did
(3 for 200 commands in one transaction, 3 for one command of 200, 4 for the peer batch).
**Gate G4.**

## WP 0.8 — Remove the research / CRO types

Remove the eight core type folders, their registrations and views, `StructuredSlip`, the sticky
`promotions` entry and the `type-noun` special case. Rewrite the tests that use `evidence` or
`insight` as fixtures to use test-local `defineObjectType` fixtures; keep `relation`, marks and
derivations alive under test. Frozen fixtures are untouched. A research object found in an old
document degrades to the `unknown` placeholder; it is never dropped silently.

**Accept:** verify green; Chromium end-to-end suite green. **Gate G5a.**

## WP 0.9 — De-scope facilitation

Remove dot voting with its wiring. Unregister and unmount polls and reactions. Remove the Session
control, the music routes, the `LIBRARY` binding and `upload-music.yml`. Keep the pure
`core/facilitation`. Update budgets and ADR 0017's status.

**Accept:** verify and end-to-end green; bundle budgets still pass. **Gate G5.**

## WP 0.10 — Product truth

Rewrite `PRODUCT.md` for Tabletop in the `impeccable:product-schema 1` format, following
`reference/init.md` read as a document (no launcher call yet). Rewrite `README.md` and the docs
index. Copy `DESIGN.md` to `docs/legacy/openframe-whiteboard-design.md` with a "historical, not
authoritative for Tabletop" banner, and add the same banner to the root file so the incumbent
stays readable as evidence without being silently authoritative. Touch `CLAUDE.md` only for product
wording and for rules that name removed features; add no rule that lacks an enforcing test. Keep
the licence and add a provenance note naming the baseline commit. Invent no claim about users,
pricing or brand.

**Accept:** docs link test passes. **Gate G6.**

## WP 0.11 — Split the design tests

Split `design-tokens.test.ts` into a WCAG floor (contrast tiers, 12px, target sizes, focus, reduced
motion, no colour literals outside `:root`) and an incumbent-world file (quadrille ceiling, One Red,
never-black, multiples of ten, slip radii, distinct defaults). Split `brand-splash.test.ts` the same
way.

**Accept:** identical assertion count and pass state before and after; the WCAG file contains no
Notebook vocabulary. **Gate G7.**

## WP 0.12 — Impeccable discovery (first Impeccable call; user checkpoint)

Prerequisites: `PRODUCT.md` rewritten and the design tests split.

1. Run `.claude/skills/impeccable/scripts/impeccable context` once. If the launcher fails, say so
   as the skill requires, read `PRODUCT.md` and `DESIGN.md` directly, and continue.
2. `shape`: Game Library, Player tabletop, GM tabletop, Campaign Prep shell.
3. New-work for a replacement world, as `reference/new-work.md` specifies: name mechanism, audience,
   cultural home and rut; seven visual systems across at least three material families;
   `impeccable concept-seed --scope direction --mode operate` **before any artifact code**;
   challenger verdicts. "The Table" is one hypothesis among the candidates.
4. The local decision page may not reach the user's browser from a cloud session, so directions are
   put to the user through the session instead.
5. Write Direction contracts with `surface-brief write` into `apps/web/.impeccable/surfaces/`;
   set `buildPath`.

**The user chooses the direction. This is the only planned stop in Phase 0.**

**Accept:** four surface briefs with contracts; direction chosen by the user; ADR-T009 Accepted.
**Gate G8.**

## WP 0.13 — Tokens and shell, then document

(The brief's steps 0F and 0G, merged: Impeccable's documenter derives `DESIGN.md` from a shipped
build, so the contract cannot precede the shell.)

1. Read `reference/craft-floor.md` immediately before any UI edit.
2. Two token namespaces: application tokens (vary by UI theme) and Scene-content tokens (no theme
   overrides them).
3. Game Library, Player tabletop, GM tabletop and Prep shell over Board-backed data. Presentation
   relabelling only, marked as scaffolding with a pointer to Phase 1. Posture comes from the existing
   owner / editor / viewer roles. Registry-driven tools gain a capability filter.
4. Dock and panel system.
5. Retire the Notebook-world tests and the splash. Add new-world assertions: the theme-boundary test
   (ADR-T010) and the platform-neutral vocabulary test.
6. Regenerate visual goldens deliberately.
7. Run the finish reviewer once, then the documenter, to write the new `DESIGN.md` and
   `.impeccable/design.json`.
8. Archive the old sidecar, surface briefs and critiques under `docs/legacy/`.

**Accept:** verify, Chromium end-to-end, rooms suite and bundle budgets green (Firefox / WebKit smoke
in CI); the old `design.json` is no longer at its old path. **Gate G9.**

## WP 0.14 — Impeccable validation

`critique`, `audit`, `adapt` (touch and narrow), `harden` (permission, offline, empty and error
states), in that order, fixed in one batch. `polish` only if the concept is already right.

**Accept:** no unresolved AA failure; contrast tests green in every theme. **Gate G9b.**

## WP 0.15 — Phase 0 exit gate

- Baseline imported and verified.
- AI is not an active requirement anywhere.
- `PRODUCT.md` and `DESIGN.md` describe Tabletop.
- Player, GM and Prep postures exist.
- Architecture and design tests agree with the product.
- No Notebook rule is authoritative by accident: `rg -i "notebook|after hours|quadrille"` over live
  docs and tests returns only legacy paths.
- ADRs T001 – T012 recorded.
- This document updated with actuals.

**Gate G10.**

---

## Gates

| Gate     | Holds when                                                                |
| -------- | ------------------------------------------------------------------------- |
| G0       | `main` is identical to `upstream/main`                                    |
| G1       | Baseline numbers recorded in the audit                                    |
| G2a / G2 | Planning documents and ADRs present; docs link test passes                |
| G3       | Nothing reaches the original's backends                                   |
| G4a / G4 | AI, then MCP, gone; new rules shown failing; transaction bench equivalent |
| G5a / G5 | Research types, then facilitation, gone; end-to-end and budgets green     |
| G6       | Product documents describe Tabletop                                       |
| G7       | Design-test split with assertion-count parity                             |
| G8       | User has chosen the direction                                             |
| G9 / G9b | Shell built and validated; full checks green                              |
| G10      | Exit checklist complete                                                   |

## Actuals

<!-- ACTUALS -->

_Not yet updated._
