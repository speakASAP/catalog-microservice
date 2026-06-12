# Catalog Implementation Plan

## Execution Rule

Work one goal chunk at a time. Prefer a complete, verifiable chunk over starting multiple tracks.

## Active Goal

Goal 3 - Pricing Integrity planning.

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

### Goal 2 Planning Chunk

Deliverables:

- Execution plan for product lifecycle/readiness diagnostics.
- Source inspection of product entity, DTO/service/controller, media model, and existing response contracts.
- Pre-coding gate evidence before model/API changes.

Verification:

- Goal 2 plan names applicable invariants and validation commands.
- Public product read compatibility is preserved by design before coding.

## Next Goal Selection

Goal 3 is active for planning. Create the Goal 3 execution plan and run the pre-coding gate before pricing integrity source changes.
