-- Enum for SFMA pattern scoring
CREATE TYPE public.sfma_score AS ENUM ('FN', 'DN', 'FP', 'DP');

CREATE TABLE public.sfma_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  practitioner_id uuid NOT NULL,
  assessed_at timestamptz NOT NULL DEFAULT now(),

  cervical_flexion public.sfma_score,
  cervical_extension public.sfma_score,
  cervical_rotation_r public.sfma_score,
  cervical_rotation_l public.sfma_score,

  upper_extremity_pattern_1_r public.sfma_score,
  upper_extremity_pattern_1_l public.sfma_score,
  upper_extremity_pattern_2_r public.sfma_score,
  upper_extremity_pattern_2_l public.sfma_score,

  multi_segmental_flexion public.sfma_score,
  multi_segmental_extension public.sfma_score,
  multi_segmental_rotation_r public.sfma_score,
  multi_segmental_rotation_l public.sfma_score,

  single_leg_stance_r public.sfma_score,
  single_leg_stance_l public.sfma_score,

  arms_down_deep_squat public.sfma_score,

  clinical_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sfma_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SFMA selectable by owner" ON public.sfma_assessments
  FOR SELECT TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "SFMA insertable by owner" ON public.sfma_assessments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "SFMA updatable by owner" ON public.sfma_assessments
  FOR UPDATE TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "SFMA deletable by owner" ON public.sfma_assessments
  FOR DELETE TO authenticated USING (auth.uid() = practitioner_id);

CREATE TRIGGER sfma_set_updated_at
  BEFORE UPDATE ON public.sfma_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_sfma_client ON public.sfma_assessments(client_id, assessed_at DESC);
CREATE INDEX idx_sfma_practitioner ON public.sfma_assessments(practitioner_id);