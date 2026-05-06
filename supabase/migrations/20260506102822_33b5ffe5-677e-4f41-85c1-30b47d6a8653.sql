-- Exercises library: dynamic corrective matrix keyed by pattern × phase × posture level (1..12)
CREATE TYPE public.corrective_phase AS ENUM ('Reset', 'Reactivate', 'Reinforce');

CREATE TABLE public.exercises_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  phase public.corrective_phase NOT NULL,
  posture_level smallint NOT NULL CHECK (posture_level BETWEEN 1 AND 12),
  posture_name text NOT NULL,
  name text NOT NULL,
  goal text,
  dose text,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_library_lookup
  ON public.exercises_library (pattern, phase, posture_level);

ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

-- Library is global reference data — readable by any authenticated user.
CREATE POLICY "Exercises readable by authenticated"
  ON public.exercises_library
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER exercises_library_set_updated_at
  BEFORE UPDATE ON public.exercises_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Posture levels reference (Cook neurodevelopmental sequence):
-- 1 Supine · 2 Prone · 3 Quadruped · 4 Sitting · 5 Kneeling
-- 6 Half Kneeling · 7 Open Half Kneeling · 8 Side Lying · 9 Single Leg
-- 10 Single Leg Supported · 11 Split Stance · 12 Standing

-- ===================== SCAFFOLD: ASLR =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('aslr','Reset',1,'Supine','Supine Leg Lowering con core brace','Mobilità d''anca con controllo lombo-pelvico','2 × 8 per lato'),
  ('aslr','Reactivate',3,'Quadruped','Quadruped Rocking + Hip Flow','Dissociazione anca/colonna','3 × 6 per lato'),
  ('aslr','Reinforce',5,'Kneeling','Tall-Kneeling Hip Hinge con stick','Pattern caricato di hinge','3 × 8'),
  ('aslr','Reset',6,'Half Kneeling','Half-Kneeling Hip Flexor Stretch attivo','Mobilità d''anca dinamica','2 × 8 per lato'),
  ('aslr','Reactivate',9,'Single Leg','Single-Leg Stance + March','Controllo monopodalico','3 × 8 per lato'),
  ('aslr','Reinforce',12,'Standing','Single-Leg Deadlift carico leggero','Pattern integrato in piedi','3 × 6 per lato');

-- ===================== SCAFFOLD: SHOULDER MOBILITY =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('shoulder_mobility','Reset',1,'Supine','Supine T-Spine Opener (foam roller)','Estensione toracica','2 × 60s'),
  ('shoulder_mobility','Reactivate',3,'Quadruped','Quadruped T-Spine Rotation','Rotazione toracica controllata','2 × 8 per lato'),
  ('shoulder_mobility','Reinforce',4,'Sitting','Seated Band Pull-Apart','Postura scapolare','3 × 12'),
  ('shoulder_mobility','Reset',6,'Half Kneeling','Half-Kneeling Armbar (KB)','Controllo gleno-omerale','3 × 20s per lato'),
  ('shoulder_mobility','Reinforce',12,'Standing','Standing Overhead Press','Integrazione overhead','3 × 6');

-- ===================== SCAFFOLD: ROTARY STABILITY =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('rotary_stability','Reset',2,'Prone','Crocodile Breathing prono','Respirazione diaframmatica','2 × 90s'),
  ('rotary_stability','Reactivate',3,'Quadruped','Bird-Dog con tocco alterno','Cross-pattern statico','3 × 6 per lato'),
  ('rotary_stability','Reinforce',6,'Half Kneeling','Half-Kneeling Pallof Press','Anti-rotazione caricata','3 × 8 per lato'),
  ('rotary_stability','Reinforce',11,'Split Stance','Split-Stance Cable Chop','Anti-rotazione dinamica','3 × 8 per lato');

-- ===================== SCAFFOLD: TRUNK STABILITY PUSH-UP =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('trunk_stability_pushup','Reset',2,'Prone','Prone Press-Up (McKenzie)','Estensione toracica passiva','2 × 8'),
  ('trunk_stability_pushup','Reactivate',3,'Quadruped','Quadruped Shoulder Tap','Controllo plank in quadrupedia','3 × 6 per lato'),
  ('trunk_stability_pushup','Reinforce',12,'Standing','Elevated Push-Up (banco)','Push-up pattern caricato','3 × 6');

-- ===================== SCAFFOLD: INLINE LUNGE =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('inline_lunge','Reset',5,'Kneeling','Tall-Kneeling Anti-Extension','Controllo pelvico in ginocchio','2 × 30s'),
  ('inline_lunge','Reactivate',6,'Half Kneeling','Half-Kneeling Stick Press overhead','Stabilità split-stance','3 × 30s per lato'),
  ('inline_lunge','Reinforce',11,'Split Stance','Reverse Lunge con stick verticale','Pattern di affondo','3 × 6 per lato');

-- ===================== SCAFFOLD: HURDLE STEP =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('hurdle_step','Reset',1,'Supine','Supine 90/90 Hip Lift','Mobilità d''anca','2 × 8 per lato'),
  ('hurdle_step','Reactivate',9,'Single Leg','Single-Leg Stance occhi aperti→chiusi','Single-leg balance','3 × 30s per lato'),
  ('hurdle_step','Reinforce',12,'Standing','Mini-band Marching · step-over basso','Step pattern','3 × 8 per lato');

-- ===================== SCAFFOLD: DEEP SQUAT =====================
INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name, goal, dose) VALUES
  ('deep_squat','Reset',4,'Sitting','Seated Ankle Rocking','Dorsiflessione caviglia','2 × 8 per lato'),
  ('deep_squat','Reactivate',5,'Kneeling','Tall-Kneeling Overhead Reach','Estensione toracica caricata','2 × 10'),
  ('deep_squat','Reinforce',12,'Standing','Goblet Squat lento','Squat caricato','3 × 6 tempo 3-1-3'),
  ('deep_squat','Reset',6,'Half Kneeling','Half-Kneeling Ankle Rocking','Mobilità caviglia attiva','2 × 8 per lato'),
  ('deep_squat','Reinforce',11,'Split Stance','Split Squat assistito','Pattern bilaterale split','3 × 6 per lato');