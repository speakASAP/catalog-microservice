# BPCP Holiday Discount Adoption

Status: service-local adoption contract
Date: 2026-07-02
Service: `catalog-microservice`
Central contract pack: `statex-ecosystem/docs/business-process-control-plane/`

## Role

Product fact provider for category, tags, marketplace profile, eligibility facts, and display-safe product metadata.

## Responsibilities

- Expose product facts needed by BPCP and pricing.
- Mark products/categories as holiday-eligible when business policy needs it.
- Preserve Catalog as fact owner, not discount calculator.

## Required interfaces

- Product facts endpoint or existing product API extension.
- Category and tag identifiers.
- Optional `discountEligibilityFacts` projection.

## Boundaries

- This service must not become the global owner of BPCP process definitions.
- This service must fail closed on invalid or unknown BPCP process versions.
- This service must keep existing domain ownership and invariants.
- This service must expose or document dry-run behavior before live execution.
- This service must not overwrite existing service contracts without an
  explicit integration owner and validation owner.

## Holiday Discount pilot expectations

- Recognize `holiday-discount-2026` only through versioned BPCP contracts.
- Preserve `processId`, `processVersion`, and `policyId` in every relevant
  decision, event, snapshot, log, or rendered experience.
- Support rollback by respecting BPCP pause and retired states.
- Keep process display and process execution separate where applicable.

## Blockers and unknowns

- [MISSING: final fact schema for holiday eligibility]
- [MISSING: pricing owner that consumes catalog facts]

## Validation evidence required before implementation is accepted

- Product fixture with eligible category returns stable facts.
- Ineligible product fixture does not leak false holiday eligibility.
- Existing catalog quality gates remain unchanged.

## Parallel handoff

This adoption doc is safe for a focused service owner to implement in parallel
after the central BPCP schemas are accepted. The service owner must not edit
shared BPCP schemas directly; schema changes go through the BPCP integration
owner.
