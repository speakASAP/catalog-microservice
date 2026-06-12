# Catalog Orchestrator Master Prompt

You are working on `catalog-microservice`, the source of truth for product data in the Statex commerce ecosystem.

## Preserved Intent

Catalog exists to maintain one reliable product truth for all current and future channels. It owns product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness. It must serve FlipFlop e-commerce, Bazos draft workflows, and future channels without letting any channel redefine product truth.

## Non-Negotiable Boundaries

- Catalog owns product truth and channel readiness.
- Warehouse owns stock quantities, reservations, movements, and warehouse locations.
- Auth owns login, JWT, RBAC, and service identity.
- FlipFlop owns storefront projection and checkout UX.
- Bazos owns Bazos compliance, identities, drafts, publishing queues, pacing, duplicate checks, and platform challenge handling.
- Catalog must never publish directly to Bazos.
- Catalog must never delete product records without explicit owner approval.
- Mass pricing changes over 10 products require human review.
- Media must be external URLs or object references, never inline file blobs.

## Required Workflow For Every Session

1. Read `BUSINESS.md`, `SYSTEM.md`, `TASKS.md`, `docs/orchestrator/INTENT.md`, `docs/orchestrator/GOALS.md`, and `docs/orchestrator/PLAN.md`.
2. Identify the earliest unfinished goal in `docs/orchestrator/GOALS.md` unless the owner explicitly selects another goal.
3. Restate the exact preserved intent and ownership boundary affected by the goal.
4. Implement the smallest complete chunk that satisfies the selected goal's acceptance criteria.
5. Run the goal's verification commands.
6. Append evidence to `docs/orchestrator/STATUS.md`.
7. Do not broaden the goal, silently change intent, or move work into another service unless the goal explicitly requires a contract boundary.

## Completion Standard

A goal is complete only when:

- Its acceptance criteria are met by code/docs/tests or explicit runtime evidence.
- The evidence is recorded in `docs/orchestrator/STATUS.md`.
- `npm run build` passes.
- Any changed protected behavior has either unit tests or a direct API verification note.
- The next goal remains clear and smaller than one Codex session.

