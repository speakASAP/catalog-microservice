# Catalog Project Invariants

```yaml
id: CATALOG-PROJECT-INVARIANTS
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - BUSINESS.md
  - SYSTEM.md
  - docs/orchestrator/INTENT.md
  - docs/orchestrator/MASTER_PROMPT.md
downstream:
  - implementation-goals/README.md
  - docs/IMPLEMENTATION_ORCHESTRATOR.md
related_adrs: []
```

## Purpose

These invariants are non-negotiable rules for catalog implementation. Every goal, plan, worker prompt, validation report, and deployment decision must preserve them.

## Invariants

| ID | Level | Rule | Forbidden outcome | Validation method | Gate applicability | Owner |
|---|---|---|---|---|---|---|
| CAT-INV-001 | product | Catalog is the product truth service for identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness. | Channel services redefine product truth independently. | Goal scope review, API contract review, final boundary check. | Pre-coding, integration, deployment | Project owner |
| CAT-INV-002 | ownership | Warehouse owns stock quantities, reservations, movements, and warehouse locations. | Catalog becomes the stock source of truth. | Contract review and endpoint/schema review. | Pre-coding, integration | Orchestrator |
| CAT-INV-003 | ownership | Auth owns login, JWT issuance, RBAC policy, and service identity. Catalog verifies credentials and roles but does not become the identity authority. | Catalog implements parallel identity ownership. | Auth boundary review and protected endpoint checks. | Pre-coding, deployment | Orchestrator |
| CAT-INV-004 | ownership | FlipFlop owns storefront projection and checkout UX. Catalog exposes product truth contracts only. | Catalog implements checkout or storefront-specific behavior beyond projection contracts. | Scope review and consumer contract review. | Pre-coding, integration | Orchestrator |
| CAT-INV-005 | ownership | Bazos owns Bazos compliance, identities, drafts, publishing queues, pacing, duplicate checks, platform challenges, and publish actions. | Catalog publishes directly to Bazos or bypasses compliance. | Readiness/action contract review. | Pre-coding, integration, deployment | Orchestrator |
| CAT-INV-006 | safety | Hard product deletion requires explicit owner approval and highest required role. | Automated or routine hard delete. | API/controller tests or direct API verification. | Pre-coding, deployment | Project owner |
| CAT-INV-007 | safety | Mass pricing changes over 10 products require human review. | Bulk price mutation without review marker. | Pricing service tests or direct API verification. | Pre-coding, deployment | Project owner |
| CAT-INV-008 | media | Media must be external URLs or object references; never inline blobs in catalog records. | Product or media records store raw file blobs. | Schema/entity review and upload flow review. | Pre-coding, integration | Orchestrator |
| CAT-INV-009 | compatibility | Public reads remain backward compatible unless a goal explicitly changes the contract. | Consumers break from unplanned response shape changes. | API smoke checks and contract review. | Integration, deployment | Orchestrator |
| CAT-INV-010 | security | Mutation endpoints require approved auth and actor/source traceability. | Anonymous writes or unauditable mutations. | Auth tests, direct API verification, log/audit evidence. | Pre-coding, deployment | Orchestrator |

## Usage

Every execution plan must list applicable invariant IDs and describe how they are preserved. If an invariant is not applicable, say why.

Every final session report must include invariant evidence in the Intent Compliance Report.
