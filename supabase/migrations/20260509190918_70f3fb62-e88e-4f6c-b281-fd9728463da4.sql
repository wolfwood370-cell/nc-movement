-- Phase 18: Modified FMS assessment type
ALTER TABLE public.fms_assessments
  ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'full';

-- Constraint: only 'full' or 'modified' allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fms_assessment_type_check'
  ) THEN
    ALTER TABLE public.fms_assessments
      ADD CONSTRAINT fms_assessment_type_check
      CHECK (assessment_type IN ('full','modified'));
  END IF;
END $$;

-- Ensure pattern score columns allow NULL so a Modified FMS can be saved
-- without populating the skipped patterns.
ALTER TABLE public.fms_assessments ALTER COLUMN hurdle_step_left DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN hurdle_step_right DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN inline_lunge_left DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN inline_lunge_right DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN trunk_stability_pushup_score DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN rotary_stability_left DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN rotary_stability_right DROP NOT NULL;
ALTER TABLE public.fms_assessments ALTER COLUMN total_score DROP NOT NULL;