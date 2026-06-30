# VAL-GOAL-19: Canonical Content Connectors

```yaml
id: VAL-GOAL-19-CANONICAL-CONTENT-CONNECTORS
status: source_pass_catalog_and_channels
validated_artifact: implementation-goals/GOAL-19-canonical-content-connectors.md
owner: catalog orchestrator
created: 2026-06-30
last_updated: 2026-06-30
```

## Artifact Validated

Branch: `feature/catalog-goal-19-canonical-content-connectors`

Commit: `[MISSING: commit pending before deployment]`

Scope: Catalog core canonical description JSON model, connector renderer service, protected preview API, Catalog product detail preview panel, docs/contract artifacts, and channel-service preview/draft integrations for Allegro, Bazos, Aukro, and FlipFlop.

## Validation Scope

Validated source-level Catalog implementation plus source-level channel integrations. Catalog deployment candidate is isolated in `/home/ssf/Documents/Github/catalog-goal19-deploy` on branch `codex/catalog-goal-19-deploy`. Runtime Catalog migration and production deployment are pending.

## Evidence

- Added additive `products.description_rich` migration.
- Added `descriptionRich` entity/DTO support while keeping `description` as plain text.
- Added `src/content-connectors/*` renderer/controller/module.
- Added protected preview endpoints:
  - `GET /api/products/:productId/content-previews`
  - `GET /api/products/:productId/content-previews/:marketplace`
- Added Catalog product-detail preview panel.
- Updated Bazos/Allegro draft preparation to use generated connector output when no explicit description override is supplied.
- Implemented Allegro sell-action preview evidence, generated-description fallback, explicit override precedence, and frontend preview display.
- Implemented Bazos guarded catalog sell-action preview fetch/display and canonical plain-text submission when description is not edited.
- Implemented Aukro from-catalog preview fetch/display and draft snapshot source evidence.
- Implemented FlipFlop product-service/admin read-only preview endpoint and admin sync preview display.

## Gate Evidence

| Command | Result | Evidence |
|---|---|---|
| `git diff --check` | Pass | no whitespace errors |
| `npm test -- --runInBand src/content-connectors/content-renderer.service.spec.ts src/products/products.service.spec.ts` | Pass | 2 suites, 24 tests |
| `npm test -- --runInBand` | Pass | 9 suites, 70 tests |
| `npm run build` | Pass | Nest build passed |
| `cd services/frontend && ./node_modules/.bin/tsc --noEmit` | Pass | no output after Next build regenerated `.next/types` |
| `cd services/frontend && npm run build` | Pass | Next build passed with existing multiple-lockfile warning |
| Isolated Catalog candidate `git diff --check` | Pass | no whitespace errors in `/home/ssf/Documents/Github/catalog-goal19-deploy` |
| Isolated Catalog candidate focused tests | Pass | 2 suites, 24 tests |
| Isolated Catalog candidate full Jest | Pass | 9 suites, 70 tests |
| Isolated Catalog candidate backend build | Pass | Nest build passed |
| Isolated Catalog candidate frontend typecheck/build | Pass | `tsc --noEmit` passed; Next build passed with existing multiple-lockfile warning |
| Allegro `git diff --check`, `npm run ips:audit`, `npm run ips:pre-coding` | Pass | IPS audit score 100/100 and pre-coding gate passed |
| Allegro catalog sell-action spec and service/frontend builds | Pass | `catalog-sell-action.spec: PASS`, service `tsc && tsc-alias`, frontend `tsc && vite build` |
| Bazos `git diff --check`, shared/service builds, focused sell-action tests | Pass | focused Bazos catalog sell-action suite passed 10 tests |
| Aukro shared build, service tests/build, strict doc audit, gates, diff check | Pass | strict doc audit score 100/100; pre-coding and deployment-readiness gates passed |
| FlipFlop pre-coding gate, strict doc audit, diff check, product-service/frontend builds | Pass | strict doc audit score 100/100; product-service and frontend builds passed |

## Invariant Evidence

- CAT-INV-001: canonical sellable content now lives in Catalog as structured JSON.
- CAT-INV-002: no Warehouse stock mutation or persistence was added.
- CAT-INV-003: preview endpoints use `CatalogAuthGuard`; Auth ownership is unchanged.
- CAT-INV-004: FlipFlop storefront/checkout UX remains outside Catalog.
- CAT-INV-005: Bazos compliance/publishing remains in Bazos; Catalog only generates draft text.
- CAT-INV-008: no media blobs were added.
- CAT-INV-009: `description` remains a backward-compatible plain-text field.
- CAT-INV-010: product mutation paths remain protected and audited.

## Sensitive-Data Evidence

Tests and docs use synthetic content only. No secrets, tokens, customer data, payment data, production screenshots, or raw private marketplace payloads were added.

## Passed Criteria

- Canonical JSON can render to Allegro HTML, Bazos plain text, Aukro plain text, and FlipFlop structured blocks.
- Legacy HTML-like descriptions are sanitized into plain text.
- Catalog product detail can request and display connector previews.
- Source-level backend and frontend validation passed.
- Channel services can request and show marketplace-specific previews while keeping Catalog as canonical source.
- Explicit seller-supplied marketplace descriptions remain authoritative over generated previews.

## Failed Criteria

- `[MISSING: runtime migration application]`
- `[MISSING: production deployment]`
- `[MISSING: deployment commit SHA]`

## Deviations

Two unrelated pre-existing or concurrent dirty files are present in the Catalog worktree and were not touched by this goal:

- `services/frontend/app/dashboard/admin/page.tsx`
- `src/auth/auth.service.ts`

Concurrent Goal 20 bulk marketplace publication files also appeared in the original Catalog worktree and are not part of Goal 19 validation/deploy scope. They are excluded from the isolated deployment candidate.

## Recommendation

Accept Goal 19 source across Catalog and channel services. Commit the isolated Catalog deployment candidate, apply the additive `description_rich` migration, deploy the affected services in dependency order, and run runtime preview smoke.
