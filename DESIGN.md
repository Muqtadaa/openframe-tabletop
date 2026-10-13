---
name: OpenFrame Tabletop
description: A quiet dark workspace that frames a light, authored table; the category standard played straight.
colors:
  workspace: '#0f1216'
  page: '#161a1f'
  panel: '#1d2228'
  panel-border: '#2c333c'
  control-border: '#7d8896'
  ink: '#e8ebef'
  ink-muted: '#a4adba'
  accent: '#6ba3ff'
  accent-soft: '#1a2b49'
  hover: '#272d35'
  danger: '#ff7b6c'
  danger-wash: '#3a1d20'
  guide: '#f26fcf'
  light-workspace: '#e8ebef'
  light-page: '#f4f6f8'
  light-panel: '#ffffff'
  light-panel-border: '#d2d8df'
  light-control-border: '#667283'
  light-ink: '#14181d'
  light-ink-muted: '#4a5563'
  light-accent: '#1c4fb5'
  light-accent-soft: '#e3ebfa'
  light-danger: '#b3261b'
  scene-ground: '#f2f4f7'
  scene-ground-deep: '#e6eaf0'
  scene-rule: '#e1e7ee'
  scene-rule-decade: '#c7d3e0'
  scene-panel: '#ffffff'
  scene-ink: '#16202b'
  scene-ink-muted: '#4e6070'
  scene-select: '#1450b5'
  scene-guide: '#b0197a'
  scene-halo: '#f7f9fb'
  ink-yellow: '#7a5c00'
  paper-yellow: '#ffe9a3'
  ink-green: '#146045'
  paper-green: '#bff0d4'
  ink-blue: '#17529e'
  paper-blue: '#cfe2ff'
  ink-red: '#8a4038'
  paper-red: '#ffd5d0'
  ink-violet: '#5b3ba8'
  paper-violet: '#e3daff'
  ink-orange: '#8c4715'
  paper-orange: '#ffddb8'
  ink-gray: '#3f5163'
  paper-gray: '#dfe5ec'
  ink-pink: '#8f2a67'
  paper-pink: '#ffd4ef'
  ink-brown: '#6a4a2a'
  paper-brown: '#e8dcc6'
  ink-black: '#16202b'
  paper-white: '#ffffff'
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.1875rem'
    fontWeight: 600
    lineHeight: 1.35
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
  control:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1
  small:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 400
    fontFeature: 'tabular-nums'
  record:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: '0.75rem'
    fontWeight: 400
    letterSpacing: '0.02em'
rounded:
  hair: '1px'
  slip: '2px'
  apparatus: '4px'
  control: '6px'
  surface: '10px'
  capsule: '999px'
spacing:
  space-2: '2px'
  space-4: '4px'
  space-6: '6px'
  space-8: '8px'
  space-12: '12px'
  space-16: '16px'
  step: '10px'
  gutter: '20px'
  hit-min: '24px'
  hit-sm: '30px'
  hit: '40px'
  hit-lg: '50px'
components:
  button:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '30px'
  button-hover:
    backgroundColor: '{colors.hover}'
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.panel}'
    rounded: '{rounded.control}'
  button-pressed:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.accent}'
  library-open-label:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.panel}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '6px 12px'
  library-sheet:
    backgroundColor: '{colors.page}'
    rounded: '{rounded.apparatus}'
    padding: '20px'
  tool-rail:
    backgroundColor: '{colors.page}'
    rounded: '{rounded.apparatus}'
    padding: '6px'
  rail-tool:
    textColor: '{colors.ink-muted}'
    rounded: '{rounded.control}'
    size: '50px'
  dock-rail:
    backgroundColor: '{colors.page}'
    rounded: '{rounded.apparatus}'
    padding: '6px'
  prep-nav:
    backgroundColor: '{colors.page}'
    width: '240px'
    padding: '20px'
  prep-nav-item:
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    height: '40px'
  prep-nav-item-current:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.accent}'
  prep-card:
    backgroundColor: '{colors.page}'
    textColor: '{colors.ink}'
    rounded: '{rounded.surface}'
    padding: '16px'
  display-status:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.surface}'
    padding: '12px 16px'
  slip-sticky:
    backgroundColor: '{colors.paper-yellow}'
    textColor: '{colors.ink-yellow}'
    rounded: '{rounded.slip}'
---

# Design System: OpenFrame Tabletop

## Overview

**Creative North Star: "The Quiet Workspace Around a Lit Table"**

This is the category standard played straight at full craft, and the record says so plainly: the owner chose it on 2026-10-13 as a standing exit, in preference to two directions the replacement-world process offered (a cartographic one and a game-table one). The seed key was 518dfea8 and the roll service was unreachable, so the round ran degraded with no challengers. It is therefore a deliberate, conventional answer, not a discovered one. The craft bar named in the contract is Owlbear Rodeo for restraint, Roll20 for familiarity, Figma or Linear for the finish of dense work.

The application is a near-black cool-neutral workspace: flat panels cut from three steps of one neutral, 1px hairlines, one calm blue accent, a system sans for everything you read and a system mono only for records (counts, readouts, shortcuts). Floating chrome carries a soft contact shadow; nothing glows, nothing is a gradient. The scene is a separate namespace and a separate material: a fixed light ground with a quadrille grid, with authored content (eleven ink-on-paper pairs) laid on it like stock. Application theme never reaches it.

There is no Tabletop logo, wordmark or brand identity. The product name in the library header is the working title set in the headline style; the favicon is a placeholder. Nothing in this system should be read as a brand to extend. Only what is built is recorded: a library, a prep shell, the board frame (tool rail, name bar, zoom cluster, record panel), a dock rail whose only dock is the Outline, and a chrome-free display route. There is no player toolset, layers, initiative, turn strip or GM docks beyond the registry, and the display has no turn order yet.

**Key Characteristics:**

- Two namespaces: `--of-*` application tokens (dark default, light theme block) and `--sc-*` scene tokens (defined once, never themed).
- Depth by lightness step first, a hairline second, a shadow only for what floats.
- One accent (calm blue) meaning "yours / what you are acting on"; danger red is reserved for destructive meaning.
- Everything measures on a 10px quadrille (`--of-step`), the same as the scene's 10-unit grid.
- Targets are 40px (30px under a fine pointer for secondary controls); functional text never goes below 12px.

## Colors

A cool, blue-leaning near-black workspace with one blue accent, set around a deliberately light, separately defined scene.

### Primary

- **Calm Table Blue** (`accent`, light: `light-accent`): the single accent. Primary action ("Open table", Sign in), current navigation item, pressed and selected state, focus, caret. Always paired with a shape or word where it carries status.

### Secondary

- **Guide Magenta** (`guide`; scene `scene-guide`): alignment and measurement guides. Distinct from the accent so the two never confuse.
- **Danger Coral** (`danger`, light `light-danger`): destructive and corrective meaning only; never decoration.

### Neutral

- **Workspace** (`workspace`): the ground behind everything (library page, prep main area).
- **Page Stock** (`page`): the surface chrome is cut from: rails, docks, library sheet, prep navigation and cards.
- **Panel** (`panel`): raised panels, menus, buttons at rest.
- **Hairline** (`panel-border`): decorative dividers and panel edges; deliberately below 3:1.
- **Control Edge** (`control-border`): the boundary of anything you must see to operate; held at 3:1 by test.
- **Ink / Muted Ink** (`ink`, `ink-muted`): text. Muted is for second lines and hints and still passes 4.5:1.
- **Hover Bed** (`hover`) and **Accent Wash** (`accent-soft`): the bed under a hovered control and under a selected one.
- **Presence seats** (`--of-p-1` to `--of-p-6`, themed): six person hues, separate from content hues, never the only signal. Tested for 3:1 on the page, 60 sRGB units apart, and clear of accent, guide and danger.

### The Scene (never themed)

- **Daylight Ground** (`scene-ground`, `scene-ground-deep`) with a **quadrille** (`scene-rule`, `scene-rule-decade`, below 3:1 on purpose: ground, not control).
- **Scene paper and ink** (`scene-panel`, `scene-ink`, `scene-ink-muted`): for content that carries its own surface (tables, code, images).
- **Eleven authored colours**, each an ink over a pale paper: yellow, green, blue, red, violet, orange, gray, pink, brown, plus black and white (whose ink and paper are the same value; `inkFor` picks the readable one). Black is a blue-black, never `#000000`. Lines in black or white are drawn in `--sc-line-black` and `--sc-line-white` (`#3f5163`) so a white line does not vanish on the ground.
- **Apparatus over content** (`scene-select`, `scene-guide`, `scene-halo`): selection, handles and guides carry their own colour and a halo so they read over dark ink and pale paper alike.

### Named Rules

**The Two Namespaces Rule.** `--of-*` is the application and may be themed. `--sc-*` is the scene and is defined once, in `tokens.css`, by nothing else. A theme block that assigns a `--sc-*` token fails `app/theme-boundary.test.ts`. Documents store token names, so a saved board is the same board under either theme.

**The One Voice Rule.** The blue accent marks the one thing you are acting on or the one primary action on a surface. Two filled accent buttons on one surface means neither is primary.

**The Tested Contrast Rule.** Pairs are not asserted here, they are tested: `app/a11y-floor.test.ts` checks application pairs and scene pairs in every theme (4.5:1 for text, 3:1 for a control's boundary, a handle or a focus ring, and a ceiling for the page rule and grid). Change a colour and that test is the authority, not this file.

## Typography

**Display Font:** none. There is no display face; the largest interface step is the headline.
**Body Font:** the system sans stack (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`).
**Label/Mono Font:** the system mono stack, for records only.

**Character:** the platform's own voice, unremarkable on purpose. Tabular numerals wherever a number is read down a column (library times, zoom, readouts). A serif stack (`--of-serif`) exists for the board's own text face, not for the interface.

### Hierarchy

- **Headline** (600, 1.1875rem, 1.35): the product name on the library header and the prep page title.
- **Title** (600, 1.0625rem): library row names and section headings, prep navigation name.
- **Body / ui** (400, 0.9375rem): menus, notices, scene names in prep cards, the board name.
- **Control** (500, 0.875rem): buttons, fields, navigation items.
- **Small** (400, 0.8125rem, tabular): second lines, "last played" and "last edited" readouts, hints.
- **Record** (400, 0.75rem mono, 0.02em tracking): counts, shortcut keys, zoom wheel mode and presets.
- Content inside an object scales in `em` from the object's own size and is not on this ramp; a text object's largest size is 22px in world units.

### Named Rules

**The Twelve Pixel Floor Rule.** No absolute `font-size` in the stylesheet goes below 12px, with no exemptions; `stylesheet-discipline.test.ts` measures it.

**The Mono Means Record Rule.** Mono is for measurement and records. It is not a costume for "technical", and library labels, times and headings read in the sans.

**The Distance Rule.** The display route sets its status words at 1.6em and never conveys state by colour alone.

## Layout

The interface measures itself on the same 10px step as the scene's grid: `--of-step` between things on a line, `--of-gutter` (20px) from the viewport edge, with a small inner scale of even steps only (2, 4, 6, 8, 12, 16). Odd values are drift, not decisions.

The board frame is the table with chrome at its edges: tool rail left (tools 50px, stepping to 40 then 30 as the window shortens), name bar top-left, zoom cluster bottom-right, dock rail right edge closed by default and opening one dock at a time. The record panel and the Outline dock are 320px-class surfaces that sit beside the selection or the dock rail and stop above the zoom cluster. On narrow windows (under 520px for the outline, under 820/480 for the record panel) they become bottom sheets limited to 45dvh, so the scene keeps more than half the screen.

The library is one centred column (max 720px) on the workspace ground: a header with the product name, a Prep entry and theme toggle, then one sheet of rows. A row is a grid of title, a tag and time line, and one filled "Open table" label at the end; on phones (560px and under) the row stacks and the name may take two lines. The prep shell is a 240px navigation beside a main area of cards (auto-fill, 240px minimum, 20px gaps); under 720px the navigation becomes a strip along the top.

Targets: 40px operating size, 50px for rows and primary tools, 30px for secondary controls under a fine pointer (raised to 40px under a coarse pointer), 24px as the absolute WCAG 2.5.8 floor.

### Named Rules

**The Apparatus Is Outside The World Rule.** Handles and selection draw on a screen-space layer outside the world transform, so every length there is what it says (inherited engineering rule 24).

## Elevation & Depth

Hybrid, mostly tonal. Surfaces are flat at rest: workspace, page stock and panel are three steps of lightness, edged with a 1px hairline. Only chrome that floats over the table (rails, zoom cluster, menus, the dock panel, the record panel) takes a shadow, and it is a hairline plus a soft contact shadow, never a glow. Authored slips on the scene take a separate, tighter shadow because they are paper on a ground, not chrome over a table.

### Shadow Vocabulary

- **Chrome** (`box-shadow: 0 1px 0 rgb(0 0 0 / 30%), 0 4px 14px rgb(0 0 0 / 45%)`; light: `0 1px 0 rgb(20 24 29 / 5%), 0 2px 10px rgb(20 24 29 / 10%)`): rails, docks, zoom, menus.
- **Pressed bed** (`0 1px 2px rgb(0 0 0 / 50%)`): a segmented control's selected index.
- **Slip** (`0 1px 1px rgb(22 32 43 / 18%), 0 3px 7px rgb(22 32 43 / 14%)`): a note laid on the ground.
- **Scrim** (`rgb(6 8 11 / 62%)`): the dim over a board that can no longer be used.

### Named Rules

**The Float Only Rule.** A shadow means "this floats over the table". Page-level sheets, library rows and prep cards use a hairline and a tonal step, not a shadow.

**The Named Layers Rule.** Stacking uses the `--of-z-*` ladder (lifted, preview, guide, grip, tip, menu, search, chrome 10, panel 40, apparatus 60, reached 70, gate 100). No bare integers.

## Shapes

Corners get smaller the closer a form is to the page: slips and swatches 2px (`slip`), margin chrome, rails and chips 4px (`apparatus`), controls 6px (`control`), floating surfaces 10px (`surface`), grab points round or capsule. Round means "grab me" and is spent on grab points, presence dots and faces. A nested bed takes the next step down so curves stay concentric. Borders are 1px hairlines; a boundary that must be perceived uses the control edge colour.

## Components

### Buttons

- **Shape:** 6px corners (`rounded.control`), 30px minimum height (40px under touch), 12px horizontal padding.
- **Default:** panel fill, 1px control-edge border, ink text in the control step.
- **Primary:** accent fill with panel-coloured text; hover moves the accent 16% toward ink. Disabled primary becomes an outlined wash, not faded blue.
- **Pressed / chosen:** accent wash with accent text and a 2px accent foot bar. Ghost buttons have no border until hovered.
- **Large:** 40px high, 20px side padding, for the one act a sheet or gate exists for.

### Library rows

One sheet of rows divided by hairlines on page stock. The whole entry is the link; its one primary action is a filled "Open table" label at the end, not a second target. Pin and row actions sit beside the anchor; row actions appear on hover or focus-within and are always visible without hover. Prep is a single header entry shown only to someone who runs a table. Names and states are real data only: the name, a sharing or "this browser" tag, and when it was touched. Seat dots are not built (the list carries no presence), and rows still say "boards".

### Tool rail and dock rail

Narrow columns on page stock with a hairline and chrome shadow. Tools are 50px muted-ink icons on no ground; a hovered or focused tool gains a hover bed and its name as an inverted tooltip (ink fill, page-coloured text) that appears on hover and keyboard focus. The dock rail sits on the right edge, centred between the navigation and the foot; its tips open leftward toward the table. Buttons come from a registry filtered by posture and an entry for something unbuilt is not drawn. Today the only dock is the Outline: a 320px panel the height of the table band with a step of air beside the rail, a tree of objects walked by keyboard, closing on Escape.

### Record panel and zoom cluster

The record panel floats beside the selection with the surface radius, a head naming the object type in the interface sans, labelled rows, and delete in its top corner. The zoom cluster is a bottom-right bar with tabular numerals, a slider, a typed percentage and presets in mono.

### Prep shell

A 240px navigation on page stock whose sections come from a registry (Scenes only today), a current item on the accent wash, "Back to library" as an underlined muted link at the foot with the theme toggle. The main area holds a page title, Create scene, and cards on page stock (10px corners, 16px padding, name over last edited); a hovered card takes the hover bed and the control edge. Cards carry no thumbnail yet.

### Display status

On the display route, a status line in words at 1.6em on the panel with a control-edge border, top centre. The route shows the scene on the daylight ground, view-only, with no rail, bar or dock.

### Scene stock

A note is a pale paper with a deep ink of the same hue, a 2px corner and the slip shadow. A frame uncoloured is laid on white paper. Table inner lines use `--sc-edge-inner`, held at 3:1.

### Named Rules

**The Registry Draws The Chrome Rule.** Rails, docks and prep sections come from registries filtered by role and posture; a surface for something that does not exist is absent, not inert.

**The Quiet At Rest Rule.** Chrome that can be hidden while the table is in use is hidden or closed by default (docks closed, tips on hover or focus). It must still be reachable by keyboard, and chrome that appears under the pointer must survive its own press.

## Do's and Don'ts

### Do:

- **Do** take every colour, size, radius, space and layer from a `--of-*` or `--sc-*` token; `stylesheet-discipline.test.ts` holds the discipline.
- **Do** keep new scene-facing colours in the `--sc-*` namespace, defined once in `tokens.css`, and never in a theme block.
- **Do** make a boundary that has to be perceived to operate at least 3:1 (`control-border`), and text at least 4.5:1.
- **Do** state status in a word or shape as well as colour; presence seats are never the only signal.
- **Do** add a new surface as its own stylesheet part, imported above `motion.css` in `styles/index.css`.
- **Do** reach for the quadrille: heights and offsets are multiples of 10px, with the 2/4/6/8/12/16 inner scale.
- **Do** keep motion short and functional (140ms quick, 240ms settle, `cubic-bezier(0.16, 1, 0.3, 1)`) and honour `prefers-reduced-motion`.

### Don't:

- **Don't** recolour or theme the scene: ground, grid, authored colours and apparatus ignore the application theme.
- **Don't** build a fantasy costume, enterprise admin software (dense grey panels, form-first screens) or a chat application with a map attached (owner, 2026-10-13).
- **Don't** add glows, gradients (beyond a scroll fade that dissolves into the rail's own stock) or a second accent.
- **Don't** invent a Tabletop logo, wordmark, mascot or brand colour; none exists.
- **Don't** draw chrome for features that are not built.
- **Don't** use a bare z-index integer, an odd spacing value, or a font size under 12px.

## Open Decisions

- **Light scene ground inside dark chrome.** The empty ground is a fixed light stock (ADR T010) around a dark application. Glare in a dim room and on the cast display is an open owner question; it is not settled. Changing the ground means re-checking every authored pair, which were chosen to read on it.
- **Brand and name.** The working title is not a brand; the favicon is a placeholder.
- **Not yet built, so not designed here:** player toolset, layers, initiative and turn strip, contextual selection bar, scene tabs, preview as player, prep thumbnails, a turn order on the display.
