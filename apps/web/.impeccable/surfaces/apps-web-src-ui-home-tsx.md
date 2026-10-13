---
version: 1
slug: "apps-web-src-ui-home-tsx"
primary_target: "apps/web/src/ui/Home.tsx"
related_targets: []
---

# Game Library (front door)

Mode: Operate. Scope: shape only until built in WP 0.13, over Board-backed data.

JOB AND AUDIENCE: A GM or a player returns to a campaign between sessions, often from a phone link
or a bookmark, and needs to be at the table, or at the prep, in one step.

OUTCOME AND PROOF: The primary action is Resume on the Game they came for. Success is that nobody
looks for it. Real content only: the Game's name, the person's role in it, when it was last played,
who is in it. No users, covers, ratings or invented activity.

SCOPE AND BOUNDARIES: Presentation over Board data with a marker comment pointing at Phase 1;
no `Game` alias in the domain. Untouched: accounts, sharing and board persistence behaviour.
Anti-goals: a dashboard of cards and charts, a feed, a marketing page.

STATES AND RANGES: 0 Games (create, or join by invite), 1 to ~12 typical, 50 maximum; loading,
unreachable server (local Games still listed), a Game the person can no longer open, a locked
Game, an invite waiting.

INTERACTION AND LAYOUT: A single list, most recently played first, each row: name, role, last
played, people present now. One primary action per row, Open table; a GM row also offers Prep.
Create is a persistent but quiet action in the header. No sidebar. Keyboard reachable, rows are
real links.

OPEN DECISIONS: Whether Game and Scene vocabulary appears before Phase 1 (it appears as copy only).

## As built (WP 0.13)

Over Board data, in `ui/Home.tsx` and `ui/BoardRow.tsx`: flat workspace ground, the list as one sheet of rows, and a filled "Open table" label on each row's link. Prep is ONE entry in the header and not one per row, because until a Game exists it is across the tables you run; it is shown only to somebody who runs one. Not built, because nothing backs them: seat dots (the list carries no presence), a Game vocabulary (the rows still say boards).

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

STORY: The person understands in a glance which campaign is theirs and when it last ran,
believes that nothing was lost since last time, and acts by opening the table.

FIRST VIEWPORT: A single column list on the dark workspace, 720px wide at desktop and centred,
under a slim header with the product name on the left, Create on the right and the account at the
far right. Each row is 72px: name at 17px, role and last-played in muted text beneath, people
present as small seat dots on the right, and Open table as the one filled blue button. Prep is one header entry (see As built). Empty: one sentence and Create. No imagery.

FORM: The category standard (the standing exit), not on the ordered list and not the assigned direction;
seed key 518dfea8, degraded roll (the roll service was unreachable). Chosen by the
owner on 2026-10-13 in preference to the assigned cartographic direction and the
game-table pick.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
