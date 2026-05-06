-- Add ankle clearing stoplight columns to FMS assessments
ALTER TABLE public.fms_assessments
  ADD COLUMN IF NOT EXISTS ankle_clearing_left text,
  ADD COLUMN IF NOT EXISTS ankle_clearing_right text;