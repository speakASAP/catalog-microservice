# GOAL-25: Canonical JSON Propagation And Manual Marketplace Overrides

```yaml
id: GOAL-25-CANONICAL-JSON-PROPAGATION
status: source-implementation
owner: Catalog integration owner
created: 2026-07-02
branch: main
```

## Vision

Catalog remains the canonical product content truth. Marketplace listings are generated from canonical JSON unless a human explicitly edits a marketplace-specific listing field.

## Goal Impact

Operators can safely improve a platform listing manually without losing their edits during later connector regeneration. When canonical product content changes, Catalog shows exactly which manual marketplace values need review before propagation.

## System

- Catalog owns canonical product JSON, marketplace profile metadata, propagation state, and product quality/readiness validation.
- Marketplace services own external accounts, compliance, pacing, drafts, publication, and live marketplace mutation.
- Raw marketplace payloads remain evidence only unless converted into canonical `descriptionRich` through review.

## Feature

- Track manual marketplace overrides per product and marketplace.
- Preserve manual overrides during generated connector propagation.
- Mark manual overrides stale when the canonical product source changed after the manual edit.
- Expose stale/manual status in the protected marketplace fields API.
- Show visual manual and source-changed markers in the Catalog product UI.
- Keep Catalog readiness validation explicit through `validationRequired` and `catalogReadinessRequired` propagation flags.

## Non-Goals

- No automatic publish/update to external marketplaces.
- No channel service ownership migration into Catalog.
- No production migration application without deploy approval.
- No destructive cleanup of existing Goal 24 dirty worktree files.
- No raw secrets, tokens, customer data, or private marketplace payloads in docs/tests.

## Acceptance Criteria

- Manual marketplace override writes populate `manualOverrides`.
- Marketplace field responses include `propagation.status`, `staleManualFields`, `validationRequired`, and per-field `manualOverride`/`stale`.
- Existing manual overrides are not overwritten by canonical connector regeneration.
- If `Product.updatedAt` is newer than the source timestamp stored on a manual override, that field is marked stale for review.
- Catalog UI shows visual markers for manual values and source-changed values.
- Contract docs describe manual override behavior and validation trigger semantics.

## Validation

```bash
npm test -- --runInBand src/marketplace-fields/marketplace-fields.service.spec.ts
npm run build
cd services/frontend && npm run build
git diff --check
```

Runtime validation remains blocked until additive migration/deploy approval and approved Auth token for protected Catalog endpoints.
