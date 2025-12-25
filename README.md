# Catalog Microservice

Single source of truth for all product data across the e-commerce platform.

## Overview

The Catalog Microservice provides centralized product management for all sales channels (Allegro, FlipFlop, Aukro, Heureka, Bazos). It stores and serves product information including:

- Products (SKU, title, description, brand, EAN, dimensions)
- Categories (hierarchical tree with materialized path)
- Attributes (text, number, select types with values)
- Media (images, videos, documents)
- Pricing (base price, cost price, margin, sale prices)

## Port Configuration

**Port Range**: 32xx (Central e-commerce microservices)

| Service | Subdomain | Port |
|---------|-----------|------|
| catalog-microservice | catalog.statex.cz | 3200 |
| catalog-frontend | catalog.statex.cz | 3201 (Blue), 3203 (Green) |

## API Endpoints

Base URL: `https://catalog.statex.cz/api` (or `http://localhost:3200/api` in dev)

### Products

- `GET /api/products` - List products (with pagination, search, filters)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/sku/:sku` - Get product by SKU
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete (deactivate)
- `DELETE /api/products/:id/hard` - Hard delete

### Categories

- `GET /api/categories` - List all categories (flat)
- `GET /api/categories/tree` - Get category tree
- `GET /api/categories/:id` - Get category
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Attributes

- `GET /api/attributes` - List attribute definitions
- `GET /api/attributes/:id` - Get attribute
- `POST /api/attributes` - Create attribute
- `PUT /api/attributes/:id` - Update attribute

### Media

- `GET /api/media/product/:productId` - Get media for product
- `POST /api/media` - Add media
- `PUT /api/media/:id` - Update media
- `PUT /api/media/:id/primary` - Set as primary
- `DELETE /api/media/:id` - Delete media

### Pricing

- `GET /api/pricing/product/:productId` - Get pricing history
- `GET /api/pricing/product/:productId/current` - Get current price
- `POST /api/pricing` - Create/update pricing
- `PUT /api/pricing/:id` - Update pricing
- `DELETE /api/pricing/:id` - Delete pricing

### Health

- `GET /health` - Health check

## Frontend Admin Interface

The catalog-microservice includes a web-based admin interface for managing products, categories, and attributes.

### Access

- **Production**: `https://catalog.statex.cz/admin`
- **Development**: `http://localhost:3201/admin`

### Features

- **Product Management**: Create, edit, delete products with full details (SKU, title, description, brand, EAN, dimensions)
- **Category Management**: Hierarchical category tree with create, edit, delete functionality
- **Attribute Management**: Define product attributes (text, number, select, multiselect types)
- **Authentication**: Integrated with shared auth-microservice (requires admin privileges)

### Frontend Technology

- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **TypeScript**: Full type safety
- **Authentication**: Uses shared auth-microservice

### Frontend Development

```bash
cd services/frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000` (or configured port).

## Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Access to shared database-server (PostgreSQL)

### Installation

1. Clone the repository:

```bash
git clone git@github.com:speakASAP/catalog-microservice.git
cd catalog-microservice
```

2. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

3. Install dependencies:

```bash
npm install
```

4. Run in development:

```bash
npm run start:dev
```

### Docker Deployment

```bash
# Build and run (includes API and Frontend)
docker compose -f docker-compose.blue.yml up -d

# View logs
docker logs -f catalog-microservice-blue
docker logs -f catalog-frontend-blue

# Stop
docker compose -f docker-compose.blue.yml down
```

**Note**: The docker-compose files include both the API service (`catalog`) and the frontend service (`frontend`). Both services are deployed together for blue/green deployments.

## Database Schema

The service uses PostgreSQL with TypeORM. Tables are auto-created on first run in development.

### Main Tables

- `products` - Core product data
- `categories` - Category tree
- `product_categories` - Product-category links (many-to-many)
- `attributes` - Attribute definitions
- `product_attributes` - Product attribute values
- `media` - Product images/videos
- `product_pricing` - Pricing with validity periods

## Integration

Other services connect to catalog-microservice via REST API:

```typescript
// Example: Get product from allegro-service
const response = await fetch('https://catalog.statex.cz/api/products/sku/ABC123');
const { data: product } = await response.json();
```

## Technology Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (via shared database-server)
- **ORM**: TypeORM
- **Containerization**: Docker
- **Deployment**: Blue/Green via nginx-microservice

## Related Services

- `warehouse-microservice` (3201) - Stock management
- `suppliers-microservice` (3202) - Supplier API integration
- `orders-microservice` (3203) - Order processing
- `allegro-service` (34xx) - Allegro sales channel
- `flipflop-service` (35xx) - FlipFlop website

