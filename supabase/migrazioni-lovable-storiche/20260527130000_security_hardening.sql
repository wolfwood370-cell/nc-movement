-- =============================================================================
-- Security Hardening — fix Supabase linter warnings
-- =============================================================================
-- 1. fms_screenings: missing DELETE policy (users can't remove own health data)
-- 2. profiles:       missing DELETE policy
-- 3. bug_reports:    replace overly permissive `USING (true)` / `WITH CHECK (true)`
--                    policies with scoped ones based on user_id + role check
--                    (lint rule 0024_permissive_rls_policy)
-- =============================================================================

-- =============================================================================
-- 1. fms_screenings — DELETE policy
-- =============================================================================
-- Users can delete their own screenings (own health data).
-- Staff (admin / coach) can delete any (for coach-managed athlete records).

DROP POLICY IF EXISTS "Users delete own screenings" ON public.fms_screenings;
CREATE POLICY "Users delete own screenings" ON public.fms_screenings
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff delete all screenings" ON public.fms_screenings;
CREATE POLICY "Staff delete all screenings" ON public.fms_screenings
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coach')
  );

-- =============================================================================
-- 2. profiles — DELETE policy
-- =============================================================================
-- A user can delete their own profile row. The underlying auth.users row is
-- managed by Supabase Auth; deleting the profile clears the public-facing
-- record but does not log the user out (account deletion is a separate flow).

DROP POLICY IF EXISTS "Profiles deletable by owner" ON public.profiles;
CREATE POLICY "Profiles deletable by owner" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- =============================================================================
-- 3. bug_reports — scoped policies replacing the "Always True" ones
-- =============================================================================
-- Add a `user_id` column so we can attribute each bug to the user who hit it.
-- `DEFAULT auth.uid()` means the client doesn't need to send user_id explicitly
-- — Postgres fills it in from the JWT before the RLS WITH CHECK runs.

ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id
  ON public.bug_reports(user_id);

-- Drop the original `USING (true)` / `WITH CHECK (true)` policies.
DROP POLICY IF EXISTS "bug_reports_insert_authenticated" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_select_authenticated" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_update_authenticated" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_delete_authenticated" ON public.bug_reports;

-- INSERT: any authenticated user can save their own crash. The WITH CHECK
-- ties the row to the caller via the auto-filled user_id default.
CREATE POLICY "bug_reports_insert_own" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SELECT: own reports, plus staff (admin / coach) sees everything.
DROP POLICY IF EXISTS "bug_reports_select_own" ON public.bug_reports;
CREATE POLICY "bug_reports_select_own" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bug_reports_select_staff" ON public.bug_reports;
CREATE POLICY "bug_reports_select_staff" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coach')
  );

-- UPDATE: same scoping — own reports OR staff (for status changes).
DROP POLICY IF EXISTS "bug_reports_update_own" ON public.bug_reports;
CREATE POLICY "bug_reports_update_own" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bug_reports_update_staff" ON public.bug_reports;
CREATE POLICY "bug_reports_update_staff" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coach')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coach')
  );

-- DELETE: same scoping.
DROP POLICY IF EXISTS "bug_reports_delete_own" ON public.bug_reports;
CREATE POLICY "bug_reports_delete_own" ON public.bug_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bug_reports_delete_staff" ON public.bug_reports;
CREATE POLICY "bug_reports_delete_staff" ON public.bug_reports
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coach')
  );

-- =============================================================================
-- NOTE for the project owner (the coach)
-- =============================================================================
-- If you (the coach) want to see bug reports submitted by your athletes (not
-- only your own crashes), you need an 'admin' or 'coach' role in user_roles.
-- The role table itself is admin-managed (`has_role(auth.uid(), 'admin')`),
-- so the first assignment must be done via the Lovable SQL Editor (service-
-- role bypass). Run ONCE, replacing the email with your own:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin'
--   FROM auth.users
--   WHERE email = 'wolfwood370@gmail.com'
--   ON CONFLICT (user_id, role) DO NOTHING;
--
-- Without this, you'll still see your own reports (auth.uid() = user_id) but
-- not your athletes' reports.
