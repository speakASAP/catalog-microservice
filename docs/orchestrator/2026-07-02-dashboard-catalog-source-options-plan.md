# E-Commerce Dashboard Catalog Source Options - Cross-Repo Plan

```yaml
id: CROSS-REPO-ECOM-DASHBOARD-CATALOG-SOURCES-2026-07-02
status: audit-and-source-integration
created: 2026-07-02
owner: Catalog integration/orchestration owner
repositories:
  in_scope:
    - catalog-microservice
    - bazos
    - heureka
    - allegro
    - aukro
    - flipflop
  candidate_or_dependency_review:
    - shop-assistant
    - chytrakoupe
    - rent-a-box
source_request: user personal-account catalog options across Bazosh/Bazos, Evrika/Heureka, Allegro, Aukro, FlipFlop, and adjacent e-commerce projects
```

## Vision

Every registered seller/customer account in Alfares e-commerce surfaces can work from the dashboard with a unified Catalog-backed product source model: own products, Alfares/company products, and products that other users explicitly publish for resale.

## Goal Impact

The platform becomes a shared commerce network instead of isolated channel tools. Users can add their own goods, opt selected goods into shared resale, and build assortments from their own products, Alfares products, and community products while marketplace publication remains bound to the current user's channel account and compliance gates.

## System

- Auth owns registration, hosted login/callback, token validation, and user identity.
- Catalog owns product truth, ownership, source settings, resale visibility, source-scoped reads, and Catalog-side publication eligibility.
- Channel services own marketplace accounts, local drafts, external publication, policy checks, pacing, and marketplace-specific status.
- FlipFlop storefront owns public browsing/cart/checkout; user product source management must remain separate from anonymous storefront browsing.
- Warehouse remains stock authority. Orders and Payments are outside this source-options audit unless a publish flow explicitly depends on them.

## Feature Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| R1 | User can work with Alfares/company catalog products from the personal account | Dashboard exposes a visible option or enabled source path to include/select Alfares catalog products, backed by Catalog human-token scope. |
| R2 | User can upload/manage own product data | Dashboard has create/import/edit product flow that creates Catalog products owned by the authenticated user. |
| R3 | User can publish own products for common resale | Owner UI exposes a resale/public-sharing option, backed by `resaleEnabled`/equivalent owner-only mutation. |
| R4 | User can load/select own, other users' shared products, and company products | Product picker/list uses Catalog effective source scope or explicit source checkboxes for own + Alfares + community products. |
| R5 | Non-owned products remain read-only in Catalog | Users can publish/select eligible shared products but cannot mutate another seller's or Alfares canonical product record. |
| R6 | Channel publication remains user-owned | Drafts/listings are created under the current user's marketplace identity/account, not a global account unless an approved service-owned path already exists. |

## Intent Preservation Chain

- Vision: shared Catalog-backed product sourcing in every e-commerce dashboard.
- Goal Impact: increase sellable assortment and resale reach without losing ownership, stock, or channel-compliance boundaries.
- System: Catalog/Auth/channel/warehouse boundaries above.
- Feature: dashboard source options, own-product creation, owner resale publication, effective source picker.
- Task: inspect each personal cabinet, fill missing UI/API wiring, and validate evidence per repo.
- Execution Plan: parallel workstreams below with disjoint repo ownership and Catalog as integration owner.
- Coding Prompt: each worker must use this document plus repo AGENTS.md/STATE, touch only allowed files, and preserve dirty worktree changes.
- Code: source changes only inside the owning repo/workstream after audit confirms a gap.
- Validation: static source evidence, focused tests/builds, and runtime smoke only when approved token/deploy gates exist.

## Current Shared Catalog Evidence To Verify

- Catalog exposes `POST /api/catalog/access/provision`, `GET/PATCH/PUT /api/catalog/settings`.
- Catalog product reads support `catalogScope=own|effective|alfares|community|all` and `catalogSources=own,alfares,community`.
- Catalog products include `owner_user_id` and `resale_enabled` source semantics.
- Catalog frontend has source checkboxes for Alfares and community products and product forms expose resale publishing.
- Channel dashboards must forward the human bearer token and request effective source scope where they provide personal-account product pickers.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Expected output | Validation evidence |
|---|---|---|---|---|---|---|---|
| WS-CATALOG | source+runtime verified | Catalog backend+frontend verifier | Confirm source settings, effective scope, resale flag, dashboard controls, and docs consistency. | `catalog-microservice/src/catalog-access/**`, `src/products/**`, `services/frontend/**`, docs/reports if needed | Auth JWT shape, Warehouse/Orders/Payments, secrets, production DB mutation | Matrix proving R1-R5 at shared source. | Catalog backend/frontend builds, focused tests, live health, protected API 401 checks. |
| WS-BAZOS-HEUREKA | source pushed / runtime gated | Channel UI verifier | Bazos and Heureka dashboards/product pickers. | read-only first; code only after orchestrator assigns disjoint files | dirty unrelated files, deploy scripts, secrets | Present/missing/unknown matrix. | Bazos `9f8f2bb` pushed, Heureka `bf467cd` pushed; live deploy alignment remains gated. |
| WS-ALLEGRO-AUKRO | source pushed / runtime gated | Channel UI verifier | Allegro and Aukro dashboards/product pickers. | read-only first; code only after orchestrator assigns disjoint files | dirty unrelated files, deploy scripts, secrets | Present/missing/unknown matrix. | Allegro `9258129` pushed, Aukro `f237fda` pushed; live deploy alignment remains gated. |
| WS-FLIPFLOP-CANDIDATES | source committed / runtime provenance gated | Channel/storefront classifier | FlipFlop plus shop-assistant, chytrakoupe, rent-a-box classification. | read-only first; code only after orchestrator assigns disjoint files | active unrelated FlipFlop GOAL-12 files, deploy scripts, secrets | In-scope/out-of-scope decision and matrix. | FlipFlop `30a5e6c` is in `main`; current live images use `latest`/GOAL-12 tag without immutable commit provenance. |
| WS-INTEGRATION | source integration complete / deploy gated | Orchestrator | Merge audit results, update plan/status, decide if code changes/deploys are needed. | docs/orchestrator, validation reports, narrowly assigned code gaps | uncoordinated shared schema/contract edits | Final status, blockers, validation summary. | cross-repo git status and validation results. |

## Merge And Deployment Order

1. Catalog contract/source verification.
2. Per-channel dashboard UI/API verification or small disjoint fixes.
3. Integration documentation update across affected repos.
4. Validation gates per repo.
5. Deploy only after repo preflight, validation evidence, and explicit deploy gate. Current source commits are pushed, but no channel deploy is implied by this plan update.

## Known Dirty Worktree Caveats At Plan Creation

- `bazos`: source pushed to `9f8f2bb`; unrelated `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md` remains untracked; live runtime still uses image `33eaf4d`.
- `heureka`: source pushed to `bf467cd`; live images still show older `43e890b`.
- `allegro`: source pushed to `9258129`; live images still show older `ec6f97a`.
- `aukro`: source pushed to `f237fda`; `reports/validation/ips-pre-coding-gate.json` remains dirty from an unrelated related-products gate; live image still shows older `dc5a362`.
- `flipflop`: active unrelated GOAL-12 upsell/product-detail edits are present and deployed under a GOAL-12 product-service tag; do not touch or revert them for Catalog source work.
- `catalog-microservice`: source clean at `66c97e2`; runtime backend image `d2a2f66` and frontend `latest` are running.
- Adjacent candidates are classified before code changes.

## Validation Matrix

| Case | Expected result |
|---|---|
| New authenticated user opens dashboard | Own product source is available; source settings can be provisioned. |
| User creates/imports product | Product is owned by current Auth subject. |
| User toggles product resale | Only owner/admin can set product available for resale. |
| User enables Alfares source | Company products appear/select in effective product picker. |
| User enables community source | Other users' `resaleEnabled=true` products appear/select in effective product picker. |
| User edits non-owned product | Forbidden or UI hides mutation controls. |
| User publishes selected product | Channel-specific draft/listing binds to current user's channel account. |

## Open Items

- `[MISSING: approved Auth token for authorized end-to-end smoke in every dashboard]`
- `[UNKNOWN: final localized dashboard copy for every language]`
- Candidate review complete: `shop-assistant`, `chytrakoupe`, and `rent-a-box` are not seller/channel publication cabinets in this first wave; no Catalog source picker/resale controls are required there unless a later goal adds seller marketplace publication.
- `[MISSING: explicit deploy gate for Allegro/Aukro/Bazos/Heureka channel images and FlipFlop immutable provenance check]`

## Candidate Review Evidence

| Repo | Decision | Evidence |
|---|---|---|
| `shop-assistant` | out of first-wave Catalog source controls | Product-search assistant with authenticated search/profile/dashboard work; no seller-owned marketplace publication cabinet found in source scan. |
| `chytrakoupe` | out of first-wave Catalog source controls | Conversion storefront/customer auth slice; product discovery consumes existing product API, not seller source management. |
| `rent-a-box` | out of first-wave Catalog source controls | Self-storage rental MVP with registration, rentals, contracts, PINs, and mock payment; not an e-commerce product resale surface. |
