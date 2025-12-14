-- Migration: Restrict SRS LWW Batch Upsert RPC
-- Purpose: Ensure only authenticated users can execute the RPC
-- Date: 2025-12-13

REVOKE ALL ON FUNCTION public.upsert_srs_lww_batch(srs_input[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_srs_lww_batch(srs_input[]) TO authenticated;
