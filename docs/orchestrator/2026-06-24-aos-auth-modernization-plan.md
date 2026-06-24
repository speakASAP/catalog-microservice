# AOS Auth Modernization Plan - catalog-microservice

Date: 2026-06-24
Repository: catalog-microservice
Central standard: /home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md
Legacy exclusion: legacy speakasap-portal is explicitly out of scope; do not inspect, modify, deploy, or validate it for this plan.

## Vision
Modernize catalog-microservice as an Auth consumer that follows the hosted Auth consumer standard while preserving current commerce/backend behavior and repository ownership boundaries.

## Goal Impact
- Align request authentication and authorization behavior with the central hosted Auth consumer standard.
- Reduce duplicated or divergent Auth logic inside commerce/backend services.
- Keep rollout auditable through the Intent Preservation System chain and repo-local validation evidence.
- Avoid production mutation until implementation, validation, deploy, and rollback ownership are explicitly approved.

## System
- Consumer service: catalog-microservice.
- Provider standard: /home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md.
- Related commerce/backend candidates: catalog-microservice, orders-microservice, payments-microservice, warehouse-microservice.
- Legacy exclusion: speakasap-portal remains excluded from discovery, implementation, validation, deploy, and smoke work.
- Current runtime facts: [UNKNOWN: no runtime, secret, live DB, production log, deploy, or smoke inspection was permitted for this bootstrap plan].

## Feature
Adopt the hosted Auth consumer contract for inbound service requests in catalog-microservice, including token validation, user/service identity propagation, authorization boundaries, and failure semantics defined by the central standard.

## Task
1. Read the central standard and map its required consumer behaviors onto catalog-microservice.
2. Inventory current Auth entrypoints, guards, middleware, request clients, and tests without reading secrets or live data.
3. Create implementation tasks that keep public contracts stable unless a GDD-approved contract change is required.
4. Add or update tests and validation commands proving standard compliance.
5. Prepare a deployment and rollback plan, but do not deploy without explicit approval.

## Execution Plan
1. Standards mapping: compare repo behavior to the hosted Auth consumer standard and record gaps in a repo-local task plan.
2. Code discovery: inspect only source, test, and documentation files needed to identify Auth consumers; avoid env files, secret material, production logs, live DB rows, migrations unless explicitly approved.
3. Implementation lane planning: split changes by independent ownership area, with shared Auth contract decisions reserved for the integration owner.
4. Validation planning: define targeted unit/integration tests, contract checks, and static checks before any deploy proposal.
5. Handoff: update this plan or a follow-up execution plan with exact files, commands, blockers, and evidence.

## Coding Prompt
Implement hosted Auth consumer compliance for catalog-microservice using the central standard at /home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md. Preserve existing business behavior, avoid legacy speakasap-portal, do not read or expose secrets, and do not deploy or run production smoke/backfill commands without approval. Keep changes scoped, document deviations as [MISSING] or [UNKNOWN], and provide validation evidence for every completed behavior.

## Code
- Current bootstrap change: this documentation plan only.
- Application code status: [MISSING: implementation not started in this worker].
- Expected future code areas: [UNKNOWN: requires repo-specific source discovery by an implementation worker].
- Forbidden for this plan worker: application code, package files, deployment files, env/secret files, DB migrations, live data, production logs, legacy speakasap-portal.

## Validation
Bootstrap validation candidates for later workers:
- git diff --check -- docs/orchestrator/2026-06-24-aos-auth-modernization-plan.md
- [MISSING: repo-specific test command]
- [MISSING: repo-specific lint/typecheck command]
- [MISSING: hosted Auth consumer contract test command]
- [UNKNOWN: whether current CI already covers Auth consumer behavior]

## Parallel Workstreams

### WS1 - Standard Mapping
Status: ready now
Owner role: Auth contract mapper
Scope: central standard plus catalog-microservice docs/source references needed to map required consumer behavior
Allowed files: docs and read-only source/test inspection; follow-up plan docs only if assigned
Forbidden files: application edits, package files, deployment files, env/secret files, DB migrations, legacy speakasap-portal
Expected output: gap list tied to central standard sections
Dependencies: central standard exists
Blockers: [MISSING: repo-specific Auth inventory]
Validation evidence: documented section-by-section mapping
Handoff notes: feed shared contract questions to integration owner

### WS2 - Repo Auth Inventory
Status: ready now
Owner role: service implementation analyst
Scope: identify guards, middleware, clients, controllers, tests, and auth-related docs in catalog-microservice
Allowed files: read-only source/test/docs inspection
Forbidden files: secrets, .env values, Kubernetes Secret data, live DB rows, production logs, deploy/backfill/smoke commands, legacy speakasap-portal
Expected output: candidate file list and risk notes
Dependencies: none beyond repo availability
Blockers: [UNKNOWN: current Auth structure]
Validation evidence: grep/file-list evidence without secret disclosure
Handoff notes: do not modify shared contracts during inventory

### WS3 - Test And Validation Design
Status: dependency-gated
Owner role: validation owner
Scope: propose tests and commands after WS1 and WS2 identify behaviors
Allowed files: test plan docs until implementation approval
Forbidden files: production logs, live DB rows, deploy/backfill/smoke commands, legacy speakasap-portal
Expected output: validation matrix for success, failure, identity propagation, and authorization boundaries
Dependencies: WS1 standard mapping and WS2 inventory
Blockers: [MISSING: repo-specific test runner and contract fixtures]
Validation evidence: runnable command list with expected pass/fail semantics
Handoff notes: separate pre-existing validation debt from modernization regressions

### WS4 - Final Integration
Status: final integration
Owner role: integration owner
Scope: merge implementation lanes, resolve shared Auth contract decisions, own final validation evidence
Allowed files: explicitly approved implementation/test/docs files after planning
Forbidden files: env/secret files, DB migrations unless separately approved, deployment files unless explicitly in scope, legacy speakasap-portal
Expected output: final IPS/GDD execution record and deploy recommendation
Dependencies: WS1, WS2, WS3, implementation approval
Blockers: [MISSING: implementation owner approval], [MISSING: deploy approval], [UNKNOWN: rollback requirements]
Validation evidence: targeted tests, static checks, diff checks, and approved deployment evidence if later authorized
Handoff notes: merge order is WS1 mapping, WS2 inventory, WS3 validation design, implementation lanes, WS4 integration

## Allowed Files For This Bootstrap Worker
- docs/orchestrator/2026-06-24-aos-auth-modernization-plan.md

## Forbidden Files And Actions
- Application code, package files, deployment files, env/secret files, DB migrations.
- Secrets, .env values, Kubernetes Secret data, live DB rows, production logs.
- Deploy, backfill, smoke commands.
- Any legacy speakasap-portal inspection or mutation.

## Blockers And Unknowns
- [MISSING: repo-specific Auth consumer gap analysis against the central standard]
- [MISSING: repo-specific test, lint, typecheck, and contract validation commands]
- [MISSING: implementation and deployment approvals]
- [UNKNOWN: current runtime Auth behavior]
- [UNKNOWN: required rollback procedure]
