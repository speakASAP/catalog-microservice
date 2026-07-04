
Current Warehouse execution markers: [RESOLVED/NARROWED: Warehouse hold/release duration is owner-approved for the bounded Goal 24 smoke as 15 minutes source-default TTL or shorter caller-supplied expiresAt]; [RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]; [MISSING: exact selected Warehouse reservation lookup state for cleanup].
# Catalog Bundle Paid/Provider And Channel Implementation Contract

```yaml
id: CATALOG-BUNDLE-PAID-PROVIDER-CHANNEL-IMPLEMENTATION-CONTRACT
status: owner-approved-contract-defined-runtime-gated
owner: catalog-commerce-integration-owner
approved_by: owner Codex thread message on 2026-07-03
created: 2026-07-03
scope: next owner-gated paid/provider checkout and channel implementation contract for catalog.bundle.v1
upstream:
  - docs/contracts/catalog-bundle-aggregate-v1.md
  - docs/contracts/catalog-bundle-commerce-contract.md
  - docs/contracts/catalog-bundle-marketplace-publication-policy.md
  - docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-packet.md
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: `catalog.bundle.v1` can advance from pending-order evidence toward paid/provider and channel implementation only while each owning service keeps its contract boundary.
- Goal Impact: the broad owner-approval blockers are narrowed into an approved implementation contract, while live side effects remain gated by concrete canary inputs and rollback proof.
- System: Catalog owns bundle identity; Orders owns order identity and status transitions; Warehouse owns component-line stock effects; Payments owns provider/payment status boundaries; channel services own external marketplace/feed policy.
- Feature: owner-approved contract for the next paid/provider and channel implementation stage.
- Task: record what is approved, what remains forbidden, required canary evidence, parallel workstreams, validation, and remaining blockers.
- Execution Plan: Catalog documentation/status update only; no source behavior, deployment, migration, payment provider call, order mutation, Warehouse mutation, feed/listing mutation, or marketplace publication.
- Coding Prompt: treat owner approval as approval to define and implement fail-closed source/dry-run contracts, not as blanket approval for live provider, stock, fulfillment, refund, or external marketplace mutations.
- Code: this contract plus linked Goal 24 status/validation docs only.
- Validation: `git diff --check` and focused marker audit; no build required for Markdown-only Catalog changes.
- State Update: owner approval is recorded as contract-defined/runtime-gated; paid/provider smoke and live channel publication still require exact canary facts and rollback plan.

## Approval Scope

The owner approval on 2026-07-03 approves the next owner-gated paid/provider and channel implementation contract. It does not approve immediate live provider payment, provider refund, fulfillment, stock decrement, external marketplace listing/feed mutation, or publication of a Catalog bundle as one marketplace item.

Approved now:

- Additive docs, contracts, validators, and source/dry-run implementation planning for `catalog.bundle.v1` paid/provider and channel paths.
- Fail-closed service verifiers that prove unsupported bundle publication or paid/provider flows are blocked before mutation.
- Operator preview, dashboard, local review, and component-product assistance that does not create one external marketplace bundle item.
- Selection of a first channel implementation lane, with Heureka preferred for the first non-mutating verifier/operator contract because its existing policy already reports no feed mutation for bundles.

Not approved by this contract:

- Provider charge, capture, refund, webhook simulation, or status mutation against a live paid order.
- Warehouse reservation, fulfillment, decrement, cancel, return, release, or stock hold outside a future canary plan.
- External Allegro/Aukro/Bazos listing mutation, Heureka feed publication, or any one-offer/one-listing/one-SHOPITEM representation for the bundle aggregate.
- Synthetic SKU, EAN, stock unit, final price, free-shipping, tax, delivery, or discount authority derived from Catalog bundle metadata.
- Raw customer, address, provider, payment, credential, token, or marketplace payload output in validation reports.

## Paid/Provider Contract

The exact owner approval packet for any future live paid/provider smoke is `docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-packet.md`. That packet is owner-ready but runtime-blocked; it must be completed with a non-secret approval id, test window, target active bundle id, provider method, sanitized evidence policy, stock rollback, refund/cancel rollback, and hard stop authority before any live smoke begins.

The next paid/provider implementation must keep the existing service boundaries:

- Orders accepts bundle context only as bounded additive `bundleEvidence[]`; normal `items[]` remain component product-line truth.
- Warehouse reserves and releases component product lines only; aggregate `bundleId`, synthetic bundle SKU, bundle stock id, and `bundleContractVersion` are not reservation identities.
- Payments accepts bounded bundle metadata only: `bundleIds`, `bundleContractVersion=catalog.bundle.v1`, `discountPolicyRefs`, `freeShippingPolicyRef`, `serverTotalSource`, and `source`.
- Payments must not recompute bundle prices, own free-shipping eligibility, store raw Catalog candidate payloads, or accept provider/customer/address/token fields as bundle metadata.

Before any paid/provider smoke, the owner must approve all canary facts:

- `[MISSING: approved safe bundle target/product ids for paid/provider smoke]`
- `[MISSING: approved payment method/provider mode and maximum amount for paid/provider smoke]`
- `[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]; [MISSING: live current target row readback at execution time]; [RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [RESOLVED/NARROWED: Warehouse final bounded one-attempt approval is source-defined for packet planning only]; [MISSING: exact selected Warehouse reservation lookup state for cleanup]`
- `[RESOLVED/NARROWED: Orders/Payments completed|failed|cancelled source mapping plus Orders cancellation cleanup gate are source-defined; runtime remains blocked on exact provider proof, target order hash/state, named actor, side-effect acknowledgements, live Warehouse readback, and final mutation approval]`
- `[RESOLVED: active FlipFlop checkout paths pass central Orders UUIDs to Payments before provider creation]`
- `[RESOLVED: runtime verification of Payments Orders service token/role for the current bridge mechanism]`

If any paid/provider step cannot prove rollback before mutation, the implementation must stop at dry-run or validation-only evidence.

## Channel Contract

The next channel implementation must remain fail-closed by default. Each channel must return a structured `catalog.bundle.v1` policy envelope before any owner considers a live mutation:

```json
{
  "contractVersion": "catalog.bundle.v1",
  "policyId": "channel-owned-policy-id",
  "policyVersion": "channel-owned-policy-version",
  "status": "BLOCKED",
  "canPublishExternally": false,
  "willMutateExternalMarketplace": false,
  "willPublishFeed": false,
  "allowedUse": ["operator_suggestion", "preview", "local_review", "component_product_publication_only"],
  "forbiddenUse": ["one_external_offer_or_listing_or_feed_item_for_catalog_bundle"],
  "blockers": [],
  "missingContracts": [],
  "nextAction": "resolve owner-approved channel bundle policy"
}
```

Heureka is the preferred first channel implementation lane for non-mutating verifier/operator work because its existing policy already reports `canPublishAsFeedItem=false`, `willPublishFeed=false`, and `willMutateExternalMarketplace=false` for `catalog.bundle.v1`. This preference does not approve live Heureka feed output.

Before any live channel mutation, the owner must approve all channel canary facts:

- `[MISSING: selected first channel for external bundle implementation canary]`
- `[MISSING: owner-approved external marketplace bundle publication contract for catalog.bundle.v1]`
- `[MISSING: channel-specific one-listing/one-SHOPITEM representation policy]`
- `[MISSING: channel-specific duplicate, pacing, compliance, account ownership, idempotency, and rollback verifier]`
- `[MISSING: owner-approved live test listing/feed/import plan and cleanup plan]`
- `[MISSING: shipping/delivery/package semantics for multi-component external bundles]`

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files/repos | Forbidden actions | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 Paid/provider source verifier | dependency-gated | Payments/Orders integration owner | Prove provider-success/cancel/refund/status mapping without exposing provider/customer payloads | Payments, Orders docs/tests/verifiers | provider call, live charge/refund, raw provider payload | canary target, payment mode, Orders UUID proof | Payments focused specs/build after dirty test repair; Orders boundary verifiers | Payments currently has dirty malformed refund-rollback test code and needs owner cleanup before clean validation. |
| P2 Warehouse rollback verifier | dependency-gated | Warehouse reservation owner | Prove component-line hold/release/fulfill/cancel/return mapping for bundle smoke | Warehouse docs/tests/verifiers | aggregate bundle stock, synthetic SKU, live stock mutation without canary | P1 status mapping and approved stock window | reservation spec, bundle component verifier, build, diff check | No aggregate bundle reservation identity is allowed. |
| P3 Channel fail-closed envelope | ready now | Channel policy owner | Implement/verify structured `catalog.bundle.v1` blocked envelope | Heureka first preferred; channel docs/tests/source verifier | live feed/listing/offer mutation | current fail-closed policies | channel-specific verifier/build and diff check | Heureka is safest first non-mutating lane; Allegro/Aukro/Bazos stay higher-risk. |
| P4 Catalog integration status | active here | Catalog commerce integration owner | Record approval, blockers, validation, and merge state | Catalog docs/status/reports only | source behavior, migrations, deploy, provider/channel mutation | P1-P3 handoffs for future runtime work | `git diff --check`, marker audit | This pass records the contract only. |
| P5 Final canary integration | final integration | Commerce validation owner | Run any future live canary only after P1-P3 facts are owner-approved | approved canary scripts/reports only | any unapproved side effect | complete owner facts and rollback plan | aggregate safe canary report | Stop on first missing contract or rollback gap. |

Shared contracts: this document, `docs/contracts/catalog-bundle-commerce-contract.md`, `docs/contracts/catalog-bundle-marketplace-publication-policy.md`, Orders create/status contracts, Warehouse reservation contracts, Payments create/status contracts, and channel-owned marketplace policies.

Integration owner: Catalog commerce integration owner until a dedicated paid/provider/channel owner is assigned.

Validation owner: final integration validator.

Merge order: Catalog contract record, Payments dirty-test cleanup and boundary verifier, Orders payment-status/UUID verifier, Warehouse rollback verifier, Heureka/channel blocked-envelope verifier, final owner-reviewed canary plan.

## Remaining Blockers

- `[RESOLVED/NARROWED: owner-approved paid/provider checkout implementation contract defined in docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md]`
- `[RESOLVED/NARROWED: owner-approved channel implementation contract defined in docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md]`
- `[MISSING: approved safe bundle target/product ids for paid/provider smoke]`
- `[MISSING: approved payment method/provider mode and maximum amount for paid/provider smoke]`
- `[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]; [MISSING: live current target row readback at execution time]; [RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [RESOLVED/NARROWED: Warehouse final bounded one-attempt approval is source-defined for packet planning only]; [MISSING: exact selected Warehouse reservation lookup state for cleanup]`
- `[RESOLVED/NARROWED: Orders/Payments completed|failed|cancelled source mapping plus Orders cancellation cleanup gate are source-defined; runtime remains blocked on exact provider proof, target order hash/state, named actor, side-effect acknowledgements, live Warehouse readback, and final mutation approval]`
- `[RESOLVED: active FlipFlop checkout paths pass central Orders UUIDs to Payments before provider creation]`
- `[RESOLVED: runtime verification of Payments Orders service token/role for the current bridge mechanism]`
- `[MISSING: selected first channel for external bundle implementation canary]`
- `[MISSING: owner-approved live test listing/feed/import plan and cleanup plan]`
- `[MISSING: qualifying historical paid multi-product Orders rows for non-empty central Orders replay evidence]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill from live central Orders]`

## State Update

The broad owner approval blocker is resolved only at the implementation-contract level. Runtime remains fail-closed until exact paid/provider, stock, rollback, and channel canary inputs are approved and validated by the owning services.


## Current Goal 24 Blocker Reconciliation

[RESOLVED/NARROWED: Catalog current blocker reconciliation distinguishes historical live-run executor/runtime validation owner wording from current runtime blockers; Codex owns source-controlled validation/stop authority only, while live execution remains blocked by Auth token source, Payments bank/refund authority, exact provider proof, Orders sideEffectsHandled, exact selected Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence path]

The central Orders UUID and Payments Orders service-token lines above are current source-governance resolved/narrowed facts for the present bridge mechanism. They are not permission to run checkout or mutate Orders. Future execution remains blocked by the exact runtime packet, Auth token source, Payments bank/refund authority, Orders sideEffectsHandled, exact selected Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence path.

Current machine-checkable blockers:

- `[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]`
- `[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]`
- `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`
