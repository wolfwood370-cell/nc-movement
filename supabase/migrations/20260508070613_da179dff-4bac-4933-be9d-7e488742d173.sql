ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS ramp_category text,
  ADD COLUMN IF NOT EXISTS workout_target text,
  ADD COLUMN IF NOT EXISTS default_sets text,
  ADD COLUMN IF NOT EXISTS default_reps_time text;

CREATE INDEX IF NOT EXISTS idx_exercises_library_ramp ON public.exercises_library (ramp_category, workout_target);