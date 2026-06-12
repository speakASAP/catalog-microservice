# Goal 01 - Catalog Contract And Auth Boundary

Status: done

## Intent

Catalog must be safe as the central product truth service. Public reads remain available where intended, while product, category, attribute, media, and pricing writes require authorization and produce actor/source evidence.

## Dependencies

None.

## Scope

- Protect catalog mutation endpoints.
- Gate hard product deletion behind explicit owner approval and highest required role.
- Add write audit context for mutation paths.
- Verify unauthorized and authorized write behavior.

## Non-Goals

- Do not implement product lifecycle/readiness model.
- Do not implement channel readiness.
- Do not implement warehouse stock ownership.
- Do not implement FlipFlop or Bazos service changes.

## Chunks

- [x] 1.1 Add catalog-local intent preservation docs and master prompt.
- [x] 1.2 Protect mutation endpoints with JWT/RBAC or internal service identity.
- [x] 1.3 Gate hard delete behind explicit owner approval and superadmin role.
- [x] 1.4 Add audit-grade actor/source logging for writes.
- [x] 1.5 Add tests or direct API verification for unauthorized and authorized writes.

## Acceptance Criteria

- Public reads remain available where intended.
- Product, category, attribute, media, and pricing mutations require authorization.
- Hard delete is disabled or gated behind explicit owner approval.
- Write logs include actor/source enough for audit follow-up.
- `npm run build` passes.

## Validation

Run or document why unavailable:

```bash
npm run build
npm test
```

Direct API verification should cover unauthorized mutation rejection and at least one authorized write path when credentials are available.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-003`, `CAT-INV-006`, `CAT-INV-009`, and `CAT-INV-010`.
- Do not move identity ownership into catalog.
- Do not weaken public read compatibility.
