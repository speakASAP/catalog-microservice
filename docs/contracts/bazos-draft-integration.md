# Bazos Draft Integration Contract

```yaml
id: CONTRACT-CATALOG-BAZOS-DRAFT-INTEGRATION
status: implemented-source
owner: catalog
created: 2026-06-13
last_updated: 2026-06-13
source_goal: implementation-goals/GOAL-07-bazos-draft-integration-contract.md
```

## Purpose

Catalog can request a Bazos draft for a Catalog product. Bazos remains the authority for identities, policy checks, human action reasons, queueing, pacing, platform challenges, and publishing.

## Catalog Endpoint

```http
POST /api/products/:id/bazos-draft
Authorization: Bearer <catalog-approved user token>
Content-Type: application/json
```

Compatibility alias:

```http
POST /api/products/:id/sell-on-bazos
```

The compatibility alias must return draft/action status. It must not publish directly.

## Bazos Dependency

Catalog calls only:

```http
POST /api/bazos/catalog/products/:productId/sell-action
```

The request includes Catalog product truth and operator-selected Bazos context such as `identityId`, `category`, optional `location`, title, description, current price, and stock quantity.

## Response Boundary

Catalog response names Bazos as:

- `authority: "bazos"`
- `policyAuthority: "bazos"`
- `publishAuthority: "bazos"`

Catalog surfaces Bazos `policyStatus`, `requiresConfirmation`, `canQueueAfterConfirmation`, `requiresHumanAction`, and `nextAction` so humans or downstream clients can resolve policy/challenge requirements through Bazos-owned workflows.

## Forbidden Catalog Behavior

- Catalog must not call Bazos `/offers`, `/enqueue-publish`, account creation, identity creation, browser publishing, CAPTCHA, SMS, or bank-verification flows directly.
- Catalog readiness or draft creation is not publish approval.
- Catalog must not store Bazos cookies, sessions, verification codes, or raw challenge data.
