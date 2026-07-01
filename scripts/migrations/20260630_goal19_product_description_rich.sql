-- Goal 19: canonical marketplace-neutral product description document.
--
-- products.description remains the backward-compatible plain text fallback.
-- products.description_rich stores the reviewed canonical structured JSON
-- document that connector renderers use for marketplace-specific previews.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description_rich jsonb;

CREATE INDEX IF NOT EXISTS idx_products_description_rich_gin
  ON products USING gin(description_rich);
