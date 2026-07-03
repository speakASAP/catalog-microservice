# VAL-GOAL-24 Bazos Affinity Contract Sync

Date: 2026-07-03

## Scope

Catalog docs/status reconciliation only. Source repositories for Bazos and Marketing were read as evidence; no Catalog source, migrations, runtime config, Marketing, Bazos, Orders, Allegro, Aukro, FlipFlop, Warehouse, Payments, Kubernetes, deployment scripts, secrets, or runtime data were changed.

## Intent Compliance Report

- Vision: marketplace purchase history can improve Catalog relation surfaces without moving marketplace order extraction, Marketing aggregation, customer, address, payment, provider, token, stock, checkout, or publication ownership into Catalog.
- Goal Impact: Catalog no longer carries the stale generic Bazos eligibility blocker and now records the exact Bazos-owned fail-closed prerequisites.
- System: Bazos owns Bazos order history, item replay persistence, ingestion contracts, protected replay token acceptance, and fail-closed replay production; Marketing owns parser, run ledger, idempotency, scheduling, and Catalog publishing; Catalog owns product relation persistence and status contracts.
- Feature: marketplace-affinity contract/status sync for Bazos fail-closed replay eligibility.
- Task: consume merged Bazos evidence from commit `31c245c`, reconcile Marketing parser/ledger wording from Marketing status evidence, and update Catalog Goal 24 docs/reporting.
- Execution Plan: isolated remote Catalog worktree `codex/goal24-bazos-affinity-contract-sync`, docs/status/report files only, preserve dirty `main` worktree, validate with `git diff --check` and available docs gates.
- Coding Prompt: replace stale blockers only where evidence proves resolution; keep exact `[MISSING: ...]` markers for unimplemented producer/runtime facts; do not invent paid Bazos order history or Marketing runtime deployment facts.
- Code: `docs/contracts/catalog-marketplace-affinity-backfill.md`, `docs/orchestrator/STATUS.md`, `docs/IMPLEMENTATION_STATE.md`, `implementation-goals/GOAL-24-product-relations.md`, `reports/validation/VAL-GOAL-24-bundle-order-affinity-contract.md`, and this validation report.
- Validation: `git diff --check` passed; required pre-coding/doc audit scripts are unavailable and remain recorded as missing.
- State Update: Bazos generic eligibility mapping blocker is resolved into precise fail-closed Bazos-owned blockers; runtime scheduling remains inactive.

## Evidence Consumed

- Bazos `main` at merge commit `31c245c` includes `implementation-goals/GOAL-24-bazos-affinity-eligibility-mapping.md` and validation reports for eligibility mapping and replay contract.
- Bazos evidence proves `BazosOrder` lacks persisted paid/processable state, paid timestamp/payment status, item-line relation or item snapshot replay source, and a Bazos-owned order item ingestion contract.
- Bazos protected replay endpoint is source-compatible and fail-closed with `count=0`, `events=[]`, and aggregate-safe blocker metadata.
- Bazos runtime follow-up is superseded by Bazos `main` at `1ccb93d`, which records accepted runtime token wiring and a Marketing pod dry-run returning HTTP 200 with zero records/candidates and no Catalog publish.
- Marketing `docs/orchestrator/STATUS.md` and current Catalog `main` record marketplace parser support, durable complete-snapshot ledger proof, and deployed `complete_snapshot` runtime smoke as resolved; producer completeness and owner-reviewed non-empty source/window approval remain separate gates.

## Resolved Blockers

- `[RESOLVED: Bazos paid multi-product replay eligibility mapping resolved to fail-closed source blockers]`
- `[RESOLVED: Marketing parser support for marketplace-owned replay source envelopes]`
- `[RESOLVED: Marketing durable complete-snapshot ledger proof at deployed runtime level]`
- `[RESOLVED: Bazos runtime internal replay token env accepted by /internal/bazos/order-affinity/replay-candidates]`

## Remaining Blockers

- `[MISSING: Bazos paid order history source]`
- `[MISSING: Bazos persisted order item replay source]`
- `[MISSING: Bazos order item ingestion contract]`
- `[MISSING: marketplace producer guarantee that replay window is complete and repeatable]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`
- `[MISSING: docs-rag indexed Catalog Goal 24 order-affinity context]`

## Parallel Execution

| Workstream | Status | Owner role | Scope | Dependencies | Validation | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| Bazos eligibility | complete at source level | Bazos worker | Fail-closed eligibility mapping and replay contract evidence | Bazos commit `31c245c` | Bazos focused spec/build/diff check from validation reports | Catalog consumed exact blockers |
| Marketing parser/ledger | complete at deployed runtime level | Marketing worker | Parser support, completeSnapshot ledger proof, idempotency registry | none for zero-row dry-run | Marketing focused tests/build/diff and deployed ledger smoke from status | Catalog keeps producer/window gates only |
| Catalog contract sync | complete | Catalog worker | Docs/status/validation report only | Bazos + Marketing evidence | `git diff --check` | This branch/commit |
| Runtime Bazos scheduling | zero-row dry-run complete; recurring publish blocked | Integration owner | Marketing pod dry-run and recurring schedule decision | Bazos paid source, item replay, ingestion contract, owner window | Bazos/Marketing dry-run passed with zero records and no Catalog publish | Keep recurring publish inactive |

Shared files/contracts: Catalog marketplace-affinity backfill contract, Goal 24 product-relations status, Marketing orders-events integration contract, Bazos Goal 24 eligibility/replay validation reports.

Integration owner: Catalog docs/status integration worker on branch `codex/goal24-bazos-affinity-contract-sync`.

Validation owner: Catalog integration validator.

Merge order: Bazos evidence commit `31c245c`, Bazos runtime evidence `1ccb93d`, Marketing deployed ledger evidence, Catalog docs sync branch, future order-source work only after owner approval.

## Validation Evidence

- `git diff --check`: passed with no whitespace errors.
- `for f in scripts/pre_coding_gate.py scripts/strict_doc_audit.py; do ...; done`: both scripts are missing in this branch, matching existing Goal 24 blockers.
- `package.json` script scan for docs/audit/IPS checks: no docs-only validation script exists; available relevant scripts are `lint`, `check:aos-auth-contract`, and `verify:stock-credential:wiring`, which are not scoped to this docs-only contract sync.

## Boundary Decision

No deploy, live publish, Catalog relation mutation, product/order data mutation, runtime token readout, secret output, Kubernetes change, or non-Catalog source edit was performed.
