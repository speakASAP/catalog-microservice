# Catalog Intent Preservation

## Original Intent

Catalog is the product truth service. It must answer: what goods do we offer, how are they described, how are they priced, what media describes them, which channels may use them, and what must be fixed before a product is sellable or publishable.

## Intent Preservation Rules

1. Product identity is stable. SKU and catalog product ID must not be reinterpreted by channels.
2. Product data is centralized. FlipFlop, Bazos, and future channels consume catalog records instead of maintaining separate product truth.
3. Stock is not catalog truth. Catalog may expose stock-aware projections, but warehouse remains the stock authority.
4. Login and permissions are not catalog-owned. Catalog verifies auth boundaries, but auth-microservice remains the identity authority.
5. Channel integrations are adapters, not owners. Channel-specific readiness can live in catalog, but publishing behavior remains in the channel service.
6. Destructive actions require owner intent. Hard delete and mass pricing changes are never routine automation.
7. Every implementation goal must preserve these boundaries and record evidence.

## Drift Checks

Before any change, ask:

- Does this make catalog a better product truth service?
- Does this accidentally move stock, login, checkout, or Bazos compliance ownership into catalog?
- Does this expose mutation without auth/RBAC?
- Does this create channel-specific coupling that blocks future channels?
- Does this preserve existing public read contracts unless the goal explicitly changes them?

