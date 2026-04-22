import { z } from 'zod';

export const SFMA_SCORES = ['FN', 'DN', 'FP', 'DP'] as const;
export type SfmaScore = (typeof SFMA_SCORES)[number];

export const SFMA_PATTERNS = [
  { key: 'cervical_flexion', label: 'Cervical Flexion', breakout: 'Cervical Flexion Breakout' },
  { key: 'cervical_extension', label: 'Cervical Extension', breakout: 'Cervical Extension Breakout' },
  { key: 'cervical_rotation_l', label: 'Cervical Rotation — Sinistro', breakout: 'Cervical Rotation Breakout (Sx)' },
  { key: 'cervical_rotation_r', label: 'Cervical Rotation — Destro', breakout: 'Cervical Rotation Breakout (Dx)' },
  { key: 'upper_extremity_pattern_1_l', label: 'UE Pattern 1 (MRE) — Sinistro', breakout: 'UE Pattern 1 Breakout (Sx)' },
  { key: 'upper_extremity_pattern_1_r', label: 'UE Pattern 1 (MRE) — Destro', breakout: 'UE Pattern 1 Breakout (Dx)' },
  { key: 'upper_extremity_pattern_2_l', label: 'UE Pattern 2 (LRA) — Sinistro', breakout: 'UE Pattern 2 Breakout (Sx)' },
  { key: 'upper_extremity_pattern_2_r', label: 'UE Pattern 2 (LRA) — Destro', breakout: 'UE Pattern 2 Breakout (Dx)' },
  { key: 'multi_segmental_flexion', label: 'Multi-Segmental Flexion', breakout: 'MSF Breakout' },
  { key: 'multi_segmental_extension', label: 'Multi-Segmental Extension', breakout: 'MSE Breakout' },
  { key: 'multi_segmental_rotation_l', label: 'Multi-Segmental Rotation — Sinistro', breakout: 'MSR Breakout (Sx)' },
  { key: 'multi_segmental_rotation_r', label: 'Multi-Segmental Rotation — Destro', breakout: 'MSR Breakout (Dx)' },
  { key: 'single_leg_stance_l', label: 'Single Leg Stance — Sinistro', breakout: 'SLS Breakout (Sx)' },
  { key: 'single_leg_stance_r', label: 'Single Leg Stance — Destro', breakout: 'SLS Breakout (Dx)' },
  { key: 'arms_down_deep_squat', label: 'Arms-Down Deep Squat', breakout: 'Deep Squat Breakout' },
] as const;

export type SfmaPatternKey = (typeof SFMA_PATTERNS)[number]['key'];

const scoreField = z.enum(SFMA_SCORES).nullable();

export const sfmaSchema = z.object({
  cervical_flexion: scoreField,
  cervical_extension: scoreField,
  cervical_rotation_r: scoreField,
  cervical_rotation_l: scoreField,
  upper_extremity_pattern_1_r: scoreField,
  upper_extremity_pattern_1_l: scoreField,
  upper_extremity_pattern_2_r: scoreField,
  upper_extremity_pattern_2_l: scoreField,
  multi_segmental_flexion: scoreField,
  multi_segmental_extension: scoreField,
  multi_segmental_rotation_r: scoreField,
  multi_segmental_rotation_l: scoreField,
  single_leg_stance_r: scoreField,
  single_leg_stance_l: scoreField,
  arms_down_deep_squat: scoreField,
  clinical_notes: z.string().nullable().optional(),
});

export type SfmaFormValues = z.infer<typeof sfmaSchema>;

export const SFMA_DEFAULTS: SfmaFormValues = {
  cervical_flexion: null,
  cervical_extension: null,
  cervical_rotation_r: null,
  cervical_rotation_l: null,
  upper_extremity_pattern_1_r: null,
  upper_extremity_pattern_1_l: null,
  upper_extremity_pattern_2_r: null,
  upper_extremity_pattern_2_l: null,
  multi_segmental_flexion: null,
  multi_segmental_extension: null,
  multi_segmental_rotation_r: null,
  multi_segmental_rotation_l: null,
  single_leg_stance_r: null,
  single_leg_stance_l: null,
  arms_down_deep_squat: null,
  clinical_notes: '',
};

// Visual config for each score: hsl semantic tokens from design system
export const SFMA_SCORE_CONFIG: Record<SfmaScore, { label: string; full: string; tone: string }> = {
  FN: { label: 'FN', full: 'Functional Non-Painful', tone: 'fn' },
  DN: { label: 'DN', full: 'Dysfunctional Non-Painful', tone: 'dn' },
  FP: { label: 'FP', full: 'Functional Painful', tone: 'fp' },
  DP: { label: 'DP', full: 'Dysfunctional Painful', tone: 'dp' },
};

export interface SfmaAnalysis {
  hasPain: boolean;
  painPatterns: { key: SfmaPatternKey; label: string; score: SfmaScore }[];
  breakouts: { key: SfmaPatternKey; label: string; breakout: string; score: SfmaScore }[];
  completed: number;
  total: number;
}

export function analyzeSfma(values: Partial<SfmaFormValues>): SfmaAnalysis {
  const painPatterns: SfmaAnalysis['painPatterns'] = [];
  const breakouts: SfmaAnalysis['breakouts'] = [];
  let completed = 0;

  for (const p of SFMA_PATTERNS) {
    const score = values[p.key] as SfmaScore | null | undefined;
    if (!score) continue;
    completed++;
    if (score === 'FP' || score === 'DP') {
      painPatterns.push({ key: p.key, label: p.label, score });
    }
    // Any non-FN pattern triggers a breakout per SFMA methodology
    if (score !== 'FN') {
      breakouts.push({ key: p.key, label: p.label, breakout: p.breakout, score });
    }
  }

  return {
    hasPain: painPatterns.length > 0,
    painPatterns,
    breakouts,
    completed,
    total: SFMA_PATTERNS.length,
  };
}
