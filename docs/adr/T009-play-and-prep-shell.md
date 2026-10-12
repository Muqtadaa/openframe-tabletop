# ADR T009 · Play and Prep are two postures of one application

**Status:** Proposed · 2026-10-12 · **accepted or amended after the Impeccable `shape` step
(WP 0.12)**, not before

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

## Why this is not yet decided

The shape step exists to resolve tasks, information hierarchy, role differences, interaction states,
persistent against contextual panels, touch and responsive needs, and permission states for the
Game Library, Player tabletop, GM tabletop and Campaign Prep shell. Settling the shell's structure
before that would be the guessing the process is there to prevent.

## Consequences

- Updated to **Accepted** (or amended) when WP 0.12 completes; WP 0.13 does not start before then.
- The shell built in WP 0.13 sits over Board-backed data and relabels for presentation only.
