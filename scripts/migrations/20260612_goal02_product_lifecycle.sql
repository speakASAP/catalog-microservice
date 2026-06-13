-- Goal 02 - Product model completeness
-- Additive lifecycle column for product readiness without removing isActive compatibility.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS lifecycle varchar(30) NOT NULL DEFAULT 'active';

UPDATE products
SET lifecycle = CASE
  WHEN "isActive" = false THEN 'archived'
  ELSE 'active'
END
WHERE lifecycle IS NULL OR lifecycle = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_lifecycle_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_lifecycle_check
      CHECK (lifecycle IN ('draft', 'active', 'archived', 'needs_review'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_lifecycle ON products(lifecycle);
