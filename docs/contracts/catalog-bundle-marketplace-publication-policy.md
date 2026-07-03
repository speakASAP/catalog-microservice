# Catalog Bundle Marketplace Publication Policy

```yaml
id: CATALOG-BUNDLE-MARKETPLACE-PUBLICATION-POLICY
status: fail-closed-policy-defined-all-channel-handoffs-resolved
owner: catalog-commerce-integration-owner
created: 2026-07-03
scope: channel-specific external marketplace publication policy for catalog.bundle.v1
source_goal: implementation-goals/GOAL-24-product-relations.md
upstream:
  - docs/contracts/catalog-bundle-aggregate-v1.md
  - docs/contracts/catalog-bundle-commerce-contract.md
  - docs/contracts/catalog-product-relations.md
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog bundle aggregates can support future channel workflows without letting Catalog publish to marketplaces or redefine channel compliance.
- Goal Impact: Goal 24 narrows the external marketplace bundle blocker into explicit fail-closed rules plus channel-owned handoffs.
- System: Catalog owns bundle identity and metadata; Allegro, Bazos, Aukro, and Heureka own their external publication rules, marketplace compliance, pacing, accounts, and provider calls.
- Feature: `catalog.bundle.v1` external marketplace publication policy.
- Task: define the default publication boundary and per-channel policy requirements before any external bundle offer/listing/feed mutation.
- Execution Plan: Catalog docs-only integration policy plus parallel channel worker handoffs; no source, deployment, provider call, marketplace publish, DB write, or channel repo edit in this integration slice.
- Coding Prompt: fail closed when a channel policy is absent; permit display/operator suggestion use only; do not invent marketplace support for kits, bundles, combined stock, or bundle pricing.
- Code: this policy doc plus linked Goal 24 status/contract docs.
- Validation: `git diff --check`; channel workers must provide repo-local validation before any channel-specific blocker can close.
- State Update: central Catalog ambiguity is resolved; Allegro, Bazos, Aukro, and Heureka handoffs are resolved/narrowed to channel-owned fail-closed policies; future external bundle publication remains owner-contract-gated.

## Default Policy

Catalog must not publish, queue, confirm, regenerate, or mutate any external marketplace offer/listing/feed row for a `catalog.bundle.v1` aggregate. Catalog may expose bundle metadata to authenticated services, but all external marketplace publication decisions stay channel-owned.

A Catalog bundle is not a marketplace SKU, not a single sellable product row, not a Warehouse stock unit, and not pricing authority. A channel must not turn a `bundleId` into one external offer/listing/feed item unless that channel owns an explicit policy and verifier proving the marketplace can represent the bundle safely.

Until a channel policy exists, allowed use is limited to:

- operator suggestions, previews, and warnings;
- draft assistance that still publishes component products individually;
- read-only display of bundle identity and component products;
- non-mutating validation reports.

Forbidden by default:

- direct external publication of a Catalog bundle as one marketplace listing, offer, auction, or feed item;
- synthetic marketplace SKU/EAN creation;
- stock aggregation across component products;
- channel-side price, discount, or free-shipping calculation from Catalog metadata;
- copying raw Catalog candidate payloads, Orders rows, customer data, payment/provider data, credentials, or tokens into channel publication metadata;
- bypassing channel pacing, duplicate detection, compliance checks, category/attribute requirements, account ownership, or owner approval.

## Required Channel Policy Shape

A channel can move from blocked to owner-ready only when its repository documents and validates all of the following:

- Marketplace representation: whether the platform supports one offer/listing/feed item containing multiple component products, or whether components must stay separate.
- Product identity: how `bundleId`, component Catalog product IDs, SKU/EAN, title, media, category, attributes, and description map without redefining Catalog product truth.
- Price and tax boundary: proof that channel text/prices are display-only unless Orders/checkout owns final totals.
- Stock boundary: component-line Warehouse availability/reservation remains authoritative; no aggregate bundle stock is invented.
- Compliance and returns: platform-specific rules for kits, multi-item listings, bundles, prohibited claims, return handling, and delivery promises.
- Duplicate and pacing behavior: how bundle suggestions avoid duplicate external listings and respect channel pacing/queueing.
- Dry-run verifier: a non-mutating verifier proving the policy rejects unsupported bundle publication and accepts only allowed suggestion/draft behavior.
- Owner approval gate: exact approval required before any live marketplace mutation.

## Channel Matrix

| Channel | Current policy | Allowed now | Blocked until channel handoff | Worker thread |
| --- | --- | --- | --- | --- |
| Allegro | fail-closed by Allegro policy | operator suggestion / preview / local review evidence only; no external offer/listing mutation for bundle aggregates | `[RESOLVED/NARROWED: Allegro-owned catalog.bundle.v1 external publication policy handoff recorded as fail-closed in Allegro main 8b05807 / handoff commit 27b5f88]` | `019f2900-9f87-7e53-9d28-0b0429fcff71` |
| Bazos | fail-closed by Bazos source policy | operator suggestion / draft text assistance only; Bazos runtime blocks Catalog bundle publication before draft/listing mutation | `[RESOLVED/NARROWED: Bazos-owned policy says catalog.bundle.v1 cannot publish as one Bazos listing under current rules; future enablement requires owner-approved Bazos bundle publication contract]` | `019f2900-c258-7431-aa0a-cab73be30be3` |
| Aukro | fail-closed by Aukro source policy | ordinary component listings only through existing Aukro product gates; read-only/operator context for Catalog bundle identity | `[RESOLVED/NARROWED: Aukro-owned policy says catalog.bundle.v1 cannot publish as one external Aukro listing under current rules; future enablement requires owner-approved Aukro bundle publication contract]` | `019f2900-f84a-7533-abc3-5c5a3bea60f7` |
| Heureka | fail-closed by Heureka policy | component-level feed readiness only; Catalog bundles remain outside Heureka XML feed output | `[RESOLVED/NARROWED: Heureka-owned policy says catalog.bundle.v1 cannot publish as one SHOPITEM under current rules; future enablement requires owner-approved Heureka bundle-as-SHOPITEM contract]` | `019f2901-4930-7f62-a5d3-f03f6da321f6` |
| FlipFlop | not external marketplace | storefront display and approved non-mutating checkout validation | live Rung 2 order/reservation evidence if production side effects are required | current thread |

## Integration Merge Order

1. Catalog fail-closed policy document.
2. Allegro policy worker handoff - resolved to fail-closed Allegro policy at Allegro `main` merge `8b05807` / handoff commit `27b5f88`.
3. Bazos policy worker handoff - resolved to fail-closed Bazos policy at Bazos `main` merge `9703b0c` / source commit `acc0ac9`.
4. Aukro policy worker handoff - resolved to fail-closed Aukro policy at Aukro `main` commit `f44d7d7`.
5. Heureka policy worker handoff - resolved to fail-closed Heureka policy at Heureka `main` commit `1cf0f32`.
6. Catalog final reconciliation only after all channel handoffs are merged or explicitly blocked.

Shared files: `docs/contracts/catalog-bundle-marketplace-publication-policy.md`, `docs/contracts/catalog-bundle-aggregate-v1.md`, `docs/contracts/catalog-bundle-commerce-contract.md`, `docs/contracts/catalog-product-relations.md`, `implementation-goals/GOAL-24-product-relations.md`, and `docs/orchestrator/STATUS.md`.

Integration owner: Catalog commerce integration owner.

Validation owner: final integration validator after worker handoffs.

## State Update

Resolved/narrowed:

- `[RESOLVED/NARROWED: Catalog fail-closed external marketplace bundle publication policy defined in docs/contracts/catalog-bundle-marketplace-publication-policy.md]`
- `[RESOLVED/NARROWED: Bazos-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Bazos source policy at Bazos main 9703b0c / source acc0ac9]`
- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Aukro policy at Aukro main f44d7d7 / source bd86caa]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`
- `[RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]`

Allegro policy evidence:

- Allegro merge commit `8b05807 Merge goal24 allegro bundle policy handoff` and handoff commit `27b5f88 docs: record goal24 allegro bundle policy handoff` record the fail-closed channel decision.
- Allegro must not publish, queue, regenerate, confirm, mutate, sync, or create one external Allegro offer/listing from a Catalog `catalog.bundle.v1` bundle until a future owner-approved Allegro implementation contract exists.
- Allegro runtime/source gates block bundle draft creation, draft edit, product confirm, product status actions, and direct governed lifecycle attempts through `CatalogSellActionService` and `MarketplacePolicyEngineService` policy id `catalog-bundle-publication-policy`.
- Allegro validation evidence from the handoff: `git diff --check` passed, targeted source-gate presence check passed, `catalog-sell-action.spec.ts` passed, and `policy-engine.spec.ts` passed. The docs/status refresh did not rerun build because runtime source was unchanged; prior source branch build evidence remains in Allegro docs.
- Future Allegro enablement remains blocked by `[MISSING: future owner-approved Allegro one-listing bundle representation contract for catalog.bundle.v1]`, `[MISSING: Warehouse bundle reservation/stock allocation contract]`, `[MISSING: Orders bundle create-order and line-item decomposition contract]`, `[MISSING: Payments/free-shipping/discount total contract]`, and `[MISSING: owner-approved shipping policy semantics for external marketplace bundles]`.

Bazos policy evidence:

- Bazos source commit `acc0ac9 docs: block Bazos catalog bundle publication` and Bazos merge commit `9703b0c Merge goal24 Bazos bundle publication policy` document and enforce that Bazos cannot publish a `catalog.bundle.v1` aggregate as one external listing under current rules.
- Bazos runtime source policy blocks Catalog bundle readiness markers (`catalog.bundle.v1`, `bundle`, `catalog_bundle`, or `bundleId`) before draft/listing mutation with blocker `bazos_catalog_bundle_external_listing_blocked`, policy id `bazos.catalog_bundle_publication.v1`, and publish-policy gate `catalog_bundle_publication_blocked`.
- Bazos validation evidence from the worker handoff: focused shared Jest passed 2 suites / 55 tests, `node scripts/verify-bazos-bundle-publication-policy.js` passed, TypeScript no-emit check passed, shared build passed, and `git diff --check` passed.
- Future Bazos enablement remains blocked by `[MISSING: owner-approved Bazos bundle publication contract proving one external Bazos listing is compliant]`.

Heureka policy evidence:

- Heureka commit `1cf0f32 docs: define heureka bundle publication policy` documents and verifies that Heureka cannot publish a `catalog.bundle.v1` aggregate as one XML `SHOPITEM` under current service rules.
- Heureka policy version `heureka.bundle.publication.policy.v1` returns `canPublishAsFeedItem=false`, `willPublishFeed=false`, and `willMutateExternalMarketplace=false`; allowed current behavior is component-level feed readiness only.
- Heureka validation evidence from the worker handoff: `npm run verify:heureka-bundle-publication-policy` passed, `LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build` passed, and `git diff --check` passed.
- Future Heureka enablement remains blocked by `[MISSING: approved Heureka bundle-as-one-SHOPITEM policy]`, `[MISSING: external Heureka evidence that bundle aggregates may be imported as one marketplace item without product SKU/stock identity]`, `[MISSING: approved source for bundle price/category/delivery/free-shipping copy in Heureka XML]`, and `[MISSING: approved Heureka runtime verifier proving bundle publication is non-mutating and externally safe]`.

Aukro policy evidence:

- Aukro commit `f44d7d7 docs: resolve aukro bundle policy handoff` records the exact Catalog handoff marker as `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff]`.
- Aukro policy reference `16_operations/AUKRO_PLATFORM_RULES.md#catalog-bundle-publication-boundary` says Catalog bundle-shaped input must fail closed for one external Aukro listing unless a future approved Aukro bundle policy proves price, stock reservation, shipping, component mapping, and order reconciliation evidence.
- Aukro runtime policy `aukro.catalog_bundle_publication.v1` emits `CATALOG_BUNDLE_PUBLICATION_FAILED` for `publicationMode=single_external_listing` and blocks caller-supplied passing bundle evidence from overriding the Aukro-derived blocker.
- Aukro validation evidence from the worker handoff: focused policy spec passed, focused offers spec passed, service build passed, strict docs audit passed, pre-coding gate passed, deployment-readiness gate passed, and `git diff --check` passed.
- Future Aukro enablement remains blocked by `[MISSING: approved external marketplace bundle publication contract for catalog.bundle.v1]`, `[MISSING: Warehouse bundle reservation and availability contract for a single external listing]`, `[MISSING: Orders bundle create-order and component allocation contract for Aukro orders]`, `[MISSING: Payments/totals/refund behavior for bundled external marketplace orders]`, `[MISSING: Aukro shipping template/package policy for multi-component bundles]`, and `[MISSING: owner-approved live Aukro bundle test listing and cleanup plan]`.

Still blocked before external bundle publication:

- `[MISSING: owner-approved channel implementation contract before any Catalog bundle becomes one external marketplace offer/listing/feed item]`
- `[MISSING: downstream Orders/Warehouse/Payments/shipping contracts for paid/provider bundle selling beyond current pending-order evidence]`
