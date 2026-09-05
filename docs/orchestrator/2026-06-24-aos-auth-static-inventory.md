# AOS Auth Static Inventory - catalog-microservice

Date: 2026-06-24
Worker: parallel Alfares Auth modernization implementation worker
Scope: catalog-microservice Auth guard migration, static guardrail update, and focused unit coverage only
Central standard: `/home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md`
Legacy exclusion: legacy `speakasap-portal` was not inspected or touched.
Forbidden runtime access: no secrets, `.env` values, live database, production logs, deployment, backfill, or live smoke were used.

## IPS Chain



## Static Commands Used

- `git status --short --branch`
- `sed -n` inspections of `src/auth/catalog-auth.guard.ts`, `src/auth/auth.module.ts`, `src/auth/auth.service.ts`, `scripts/check-aos-auth-contract.js`, and this inventory
- `rg -n "CatalogAuthGuard|CatalogRoles|AuthModule|HttpModule|providers:|imports:" src --glob "*.ts"`
- Package script inspection through `node -e` without reading secrets or runtime config values

## Auth Surfaces Found



## Comparison To Hosted Auth Consumer Standard



## Implementation Workstreams



## Blockers And Unknowns

- [MISSING: Catalog production origin and hosted Auth callback URL].
- [MISSING: owner decision whether local `/api/auth/login` and `/api/auth/register` proxies may remain temporarily].
- [UNKNOWN: runtime Auth behavior; runtime checks were forbidden for this worker].
- [UNKNOWN: whether Catalog has any human UI needing hosted callback handling].

## Static Guardrail Updated 2026-06-24




Status: completed bounded service-identity slice; no token values, product mutation, warehouse call, deploy, secret, DB, live smoke, backfill, or legacy `speakasap-portal` access.





## Validation Evidence 2026-06-24
