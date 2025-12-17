-- Migration: Fix set_updated_at function search_path
-- Issue: Supabase advisor flagged mutable search_path as security risk
-- Solution: Explicitly set search_path to prevent path injection attacks

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Note: This function is used as a trigger on tables with updated_at columns.
-- The explicit search_path ensures now() resolves from pg_catalog regardless
-- of the caller's search_path setting.
