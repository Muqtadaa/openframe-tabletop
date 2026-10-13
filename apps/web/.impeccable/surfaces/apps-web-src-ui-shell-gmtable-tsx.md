---
version: 1
slug: "apps-web-src-ui-shell-gmtable-tsx"
primary_target: "apps/web/src/ui/shell/GmTable.tsx"
related_targets: ["apps/web/src/canvas","apps/web/src/ui/Inspector.tsx","apps/web/src/ui/ContextMenu.tsx"]
---

# GM tabletop

Mode: Operate. Scope: shape only until built in WP 0.13.

JOB AND AUDIENCE: The GM runs the session from a laptop. Everything a player has, plus layer
management (background, mid-ground, foreground, an NPC token layer, a GM-only layer), moving tokens
between layers, an initiative tracker and hit-point counters.

OUTCOME AND PROOF: The central problem is density. The GM must never face a wall of controls, and
must never be unsure what the players can see.

SELECTED DIRECTION: First viewport in the contract below.

SCOPE AND BOUNDARIES: Presentation over Board data; layers, initiative and counters are placeholders
in structure only, with Phase 1 marker comments, and no `Layer`, `Token` or `Initiative` domain model.
A GM-only layer is a partition of what is sent, never a hidden flag (T004, T011). Anti-goals: a
permanent toolbar of everything; colour as the only sign that something is hidden.

STATES AND RANGES: no selection (almost nothing shown), one token selected, a mixed selection, a
GM-only object selected, preview-as-player, an initiative running, reconnecting.

INTERACTION AND LAYOUT: Same frame as the Player tabletop so the table reads the same. Density is
managed by disclosure keyed to selection, role and posture. (1) One persistent dock rail on the
right, one dock open at a time (Layers, Initiative, Tokens, Notes). (2) A contextual bar anchored to the
selection carries only what applies to what is selected: move to layer, reveal, counters, conditions.
(3) Who can see each thing is stated at all times by shape and word: a GM-only badge on the object
and a "players see" count in the layer dock. (4) Preview as player is one control in the top bar.
Scene tabs sit at the top for the GM only. Keyboard-first: every dock and contextual action has a
key and a command-palette entry.

OPEN DECISIONS: Whether Run and Prep are one toggle or two entries (they are two entries from the
Game Library; the frame is shared).

## As built (WP 0.13)

The structure that answers the density problem exists and is empty on purpose: posture from the board's role (`ui/shell/posture.ts`: owner, or a board that is this browser's own, is the GM), and a dock registry whose entries name the postures they are offered to. A phase that builds layers, initiative, tokens or notes registers a dock and the rail grows by one button; an entry for something that does not exist is not drawn. NOT built: Layers, Initiative, Tokens, Notes, Preview as player, scene tabs and the contextual selection bar, all of which need a model Phase 1 and later create.

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

STORY: The GM understands what the players see versus what only they see, believes the
controls they need will be there when they select something, and acts without hunting.

FIRST VIEWPORT: The Player frame plus: scene tabs along the top (the active one underlined in
blue), a Preview as player toggle at top right, and the right dock rail showing four icons
(Layers, Initiative, Tokens, Notes) with the Layers dock open at 320px by default in Run. With a
token selected, a 36px contextual bar floats above it carrying move to layer, reveal, counters and
conditions. GM-only objects carry a badge and a dashed outline, never colour alone.

FORM: The category standard (the standing exit), not on the ordered list and not the assigned direction;
seed key 518dfea8, degraded roll (the roll service was unreachable). Chosen by the
owner on 2026-10-13 in preference to the assigned cartographic direction and the
game-table pick.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
