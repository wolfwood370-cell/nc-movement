ALTER TABLE public.fms_assessments
  ADD COLUMN IF NOT EXISTS clearing_shoulder_left_pain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clearing_shoulder_right_pain boolean NOT NULL DEFAULT false;