# VAL-GOAL-24 Bundle/Order-Affinity Contract

```yaml
id: VAL-GOAL-24-bundle-order-affinity-contract
date: 2026-07-03
repository: /home/ssf/Documents/Github/catalog-microservice
role: catalog orchestrator and integration validator
deployment: not run
database_mutation: not run
runtime_mutation: not run
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog relation facts can support product recommendations and future bundle flows without taking ownership of checkout, stock, payment, or marketplace publication.
- Goal Impact: Goal 24 is narrowed to explicit order-affinity replay data/publish gates and cross-service bundle-selling decisions.
- System: Catalog owns relation rows and read-only bundle candidates; Orders owns order/replay facts; Marketing owns affinity scoring/backfill; FlipFlop owns storefront checkout intent; Warehouse owns stock/reservations; Payments owns payment authorization/status.
- Feature: bundle/order-affinity contract refresh.
- Task: classify existing APIs, source evidence, and blockers after read-only cross-repo inspection.
- Execution Plan: use remote-only Alfares repos, read docs/source, preserve `[MISSING: ...]` and `[UNKNOWN: ...]`, and avoid runtime mutation.
- Coding Prompt: update contract and validation docs only; do not invent bundle fields, checkout ownership, or backend contracts.
- Code: `docs/contracts/catalog-product-relations.md`, `implementation-goals/GOAL-24-product-relations.md`, `docs/orchestrator/STATUS.md`, `docs/IMPLEMENTATION_STATE.md`, and this report.
- Validation: evidence below plus `git diff --check`.
- State Update: Goal 24 remains runtime-deployed for relation/bundle-candidate reads and dependency-gated for non-empty replay publish and ecosystem bundle selling.

## Scope

Changed only Catalog documentation and validation state. No service code, migrations, deployment scripts, Kubernetes manifests, generated files, secrets, runtime data, product rows, order rows, payment rows, stock/reservation rows, marketplace publication, or checkout flow was changed.

## Read-Only Subagents

Orders/Marketing replay explorer:

- Orders repo clean on `main` at `9f7fe69 docs: record order affinity replay rollout`.
- Marketing repo clean on `main` at `ebde634 docs: record order affinity backfill dry run`.
- Catalog Goal 24 paths were clean before this docs-only update.
- Orders documents `orders.order.created.v1` `payload.items[]` as the approved product-affinity snapshot.
- Orders exposes `GET /orders/internal/order-affinity/replay-candidates`.
- Marketing builds directed `order_affinity` candidates, aggregates historical replay records, reads Orders replay, and publishes to Catalog only when configured.
- Catalog exposes `POST /api/internal/product-relations/order-affinity/batch` and forces `marketing_order_affinity`.

Bundle/checkout explorer:

- Catalog Goal 24 is deployed as relation and bundle-candidate foundation only.
- FlipFlop has a local bundle-intent checkout path that submits identifiers, recomputes eligibility/savings server-side, creates a central Orders UUID before payment, and sends Payments final server totals.
- Orders has product-affinity replay evidence and canonical item lines, but no ecosystem bundle create-order primitive.
- Payments accepts a final central `orderId`, `amount`, and `currency`; it must not infer bundle pricing.

## Validation Evidence From Read-Only Explorers

Reported command results:

- Orders `npm run verify:order-affinity-replay`: passed, 14/14 checks.
- Marketing `npx tsx --test --test-concurrency=1 test/order-affinity-backfill.test.ts`: passed, 3/3 tests.
- Catalog `npm test -- --runInBand src/product-relations/product-relations.service.spec.ts`: passed, 7/7 tests.
- Live read-only Marketing dry-run against internal Orders URL: `inputRecords=0`, `acceptedCreatedEvents=0`, `aggregatePairs=0`, `candidates=[]`.
- Owner-approved synthetic/non-production fixture dry-run: Marketing accepted 2 synthetic Orders-created events, rejected 0, skipped 0, produced 2 directed candidates, and did not publish to Catalog.

## Synthetic Non-Production Replay Proof

Command:

```bash
npm run backfill:order-affinity -- --file /tmp/goal24-synthetic-order-affinity-fixture.json --run-id goal24-synthetic-nonprod-20260703 --limit=10 --dry-run --pretty
```

Result:

- `mode=dry-run`
- `inputRecords=2`
- `acceptedCreatedEvents=2`
- `rejectedRecords=0`
- `skippedEvents=0`
- `aggregatePairs=2`
- `totalPairEvidence=4`
- Candidate pair `ce4a51aa-2d12-4ab7-a965-7a36609d01fc -> dbc51dde-fc66-4511-b178-f929183f4647`: `score=2`, `confidence=0.65`, `source=marketing_order_affinity`.
- Candidate pair `dbc51dde-fc66-4511-b178-f929183f4647 -> ce4a51aa-2d12-4ab7-a965-7a36609d01fc`: `score=2`, `confidence=0.65`, `source=marketing_order_affinity`.

Boundary: no `--publish`, no Catalog relation write, no live Orders row mutation, no Warehouse/Payments/checkout mutation, no deployment, no secret output, and no customer/address/payment/provider data.

## Allegro Live Catalog Publish

Owner approval was used for an already-qualified marketplace source, not for central Orders mutation or bundle checkout.

Commands and results:

- Dry-run with `/tmp/allegro-affinity-events.validated.json`: failed closed with `order_event_source_invalid=8`; no publish attempted.
- Dry-run with `/tmp/allegro-affinity-events.json`: `inputRecords=8`, `acceptedCreatedEvents=8`, `rejectedRecords=0`, `skippedEvents=0`, `aggregatePairs=16`, `totalPairEvidence=16`, `byChannel.allegro=8`.
- Host-side source publish: `publish.status=disabled`, `candidateCount=16`, `batchCount=0`, `reason=publisher_disabled`; no Catalog write.
- Deployed Marketing pod publish: `publish.status=published`, `candidateCount=16`, `batchCount=1`.
- Catalog aggregate DB readback: `source=marketing_order_affinity`, `relation_type=order_affinity`, `channel=allegro`, `relation_count=16`, `min_score=1`, `max_score=1`, `min_confidence=0.5`, `max_confidence=0.5`.

Boundary: Catalog relation rows were inserted/updated through the approved internal batch endpoint only. No central Orders row, Warehouse row, Payments row, checkout/cart state, product row, marketplace offer/listing, deployment, Kubernetes manifest, or service source code was changed. No customer/buyer/address/payment/provider data, raw marketplace payloads, token values, or secret values were printed.


## Scheduled Marketplace Backfill Contract

Owner-approved Allegro publish evidence is now separated from durable scheduling infrastructure.

Defined contract:

- `docs/contracts/catalog-marketplace-affinity-backfill.md`

Key decisions:

- Marketplace services must own protected replay endpoints or equivalent owner-run exports for their local order history.
- Allegro is the first ready producer because its one-time qualified evidence already published 16 Catalog relations.
- Marketing must add parser/normalizer support for marketplace-owned source envelopes; the current parser only accepts `source=orders-microservice`, and the direct `source=allegro-service` dry-run failed closed with `order_event_source_invalid=8`.
- Marketing must add a durable backfill run ledger and scheduled dry-run-first orchestration before marketplace-wide automation.
- Catalog remains upsert-only until a source/window scoped pruning or replacement API and owner retention policy exist.

New blockers:

- `[MISSING: Marketing parser support for marketplace-owned replay source envelopes]`
- `[MISSING: durable Marketing backfill run ledger and idempotency key registry]`
- `[MISSING: Allegro-owned protected replay endpoint so future runs do not require a temporary SQL export]`
- `[MISSING: scheduled dry-run matrix across Allegro, Aukro, Bazos, FlipFlop, and central Orders]`
- `[MISSING: Catalog source/window scoped stale-affinity pruning or replacement API]`
- `[MISSING: owner-approved retention/decay policy for stale affinity rows]`

## Local Validation

```bash
git diff --check
```

Result: passed. No whitespace errors were reported.

```bash
for f in scripts/pre_coding_gate.py scripts/strict_doc_audit.py; do if test -f "$f"; then echo "FOUND $f"; else echo "MISSING $f"; fi; done
```

Result: `scripts/pre_coding_gate.py` and `scripts/strict_doc_audit.py` are missing in this branch, so the documented `[MISSING: ...]` blockers remain active.

## Contract Findings

Ready source contracts:

- `GET /api/products/:productId/related`: protected Catalog relation read.
- `GET /api/products/:productId/bundle-candidates`: protected read-only bundle-candidate projection from existing `order_affinity` rows.
- `POST /api/internal/product-relations/order-affinity/batch`: protected internal/admin batch upsert surface for Marketing-derived order affinity.
- Orders replay candidates and Marketing backfill tooling exist and are dry-run-first.

Dependency-gated runtime actions:

- Non-empty historical replay publish is gated by qualifying paid multi-product Orders rows.
- Any future publish run requires owner-reviewed mutation scope and pruning/replacement semantics for stale affinity rows.

Blocked ecosystem bundle selling:

- The current Catalog endpoint returns display metadata only, not a sellable bundle.
- FlipFlop-local bundle intent does not answer whether Catalog should own a durable bundle aggregate or product-like SKU.
- Orders, Warehouse, and Payments need explicit contracts before real ecosystem bundle selling can move beyond local FlipFlop intent.


## 2026-07-03 Docs-RAG JWT Access Evidence

Sanitized commands/results:

- Live docs-rag pod environment check: JWT_TOKEN_PRESENT; token value was not printed.
- POST /retrieval/agent-context query catalog-microservice Goal 24 order affinity blockers: HTTP 200, response keys query, context, sources, estimatedTokens, bytes=110, contextChars=0, snippetCount=0.
- Fallback POST /retrieval/search query catalog-microservice Goal 24 order affinity blockers product relations: HTTP 200, response keys query, results, total, results=0, snippetCount=0.

Conclusion: `[MISSING: docs-rag JWT_TOKEN]` is resolved for Goal 24 access. Remaining blocker: `[MISSING: docs-rag indexed Catalog Goal 24 order-affinity context]` because retrieval authenticated successfully but returned no indexed chunks for the bounded topic.

## Blockers

- `[RESOLVED: docs-rag JWT_TOKEN available in live docs-rag pod and accepted for retrieval auth]`
- `[MISSING: docs-rag indexed Catalog Goal 24 order-affinity context]`
- `[MISSING: qualifying historical paid multi-product Orders rows for non-empty central Orders replay evidence]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill from live central Orders]`
- `[MISSING: pruning/replacement semantics for stale affinity rows]`
- `[MISSING: Catalog bundle ownership decision: read-only candidate, standalone bundle aggregate, or product-like SKU]`
- `[MISSING: Orders bundle create-order contract and bundle identity representation beyond normal line items]`
- `[MISSING: Warehouse bundle reservation contract for stock and fulfillment effects]`
- `[MISSING: Payments metadata policy for bundle/free-shipping evidence without making Payments pricing truth]`
- `[MISSING: explicit discount/price presentation policy for bundle candidates]`
- `[MISSING: approved real checkout smoke scope]`
- `[UNKNOWN: whether current live Orders history should contain paid multi-product rows or whether upstream order capture is still empty]`

## Parallel Execution

- `ready now`: Orders replay contract maintenance. Owner role: Orders worker. Scope: source-only verifier/fix lane for replay event shape and filtering.
- `ready now`: Marketing dry-run/export/backfill hardening. Owner role: Marketing worker. Scope: source-only verifier/fix lane for dry-run aggregation and Catalog publisher guards.
- `ready now`: Catalog relation API maintenance. Owner role: Catalog worker. Scope: protected related-products, bundle-candidates, and internal batch endpoint maintenance.
- `dependency-gated`: non-empty affinity publish. Owner role: integration validator. Dependencies: qualifying rows, publish window, pruning semantics.
- `dependency-gated`: Catalog durable bundle aggregate/API. Owner role: commerce/Catalog architect. Dependency: ownership decision.
- `blocked`: real ecosystem bundle selling. Owner role: FlipFlop/Orders/Payments/Warehouse integration. Dependencies: order, stock, payment, discount, and smoke contracts.

Shared contracts: Catalog product relations contract, Orders order-event contract, Marketing orders-events integration contract, and any future bundle checkout contract.

Integration owner: Catalog orchestrator until a commerce integration owner is assigned.

Validation owner: integration validator.

Merge order: source contract verification, then non-empty replay evidence, then owner-reviewed publish, then bundle-selling implementation only after cross-service contracts are approved.

## Next Action

Implement W1 Allegro protected replay producer or owner-run CLI export, then update Marketing parser support for marketplace-owned replay envelopes before enabling any scheduled publish.
