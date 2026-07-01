# EP-CATALOG-19: Canonical Content Connectors

```yaml
id: EP-CATALOG-19-CANONICAL-CONTENT-CONNECTORS
status: active
source_goal: implementation-goals/GOAL-19-canonical-content-connectors.md
owner: catalog orchestrator
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: planned
branch: feature/catalog-goal-19-canonical-content-connectors
```

## Metadata

Lifecycle state: active owner-approved goal created from the 2026-06-30 owner request to store canonical JSON product descriptions, render channel-specific connector outputs, and expose previews in Catalog and channel services.

Docs-rag retrieval: `[MISSING: docs-rag JWT_TOKEN]`; repository files and company IPS reference were used instead.

## Upstream Traceability

- BUSINESS.md: Catalog is the single source of truth for product descriptions across sales channels.
- SYSTEM.md: Catalog owns product content and serves consumers including FlipFlop, Allegro, Aukro, and Bazos.
- docs/orchestrator/INTENT.md: channel integrations are adapters, not owners.
- docs/governance/PROJECT_INVARIANTS.md: CAT-INV-001, CAT-INV-004, CAT-INV-005, CAT-INV-009, CAT-INV-010.
- implementation-goals/GOAL-18-marketplace-field-profiles.md: marketplace profiles already store overrides, external refs, and source data.
- /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system: documentation-before-implementation, traceability, ADRs for major decisions, validation at every level.

## Goal Impact

This goal turns imported marketplace HTML into source evidence and creates a reusable canonical product-content model. Operators edit one canonical JSON document, while connector renderers generate Allegro HTML-like/structured output, Bazos plain text, Aukro formatted text, and FlipFlop storefront preview output.

## Project Invariants

- CAT-INV-001 preserved: Catalog owns canonical sellable content and channel projections consume it.
- CAT-INV-002 preserved: stock remains Warehouse-owned; this goal does not add stock storage or mutation.
- CAT-INV-003 preserved: protected preview/profile writes continue through Catalog auth.
- CAT-INV-004 preserved: FlipFlop owns storefront UX; Catalog only produces preview/projection payloads.
- CAT-INV-005 preserved: Bazos owns compliance and publishing; Catalog only prepares draft content.
- CAT-INV-008 preserved: content JSON references media by URL/object references only; no blobs.
- CAT-INV-009 preserved: `products.description` remains backward-compatible plain text.
- CAT-INV-010 preserved: product writes remain protected and audited.

## Sensitive-Data Handling

Description content, SKUs, titles, and public media URLs are catalog operational data. Tests and docs use synthetic examples only. No tokens, raw private customer data, production screenshots, raw logs, payment data, or marketplace credentials may be written to prompts, docs, reports, or tests.

## Contract/Schema Impact

Schema impact: additive nullable `products.description_rich jsonb`.

API impact: additive `descriptionRich` field on product responses and additive content preview endpoints. Existing `description` remains present and should contain clean plain text.

Marketplace profile impact: existing `overrides` can carry connector keys such as `descriptionPrefix`, `descriptionSuffix`, `headline`, `formatHints`, and channel-specific field values.

## Scope

- Add canonical content document model and normalization.
- Convert old plain text descriptions into rich document fallback at runtime.
- Strip HTML tags from canonical plain text when product descriptions are updated.
- Add connector renderers for `allegro`, `bazos`, `aukro`, and `flipflop`.
- Add Catalog preview API and Catalog admin preview panel.
- Update docs and validation evidence.

## Non-Goals

- Do not run destructive data cleanup or mass rewrite production product descriptions in this goal.
- Do not move marketplace publishing, policy, queueing, CAPTCHA/challenge, account, or listing ownership into Catalog.
- Do not implement FlipFlop checkout or storefront routing inside Catalog.
- Do not add Warehouse stock ownership or pricing bulk changes.
- Do not store raw image blobs or raw private marketplace credentials.

## Files To Inspect

- `src/products/product.entity.ts`
- `src/products/dto/index.ts`
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- `src/products/products.module.ts`
- `src/marketplace-fields/marketplace-fields.service.ts`
- `src/marketplace-fields/marketplace-profile.entity.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/dashboard/products/[id]/page.tsx`
- `services/frontend/components/MarketplaceFieldsPanel.tsx`
- `implementation-goals/GOAL-18-marketplace-field-profiles.md`

## Files To Create

- `src/content-connectors/content-document.ts`
- `src/content-connectors/content-renderer.service.ts`
- `src/content-connectors/content-renderer.service.spec.ts`
- `src/content-connectors/content-preview.controller.ts`
- `src/content-connectors/content-connectors.module.ts`
- `services/frontend/components/ProductContentPreviewPanel.tsx`
- `scripts/migrations/20260630_goal19_product_description_rich.sql`
- `docs/contracts/marketplace-description-connectors.md`
- `reports/validation/GOAL-19-pre-coding-gate.md`
- `reports/validation/VAL-GOAL-19-canonical-content-connectors.md`

## Files To Modify

- `src/products/product.entity.ts`
- `src/products/dto/index.ts`
- `src/products/products.service.ts`
- `src/products/products.service.spec.ts`
- `src/products/products.module.ts`
- `src/app.module.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/dashboard/products/[id]/page.tsx`
- `implementation-goals/README.md`
- `docs/orchestrator/GOALS.md`
- `docs/orchestrator/PLAN.md`
- `docs/orchestrator/STATUS.md`
- `docs/IMPLEMENTATION_STATE.md`

## Files That Must Not Be Modified

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/INTENT.md`
- `docs/governance/PROJECT_INVARIANTS.md`
- Kubernetes manifests and deployment scripts unless a later deployment-readiness plan explicitly requires them.
- Secret, Vault, or credential files.

## Implementation Steps

1. Create Goal 19 docs and pre-coding gate report.
2. Add `descriptionRich` entity/DTO support and SQL migration.
3. Add content document normalizer, text extraction, HTML stripping, and marketplace renderer service.
4. Add protected preview controller for all marketplaces and one marketplace.
5. Update ProductsService to maintain plain text and fallback rich content on create/update and to use rendered descriptions for Bazos/Allegro draft requests.
6. Add frontend API types and product preview panel with Catalog, Allegro, Bazos, Aukro, and FlipFlop tabs.
7. Add connector documentation and update state/status.
8. Run focused and broad validation.

## Test Plan

- Focused renderer tests for text extraction, HTML stripping, fallback from legacy plain text, and output formats.
- ProductsService tests for canonical plain text normalization where practical.
- Backend build and full Jest.
- Frontend `tsc --noEmit` and build.

## Validation Plan

- `git diff --check`
- `npm test -- --runInBand src/content-connectors/content-renderer.service.spec.ts`
- `npm test -- --runInBand`
- `npm run build`
- `cd services/frontend && ./node_modules/.bin/tsc --noEmit`
- `cd services/frontend && npm run build`

## Gate Commands

```bash
git diff --check
npm test -- --runInBand src/content-connectors/content-renderer.service.spec.ts
npm test -- --runInBand
npm run build
cd services/frontend && ./node_modules/.bin/tsc --noEmit
cd services/frontend && npm run build
```

## Documentation Updates

- Add `docs/contracts/marketplace-description-connectors.md`.
- Update implementation state, orchestrator status, goal backlog, and goal index.
- Add validation report after checks run.

## Rollback Plan

- Revert additive module/controller/entity/DTO/frontend/docs changes.
- Drop `products.description_rich` only if the migration was applied and the rollback is explicitly approved.
- Existing `products.description` remains the plain text fallback, so product reads continue if preview endpoints are disabled.

## Agent Handoff Prompt

Implement Goal 19 as an additive Catalog-owned content connector contract. Preserve Catalog product truth, keep marketplace services as publishing/compliance owners, do not print secrets or raw production data, and keep existing product reads backward compatible.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
