-- Migration: Restrict SRS LWW Batch Upsert RPC (anon)
-- Purpose: Ensure anon cannot execute the RPC (defense in depth)
-- Date: 2025-12-13

REVOKE ALL ON FUNCTION public.upsert_srs_lww_batch(srs_input[]) FROM anon;
