# ADR T009 · Play and Prep are two postures of one application

**Status:** Accepted · 2026-10-13 · amended by the Impeccable `shape` step (WP 0.12); proposed
2026-10-12

## Context

The brief separates two interface postures. In **Play** the tabletop is the product: the Scene
takes the overwhelming majority of the viewport and player chrome is minimal. In **Prep** the
campaign is the product: persistent navigation is legitimate where it reduces context switching.
OpenFrame's absolute rule, that nothing may permanently claim a band of the screen, is retired and
replaced by "persistent chrome must earn persistence".

Today the application has two query-string routes, a front door and a board editor
(`app/route.ts`), a status bar, a rail of registry-declared tools, floating inspectors, and full-page
navigation between boards.

## Proposed direction (to be tested by `shape`)

1. One runtime, two postures, selected by route and role, not two applications.
2. **Play**: Scene dominant; contextual selection, ruler, ping, templates, initiative and chat as
   transient or docked-and-collapsible surfaces; minimal Game and Scene navigation.
3. **Prep**: persistent navigation across Scenes, Actors, Journals, Assets, Encounters, Compendium
   and settings; Scene and lighting editing; a dock / panel system.
4. **Tools and actions follow capability and role**, read from the registry like every other
   interface element (CLAUDE.md rules 21 and 27); hiding a control is never authorization.
5. **GM-only information has one visual grammar**, applied wherever it appears.
6. Application chrome stays out of Scene-content tokens ([T010](T010-application-theme-and-scene-content.md)).

## What the shape step settled

The owner's answers (2026-10-13) confirmed the direction above and added to it:

1. **A third posture, the display.** Groups who are all online are often also in one room with a
   "players only" view cast to a TV or projector. Display is a route state of the Player tabletop,
   not a fifth surface: chrome-free, the Scene plus the turn order, large type for about three
   metres, no tools, no GM information. It is a spectator audience in T004's terms.
2. **Players have four tools:** move and select their own tokens, a ruler, an area of effect, and
   status marks. Nothing else is shown to them.
3. **The GM's density is the central problem**, and is managed by disclosure keyed to selection,
   role and posture: one persistent dock rail with one dock open at a time (Layers, Initiative,
   Tokens, Notes), a contextual bar anchored to the selection, a stated "who can see this" on
   every object by shape and word, and a Preview as player control. GM-only content is a partition
   of what is sent, never a hidden flag.
4. **Chat does not lead.** A chat application with a map attached is a stated failure.
5. **Prep navigation is registry-driven:** a section appears when a phase registers it, so the shell
   never shows an inert entry as if it were a feature.
6. **Entry:** from the Game Library a GM has Open table and Prep as two entries into the same
   frame; players have Open table only.
7. **Visual world:** the category standard, at full craft (PRODUCT.md, Brand Commitments). The
   decision is recorded in the four surface briefs under `apps/web/.impeccable/surfaces/`.
8. **Shell location:** `apps/web/src/ui/shell/`, presentation over Board data with Phase 1 marker
   comments. No `Game`, `Layer`, `Token` or `Initiative` domain model is introduced in Phase 0.

## Consequences

- WP 0.13 builds against this decision and the four surface briefs.
- The shell built in WP 0.13 sits over Board-backed data and relabels for presentation only.
