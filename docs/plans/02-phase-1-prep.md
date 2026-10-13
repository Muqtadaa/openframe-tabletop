# Phase 1 preparation

Phase 1 is _Game, Scene, membership and system foundation_ (see [the brief](openframe-tabletop-project-plan.md)).
Its exit: a user can create a Game, create several persistent Scenes, invite members with roles,
select the bundled SRD system, and switch between Scenes together. It does **not** build 5E sheets or
dynamic lighting.

This page holds what Phase 0 left to decide, the answers the owner has given, and what each one asks
of someone. It is updated as items close.

## Decided (owner, 2026-10-13)

| Decision          | Answer                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Infrastructure    | Separate everything: a new Supabase project, a new `openframe-tabletop-rooms` Worker and an `openframe-tabletop-assets` R2 bucket |
| Cloudflare plan   | Workers Paid for the Tabletop account now, so Tabletop and OpenFrame stop competing for one free Durable Object allowance         |
| Roles             | GM, co-GM, player, spectator. Owner is an account-level ability, not a fifth role; a Game has exactly one owner                   |
| T004 spike timing | Early in Phase 1, before the membership design is built, because identity-based admission and the audience tiers shape it         |

Rule 29 still binds on the paid plan: a room keeps no timer and a client sends only what somebody can
see. Paying for the allowance is not a licence to spend it.

The owner has already upgraded to Workers Paid and **cannot absorb an automatic overage charge**. That
makes cost control a requirement of Phase 1, set out below, and a gate on the first real deploy.

## Cost guard: no overage we cannot afford

### What Cloudflare will and will not do (checked against its documentation, 2026-10-13)

- **There is no hard spend cap for Workers, Durable Objects or R2.** Usage past the included amounts is
  billed automatically. The only Cloudflare-side control found is the **budget alert**
  (_Manage Account → Billing → Billable Usage → Set Budget Alert_): an email at a dollar threshold.
  Cloudflare describes it as informational only; it does not cap usage. Usage is processed once a day,
  so an alert arrives the day _after_ the threshold is crossed. The $5 plan fee is not counted toward
  it. (Hard, cost-based limits exist for AI Gateway only, which Tabletop does not use.)
- So the alert tells us in about a day; it cannot stop a runaway. **The stop has to be in our code.**
- What is billed, paid plan, per month:

  | Dimension           | Included                | Beyond that                          | How Tabletop could hit it                                                                          |
  | ------------------- | ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
  | DO duration         | 400,000 GB-s            | $12.50 per million GB-s, rounded up  | a room that cannot hibernate: 128 MB × every second awake, about 324,000 GB-s per room per 30 days |
  | DO requests         | 1 million               | $0.15 per million                    | each WebSocket connect, alarm and RPC call; incoming messages count 1 in 20                        |
  | DO storage (SQLite) | see the pricing page    | per rows read and written, stored GB | a chatty document log, or compaction that rewrites everything                                      |
  | R2 storage          | 10 GB                   | $0.015 per GB-month                  | map and token images, which Phase 2 makes large                                                    |
  | R2 operations       | 1M class A, 10M class B | $4.50 and $0.36 per million          | a client re-uploading or re-fetching in a loop                                                     |
  | R2 egress           | free                    | free                                 | not a cost risk                                                                                    |

  The one that can run away quietly is **duration**: it is wall-clock time, so anything that keeps a
  room awake (a timer, an unfinished I/O, an outbound socket, a connection that sends a message every
  few seconds) is billed for as long as it lasts. Rule 29 already forbids timers; the guard below makes
  the rest measurable and bounded.

### Layers, outermost first

1. **Alerts, owner action, before the first deploy.** Create budget alerts at **$1, $3 and $5** of
   usage-based spend (not the $10 default, which is already more than the monthly plan fee). Add a
   second email or phone that is read daily. The alert is a smoke detector, not a sprinkler.
2. **Payment-side ceiling, owner decision.** Because Cloudflare will not stop at a number, the only hard
   ceiling is how much the payment method can pay. A prepaid or virtual card with a fixed limit bounds
   what a month can cost. The trade-off to weigh: an unpaid invoice is likely to suspend the account
   rather than quietly continue, and that would take the rooms down. I have not verified Cloudflare's
   exact behaviour on a declined payment; check their billing documentation, and decide whether a
   stopped service is the failure you would rather have.
3. **Per-room limits in the room server. Built (2026-10-13).** A ceiling on live connections and on new
   connections per minute, per-socket and per-room message rates, a per-socket byte rate, a ceiling on the
   stored document, images held to 36 megapixels and (for a GIF) 6 MiB, and a cap of 200 images and 256 MiB
   per board. The values, why each was chosen, and the tests that hold them are in
   [09 · Collaboration](../architecture/09-collaboration.md#what-a-room-will-carry-the-cost-guard).
4. **A budget the room enforces itself.** Counters kept in the room's own storage (never a timer):
   requests, awake time as far as it can be known, bytes written. A Game past its daily allowance has
   its rooms refuse new work with a plain message instead of spending more. The allowance is a value
   we set from the **plan's** included amounts divided over the Games we expect, never "today's
   reading plus a margin" (the rule the benchmark budgets already follow).
5. **A kill switch. Built (2026-10-13).** Run the **Deploy rooms** workflow (GitHub, Actions, Deploy
   rooms, Run workflow) with `paused` set to **true**; set it back to **false** to resume. It works from a
   phone browser on github.com. A paused Worker wakes no room, closes sockets with a code the client words as
   "Paused · saved here", and refuses everything else with a five-minute wait. A pause skips the tests so it
   takes a couple of minutes, not half an hour. It needs the Worker deployed once first, with
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set (step "What the owner creates", item 3). Details:
   [09 · Collaboration](../architecture/09-collaboration.md#what-a-room-will-carry-the-cost-guard).
6. **No timers, held by tests. Built (2026-10-13).** `tools/rooms/no-timers.test.ts` reads every room-server
   source for `setTimeout` or `setInterval`; the limits are computed from the clock when something happens.

### Gate

**No deploy of the Tabletop rooms Worker to the owner's account until steps 1, 3 and 5 exist and
pass their tests,** and step 2 has been decided one way or the other. Steps 3 and 5 are built; step 1 (the
alerts) and step 2 are the owner's. The deploy workflow stays
manual-only until then. Step 4 follows once there are real counters to read; until it does, the daily
budget alert is the only signal, so keep the first deployed Games small and watch the Billable Usage
page daily.

## What the owner creates (nothing is provisioned yet)

Nothing here can be done from the repository, and nothing in it can reach a real backend until it is.
The committed values are placeholders on the reserved `.invalid` domain, guarded by
`app/detached.test.ts`.

1. **Supabase project**, in an organisation with a free slot or on the paid tier. Free projects pause
   when idle, which will bite a table that meets weekly. Give the repository the project URL and the
   publishable key (both public); keep the service-role key out of the repository.
2. **Cloudflare**: confirm the Workers Paid plan on the account that will host the Worker; create the
   R2 bucket `openframe-tabletop-assets`; create an API token for deploys.
3. **GitHub**: the Actions variable `CLOUDFLARE_ACCOUNT_ID` and the secret `CLOUDFLARE_API_TOKEN` that
   `.github/workflows/deploy-rooms.yml` reads. That workflow stays manual-only until the first three
   steps are done.
4. **Repository values** (public, committed): `VITE_COLLAB_URL`, `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env`, replacing the placeholders. `env-file.test.ts`
   fails the build if anything secret-shaped is added there.

## Work to queue, in order

0. **Cost guard** (above), steps 3 and 5 first. They protect the owner's account, so they come before
   anything that is deployed.
1. **T004 spike: audience-partitioned rooms.** Two rooms for one Scene, a player-visible document and
   a GM-layer document. Show a "reveal" that moves content between them is idempotent and recoverable
   if one half fails, and say which cases partitioning cannot express (for example per-player fog
   inside one document). Gate: no hide or reveal ships before it passes.
2. **T011 admission.** A short-lived signed ticket minted from membership, carrying Game, role and
   audience tiers, verified by the room without calling Supabase on the hot path. Decide whether
   spectators keep bearer links.
3. **T001 persistence.** The Game catalogue (membership, scene list, active scene) in Postgres under
   row-level security; one document and one room per Scene. This needs the first envelope v1 to v2
   migration with a frozen fixture (rule 6), and the remote meta filter widened to carry Scene
   settings.
4. **Game and membership domain**, in a package whose first real content justifies it (T008): roles
   to capabilities, one owner, invitation.
5. **Scene list, active Scene, create, delete, duplicate**, replacing the Board-backed scaffolding the
   shell carries today. The shell's marker comments point here.
6. **System identity.** A Game names its system; the bundled SRD is registered by the composition root
   only (T003). No sheets.
7. **Migration from Board semantics.** A Game is never a renamed Board (T001). Existing local boards
   stay readable; decide whether they import as a Scene of a new Game.

## Still open, owner or legal

- The product name is a working title. `@openframe/*`, `--of-*` and the `openframe:` storage keys stay
  until it is settled.
- Whether an AGPL application can carry CC-BY SRD 5.2.1 content as separately licensed data, and the
  AGPL source-offer posture before public hosting.
- OpenFrame's brand artwork has no stated licence. It stays in `docs/legacy` and is not reused.
