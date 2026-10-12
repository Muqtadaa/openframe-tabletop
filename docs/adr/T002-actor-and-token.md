# ADR T002 · An Actor is persistent game data; a Token is a Scene object that points at one

**Status:** Accepted (direction) · 2026-10-12 · finalised in Phase 3 · see also
[T003](T003-game-system-contract.md), [T004](T004-player-secrecy-and-state-filtering.md)

## Context

The brief insists Actor and Token are separate. Today there is no Actor concept and no Token type;
the nearest existing mechanisms are the registry's `relation` objects (typed edges between two
objects) and `mark` objects (per-person records attached to another object), both generic.

## Decision

1. **Actor** is persistent Game data: id, game, an actor _type_ owned by the active system, name,
   image asset, **system-owned structured data**, item references, effects, and an ownership map. It
   survives Scene changes and exists with no Token anywhere.
2. **Token** is a Scene object (a registry type in `tabletop`, [T008](T008-package-boundaries.md))
   holding spatial and visual state only: frame, image, disposition, display name, status markers,
   resource-bar _configuration_, and an optional opaque `actorId`.
3. **Link mode** is explicit on the Token: _linked_ (reads and writes the Actor's data) or
   _synthetic_ (carries its own copy, discarded with the Token). The default for monsters and
   one-off creatures is synthetic; for player characters, linked.
4. **A Token never embeds a character sheet.** What a bar or label shows is read through the active
   system ([T003](T003-game-system-contract.md)), not copied into the Token.
5. **Platform and core code treat `actorId` as an opaque id** and `actor.system` as unknown,
   system-owned data. Nothing outside a system package reads a field of it.
6. **Ownership and control** of a Token are derived from the Actor's ownership map when linked, and
   stored on the Token when synthetic. Authorization is checked server-side
   ([T011](T011-game-and-scene-collaboration-topology.md)).

## Alternatives considered

- **Token holds the Actor's data.** Rejected: two Scenes with the same hero would diverge.
- **Actor lives inside the Scene document.** Rejected: loses Actor state when a Scene is deleted and
  couples every Scene's size to the cast list.
- **Always linked.** Rejected: ten goblins would share one hit-point pool.
- **Model the link as a `relation` object.** Considered, because the primitive exists; rejected for
  the common case: a Token's Actor is a cross-document reference, and registry relations resolve
  within one document.

## Consequences

- Actor storage and its collaboration model are decided in Phase 3 under T011 with this constraint:
  Actors with GM-only fields are partitioned or held relationally ([T004](T004-player-secrecy-and-state-filtering.md)).
- Token commands go through the dispatcher like any other (rules 3 and 4): a drag previews and
  commits once.
- Deleting an Actor with linked Tokens needs an explicit policy (unlink to synthetic copies, or
  refuse); it is settled when Actors exist.
