-- Forward correction for Goal 23: Alfares products are visible to sellers by default.
-- Existing user rows are not bulk-updated because false may be an explicit seller choice.

ALTER TABLE catalog_user_settings
  ALTER COLUMN include_alfares_catalog SET DEFAULT true;
