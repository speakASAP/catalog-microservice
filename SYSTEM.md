# System: catalog-microservice

## Stack

NestJS (TypeScript) · PostgreSQL (TypeORM) · MinIO/CDN (media)

## Deployment

**Primary**: Kubernetes (`statex-apps` namespace, k3s)
- Deployment: `k8s/deployment.yaml` | Service: `k8s/service.yaml` | Ingress: `k8s/ingress.yaml`
- Secrets: Vault `secret/prod/catalog-microservice` → ESO → K8s Secret (`k8s/external-secret.yaml`)
- Config: `k8s/configmap.yaml`

**Legacy** (do not use for new work): `docker-compose.blue.yml` / `docker-compose.green.yml`

## Integrations

| Dependency | URL |
|-----------|-----|
| database-server | db-server-postgres:5432 |
| logging-microservice | logging-microservice:3367 |
| auth-microservice | `auth-microservice:3370` |
| minio-microservice | `minio-microservice:9000` |

## Current State
<!-- AI-maintained -->
Stage: production

## Known Issues
<!-- AI-maintained -->
- None

## Entities

Product (SKU, title, description, brand, EAN), Category (tree), Attribute, Media, Pricing

## API Endpoints

Base: `https://catalog.alfares.cz/api` | Internal: `http://catalog-microservice:3200/api`

| Resource | Endpoints |
|----------|-----------|
| Products | `GET /api/products` · `GET /api/products/:id` · `GET /api/products/sku/:sku` · `POST /api/products` · `PUT /api/products/:id` · `DELETE /api/products/:id` (soft) · `DELETE /api/products/:id/hard` |
| Categories | `GET /api/categories` · `GET /api/categories/tree` · `GET /api/categories/:id` · `POST /api/categories` · `PUT /api/categories/:id` · `DELETE /api/categories/:id` |
| Attributes | `GET /api/attributes` · `GET /api/attributes/:id` · `POST /api/attributes` · `PUT /api/attributes/:id` |
| Media | `GET /api/media/product/:productId` · `POST /api/media` · `PUT /api/media/:id` · `PUT /api/media/:id/primary` · `DELETE /api/media/:id` |
| Pricing | `GET /api/pricing/product/:productId` · `GET /api/pricing/product/:productId/current` · `POST /api/pricing` · `PUT /api/pricing/:id` · `DELETE /api/pricing/:id` |
| Health | `GET /health` |

## DB Schema (PostgreSQL)

Tables: `products`, `categories`, `product_categories`, `attributes`, `product_attributes`, `media`, `product_pricing`
