# catalog-microservice

Ecosystem defaults: [`../CLAUDE.md`](../CLAUDE.md) · [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md)

Read order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## catalog-microservice
**Purpose**: Single source of truth for all product data (SKU, descriptions, categories, pricing, media) across all sales channels.
**Port**: 3200 | **Domain**: https://catalog.alfares.cz | **Stack**: NestJS · PostgreSQL · MinIO

### Constraints
- Never delete products without explicit owner approval
- Pricing mass updates (>10 products) require human review
- Media stored in MinIO/CDN — never inline in DB

### Quick ops
```bash
curl http://catalog-microservice:3200/health
kubectl logs -n statex-apps deployment/catalog-microservice -f
./scripts/deploy.sh
```

### Secrets
All secrets in Vault at `secret/prod/catalog-microservice` — synced via ESO. See [`../shared/docs/VAULT.md`](../shared/docs/VAULT.md).
