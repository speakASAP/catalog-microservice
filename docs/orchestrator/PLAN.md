# Catalog Implementation Plan

## Execution Rule

Work one goal chunk at a time. Prefer a complete, verifiable chunk over starting multiple tracks.

## Active Goal

Goal 5 - Catalog/Warehouse Contract planning.

### Goal 1 Closure Evidence

- Commit `2611124` contains Goal 1 auth boundary and audit logging source/docs.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:2611124` on 2026-06-12.
- Production health check returned `healthy`.
- In-pod runtime smoke returned health `200`, anonymous category `POST` `401`, authorized category `POST` `201`, authorized cleanup `DELETE` `200`.
- Active pod logs emitted structured `catalog.write` entries for category create/delete with synthetic actor and request id.


### Goal 2 Closure Evidence

- Commit `fcb1919` was deployed to production with `./scripts/deploy.sh` on 2026-06-12.
- Production schema was inspected with `psql` before migration; `products` uses quoted `isActive`, matching the migration.
- `scripts/migrations/20260612_goal02_product_lifecycle.sql` applied successfully; `products.lifecycle`, `products_lifecycle_check`, and `idx_products_lifecycle` were verified.
- Deployment phases completed successfully: preflight, image build, push, manifest apply, rollout, and health check.
- Runtime in-pod smoke returned health `200`, preserved the `GET /api/products` envelope, created and updated synthetic lifecycle products, verified readiness lifecycle/checks/issues, verified quality audit `missingEan` and duplicate summary shapes, and removed all synthetic products through the hard-delete approval gate.
- Synthetic JWT was generated inside the pod from runtime secret and was not printed. A post-cleanup database check found zero `CODEX-GOAL2-%` products.


### Goal 3 Closure Evidence

- Commit `d222e11` contains Goal 3 pricing integrity source/docs.
- Branch `feature/catalog-goal-03-pricing-integrity` was pushed to `origin`.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:d222e11` on 2026-06-12.
- Production health check returned `healthy`.
- Runtime in-pod smoke verified invalid pricing rejection, deterministic sale current-price selection, mass pricing guard rejection without human review, mass pricing acceptance with `x-human-review: explicit`, audit-log metadata, and synthetic cleanup.


### Goal 4 Closure Evidence

- Commit `75d0700` contains Goal 4 channel readiness source/docs.
- Branch `feature/catalog-goal-04-channel-readiness-model` was pushed to `origin`; deployment ran from current branch head `5f0e087`.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:5f0e087` on 2026-06-13.
- Production health check returned `healthy`.
- Runtime in-pod smoke created a synthetic incomplete product, verified `GET /api/products/:id/channel-readiness` returned `200`, two channel entries, FlipFlop missing fields for description/categories/media/pricing, and Bazos draft readiness with `authority: "bazos"` and policy-deferred issue.
- Runtime smoke verified no Bazos publish-permission fields and cleaned the synthetic product through the hard-delete approval gate.
- Post-cleanup search for `CODEX-GOAL4` returned zero products. Synthetic JWT was generated inside the pod from runtime secret and was not printed.

### Goal 2 Planning Chunk

Deliverables:

- Execution plan for product lifecycle/readiness diagnostics.
- Source inspection of product entity, DTO/service/controller, media model, and existing response contracts.
- Pre-coding gate evidence before model/API changes.

Verification:

- Goal 2 plan names applicable invariants and validation commands.
- Public product read compatibility is preserved by design before coding.

## Next Goal Selection

Goal 4 is complete. Start Goal 5 planning and pre-coding gate according to `implementation-goals/GOAL-05-catalog-warehouse-contract.md`.
