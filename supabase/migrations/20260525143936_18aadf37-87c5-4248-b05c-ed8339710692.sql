
CREATE TYPE public.session_type AS ENUM ('Triage', 'PT Pack');
CREATE TYPE public.session_status AS ENUM ('draft', 'scheduled', 'completed', 'cancelled');

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL,
  client_id uuid NOT NULL,
  fms_assessment_id uuid,
  session_type public.session_type NOT NULL,
  status public.session_status NOT NULL DEFAULT 'draft',
  session_number smallint,
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate PT Pack sessions per FMS assessment
CREATE UNIQUE INDEX sessions_ptpack_unique
  ON public.sessions (fms_assessment_id, session_type, session_number)
  WHERE session_type = 'PT Pack' AND fms_assessment_id IS NOT NULL;

-- Prevent duplicate Triage session per FMS assessment
CREATE UNIQUE INDEX sessions_triage_unique
  ON public.sessions (fms_assessment_id)
  WHERE session_type = 'Triage' AND fms_assessment_id IS NOT NULL;

CREATE INDEX sessions_client_idx ON public.sessions (client_id, created_at DESC);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions selectable by owner" ON public.sessions
  FOR SELECT TO authenticated USING (auth.uid() = practitioner_id);

CREATE POLICY "Sessions insertable on owned client" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = practitioner_id AND EXISTS (
    SELECT 1 FROM public.clients WHERE clients.id = sessions.client_id AND clients.practitioner_id = auth.uid()
  ));

CREATE POLICY "Sessions updatable by owner" ON public.sessions
  FOR UPDATE TO authenticated USING (auth.uid() = practitioner_id);

CREATE POLICY "Sessions deletable by owner" ON public.sessions
  FOR DELETE TO authenticated USING (auth.uid() = practitioner_id);

CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
