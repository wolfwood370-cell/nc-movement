-- Add ON DELETE CASCADE foreign keys from assessments to clients.
-- Existing types.ts shows fms/fcs/ybt have FK; sfma_assessments does NOT. Add all uniformly.

-- Drop existing FKs (if present) to recreate with CASCADE
ALTER TABLE public.fms_assessments DROP CONSTRAINT IF EXISTS fms_assessments_client_id_fkey;
ALTER TABLE public.fcs_assessments DROP CONSTRAINT IF EXISTS fcs_assessments_client_id_fkey;
ALTER TABLE public.ybt_assessments DROP CONSTRAINT IF EXISTS ybt_assessments_client_id_fkey;
ALTER TABLE public.sfma_assessments DROP CONSTRAINT IF EXISTS sfma_assessments_client_id_fkey;

ALTER TABLE public.fms_assessments
  ADD CONSTRAINT fms_assessments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.fcs_assessments
  ADD CONSTRAINT fcs_assessments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.ybt_assessments
  ADD CONSTRAINT ybt_assessments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.sfma_assessments
  ADD CONSTRAINT sfma_assessments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;