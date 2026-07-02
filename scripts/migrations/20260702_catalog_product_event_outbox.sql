-- Catalog product event outbox.
--
-- Durable product-truth event intents are written in the same transaction as
-- Catalog product lifecycle mutations. Product rows are intentionally not
-- referenced with a foreign key so hard-delete events survive product removal.

CREATE TABLE IF NOT EXISTS catalog_product_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  event_type varchar(100) NOT NULL,
  routing_key varchar(120) NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  aggregate_type varchar(50) NOT NULL DEFAULT 'product',
  aggregate_id uuid NOT NULL,
  owner_user_id varchar(200),
  sku varchar(100),
  category_ids text[] NOT NULL DEFAULT '{}'::text[],
  idempotency_key varchar(220) NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(50) NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 12,
  next_attempt_at timestamp,
  last_error text,
  published_at timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT catalog_product_event_outbox_status_check CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'dead_letter')),
  CONSTRAINT catalog_product_event_outbox_type_check CHECK (event_type IN (
    'catalog.product.upserted.v1',
    'catalog.product.updated.v1',
    'catalog.product.archived.v1',
    'catalog.product.deleted.v1',
    'catalog.product.category_changed.v1',
    'catalog.product.sellability_changed.v1'
  )),
  CONSTRAINT catalog_product_event_outbox_aggregate_type_check CHECK (aggregate_type = 'product')
);

CREATE INDEX IF NOT EXISTS idx_catalog_product_event_outbox_status_next_attempt
  ON catalog_product_event_outbox(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_catalog_product_event_outbox_created_at
  ON catalog_product_event_outbox("createdAt");

CREATE INDEX IF NOT EXISTS idx_catalog_product_event_outbox_aggregate
  ON catalog_product_event_outbox(aggregate_id, "createdAt");

CREATE INDEX IF NOT EXISTS idx_catalog_product_event_outbox_event_type
  ON catalog_product_event_outbox(event_type, "createdAt");

CREATE INDEX IF NOT EXISTS idx_catalog_product_event_outbox_sku
  ON catalog_product_event_outbox(sku);

CREATE INDEX IF NOT EXISTS idx_catalog_product_event_outbox_category_ids_gin
  ON catalog_product_event_outbox USING gin(category_ids);
