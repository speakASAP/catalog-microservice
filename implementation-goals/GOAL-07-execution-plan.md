# EP-CATALOG-07: Bazos Draft Integration Contract

```yaml
id: EP-CATALOG-07
status: source-ready
source_goal: implementation-goals/GOAL-07-bazos-draft-integration-contract.md
owner: orchestrator
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: implementation-ready
```

## Goal Impact

Catalog may request Bazos draft creation for a Catalog product, but Bazos remains the compliance, policy, challenge, queueing, and publishing authority.

## Project Invariants

- `CAT-INV-001`: Catalog supplies product truth for the draft request.
- `CAT-INV-005`: Bazos owns compliance, identities, drafts, publishing queues, pacing, duplicate checks, platform challenges, and publish actions.
- `CAT-INV-009`: Existing product reads remain backward compatible.
- `CAT-INV-010`: Mutation/action endpoints remain protected and audit logged.

## Sensitive Data

Use synthetic IDs and payloads in tests. Do not store or print service JWTs, Bazos cookies, verification codes, phone secrets, raw production product data, or session material.

## Scope

- Replace Catalog direct Bazos offer/account/identity/publish orchestration with a draft-request contract to Bazos.
- Keep the existing `sell-on-bazos` route as a compatibility alias, but return draft/action status rather than publishing.
- Add a clearer `POST /api/products/:id/bazos-draft` action route.
- Document the Catalog-to-Bazos draft request and response mapping.
- Add tests proving Catalog calls only the Bazos sell-action prepare endpoint and does not call Bazos offer publish/queue endpoints.

## Non-Goals

- Do not modify Bazos source.
- Do not publish directly to Bazos from Catalog.
- Do not create Bazos identities, accounts, pacing decisions, duplicate checks, or challenge handling in Catalog.
- Do not treat readiness or draft creation as publish approval.

## Validation

```bash
npm test -- --runInBand
npm run build
git diff --check
```
