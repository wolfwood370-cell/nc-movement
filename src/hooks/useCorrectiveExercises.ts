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
}

export type SeverityBand = 'severe' | 'moderate' | 'none';

/**
 * Severity rule:
 * - score === 1 (or 0 / red flag) → severe → unloaded ground-based postures (1..5)
 * - score === 2 with asymmetry    → moderate → loaded standing/split (6..12)
 * - everything else               → none (no prescription needed)
 */
function detectSeverity(scores: Partial<FmsScores>, patternKey: string): SeverityBand {
  if (!patternKey || patternKey === 'none' || patternKey === 'pain') {
    return patternKey === 'pain' ? 'severe' : 'none';
  }
  const patterns = computePatterns({ ...(scores as FmsScores) });
  const p = patterns.find(pp => pp.key === patternKey);
  if (!p) return 'none';
  if (p.final === 0 || p.final === 1) return 'severe';
  if (p.final === 2 && p.asymmetric) return 'moderate';
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
 * Fetches one exercise per phase (Reset / Reactivate / Reinforce) from the
 * dynamic library, filtering by the severity-derived posture range.
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
      if (sev === 'none' || patternKey === 'none') return;
      const range: [number, number] = sev === 'severe' ? [1, 5] : [6, 12];
      setPostureRange(range);

      setLoading(true);
      const { data, error } = await supabase
        .from('exercises_library')
        .select('*')
        .eq('pattern', patternKey)
        .gte('posture_level', range[0])
        .lte('posture_level', range[1])
        .order('posture_level', { ascending: true });
      setLoading(false);
      if (cancelled || error || !data) return;

      // Pick one exercise per phase, lowest posture_level first within the band.
      const byPhase: Result['exercises'] = {};
      for (const row of data as ExerciseRow[]) {
        if (!byPhase[row.phase]) byPhase[row.phase] = row;
      }
      setExercises(byPhase);
    }
    run();
    return () => { cancelled = true; };
  }, [scores]);

  return { loading, exercises, severity, postureRange };
}
