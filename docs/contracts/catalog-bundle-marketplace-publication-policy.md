# Catalog Bundle Marketplace Publication Policy

```yaml
id: CATALOG-BUNDLE-MARKETPLACE-PUBLICATION-POLICY
status: fail-closed-policy-defined-bazos-heureka-handoffs-resolved
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
- State Update: central Catalog ambiguity is resolved; Bazos and Heureka handoffs are resolved to channel-owned fail-closed policies; Allegro and Aukro channel-owned policy handoffs remain active.

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
| Allegro | fail-closed | operator suggestion / draft assistance only | Allegro-owned policy proving whether a `catalog.bundle.v1` can become one Allegro offer without violating offer identity, stock, price, compliance, and pacing rules | `019f2900-9f87-7e53-9d28-0b0429fcff71` |
| Bazos | fail-closed by Bazos source policy | operator suggestion / draft text assistance only; Bazos runtime blocks Catalog bundle publication before draft/listing mutation | `[RESOLVED/NARROWED: Bazos-owned policy says catalog.bundle.v1 cannot publish as one Bazos listing under current rules; future enablement requires owner-approved Bazos bundle publication contract]` | `019f2900-c258-7431-aa0a-cab73be30be3` |
| Aukro | fail-closed | operator suggestion / draft assistance only | Aukro-owned policy proving whether a bundle can become one auction/offer without violating category, shipment, price, stock, and platform rules | `019f2900-f84a-7533-abc3-5c5a3bea60f7` |
| Heureka | fail-closed by Heureka policy | component-level feed readiness only; Catalog bundles remain outside Heureka XML feed output | `[RESOLVED/NARROWED: Heureka-owned policy says catalog.bundle.v1 cannot publish as one SHOPITEM under current rules; future enablement requires owner-approved Heureka bundle-as-SHOPITEM contract]` | `019f2901-4930-7f62-a5d3-f03f6da321f6` |
| FlipFlop | not external marketplace | storefront display and approved non-mutating checkout validation | live Rung 2 order/reservation evidence if production side effects are required | current thread |

## Integration Merge Order

1. Catalog fail-closed policy document.
2. Allegro policy worker handoff.
3. Bazos policy worker handoff - resolved to fail-closed Bazos policy at Bazos `main` merge `9703b0c` / source commit `acc0ac9`.
4. Aukro policy worker handoff.
5. Heureka policy worker handoff - resolved to fail-closed Heureka policy at Heureka `main` commit `1cf0f32`.
6. Catalog final reconciliation only after all channel handoffs are merged or explicitly blocked.

Shared files: `docs/contracts/catalog-bundle-marketplace-publication-policy.md`, `docs/contracts/catalog-bundle-aggregate-v1.md`, `docs/contracts/catalog-bundle-commerce-contract.md`, `docs/contracts/catalog-product-relations.md`, `implementation-goals/GOAL-24-product-relations.md`, and `docs/orchestrator/STATUS.md`.

Integration owner: Catalog commerce integration owner.

Validation owner: final integration validator after worker handoffs.

## State Update

Resolved/narrowed:

- `[RESOLVED/NARROWED: Catalog fail-closed external marketplace bundle publication policy defined in docs/contracts/catalog-bundle-marketplace-publication-policy.md]`
- `[RESOLVED/NARROWED: Bazos-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Bazos source policy at Bazos main 9703b0c / source acc0ac9]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`
- `[RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]`

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

Still blocked:

- `[MISSING: Allegro-owned catalog.bundle.v1 external publication policy handoff]`
- `[MISSING: Aukro-owned catalog.bundle.v1 external publication policy handoff]`
