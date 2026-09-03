-- 1. Add generated column posture_tier (1-4) mapped from Cook 12-level scale
ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS posture_tier smallint
  GENERATED ALWAYS AS (
    CASE
      WHEN posture_level BETWEEN 1 AND 3  THEN 1  -- Supine, Prone, Side Lying
      WHEN posture_level BETWEEN 4 AND 5  THEN 2  -- Quadruped, Sitting (suspension)
      WHEN posture_level BETWEEN 6 AND 8  THEN 3  -- Tall/Half/Open Kneeling
      WHEN posture_level BETWEEN 9 AND 12 THEN 4  -- Split Stance, Single Leg, Standing
      ELSE NULL
    END
  ) STORED;

-- 2. Pattern normalization trigger (defensive — current data already lowercase/snake_case)
CREATE OR REPLACE FUNCTION public.normalize_exercise_pattern()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pattern IS NOT NULL THEN
    NEW.pattern := lower(trim(NEW.pattern));
    NEW.pattern := replace(NEW.pattern, ' ', '_');
    NEW.pattern := replace(NEW.pattern, '-', '_');
    -- Common alias remapping
    NEW.pattern := CASE NEW.pattern
      WHEN 'active_straight_leg_raise' THEN 'aslr'
      WHEN 'tspu'                      THEN 'trunk_stability_pushup'
      WHEN 'trunk_stability_push_up'   THEN 'trunk_stability_pushup'
      ELSE NEW.pattern
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_exercise_pattern ON public.exercises_library;
CREATE TRIGGER trg_normalize_exercise_pattern
  BEFORE INSERT OR UPDATE OF pattern ON public.exercises_library
  FOR EACH ROW EXECUTE FUNCTION public.normalize_exercise_pattern();

-- 3. Composite index covering the PT Pack batch generator query
CREATE INDEX IF NOT EXISTS idx_exercises_library_engine
  ON public.exercises_library (pattern, workout_target, ramp_category, posture_tier);

-- 4. Index on posture_tier alone for quick tier filters
CREATE INDEX IF NOT EXISTS idx_exercises_library_posture_tier
  ON public.exercises_library (posture_tier);