# ADR T010 · Application theme and Scene content are separate token spaces

**Status:** Accepted · 2026-10-12 · enforced by `apps/web/src/app/theme-boundary.test.ts` (WP 0.13)

## Context

OpenFrame's two themes (the Notebook and After Hours) are two _visual worlds_: switching theme
recolours the page, the chrome and the user's own content together. For a whiteboard that is
coherent. For a VTT it is wrong in a specific way: a campaign's map, tokens, grid, fog, lighting and
drawings are authored content, and changing the application's appearance must never reinterpret
them. A dark interface around a daylight map must still show a daylight map.

The stylesheet today has one token namespace (`--of-*`, about 2,200 uses) and theme blocks that
override colour tokens used by objects as well as by chrome.

## Decision

1. **Two token spaces.**
   - _Application tokens_ style navigation, panels, toolbars, menus, inspectors, dialogs, context
     menus and notifications. UI themes may override them.
   - _Scene-content tokens_ style maps, tiles, tokens, grid, fog, lighting, drawings, templates,
     auras and effects. They derive from Game and Scene state (authored colours, a Scene's grid
     colour and opacity), and **no UI theme may override them**.
2. **A test enforces it.** It reads the stylesheet as the contrast tests do, and fails if any theme
   block (`[data-theme]` or equivalent) assigns a Scene-content token. It is shown failing once
   (CLAUDE.md rule 23).
3. **The Scene's grid is content** ([T005](T005-grid-and-measurement.md)); its colour and opacity
   are Scene state.
4. **Chrome that sits over Scene content** (selection handles, rulers, pings, GM overlays) is
   application space but must meet contrast against _arbitrary_ content, so it carries its own
   backing rather than relying on the page.
5. **The application may ship more than one theme.** Whether dark-first is the default is a design
   decision for the Impeccable process (WP 0.12), not assumed here.

## Alternatives considered

- **Keep one namespace and trust discipline.** Rejected: the failure is silent and arrives as a
  support request about a map whose colours changed.
- **Render Scene content in an isolated subtree with its own colour scheme.** Considered; the token
  split achieves the same without a second styling root, and can be tightened to isolation later.

## Consequences

- The visual-world swap (WP 0.13) builds the two spaces from the start rather than retrofitting.
- Generic WCAG assertions (WP 0.11) are written against application tokens and against the
  chrome-over-content backing.
- `--of-*` remains the application prefix; the Scene-content prefix is `--sc-*`, chosen with the design
  contract (WP 0.13). The apparatus drawn over content (selection, handles, guides) is scene-side too, because
  chrome over arbitrary content must carry its own colour and halo (decision 4); the application accent failed
  3:1 over dark ink on pale paper.
- **Open owner decision:** the scene's empty ground is a fixed light stock. In a dim room, and on a cast
  display, that is glare. Options: a dimmer mid-tone default stock re-checked against the eleven papers; a
  per-table dark stock chosen by the GM; at minimum a non-white ground on the display route. It is not
  recoloured per theme, which would break decision 4.
