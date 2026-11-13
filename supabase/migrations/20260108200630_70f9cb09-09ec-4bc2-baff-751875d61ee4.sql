-- Attempt to relocate pg_net extension out of public schema (Supabase linter)
-- NOTE: If this fails, the transaction will roll back and pg_net will remain unchanged.
CREATE SCHEMA IF NOT EXISTS extensions;

BEGIN;
  DROP EXTENSION IF EXISTS pg_net;
  CREATE EXTENSION pg_net SCHEMA extensions;
COMMIT;