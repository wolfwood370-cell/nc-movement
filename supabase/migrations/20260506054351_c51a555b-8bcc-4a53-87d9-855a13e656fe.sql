-- Hardened INSERT policies
DROP POLICY IF EXISTS "FMS insertable by owner" ON public.fms_assessments;
CREATE POLICY "FMS insertable on owned client"
  ON public.fms_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = practitioner_id
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND practitioner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "SFMA insertable by owner" ON public.sfma_assessments;
CREATE POLICY "SFMA insertable on owned client"
  ON public.sfma_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = practitioner_id
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND practitioner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "FCS insertable by owner" ON public.fcs_assessments;
CREATE POLICY "FCS insertable on owned client"
  ON public.fcs_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = practitioner_id
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND practitioner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "YBT insertable by owner" ON public.ybt_assessments;
CREATE POLICY "YBT insertable on owned client"
  ON public.ybt_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = practitioner_id
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND practitioner_id = auth.uid()
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_fms_client_assessed
  ON public.fms_assessments(client_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fcs_client_assessed
  ON public.fcs_assessments(client_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ybt_client_assessed
  ON public.ybt_assessments(client_id, assessed_at DESC);