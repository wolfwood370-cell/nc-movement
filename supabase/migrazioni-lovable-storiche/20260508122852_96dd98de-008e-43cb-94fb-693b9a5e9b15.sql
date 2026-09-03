DELETE FROM public.exercises_library WHERE name = 'Sprint 10m';

INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, ramp_category, workout_target, default_sets, default_reps_time, video_url)
VALUES
  ('general', 'Potentiate', 1, 'Plyometrics', 'Dumbbell Snatch', 'F', 'Full Body', '3', '3-5 Reps esplosive per braccio', 'https://www.youtube.com/embed/placeholder'),
  ('general', 'Potentiate', 1, 'Plyometrics', 'Vertical Squat Jump', 'F', 'Full Body', '3', '3-5 Reps esplosive', 'https://www.youtube.com/embed/placeholder');