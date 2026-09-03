-- Add new enum values for RAMP phases
ALTER TYPE corrective_phase ADD VALUE IF NOT EXISTS 'Raise';
ALTER TYPE corrective_phase ADD VALUE IF NOT EXISTS 'Activate';
ALTER TYPE corrective_phase ADD VALUE IF NOT EXISTS 'Potentiate';