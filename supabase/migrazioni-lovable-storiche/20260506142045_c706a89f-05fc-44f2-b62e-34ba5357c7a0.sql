-- Seed Trunk Stability Push-Up (TSPU) exercises
DELETE FROM public.exercises_library WHERE pattern = 'trunk_stability_pushup';

INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name) VALUES
-- Level 1 Supine - Reset
('trunk_stability_pushup','Reset',1,'Supine','90/90 Breathing Position'),
('trunk_stability_pushup','Reset',1,'Supine','Alternating Bench Press'),
('trunk_stability_pushup','Reset',1,'Supine','Assisted Crunch with FMT'),
('trunk_stability_pushup','Reset',1,'Supine','Assisted Curl Up with FMT'),
('trunk_stability_pushup','Reset',1,'Supine','Bench Press with Hip Bridge'),
('trunk_stability_pushup','Reset',1,'Supine','DB Bench Press'),
('trunk_stability_pushup','Reset',1,'Supine','DB Incline Bench Press'),
('trunk_stability_pushup','Reset',1,'Supine','Flexion and Extension Alternate Arm Pattern from Supine with FMT'),
('trunk_stability_pushup','Reset',1,'Supine','Log Roll'),
('trunk_stability_pushup','Reset',1,'Supine','Single Arm Bench Press with Hip Bridge'),
('trunk_stability_pushup','Reset',1,'Supine','Supine Chop with FMT'),
-- Level 2 Prone - Reset
('trunk_stability_pushup','Reset',2,'Prone','Crocodile Breathing Partner Assist'),
('trunk_stability_pushup','Reset',2,'Prone','Crocodile Breathing with Ankle Weights'),
('trunk_stability_pushup','Reset',2,'Prone','Full Bow Stretch'),
('trunk_stability_pushup','Reset',2,'Prone','Prone Press Up with Bolster Assistance'),
-- Level 3 Side Lying - Reset
('trunk_stability_pushup','Reset',3,'Side Lying','Foam Roller - Tensor Fascia Latae (TFL)'),
-- Level 4 Quadruped - Reactivate
('trunk_stability_pushup','Reactivate',4,'Quadruped','Quadruped Rock with Core Activation'),
-- Level 5 Sitting - Reactivate
('trunk_stability_pushup','Reactivate',5,'Sitting','Half Bow Stretch'),
-- Level 6 Tall Kneeling - Reactivate
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','D2 Flexion from Tall Kneeling with FMT'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Flexion and Extension Alternate Arm Pattern from Tall Kneeling with FMT'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','KB Overhead Tall kneeling to Half Kneeling Transitions'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Lift from Tall Kneeling with Cable Bar'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Press Double Arm from Tall Kneeling with CS'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Pull Double Arm from Tall Kneeling with Cable System'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Pull Single Arm from Tall Kneeling with Cable System'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Push Double Arm from Tall Kneeling with Cable System'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Row Double Arm from Tall Kneeling with Cable System'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Bicep Curl'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Chop with FMT'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Curl to Press'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling D1 Flexion from T'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling D2 Extension'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling DB Military Press'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling KB Halo'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling KB Press'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Single Arm Bicep Curl'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Single Arm Curl to Press'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Single Arm Overhead Press'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Single Arm Press with DB'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Turns Anterior Load'),
('trunk_stability_pushup','Reactivate',6,'Tall Kneeling','Tall Kneeling Turns Posterior Load'),
-- Level 7 Half Kneeling - Reactivate
('trunk_stability_pushup','Reactivate',7,'Half Kneeling','Get-up Half Kneeling to Stand Split Stance Bottoms Up Press with One KB'),
('trunk_stability_pushup','Reactivate',7,'Half Kneeling','Half Kneeling Chop with FMT'),
('trunk_stability_pushup','Reactivate',7,'Half Kneeling','Half Kneeling Turns Anterior Load'),
('trunk_stability_pushup','Reactivate',7,'Half Kneeling','Hip Flexor Stretch with Core Activation'),
-- Level 9 Split Stance - Reinforce
('trunk_stability_pushup','Reinforce',9,'Split Stance','Bicep Curl from Split Stance with DB'),
('trunk_stability_pushup','Reinforce',9,'Split Stance','D1 Flexion with Reverse Lunge'),
('trunk_stability_pushup','Reinforce',9,'Split Stance','Lunge Forward Double Arm Up with Two DB'),
('trunk_stability_pushup','Reinforce',9,'Split Stance','Overhead Split Squat'),
('trunk_stability_pushup','Reinforce',9,'Split Stance','Row Double Arm from Split Stance with Cable System'),
-- Level 10 Single Leg Supported - Reinforce
('trunk_stability_pushup','Reinforce',10,'Single Leg Supported','Row Double Arm from Single Leg Supported with Cable System'),
-- Level 11 Single Leg - Reinforce
('trunk_stability_pushup','Reinforce',11,'Single Leg','Single Leg Single Arm Curl to Press'),
-- Level 12 Standing - Reinforce
('trunk_stability_pushup','Reinforce',12,'Standing','Bottoms Up Overhead Press'),
('trunk_stability_pushup','Reinforce',12,'Standing','KB Push Press'),
('trunk_stability_pushup','Reinforce',12,'Standing','Single Arm Curl to Press'),
('trunk_stability_pushup','Reinforce',12,'Standing','Single Arm KB Push Press'),
('trunk_stability_pushup','Reinforce',12,'Standing','Standing Turns with 2 KB');