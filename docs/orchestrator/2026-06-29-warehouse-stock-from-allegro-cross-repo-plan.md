# Cross-Repo Plan: Warehouse Stock From Allegro Truth

Date: 2026-06-29
Owner: Codex orchestration thread
Remote base: `/home/ssf/Documents/Github`
Primary operator URL: `https://catalog.alfares.cz/dashboard/products/884c1c5e-fe94-46c7-aab1-78bcc424e7ee`

## Current Live Context

- Existing active Codex thread `019f1315-d7a9-7282-abe7-c3cfc7d36eab` is already working in `allegro-service` on importing Allegro stock amounts.
- That thread has committed and deployed `allegro-service` commit `2db3841 Import Allegro offer stock into Warehouse`.
- The deployed Allegro fix maps Allegro `stock.available`-style quantities to Warehouse `/api/stock/set`, sends Warehouse audit fields as `reasonCode/reference`, and adds service-token headers for Warehouse calls.
- The Allegro backfill for account `FlipFlop` returned 9 visible offers, not the expected 1000+ products. Therefore the larger stock truth is still `[UNKNOWN: which Allegro account, offer scope, CSV/import source, or marketplace source contains the expected 1000+ stock rows]`.
- Remote repo preflight on 2026-06-29:
  - `allegro-service`: clean `main`, `2db3841`
  - `catalog-microservice`: clean `main`, `a496f70`
  - `warehouse-microservice`: clean `main`, `ed6a515`
  - `aukro-service`: clean `main`, `190e0d9`
  - `bazos-service`: clean `main`, `3c4cbd5`

## Intent Preservation Chain

### Vision

Alfares sales channels must never sell more units than Alfares can fulfill.

### Goal Impact

Operators must see real Warehouse-backed stock on Catalog product detail pages, and all selling applications must use Warehouse availability/reservations as the availability authority before publication, checkout, and fulfillment.

### System

- `warehouse-microservice` is the stock quantity, movement, reservation, and event authority.
- `catalog-microservice` owns product identity and exposes Warehouse-backed availability/projections without persisting stock as Catalog truth.
- `allegro-service` is currently the initial import source because Allegro contains the most accurate known stock amount.
- Sales channels such as FlipFlop, Allegro, Aukro, Bazos, Heureka, and future apps consume Catalog/Warehouse availability and must reserve/decrement through Warehouse before accepting orders.

### Feature

Warehouse-backed inventory propagation:

1. Import stock quantities from Allegro into Warehouse.
2. Display Warehouse quantities on Catalog product detail pages.
3. Expose/verify Catalog availability contracts for channel consumers.
4. Ensure sales channels publish and sell only Warehouse-available quantities.
5. Keep stock changes auditable through `reasonCode`, actor/service identity, and reference.

### Tasks

#### TASK-STOCK-001: Complete Allegro import/backfill evidence

Objective: Finish the existing Allegro thread's runtime verification and identify the correct source for the expected 1000+ stock rows.

Scope:
- `allegro-service`
- Runtime-only verification artifacts under `/tmp`
- No raw secret output

Allowed files:
- Existing `allegro-service` import scripts if the active thread finds a bug
- Runtime verifier scripts under `/tmp`
- Validation notes under repo docs if needed

Forbidden files:
- Unrelated marketplace flows
- Raw Kubernetes/Vault secret values in tracked files or chat
- Destructive DB changes

Expected output:
- Evidence for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`: Allegro source quantity, Warehouse stored quantity, and Catalog availability response.
- Account/source inventory explaining why only 9 offers were returned from `FlipFlop` and where the expected 1000+ rows live, or `[UNKNOWN: ...]` with exact failed checks.

Validation:
- Read Warehouse availability through service API, not direct DB only.
- Verify `/api/stock/availability/batch` returns the same available amount Catalog sees.
- Preserve log excerpts without tokens.

#### TASK-STOCK-002: Catalog product detail Warehouse stock card

Objective: Show Warehouse stock amounts on `https://catalog.alfares.cz/dashboard/products/:id`, including total quantity, reserved, available, warehouse rows, and sellability/route status.

Scope:
- `catalog-microservice`
- Frontend API client and product detail page
- Reuse existing `POST /api/products/availability/batch`

Allowed files:
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/dashboard/products/[id]/page.tsx`
- Focused frontend tests if the repo has a practical existing pattern
- `docs/orchestrator/STATUS.md` update

Forbidden files:
- Catalog database schema
- Warehouse mutation endpoints
- Channel publishing logic

Expected output:
- Product detail page renders a Warehouse availability section.
- Loading/error states are visible and do not block editing product fields.
- The card states that source is Warehouse and shows per-warehouse rows.

Validation:
- `npm run build`
- Focused tests if available
- Live or local smoke for the target route if deploy is performed

#### TASK-STOCK-003: Warehouse backfill and stock propagation validation

Objective: Prove Warehouse contains usable availability rows and events for imported stock, then document any missing propagation path.

Scope:
- `warehouse-microservice`
- Read-only runtime validation by default
- Mutating backfill only through approved import scripts and Warehouse APIs

Allowed files:
- Validation report under `docs/intent-preservation/validation-reports/`
- Focused scripts under `/tmp` for runtime evidence
- Small test additions if contract gaps are found

Forbidden files:
- Manual direct DB stock edits
- Destructive warehouse row cleanup
- Raw secrets in tracked files

Expected output:
- Validation report for stock authority and product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`.
- Confirmation that Warehouse emits stock events/outbox entries on `setStock`, or `[MISSING: event publication evidence]`.

Validation:
- `GET /api/stock/:productId`
- `POST /api/stock/availability/batch`
- Reservation path sanity where safe: reject over-reservation and allow bounded reservation only with explicit approval for synthetic or reversible data.

#### TASK-STOCK-004: Sales channel sellability and reservation audit

Objective: Audit FlipFlop, Allegro, Aukro, Bazos, and other active sales apps for places that can publish/sell without Warehouse-backed availability or reservation.

Scope:
- `catalog-microservice` channel endpoints
- `allegro-service`, `aukro-service`, `bazos-service`
- FlipFlop repo path is `[UNKNOWN: remote repo name; local project label is /Users/Sergej.Stasok/Documents/alfares]`

Allowed files:
- Read-only findings first
- Channel-specific docs or small contract tests after integration owner approval

Forbidden files:
- Parallel edits to shared public contracts without integration-owner sequencing
- Channel behavior changes before TASK-STOCK-001/002 contracts are confirmed

Expected output:
- Table of each channel with current stock source, reservation/decrement behavior, and blocker.
- Agent-ready follow-up tasks for channel fixes.

Validation:
- For each channel, prove either Warehouse reservation is used or list exact missing path.

## Parallel Execution

### Workstream A: Allegro Runtime Import Completion

Status: already active elsewhere
Owner role: Allegro import owner
Thread: `019f1315-d7a9-7282-abe7-c3cfc7d36eab`
Merge order: first runtime evidence source, no new thread started to avoid duplicate Allegro mutations
Dependencies: none
Blockers: `[UNKNOWN: correct Allegro/source account for 1000+ products]`
Handoff: Report source account coverage and target product Warehouse quantity to this orchestrator.

### Workstream B: Catalog Stock Visibility

Status: ready now
Owner role: Catalog UI/API owner
Files: `services/frontend/lib/api/products.ts`, `services/frontend/app/dashboard/products/[id]/page.tsx`, docs status
Dependencies: existing Catalog availability endpoint
Blockers: none
Validation owner: Catalog owner
Merge order: after plan commit, before sales-channel behavior changes

### Workstream C: Warehouse Runtime Evidence

Status: ready now, read-only first
Owner role: Warehouse stock authority validator
Files: validation docs only unless a contract bug is found
Dependencies: Allegro import/backfill data
Blockers: may need the Allegro thread to finish the exact backfill
Validation owner: Warehouse owner
Merge order: independent docs/evidence; no code merge before Catalog UI unless a bug is found

### Workstream D: Channel Reservation Audit

Status: ready now, read-only first
Owner role: Sales-channel integration auditor
Files: docs/report only in the first pass
Dependencies: confirmed Catalog/Warehouse availability contract
Blockers: `[UNKNOWN: exact remote FlipFlop repo name]`
Validation owner: Orchestrator
Merge order: after audit, then channel fixes one repo at a time

### Final Integration

Status: final integration
Owner role: Orchestrator
Responsibilities:
- Collect subagent evidence.
- Ensure no channel treats Catalog or Allegro local rows as final stock truth.
- Confirm target product route shows Warehouse availability.
- Decide whether to deploy Catalog UI and any channel fixes.
- Update docs with validation and remaining unknowns.

## Coding Prompts For Subagents

### Prompt B: Catalog Stock Visibility

Use Alfares remote workflow only. Work in `/home/ssf/Documents/Github/catalog-microservice` on `alfares`. Do not write project code under `/Users/Sergej.Stasok/Documents`.

Implement TASK-STOCK-002 from `docs/orchestrator/2026-06-29-warehouse-stock-from-allegro-cross-repo-plan.md`.

Goal: show Warehouse-backed stock amounts on Catalog product detail page `/dashboard/products/:id`, especially product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`.

Constraints:
- Warehouse remains stock authority.
- Do not add Catalog stock persistence or schema changes.
- Reuse existing `POST /api/products/availability/batch`.
- Touch only `services/frontend/lib/api/products.ts`, `services/frontend/app/dashboard/products/[id]/page.tsx`, focused tests if practical, and docs status.

Validation:
- `git diff --check`
- `npm run build`
- Focused test if available.
- Do not deploy unless build passes and repo state is clean except intended changes.

Expected handoff:
- Changed files
- Validation commands/results
- Whether target route is deploy-ready
- Any runtime token/deploy blocker

### Prompt C: Warehouse Runtime Evidence

Use Alfares remote workflow only. Work in `/home/ssf/Documents/Github/warehouse-microservice` on `alfares`. Keep first pass read-only.

Implement TASK-STOCK-003 from Catalog plan `docs/orchestrator/2026-06-29-warehouse-stock-from-allegro-cross-repo-plan.md` by validating Warehouse as the stock authority after Allegro import.

Goal: produce evidence for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`: stock rows, total availability, batch availability, and event/outbox status if accessible.

Constraints:
- No direct DB stock edits.
- No destructive cleanup.
- No raw secrets in output or tracked files.
- Mutating reservation checks require explicit synthetic/reversible approval; otherwise document as `[MISSING: approved reservation mutation evidence]`.

Validation:
- Read through Warehouse HTTP/API path when possible.
- `git status --short --branch`
- If docs are changed, `git diff --check`.

Expected handoff:
- Validation report path or runtime evidence path
- Exact product stock numbers observed
- Gaps and blockers

### Prompt D: Channel Reservation Audit

Use Alfares remote workflow only. Inspect remote repos on `alfares` under `/home/ssf/Documents/Github`. First pass is read-only.

Implement TASK-STOCK-004 from Catalog plan `docs/orchestrator/2026-06-29-warehouse-stock-from-allegro-cross-repo-plan.md`.

Goal: audit whether FlipFlop, Allegro, Aukro, Bazos, and other sales channels can publish/sell more units than Warehouse availability, and identify exact code paths that need reservation/decrement enforcement.

Constraints:
- Do not edit code in the audit pass.
- Do not modify shared public contracts.
- Mark unknown repo names as `[UNKNOWN: ...]`.
- Separate live regression from validation debt.

Validation:
- `git status --short --branch` for inspected repos.
- Evidence table with file paths and line references.

Expected handoff:
- Channel-by-channel report: stock source, publish quantity source, checkout/reservation path, over-sell risk, fix lane.
- Recommended merge order for follow-up implementation.

## Validation Report Skeleton

Validation id: VAL-STOCK-ALLEGRO-WAREHOUSE-CATALOG-20260629
Target: TASK-STOCK-001 through TASK-STOCK-004
Date: 2026-06-29
Validator: Codex orchestrator plus subagents

Criteria:
- Allegro quantity is imported to Warehouse with audit reason and service actor.
- Warehouse returns stock for target product through HTTP API.
- Catalog product detail displays Warehouse-backed quantity and not Catalog-local stock.
- Sales channels either reserve through Warehouse or are documented with exact blockers.
- No raw secrets are stored in tracked files or chat.

Open unknowns:
- `[UNKNOWN: correct Allegro/source account containing expected 1000+ products]`
- `[UNKNOWN: exact remote FlipFlop repo name if not represented by an existing remote directory]`
- `[MISSING: live evidence that all sales channels reserve/decrement Warehouse stock]`

