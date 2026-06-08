-- =============================================================================
-- Harden UPDATE policies with WITH CHECK
-- =============================================================================
-- Audit finding: the owner-scoped UPDATE policies on clients, profiles, the four
-- assessment tables and sessions had only a USING clause and NO WITH CHECK. That
-- lets a row be UPDATEd to reassign practitioner_id / id (or client_id) to
-- another value. Defense-in-depth: mirror each table's INSERT WITH CHECK so the
-- post-update row must still belong to the caller.
-- (Low impact under the single-owner lockdown, but correct and consistent.)
-- =============================================================================

-- profiles --------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles updatable by owner" ON public.profiles;
CREATE POLICY "Profiles updatable by owner" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- clients ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Clients updatable by owner" ON public.clients;
CREATE POLICY "Clients updatable by owner" ON public.clients
  FOR UPDATE TO authenticated
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- fms_assessments -------------------------------------------------------------
DROP POLICY IF EXISTS "FMS updatable by owner" ON public.fms_assessments;
CREATE POLICY "FMS updatable by owner" ON public.fms_assessments
  FOR UPDATE TO authenticated
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- fcs_assessments -------------------------------------------------------------
DROP POLICY IF EXISTS "FCS updatable by owner" ON public.fcs_assessments;
CREATE POLICY "FCS updatable by owner" ON public.fcs_assessments
  FOR UPDATE TO authenticated
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- ybt_assessments -------------------------------------------------------------
DROP POLICY IF EXISTS "YBT updatable by owner" ON public.ybt_assessments;
CREATE POLICY "YBT updatable by owner" ON public.ybt_assessments
  FOR UPDATE TO authenticated
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- sfma_assessments ------------------------------------------------------------
DROP POLICY IF EXISTS "SFMA updatable by owner" ON public.sfma_assessments;
CREATE POLICY "SFMA updatable by owner" ON public.sfma_assessments
  FOR UPDATE TO authenticated
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

-- sessions (mirror its INSERT: row must belong to caller AND to one of the
-- caller's own clients) -------------------------------------------------------
DROP POLICY IF EXISTS "Sessions updatable by owner" ON public.sessions;
CREATE POLICY "Sessions updatable by owner" ON public.sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = practitioner_id)
  WITH CHECK (
    auth.uid() = practitioner_id
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = sessions.client_id
        AND clients.practitioner_id = auth.uid()
    )
  );
