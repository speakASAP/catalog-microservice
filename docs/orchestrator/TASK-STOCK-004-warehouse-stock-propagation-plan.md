# TASK-STOCK-004 Warehouse Stock Propagation Plan

## Intent Preservation Chain

Vision: Alfares must not sell more units than physically fulfillable stock across Catalog and every sales channel.

Goal Impact: Warehouse becomes the operational stock authority shown in Catalog product detail and enforced by Orders and channel publication/checkout flows.

System: Allegro visible stock is the initial imported truth already stored in Warehouse; BizBox or Suppliers must supply the missing physical-stock truth if expected units exceed currently visible Allegro quantities. Catalog displays Warehouse availability and does not own stock. Orders reserves before sale confirmation. Channel services must consult Warehouse/Orders authority before publish or checkout.

Feature: Warehouse-backed inventory propagation for Catalog, Allegro, Aukro, Bazos, Heureka, FlipFlop, and future sales channels.

Task: TASK-STOCK-004.

Execution Plan: deploy reservation gate first, deploy channel gates second, import authoritative stock into Warehouse third, validate Catalog display and channel propagation last.

Coding Prompt: keep Warehouse as source of truth; no Catalog stock persistence; fail closed when Warehouse route/reservation evidence is missing; use service credentials without printing secrets; mark unavailable source facts as `[MISSING: ...]`.

Code: deployed cross-repo changes recorded in `docs/orchestrator/STATUS.md`; the Allegro Imports public CSV upload/gateway lane, non-mutating preview, confirmation-guarded mutation, and preview-token file binding are deployed at `allegro-service@d434150`; FlipFlop Warehouse client authentication is deployed at `flipflop-service@94ecd7c`.

Validation: current product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` shows Warehouse quantity `60`, reserved `0`, available `60`; FlipFlop public product API now exposes Warehouse-backed `stockQuantity=60` with `warehouse.source=warehouse-microservice`; Heureka image `localhost:5000/heureka-service:056e975` is deployed and healthy; Allegro image tag `d434150` is deployed for service, API gateway, frontend, settings, and imports; current-pod bad-token smoke rejects mutation with `STOCK_IMPORT_PREVIEW_TOKEN_INVALID`. Full `FlipFlop` active-offer backfill imported 9 stock-authoritative offers totaling Allegro stock `496`; Warehouse and Catalog availability both read back total available `496` with zero mismatches. One synthetic rollout-window import artifact was created during old-behavior smoke and then cleaned up in Catalog; no real BizBox/current stock file was imported.

## Current State

- Completed: Catalog product detail Warehouse stock display.
- Completed: Warehouse Allegro target import/readback for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`.
- Completed: full saved `FlipFlop` active-offer stock backfill; 9 current full offers total `496` and match Warehouse/Catalog availability with zero mismatches.
- Completed: Orders reservation gate deployed first.
- Completed: Aukro, Bazos, FlipFlop, Heureka channel gates deployed.
- Completed: FlipFlop Warehouse client auth fix deployed at `flipflop-service@94ecd7c`; public product API for the target product now returns Warehouse-backed `stockQuantity=60`.
- Completed: Heureka deploy script repaired to build immutable image tags before rollout.
- Completed read-only: Suppliers currently has synthetic/test suppliers only and is not a proven real physical-stock source.
- Completed read-only: Allegro Imports has BizBox CSV-to-Warehouse code but no jobs and no source file found.
- Completed read-only: Allegro `statexcz` order-history research found 117 checkout forms, 125 line items, and 26 unique historical offer IDs, but only 3 expose current full offer stock; order-history-only offers are not stock-authoritative.
- Completed: Allegro public authenticated BizBox CSV upload/gateway lane, non-mutating preview, confirmation-guarded mutation, and preview-token file binding deployed at `allegro-service@d434150`.
- Blocked: complete physical stock import beyond visible/current Allegro stock is `[MISSING: authoritative BizBox/current stock export, correctly authorized additional seller account, or real supplier source]`.

## Parallel Execution

### Lane A - Allegro Imports Public BizBox Upload

Status: completed and deployed at `allegro-service@d434150`.

Owner role: Allegro service implementation agent.

Objective: make `POST /api/import/csv` usable through `https://allegro.alfares.cz` by adding API gateway multipart forwarding and/or an authenticated frontend upload control on the Import page.

Allowed files: `allegro-service/services/api-gateway/**`, `allegro-service/services/frontend/**`, focused tests/docs.

Forbidden files: Warehouse mutation logic, Catalog product schema, Orders reservation contract, unrelated channel service code.

Expected output: committed/pushed Allegro change with focused gateway/frontend validation and deployment evidence. Completed by `4e9400c Enable BizBox stock CSV upload` and hardened by `ccf16a1 Add BizBox stock CSV preview`, `4d1cb99 Require confirmation for BizBox stock import`, and `d434150 Bind BizBox stock import to previewed file`.

Dependencies: none for code; actual import still depends on source file approval.

Blockers: `[MISSING: owner-approved BizBox/current stock export]`; no authenticated mutating upload was run because it changes Warehouse stock. The preview endpoint is available for safe preflight, and the mutating endpoint now rejects uploads without explicit confirmation and a matching preview token for the same file.

Validation evidence: `git diff --check`, imports/API gateway/frontend builds, deployment rollout for all Allegro services, unauthenticated preview rejection, live preview/confirmation-guard smoke, and current-pod bad-token smoke returning `428 STOCK_IMPORT_PREVIEW_TOKEN_INVALID` with import job count unchanged. Authenticated real mutating upload is deferred until stock mutation is approved.

Handoff notes: do not run real stock mutation import without owner-approved real file and mapping.

### Lane B - BizBox Source Discovery

Status: completed read-only; no source found.

Owner role: orchestration/data-discovery agent.

Objective: locate or obtain the current BizBox/physical stock export that contains `stock:minimumRequiredLevel:*` fields for all active products.

Allowed scope: read-only remote repo/host search, operator documentation, existing upload/export locations, direct owner handoff notes.

Forbidden scope: no destructive file search, no unapproved database mutation, no speculative supplier credential creation.

Expected output: exact approved file path or `[MISSING: owner must provide BizBox export]`. Completed result: `[MISSING: owner must provide BizBox/current stock export]`.

Dependencies: none.

Blockers: no source file found in `/home/ssf/Documents/Github/allegro-service`; imports job history is empty.

Validation evidence: file checksum/name/date, row count, header proof without exposing sensitive commercial payloads.

### Lane C - Approved Stock Import Into Warehouse

Status: partially complete for current saved `FlipFlop` active offers; dependency-gated for complete physical stock beyond those 9 offers.

Owner role: Allegro/Warehouse integration agent.

Objective: keep importing only current stock-authoritative quantities into Warehouse. Current saved `FlipFlop` full offers are imported and validated; remaining work is to preview the confirmed BizBox/current-stock file or correctly authorized additional seller account, then run the approved import through Warehouse so Warehouse contains full physical quantities and emits stock update events.

Allowed files: none required if existing import path works; minimal Allegro/Warehouse fixes only if validation exposes a bug.

Forbidden actions: do not import real file or overwrite stock until owner confirms source authority and mapping.

Dependencies: Lane B source/mapping approval. Lane A preview/upload tooling is complete and includes preview-token file binding.

Validation evidence: current `FlipFlop` active offers have live backfill/readback evidence: 9 offers, Allegro stock total `496`, Warehouse available total `496`, Catalog availability total `496`, zero mismatches, target product available `60`. Remaining complete-stock validation still requires preview totals accepted by owner, import job completed for the complete physical source, Warehouse stock rows/movements/outbox for target products, Catalog product detail shows expected available amount, and channel gates receive updated availability.

### Lane D - Suppliers Real Source Onboarding

Status: dependency-gated.

Owner role: Suppliers/Warehouse integration agent.

Objective: onboard real supplier/current-stock feed only if BizBox is not the authoritative source.

Dependencies: `[MISSING: real supplier metadata, endpoint, credentials reference names, payload examples, owner-confirmed mappings, mutation approval]`.

Validation evidence: supplier import dry-run, approved reconciliation, Warehouse movement reason and outbox publication.

### Lane E - Final Integration Validation

Status: final integration; partially validated for Catalog availability and FlipFlop public product projection, still dependency-gated for complete physical stock and auth-gated channel status probes.

Owner role: orchestration validator.

Objective: prove target Catalog product and all channel flows read or enforce Warehouse quantities after full stock import.

Dependencies: Lane C or D complete.

Validation evidence: Catalog availability batch returns target totalAvailable `60`; FlipFlop pod-local Warehouse probe returns `totalAvailable=60`; public FlipFlop product API returns `stockQuantity=60` and Warehouse source metadata. Remaining: authenticated Catalog UI/channel status evidence, Orders over-reservation evidence after full source import, and Allegro/Aukro/Bazos/Heureka channel fail-closed/positive paths where applicable.

## Merge Order

1. Merge/deploy Lane A if implemented.
2. Record Lane B source evidence.
3. Run Lane C import after approval.
4. Use Lane D only if BizBox is rejected as source.
5. Run Lane E final validation and close the goal.
