-- =========================================
-- 1. ROLES INFRASTRUCTURE
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'athlete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 2. FMS SCREENINGS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS public.fms_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Symmetric patterns
  deep_squat INTEGER CHECK (deep_squat BETWEEN 0 AND 3),
  trunk_stability_pushup INTEGER CHECK (trunk_stability_pushup BETWEEN 0 AND 3),

  -- Asymmetric patterns
  hurdle_step_left INTEGER CHECK (hurdle_step_left BETWEEN 0 AND 3),
  hurdle_step_right INTEGER CHECK (hurdle_step_right BETWEEN 0 AND 3),
  inline_lunge_left INTEGER CHECK (inline_lunge_left BETWEEN 0 AND 3),
  inline_lunge_right INTEGER CHECK (inline_lunge_right BETWEEN 0 AND 3),
  shoulder_mobility_left INTEGER CHECK (shoulder_mobility_left BETWEEN 0 AND 3),
  shoulder_mobility_right INTEGER CHECK (shoulder_mobility_right BETWEEN 0 AND 3),
  active_straight_leg_raise_left INTEGER CHECK (active_straight_leg_raise_left BETWEEN 0 AND 3),
  active_straight_leg_raise_right INTEGER CHECK (active_straight_leg_raise_right BETWEEN 0 AND 3),
  rotary_stability_left INTEGER CHECK (rotary_stability_left BETWEEN 0 AND 3),
  rotary_stability_right INTEGER CHECK (rotary_stability_right BETWEEN 0 AND 3),

  -- Clearing tests (true = pain present)
  clearing_shoulder_pain BOOLEAN NOT NULL DEFAULT false,
  clearing_extension_pain BOOLEAN NOT NULL DEFAULT false,
  clearing_flexion_pain BOOLEAN NOT NULL DEFAULT false,

  -- Derived state
  fms_total_score INTEGER CHECK (fms_total_score BETWEEN 0 AND 21),
  requires_medical_clearance BOOLEAN NOT NULL DEFAULT false,
  blacklist_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_fms_screenings_user_id ON public.fms_screenings(user_id);
CREATE INDEX IF NOT EXISTS idx_fms_screenings_created_at ON public.fms_screenings(created_at DESC);

-- =========================================
-- 3. AUTO-COMPUTE TRIGGER
-- =========================================
CREATE OR REPLACE FUNCTION public.compute_fms_screening()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deep_squat INTEGER := NEW.deep_squat;
  v_tspu INTEGER := NEW.trunk_stability_pushup;
  v_hurdle INTEGER := LEAST(NEW.hurdle_step_left, NEW.hurdle_step_right);
  v_lunge INTEGER := LEAST(NEW.inline_lunge_left, NEW.inline_lunge_right);
  v_shoulder INTEGER := LEAST(NEW.shoulder_mobility_left, NEW.shoulder_mobility_right);
  v_aslr INTEGER := LEAST(NEW.active_straight_leg_raise_left, NEW.active_straight_leg_raise_right);
  v_rotary INTEGER := LEAST(NEW.rotary_stability_left, NEW.rotary_stability_right);
  v_finals INTEGER[];
BEGIN
  -- Pain override: clearing test positive forces associated pattern to 0
  IF NEW.clearing_shoulder_pain THEN v_shoulder := 0; END IF;
  IF NEW.clearing_extension_pain THEN v_tspu := 0; END IF;
  IF NEW.clearing_flexion_pain THEN v_rotary := 0; END IF;

  v_finals := ARRAY[v_deep_squat, v_tspu, v_hurdle, v_lunge, v_shoulder, v_aslr, v_rotary];

  -- Total score (NULL if any pattern incomplete)
  IF array_position(v_finals, NULL) IS NULL THEN
    NEW.fms_total_score := v_deep_squat + v_tspu + v_hurdle + v_lunge + v_shoulder + v_aslr + v_rotary;
  ELSE
    NEW.fms_total_score := NULL;
  END IF;

  -- Medical clearance: any final pattern = 0
  NEW.requires_medical_clearance := (
    v_deep_squat = 0 OR v_tspu = 0 OR v_hurdle = 0 OR
    v_lunge = 0 OR v_shoulder = 0 OR v_aslr = 0 OR v_rotary = 0
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_fms_screening ON public.fms_screenings;
CREATE TRIGGER trg_compute_fms_screening
BEFORE INSERT OR UPDATE ON public.fms_screenings
FOR EACH ROW EXECUTE FUNCTION public.compute_fms_screening();

-- =========================================
-- 4. ROW LEVEL SECURITY
-- =========================================
ALTER TABLE public.fms_screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own screenings" ON public.fms_screenings;
CREATE POLICY "Users insert own screenings" ON public.fms_screenings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own screenings" ON public.fms_screenings;
CREATE POLICY "Users update own screenings" ON public.fms_screenings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own screenings" ON public.fms_screenings;
CREATE POLICY "Users view own screenings" ON public.fms_screenings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff view all screenings" ON public.fms_screenings;
CREATE POLICY "Staff view all screenings" ON public.fms_screenings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'));
