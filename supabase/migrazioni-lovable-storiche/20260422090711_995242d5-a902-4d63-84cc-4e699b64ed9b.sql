ALTER TABLE public.fcs_assessments
  ADD COLUMN IF NOT EXISTS mcs_wrist_extension_l numeric,
  ADD COLUMN IF NOT EXISTS mcs_wrist_extension_r numeric,
  ADD COLUMN IF NOT EXISTS mcs_horizontal_adduction_l numeric,
  ADD COLUMN IF NOT EXISTS mcs_horizontal_adduction_r numeric,
  ADD COLUMN IF NOT EXISTS mcs_horizontal_reach_l numeric,
  ADD COLUMN IF NOT EXISTS mcs_horizontal_reach_r numeric;