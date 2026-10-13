# Product

<!-- impeccable:product-schema 1 -->

> Rewritten 2026-10-13 (Phase 0, WP 0.10) for OpenFrame Tabletop. The product it
> replaces, a structured whiteboard for research and CRO teams, is kept as history
> in [`docs/legacy/openframe-whiteboard-product.md`](docs/legacy/openframe-whiteboard-product.md).
> This record was derived from the project brief
> ([`docs/plans/openframe-tabletop-project-plan.md`](docs/plans/openframe-tabletop-project-plan.md))
> and measurements taken in this repository, not from a fresh interview. Facts not
> in either are listed as undecided, not guessed.

## Platform

web

## Users

People who play tabletop roleplaying games together online, in groups that
**meet again**: a campaign is weeks or years, not an evening.

- **The Game Master (GM)**, who runs the game. Two jobs, in different postures:
  _prepare_ between sessions (maps, characters, notes, encounters), and _run_ the
  session (the table, the rules, the players).
- **Assistant GMs**, who share part of that work.
- **Players**, who see the table and what their characters can see, move their own
  pieces, roll, and keep their character's record.
- **Spectators**, who watch and change nothing.

The roles are not symmetrical, and what each may see differs: a GM holds
information players must not receive.

## Product Purpose

A browser-based virtual tabletop: a **structured collaborative game environment
whose primary play surface is a spatial tabletop**.

Success is that a group can run a real, recurring campaign in it. A GM prepares a
map and a cast, players join and move the pieces they own, rolls and state are
recorded correctly, secrets stay secret, and none of it is lost between sessions.

## Positioning

The neighbours are Owlbear Rodeo (fast, low-friction map and token play), Roll20
(broad, hosted) and Foundry VTT (deep, extensible). The order of priority is:

> excellent tabletop, then an excellent first-party fifth-edition experience, then
> an excellent campaign platform, then more game systems, then an extension
> ecosystem.

What a neighbour could not truthfully copy by adding a feature is the foundation
underneath: typed objects, one command path for every change, versioned documents,
strong undo, real-time collaboration, explicit authorization and enforced
architectural boundaries, inherited from OpenFrame and kept. It is not a
whiteboard adapted to display battle maps, and not a fork with a token tool.

## Operating Context

- **Sessions recur.** A campaign is returned to, often by people who were not in
  the room last time. State must be where it was left.
- **Two postures.** _Play_: the tabletop is the product and the interface frames
  it. _Prep_: the campaign is the product and persistent navigation is legitimate.
- **Mixed devices.** Players join from what they have, including touch devices.
- **Real-time and sometimes unreliable.** Connections drop and come back; committed
  work must survive it.
- **The game is not the platform.** A game system supplies its own rules and
  content. The platform must not assume fantasy, or any one genre, or any one system.

## Capabilities and Constraints

**Built and working (inherited from OpenFrame, verified at its commit
`8eb19c5` and kept):** an infinite canvas with pan, zoom, culling and
object-level hit testing; typed objects with selection, resize, rotation,
z-order, clipboard, snapping and alignment; frames, groups, text, shapes,
connectors, tables, code and images; rich text; undo that is local to the person;
real-time shared documents, one room per document, with presence; accounts,
membership and image storage; versioned, migratable documents; version history.

**Not built yet:** everything that makes it a tabletop. There is no Game, no Scene,
no Token, no grid, no map, no roles, no dice, no Actor and no game system today.
The shell is being redesigned (Phase 0) before any of that is built.

**Settled constraints, load-bearing:**

- Every persistent change goes through one command layer, so undo,
  collaborators' edits and any future caller share one path.
- Object behaviour lives in a registry, not in branches on a type name.
- A document that cannot be fully read is never written back.
- Gestures write nothing until they finish; one command on commit.
- The platform layer is independent of any game system. The bundled first-party
  system is based on the System Reference Document 5.2.1 (CC-BY-4.0); rules code
  and rules content are separate, and every content file records its provenance.
  Game-system terms never appear in generic Scene, collaboration or platform code.
- Hidden information is an authorization boundary, not a styling one. See the
  decision records [T004](docs/adr/T004-player-secrecy-and-state-filtering.md) and
  [T011](docs/adr/T011-game-and-scene-collaboration-topology.md).
- A Game is not a renamed Board. A Scene reuses the board document; a Game sits
  above Scenes.
- AI is not part of the product or its roadmap. The structure stays friendly to
  future automation; none is built before a product need exists.

**Explicitly undecided, not to be invented:** the final product name and brand; any
pricing or commercial model; a marketplace; the second game system; an extension
ecosystem; the audio provider; export formats; native mobile applications;
video or voice; whether comments and mentions are part of early campaign use;
whether game-level state uses one document or several (direction is recorded in
T001 and T011, and finalised in Phase 1); the exact public trademark wording
beyond "compatible with fifth edition"; whether a hosted Tabletop carries a source
link (an owner decision, see Brand Commitments).

## Brand Commitments

- The working name is **OpenFrame Tabletop**. It is a working title, not a brand.
- Licensed **AGPL-3.0-only**, copyright held by the owner. The inheritance from
  OpenFrame (commit `8eb19c5`) is recorded in `docs/plans/00-source-audit.md`.
  Whether a hosted Tabletop offers its source in the interface is undecided; a
  fork that hosts a modified version must make its own offer of source.
- Where SRD 5.2.1 content ships, the attribution statement from the SRD itself
  ships with it (ADR T012). Nothing from a book or site that is not in the SRD is
  assumed redistributable.
- **No Tabletop identity exists yet:** no logo, wordmark, palette or type. OpenFrame's
  neon artwork and its two visual worlds belong to OpenFrame, are kept as history,
  and are not the Tabletop identity. The replacement is decided in the Impeccable
  design process, not by editing tokens.

## Evidence on Hand

Real, and reproducible from this repository (`pnpm bench:cull`, `pnpm test:bench`,
`pnpm bench:transaction`), measured at the inherited baseline:

- DOM node count stays flat (35 to 54 sticky-only, 18 to 66 mixed) from 100 to
  10,000 objects.
- A cull pass on a 12,250-object mixed board costs about 5 ms on the baseline
  machine; a 200-command transaction on it, about 31 ms, with a map copied 3 times.
- 3,768 unit and integration tests passed at the baseline; the browser suite passed
  911 of 912, the exception being a layout assertion that depends on the machine's
  fonts.

**Absent, and not to be fabricated:** there are no users, no tables that have played
a session, no testimonials, no case studies, no adoption or revenue figures, no
press, and no SRD content imported. There is no stress Scene yet (the brief's
8192 by 8192 map with 250 Tokens and 1,500 walls is a target, not a measurement).

## Product Principles

1. **The tabletop is the product when playing; the campaign is the product when
   preparing.** Two postures, designed as two. Persistent chrome must earn its
   persistence.
2. **Hidden means hidden.** What a player must not know is never sent to their
   device and never merely not drawn.
3. **Authored content is never reinterpreted.** Changing the application's theme
   must not recolour a map, a token or a grid; the Scene's grid is game content,
   not layout rhythm.
4. **The platform is not the game.** Build the system boundary from a real system,
   keep the platform neutral, and prove generality with a second one later.
5. **Playable before general.** Build what a real table needs next; do not build a
   framework ahead of a game, or a feature ahead of a table to use it.

## Accessibility & Inclusion

**WCAG 2.2 AA is a requirement, not an aspiration.** Contrast, visible focus,
keyboard reachability, target size and accessible naming are tested rather than
asserted, and the tests are kept when the visual design changes.

Tabletop-specific commitments: every Token and Actor has an accessible name; status
is never carried by colour alone; game state is reachable without the map where
practical (initiative, chat, rolls); touch targets and reduced motion are honoured;
contrast holds in every application theme and against arbitrary map content.
