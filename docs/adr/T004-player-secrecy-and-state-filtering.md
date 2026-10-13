# ADR T004 · Secrecy is a data boundary: partition by audience, never hide in the client

**Status:** Accepted · 2026-10-12 · the spike passed 2026-10-13 (see _Spike result_), so hide / reveal
may be built within the limits listed there · see also [T011](T011-game-and-scene-collaboration-topology.md),
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

## Spike result (2026-10-13)

The gate in decision 5 was exercised and **passed**: partitioning by audience expresses what Phase 2 needs
for _visibility_. What was built and shown, and where it lives:

- **Two ordinary rooms and a ticket.** A scene is a table room and a GM room. A signed ticket names one room
  (`packages/collab/src/tickets.ts`, Ed25519, verified in the room with a public key only), so the room has no
  idea what an audience is and ADR 0016's schema-agnostic relay is unchanged. A player holds one ticket, a GM two.
- **A reveal is a move.** Write the destination with a stamp, wait for that room to confirm, then remove the
  source (`packages/collab/src/move.ts`). A crash leaves the object in both documents, never neither;
  `reconcileMoves` settles it from the stamps, and a tie resolves toward secrecy.
- **The player's wire is checked, not just their document.** Tests put the player on the table and the GM on both,
  and assert that a marker string belonging to an unrevealed object appears in none of the player's document, its
  saved state, or any frame the room sent it, through reconnects (`audiences.test.ts`, and over real workerd in
  `e2e-rooms/t004-partitions.spec.ts`). The same assertion is shown **failing** on the rejected design, a hidden
  flag in one shared document, so it is not passing vacuously.
- **Ticket mode closes a hole that was already in the room.** `roleForKey` answers `editor` for a room with no
  keys, so an unclaimed scene room was open to anyone. When `TICKET_PUBLIC_KEYS` is set the link path is not
  consulted at all, and every route that decided by key is refused; images are reached by ticket header.

### What it settled

- Ed25519 verifies in workerd as well as Node, so the room holds no secret and a leaked Worker cannot mint a ticket.
- A GM holds two sockets, one per room. Limits are per room, so this does not double anything inside a room, and the
  GM room has only GMs in it, so it is cheap while idle.
- Revocation is expiry: at most an hour, with a minute's allowance for clocks, noticed **when the socket next speaks**
  (never by a timer, rule 29). A quiet socket is harmless and is put out on its next word; the client reconnects
  with a fresh ticket because its credentials are read again on every attempt.
- Keys can be rotated: the room accepts several public keys at once.

### What partitioning does not express (decisions for the owner before Phase 2 builds on it)

1. **Per-player secrets inside the table.** Each player's private notes, or per-player fog, cannot live in the table
   room, which every player receives. Options: a room per player (another audience tier, which the model allows),
   relational rows under row-level security for things that are not spatial, or accepting that Phase 2 has only
   GM-versus-table. This is the case the original alternative (server-side projection) was kept for; it is not
   needed for Phase 2.
2. **Write authority per object.** The relay cannot tell a player moving their own token from a player deleting
   somebody else's: the table room accepts any editor's update. Phase 2's "players control their own tokens" is
   therefore a trust matter today. Options: per-owner documents, a signed-intent layer that the relay checks without
   reading the document, or the GM's client being the only writer with players sending intents. Needs a decision.
3. **Images.** An image in the GM room is already unreachable from the table room (assets are keyed by room), but a
   reveal must also copy the image to the table room, and the GM-room copy is deleted after. Not built; the rule is
   recorded here so Phase 2 does not reveal an object that points at an image the table cannot fetch.
4. **"Hide" does not un-see.** A player's device keeps what it was shown. A hide stops further delivery, and the
   test says so (`cannot take back what the player was already shown`). Product copy must not promise otherwise.
5. **Confirmation relies on the platform.** A move waits for the room's in-order reply (`RoomProvider.flushed`), and
   the Durable Object's output gate is what holds a reply until the writes behind it are stored. The ordering is
   tested; the durability half rests on the platform and has not been shown by killing a room mid-write.
6. **Spectators.** In ticket mode a link is not a credential. A spectator needs a ticket (a `viewer` role), so the
   bearer-link spectator question in T011 becomes a question about who may mint anonymous viewer tickets.
