# CLAUDE.md (catalog-microservice)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

---

## catalog-microservice

**Purpose**: Single source of truth for all product data (SKU, descriptions, categories, pricing, media) across all sales channels.  
**Port**: 3200  
**Domain**: https://catalog.alfares.cz  
**Stack**: NestJS · PostgreSQL · MinIO/CDN (media)

### Key constraints
- Never delete catalog products without explicit owner approval
- Pricing mass updates (>10 products) require human review
- Media files stored in MinIO/CDN — never inline in the DB
- All marketplace services (allegro, aukro, bazos, heureka) read from here

### Consumers
flipflop-service, allegro-service, aukro-service, bazos-service, heureka-service, suppliers-microservice.

### Quick ops
```bash
curl http://catalog-microservice:3200/health
docker compose logs -f
./scripts/deploy.sh
```
