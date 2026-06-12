# Catalog Goal Prompts

Use these prompts when the owner asks to "implement the next catalog goal."

## Universal Session Prompt

Read `docs/orchestrator/MASTER_PROMPT.md`, `INTENT.md`, `GOALS.md`, `PLAN.md`, and `STATUS.md`. Identify the earliest active or pending chunk. Restate the preserved catalog intent and the ownership boundaries affected by the chunk. Implement only that chunk, verify it, append status evidence, and leave the next chunk clearly named.

## Goal 1 Prompt

Implement the next unfinished chunk of "Goal 1 - Catalog Contract And Auth Boundary." Keep public catalog reads available. Protect product/category/attribute/media/pricing writes with catalog-approved auth. Do not implement channel readiness, warehouse integration, or UI work in this goal.

## Goal 2 Prompt

Implement the next unfinished chunk of "Goal 2 - Catalog Product Model Completeness." Preserve existing public read compatibility. Add only product truth and quality/readiness fields; do not implement channel publishing.

## Goal 3 Prompt

Implement the next unfinished chunk of "Goal 3 - Pricing Integrity." Keep pricing catalog-owned, add validation and safety controls, and preserve human review for mass price changes.

## Goal 4 Prompt

Implement the next unfinished chunk of "Goal 4 - Channel Readiness Model." Model channel readiness without moving Bazos publishing, FlipFlop checkout, or warehouse stock ownership into catalog.

## Goal 5 Prompt

Implement the next unfinished chunk of "Goal 5 - Catalog/Warehouse Contract." Keep stock ownership in warehouse. Catalog may validate product identity and expose projections, but must not become the stock source of truth.

## Goal 6 Prompt

Implement the next unfinished chunk of "Goal 6 - FlipFlop Catalog Projection." Keep FlipFlop implementation in FlipFlop; catalog work should define or expose the product truth contract FlipFlop consumes.

## Goal 7 Prompt

Implement the next unfinished chunk of "Goal 7 - Bazos Draft Integration Contract." Catalog can request draft creation only. Bazos remains responsible for verified identities, compliance, publishing queues, platform challenges, and policy gates.

## Goal 8 Prompt

Implement the next unfinished chunk of "Goal 8 - Data Import And Reconciliation." Imports must be idempotent and support dry-run before mutation.

## Goal 9 Prompt

Implement the next unfinished chunk of "Goal 9 - End-To-End Catalog Smoke Tests." Smoke tests must prove catalog health, product truth reads, pricing/media access, and unauthorized mutation rejection.

