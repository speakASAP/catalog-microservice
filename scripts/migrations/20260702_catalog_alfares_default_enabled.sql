-- Forward correction after an erroneous default-on source change.
-- Alfares products must stay disabled for newly provisioned sellers unless
-- the seller explicitly enables that source.

ALTER TABLE catalog_user_settings
  ALTER COLUMN include_alfares_catalog SET DEFAULT false;
