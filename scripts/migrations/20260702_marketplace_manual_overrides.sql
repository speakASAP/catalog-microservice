-- Goal 25: manual marketplace listing override tracking.
--
-- Manual channel edits remain channel-specific and are not overwritten by
-- generated Catalog connector output. The source_state snapshot lets Catalog
-- mark manual listings stale when the canonical product changes later.

ALTER TABLE product_marketplace_profiles
  ADD COLUMN IF NOT EXISTS manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_state jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_product_marketplace_profiles_manual_overrides_gin
  ON product_marketplace_profiles USING gin(manual_overrides);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_profiles_source_state_gin
  ON product_marketplace_profiles USING gin(source_state);
