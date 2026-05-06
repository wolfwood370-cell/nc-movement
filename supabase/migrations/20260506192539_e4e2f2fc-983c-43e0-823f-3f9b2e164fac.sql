ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS progression text,
  ADD COLUMN IF NOT EXISTS regression text;