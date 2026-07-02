-- Catalog user settings for private catalogs and explicit Alfares resale opt-in.
--
-- Existing shared Alfares products remain products.owner_user_id IS NULL.
-- Missing rows are treated fail-closed by the application, and the table
-- default keeps newly provisioned users opted out until they explicitly opt in.

CREATE TABLE IF NOT EXISTS catalog_user_settings (
  user_id varchar(200) PRIMARY KEY,
  include_alfares_catalog boolean NOT NULL DEFAULT false,
  source_application varchar(100),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_user_settings_include_alfares_catalog
  ON catalog_user_settings(include_alfares_catalog);

CREATE INDEX IF NOT EXISTS idx_catalog_user_settings_updated_at
  ON catalog_user_settings(updated_at);
