---
version: 1
slug: "apps-web-src-ui-shell-prepshell-tsx"
primary_target: "apps/web/src/ui/shell/PrepShell.tsx"
related_targets: ["apps/web/src/ui/WorkspaceBar.tsx","apps/web/src/ui/BoardOverview.tsx"]
---

# Campaign Prep shell

Mode: Operate. Scope: shape only until built in WP 0.13.

JOB AND AUDIENCE: The GM, by day on a laptop, bright room, between sessions: arranging Scenes,
and later cast, notes and encounters, without anyone watching.

OUTCOME AND PROOF: Persistent navigation is legitimate here because the job is moving between
things. Success is that a GM can reach any Scene in one step and open it into the same frame they run
the table in. Only what exists is shown: Scenes are real today; Actors, Notes and Encounters are
absent until a phase builds them, because an inert menu entry is an invented claim.

SELECTED DIRECTION: First viewport in the contract below.

SCOPE AND BOUNDARIES: Presentation over Board data with Phase 1 marker comments. Untouched: board
persistence, version history, sharing. Anti-goals: an enterprise admin console (tables, filters,
bulk actions), a settings maze.

STATES AND RANGES: 0 Scenes, 1 to ~30 typical, 200 maximum; a Scene that failed to load; read-only;
offline; light and dark themes (daytime default follows the system).

INTERACTION AND LAYOUT: A persistent left navigation that is registry-driven (a section appears when
a phase registers it). The main area shows the Game's Scenes as a grid of live thumbnails with the
name and last-edited. Opening a Scene fills the window with the tabletop frame in prep posture
(GM-only layers visible), with a way back to the navigation that costs one key.

OPEN DECISIONS: Section order and names for sections that do not yet exist (decided when built).

## As built (WP 0.13)

`?prep`, over Board data (`ui/shell/PrepShell.tsx`): a 240px navigation whose sections come from a registry (`prep-sections.ts`, Scenes only), a grid of cards for the boards you run (name and last edited, no thumbnail yet), Create scene, and Back to library. On a phone the navigation becomes a strip. Theme follows the saved choice (dark default), not the system.

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

STORY: The GM understands the shape of their campaign at a glance, believes nothing is lost,
and acts by opening the Scene they want to work on.

FIRST VIEWPORT: A 240px left navigation (campaign name at top; Scenes, the only section that
exists, below it; Back to library at the foot) and a main area with the campaign title, a Create
Scene button at the right, and a grid of Scene thumbnails 240px wide with the name and last-edited
beneath. The theme follows the system; both are designed.

FORM: The category standard (the standing exit), not on the ordered list and not the assigned direction;
seed key 518dfea8, degraded roll (the roll service was unreachable). Chosen by the
owner on 2026-10-13 in preference to the assigned cartographic direction and the
game-table pick.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
