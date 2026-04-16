# Business: catalog-microservice
>
> ⚠️ IMMUTABLE BY AI.

## Goal

Single source of truth for all product data (SKU, descriptions, categories, pricing, media) across all sales channels.

## Constraints

- AI must never delete catalog products without explicit owner approval
- Pricing changes require human review for mass updates (>10 products)
- Media files stored externally (minio/CDN) — never inline

## Consumers

flipflop-service, allegro-service, aukro-service, bazos-service, heureka-service, suppliers-microservice.

## SLA

- Port: 3200 (<http://catalog-microservice:3200>)
- Production: <https://catalog.alfares.cz>
