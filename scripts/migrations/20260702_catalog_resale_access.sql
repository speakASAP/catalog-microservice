-- Catalog resale access.
--
-- Alfares shared products remain owner_user_id = NULL.
-- Seller-owned products remain owner_user_id = <Auth subject>.
-- A seller-owned product becomes visible to other sellers only when the
-- owner explicitly enables resale_enabled.
-- Seller source settings default to Alfares disabled and community disabled.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS resale_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_resale_enabled
  ON products(resale_enabled);

CREATE INDEX IF NOT EXISTS idx_products_community_resale
  ON products(resale_enabled, owner_user_id, "createdAt" DESC)
  WHERE resale_enabled = true AND owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_user_settings (
  user_id varchar(200) PRIMARY KEY,
  include_alfares_catalog boolean NOT NULL DEFAULT false,
  include_community_catalog boolean NOT NULL DEFAULT false,
  source_application varchar(100),
  first_seen_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_user_settings_updated_at
  ON catalog_user_settings(updated_at);
