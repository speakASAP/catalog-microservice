# Product Quality Validation Report

Generated at: 2026-07-02T21:03:24.108Z
Policy: catalog.product_quality.v1
Source: synthetic (synthetic/sanitized)
Owner identifiers masked: yes

## Summary

- Products audited: 3
- Blocked products: 2
- Ready for activation: 1

## Blockers

- [MISSING: generated description state contract]
- [MISSING: live Catalog API base/token; synthetic validation mode used]

## Owner Review Rows

| Product ID | SKU | Title | Owner | Source | Lifecycle | Blocking fields | Optional opportunities | Next action |
|---|---|---|---|---|---|---|---|---|
| 00000000-0000-4000-8000-000000000251 | [MISSING: sku] | Synthetic draft missing sellable fields | owner:synt...0001 | own | draft | sku, description, price, image | missing_brand | resolve_blockers:sku,description,price,image |
| 00000000-0000-4000-8000-000000000252 | SYN-READY-001 | Synthetic ready product | alfares | alfares | active | none | none | ready_for_activation |
| 00000000-0000-4000-8000-000000000253 | SYN-REVIEW-001 | Synthetic review product with placeholder media | owner:synt...0002 | community | needs_review | image | missing_manufacturer, missing_tags | resolve_blockers:image |
