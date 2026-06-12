# Catalog Implementation Plan

## Execution Rule

Work one goal chunk at a time. Prefer a complete, verifiable chunk over starting multiple tracks.

## Active Goal

Goal 1 - Catalog Contract And Auth Boundary.

### Chunk 1.1 - Intent Preservation Docs

Deliverables:

- `MASTER_PROMPT.md`
- `INTENT.md`
- `GOALS.md`
- `PLAN.md`
- `STATUS.md`
- `PROMPTS.md`
- `AGENTS.md` reference to these files

Verification:

- Files exist in `docs/orchestrator/`.
- `AGENTS.md` tells future agents to follow the orchestrator pack.

### Chunk 1.2 - Protected Mutation Endpoints

Deliverables:

- Catalog auth guard.
- Role metadata/decorator.
- Protected POST/PUT/DELETE endpoints in products, categories, attributes, media, and pricing.

Verification:

- `npm run build`
- Unauthorized mutation returns `401` after deployment or direct app test.

### Chunk 1.3 - Hard Delete Approval Gate

Deliverables:

- Hard delete requires `global:superadmin`.
- Hard delete requires explicit owner approval header/body marker.
- Missing approval returns `403`.

Verification:

- `npm run build`
- Direct controller/API verification after deployment.

### Chunk 1.4 - Write Audit Context

Deliverables:

- Write logs include actor/source metadata.
- Mutation services can later persist audit events.

Verification:

- Build passes.
- Status note describes current log evidence and remaining persistence gap.

## Next Goal Selection

When Goal 1 is complete, continue to Goal 2 unless the owner explicitly chooses another goal.

