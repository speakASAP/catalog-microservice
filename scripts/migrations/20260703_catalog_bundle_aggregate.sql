-- Catalog standalone bundle aggregate v1.
--
-- Additive metadata only. This does not create product SKUs, orders, carts,
-- payments, reservations, stock records, marketplace listings, or price records.

CREATE TABLE IF NOT EXISTS catalog_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_version varchar(40) NOT NULL DEFAULT 'catalog.bundle.v1',
  status varchar(20) NOT NULL DEFAULT 'draft',
  source varchar(40) NOT NULL,
  idempotency_key text NOT NULL,
  idempotency_request_hash text NOT NULL,
  display_name text NOT NULL,
  description text NULL,
  price_policy varchar(40) NOT NULL DEFAULT 'checkout_authoritative',
  discount_policy_ref text NULL,
  free_shipping_policy_ref text NULL,
  currency_hint char(3) NULL,
  visibility jsonb NOT NULL DEFAULT '{"scope":"catalog_internal","channels":[],"startsAt":null,"endsAt":null}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{"state":"blocked","blockers":[]}'::jsonb,
  created_by jsonb NULL,
  updated_by jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  CONSTRAINT catalog_bundles_contract_version_check CHECK (contract_version = 'catalog.bundle.v1'),
  CONSTRAINT catalog_bundles_status_check CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT catalog_bundles_source_check CHECK (source IN ('manual', 'order_affinity', 'campaign')),
  CONSTRAINT catalog_bundles_price_policy_check CHECK (price_policy = 'checkout_authoritative'),
  CONSTRAINT catalog_bundles_currency_hint_check CHECK (currency_hint IS NULL OR currency_hint ~ '^[A-Z]{3}$'),
  CONSTRAINT catalog_bundles_visibility_object_check CHECK (jsonb_typeof(visibility) = 'object'),
  CONSTRAINT catalog_bundles_evidence_object_check CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT catalog_bundles_validation_object_check CHECK (jsonb_typeof(validation) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_bundles_contract_idempotency
  ON catalog_bundles(contract_version, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_catalog_bundles_status_updated
  ON catalog_bundles(status, updated_at DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_catalog_bundles_source_updated
  ON catalog_bundles(source, updated_at DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_catalog_bundles_visibility_gin
  ON catalog_bundles USING gin(visibility);

CREATE INDEX IF NOT EXISTS idx_catalog_bundles_evidence_gin
  ON catalog_bundles USING gin(evidence);

CREATE TABLE IF NOT EXISTS catalog_bundle_items (
  bundle_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  position integer NOT NULL,
  role varchar(30) NOT NULL DEFAULT 'component',
  CONSTRAINT pk_catalog_bundle_items PRIMARY KEY (bundle_id, product_id),
  CONSTRAINT fk_catalog_bundle_items_bundle
    FOREIGN KEY (bundle_id) REFERENCES catalog_bundles(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_bundle_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT catalog_bundle_items_quantity_check CHECK (quantity >= 1 AND quantity <= 99),
  CONSTRAINT catalog_bundle_items_position_check CHECK (position >= 1),
  CONSTRAINT catalog_bundle_items_role_check CHECK (role = 'component')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_bundle_items_position
  ON catalog_bundle_items(bundle_id, position);

CREATE INDEX IF NOT EXISTS idx_catalog_bundle_items_product
  ON catalog_bundle_items(product_id);
