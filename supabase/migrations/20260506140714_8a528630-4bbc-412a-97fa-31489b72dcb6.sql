-- Clean legacy ASLR entries to avoid duplicates
DELETE FROM public.exercises_library WHERE pattern = 'aslr';

INSERT INTO public.exercises_library (pattern, phase, posture_level, posture_name, name) VALUES
-- Level 1 Supine — Reset
('aslr','Reset',1,'Supine','90/90 Breathing Position'),
('aslr','Reset',1,'Supine','Active Leg Lowering'),
('aslr','Reset',1,'Supine','Active Leg Lowering to Bolster'),
('aslr','Reset',1,'Supine','Assisted Leg Lowering to Bolster'),
('aslr','Reset',1,'Supine','Assisted Single Leg Lowering'),
('aslr','Reset',1,'Supine','Bridge'),
('aslr','Reset',1,'Supine','Bridge Single Leg with Valgus Correction with FMT'),
('aslr','Reset',1,'Supine','Foam Roller - Calf Muscle'),
('aslr','Reset',1,'Supine','Foam Roller - Hamstring'),
('aslr','Reset',1,'Supine','Kettlebell Assisted Leg Raise'),
('aslr','Reset',1,'Supine','Leg Lock Bridge'),
('aslr','Reset',1,'Supine','Leg Lowering Bridge with Disc Pillow and Foam Roller'),
('aslr','Reset',1,'Supine','Leg Lowering with Disc Pillow'),
('aslr','Reset',1,'Supine','Leg Lowering with Disc Pillow and Glider'),
('aslr','Reset',1,'Supine','Leg Lowering with Disc Pillow and Mini Band'),
('aslr','Reset',1,'Supine','Leg Raise Core Engagement with FMT'),
('aslr','Reset',1,'Supine','Rolling Lower Body with Upper Body Feedback'),
('aslr','Reset',1,'Supine','Single Leg Assisted Bridge with FMT'),
('aslr','Reset',1,'Supine','Single Leg Bridge'),
('aslr','Reset',1,'Supine','Straight Leg Bridge'),
('aslr','Reset',1,'Supine','Straight Leg Bridge with FMT'),
('aslr','Reset',1,'Supine','Strap Assisted Straight Leg Stretch with Ankle Circles'),
('aslr','Reset',1,'Supine','Strap Assisted Straight-Leg Stretch'),
('aslr','Reset',1,'Supine','Supine Chop with FMT'),
-- Level 2 Prone — Reset
('aslr','Reset',2,'Prone','Crocodile Breathing Partner Assist'),
('aslr','Reset',2,'Prone','Crocodile Breathing with Ankle Weights'),
('aslr','Reset',2,'Prone','Foam Roller - Adductor'),
-- Level 3 Side Lying — Reset
('aslr','Reset',3,'Side Lying','Foam Roller - Tensor Fascia Latae (TFL)'),
-- Level 5 Sitting — Reactivate
('aslr','Reactivate',5,'Sitting','Get-up Post to High Pelvis Bridge Isolations'),
('aslr','Reactivate',5,'Sitting','Stick Work - Hamstring Release'),
-- Level 7 Half Kneeling — Reactivate
('aslr','Reactivate',7,'Half Kneeling','Chop from Half Kneeling with Cable Bar'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Bicep Curl'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Chop with FMT'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling KB Press'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Lift with Cable Bar'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Lift with FMT'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Rotation with Dowel'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Set-Up'),
('aslr','Reactivate',7,'Half Kneeling','Half Kneeling Single Arm Curl to Press'),
('aslr','Reactivate',7,'Half Kneeling','Hip Flexor Stretch with Core Activation'),
-- Level 8 Open Half Kneeling — Reactivate
('aslr','Reactivate',8,'Open Half Kneeling','Get-up High Pelvis to Bend with KB'),
-- Level 9 Split Stance — Reinforce
('aslr','Reinforce',9,'Split Stance','Split Squat Assisted with FMT'),
('aslr','Reinforce',9,'Split Stance','Split Squat Double Arm Down with Two DB'),
('aslr','Reinforce',9,'Split Stance','Split Stance Chop with Cable Bar'),
('aslr','Reinforce',9,'Split Stance','Split Stance Chop with FMT'),
-- Level 10 Single Leg Supported — Reinforce
('aslr','Reinforce',10,'Single Leg Supported','Single Leg Supported Single Arm Bicep Curl'),
-- Level 11 Single Leg — Reinforce
('aslr','Reinforce',11,'Single Leg','Deadlift Single Leg Assisted Valgus Correction with FMT'),
('aslr','Reinforce',11,'Single Leg','Deadlift Single Leg Double Arm with Two KB'),
('aslr','Reinforce',11,'Single Leg','Deadlift Single Leg RNT Rotation'),
('aslr','Reinforce',11,'Single Leg','Deadlift Single Leg Valgus Correction with FMT'),
('aslr','Reinforce',11,'Single Leg','Hip Hinge Assisted Single Leg with Cable Bar'),
('aslr','Reinforce',11,'Single Leg','Hip Hinge Single Leg with Dowel'),
('aslr','Reinforce',11,'Single Leg','Single Arm Single Leg Deadlift with Cable System'),
('aslr','Reinforce',11,'Single Leg','Single Leg Single Arm Bicep Curl'),
('aslr','Reinforce',11,'Single Leg','Single Leg Single Arm Curl to Press'),
('aslr','Reinforce',11,'Single Leg','Single Leg Single Arm Press'),
('aslr','Reinforce',11,'Single Leg','Step Up Single Arm Up with One DB'),
-- Level 12 Standing — Reinforce
('aslr','Reinforce',12,'Standing','Cable Bar Assisted Deadlift'),
('aslr','Reinforce',12,'Standing','Deadlift Single Leg Double Arm with Cable Bar'),
('aslr','Reinforce',12,'Standing','Deadlift Single Leg with Cable Bar'),
('aslr','Reinforce',12,'Standing','Forward Lunge with DB''s'),
('aslr','Reinforce',12,'Standing','Single Leg Deadlift Body Weight');
