-- User-owned product scope for Catalog.
--
-- Existing shared/system products remain with owner_user_id = NULL.
-- JWT-created products store the Auth subject and ordinary JWT reads are
-- scoped to that owner. Internal service actors and global admins can still
-- access shared/system product rows for integrations and operations.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS owner_user_id varchar(200);

DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = current_schema()
      AND rel.relname = 'products'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname::text ORDER BY keys.ordinality)
        FROM unnest(con.conkey) WITH ORDINALITY AS keys(attnum, ordinality)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = keys.attnum
      ) = ARRAY['sku']::text[]
  LOOP
    EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_owner_user_id
  ON products(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_products_owner_user_id_created_at
  ON products(owner_user_id, "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_owner_user_id_sku_unique
  ON products(COALESCE(owner_user_id, '__shared__'), sku);
