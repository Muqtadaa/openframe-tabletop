# ADR T004 · Secrecy is a data boundary: partition by audience, never hide in the client

**Status:** Accepted (direction) · 2026-10-12 · a spike must pass before any hide / reveal feature
ships · see also [T011](T011-game-and-scene-collaboration-topology.md),
[T006](T006-vision-architecture.md)

## Context

A VTT holds information some participants must not receive: hidden monsters, secret doors, GM
notes, unrevealed handouts, private rolls. The brief states that hiding visually is not enough.

What OpenFrame does today, verified in the code:

- `BoardRoom.join` sends the full state and `broadcast` relays updates verbatim to **every** peer,
  viewers included.
- `hidden` and `locked` on an object, a vote round's "hide counts" and a poll's `hideResults` are
  **interface-only**. Anyone who can read the document can read what they conceal
  (`docs/architecture/09-collaboration.md` says so for votes).
- The room cannot redact: it never reads the document (ADR 0016), and a client with a modified
  build ignores any client-side filter.

## Decision

1. **Partition by audience.** Content that only some tiers may receive lives in a document those
   tiers alone are admitted to ([T011](T011-game-and-scene-collaboration-topology.md)). A player's
   client never receives the GM document at all.
2. **"Reveal" is a move between documents**, performed by a GM command, not a flag flip. Hiding
   something again is the reverse move.
3. **The four questions stay separate** and are never collapsed into a `hidden` boolean:
   _visibility_ (may this user receive the entity at all?), _perception_ (can their character
   currently perceive it?), _interaction_ (can they manipulate it?), _knowledge_ (which fields may
   they read?). Only the first is a data-boundary question in Phase 2; perception arrives with
   fog and vision ([T006](T006-vision-architecture.md)).
4. **The existing `hidden` flag is not a secrecy mechanism** and nothing secret is built on it.
   Where it is kept it means "not drawn", as it does today.
5. **Gate.** No hide / reveal feature ships until this decision is exercised by a spike: two
   rooms, a ticket-admitted player and GM, a reveal that moves an object between them, and a test
   that the player's client and its local cache never contained the hidden object.

## Alternatives considered

- **Server-side projection of one document per peer.** The room would decode each update into
  domain objects, compute each peer's view and send diffs. Rejected for now: it puts the domain and
  the registry inside the Durable Object's hot path, which [ADR 0016](0016-room-trust-boundary.md)
  rejected on cost, and makes the room the arbiter of schema compatibility. Revisit only if the
  spike shows partitioning cannot express a needed case (for example, per-player fog inside one
  Scene).
- **Field-level encryption with per-audience keys.** Rejected: key distribution and revocation
  complexity, and it hides content from the relay but not from the CRDT cache of anyone with the
  key.
- **Client-side filtering with a "trusted" client.** Rejected outright: the client is the
  adversary's machine.

## Consequences

- A reveal across documents must be idempotent and recoverable if one half fails; the spike defines
  the ordering (write the destination first, remove from the source second).
- Undo of a reveal is a hide, performed by the same command layer, with the same authorization.
- Features that depend on seeing hidden state server-side (dynamic lighting, vision) must be designed
  so the _result_ of the computation can be sent to a player without the _inputs_
  ([T006](T006-vision-architecture.md)).
- Roll visibility (public, GM, self, blind) is enforced the same way: private results are written to
  rows or rooms only their audience can read.
