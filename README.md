# catalog-microservice

Single source of truth for all product data across the e-commerce platform.

**Port**: 3200 | **Domain**: https://catalog.alfares.cz

## What it manages

Products (SKU, title, description, brand, EAN, dimensions) · Categories (hierarchical tree) · Attributes · Media (MinIO/CDN) · Pricing

## Consumers

flipflop-service, allegro-service, aukro-service, bazos-service, heureka-service, suppliers-microservice

## Quick start (dev)

```bash
npm install
npm run start:dev
```

Frontend admin (Next.js): `cd services/frontend && npm install && npm run dev`

## Docs

- [BUSINESS.md](BUSINESS.md) — constraints, SLA
- [SYSTEM.md](SYSTEM.md) — stack, K8s deployment, API endpoints, integrations
- [AGENTS.md](AGENTS.md) — agent usage
- [TASKS.md](TASKS.md) — backlog
- [../shared/ECOSYSTEM_MAP.md](../shared/ECOSYSTEM_MAP.md) — full service map
