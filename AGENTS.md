# Agents: catalog-microservice

## Required Reading
Read AGENTS.md, TASKS.md, STATE.json, BUSINESS.md, SYSTEM.md, and applicable architecture and operations documentation.

## Authority
Approved repository source and documentation are authoritative; do not infer undocumented integrations.

## Service-to-service authentication
For machine service identity, follow the sole canonical [`SERVICE_IDENTITY_CONSUMER_STANDARD.md`](../auth-microservice/docs/SERVICE_IDENTITY_CONSUMER_STANDARD.md). It is not reproduced here.

**Known non-conformance — do not copy or extend.** `CatalogAuthGuard` (`src/auth/catalog-auth.guard.ts`) authenticates internal routes with a static `CATALOG_INTERNAL_SERVICE_TOKEN`/`INTERNAL_SERVICE_TOKEN` plus a self-asserted `x-service-name` header matched against an allowlist of caller names (allegro-service, bazos-service, heureka-service, flipflop, marketing-microservice and others).

A shared static token is not per-`(caller -> catalog-microservice)` pair and is not revocable per caller; a caller-supplied name header is not proof of identity. Both are prohibited by the standard above. Callers that send `x-internal-service-token`/`x-service-name` are the calling half of this same drift, not a separate contract.

**The conformant path already works here.** The same guard also accepts a bearer, validates it through `POST /auth/validate`, and honours the roles that come back. So a correctly-minted Auth principal is accepted as-is: migrating a caller needs no receiver-side change, only a real credential.

Do not add a new caller name to `CATALOG_INTERNAL_SERVICE_NAMES`. That membership check is where an unlisted caller is refused — before role resolution, since `rolesForServiceName` already defaults unknown names to `catalog:read` — which makes an allowlist entry the tempting one-line fix for a 401 and the wrong one. A new caller needs a real Auth-issued principal and an `internal:catalog-microservice:<least-privilege-role>` claim. This guard's static path is not evidence that service identity is satisfied.

When migrating a caller, check that it does not *prefer* the static token: `scripts/catalog-smoke.js:13` blanks `authToken` whenever `CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN` is set, so minting a principal is not sufficient while both are mounted.

## Intent Preservation System
Preserve Vision through Goal Impact, System, Feature, Task, Execution Plan, Coding Prompt, Code, and Validation.

## Safety and Operations
Never print secrets, credentials, raw production data, or private evidence; follow the remote repository operating rules.

## Project-Specific Rules
Preserve this repository ownership boundary: Product catalog source of truth for the ecosystem.

## Required Final Report
Report changed files, validation evidence, debt, blockers, deviations, and next action.
