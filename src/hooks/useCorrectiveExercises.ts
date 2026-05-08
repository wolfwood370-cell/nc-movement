import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FmsScores } from '@/lib/fms';
import { getCorrectivePriority, computePatterns } from '@/lib/fms';

export type CorrectivePhase = 'Reset' | 'Reactivate' | 'Reinforce';

export interface ExerciseRow {
  id: string;
  pattern: string;
  phase: CorrectivePhase;
  posture_level: number;
  posture_name: string;
  name: string;
  goal: string | null;
  dose: string | null;
  video_url?: string | null;
  progression?: string | null;
  regression?: string | null;
  default_sets?: string | null;
  default_reps_time?: string | null;
  ramp_category?: string | null;
  workout_target?: string | null;
}

export type SeverityBand = 'severe' | 'moderate' | 'none';

/**
 * Neurodevelopmental phase → posture-level bands
 *   Reset       → 1..3  (Supine, Prone, Side Lying)
 *   Reactivate  → 4..8  (Quadruped → Open Half Kneeling)
 *   Reinforce   → 9..12 (Split Stance → Standing)
 */
const PHASE_BANDS: Record<CorrectivePhase, [number, number]> = {
  Reset:      [1, 3],
  Reactivate: [4, 8],
  Reinforce:  [9, 12],
};

function detectSeverity(scores: Partial<FmsScores>, patternKey: string): SeverityBand {
  if (!patternKey || patternKey === 'none' || patternKey === 'pain') {
    return patternKey === 'pain' ? 'severe' : 'none';
  }
  const patterns = computePatterns({ ...(scores as FmsScores) });
  const p = patterns.find(pp => pp.key === patternKey);
  if (!p) return 'none';
  if (p.final === 0 || p.final === 1) return 'severe';
  if (p.final === 2) return 'moderate';
  return 'none';
}

interface Result {
  loading: boolean;
  exercises: Partial<Record<CorrectivePhase, ExerciseRow>>;
  severity: SeverityBand;
  postureRange: [number, number] | null;
}

/**
 * Fetches one exercise per phase from the dynamic library.
 * Severe scores bias selection toward the lower end of each phase band
 * (more regressed); moderate scores allow the full band. One exercise
 * per phase is randomly selected so prescriptions vary visit-to-visit.
 */
export function useCorrectiveExercises(scores: Partial<FmsScores> | null | undefined): Result {
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Result['exercises']>({});
  const [severity, setSeverity] = useState<SeverityBand>('none');
  const [postureRange, setPostureRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setExercises({});
      setPostureRange(null);
      if (!scores) { setSeverity('none'); return; }
      const priority = getCorrectivePriority(scores as FmsScores);
      const patternKey = priority.patternKey;
      const sev = detectSeverity(scores, patternKey);
      setSeverity(sev);
      if (sev === 'none' || patternKey === 'none' || patternKey === 'pain') return;

      // Overall posture range surfaced in UI (full clinical span).
      setPostureRange([1, 12]);

      setLoading(true);
      const { data, error } = await supabase
        .from('exercises_library')
        .select('*')
        .eq('pattern', patternKey)
        .order('posture_level', { ascending: true });
      setLoading(false);
      if (cancelled || error || !data) return;

      const rows = data as ExerciseRow[];
      const byPhase: Result['exercises'] = {};

      (Object.keys(PHASE_BANDS) as CorrectivePhase[]).forEach(phase => {
        const [lo, hi] = PHASE_BANDS[phase];
        // For severe cases, bias to the lower half of the band.
        const cap = sev === 'severe' ? Math.max(lo, Math.floor((lo + hi) / 2)) : hi;
        let pool = rows.filter(r =>
          r.phase === phase && r.posture_level >= lo && r.posture_level <= cap,
        );
        // Fallback: if biased pool is empty, take the full band.
        if (pool.length === 0) {
          pool = rows.filter(r => r.phase === phase && r.posture_level >= lo && r.posture_level <= hi);
        }
        if (pool.length > 0) {
          byPhase[phase] = pool[Math.floor(Math.random() * pool.length)];
        }
      });

      setExercises(byPhase);
    }
    run();
    return () => { cancelled = true; };
  }, [scores]);

  return { loading, exercises, severity, postureRange };
}
