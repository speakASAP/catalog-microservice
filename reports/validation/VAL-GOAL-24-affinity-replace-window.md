# VAL-GOAL-24 Affinity Replace Window

Date: 2026-07-03

## Intent Compliance Report

- Vision: Catalog remains product truth and exposes bounded relation metadata only.
- Goal Impact: recurring Marketing order-affinity publishes can replace a complete source/window snapshot without broad deletion semantics.
- System: Catalog owns `product_relations`; Marketing owns ledger/scheduling/completeness; marketplace services own replay producers.
- Feature: internal `POST /api/internal/product-relations/order-affinity/replace-window`.
- Task: implement source/window scoped replacement and stale-row pruning for exact matching Marketing window evidence.
- Execution Plan: single Catalog owner source lane; no parallel edits because the shared relation API/service/docs are one ownership surface.
- Coding Prompt: fail closed on missing `completeSnapshot`, force `order_affinity`/`marketing_order_affinity`, stamp `evidence.orderAffinityWindow`, prune only exact same-window Marketing rows.
- Code: `src/product-relations/*`, `docs/contracts/catalog-product-relations.md`, `docs/contracts/catalog-marketplace-affinity-backfill.md`, `implementation-goals/GOAL-24-product-relations.md`.
- Validation: focused Jest, backend build, and `git diff --check`.
- State Update: Catalog source implementation complete; runtime deployment/smoke not run in this worker.

## Validation Evidence

- `npm test -- --runInBand src/product-relations/product-relations.service.spec.ts`: passed, 1 suite / 9 tests.
- `npm run build`: passed.
- `git diff --check`: passed.

## Remaining Blockers

- `[MISSING: Marketing durable run ledger proving a complete source/window snapshot]`
- `[MISSING: marketplace producer guarantee that replay window is complete and repeatable]`
- `[MISSING: owner-approved retention/decay policy for stale affinity rows]`
- `[MISSING: deployment approval and protected runtime smoke for replace-window endpoint]`
- `[MISSING: docs-rag JWT_TOKEN]`
