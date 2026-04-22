ALTER TABLE public.sfma_assessments
ADD COLUMN IF NOT EXISTS breakout_results jsonb NOT NULL DEFAULT '{}'::jsonb;