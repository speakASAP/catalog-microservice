# Goal 05 - Catalog/Warehouse Contract

Status: deployed; full authorized Warehouse smoke deferred

## Intent

Catalog product identity and warehouse stock must align without moving stock ownership into catalog.

## Dependencies

- Goal 02.

## Scope

- Document product ID contract with warehouse.
- Add catalog-side stock projection client or endpoint if needed.
- Add batch availability contract to avoid N+1 consumer calls.
- Add smoke check for seeded products.

## Non-Goals

- Do not store stock quantities as catalog truth.
- Do not implement warehouse reservations, movements, or locations.
- Do not bypass warehouse auth boundaries.

## Acceptance Criteria

- Catalog can prove a product ID is valid before stock writes use it.
- Consumers have a batch path for availability.
- Stock remains owned by warehouse.

## Validation

```bash
npm run build
npm test
```

Add direct contract verification when warehouse endpoint access is available.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-002`, `CAT-INV-009`, and `CAT-INV-010`.


## Source Implementation Evidence

- Added protected `POST /api/products/availability/batch`.
- Catalog validates product IDs before any Warehouse request.
- Warehouse batch availability is called once per valid request.
- Returned stock fields are explicitly `source: "warehouse"` and are not stored as Catalog truth.
- Validation passed: `npm test -- --runInBand`, `npm run build`, and `git diff --check`.


## Deployment Evidence

- Commit `874e080` deployed successfully with `./scripts/deploy.sh`.
- Production health returned healthy.
- Safe smoke confirmed anonymous availability batch access is rejected with `401`.
- Full authorized Warehouse smoke requires explicit approval for production synthetic mutations and runtime credential use.
