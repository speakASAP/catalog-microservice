# catalog-microservice

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/business-orchestrator -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```


---

## catalog-microservice
**Purpose**: Single source of truth for all product data (SKU, descriptions, categories, pricing, media) across all sales channels.
**Port**: 3200 | **Domain**: https://catalog.alfares.cz | **Stack**: NestJS · PostgreSQL · MinIO

### Constraints
- Never delete products without explicit owner approval
- Pricing mass updates (>10 products) require human review
- Media stored in MinIO/CDN — never inline in DB

**Ops**: `curl http://catalog-microservice:3200/health` · `kubectl logs -n statex-apps deployment/catalog-microservice -f` · `./scripts/deploy.sh`

### Secrets
All secrets in Vault at `secret/prod/catalog-microservice` — synced via ESO. See [`../shared/docs/VAULT.md`](../shared/docs/VAULT.md).
