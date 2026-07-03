# Catalog Bundle Marketplace Publication Policy

```yaml
id: CATALOG-BUNDLE-MARKETPLACE-PUBLICATION-POLICY
status: fail-closed-policy-defined-channel-handoffs-active
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
- State Update: central Catalog ambiguity is resolved; channel-owned policy handoffs remain active.

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
| Bazos | fail-closed | operator suggestion / draft text assistance only | Bazos-owned policy proving whether a bundle can become one Bazos listing without violating compliance, duplicate, pacing, category, and manual publication rules | `019f2900-c258-7431-aa0a-cab73be30be3` |
| Aukro | fail-closed | operator suggestion / draft assistance only | Aukro-owned policy proving whether a bundle can become one auction/offer without violating category, shipment, price, stock, and platform rules | `019f2900-f84a-7533-abc3-5c5a3bea60f7` |
| Heureka | fail-closed | component-level feed readiness only | Heureka-owned policy proving whether a bundle can be represented as one `SHOPITEM`; otherwise components remain separate feed items | `019f2901-4930-7f62-a5d3-f03f6da321f6` |
| FlipFlop | not external marketplace | storefront display and approved non-mutating checkout validation | live Rung 2 order/reservation evidence if production side effects are required | current thread |

## Integration Merge Order

1. Catalog fail-closed policy document.
2. Allegro policy worker handoff.
3. Bazos policy worker handoff.
4. Aukro policy worker handoff.
5. Heureka policy worker handoff.
6. Catalog final reconciliation only after all channel handoffs are merged or explicitly blocked.

Shared files: `docs/contracts/catalog-bundle-marketplace-publication-policy.md`, `docs/contracts/catalog-bundle-aggregate-v1.md`, `docs/contracts/catalog-bundle-commerce-contract.md`, `docs/contracts/catalog-product-relations.md`, `implementation-goals/GOAL-24-product-relations.md`, and `docs/orchestrator/STATUS.md`.

Integration owner: Catalog commerce integration owner.

Validation owner: final integration validator after worker handoffs.

## State Update

Resolved/narrowed:

- `[RESOLVED/NARROWED: Catalog fail-closed external marketplace bundle publication policy defined in docs/contracts/catalog-bundle-marketplace-publication-policy.md]`

Still blocked:

- `[MISSING: Allegro-owned catalog.bundle.v1 external publication policy handoff]`
- `[MISSING: Bazos-owned catalog.bundle.v1 external publication policy handoff]`
- `[MISSING: Aukro-owned catalog.bundle.v1 external publication policy handoff]`
- `[MISSING: Heureka-owned catalog.bundle.v1 feed publication policy handoff]`
- `[MISSING: owner-approved Rung 2 live pending-order smoke plan if production order/reservation evidence is required]`
