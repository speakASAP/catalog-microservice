-- Durable Catalog BPCP process event dedupe and active projection store.
--
-- This store lets Catalog replay BPCP lifecycle events safely and recover the
-- current process projection after pod restarts. Process ids and event ids are
-- text because BPCP ids are semantic, not UUIDs.

CREATE TABLE IF NOT EXISTS catalog_bpcp_process_event_dedupe (
  event_id text PRIMARY KEY,
  process_id text NOT NULL,
  process_version integer NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamp NOT NULL,
  payload jsonb NOT NULL,
  applied_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT catalog_bpcp_process_event_dedupe_type_check CHECK (event_type IN (
    'process.created',
    'process.validated',
    'process.scheduled',
    'process.published',
    'process.paused',
    'process.retired'
  ))
);

CREATE INDEX IF NOT EXISTS idx_catalog_bpcp_process_event_dedupe_process
  ON catalog_bpcp_process_event_dedupe(process_id, process_version);

CREATE INDEX IF NOT EXISTS idx_catalog_bpcp_process_event_dedupe_type
  ON catalog_bpcp_process_event_dedupe(event_type, occurred_at);

CREATE TABLE IF NOT EXISTS catalog_bpcp_process_projection (
  process_id text NOT NULL,
  process_version integer NOT NULL,
  status text NOT NULL,
  policy_refs text[] NOT NULL DEFAULT '{}'::text[],
  workflow_refs text[] NOT NULL DEFAULT '{}'::text[],
  campaign_refs text[] NOT NULL DEFAULT '{}'::text[],
  active_from timestamp,
  active_to timestamp,
  last_event_id text NOT NULL,
  last_event_type text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (process_id, process_version),
  CONSTRAINT catalog_bpcp_process_projection_status_check CHECK (status IN ('active')),
  CONSTRAINT catalog_bpcp_process_projection_event_type_check CHECK (last_event_type IN ('process.published'))
);

CREATE INDEX IF NOT EXISTS idx_catalog_bpcp_process_projection_status
  ON catalog_bpcp_process_projection(status);

CREATE INDEX IF NOT EXISTS idx_catalog_bpcp_process_projection_updated_at
  ON catalog_bpcp_process_projection(updated_at);
