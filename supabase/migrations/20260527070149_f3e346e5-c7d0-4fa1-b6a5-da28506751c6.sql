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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports (status);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_authenticated"
  ON public.bug_reports FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "bug_reports_select_authenticated"
  ON public.bug_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "bug_reports_update_authenticated"
  ON public.bug_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bug_reports_delete_authenticated"
  ON public.bug_reports FOR DELETE TO authenticated USING (true);