
ALTER TABLE public.sessions
  ADD COLUMN goal text,
  ADD COLUMN program jsonb;
