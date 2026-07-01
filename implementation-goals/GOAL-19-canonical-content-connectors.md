# GOAL 19 - Canonical Content Connectors

## Vision

Catalog remains the Statex product truth service for sellable product content while marketplace services render channel-specific listings without redefining product truth.

## Goal Impact

Operators can edit one canonical JSON product description and preview how the same product will render for Allegro, Bazos, Aukro, FlipFlop, and future marketplaces. Imported HTML remains source evidence, not Catalog truth. Channel-specific differences are stored as small overrides and connector rules instead of full duplicated descriptions.

## System

- Catalog owns canonical product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, publication readiness, connector contracts, and canonical preview generation.
- Marketplace services own platform accounts, compliance, drafts, publishing queues, external listing mutation, and service-local UX.
- Warehouse remains the stock authority.
- Auth remains the identity and RBAC authority.

## Feature

Add a product content document and connector rendering contract:

- `products.descriptionRich` stores the canonical structured JSON description document.
- `products.description` remains a clean plain-text fallback and backward-compatible read field.
- Catalog connector renderers convert canonical content plus marketplace profile overrides into channel output formats.
- Catalog exposes protected preview APIs for all supported marketplaces.
- Catalog admin shows canonical plain text, canonical JSON, and channel previews.
- Marketplace profile `sourceData` may store imported raw platform payload evidence, but raw HTML is not canonical.

## Task

Implement additive backend and frontend surfaces:

- SQL migration for `products.description_rich`.
- Product DTO/entity support for canonical content JSON.
- Catalog content renderer module and tests.
- `GET /api/products/:id/content-previews` and `GET /api/products/:id/content-previews/:marketplace`.
- Catalog frontend preview panel on product detail.
- Documentation for connector design and adding new marketplaces.

## Execution Plan

1. Create execution plan and pre-coding gate evidence.
2. Add canonical content document types, defaults, normalization, plain-text extraction, and renderers.
3. Add protected preview API and frontend types/client.
4. Add product detail preview UI without replacing marketplace publish authority.
5. Document connector lifecycle and new-channel requirements.
6. Validate backend, frontend typecheck/build, and docs/status.

## Parallel Execution

| Workstream | Status | Owner | Scope | Dependencies | Validation |
|---|---|---|---|---|---|
| A - Catalog schema and renderer | ready now | orchestrator | `src/products`, `src/content-connectors`, migration, backend tests | none | focused Jest, build |
| B - Catalog preview UI | dependency-gated | Catalog frontend worker | `services/frontend/components`, product detail, API types | Workstream A API shape | frontend tsc/build |
| C - Channel service local previews | dependency-gated | channel workers | one repo per channel: Allegro, Bazos, Aukro, FlipFlop | Workstream A contract | service-specific build/tests |
| D - Docs and validation | ready now | orchestrator | goal docs, connector contract, validation reports, status | none | diff check, doc review |
| E - Final integration | final integration | orchestrator | merge validation, deploy readiness, state update | A-D complete | full backend/frontend gates |

Shared files/contracts: content preview API response, canonical content document schema, connector profile override keys.

Integration owner: Catalog orchestrator.

Validation owner: Catalog orchestrator.

Merge order: Catalog contract/schema -> Catalog UI -> channel services -> validation/status -> deployment.

## Coding Prompt

Implement canonical JSON product descriptions and connector previews so Catalog owns reusable product content and channel services can render marketplace-specific listings without duplicating full descriptions.

## Code

- `[MISSING: implementation pending]`

## Validation

- `[MISSING: implementation validation pending]`

## Intent Compliance Report

- CAT-INV-001: Catalog remains canonical product truth for sellable content.
- CAT-INV-002: no Warehouse stock ownership is added.
- CAT-INV-003: protected preview/write surfaces preserve Auth boundary.
- CAT-INV-004: FlipFlop storefront and checkout remain in FlipFlop.
- CAT-INV-005: Bazos compliance and publishing remain in Bazos.
- CAT-INV-008: no inline media blobs are introduced.
- CAT-INV-009: existing product read contracts remain backward compatible.
- CAT-INV-010: mutation endpoints remain protected and audited.
