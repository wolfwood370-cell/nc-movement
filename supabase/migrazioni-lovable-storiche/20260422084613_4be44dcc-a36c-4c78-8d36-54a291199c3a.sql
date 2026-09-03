
-- Enum for ankle clearing position
DO $$ BEGIN
  CREATE TYPE public.ankle_clearing_position AS ENUM ('Beyond', 'Within', 'Behind');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.fcs_assessments
  ADD COLUMN IF NOT EXISTS bodyweight_kg numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS foot_length_cm numeric,
  ADD COLUMN IF NOT EXISTS mcs_ankle_clearing_r public.ankle_clearing_position,
  ADD COLUMN IF NOT EXISTS mcs_ankle_clearing_l public.ankle_clearing_position,
  ADD COLUMN IF NOT EXISTS mcs_ankle_pain_r boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mcs_ankle_pain_l boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mcs_forward_reach_r numeric,
  ADD COLUMN IF NOT EXISTS mcs_forward_reach_l numeric,
  ADD COLUMN IF NOT EXISTS power_broad_jump_cm numeric,
  ADD COLUMN IF NOT EXISTS power_broad_jump_hands_hips_cm numeric,
  ADD COLUMN IF NOT EXISTS explosive_single_leg_jump_r numeric,
  ADD COLUMN IF NOT EXISTS explosive_single_leg_jump_l numeric,
  ADD COLUMN IF NOT EXISTS impact_212_bound_r numeric,
  ADD COLUMN IF NOT EXISTS impact_212_bound_l numeric,
  ADD COLUMN IF NOT EXISTS postural_carry_load_kg numeric,
  ADD COLUMN IF NOT EXISTS postural_carry_distance_m numeric,
  ADD COLUMN IF NOT EXISTS postural_carry_time_sec numeric;
