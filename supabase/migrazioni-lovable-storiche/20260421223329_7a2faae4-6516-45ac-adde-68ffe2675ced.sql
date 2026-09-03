ALTER TABLE public.fms_assessments
  ADD COLUMN IF NOT EXISTS tibia_length_cm numeric,
  ADD COLUMN IF NOT EXISTS hand_length_cm numeric,
  ADD COLUMN IF NOT EXISTS ankle_clearing_left_pain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ankle_clearing_right_pain boolean NOT NULL DEFAULT false;