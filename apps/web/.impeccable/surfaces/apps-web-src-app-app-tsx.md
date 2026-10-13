---
version: 1
slug: "apps-web-src-app-app-tsx"
primary_target: "apps/web/src/app/App.tsx"
related_targets: []
---

# Player tabletop (including the display mode)

Mode: Operate. Scope: shape only until built in WP 0.13.

JOB AND AUDIENCE: A player at a recurring evening session, dim room, laptop or tablet, with voice in
another app. They need to see the Scene, move what they own, measure, show an area, mark a status,
and know whose turn it is.

OUTCOME AND PROOF: The Scene takes nearly the whole viewport. Their four tools are findable without
reading: move/select, ruler, area of effect, status mark. Nothing here is invented beyond what the
owner named; dice, sheets and initiative arrive in later phases and this shell only holds their
place structurally.

SELECTED DIRECTION: First viewport in the contract below.

SCOPE AND BOUNDARIES: Presentation over Board data. Role comes from the existing viewer/editor/owner
roles. Untouched: gestures, undo, snapping, the registry-driven rail. Anti-goals: chat leading,
a permanent right panel, GM information of any kind.

STATES AND RANGES: connected, reconnecting, offline with unsent changes, read-only (spectator),
a Scene still loading. 3 to 6 people present; up to ~250 tokens later.

INTERACTION AND LAYOUT: Left rail of four tools (labels on hover, 40px targets under touch). Top-left
a quiet scene name with a connection state. Right edge a collapsed dock rail (Character, Rolls,
Notes) that opens one dock at a time and closes on Escape; closed by default. Bottom centre, only
when an initiative is running, a turn strip. Touch: bottom sheet instead of a dock.

DISPLAY MODE: A route state for the shared screen at a physical table. Chrome-free: no rail, no dock;
Scene plus turn order only (owner choice), large type readable at about three metres, no cursor
tools, no GM information, no controls. Contrast checked at distance sizes.

OPEN DECISIONS: What the Rolls dock shows before dice exist (nothing: the dock is absent until it
has content).

## As built (WP 0.13)

The board frame is the existing one, re-themed: rail left, name and connection top-left, zoom bottom-right. Added: a dock rail on the right edge (`ui/shell/DockRail.tsx`), closed by default, whose buttons come from a registry (`ui/shell/docks.ts`) filtered by posture. The only dock that exists is the Outline. The display mode is built (`&display=1`, `app/DisplayFrame.tsx`): the Scene, view-only, nothing else; the turn order joins it when initiative exists. NOT built: the four-tool player rail (ruler, area of effect and status marks do not exist until Phase 2, so the rail is still the full canvas toolset), Character, Rolls and Notes docks, the turn strip.

## Direction contract

THESIS: The tabletop is the product when playing and the campaign is the product when
preparing, so the interface is a quiet, dark workspace that frames the table and
gets out of the way. It refuses the three arrangements the owner ruled out (a
fantasy costume, enterprise admin software, a chat app with a map attached) and,
inside the category standard, the habit of a permanent sidebar of tabs while a
session runs.

OWN-WORLD: The category standard, played straight and executed at full craft. Near-black
cool-neutral workspace in five steps, flat panels with 1px hairlines, elevation
only for floating docks and menus, one calm blue accent (restrained strategy, no
glow, no gradient), a system UI stack with tabular numerals, a narrow icon rail
with labels on hover, a 4px rhythm. A light theme with the same structure for
daytime Prep. Seat hues exist for people and are never the only signal; status is
a shape and a word as well as a colour. Scene content (map art, grid, tokens) is
outside the theme and never recoloured by it (T010). Craft bar: Owlbear Rodeo for
restraint, Roll20 for familiarity, Figma or Linear for the finish of dense work.

STORY: The player understands where their piece is and whose turn it is, believes the table
is the same table everyone sees, and acts by moving, measuring or marking without opening anything.

FIRST VIEWPORT: The Scene edge to edge. A 48px rail on the left with four tools, vertically
centred. Top left a 32px quiet chip: scene name and a connection dot with a word. Right edge a
slim 40px dock rail, closed. Bottom centre, only when a turn is running, a 40px strip: "Turn:
Name" with the next two names. The display mode removes the rail and dock and sets the turn
order at 48px at the top, the Scene below it.

FORM: The category standard (the standing exit), not on the ordered list and not the assigned direction;
seed key 518dfea8, degraded roll (the roll service was unreachable). Chosen by the
owner on 2026-10-13 in preference to the assigned cartographic direction and the
game-table pick.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
