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

## Runtime Deployment And Smoke Evidence

2026-07-03 protected runtime closure ran on remote `alfares` without printing token, secret, product id, customer, payment, or private data values.

Pre-deploy evidence:

- Remote worktree was clean on `main` at `70e2464 feat: add order affinity window replacement`, matching `origin/main`.
- Pre-deploy public `https://catalog.alfares.cz/health` returned HTTP 200.
- Pre-deploy runtime image was `localhost:5000/catalog-microservice:f88ae2a`, ready `1/1`.

Source validation rerun before deploy:

- `npm test -- --runInBand src/product-relations/product-relations.service.spec.ts`: passed, 1 suite / 9 tests.
- `npm run build`: passed.
- `git diff --check`: passed.

Deployment evidence:

- `./scripts/deploy.sh` completed successfully for `catalog-microservice` in 69.37s.
- Built and pushed image `localhost:5000/catalog-microservice:70e2464` with digest `sha256:4cb09554511a97d9fc8a995a00657fc845f1c6678e70bcb60d388421de920fc2`.
- Kubernetes rollout completed; deploy script in-pod health check returned healthy JSON.
- Post-deploy deployment state: image `localhost:5000/catalog-microservice:70e2464`, ready `1`, updated `1`, available `1`.
- Post-deploy public `https://catalog.alfares.cz/health` returned HTTP 200 and reported Catalog event and BPCP consumer connections `status=up`.

Protected runtime smoke evidence:

- Auth path: in-pod `CATALOG_INTERNAL_SERVICE_TOKEN` via `x-internal-service-token` and `x-service-name=catalog-goal24-runtime-smoke`; no token value printed.
- Fail-closed path: `POST /api/internal/product-relations/order-affinity/replace-window` with `completeSnapshot=false` returned HTTP 400 and message `completeSnapshot must be true for order-affinity window replacement`.
- Positive isolated path: smoke discovered a protected API product pair with no existing Marketing `order_affinity` relation from 20 candidate products; product ids were not printed.
- Positive isolated request returned HTTP 201 with `completeSnapshot=true`, summary `total=1`, `upserted=1`, `updated=0`, `failed=0`, `pruned=0`; subsequent protected related read found one matching canary row.
- Cleanup request for the same exact synthetic window with empty `items` returned HTTP 201 with summary `total=0`, `upserted=0`, `updated=0`, `failed=0`, `pruned=1`; subsequent protected related read found zero matching canary rows.

Caveat:

- An earlier non-isolated canary attempt used the first two protected API products and returned `updated=1`, then cleanup pruned that exact synthetic window. That result was not used as positive insertion evidence. The follow-up isolated smoke above selected a pair without an existing Marketing relation and left zero documented canary rows.

## Remaining Blockers

- `[MISSING: Marketing durable run ledger proving a complete source/window snapshot]`
- `[MISSING: marketplace producer guarantee that replay window is complete and repeatable]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`
- `[MISSING: docs-rag indexed Catalog Goal 24 order-affinity context]`

## Resolved Blockers

- `[RESOLVED: owner-approved retention/decay policy for stale affinity rows]`
- `[RESOLVED: deployment approval and protected runtime smoke for replace-window endpoint]`
- `[RESOLVED: docs-rag JWT_TOKEN available in live docs-rag pod and accepted for retrieval auth]`

## 2026-07-03 Retention Policy Closure

Selected policy: conservative exact source/window replacement only. `marketing_order_affinity` rows may be pruned only by `POST /api/internal/product-relations/order-affinity/replace-window` when the existing row's `evidence.orderAffinityWindow` exactly matches the request `sourceOwner`, `channel`, `windowStart`, `windowEnd`, and `runId`, and the row is omitted from the complete snapshot.

Retained rows: manual/curated/non-Marketing rows, non-window rows, rows from other windows or runs, checkout/product/price/stock/payment/marketplace-listing data, and legacy `marketing_order_affinity` rows without exact matching window evidence.

Decay support: none. Catalog does not support time-based deletion, score decay, confidence decay, manual/non-window pruning, standalone prune-window cleanup, or archival in Goal 24. Any future decay or archival requires a new owner-approved contract.

## 2026-07-03 Docs-RAG JWT Access Evidence

Sanitized commands/results:

- Live docs-rag pod environment check: JWT_TOKEN_PRESENT; token value was not printed.
- POST /retrieval/agent-context query catalog-microservice Goal 24 order affinity blockers: HTTP 200, response keys query, context, sources, estimatedTokens, bytes=110, contextChars=0, snippetCount=0.
- Fallback POST /retrieval/search query catalog-microservice Goal 24 order affinity blockers product relations: HTTP 200, response keys query, results, total, results=0, snippetCount=0.

Conclusion: docs-rag JWT_TOKEN access is resolved for Goal 24. Remaining blocker: `[MISSING: docs-rag indexed Catalog Goal 24 order-affinity context]` because retrieval authenticated successfully but returned no indexed chunks for the bounded topic.
