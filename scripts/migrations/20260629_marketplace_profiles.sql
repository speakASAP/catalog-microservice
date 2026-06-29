-- Marketplace-specific product profiles.
--
-- Canonical product truth remains in products/pricing/media/categories.
-- This table stores only marketplace-owned overrides, imported payloads,
-- external listing references, and alias metadata for product-scoped channel UI.

CREATE TABLE IF NOT EXISTS product_marketplace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace varchar(50) NOT NULL,
  canonical_aliases jsonb NOT NULL DEFAULT '{}'::jsonb,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_data jsonb,
  status varchar(50) NOT NULL DEFAULT 'draft',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT product_marketplace_profiles_product_marketplace_unique UNIQUE (product_id, marketplace)
);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_profiles_product_id
  ON product_marketplace_profiles(product_id);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_profiles_marketplace
  ON product_marketplace_profiles(marketplace);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_profiles_overrides_gin
  ON product_marketplace_profiles USING gin(overrides);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_profiles_external_refs_gin
  ON product_marketplace_profiles USING gin(external_refs);
