# Goal 15 - Bazos Authorized Draft Runtime Smoke

Status: active

## Intent

Catalog should prove the protected Bazos draft-preparation contract works with approved runtime credentials and explicit Bazos smoke inputs, without queueing, publishing, bypassing Bazos policy, or storing runtime values in the codebase.

## Dependencies

- Goal 07.
- Goal 09.
- Goal 14.
- Bazos-service catalog sell-action contract.

## Scope

- Add a dedicated `npm run smoke:e2e:bazos-authorized` alias.
- Require an explicit `CATALOG_SMOKE_BAZOS_PRODUCT_ID` so the side-effecting Bazos draft check never reuses the generic smoke product accidentally.
- Validate the Bazos authority envelope, draft identity, confirmation flags, policy status exposure, and next-action fields.
- Keep tokens, identity IDs, category values, and optional location values in Vault/Kubernetes runtime configuration, not repository files.
- Record Bazos authorized runtime evidence without raw response bodies, credentials, identity contact data, cookies, sessions, verification codes, or challenge payloads.

## Non-Goals

- Do not confirm, enqueue, publish, renew, or delete Bazos ads.
- Do not bypass SMS, bank, CAPTCHA, device, cookie, duplicate, category cadence, or active-ad controls.
- Do not create or modify Bazos code.
- Do not commit Bazos identity IDs, categories, service tokens, JWTs, contact data, or raw draft payloads.
- Do not make Bazos authorized smoke part of the default smoke.

## Acceptance Criteria

- `npm run smoke:e2e` remains anonymous-safe.
- `npm run smoke:e2e:authorized` continues to pass Warehouse/FlipFlop checks and skip Bazos unless the second gate is enabled.
- `npm run smoke:e2e:bazos-authorized` skips with a clear reason when explicit Bazos runtime inputs are missing.
- With Vault/Kubernetes runtime inputs, `npm run smoke:e2e:bazos-authorized` prepares or reuses a Bazos draft and validates the bounded Catalog response.
- Validation docs prove that no Bazos publish queue or confirmation action was invoked.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-003`, `CAT-INV-005`, `CAT-INV-009`, and `CAT-INV-010`.
- Bazos remains policy, identity, draft, queue, challenge, and publishing authority.
- Catalog only requests draft preparation and surfaces Bazos-owned status.
