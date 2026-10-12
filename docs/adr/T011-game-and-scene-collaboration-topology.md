# ADR T011 · Collaboration topology: one room per audience tier, admitted by ticket

**Status:** Accepted (direction) · 2026-10-12 · finalised in Phases 1 and 3 · see also
[T001](T001-game-to-scene-persistence.md), [T004](T004-player-secrecy-and-state-filtering.md)

## Context

Today's room ([ADR 0013](0013-collaboration-transport-durable-objects.md),
[0016](0016-room-trust-boundary.md)):

- one Durable Object per board, holding one Y.Doc as snapshot plus loose updates;
- admission by a bearer **link key** (editor, viewer, owner) and an optional password, with the role
  fixed on the socket for its lifetime;
- the room never consults Supabase, and does not know who a peer is;
- the room relays editors' updates verbatim to every peer and persists them, and sends the full
  state to anyone admitted, viewers included.

Tabletop's collaborators are not symmetrical (owner, GM, assistant GM, player, spectator), and some
of what a Scene holds must reach only some of them.

## Decision

1. **A Scene is served by one room per audience tier.** Initially two: a _table_ room (everything
   every participant may see) and a _GM_ room (what only the GM and assistant GMs may see). Further
   tiers are possible but none is built until a feature needs it. Each room is the existing
   schema-agnostic relay, so [ADR 0016](0016-room-trust-boundary.md) is unchanged.
2. **Admission is by identity, not by link.** Membership in Postgres decides a person's role in a
   Game. A short-lived, signed **ticket** minted by Supabase (game, Scene, role, audience tiers,
   expiry) is presented in the room's HELLO. The Durable Object verifies the signature locally; it
   does not call Supabase on the hot path. Bearer links may remain for spectators.
3. **Room-side cost discipline is unchanged.** CLAUDE.md rule 29 binds every new room: no timers,
   alarms for deferred work, and clients send only what somebody can see.
4. **Game-level content** (Actors, Items, Journals, Encounters, chat, rolls) is **not** put in a
   Scene room. Each store is decided when its phase begins, with this constraint: anything with
   per-user visibility is partitioned by audience or held relationally where row-level security can
   filter it, never a shared document everyone receives whole. The first candidates are Postgres
   rows for chat and roll history, and per-entity documents for Actors.
5. **The collab change log is kept.** Its mechanism (attributed, revertible changes) may become a GM
   audit trail; it is out of scope until a product need exists.

## Alternatives considered

- **Filtering one Scene document per peer in the room.** Rejected for now; see
  [T004](T004-player-secrecy-and-state-filtering.md).
- **Keep bearer-link roles and add a GM role as a fourth key.** Rejected: a key identifies nobody,
  cannot be revoked per person, and leaks by forwarding.
- **Room calls Supabase on every connection.** Rejected: puts a network dependency and latency in the
  admission path of a Durable Object whose allowance is a daily budget.
- **A single Game room multiplexing everything.** Rejected: every member would pay presence and
  update cost for Scenes they are not in.

## Consequences

- Phase 1 builds ticket minting (a Postgres function or Edge Function), ticket verification in the
  Durable Object, and the membership and role tables.
- Moving content between tiers ("reveal") is a command that touches two documents; its atomicity
  and failure modes are part of the T004 spike.
- The existing `boards` table, its duplicated keys and `my_boards()` are not reused.
