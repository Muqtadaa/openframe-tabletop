# ADR T001 · A Game is a catalogue; each Scene is its own document

**Status:** Accepted (direction) · 2026-10-12 · finalised in Phase 1 · see also
[T011](T011-game-and-scene-collaboration-topology.md)

## Context

A Game owns what exists independent of any one map (members, system, Actors, Items, Journals,
chat, settings, the Scene list and active Scene); a Scene owns spatial state (map, grid, objects,
tokens, later walls, lights, fog). The brief prefers independently persisted Scene documents
referenced by Game metadata over one enormous Game document.

What the code does today:

- A board is one `Map<ObjectId, object>` document. Its `meta` is `{title, createdAt}` and nothing
  else, and `isAcceptableRemoteMeta` drops any other key on merge.
- The schema envelope is at version 1 with **no envelope migrations**.
- One Durable Object holds one board's Y.Doc; the board id is the object's name and the R2 prefix.
- Supabase holds accounts, a board list and membership, never board contents.

## Decision

1. **A Scene is the existing board document plus scene settings** (grid, dimensions, background
   reference), persisted and synchronised exactly as a board is: one document, one room.
2. **A Game is not a document.** Its catalogue (members and roles, system id and version, the Scene
   list with order and active Scene, settings) lives in **Supabase Postgres under row-level
   security**. It is relational, per-user filterable, and queryable without a room.
3. **Actors, Items, Journals, Encounters and chat are separate stores**, decided in
   [T011](T011-game-and-scene-collaboration-topology.md) and the phases that introduce them. None
   of them is embedded in a Scene document.
4. **Scene settings need an envelope migration.** The first one (v1 to v2) ships in Phase 1 with a
   frozen fixture, following CLAUDE.md rule 6, together with an extended remote-meta filter and the
   corresponding `collab` document-map change. Settings are not smuggled into `meta` by loosening
   the filter.
5. A Game is **never a renamed Board.** The Phase 0 shell relabels Board data for presentation
   only and introduces no `Game` domain alias.

## Alternatives considered

- **One Game document containing all Scenes.** Rejected: every connected client would load every
  Scene's objects; a map-heavy campaign would hit the Durable Object's message and storage ceilings
  (one atomic write is about 127 MiB) and the cost of every presence message; and per-Scene access
  and versioning would need to be bolted on.
- **The Game catalogue as a CRDT document.** Rejected for now: the catalogue is small, authoritative
  and needs per-user filtering, which a relay that sends everything to everyone cannot do
  (see [T004](T004-player-secrecy-and-state-filtering.md)).
- **Reuse the `boards` table as `games`.** Rejected: it carries link keys that duplicate the room's
  and a visibility model that does not describe roles.

## Consequences

- Scene switching is a reconnection to another room; the active Scene is a catalogue field.
- Per-Scene version history, asset prefixes and deletion work as boards' do today.
- The Scene-document schema and the Game catalogue schema evolve independently.
- Phase 1 must provision a new Supabase project and Worker (the committed values for the original
  are blanked in WP 0.5).
