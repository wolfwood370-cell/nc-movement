
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles selectable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  sex TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients selectable by owner" ON public.clients FOR SELECT USING (auth.uid() = practitioner_id);
CREATE POLICY "Clients insertable by owner" ON public.clients FOR INSERT WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "Clients updatable by owner" ON public.clients FOR UPDATE USING (auth.uid() = practitioner_id);
CREATE POLICY "Clients deletable by owner" ON public.clients FOR DELETE USING (auth.uid() = practitioner_id);
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX clients_practitioner_idx ON public.clients(practitioner_id);

-- FMS Assessments
CREATE TABLE public.fms_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Pattern raw scores. Bilateral patterns store left/right; unilateral use _score.
  deep_squat_score SMALLINT,
  hurdle_step_left SMALLINT, hurdle_step_right SMALLINT,
  inline_lunge_left SMALLINT, inline_lunge_right SMALLINT,
  shoulder_mobility_left SMALLINT, shoulder_mobility_right SMALLINT,
  aslr_left SMALLINT, aslr_right SMALLINT,
  trunk_stability_pushup_score SMALLINT,
  rotary_stability_left SMALLINT, rotary_stability_right SMALLINT,
  -- Clearing tests
  clearing_shoulder_pain BOOLEAN NOT NULL DEFAULT false,
  clearing_spinal_extension_pain BOOLEAN NOT NULL DEFAULT false,
  clearing_spinal_flexion_pain BOOLEAN NOT NULL DEFAULT false,
  total_score SMALLINT,
  primary_corrective TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fms_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FMS selectable by owner" ON public.fms_assessments FOR SELECT USING (auth.uid() = practitioner_id);
CREATE POLICY "FMS insertable by owner" ON public.fms_assessments FOR INSERT WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "FMS updatable by owner" ON public.fms_assessments FOR UPDATE USING (auth.uid() = practitioner_id);
CREATE POLICY "FMS deletable by owner" ON public.fms_assessments FOR DELETE USING (auth.uid() = practitioner_id);
CREATE TRIGGER fms_updated_at BEFORE UPDATE ON public.fms_assessments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX fms_client_idx ON public.fms_assessments(client_id);
CREATE INDEX fms_practitioner_idx ON public.fms_assessments(practitioner_id);
