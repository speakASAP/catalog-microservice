# GOAL-20: Bulk Marketplace Publication Dispatch

```yaml
id: GOAL-20-BULK-MARKETPLACE-PUBLICATION
status: active
owner: catalog orchestrator
created: 2026-06-30
branch: feature/catalog-goal-19-canonical-content-connectors
```

## Vision

Catalog operators can select many products and send them to available marketplace publication workflows to increase sales reach.

## Goal Impact

This goal converts product-table bulk selection into a publication dispatch flow across FlipFlop, Bazos, Allegro, and Aukro without moving marketplace ownership into Catalog.

## System Boundary

Catalog owns selection, product truth, and publication readiness aggregation. Marketplace services own account/identity policy, draft creation, queueing, compliance, and final external publish actions.

## Feature

- Add a bulk publication action to the products table.
- Add `/dashboard/products/publish` with selected products and marketplace choices.
- Add protected `POST /api/products/publications/bulk` to dispatch selected product IDs to marketplace-owned workflows.
- Return per-product, per-marketplace result rows.

## Non-Goals

- No preview workflow in this goal.
- No direct Bazos posting from Catalog.
- No stock, pricing, auth, or checkout ownership change.
- No destructive data operations.

## Acceptance Criteria

- A selected group on `/dashboard/products` has a publish button.
- The publish button opens a dedicated publication page.
- The page lists selected products and marketplace choices.
- Submitting calls a protected Catalog bulk endpoint.
- The bulk endpoint dispatches to existing single-product Bazos, Allegro, Aukro, and FlipFlop flows.
- Results show sent, blocked, or failed status per item/channel.
