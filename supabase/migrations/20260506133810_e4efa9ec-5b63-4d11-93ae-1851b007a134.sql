DELETE FROM public.exercises_library
WHERE pattern = 'shoulder_mobility'
  AND id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY pattern, posture_level, name ORDER BY created_at DESC) AS rn
      FROM public.exercises_library
      WHERE pattern = 'shoulder_mobility'
    ) t
    WHERE rn > 1
  );

DELETE FROM public.exercises_library
WHERE pattern = 'shoulder_mobility'
  AND name IN (
    'Supine T-Spine Opener (foam roller)',
    'Quadruped T-Spine Rotation',
    'Seated Band Pull-Apart',
    'Half-Kneeling Armbar (KB)',
    'Standing Overhead Press'
  )
  AND (
    (name = 'Supine T-Spine Opener (foam roller)' AND posture_level = 1)
    OR (name = 'Quadruped T-Spine Rotation' AND posture_level = 3)
    OR (name = 'Seated Band Pull-Apart' AND posture_level = 4)
    OR (name = 'Half-Kneeling Armbar (KB)' AND posture_level = 6)
    OR (name = 'Standing Overhead Press' AND posture_level = 12)
  );