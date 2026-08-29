# Claude Instructions

Shared rules live here:

- Claude profile: `/home/ssf/.claude/CLAUDE.md`
- Shared ecosystem instructions: `/home/ssf/Documents/Github/CLAUDE.md`
- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# catalog-microservice

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

## catalog-microservice
**Purpose**: Single source of truth for all product data (SKU, descriptions, categories, pricing, media) across all sales channels.
**Port**: 3200 | **Domain**: https://catalog.alfares.cz | **Stack**: NestJS · PostgreSQL · MinIO

### Constraints
- Never delete products without explicit owner approval
- Pricing mass updates (>10 products) require human review
- Media stored in MinIO/CDN — never inline in DB

**Ops**: `curl http://catalog-microservice:3200/health` · `kubectl logs -n statex-apps deployment/catalog-microservice -f` · `./scripts/deploy.sh`

### Secrets
All secrets in Vault at `secret/prod/catalog-microservice` — synced via ESO.
