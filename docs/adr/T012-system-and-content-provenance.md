# ADR T012 · Rules code and rules content are separate, and every content file has provenance

**Status:** Accepted · 2026-10-12 · applied from the first content import (Phase 4)

## Context

The bundled first-party system is based on System Reference Document 5.2.1, licensed under
Creative Commons Attribution 4.0 International. The brief requires that only appropriately
licensed content is reproduced, that provenance is explicit and auditable, and that the exact
attribution statement ships wherever required. It also lists material that must **not** be assumed
redistributable: the Player's Handbook, Dungeon Master's Guide, Monster Manual, D&D Beyond Basic
Rules, Forgotten Realms, published adventures, official art, logos and trade dress.

Nothing from the SRD is in the repository in Phase 0.

## Decision

1. **Separate code from content.** Rules code is `packages/system-srd5e`
   ([T008](T008-package-boundaries.md)). Rules content is data under `content/srd5e/`, with no code
   and no dependencies, versioned independently.
2. **Every content file has a manifest entry** recording: source document and exact version
   (`SRD 5.2.1`), section or page, licence identifier (`CC-BY-4.0`), retrieval date, a hash of the
   source, and the transformation applied (extraction, normalisation, schema mapping). A contract
   test fails the build when a content file has no entry or an entry names a source other than the
   SRD.
3. **The SRD is the only source corpus** unless another licence is established explicitly and
   recorded here. A website or book being "official" is not a licence.
4. **Attribution.** The attribution statement is **copied from the SRD 5.2.1 document itself at the
   first import**, never retyped from memory, and shipped in a `NOTICE` file and in the product's
   credits. The brief gives the expected text:

   > This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards
   > of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under
   > the Creative Commons Attribution 4.0 International License, available at
   > https://creativecommons.org/licenses/by/4.0/legalcode.

   If the SRD's own text differs, the SRD's text wins and this record is corrected.

5. **Naming.** Internal identifiers are neutral (`srd5e`); generic code never depends on a display
   name. Public wording is "compatible with fifth edition" until a trademark review supports more.
6. **The code licence is unchanged.** The application is AGPL-3.0-only. Content is separately
   licensed data, identified per file; it is not relicensed.

## Alternatives considered

- **Content inside the system package.** Rejected: mixes licences in one tree and makes provenance
  checks a search instead of a rule.
- **Import from any convenient dataset.** Rejected: provenance is exactly what such datasets lack.

## Consequences

- Open items for the owner, not settled here: legal review of AGPL code carrying CC-BY content
  as separate data, the hosted-source-offer posture, and trademark wording.
- Homebrew and future content packs reuse the same manifest format.
- The first import (Phase 4) opens with a task to verify the attribution text against the SRD.
