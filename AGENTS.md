# Agents: catalog-microservice

## Required Reading
Read AGENTS.md, TASKS.md, STATE.json, BUSINESS.md, SYSTEM.md, and applicable architecture and operations documentation.

## Authority
Approved repository source and documentation are authoritative; do not infer undocumented integrations.

## Service-to-service authentication
For machine service identity, follow the sole canonical [`SERVICE_IDENTITY_CONSUMER_STANDARD.md`](../auth-microservice/docs/SERVICE_IDENTITY_CONSUMER_STANDARD.md). It is not reproduced here.

**Known non-conformance — do not copy or extend.** `CatalogAuthGuard` (`src/auth/catalog-auth.guard.ts`) authenticates internal routes with a static `CATALOG_INTERNAL_SERVICE_TOKEN`/`INTERNAL_SERVICE_TOKEN` plus a self-asserted `x-service-name` header matched against an allowlist of caller names (allegro-service, bazos-service, heureka-service, flipflop, marketing-microservice and others).

A shared static token is not per-`(caller -> catalog-microservice)` pair and is not revocable per caller; a caller-supplied name header is not proof of identity. Both are prohibited by the standard above. Callers that send `x-internal-service-token`/`x-service-name` are the calling half of this same drift, not a separate contract.

Do not add a new caller name to the allowlist. A new caller needs a real Auth-issued principal and an `internal:catalog-microservice:<least-privilege-role>` claim. This guard's presence is not evidence that service identity is satisfied.

## Intent Preservation System
Preserve Vision through Goal Impact, System, Feature, Task, Execution Plan, Coding Prompt, Code, and Validation.

## Safety and Operations
Never print secrets, credentials, raw production data, or private evidence; follow the remote repository operating rules.

## Project-Specific Rules
Preserve this repository ownership boundary: Product catalog source of truth for the ecosystem.

## Required Final Report
Report changed files, validation evidence, debt, blockers, deviations, and next action.
