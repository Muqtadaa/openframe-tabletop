# ADR T007 · Extensions: a boundary not to foreclose, nothing built

**Status:** Accepted (boundary note) · 2026-10-12 · detailed design is Phase 9

## Context

The brief places an extension architecture in Phase 9, after enough real systems and features exist
to know what extensions need. Designing it now would be speculation, and the brief names a generic
plugin marketplace among the things not to prioritise.

## Decision

Nothing is built. Three properties of the existing architecture are recorded as ones to preserve so
that a later extension API does not require rewriting them:

1. **Behaviour is registered, not branched on.** Object types, views, tools and (from Phase 3)
   systems are registry entries (CLAUDE.md rule 5). A future extension adds registrations; it does
   not patch callers.
2. **Mutation has one door.** Anything an extension does to persistent state goes through
   `CommandDispatcher.dispatch` with the same validation and authorization as a person's action
   (rule 3). There is no second path to open for extensions.
3. **I/O reaches the interface through ports** (`runtime/services.ts`). An extension is handed
   ports, never `fetch`, the document writer or an adapter.

## Not decided here

Isolation mechanism (iframe, worker, ShadowRealm, build-time only), permission model, distribution,
versioning, and which surfaces are extensible (tools, panels, object types, context actions,
sheets, roll functions, import / export).

## Consequences

- Reviews of Phase 1 to 8 work ask whether a change adds a path around the three properties above.
- No extension-related code, types or documentation beyond this note are written before Phase 9.
