# Catalog Channel Business Health Handoff - 2026-07-06

## Intent Preservation Chain

- Vision: Catalog remains the product truth service while Warehouse remains the stock, reservation, movement, and logistics authority for sellable availability across every channel.
- Goal Impact: Operators and channel owners can assess business health without mutating products, prices, stock, listings, or external marketplaces.
- System: Catalog aggregates read-only product identity, channel readiness, Warehouse availability, Warehouse coverage/logistics diagnostics, and channel projection/status evidence. Warehouse owns quantities and route truth. Channel services own channel-specific publication, compliance, checkout, storefront, and marketplace mutation decisions.
- Feature: Catalog-owned read-only business-health handoff for Warehouse/Catalog/channel availability consistency.
- Task: Define what Catalog can prove, what can be aggregated, how mismatches are classified, and which external mutation facts remain gated.
- Execution Plan: This document. No source implementation or runtime mutation is included in this pass.
- Coding Prompt: If a future verifier is added, keep it source-only/read-only, use existing protected Catalog/Warehouse readiness endpoints, do not print secrets or raw customer data, and preserve `[MISSING: ...]` blockers instead of fabricating stock/channel authority.
- Code: `docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md` only.
- Validation: `git diff --check` on the remote `catalog-microservice` checkout after this handoff is written.
- State Update: This handoff is a read-only orchestration artifact. It does not update product, pricing, stock, deployment, Kubernetes, secret, or marketplace state.

## Catalog Ownership Boundaries

Catalog can own and report:

- Product identity and sellable content: product ID, SKU, title, description, lifecycle, active state, categories, media references, duplicate SKU/EAN checks, and current Catalog pricing presence.
- Catalog-side readiness aggregation: `GET /api/products/:id/channel-readiness` reports channel entries with `ready`, `status`, `missingFields`, `issues`, `nextAction`, `authority`, and optional Warehouse coverage facts.
- Warehouse availability forwarding: `POST /api/products/availability/batch` validates Catalog product IDs, calls Warehouse read APIs, returns Warehouse-sourced `totalQuantity`, `totalReserved`, `totalAvailable`, per-warehouse rows, and consistent logistics plans when Warehouse route totals match availability totals.
- Warehouse coverage diagnostics: `POST /api/products/availability/coverage` and `GET /api/products/availability/coverage/audit` classify Catalog products as `covered`, `missing_stock`, or `missing_route`; identify `local_stock`, `supplier_stock`, `dropship_stock`, `mixed_stock`, or `out_of_stock`; and report `sellableWithWarehouse`, route counts, blocking reasons, and origin totals.
- Channel projection readiness signals: FlipFlop readiness is blocked unless Catalog fields, current pricing, and sellable Warehouse coverage are present. Bazos draft readiness can prove product truth readiness for draft request only, while preserving Bazos authority for compliance and publishing.

Catalog must not own or perform:

- Stock quantity, reservation, movement, warehouse location, or route mutation.
- Product mutation as part of this lane.
- Pricing changes.
- Channel publish, delete, de-list, relist, queue mutation, or marketplace-side state changes.
- Kubernetes, deployment, secret, credential, or runtime configuration changes.
- External marketplace authorization decisions or account challenge handling.

## Read-Only Evidence Sources

### Warehouse Availability And Coverage

Use these Catalog-owned read paths for business-health aggregation:

- `POST /api/products/availability/batch`: proves the Warehouse availability payload Catalog can forward for explicit product IDs. Evidence fields are `source=warehouse`, `totalQuantity`, `totalReserved`, `totalAvailable`, `warehouses[]`, and optional `logistics`.
- `POST /api/products/availability/coverage`: proves sellability classification for explicit product IDs. Evidence fields are `coverageStatus`, `stockOrigin`, `sellableWithWarehouse`, `localAvailable`, `supplierAvailable`, `dropshipAvailable`, `routeCount`, `preferredRoute`, and `blockingReasons`.
- `GET /api/products/availability/coverage/audit?page=1&limit=20&isActive=true`: proves paginated active-product coverage for operator health views without changing products or stock.
- `scripts/check-stock-credential-wiring.sh`: proves secret wiring and deployment readiness metadata without reading secret values or mutating Kubernetes/secrets.
- `scripts/run-stock-acceptance-gates.sh`: existing full read-only acceptance gate combining credential wiring, Warehouse authority verification, Allegro dry-run verification against Warehouse, Catalog Warehouse credential preflight, and Catalog channel propagation smoke.

Warehouse coverage is not treated as sellable unless `sellableWithWarehouse=true`. Positive quantity alone is insufficient when route evidence is absent or inconsistent; Catalog maps that to `missing_route` with `warehouse_logistics_route_missing`.

### Channel Projections And Readiness

Catalog can aggregate these read-only readiness/projection facts:

- `GET /api/products/:id/channel-readiness`: current source has `flipflop` and `bazos_draft` channel entries. This endpoint is read-only and builds readiness from Catalog truth, current pricing presence, product quality checks, and Warehouse coverage.
- FlipFlop projection contract `POST /api/products/projections/flipflop/batch`: protected read projection for FlipFlop product truth, current pricing alias, Warehouse availability/logistics, `stockQuantity`, and FlipFlop readiness. By default it excludes unavailable products unless `includeUnavailable=true`.
- `scripts/catalog-smoke.js` with `CATALOG_SMOKE_AUTHORIZED=true`, `CATALOG_SMOKE_ASSERT_STOCK=true`, and `CATALOG_SMOKE_ENABLE_CHANNEL_STATUS=true`: validates protected channel status/readiness read paths and stock evidence when authorized service credentials are available.
- Contract docs: `docs/contracts/flipflop-catalog-projection.md`, `docs/orchestrator/STOCK_RECONCILIATION_CORRECTED_2026-06-29.md`, and `docs/orchestrator/TASK-STOCK-004-warehouse-stock-propagation-plan.md` provide prior read-only evidence and unresolved source blockers.

Catalog can aggregate channel-readiness health by product and channel as:

| Health bucket | Catalog evidence | Meaning |
|---|---|---|
| `ready` | Channel `ready=true`, no blocking issues, and Warehouse coverage sellable where required | Catalog-side prerequisites are satisfied for the channel-owned consumer to proceed. |
| `needs_review` | Warning issues such as `needs_review`, placeholder media, or Bazos policy deferral | Product/channel may need owner or channel review before operational use. |
| `blocked` | Blocking issue codes such as `warehouse_stock_missing`, `warehouse_logistics_route_missing`, `missing_current_price`, `inactive_product`, duplicate SKU/EAN, missing media/category/title/description | Catalog can prove the product is not ready for channel use. |
| `unknown` | Endpoint unavailable, credentials unavailable, channel service read path absent, or source facts missing | Do not infer readiness; report `[MISSING: ...]` or `[UNKNOWN: ...]`. |

## Mismatch And Debt Classification

Use this classification when business-health evidence disagrees:

### Live Regression

Classify as live regression when a previously valid read-only contract now fails or contradicts current authoritative evidence:

- Catalog availability/coverage endpoint returns non-2xx for valid Catalog product IDs with known good service credentials.
- Warehouse returns a positive availability row, but Catalog coverage drops/changes it without a documented `missing_route` or consistency reason.
- Catalog attaches stale Warehouse logistics where product ID or total quantity/reserved/available does not match Warehouse availability. Current source is expected to ignore stale logistics and block route coverage.
- `sellableWithWarehouse=true` appears with `totalAvailable<=0`, no warehouse rows, or no traceable reservable route.
- Channel readiness says `ready=true` while its own returned `warehouseCoverage` has `sellableWithWarehouse=false` for a channel that requires stock.
- Protected smoke/acceptance scripts fail after a clean checkout with the required runtime credentials available.

### Business/Data Mismatch

Classify as business/data mismatch when services behave consistently but business expectations are not represented in authoritative data:

- Owner expects about 30 current SKUs or an about-300-unit item, but current Warehouse/Allegro/source evidence does not expose that physical stock.
- Catalog has active/order-history product rows without Warehouse stock rows or reservable logistics routes.
- Channel caches or local drafts have stale stock/offer records that do not match Warehouse availability.
- A product has Warehouse stock but route metadata is missing or supplier/dropship ownership data is incomplete.

Business/data mismatch is not automatically a Catalog code regression. It remains blocked until the authoritative stock/source owner supplies a current source artifact or approves a data correction path.

### Validation Debt

Classify as validation debt when the system may be healthy but the proof is incomplete:

- `JWT_TOKEN` or approved service token is unavailable for docs-rag, Catalog authorized smoke, Warehouse preflight, or channel status smoke.
- A read-only channel endpoint exists but no focused smoke/verifier records its health.
- A channel is covered only in docs but not in `src/channel-readiness` rules yet.
- Heureka/Aukro/Bazos/Allegro external readiness can be probed only through protected service routes that are not available in this run.
- The acceptance gate is not run because runtime credentials or cluster access are outside the lane.

Validation debt must be reported separately from live regressions so the owner can decide whether to fund verifier coverage or runtime credential handoff.

## External Marketplace Mutation Blockers

These facts remain gated before any publish/delete/de-list/relist or stock import mutation can be considered:

- `[MISSING: owner-approved authoritative physical stock source for stock beyond current Warehouse/Allegro-active evidence]`.
- `[MISSING: explicit approval for any Warehouse stock mutation/import]`.
- `[MISSING: channel-owner approval for marketplace publish/delete/de-list/relist actions]`.
- `[MISSING: account-specific marketplace credential/runtime packet for mutating marketplace flows]`.
- `[MISSING: compliance decision from the owning channel service for Bazos/Aukro/Allegro/Heureka publish behavior]`.
- `[MISSING: rollback and idempotency evidence for any mutating external action]`.

Until those facts exist, Catalog business-health output must remain read-only and fail closed. Catalog can say a product is ready for a channel-owned workflow; it cannot perform or imply marketplace mutation authority.

## Agent-Ready Parallel Execution

This handoff itself is single-file final integration. Downstream work can be split safely only if each lane keeps file ownership disjoint.

### Workstream A - Catalog Business-Health Verifier

- Status: ready now.
- Owner role: Catalog verifier agent.
- Objective: Add a narrow source-only verifier that aggregates `coverage/audit` and `channel-readiness` for a bounded page/product list without mutating data.
- Scope: `scripts/verify-business-health-catalog-channel-contract.js` and optional `package.json` script only if the worktree is clean and no concurrent package changes exist.
- Allowed files: the verifier script; optional package script.
- Forbidden files: product services, pricing services, channel publish code, migrations, Kubernetes, secrets, deploy scripts.
- Expected output: JSON summary with coverage totals, readiness buckets, missing/gated facts, and no secret/raw customer payloads.
- Dependencies: approved runtime token or explicit unauthenticated mode limited to public health/read-only endpoints.
- Blockers: `[MISSING: approved token/runtime packet for protected live endpoint verification]`.
- Validation evidence: `node scripts/verify-business-health-catalog-channel-contract.js ...` plus `git diff --check`.
- Handoff notes: do not treat verifier absence as live regression; this is validation debt until implemented.

### Workstream B - Channel Rule Expansion

- Status: dependency-gated.
- Owner role: Catalog/channel contract agent.
- Objective: Add explicit read-only readiness rules for Allegro, Aukro, Heureka, and additional channel projections if product/channel contracts are stable.
- Scope: `src/channel-readiness/*` and focused tests only.
- Allowed files: channel-readiness service/types/specs and docs for the added contracts.
- Forbidden files: channel publish/delete/de-list implementation, marketplace adapters, auth secrets, Warehouse mutation logic.
- Expected output: additional channel entries preserving external channel authority and using Warehouse coverage fail-closed where stock is required.
- Dependencies: `[MISSING: stable channel-owned readiness contract fields for Allegro/Aukro/Heureka]`.
- Blockers: channel services own compliance and marketplace mutation state.
- Validation evidence: focused unit tests and authorized read-only smoke where runtime packet exists.
- Handoff notes: merge after Workstream A or with an integration owner because both affect business-health reporting semantics.

### Workstream C - Runtime Evidence Refresh

- Status: dependency-gated.
- Owner role: orchestration validator.
- Objective: Run the existing read-only stock acceptance gate and summarize current Warehouse/Catalog/channel consistency.
- Scope: commands only; no source edits.
- Allowed commands: `git diff --check`, `bash scripts/check-stock-credential-wiring.sh`, `bash scripts/run-stock-acceptance-gates.sh` when cluster/runtime credentials are available.
- Forbidden actions: deploy, secret edits, stock import, product mutation, marketplace mutation.
- Expected output: dated validation report with pass/fail/debt split.
- Dependencies: `kubectl` access and approved runtime credentials in the target environment.
- Blockers: `[MISSING: runtime credential packet if protected checks cannot run]`.
- Validation evidence: exact command statuses and summarized JSON output.
- Handoff notes: classify command failure by credential/environment/code contract before assigning ownership.

## Shared Contracts And Merge Order

- Shared contracts: Warehouse availability/coverage response types, Channel readiness response types, FlipFlop projection contract, stock acceptance gate summary contract.
- Integration owner: Catalog orchestrator.
- Validation owner: orchestration validator.
- Merge order: Workstream A verifier first, Workstream B channel rules second, Workstream C runtime evidence after source changes or whenever credentials are available.
- Conflict rule: do not let multiple agents edit `src/channel-readiness/*` or `package.json` concurrently without an integration owner and explicit merge order.

## Current Handoff

Catalog can provide a read-only business-health view today from existing endpoints and scripts. The strongest Catalog-owned proof is Warehouse coverage plus channel readiness: a product is healthy for Catalog-side channel consumption only when Catalog product truth is complete, current pricing exists, Warehouse coverage is sellable where required, and the owning channel readiness entry is not blocked.

The open blockers are not Catalog product/pricing implementation tasks. They are external source, runtime credential, or channel-owner mutation approvals. Until those are provided, Catalog must keep health reporting read-only and classify unavailable facts explicitly as `[MISSING: ...]` or `[UNKNOWN: ...]`.
