-- Migration: Add LWW protection for results upserts
-- Prevents resurrection of deleted records by stale clients

-- Create the protection function
CREATE OR REPLACE FUNCTION public.protect_results_deleted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: Only apply on UPDATE (INSERT has no OLD row)
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- If existing row is deleted and incoming is NOT deleted...
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Only allow resurrection if incoming updated_at is strictly newer
    IF NEW.updated_at <= OLD.updated_at THEN
      -- Preserve the deletion, don't resurrect
      NEW.deleted_at := OLD.deleted_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to results table
DROP TRIGGER IF EXISTS results_protect_deleted_at ON public.results;
CREATE TRIGGER results_protect_deleted_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_results_deleted_at();

-- Add comment for documentation
COMMENT ON FUNCTION public.protect_results_deleted_at() IS 
  'LWW protection: prevents stale clients from resurrecting deleted results';
