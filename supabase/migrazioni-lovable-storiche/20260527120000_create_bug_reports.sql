-- =============================================================================
-- Bug Reports — in-app crash capture for surgical fixes
-- =============================================================================
-- The app's ErrorBoundary + global window listeners write here whenever a
-- React render error or an unhandled promise rejection bubbles up. The admin
-- page at /admin/bugs reads from this table, formats each row as Markdown,
-- and lets the user copy-paste the report to Claude.
--
-- Note: RLS is permissive because this is a single-coach app (the only
-- authenticated user is the admin). Tighten if multi-tenant.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  error_message   text NOT NULL,
  error_name      text,
  error_stack     text,
  url_path        text,
  user_agent      text,
  user_note       text,
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'reported', 'fixed')),
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at
  ON public.bug_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status
  ON public.bug_reports (status);

-- RLS — single-coach app: any authenticated user is the admin.
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_authenticated"
  ON public.bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "bug_reports_select_authenticated"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bug_reports_update_authenticated"
  ON public.bug_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "bug_reports_delete_authenticated"
  ON public.bug_reports FOR DELETE
  TO authenticated
  USING (true);
