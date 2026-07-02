-- Catalog-owned product relation scores.
--
-- This is an additive metadata foundation only. It does not ingest Orders,
-- create bundles, change checkout, mutate stock, or publish to channels.

CREATE TABLE IF NOT EXISTS product_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid NOT NULL,
  target_product_id uuid NOT NULL,
  relation_type varchar(60) NOT NULL,
  score numeric(12, 4) NOT NULL,
  confidence numeric(5, 4) NOT NULL DEFAULT 1,
  source varchar(80) NOT NULL DEFAULT 'manual',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT product_relations_no_self_check CHECK (source_product_id <> target_product_id),
  CONSTRAINT product_relations_score_check CHECK (score >= 0),
  CONSTRAINT product_relations_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT product_relations_relation_type_check CHECK (relation_type ~ '^[a-z][a-z0-9_-]{0,59}$'),
  CONSTRAINT product_relations_source_check CHECK (source ~ '^[a-z][a-z0-9_-]{0,79}$'),
  CONSTRAINT product_relations_evidence_object_check CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT fk_product_relations_source_product
    FOREIGN KEY (source_product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_relations_target_product
    FOREIGN KEY (target_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_relations_source_target_type_source
  ON product_relations(source_product_id, target_product_id, relation_type, source);

CREATE INDEX IF NOT EXISTS idx_product_relations_source_order
  ON product_relations(source_product_id, relation_type, score DESC, confidence DESC, target_product_id);

CREATE INDEX IF NOT EXISTS idx_product_relations_source_product
  ON product_relations(source_product_id);

CREATE INDEX IF NOT EXISTS idx_product_relations_target_product
  ON product_relations(target_product_id);

CREATE INDEX IF NOT EXISTS idx_product_relations_type_source
  ON product_relations(relation_type, source);

CREATE INDEX IF NOT EXISTS idx_product_relations_evidence_gin
  ON product_relations USING gin(evidence);
