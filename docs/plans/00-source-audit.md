# 00 · Source audit

← [Documentation index](../README.md) · Next: [01 · Phase 0 execution](01-phase-0-execution.md)

The brief is [`openframe-tabletop-project-plan.md`](openframe-tabletop-project-plan.md). This
document records what the OpenFrame source actually contains, taken from the code and not from
the brief's summary of it, and how each part is dispositioned for Tabletop. Where the two
disagree, the code is right.

Audit date: 2026-10-12. Method: direct reads of `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, the
architecture documents and ADR 0016, plus three parallel read-only inspections of the domain and
server side, the web application, and the design/test/CI infrastructure. Test and benchmark
numbers in §P were measured in this repository at the baseline commit.

---

## A. Source repository state and commit

|                            |                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------- |
| Repository                 | `Muqtadaa/open-frame`                                                           |
| Commit                     | `8eb19c53f6ab9aa5a852909a94436fa23f776b66` (2026-10-09, merge of PR #109)       |
| Equals `origin/main`       | Yes. The brief's reference SHA is current, and nothing newer exists             |
| Licence                    | AGPL-3.0-only (`LICENSE`, and every `package.json`)                             |
| Authorship                 | 232 commits by Claude, 65 by the owner, in the shallow clone that was available |
| Source clone               | **Shallow** (297 commits, rooted at PR #45). Left untouched                     |
| History in this repository | **782 commits**, fetched in full from `upstream/main`                           |

The source repository was read-only throughout. Its working tree was clean and its `HEAD` was
unchanged at the end of the audit.

## B. Target repository state

`Muqtadaa/openframe-tabletop` was empty: no commits and no remote refs. `main` now points at the
unmodified baseline `8eb19c5` with full ancestry (WP 0.1), pushed without force. Work proceeds on
`claude/funny-brahmagupta-vfutii`. The `upstream` remote stays configured so later OpenFrame
fixes can be merged deliberately.

## C. Package and workspace graph

pnpm workspaces (`packages/*`, `apps/*`), node ≥22, pnpm 10, TypeScript 6.0.3.

| Workspace         | Role                                                                        | Depends on                           |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| `packages/core`   | Pure domain: 24 type folders, 29 command kinds, registry, schema, ports     | `zod`, `fractional-indexing`         |
| `packages/collab` | The board on Yjs: document map, room protocol, change log, presence         | `core`, `yjs`, `y-protocols`, `lib0` |
| `apps/rooms`      | Cloudflare Worker, one Durable Object per board, R2 for images and versions | `core`, `collab`                     |
| `apps/web`        | React SPA: canvas, interaction, UI, adapters                                | `core`, `collab`, React, Supabase    |
| `apps/mcp`        | stdio MCP server, a headless room peer                                      | `core`, `collab`, MCP SDK, Supabase  |
| `supabase/`       | 24 SQL migrations (2026-09-19 → 2026-10-03)                                 |                                      |

Layering inside `apps/web`: `ui` and `canvas` → `interaction` → `scene` → `core`; `views`,
`controls` and `scene` are leaves; I/O reaches the interface only through `runtime/services.ts`
(10 ports). 24 dependency-cruiser rules hold this.

## D. Architecture inventory

- **Document.** A flat `Map<ObjectId, object>` with `parentId` and a fractional `order`. Meta is
  only `{title, createdAt}`. The schema envelope is at **version 1 with no envelope migrations**;
  evolution so far is per-type `dataVersion` (frozen fixtures under `schema/__fixtures__/` and
  `types/*/__fixtures__/`).
- **Commands.** One `CommandDispatcher.dispatch`. 29 command kinds, pure handlers returning
  `Patch[]`, generic inverse for undo, a core-side local `UndoStack`. Remote changes enter as
  `ApplyRemotePatches` with `skipUndo`.
- **Registry.** `ObjectTypeDefinition` (pure) and `ObjectViewDefinition` (React) carry every
  behaviour that varies by type: bounds, hit test, capabilities, endpoints, relations, marks,
  derivations, tools.
- **Persistence.** `BoardRepository` port, IndexedDB and memory adapters, quarantine on a load that
  cannot be fully read (rule 7).
- **Collaboration.** One Durable Object per board holding one Y.Doc. Objects are plain JSON values
  in a `Y.Map`. Wire protocol: SYNC, AWARENESS, ROLE, TIME, PART (large messages), HELLO.
  Presence is Yjs awareness, renewed once a minute. The room keeps **no timer** (rule 29).
- **Rooms trust model (ADR 0016).** The room is authoritative on _who may write_, not _what is
  written_. It admits by 128-bit **bearer link keys** (editor, viewer, owner) and optional password.
  It never consults Supabase. A viewer's writes are dropped; every peer, viewer included, receives
  the whole document. `hidden`, `locked` and the "hide counts" flags are interface-only.
- **Identity.** Supabase holds `profiles`, `boards` (which also duplicates the room keys),
  `board_members`, `workspaces`, `workspace_members`, comments and mentions, all under RLS. It
  never holds board content.
- **Assets.** R2, keyed `<boardId>/<assetId>`, validated by size, declared type and sniffed bytes
  (rule 19). SVG is refused. Versions are gzipped Yjs snapshots under the same prefix.
- **Canvas.** DOM/SVG renderer. `.of-world` is the only transformed layer; `.of-apparatus` is
  screen-space. Linear-scan culling in paint order, per-object subscriptions, gestures as modules.
- **Grid.** Lives entirely in the web app: `scene/snapping.ts` (`GRID_SIZE = 10`, a default
  parameter at about fifteen call sites) and `scene/grid.ts` (a CSS ruling). Core has no grid and
  there is no cell, hex or distance concept anywhere.
- **Routing.** A query string (`app/route.ts`), not a router; navigation is a full page load.

## E. Reusable systems

Generic collaborative-spatial infrastructure that Tabletop keeps: the pure core boundary, the
dispatcher and patch/undo machinery, schema and migration machinery, the registry mechanism,
canvas rendering and culling, viewport, selection and transform gestures, the apparatus-layer
discipline, keyboard / roving / Escape infrastructure, IndexedDB and memory adapters, `collab`,
the Durable Object room and its hibernation discipline, R2 asset handling and upload policy,
version history, Supabase identity and membership, the benchmark and budget machinery, the
architecture and guard tests, and the Impeccable tooling.

Generic types kept: `frame`, `group`, `text`, `shape`, `sticky`, `image`, `connector`, `table`,
`code`, `unknown`, and the non-spatial `relation`.

Generic primitives kept even though their first consumer is removed: the registry's relation,
mark and derivation indexes, `DeriveObject`, `ConvertObjects`. Marks suit per-player ownership
and relations suit campaign links.

## F. Whiteboard and research-specific systems

- **Research / CRO types (8):** `evidence`, `insight`, `hypothesis`, `experiment`, `decision`,
  `task`, `journey-stage`, `requirement`, with their views, `StructuredSlip`, the sticky
  `promotions` entry, the `type-noun` special case, and the record-panel and provenance UI that
  exist for them. They are isolated: one folder each, no cross-imports.
- **Facilitation:** dot voting (`vote`, `vote-round`, entangled with `scene/tools`,
  `pointer-controller`, `ContextMenu`, `Canvas`), polls (`poll`, `poll-answer`), reactions, the
  session timer and the session music (including the public `/music/*` routes, the `LIBRARY`
  bucket and the upload workflow). The music tracks are CC0-labelled **AI-generated** audio.
- **Board-product surfaces:** board overview, export as a Markdown readout (built around
  relations; contains a research-specific section), comments and mentions.
- **Front door:** the board list and workspaces as presented by `Home`, the sharing sheet.

## G. AI and MCP-specific systems

- **AI:** `packages/core/src/ai/` (contract and layout), `apps/rooms/src/ai/` (handler, quota,
  Claude client), `AiQuotaObject`, the `/ai/cluster` and `/ai/summary` routes, the
  `@anthropic-ai/sdk` dependency and its dependency-cruiser rule, the web `ai` port and its
  clustering and summary UI. ADRs 0018 and 0022. Cleanly separable: the Worker never reads a
  board, and the browser applies the result as ordinary commands.
- **MCP:** `apps/mcp` (about 5k lines). Only `apps/web` references it, as a devDependency used by
  two rooms e2e specs. Its removal also touches `bench:mcp*`, the `mcp/*` budgets, `ci.yml`,
  `nightly.yml`, an eslint override, a dependency-cruiser rule and the list of roots in
  `sibling-order-rule.test.ts` (which throws on a missing directory).
- **Agent change tracking:** `LOGGED_ORIGINS` (`mcp`, `ai`, `api`) and the change log in
  `collab`, `CommandDispatcher.revert`, the `ORIGINS` literals stamped into every object's
  `createdVia`, and the web Inbox / agent-changes surface. The mechanism is generic enough to be a
  future audit trail and is **kept untouched**; only the web surface goes.

A performance invariant rides on the MCP code: `tools/bench/mcp-cost.ts` is what proves
CLAUDE.md rule 10's transaction-cost claim (map copies counted exactly). It is replaced, not
dropped (WP 0.7).

## H. Current design-system inventory

- `DESIGN.md` (1,994 lines): "The Notebook" and its second world "After Hours".
- `.impeccable/design.json`: a schema-2 sidecar of DESIGN.md holding palette ramps, shadows,
  motion and components. No test compares it with the stylesheet.
- `apps/web/.impeccable/surfaces/`: 24 surface briefs; `critique/`: 22 snapshots. **None carries a
  Direction contract**, so none has been through the replacement-world process.
- `apps/web/src/styles/`: 43 CSS parts ordered by `index.css`; `tokens.css` holds the default
  world, the coarse-pointer sizes and the After Hours theme.
- Themes: `notebook` (no attribute) and `after-hours` (`data-theme`), stored in
  `localStorage['openframe:theme']`.
- Fonts: system stacks only; no font file ships.
- Brand: neon synthwave logo and hero (masters committed, a WebP and two PNG marks shipped).
  `PROVENANCE.md` states how they were processed but **no licence**.
- Impeccable: skill v4.3.1, engine 0.1.5 (the launcher downloads a binary on first run), four
  agents under `.claude/agents/`, 39 reference files.

## I. Notebook-specific design assumptions

These are the assumptions the replacement world must not inherit by accident:

- The product is a **page**: engineering quadrille stock, slips, a hairline margin rule, a contact
  shadow. Chrome takes the page's own stock and is never a floating capsule.
- **Chrome rhythm is derived from the board grid** (`--of-step: 10px` = `GRID_SIZE`, and every
  padding above 20px a multiple of ten, enforced by a test).
- **The ground is faint by decree**: the quadrille has a contrast _ceiling_ as well as a floor.
- **One corrective red; ink is never black; no two types share a default colour.**
- **Mono is a record.** Motion is "inked in" and "set down", never bouncing or looping.
- **The canvas is the product and nothing permanently claims a band of the screen** (the rule the
  brief retires for Prep).
- The splash and brand colours are tied to tokens by a test.
- Two themes alter the _visual world_, including how the user's own content is coloured, which is
  exactly the boundary Tabletop forbids (Scene Fidelity).

Generic rules to keep: contrast tiers (4.5:1 text, 3:1 controls and edges), the 12px functional
floor, target sizes (24px AA floor), reduced motion as "fewer and gentler", keyboard-reachable
tooltips, copy that names rather than coaches, no web-font request, token-name storage.

`app/design-tokens.test.ts` (about 1,280 lines) **mixes both kinds**. Splitting it is WP 0.11, and
it must happen before the visual world changes.

## J. Source-to-target disposition matrix

| Area                                                                                       | Disposition                                             | Phase 0 action                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------- |
| Core purity, dispatcher, patches, undo, registry, schema machinery, ports                  | **KEEP**                                                | none                                                           |
| Generic types (frame, group, text, shape, sticky, image, connector, table, code, unknown)  | **KEEP**                                                | none                                                           |
| `relation`, marks, derivations, `DeriveObject`, `ConvertObjects`                           | **KEEP** (primitives)                                   | exercised by test-local fixtures                               |
| Eight research/CRO types and their UI                                                      | **REMOVE**                                              | WP 0.8                                                         |
| Canvas renderer, culling, viewport, selection, gestures, apparatus, keyboard/roving/Escape | **KEEP**                                                | map and plane layers in Phase 2                                |
| Snapping and grid                                                                          | **REPURPOSE**                                           | grid math into core geometry (ADR-T005); scene grid in Phase 2 |
| IndexedDB / memory adapters                                                                | **KEEP**                                                | none                                                           |
| `collab` mapping, protocol, provider, presence                                             | **KEEP / EXTEND**                                       | none                                                           |
| Change log, `revert`, `ORIGINS`                                                            | **DEFER**                                               | code untouched; web surface removed                            |
| Rooms: Durable Object, R2, versions, alarm, rule 29                                        | **KEEP / EXTEND**                                       | admission replaced in Phase 1 (T004 / T011)                    |
| Rooms AI routes, `AiQuotaObject`, `core/ai`, web AI                                        | **REMOVE**                                              | WP 0.6                                                         |
| `apps/mcp` and everything that references it                                               | **REMOVE**                                              | WP 0.7                                                         |
| Supabase identity and membership                                                           | **EXTEND**                                              | new Game tables in Phase 1; `boards` is not reused             |
| Board list, workspaces, `Home`                                                             | **REPURPOSE**                                           | Game Library shell (WP 0.13); real domain in Phase 1           |
| Share / members                                                                            | **EXTEND**                                              | roles and capabilities in Phase 1                              |
| Comments and mentions                                                                      | **HIDE / DEFER**                                        | decide in Phase 7                                              |
| Version history                                                                            | **KEEP / ADAPT**                                        | per Scene                                                      |
| Board overview, export as readout                                                          | **HIDE / DEFER**                                        | export is research-shaped                                      |
| Dot voting                                                                                 | **REMOVE**                                              | WP 0.9; recoverable from git                                   |
| Polls, reactions                                                                           | **HIDE**                                                | unregister and unmount; code stays                             |
| Session timer and music (and `/music/*`, `LIBRARY`, upload workflow)                       | **REMOVE** UI and server; keep pure `core/facilitation` | WP 0.9                                                         |
| Notebook / After Hours visual system, splash                                               | **REPLACE**                                             | WP 0.12 – 0.13                                                 |
| Brand art                                                                                  | **PRESERVE** in legacy                                  | no licence stated; not reused                                  |
| Impeccable skill, agents, `.impeccable/`                                                   | **KEEP and USE**                                        | WP 0.12                                                        |
| WCAG-generic tests                                                                         | **KEEP**                                                | split out in WP 0.11                                           |
| Benchmarks, budgets, CI, nightly                                                           | **KEEP / EXTEND**                                       | VTT fixtures from Phase 2                                      |

## K. Git and history migration strategy

Done in WP 0.1, with the user's explicit permission to create `main`:

1. `git remote add upstream https://github.com/Muqtadaa/open-frame`; `git fetch upstream main`
   (full history of `main` only, not the other session branches).
2. Confirmed `upstream/main` is `8eb19c5`; 782 commits; repository not shallow.
3. `main` created at that commit with an empty diff against `upstream/main`, then pushed without
   force to the empty remote.
4. `claude/funny-brahmagupta-vfutii` branches from `main`. Every later change is a commit on it.
5. `upstream` remains configured, read-only by convention, for deliberate future merges.

No source-repository branch, tag or file was modified.

## L. Licence and provenance requirements

- **Code.** AGPL-3.0-only is preserved: `LICENSE`, the package licence fields, and the README
  copyright line. The hosted OpenFrame deliberately offers no source link (owner decision,
  2026-10-07, on the basis that the owner holds the copyright); an end-to-end test asserts that.
  Whether Tabletop follows the same posture, and what to do about contributions made by Claude
  commits, are **owner decisions to review before public hosting**, not legal advice.
- **SRD 5.2.1.** CC-BY-4.0. The bundled system uses only content in the SRD. Rules code and rules
  content are separate, every content file has a provenance entry (ADR-T012), and the exact
  attribution statement is **quoted from the SRD itself at first import**. The wording in the
  brief is treated as the expected text, not as verified.
- **Not assumed redistributable:** Player's Handbook, Dungeon Master's Guide, Monster Manual,
  D&D Beyond Basic Rules, Forgotten Realms, adventures, official art, logos, trade dress.
- **Naming.** Internal identifier `srd5e`. Generic code never depends on a marketing name.
  Public wording stays at "compatible with fifth edition" until a trademark review says otherwise.
- **Music.** The catalogue is CC0-labelled but AI-generated. It is not carried into Tabletop.
- **Brand art.** No stated licence. Preserved in `docs/legacy`, not reused.
- **Infrastructure identity.** The committed `.env` and `wrangler.toml` name OpenFrame's
  production Supabase project and Worker. They are detached in WP 0.5.

## M. Proposed target package graph

Nothing is created in Phase 0 beyond ADRs. Each package exists to prevent a specific dependency.

```
content/srd5e/        data and provenance only; no code
packages/core         generic spatial domain + grid and measurement geometry
packages/collab       Yjs mapping + room protocol                       -> core
packages/tabletop     (Phase 1) Game, roles to capabilities, Scene      -> core, zod
                      metadata, scene object types, Actor / Item /
                      Encounter / Roll and GameSystem contracts
packages/system-srd5e (Phase 3) rules implementation                    -> tabletop
apps/rooms            Durable Object, R2, ticket admission              -> core, collab, tabletop
apps/web              composition root alone may import system-*        -> all of the above
```

Forbidden edges (dependency-cruiser rules written when each package exists, each shown to fail
once): `core -> tabletop`, `collab -> tabletop`, and `tabletop`, `rooms`, `ui`, `canvas`, `scene`,
`interaction` `-> system-*`. A vocabulary-neutrality test covers the generic packages in the
meantime. The final decision is ADR-T008.

## N. Required ADRs

T001 – T012, written in WP 0.4 in this order: T008, T001, T011, T004, T002, T003, T005, T006,
T007, T010, T012, then T009 after the shape step. New records are `docs/adr/T0NN-….md`; the
inherited 0001 – 0022 stay as the OpenFrame record. Details in
[01 · Phase 0 execution](01-phase-0-execution.md).

## O. Phase 0 task sequence

See [01 · Phase 0 execution](01-phase-0-execution.md): WP 0.1 – 0.15, each with acceptance criteria
and gates G0 – G10.

## P. Test and baseline commands

Commands, from `CLAUDE.md`:

```bash
pnpm install --frozen-lockfile
pnpm verify              # format, typecheck, lint, depcruise, test, bench smoke, MCP bench smoke, tools tests, build, bundle budgets
pnpm test:e2e            # Playwright, Chromium; OPENFRAME_CHROMIUM_PATH if the sandbox ships its own
pnpm test:e2e:smoke      # the @smoke loop in Firefox and WebKit
pnpm test:rooms          # shared boards against a real Durable Object (wrangler --local)
pnpm bench:fixtures && pnpm bench:cull && pnpm bench:mcp && pnpm test:bench
pnpm bench:bundle --check
```

Measured baseline: see the table at the end of this section, filled in from the run at
`8eb19c5`.

<!-- BASELINE-TABLE -->

## Q. Risks and unresolved decisions

1. **The room cannot keep a secret or know who someone is.** It admits by bearer link and relays
   everything to everyone; "hidden" is an interface flag. Nothing secret may be built on it.
   Direction (ADR-T004 / T011): partition by audience, with identity-based ticket admission.
   Must be settled and spiked before any hide / reveal feature ships.
2. **Scene settings cannot ride `meta`.** The remote meta filter drops unknown keys and the
   envelope has no migrations. The first envelope migration (with a frozen fixture, rule 6) is a
   Phase 1 task.
3. **A Game must not be a renamed Board**, yet WP 0.13 builds the shell over Board data. Both hold
   if the shell relabels only, is marked as scaffolding, and introduces no `Game` domain alias.
4. **Removing MCP removes a performance invariant** unless the transaction bench is replaced first.
5. **The largest accessibility test is also the largest Notebook test.** Split before the world
   changes, or the WCAG floor goes with it.
6. **Impeccable derives `DESIGN.md` from a finished build**, so the brief's steps 0F and 0G run as
   one work package.
7. **Impeccable's decision page needs the user's browser.** Directions are presented through other
   means in a cloud session.
8. **Free-plan limits.** The Cloudflare Durable Object allowance belongs to the account, not the
   Worker, and OpenFrame alone has used about 90% of a day's allowance. Supabase's free tier caps
   active projects and pauses idle ones. Provision new resources at the start of Phase 1; expect
   to move Tabletop to a paid Workers plan before real play sessions.
9. **Unverified legal points:** the exact SRD attribution wording, AGPL source-offer posture for a
   hosted Tabletop, and ownership of contributions made by Claude commits.
10. **Names.** `@openframe/*`, `--of-*` and `openframe:` storage keys are not renamed in Phase 0.
    The product name is a working title.
11. **Bundle headroom is thin** (front door, board and shared-board routes sit within a few kB of
    their budgets); any growth from the new shell must be justified against the product's limit.
12. **Browser coverage in this sandbox.** Only Chromium is installed here; Firefox and WebKit
    runs of the smoke suite are a CI concern (see §P for what was and was not run).
