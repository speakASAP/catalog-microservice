# AOS Auth Static Inventory - catalog-microservice

Date: 2026-06-24
Worker: parallel Alfares Auth modernization implementation worker
Scope: catalog-microservice Auth guard migration, static guardrail update, and focused unit coverage only
Central standard: `/home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md`
Legacy exclusion: legacy `speakasap-portal` was not inspected or touched.
Forbidden runtime access: no secrets, `.env` values, live database, production logs, deployment, backfill, or live smoke were used.

## IPS Chain

- Vision: align catalog-microservice with Auth-hosted consumer behavior while preserving Catalog as product truth.
- Goal Impact: remove duplicated local bearer JWT validation from Catalog and route human token validation through central Auth.
- System: commerce/backend service `catalog-microservice`; provider standard is Auth-hosted login/register plus `/auth/validate` token validation.
- Feature: hosted Auth consumer compliance for protected Catalog writes, role preservation, service identity separation, and fail-closed user-token validation.
- Task: migrate Catalog human Bearer-token validation from local HS256/JWT_SECRET verification to Auth `POST /auth/validate`, while preserving `x-internal-service-token` machine boundary and existing role checks.
- Execution Plan: keep service-token resolution first, call Auth server-side for Bearer tokens, attach `catalogActor` type `jwt` from Auth user data, reject local HS256/JWT_SECRET verification in static checks, add focused guard specs, and run targeted validation without deploy or live data access.
- Coding Prompt: user requested remote-only implementation in `/home/ssf/Documents/Github/catalog-microservice` with allowed files limited to auth guard/module or small service, auth specs, static checker, package script if necessary, and this inventory.
- Code: `src/auth/catalog-auth.guard.ts` now calls Auth `POST /auth/validate` with `{ token }` using `AUTH_SERVICE_URL` defaulting to existing repo convention `http://auth-microservice:3370`; local HS256/JWT_SECRET verification removed for human Bearer tokens; `src/auth/catalog-auth.guard.spec.ts` covers Auth validation success, invalid response fail-closed, required-role preservation, and internal service-token bypass.
- Validation: see `Validation Evidence 2026-06-24` below.

## Static Commands Used

- `git status --short --branch`
- `sed -n` inspections of `src/auth/catalog-auth.guard.ts`, `src/auth/auth.module.ts`, `src/auth/auth.service.ts`, `scripts/check-aos-auth-contract.js`, and this inventory
- `rg -n "CatalogAuthGuard|CatalogRoles|AuthModule|HttpModule|providers:|imports:" src --glob "*.ts"`
- Package script inspection through `node -e` without reading secrets or runtime config values

## Auth Surfaces Found

- Login/register UI: no Catalog UI login/register surface found in `src` or `docs`; Catalog appears backend/API-oriented.
- Auth API/proxy routes: `src/auth/auth.controller.ts` still exposes local `POST /api/auth/login`, `POST /api/auth/register`, and `GET /api/auth/profile` proxy routes. This remains transitional debt outside this Bearer-token validation lane.
- Token storage: no browser localStorage/sessionStorage surface found in scanned Catalog source/docs.
- Backend guards/validation: `src/auth/catalog-auth.guard.ts` protects Catalog writes with `CatalogAuthGuard`, default write roles, Auth `POST /auth/validate` for human Bearer tokens, and `request.catalogActor` propagation.
- Role decorators: `src/auth/catalog-auth.decorator.ts` and guarded controllers use required Catalog roles; product hard delete requires `global:superadmin`.
- Protected route examples: product create/update/delete, Bazos draft/sell actions, category writes, media writes, pricing writes, import reconciliation, and warehouse availability routes use `CatalogAuthGuard`.
- Service-token paths: `CatalogAuthGuard` still accepts `x-internal-service-token` from runtime config as an internal-service actor; Catalog also forwards Bazos and Warehouse service tokens from runtime config for downstream service calls.

## Comparison To Hosted Auth Consumer Standard

- Consumer entry points: gap remains. Catalog has local `/api/auth/login` and `/api/auth/register` proxy endpoints instead of redirecting human users to hosted Auth. These endpoints are transitional debt and were intentionally not changed in this lane.
- Callback handoff: gap remains. No static evidence of `/auth/callback`, URL-fragment token parsing, state validation, fragment stripping, or redirect-to-original-path behavior.
- Session model: [MISSING: Catalog human session model]. No browser session surface was found; backend API callers rely on bearer tokens or service token headers.
- Backend token validation: migrated for Catalog writes. Human Bearer tokens now use server-side Auth `POST /auth/validate` with `{ token }`; Auth response shape `{ valid: true, user: { id/sub/email/roles } }` is accepted; full roles are preserved on `catalogActor` type `jwt`.
- Local JWT debt: local HS256/JWT_SECRET verification removed from `CatalogAuthGuard` for user Bearer tokens. The static checker now rejects `verifyJwt()`, `createHmac('sha256')`, `JWT_SECRET`, `AUTH_JWT_SECRET`, and local JWT verification error markers in the guard.
- Auth validation failure behavior: Auth HTTP errors, network errors, timeouts, invalid JSON, missing user, missing subject, and non-valid responses fail closed with `UnauthorizedException`; tokens are not logged or printed by the guard.
- Auth validation config: `AUTH_SERVICE_URL` is the configurable base URL and defaults to existing repo-local convention `http://auth-microservice:3370`; `AUTH_VALIDATE_TIMEOUT_MS` optionally controls the fail-closed validation timeout.
- Logout: [MISSING: Catalog logout surface].
- Service tokens: separate boundary. Existing `x-internal-service-token` handling remains a separate machine/service boundary and is resolved before human Bearer-token validation; it does not call Auth `/auth/validate`.

## Implementation Workstreams

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Expected output | Dependencies | Validation candidates | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAT-C Token validation standardization | completed | backend auth owner | replace local JWT verification with Auth validation | `src/auth/catalog-auth.guard.ts`, `src/auth/catalog-auth.guard.spec.ts`, checker, inventory | env/secrets, live JWTs, DB, deploy files | Auth `/auth/validate` Bearer-token path with role preservation and fail-closed errors | Auth response contract from prompt | focused guard specs; static checker; build | integration owner should review with Auth service contract if it changes |
| CAT-D Service-token boundary preservation | completed in this lane | service identity owner | keep `x-internal-service-token` separate from human Bearer-token validation | `src/auth/catalog-auth.guard.ts`, focused spec | raw token values, runtime Secret data | service actor path remains first and does not call Auth validation | none for static/unit scope | service-token unit spec | no redesign of service auth was performed |
| CAT-A Auth proxy retirement plan | ready, not changed | Auth contract mapper | replace or deprecate local `/api/auth/login` and `/api/auth/register` proxy behavior | docs and later `src/auth/*` if approved | env/secrets, deploy files, DB migrations | route-level migration plan with compatibility decision | [MISSING: owner decision on transitional proxy support] | focused controller tests; static route marker check | separate lane; not part of bearer-token validation migration |
| CAT-B Hosted callback adapter | dependency-gated | backend/API adapter owner | add/confirm callback/session handling if Catalog has a human UI consumer | [MISSING: target UI/session files] | service-token code unless shared by design | state-validating callback or explicit no-UI decision | [MISSING: Catalog production origin/callback] | callback unit tests; fragment stripping marker checks | do not invent production origin |
| CAT-E Final integration | final integration | integration owner | sequence completed CAT-C/CAT-D with later CAT-A/CAT-B decisions | approved files only | all forbidden files above | final IPS validation record | completed lanes and owner decisions | build/test/diff checks; deploy only if later approved | merge order: CAT-C/CAT-D, CAT-A decision, CAT-B if UI confirmed |

## Blockers And Unknowns

- [MISSING: Catalog production origin and hosted Auth callback URL].
- [MISSING: owner decision whether local `/api/auth/login` and `/api/auth/register` proxies may remain temporarily].
- [UNKNOWN: runtime Auth behavior; runtime checks were forbidden for this worker].
- [UNKNOWN: whether Catalog has any human UI needing hosted callback handling].

## Static Guardrail Updated 2026-06-24

- Script: `scripts/check-aos-auth-contract.js`.
- Package entrypoint: `npm run check:aos-auth-contract`.
- Runtime behavior: unchanged by checker; it reads static files only and does not call services, read secrets, inspect production logs, query databases, deploy, backfill, or smoke live endpoints.
- Enforced Auth modernization guardrails:
  - Catalog must not contain browser password form collection in `src`/docs.
  - Catalog must not contain browser `localStorage`/`sessionStorage` token storage in `src`/docs.
  - Existing local `/api/auth/login` and `/api/auth/register` proxy endpoints must remain explicitly documented as transitional debt unless removed by an approved migration decision.
  - Non-auth write decorators must remain protected by `CatalogAuthGuard`.
  - Catalog human Bearer tokens must be validated through Auth `POST /auth/validate` with `{ token }` using `AUTH_SERVICE_URL` and default `http://auth-microservice:3370`.
  - Local HS256/JWT_SECRET verification removed: checker rejects `verifyJwt()`, `createHmac('sha256')`, `JWT_SECRET`, `AUTH_JWT_SECRET`, and old local JWT verification error markers in `CatalogAuthGuard`.
- Auth validation errors and non-valid responses must fail closed with `UnauthorizedException`.
- Internal service-token handling must stay classified as a separate machine/service boundary.
  - Internal service-token actors must expose explicit `serviceName` and `authMethod` fields and must attach `request.serviceActor`.
  - This inventory must reference `/home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md`.

## 2026-06-24 Catalog Internal Service Actor Slice

Status: completed bounded service-identity slice; no token values, product mutation, warehouse call, deploy, secret, DB, live smoke, backfill, or legacy `speakasap-portal` access.

IPS chain:
- Vision: Catalog service-token callers remain explicit machine actors while Auth centralizes human identity.
- Goal Impact: Valid `x-internal-service-token` requests now expose `serviceName` and `authMethod` on a service actor instead of relying only on generic `source` metadata.
- System: Catalog Auth guard service-token branch.
- Feature: explicit service actor fields for internal service-token callers.
- Task: keep `x-internal-service-token` separate from human Bearer Auth validation while aligning the actor shape with the central service identity standard.
- Execution Plan: guard/spec/checker/docs only; preserve existing token comparison, roles, caller header behavior, and no runtime secret reads.
- Coding Prompt: when a configured internal service token is presented, do not call Auth `/auth/validate`; attach `catalogActor` and `serviceActor` with `type=service`, `serviceName=<x-service-name|internal-service>`, and `authMethod=internal-service-token`.
- Code: `src/auth/catalog-auth.guard.ts`, `src/auth/catalog-auth.guard.spec.ts`, `scripts/check-aos-auth-contract.js`, and this inventory.
- Validation: pending rerun after source copy-back.

Evidence:
- Internal service-token requests set `request.catalogActor` and `request.serviceActor` to the same service actor.
- Service actors carry `serviceName` from the accepted `x-service-name` header or the existing `internal-service` fallback.
- Human Bearer tokens still validate through Auth `/auth/validate` and produce `catalogActor.type=jwt` with `authMethod=auth-validate`.

## Validation Evidence 2026-06-24

- `node --check scripts/check-aos-auth-contract.js`: passed with no syntax output.
- `npm run check:aos-auth-contract`: passed. Key PASS lines covered central standard reference, no browser password/token storage surfaces, local auth proxy transitional-debt documentation, `CatalogAuthGuard` protection across 10 non-auth controllers, no local HS256/JWT_SECRET bearer-token verification, Auth `POST /auth/validate` via `AUTH_SERVICE_URL`, fail-closed Auth validation, removed local JWT debt documentation, and internal service-token boundary classification.
- `npm test -- --runTestsByPath src/auth/catalog-auth.guard.spec.ts`: passed. Jest reported 1 suite passed, 4 tests passed, 0 snapshots.
- `npm run build`: passed. `dist/` is ignored by `.gitignore`, verified before build with `git check-ignore -v dist dist/main.js`.
- `git diff --check -- src/auth/catalog-auth.guard.ts src/auth/catalog-auth.guard.spec.ts scripts/check-aos-auth-contract.js docs/orchestrator/2026-06-24-aos-auth-static-inventory.md package.json`: passed with no output.
