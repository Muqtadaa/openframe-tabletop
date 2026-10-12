# OpenFrame Tabletop
## Product Brief, Fork/Rebuild Strategy, and Implementation Plan

**Status:** Initial project handoff  
**Prepared:** October 12, 2026  
**Working product name:** OpenFrame Tabletop  
**Source product:** OpenFrame  
**Source repository:** `Muqtadaa/open-frame`  
**Observed source baseline while preparing this plan:** `8eb19c53f6ab9aa5a852909a94436fa23f776b66` (2026-10-10)  
**Target repository:** The new, initially empty repository supplied alongside the OpenFrame repository in the Claude Code session.

> The source commit above is a reference point, not a pin. At project start, inspect the attached OpenFrame repository and use its actual current `main` as the source of truth if it is newer.

---

# 1. Executive Directive

Create a secondary product derived from OpenFrame that becomes a browser-based Virtual Tabletop for online tabletop roleplaying games.

This is **not** a greenfield VTT and must not be treated as one.

It is also **not** “OpenFrame with a token tool.”

The project should preserve OpenFrame’s mature collaborative spatial foundation while replacing the whiteboard/research product assumptions with a game/campaign/scene model, a VTT-specific interaction system, and a replacement visual design language.

The long-term competitive frame is:

- **Owlbear Rodeo:** low-friction tabletop usability and fast map/token play.
- **Roll20:** broad hosted VTT capability.
- **Foundry VTT:** system/module extensibility and deep game-state modeling.

The priority order is:

> **Excellent tabletop → excellent first-party 5E experience → excellent campaign platform → additional game systems → extension ecosystem.**

Do **not** reverse that sequence into framework-building before the product is playable.

---

# 2. Product Definition

OpenFrame Tabletop is:

> **A structured collaborative game environment whose primary play surface is a spatial tabletop.**

Its OpenFrame heritage remains important:

- typed objects rather than anonymous canvas pixels;
- a single command path for persistent mutation;
- schema-versioned documents;
- strong undo semantics;
- real-time collaboration;
- local/offline resilience where practical;
- deterministic validation and repair;
- registry-driven object behavior;
- explicit authorization;
- strong accessibility;
- benchmark-driven performance;
- durable architectural boundaries enforced by tests.

The VTT adds a new domain above the canvas.

The canvas is no longer the entire product.

---

# 3. What Exists in OpenFrame Today

The attached OpenFrame repository is the implementation authority. Do not rely only on this summary.

At the time this plan was prepared, current `main` already contained substantially more than a basic whiteboard:

## Core spatial/canvas foundation

- infinite canvas;
- pan/zoom;
- culling;
- selection and multi-selection;
- drag, resize, rotate;
- z-order;
- clipboard;
- alignment and snapping;
- shapes, frames, text, sticky notes, connectors, images, groups, tables, code blocks;
- inline rich text;
- robust pointer/touch behavior;
- keyboard interaction infrastructure;
- object registry;
- object-specific bounds/hit testing;
- schema migrations;
- versioned persistence.

## Architecture

- `packages/core` as pure TypeScript domain;
- centralized command dispatch;
- `packages/collab` isolating Yjs;
- `apps/web` as the React client;
- `apps/rooms` as the Cloudflare Worker/Durable Object room service;
- Supabase-backed identity, membership, workspace metadata, comments, etc.;
- R2-backed shared assets;
- strict dependency-cruiser and architecture tests.

## Collaboration

- live shared boards;
- presence;
- local undo semantics;
- server authorization;
- reconnection;
- shared assets;
- comments and mentions;
- workspaces and membership;
- follow/view presence;
- change history;
- version history.

## Product-specific functionality

OpenFrame also currently contains functionality that is **not automatically part of the VTT fork**, including:

- research/CRO semantic object types;
- research provenance relationships;
- dot voting;
- polls;
- facilitation/session features;
- AI clustering;
- MCP/agent access;
- agent change tracking;
- whiteboard-specific front-door and board terminology;
- the existing Notebook / After Hours design language.

The fork must classify these deliberately rather than inheriting them by accident.

---

# 4. Source-to-Target Migration Strategy

## 4.1 Treat the source repository as read-only

During this project:

- the attached OpenFrame repository is the source/reference;
- the new repository is the destination;
- do not modify OpenFrame while creating the VTT unless the user explicitly requests a shared upstream change.

If a broadly reusable improvement belongs in both products, document it first rather than silently changing both repositories.

## 4.2 Preserve source history if safely possible

Because this is a derivative product built from a mature codebase, the preferred target setup is to preserve the OpenFrame Git ancestry rather than copy files into an unrelated fresh history.

At project start:

1. inspect both repositories;
2. verify the target repository contains no meaningful work that would be destroyed;
3. determine the safest method to import OpenFrame `main` history into the target while keeping the target repository as `origin`;
4. do not force-push or rewrite a non-empty remote without explicit user approval;
5. if the target is genuinely empty, prefer making the target’s initial code history descend from the current OpenFrame source state.

The first meaningful target milestone should be an **unchanged or minimally renamed OpenFrame baseline that passes verification**.

This gives every subsequent VTT change an auditable diff from the actual product foundation.

## 4.3 Do not selectively reconstruct OpenFrame from memory

Do not manually copy “the useful parts” into a fresh architecture.

That would discard the value of:

- architecture tests;
- migration history;
- collaboration edge-case fixes;
- accessibility work;
- keyboard infrastructure;
- benchmark infrastructure;
- production lessons encoded in `CLAUDE.md`.

Import the mature baseline, then simplify deliberately.

---

# 5. License and Legal Constraints

## 5.1 OpenFrame source license

OpenFrame is currently AGPL-3.0-only.

Unless the copyright owner deliberately makes another licensing decision and has the rights required to do so, preserve the AGPL license and its obligations in the derivative repository.

The VTT fork must not accidentally remove:

- the license;
- copyright/provenance records;
- source-availability obligations relevant to a hosted modified AGPL application.

Review product-facing source-offer requirements before public hosting.

This is a project requirement, not legal advice.

## 5.2 First-party 5E rules content

The bundled default game system should be based on **System Reference Document 5.2.1**.

As of this plan:

- SRD 5.2.1 is the current SRD published for the revised/current fifth-edition core rules;
- it is licensed under **Creative Commons Attribution 4.0 International (CC-BY-4.0)**;
- Wizards’ Creator FAQ distinguishes SRD 5.2.1 from the D&D Beyond Basic Rules;
- only appropriately licensed SRD content should be imported or reproduced.

Official sources:

- https://www.dndbeyond.com/srd
- https://www.dndbeyond.com/creator-faq
- https://creativecommons.org/licenses/by/4.0/legalcode

Use the **exact attribution statement provided in SRD 5.2.1** in the product/repository wherever required:

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Do not assume material from:

- Player’s Handbook;
- Dungeon Master’s Guide;
- Monster Manual;
- D&D Beyond Basic Rules;
- Forgotten Realms;
- published adventures;
- official art;
- logos;
- trade dress;
- other D&D products

is redistributable unless that exact material is included in the licensed SRD or separately licensed.

## 5.3 Product/system naming

Internally, use a neutral package/system identifier such as:

- `srd5e`;
- `srd-5.2.1`;
- `5e-srd`.

Do not make generic platform code depend on the display name.

For public-facing compatibility language, prefer wording allowed by the SRD such as “5E compatible” or “compatible with fifth edition” unless a later trademark/legal review supports something more specific.

---

# 6. AI Is Explicitly Out of Scope

AI is **not** a product priority for the initial VTT roadmap.

The source OpenFrame repository currently contains AI/MCP-related work. That does not make those features requirements for this fork.

## Preserve the architecture, not the feature work

Keep architectural qualities that are generally good engineering:

- typed domain data;
- stable identifiers;
- commands;
- registries;
- schemas;
- clean ports/adapters;
- explicit permissions;
- structured relationships.

These happen to make future automation possible.

Do **not** spend early project effort on:

- MCP;
- LLM provider abstractions;
- prompt systems;
- vector databases;
- embeddings;
- AI clustering;
- AI campaign generation;
- agent permissions;
- agent-specific UI;
- AI-assisted encounter building;
- AI Game Master functionality;
- AI-specific serialization;
- AI-specific domain paths.

If source code exists solely to support these concerns and complicates the fork, it may be excluded or removed after the source audit.

## Rule

> **Structured enough for automation later; no automation infrastructure before it has a real product consumer.**

Future automation, if ever added, must use the same domain commands and authorization as human operations.

---

# 7. Product Architecture

## 7.1 Current conceptual hierarchy

OpenFrame is approximately:

```text
User
  └── Workspace
       └── Board
            └── Board Objects
```

The VTT requires:

```text
User
  └── Game / Campaign
       ├── Members
       ├── Game System
       ├── Scenes
       │    └── Scene Objects
       ├── Actors
       ├── Items / Abilities
       ├── Effects / Conditions
       ├── Encounters
       ├── Journals
       ├── Assets
       ├── Compendium Content
       ├── Chat
       ├── Roll History
       ├── Playlists / Audio (later)
       └── Game Settings
```

A Scene should reuse large portions of OpenFrame’s Board document/canvas behavior.

A Game must not be implemented as a renamed Board.

---

# 8. Game and Scene Separation

## Game

A Game/Campaign owns data that exists independent of any one map:

- membership and roles;
- selected game system;
- Actors;
- Items;
- Journals;
- encounters;
- chat;
- compendium/homebrew references;
- game-level assets;
- settings;
- Scene list and active Scene state.

## Scene

A Scene owns spatial/environmental state:

- dimensions/background;
- map imagery;
- grid configuration;
- scene-local objects;
- walls;
- lights;
- doors/windows;
- tokens;
- drawings;
- fog/exploration;
- tactical templates;
- scene settings.

## Preferred persistence hypothesis

Prefer independently persisted Scene documents referenced by Game metadata rather than one enormous Game CRDT containing all campaign content.

This is not final until ADR-T001 is written.

---

# 9. Actor and Token Must Be Separate

This decision is foundational.

## Actor

An Actor is persistent game data.

Conceptually:

```ts
interface Actor {
  id: ActorId
  gameId: GameId
  type: ActorType
  name: string
  image?: AssetId

  system: unknown

  items: ActorItemReference[]
  effects: ActiveEffect[]

  ownership: OwnershipMap
}
```

Actors can represent:

- player characters;
- monsters;
- NPCs;
- companions;
- vehicles;
- system-specific entities.

## Token

A Token is a Scene object.

Conceptually:

```ts
interface TokenData {
  actorId?: ActorId

  name: string
  image: AssetId

  disposition: 'friendly' | 'neutral' | 'hostile'

  actorLinkMode: 'linked' | 'synthetic'

  vision: VisionConfig
  light?: LightConfig

  bars: TokenBarConfig[]
  statuses: StatusMarker[]
}
```

Multiple Tokens can reference one Actor.

Actor state survives Scene changes.

Token state is spatial/scene-specific.

Do not copy entire character sheets into Token objects.

---

# 10. Game-System Architecture

The VTT must be system-independent at the platform layer while shipping with a useful first-party system.

## Platform concepts

The platform may understand:

```text
Game
GameSystem
Scene
Actor
ActorType
Item
ItemType
Token
Resource
Effect
Condition
Roll
Encounter
Initiative
Journal
Compendium
```

## System-owned concepts

The bundled 5E/SRD system owns concepts such as:

```text
Armor Class
Hit Points
Hit Dice
ability scores
saving throws
skills
proficiency
classes
levels
spellcasting
spell slots
weapon attacks
death saving throws
short and long rests
5E conditions
5E initiative
5E movement rules
```

Generic Scene/collaboration code must never assume these fields exist.

Bad generic architecture:

```ts
actor.system.armorClass
```

Generic platform code should treat `actor.system` as system-owned structured data interpreted through the active system implementation.

---

# 11. Build the Abstraction From a Real Game

Do not begin by creating an infinitely generic RPG framework.

Use this sequence:

1. establish only the platform/system boundary required by known needs;
2. implement the bundled SRD 5.2.1 system;
3. allow that real implementation to expose missing extension points;
4. refactor those extension points into deliberate platform contracts;
5. later implement a substantially different second open system;
6. use that second system to prove the abstraction.

Avoid:

## D&D disguised as generic architecture

Every “generic” field coincidentally maps to 5E.

## Premature universal abstraction

Huge plugin APIs for systems that have not been implemented.

The first system proves usefulness.

The second system proves generality.

---

# 12. First-Party SRD 5.2.1 System

The default bundled system should be useful enough for real ongoing play.

## 12.1 Character Actors

Target support includes licensed SRD equivalents of:

- identity/basic character information;
- ability scores and modifiers;
- proficiency;
- saving throws;
- skills;
- defenses;
- hit points;
- Hit Dice;
- movement;
- resources;
- inventory;
- attacks;
- spells;
- conditions;
- features;
- rests;
- advancement where appropriately licensed and modeled.

## 12.2 NPC/monster Actors

Support:

- monster/NPC statistics;
- actions;
- attacks;
- traits;
- saves/skills where applicable;
- spellcasting where present in SRD;
- challenge information where licensed;
- conditions;
- HP/resources.

## 12.3 Items/content

Support licensed SRD content such as:

- weapons;
- armor;
- equipment;
- spells;
- magic items;
- features/options included in the SRD;
- monsters;
- conditions;
- relevant rules glossary entries.

## 12.4 Rolls

Target:

- ability checks;
- saving throws;
- skill checks;
- attacks;
- damage;
- healing;
- initiative;
- advantage/disadvantage;
- critical handling;
- public/private/blind roll modes.

## 12.5 Automation maturity

Build progressively:

### Level 0 — record keeping
The character and encounter state are stored correctly.

### Level 1 — convenient rolls
A sheet action can invoke the correct formula.

### Level 2 — state assistance
Damage/healing and resources can update state; rests can restore appropriate values.

### Level 3 — rules assistance
Effects and conditions influence calculations.

### Level 4 — advanced automation
Deep workflow/rules resolution.

Early releases should target **Levels 0–2**.

Do not delay a playable VTT to build a complete rules engine.

---

# 13. System Code and System Content Must Be Separable

Treat a Game System as at least two conceptual parts.

## Rules implementation

Code that defines:

- Actor schemas;
- Item schemas;
- derived values;
- sheet components;
- roll behavior;
- initiative;
- rest logic;
- condition mechanics;
- system hooks.

## Rules content

Data such as:

- spells;
- equipment;
- monsters;
- conditions;
- magic items;
- classes/options included in the licensed corpus;
- rules references.

Separating them improves:

- license provenance;
- content versioning;
- compendium updates;
- homebrew support;
- testing;
- future content packs.

Every imported rules/content source should have explicit provenance.

---

# 14. Scene Object Model

The object registry should remain a major platform strength.

Initial/foundational VTT Scene types:

```text
map
token
drawing
text
note
prop
tile
wall
door
window
light
fog-region
aura
template
marker
```

Potential later types:

```text
trigger-region
teleporter
sound-source
terrain
elevation-region
hazard
environmental-effect
```

Do not add type switches throughout the canvas.

Extend the existing object/view registries.

---

# 15. Grid System

The existing OpenFrame quadrille is not the VTT grid architecture.

Support in order:

## Initial

- gridless;
- square.

## Next

- flat-top hex;
- pointy-top hex.

## Later

- isometric/custom measurement where justified.

Grid configuration should conceptually include:

```text
type
cell size
origin/offset
scale
distance per cell
unit label
opacity
color
snap mode
measurement rule
```

A single shared grid abstraction must power:

- snapping;
- rulers;
- token placement;
- movement;
- templates;
- distance calculations;
- pathing.

Do not implement independent grid math in each feature.

---

# 16. Roles and Capabilities

Collaborators are no longer symmetrical.

Initial roles:

```text
owner
gm
assistant-gm
player
spectator
```

Use capabilities rather than scattered role checks.

Examples:

```text
game.settings.edit

scene.create
scene.edit
scene.activate

token.create
token.move.owned
token.move.any
token.edit.owned
token.edit.any

actor.view.owned
actor.edit.owned
actor.view.any
actor.edit.any

fog.reveal
lighting.edit

journal.view
journal.edit

encounter.edit
```

The server remains authoritative.

Role affects interface availability, but hiding a control is not authorization.

---

# 17. Hidden Information Is a Security Boundary

A VTT has information that must not merely be visually hidden.

Examples:

- hidden monsters;
- secret doors;
- GM notes;
- unrevealed journals/handouts;
- NPC statistics;
- private rolls;
- undiscovered map state;
- hidden encounter participants.

Do not rely solely on:

- CSS;
- opacity;
- hidden DOM nodes;
- “don’t render this component”;
- client-only filters.

Architect toward server-filtered/user-authorized state where secrecy requires it.

The visibility model must eventually distinguish:

## Visibility
Is this entity/data accessible to the user at all?

## Perception
Can this character currently perceive it through vision/fog/lighting?

## Interaction
Can the user manipulate it?

## Knowledge
Which metadata/statistics can the user inspect?

Do not collapse these into one `hidden` boolean.

---

# 18. Fog, Vision, and Lighting

Build in layers.

## Manual fog first

Support:

- reveal;
- hide;
- rectangle;
- polygon;
- reset.

## Persistent exploration

Track previously explored areas per configured player/party model.

## Dynamic perception

Eventually derive current visibility from:

```text
token vision
+
light sources
+
wall geometry
+
doors/windows
+
scene darkness
```

Vision modes must remain system-independent.

Do not hard-code D&D darkvision semantics into the renderer.

The 5E system may configure/use generic vision modes.

---

# 19. Dice

Dice should be a domain/service capability, not merely a 3D animation.

Initial expression goals:

```text
1d20
2d6+4
4d6kh3
2d20kh1+7
1d100
```

Roll metadata should include:

```text
roller
formula
result
timestamp
visibility
context
```

Visibility:

```text
public
gm
self
blind
```

Three-dimensional dice are optional presentation and are not an early requirement.

---

# 20. Chat and Roll History

Chat belongs to the Game, not the Scene.

Support progressively:

- plain messages;
- roll messages;
- system messages;
- whispers;
- GM-only/blind rolls;
- Actor/Item/Journal references;
- richer system cards.

Chat history should not be embedded inside Scene spatial documents.

---

# 21. Encounters and Initiative

Encounter state must be persistent domain state rather than a transient sidebar array.

Conceptually:

```ts
interface Encounter {
  id: EncounterId
  sceneId?: SceneId

  participants: EncounterParticipant[]

  round: number
  turn: number
  active: boolean
}
```

Support:

- roll/manual initiative;
- sort/order;
- next/previous;
- rounds;
- hidden participants;
- add/remove;
- token/actor references.

Later:

- timed conditions;
- reaction/resource assistance;
- system-specific initiative variants.

---

# 22. Campaign Knowledge

The structured-data heritage of OpenFrame should become a differentiator.

Potential campaign entities:

```text
journal
npc
location
faction
quest
lore
handout
encounter-note
session-note
```

Long-term capabilities:

- search;
- tags;
- cross-links;
- Scene references;
- Actor references;
- selective sharing;
- relationship navigation.

The campaign should naturally become a queryable structured knowledge base without requiring AI.

---

# 23. Asset Library

Create game-level reusable assets.

Categories may include:

```text
maps
tokens
portraits
tiles
props
handouts
audio
```

Capabilities:

- upload;
- search;
- folders/tags;
- reuse;
- drag into Scene;
- replace;
- metadata;
- thumbnails.

Later:

- token crop/mask;
- image optimization;
- format conversion;
- map preprocessing.

---

# 24. Product Identity Must Be Replaced

The existing root `DESIGN.md` is not suitable as the VTT design contract.

Its visual world is explicitly:

> **Creative North Star: “The Notebook.”**

The current system is built around:

- engineering quadrille paper;
- page stock;
- slips;
- page apparatus;
- correction ink;
- whiteboard creation rails;
- Notebook / After Hours worlds;
- layout rhythm derived from the whiteboard grid.

That design is coherent for OpenFrame and should be respected as such.

It should **not** constrain OpenFrame Tabletop.

The fork requires a replacement visual world before VTT UI proliferates.

---

# 25. Mandatory Impeccable Redesign Workflow

The source repository includes Impeccable under:

```text
.claude/skills/impeccable/
```

and existing machine-readable design artifacts under:

```text
.impeccable/
```

Preserve this capability in the fork and use it as part of Phase 0.

This is not optional visual polish.

## 25.1 Historical preservation

Before replacing the design contract:

1. preserve the existing OpenFrame `DESIGN.md` in a historical/legacy location, e.g.
   `docs/legacy/openframe-whiteboard-design.md`;
2. clearly label it non-authoritative for the VTT;
3. preserve provenance of current brand assets;
4. do not let the old `.impeccable/design.json` remain silently authoritative after replacement.

## 25.2 Rewrite PRODUCT.md before redesign

The new target `PRODUCT.md` must describe the VTT before a new visual world is finalized.

The design process must derive from the new product truth, not the research-whiteboard brief.

## 25.3 Load Impeccable context

At the beginning of the redesign session, follow the installed skill and run from the target repository:

```bash
.claude/skills/impeccable/scripts/impeccable context
```

Use the Windows `.cmd` launcher if required by the runtime.

Follow the skill’s directives.

Do not repeatedly rerun context in one design session.

## 25.4 Use `shape`

Shape at minimum:

- Game Library / front door;
- Player tabletop;
- GM tabletop;
- Campaign Prep shell.

Resolve:

- tasks;
- information hierarchy;
- role differences;
- interaction states;
- persistent vs contextual panels;
- touch/responsive needs;
- permission states.

## 25.5 Replacement-world new-work process

The current Impeccable skill explicitly says a redesign should replace the incumbent visual world rather than polish it.

Treat The Notebook as:

- evidence;
- history;
- anti-reference;

not as the visual authority of the VTT.

For the replacement world, follow the installed new-work process, including the required direction seeding.

The relevant surface mode is primarily `operate`.

Current skill guidance requires the direction seed for a replacement visual world:

```bash
.claude/skills/impeccable/scripts/impeccable concept-seed --scope direction --mode operate
```

Do not skip this by declaring “The Table” final in advance.

---

# 26. Initial Design Hypothesis: “The Table”

“The Table” is the starting hypothesis, not an excuse to bypass concept exploration.

The intended principle is:

> **The game content owns the table. The interface frames it, the GM operates around it, and players see only what matters to play.**

Do not interpret this literally as:

- wood texture;
- parchment;
- medieval decoration;
- leather;
- skeuomorphic dice;
- fantasy borders;
- generic gamer neon.

The design must work for:

- fantasy;
- science fiction;
- horror;
- modern;
- historical;
- superhero;
- abstract;
- homebrew games.

---

# 27. Two Design Postures

## Play

> **The tabletop is the product.**

The Scene dominates.

Player chrome should be minimal.

GM chrome can be richer but must not overwhelm the Scene.

Likely play surfaces:

- Scene;
- tokens;
- contextual selection;
- ruler;
- ping;
- templates;
- initiative;
- chat;
- minimal Game/Scene navigation.

## Prep

> **The campaign is the product.**

Persistent navigation is legitimate when it reduces context switching.

Likely prep surfaces:

- Scenes;
- Actors;
- Journals;
- Assets;
- Encounters;
- Compendium;
- system settings;
- Scene settings;
- lighting/fog editing.

Retire the absolute OpenFrame rule that no standing panel may consume canvas space.

Replace it with:

> **Persistent chrome must earn persistence.**

---

# 28. Foundational VTT Design Rules

The replacement `DESIGN.md` should eventually encode rules at least equivalent to these.

## The Tabletop Is the Product Rule
During active play, the Scene receives the overwhelming majority of viewport space and visual attention.

## The Campaign Is the Product Rule
During preparation, persistent organizational UI is permitted when it materially improves campaign work.

## The Scene Fidelity Rule
Application themes never reinterpret authored Scene content.

## The Grid Is Content Rule
Scene grids are game/Scene configuration, not application layout rhythm.

## The GM Layer Rule
GM-only information has a consistent visual grammar.

## The Capability Shapes the Interface Rule
Tools and actions follow permissions and working mode.

## The World Is Flat Rule
Game entities inhabit world space. Elevation belongs primarily to application surfaces and transient interaction.

## The Map Wins Rule
When chrome and campaign artwork compete visually, campaign artwork wins.

## The Hidden Means Hidden Rule
Concealed information is an authorization concern, not only a styling concern.

## The System Is Not the Game Rule
The UI must not assume fantasy, D&D, medieval aesthetics, or any specific genre.

---

# 29. Theme Boundary

The current OpenFrame themes alter the visual world.

The VTT must separate:

## Application space

Owned by UI themes:

```text
navigation
panels
toolbars
menus
inspectors
dialogs
context menus
notifications
```

## Game space

Owned by Game/Scene state:

```text
maps
tiles
tokens
grid
fog
lighting
drawings
templates
auras
effects
```

Changing UI theme must not recolor a campaign’s authored content.

A dark-first application theme is a reasonable hypothesis, especially during play, but it must be validated through the Impeccable redesign rather than assumed.

---

# 30. Scene Rendering Planes

Define explicit conceptual planes before they become accidental z-index conventions.

```text
GAME SPACE

Environment
  Map / background
  Tiles / terrain
  Grid

World
  Props
  Drawings
  Environment

Actors
  Tokens
  Nameplates
  Resource bars
  Statuses
  Auras

Tactical
  Templates
  Measurements
  Movement preview
  Pings
  Selection

Perception
  Darkness
  Lighting
  Fog
  Vision

GM Overlay
  Walls
  Doors
  Hidden entities
  Light origins
  Trigger regions
  GM annotations


APPLICATION SPACE

Context controls
Panels
Navigation
Menus
Dialogs
Notifications
```

Rendering architecture should reflect these responsibilities rather than relying on arbitrary layer numbers.

---

# 31. Source Feature Disposition Matrix

During the initial audit, classify every major existing subsystem as:

```text
KEEP
EXTEND
REPURPOSE
HIDE/DEFER
REMOVE
```

Use the following as the initial hypothesis, not as a substitute for inspection.

| Existing OpenFrame area | Initial VTT disposition |
|---|---|
| Pure core/domain boundaries | KEEP |
| Command dispatcher | KEEP |
| Schema/migrations | KEEP |
| Canvas renderer/culling | KEEP |
| Viewport/pan/zoom | KEEP |
| Selection/transforms | KEEP |
| Registry-driven objects | KEEP |
| IndexedDB/local persistence | KEEP |
| Yjs collab package | KEEP |
| Durable Object rooms | KEEP/EXTEND |
| Supabase identity/membership | KEEP/EXTEND |
| R2 assets | KEEP/EXTEND |
| Undo semantics | KEEP |
| Accessibility tests | KEEP |
| Keyboard/roving/escape infrastructure | KEEP |
| Performance benchmarks | KEEP/EXTEND |
| Board list/workspaces | REPURPOSE as Game Library / campaigns |
| Board document | EXTEND/EVOLVE into Scene-level document |
| Share/member model | EXTEND into Game membership + roles |
| Comments/mentions | DEFER or REPURPOSE later |
| Version history | KEEP/ADAPT |
| Board overview | DEFER/REPURPOSE for Scene/campaign navigation |
| Session timer | DEFER |
| Session music | DEFER; patterns may inform later audio |
| Voting/polls/reactions | HIDE/DEFER |
| Research semantic object types | REMOVE from active VTT product |
| Research provenance | REMOVE/REPLACE with campaign relationships later |
| AI clustering | REMOVE/HIDE |
| MCP app/server | REMOVE/DEFER from product roadmap |
| Agent change tracking | REMOVE/DEFER unless useful generically |
| Notebook visual system | REPLACE |
| Current OpenFrame brand assets | PRESERVE until branding decision; do not assume workspace aesthetic |
| Impeccable skill/tooling | KEEP and REQUIRE in Phase 0 |

---

# 32. Phase Plan

# Phase 0 — Fork, Audit, Product Identity, and Design System

This phase is mandatory before VTT feature proliferation.

## 0A — Repository forensics and baseline

1. identify source and target directories;
2. confirm source current branch/commit;
3. confirm target state;
4. run source verification;
5. inspect source workspace/package graph;
6. inspect relevant architecture docs and ADRs;
7. inspect current production boundaries;
8. inspect design tests and Impeccable artifacts;
9. inspect AI/MCP coupling;
10. inspect research-specific type coupling;
11. record benchmark baseline;
12. record bundle baseline.

Create in the target:

```text
docs/plans/00-source-audit.md
```

with:

- source commit;
- current package graph;
- reusable subsystems;
- product-specific subsystems;
- risk areas;
- proposed migration sequence;
- disposition matrix.

## 0B — Establish target history and verified imported baseline

Import the OpenFrame foundation into the target safely.

Before VTT changes:

- target builds;
- target tests pass;
- target architecture tests pass;
- target baseline commit is identifiable;
- source remains untouched.

Do not mix architectural refactoring into the import commit.

## 0C — Product de-scoping

Remove from active product scope or hide behind non-shipping boundaries:

- AI UI;
- AI clustering;
- MCP product surfaces;
- agent-specific UI;
- research/CRO semantic types;
- research-specific navigation;
- voting/polls if not needed;
- other whiteboard facilitation features not required for the VTT.

Do not remove broadly useful primitives simply because the first consumer was research-specific.

## 0D — Rewrite product truth

Create the VTT-specific:

- `PRODUCT.md`;
- `README.md`;
- relevant docs index;
- terminology updates;
- target `CLAUDE.md` rules where product-specific language changed.

Do not casually rename deep architectural concepts until the intended migration is understood.

## 0E — Impeccable redesign discovery

Follow the mandatory process in sections 24–30.

Produce surface briefs and choose a replacement visual world.

## 0F — Replace design contract

Create new authoritative `DESIGN.md`.

Archive the whiteboard design as historical reference.

Update:

- design tokens;
- `.impeccable` artifacts;
- design tests;
- theme boundaries;
- component rules.

## 0G — Rebuild application shell on the existing document foundation

Before simultaneously changing every domain layer, prove the new shell with as much existing data plumbing as practical.

Build/prototype:

- Game Library/front door;
- Player tabletop posture;
- GM tabletop posture;
- Prep shell;
- dock/panel system;
- VTT tool organization;
- role-aware chrome;
- application theme boundary.

It is acceptable for this shell temporarily to sit over Board-backed data.

The purpose is to separate **design migration risk** from **domain migration risk**.

## Phase 0 exit gate

- source foundation imported safely;
- target verifies;
- AI is not an active requirement;
- research product identity is no longer authoritative;
- `PRODUCT.md` describes the VTT;
- `DESIGN.md` describes the VTT;
- player/GM/prep shell direction is established;
- architecture and design tests agree with the new product;
- no Notebook rule remains authoritative by accident.

---

# Phase 1 — Game, Scene, Membership, and System Foundation

Build:

- Game/Campaign domain;
- Game membership;
- roles/capabilities;
- Game System identity;
- Scene metadata;
- Scene list/navigation;
- active Scene;
- Scene creation/deletion/duplication;
- Game → Scene persistence relationship;
- migration strategy from Board semantics.

Do **not** implement full 5E sheets or dynamic lighting.

Phase 1 exit:

> A user can create a Game, create multiple persistent Scenes, invite members with roles, select the bundled SRD system, and collaboratively switch/work within Scenes.

---

# Phase 2 — Battlemap Core

Build:

- map/background;
- image placement/calibration;
- gridless/square grid;
- grid calibration;
- Token object;
- token imagery;
- movement;
- snapping;
- facing/rotation as appropriate;
- token ownership/control;
- hide/reveal;
- ruler;
- pings;
- drawing;
- active Scene broadcast.

This is the first genuinely playable tabletop.

Phase 2 exit:

> A GM can upload a battlemap, configure a grid, place Tokens, invite players, assign control, and run basic spatial play.

---

# Phase 3 — Actors, Dice, Encounters, and 5E Core

Build platform foundations:

- Actor;
- ActorType;
- Item;
- ItemType;
- Effect/Condition foundation;
- Token → Actor link;
- sheet framework;
- dice service/parser;
- roll visibility;
- Encounter;
- initiative;
- system registration/provider interfaces.

Build first-party SRD 5.2.1 implementation simultaneously:

- character Actor schema;
- NPC/monster Actor schema;
- ability scores/modifiers;
- proficiency;
- saves;
- skills;
- AC/HP/resources;
- attacks;
- damage;
- initiative;
- advantage/disadvantage;
- basic conditions;
- character and NPC sheets.

Phase 3 exit:

> The system architecture is proven by a real 5E implementation, and a Game can run character/monster encounters with rolls and initiative.

---

# Phase 4 — SRD Compendium and Core 5E Play

Build the licensed content pipeline and compendium:

- content provenance schema;
- import/transform process;
- searchable SRD compendium;
- spells;
- equipment;
- monsters;
- conditions;
- magic items;
- relevant licensed options;
- drag/drop or equivalent Actor/Item population;
- richer roll/chat cards;
- Level 1–2 rules automation.

Phase 4 exit:

> A group can reasonably run an SRD-based 5E game without needing a separate digital character-sheet application.

---

# Phase 5 — Fog of War

Build:

- fog representation;
- GM reveal/hide;
- rectangle;
- polygon;
- reset;
- persistent exploration foundation;
- player-specific visibility.

Do not combine this phase with full dynamic lighting.

Phase 5 exit:

> The GM can safely control what players can see, and visibility state persists correctly.

---

# Phase 6 — Dynamic Lighting and Vision

Build:

- walls;
- doors;
- windows;
- light sources;
- token vision;
- line of sight;
- scene darkness;
- exploration integration;
- dedicated geometry/performance benchmarks.

Phase 6 exit:

> Player perception responds correctly and performantly to environment, lights, barriers, and token vision.

---

# Phase 7 — Campaign Management

Build:

- Journals;
- locations;
- factions;
- quests;
- handouts;
- folders;
- semantic links;
- reusable encounters;
- campaign search;
- Scene pins/references;
- selective player sharing.

No AI required.

Phase 7 exit:

> The VTT can manage an ongoing campaign as well as a battlemap.

---

# Phase 8 — Second Game System

Choose a legally supportable system that differs materially from 5E.

Selection criteria:

- openly licensed or otherwise legally practical;
- genuinely different mechanics/data needs;
- technically useful as an abstraction test;
- user/contributor interest.

Possible license families include:

- Creative Commons;
- ORC;
- OGL where applicable;
- publisher-specific open licenses.

Do not force the second system into 5E-shaped concepts.

Use this phase to refine the true Game System API.

---

# Phase 9 — Extension Architecture

Only after enough real systems/features exist to know what extensions need.

Potential extension surfaces:

- tools;
- panels;
- object types;
- context actions;
- sheets;
- system integrations;
- roll functions;
- import/export.

Define stable APIs and isolation.

Do not expose arbitrary app internals.

---

# Phase 10 — Advanced Platform Parity

Only after core product quality is established.

Potential work:

- advanced compendium/content packs;
- macros;
- deeper automation;
- playlists/audio;
- positional audio;
- animated token support;
- terrain/elevation;
- multi-level maps;
- public extension ecosystem;
- import/export formats.

AI remains outside this roadmap unless explicitly reprioritized later.

---

# 33. Features Not to Prioritize Early

Do not start with:

- 3D dice;
- animated spell effects;
- particle systems;
- weather shaders;
- animated tokens;
- video calls;
- voice chat;
- marketplace;
- AI GM;
- AI campaign generation;
- exhaustive rules automation;
- generic plugin marketplace;
- elaborate visual effects.

These are demo-friendly and architecture-dangerous.

---

# 34. Performance Strategy

Preserve OpenFrame’s benchmark culture.

Add VTT-specific fixtures rather than relying on the existing sticky-note/mixed-board fixtures.

Example stress Scene:

```text
8192 × 8192 map
250 Tokens
1,500 wall segments
75 light sources
30 vision-enabled Tokens
200 props
100 drawings
```

Measure independently:

- viewport culling;
- Token rendering;
- grid rendering;
- wall intersection;
- visibility polygon generation;
- lighting composition;
- hit testing;
- remote movement application;
- Scene load;
- asset decode/upload;
- large compendium search;
- Actor sheet recalculation where relevant.

Do not treat refresh-rate-capped “FPS” as the only performance measure.

---

# 35. Accessibility

WCAG 2.2 AA remains a requirement.

Preserve the source product’s hard-won accessibility infrastructure.

VTT-specific concerns include:

- keyboard operation;
- roving list/menu behavior;
- focus management;
- tool accessibility;
- map-independent access to game state where practical;
- accessible names for Tokens/Actors;
- non-color-only status indicators;
- chat accessibility;
- initiative accessibility;
- panel semantics;
- target size;
- touch;
- reduced motion;
- screen-reader labels;
- contrast across both UI themes.

Do not weaken existing tests to make the redesign easier.

Change obsolete Notebook-specific assertions into equivalent VTT design requirements.

---

# 36. Required ADRs

Create ADRs before implementation silently settles these questions.

## ADR-T001 — Game → Scene persistence model
Determine how Games reference independently persistent Scenes.

## ADR-T002 — Actor/Token relationship
Define linked vs synthetic Token behavior.

## ADR-T003 — Game System contract
Define what a system implementation may register/provide.

## ADR-T004 — Player secrecy and state filtering
Define where authorization removes/redacts state.

## ADR-T005 — Grid and measurement abstraction
Define gridless/square/hex coordinate and distance behavior.

## ADR-T006 — Vision architecture
Define visibility representation and CPU/GPU responsibilities.

## ADR-T007 — Extension isolation
Defer detailed implementation, but record the boundary not to foreclose.

## ADR-T008 — Package boundaries
Decide whether VTT/game domain earns a new pure package or extends `packages/core`.

## ADR-T009 — Play vs Prep application shell
Define durable shell/navigation responsibilities.

## ADR-T010 — Application theme vs Scene-content boundary
Make Scene Fidelity an architectural as well as visual rule.

## ADR-T011 — Game-level vs Scene-level collaboration
Determine whether Actor/Journal/Game state uses the same room model, separate room/documents, or another topology.

## ADR-T012 — SRD system/content provenance
Define how code, content, versions, and license provenance are represented.

---

# 37. Tentative Package Direction

Do not implement this layout blindly. Resolve it after source audit and ADR-T008.

A likely conceptual direction is:

```text
packages/
  core/                 generic geometry, commands, schemas, shared domain primitives
  collab/               CRDT/room mapping
  tabletop/             game/scene/actor/encounter/system contracts, if boundary earns a package
  system-srd5e/         first-party SRD 5.2.1 rules implementation

apps/
  web/
  rooms/

content/
  srd5e/                transformed licensed content + provenance, if appropriate
```

The existing `apps/mcp` does not need to exist in the fork unless retained temporarily to simplify the baseline import.

Do not create packages for organizational aesthetics. Package boundaries must prevent a dependency that matters.

---

# 38. Command and State Rules to Preserve

Unless an ADR proves otherwise:

1. persistent mutation continues through `CommandDispatcher.dispatch`;
2. gestures update transient state and commit once;
3. remote changes do not pollute local undo;
4. system-specific behavior does not leak into generic canvas code;
5. derived geometry remains derived rather than redundantly stored;
6. boundary validation remains outside hot render paths;
7. document migrations remain forward-only and frozen;
8. unreadable documents are never overwritten;
9. permissions are checked server-side;
10. renderer hot paths receive explicit benchmarks.

---

# 39. Testing Strategy

Preserve and extend:

## Unit tests

- geometry;
- commands;
- schemas;
- migrations;
- system calculations;
- dice parser;
- measurement;
- permissions;
- visibility rules.

## Contract tests

- object registry;
- Game System implementations;
- Actor/Item schemas;
- migration coverage;
- content provenance.

## Integration tests

- local Game/Scene persistence;
- Game membership;
- Scene switching;
- Token ownership;
- Actor/Token synchronization;
- encounter state;
- compendium population;
- fog.

## Collaboration tests

- two clients moving authorized Tokens;
- reconnect;
- local undo;
- simultaneous Actor/Scene edits;
- hidden-state filtering;
- active Scene synchronization.

## End-to-end tests

At minimum:

- create Game;
- create Scene;
- upload/calibrate map;
- add Token;
- invite player;
- assign Token;
- player moves Token;
- GM hides/reveals;
- roll;
- initiative;
- Actor sheet;
- compendium flow.

## Visual/design tests

Use the new VTT `DESIGN.md`, not archived Notebook rules.

Preserve:

- contrast;
- target size;
- focus;
- theme behavior;
- responsive layouts;
- reduced motion;
- design token enforcement.

---

# 40. Impeccable Validation During Phase 0

Use installed capabilities intentionally.

## `shape`
Before implementing the replacement shell.

## `critique`
After representative Player, GM, and Prep surfaces exist.

## `audit`
For accessibility, performance, theming, responsive behavior, and implementation integrity.

## `adapt`
For narrow/mobile/touch behavior.

## `harden`
For permission states, offline/reconnect, errors, loading, empty states, and edge cases.

## `polish`
Only after concept and architecture are correct.

Do not use `polish` to conceal a design that should have been redesigned.

---

# 41. Tabletop Alpha Definition

Tabletop Alpha is complete when:

1. a user can create a Game;
2. the bundled SRD 5.2.1 system can be selected/defaulted;
3. a Game contains multiple Scenes;
4. a GM can upload a battlemap;
5. a square grid can be calibrated or the Scene can remain gridless;
6. Tokens can be created;
7. Tokens can be assigned to players;
8. players can move only authorized Tokens;
9. movement synchronizes live;
10. the GM can hide/reveal entities appropriately;
11. users can ping;
12. users can measure;
13. users can draw;
14. Scene state persists;
15. reconnect does not lose committed work;
16. the GM can activate/switch Scenes;
17. Player and GM interfaces are meaningfully different;
18. Play and Prep follow the replacement design system;
19. `PRODUCT.md` describes the VTT;
20. root `DESIGN.md` describes the VTT;
21. no D&D/5E mechanic has leaked into generic Scene/collaboration code;
22. no AI feature is required for completion;
23. architecture tests still enforce the important dependency boundaries;
24. VTT-specific benchmark budgets exist and pass.

---

# 42. First 5E Rules Milestone Definition

After Tabletop Alpha, the first major rules milestone is complete when:

1. character Actors exist;
2. monster/NPC Actors exist;
3. Token → Actor linking works;
4. character/NPC sheets work;
5. ability checks, saves, attacks, damage, initiative, and advantage/disadvantage work;
6. HP/resources can be updated;
7. Encounter state works;
8. core SRD conditions exist;
9. licensed compendium content is searchable;
10. spells/equipment/monsters can populate Actors or Scene play;
11. SRD attribution is shipped correctly;
12. content provenance is auditable;
13. a group can play an SRD-based 5E session without requiring a second digital character-sheet service.

---

# 43. Initial Claude Code Deliverables

Before broad implementation, create these in the **target repository**:

```text
docs/plans/00-source-audit.md
docs/plans/01-phase-0-execution.md
docs/adr/   (or the repository's established ADR location)
PRODUCT.md
```

Do not replace `DESIGN.md` until the required Impeccable replacement-world process has actually been run.

The initial source audit must contain:

```text
A. Source repository state and commit
B. Target repository state
C. Package/workspace graph
D. Architecture inventory
E. Reusable systems
F. Whiteboard/research-specific systems
G. AI/MCP-specific systems
H. Current design-system inventory
I. Notebook-specific design assumptions
J. Source-to-target disposition matrix
K. Git/history migration strategy
L. License/provenance requirements
M. Proposed target package graph
N. Required ADRs
O. Phase 0 task sequence
P. Test/baseline commands
Q. Risks and unresolved decisions
```

---

# 44. Phase 0 Commit Discipline

Prefer small, comprehensible commits.

A healthy sequence resembles:

1. import source baseline;
2. verify baseline;
3. add VTT project plan/source audit;
4. update product identity/documentation;
5. isolate/de-scope AI/MCP;
6. isolate/remove research-specific product types;
7. add new domain ADRs/contracts;
8. run Impeccable redesign process;
9. implement replacement design shell;
10. update design tests/tokens;
11. verify Phase 0 exit gate.

Do not combine all of Phase 0 into one giant refactor.

Run the target verification suite before each meaningful commit, adapting command names only when the target intentionally changes them.

---

# 45. Things Claude Must Not Invent

If unresolved, document rather than fabricate answers for:

- final product name/brand;
- commercial pricing;
- marketplace strategy;
- exact second game system;
- extension marketplace;
- final audio provider;
- final export formats;
- mobile-native applications;
- video/voice architecture;
- AI roadmap;
- whether all existing OpenFrame facilitation features survive;
- whether comments/mentions are part of early campaign UX;
- whether game-level state uses one CRDT or multiple documents;
- exact package boundaries before ADR-T008;
- exact public trademark wording beyond licensed compatibility language.

---

# 46. Guiding Decision Rule

When choosing between “reuse” and “rewrite,” ask:

> **Is this behavior generic to a collaborative spatial application, or is it an expression of OpenFrame’s whiteboard/research product?**

Generic infrastructure should usually be preserved.

Whiteboard product assumptions should usually be replaced.

When choosing between “generic system abstraction” and “5E implementation,” ask:

> **Does a second real game need this abstraction yet?**

If not, keep the boundary clean but implement the smallest contract the real SRD system needs.

---

# 47. Success Criterion

The project succeeds when it no longer feels like a whiteboard adapted to display battle maps.

It should feel like a purpose-built VTT that happens to inherit an unusually mature collaborative canvas and data architecture.

The foundation should make it:

- easier to play than a sprawling legacy VTT;
- structurally richer than a lightweight map-sharing tool;
- open enough to support more systems later;
- reliable enough for real recurring campaigns;
- and understandable enough that future contributors can extend it without bypassing its core invariants.

That is the product to build.
