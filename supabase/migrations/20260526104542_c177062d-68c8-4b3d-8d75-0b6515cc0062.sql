CREATE OR REPLACE FUNCTION public.normalize_exercise_pattern()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.pattern IS NOT NULL THEN
    NEW.pattern := lower(trim(NEW.pattern));
    NEW.pattern := replace(NEW.pattern, ' ', '_');
    NEW.pattern := replace(NEW.pattern, '-', '_');
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