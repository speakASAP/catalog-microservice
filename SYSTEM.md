# System: catalog-microservice

## Architecture

NestJS + PostgreSQL + Prisma. REST API for product management.

- Entities: Product (SKU, title, description, brand, EAN), Category (tree), Attribute, Media, Pricing
- Endpoints: `/products`, `/categories`, `/attributes`, `/media`

## Integrations

| Dependency | URL |
|-----------|-----|
| database-server | db-server-postgres:5432 |
| logging-microservice | logging-microservice:3367 |

## Current State
<!-- AI-maintained -->
Stage: production

## Known Issues
<!-- AI-maintained -->
- None
