-- 1. Wipe anonymous-era data
DELETE FROM public.fms_assessments;
DELETE FROM public.clients;
DELETE FROM public.profiles;

-- 2. Extend clients
ALTER TABLE public.clients DROP COLUMN IF EXISTS sex;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','other')),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS primary_sport TEXT,
  ADD COLUMN IF NOT EXISTS competition_level TEXT CHECK (competition_level IN ('amateur','pro','recreational'));

CREATE UNIQUE INDEX IF NOT EXISTS clients_practitioner_email_unique
  ON public.clients(practitioner_id, lower(email)) WHERE email IS NOT NULL;

-- 3. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_title TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. YBT assessments
CREATE TABLE IF NOT EXISTS public.ybt_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  limb_length_cm NUMERIC(5,1),
  anterior_left_cm NUMERIC(5,1),
  anterior_right_cm NUMERIC(5,1),
  posteromedial_left_cm NUMERIC(5,1),
  posteromedial_right_cm NUMERIC(5,1),
  posterolateral_left_cm NUMERIC(5,1),
  posterolateral_right_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ybt_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "YBT selectable by owner" ON public.ybt_assessments FOR SELECT TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "YBT insertable by owner" ON public.ybt_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "YBT updatable by owner" ON public.ybt_assessments FOR UPDATE TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "YBT deletable by owner" ON public.ybt_assessments FOR DELETE TO authenticated USING (auth.uid() = practitioner_id);
CREATE TRIGGER ybt_set_updated_at BEFORE UPDATE ON public.ybt_assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. FCS assessments
CREATE TABLE IF NOT EXISTS public.fcs_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  motor_score SMALLINT CHECK (motor_score BETWEEN 0 AND 100),
  postural_score SMALLINT CHECK (postural_score BETWEEN 0 AND 100),
  explosive_score SMALLINT CHECK (explosive_score BETWEEN 0 AND 100),
  impact_score SMALLINT CHECK (impact_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fcs_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FCS selectable by owner" ON public.fcs_assessments FOR SELECT TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "FCS insertable by owner" ON public.fcs_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "FCS updatable by owner" ON public.fcs_assessments FOR UPDATE TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "FCS deletable by owner" ON public.fcs_assessments FOR DELETE TO authenticated USING (auth.uid() = practitioner_id);
CREATE TRIGGER fcs_set_updated_at BEFORE UPDATE ON public.fcs_assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Ensure handle_new_user trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();