-- Security hardening
-- fms_screenings DELETE
DROP POLICY IF EXISTS "Users delete own screenings" ON public.fms_screenings;
CREATE POLICY "Users delete own screenings" ON public.fms_screenings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff delete all screenings" ON public.fms_screenings;
CREATE POLICY "Staff delete all screenings" ON public.fms_screenings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coach'));

-- profiles DELETE
DROP POLICY IF EXISTS "Profiles deletable by owner" ON public.profiles;
CREATE POLICY "Profiles deletable by owner" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- bug_reports: add user_id and scope policies
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports(user_id);

DROP POLICY IF EXISTS "bug_reports_insert_authenticated" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_select_authenticated" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_update_authenticated" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_delete_authenticated" ON public.bug_reports;

CREATE POLICY "bug_reports_insert_own" ON public.bug_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bug_reports_select_own" ON public.bug_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bug_reports_select_staff" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coach'));
CREATE POLICY "bug_reports_update_own" ON public.bug_reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bug_reports_update_staff" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coach'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coach'));
CREATE POLICY "bug_reports_delete_own" ON public.bug_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bug_reports_delete_staff" ON public.bug_reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coach'));