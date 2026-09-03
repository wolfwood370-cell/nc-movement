ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_previous_injury boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS injury_notes text;

DO $$ BEGIN
  CREATE TYPE public.ybt_test_type AS ENUM ('LQ', 'UQ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ybt_assessments
  ADD COLUMN IF NOT EXISTS test_type public.ybt_test_type NOT NULL DEFAULT 'LQ';