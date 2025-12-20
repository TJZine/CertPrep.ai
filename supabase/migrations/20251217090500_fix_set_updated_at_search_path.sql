-- Migration: Fix set_updated_at function search_path
-- Issue: Supabase advisor flagged mutable search_path as security risk
-- Solution: Explicitly set search_path to prevent path injection attacks

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Note: This function is used as a trigger on tables with updated_at columns.
-- The minimal search_path (pg_catalog only) ensures now() resolves unambiguously
-- and prevents any public schema function from shadowing built-ins.
