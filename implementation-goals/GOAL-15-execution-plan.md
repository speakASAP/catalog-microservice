# Goal 15 Execution Plan - Bazos Authorized Draft Runtime Smoke

```yaml
goal_id: CAT-G15
status: done
created: 2026-06-13
branch: feature/catalog-goal-15-bazos-authorized-draft-smoke
```

## Context

Goal 14 proved authorized Warehouse and FlipFlop runtime contracts. The Bazos draft path remained skipped because it needs explicit Bazos identity/category inputs and can create Bazos-owned draft work. Goal 15 closed that gap without committing runtime inputs.

## Plan

1. Add a dedicated Bazos-authorized smoke alias that enables both authorization gates.
2. Require `CATALOG_SMOKE_BAZOS_PRODUCT_ID` for the Bazos check instead of falling back to the generic smoke product.
3. Extend the Bazos draft assertion to validate Bazos authority, draft identity, confirmation flags, policy status, human-action status, and next action.
4. Add placeholder env names only.
5. Store runtime Bazos smoke inputs in Vault/Kubernetes only.
6. Run source validation.
7. Run authorized smoke first without Bazos inputs to prove safe skip.
8. Run Bazos-authorized runtime smoke only after runtime inputs are present.
9. Update validation/status evidence without token values or raw Bazos payloads.

## Completion

- Steps 1-9 completed.
- Catalog deployed from `main` merge commit `555652c`.
- Runtime Bazos smoke passed: 12 passed, 0 skipped, 0 failed.
- Runtime data and service tokens remain in Vault/Kubernetes and Bazos runtime storage, not source.

## Invariants

- `CAT-INV-001`: Catalog remains product truth only.
- `CAT-INV-003`: Auth remains identity/JWT authority; Catalog verifies only.
- `CAT-INV-005`: Bazos remains compliance, identity, draft, queue, challenge, and publishing authority.
- `CAT-INV-009`: Public reads and default smoke behavior remain backward compatible.
- `CAT-INV-010`: Protected draft action remains authenticated and audited.

## Validation

```bash
npm run smoke:e2e
npm run smoke:e2e:authorized
npm run smoke:e2e:bazos-authorized
npm test -- --runInBand
npm run build
git diff --check
```
