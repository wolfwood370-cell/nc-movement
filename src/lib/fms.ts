// FMS scoring & Cook's Corrective Algorithm

export type Score = 0 | 1 | 2 | 3 | null;

export interface FmsScores {
  deep_squat_score: Score;
  tibia_length_cm: number | null;
  hurdle_step_left: Score; hurdle_step_right: Score;
  inline_lunge_left: Score; inline_lunge_right: Score;
  ankle_clearing_left_pain: boolean;
  ankle_clearing_right_pain: boolean;
  shoulder_mobility_left: Score; shoulder_mobility_right: Score;
  hand_length_cm: number | null;
  aslr_left: Score; aslr_right: Score;
  trunk_stability_pushup_score: Score;
  rotary_stability_left: Score; rotary_stability_right: Score;
  clearing_shoulder_pain: boolean;
  clearing_shoulder_left_pain: boolean;
  clearing_shoulder_right_pain: boolean;
  clearing_spinal_extension_pain: boolean;
  clearing_spinal_flexion_pain: boolean;
}

export const emptyFmsScores = (): FmsScores => ({
  deep_squat_score: null,
  tibia_length_cm: null,
  hurdle_step_left: null, hurdle_step_right: null,
  inline_lunge_left: null, inline_lunge_right: null,
  ankle_clearing_left_pain: false,
  ankle_clearing_right_pain: false,
  shoulder_mobility_left: null, shoulder_mobility_right: null,
  hand_length_cm: null,
  aslr_left: null, aslr_right: null,
  trunk_stability_pushup_score: null,
  rotary_stability_left: null, rotary_stability_right: null,
  clearing_shoulder_pain: false,
  clearing_spinal_extension_pain: false,
  clearing_spinal_flexion_pain: false,
});

export interface PatternResult {
  key: string;
  label: string;
  bilateral: boolean;
  left: Score;
  right: Score;
  final: Score; // lowest of L/R, or unilateral score
  asymmetric: boolean;
  cleared: boolean; // forced to 0 by clearing test
}

/**
 * Apply clearing tests: positive (+) pain forces the associated pattern score to 0.
 * - Shoulder pain  -> Shoulder Mobility = 0
 * - Spinal extension pain -> Trunk Stability Push-Up = 0
 * - Spinal flexion pain   -> Rotary Stability = 0
 * Ankle clearing is informational only (does not alter scores).
 */
export function computePatterns(s: FmsScores): PatternResult[] {
  const lowest = (l: Score, r: Score): Score => {
    if (l === null || r === null) return null;
    return (Math.min(l, r) as Score);
  };
  const sm_l: Score = s.clearing_shoulder_pain ? 0 : s.shoulder_mobility_left;
  const sm_r: Score = s.clearing_shoulder_pain ? 0 : s.shoulder_mobility_right;
  const tspu: Score = s.clearing_spinal_extension_pain ? 0 : s.trunk_stability_pushup_score;
  const rs_l: Score = s.clearing_spinal_flexion_pain ? 0 : s.rotary_stability_left;
  const rs_r: Score = s.clearing_spinal_flexion_pain ? 0 : s.rotary_stability_right;

  return [
    { key: 'deep_squat', label: 'Deep Squat', bilateral: false,
      left: s.deep_squat_score, right: s.deep_squat_score,
      final: s.deep_squat_score, asymmetric: false, cleared: false },
    { key: 'hurdle_step', label: 'Hurdle Step', bilateral: true,
      left: s.hurdle_step_left, right: s.hurdle_step_right,
      final: lowest(s.hurdle_step_left, s.hurdle_step_right),
      asymmetric: s.hurdle_step_left !== null && s.hurdle_step_right !== null && s.hurdle_step_left !== s.hurdle_step_right,
      cleared: false },
    { key: 'inline_lunge', label: 'Inline Lunge', bilateral: true,
      left: s.inline_lunge_left, right: s.inline_lunge_right,
      final: lowest(s.inline_lunge_left, s.inline_lunge_right),
      asymmetric: s.inline_lunge_left !== null && s.inline_lunge_right !== null && s.inline_lunge_left !== s.inline_lunge_right,
      cleared: false },
    { key: 'shoulder_mobility', label: 'Shoulder Mobility', bilateral: true,
      left: sm_l, right: sm_r,
      final: lowest(sm_l, sm_r),
      asymmetric: sm_l !== null && sm_r !== null && sm_l !== sm_r,
      cleared: s.clearing_shoulder_pain },
    { key: 'aslr', label: 'Active Straight-Leg Raise', bilateral: true,
      left: s.aslr_left, right: s.aslr_right,
      final: lowest(s.aslr_left, s.aslr_right),
      asymmetric: s.aslr_left !== null && s.aslr_right !== null && s.aslr_left !== s.aslr_right,
      cleared: false },
    { key: 'trunk_stability_pushup', label: 'Trunk Stability Push-Up', bilateral: false,
      left: tspu, right: tspu, final: tspu, asymmetric: false,
      cleared: s.clearing_spinal_extension_pain },
    { key: 'rotary_stability', label: 'Rotary Stability', bilateral: true,
      left: rs_l, right: rs_r,
      final: lowest(rs_l, rs_r),
      asymmetric: rs_l !== null && rs_r !== null && rs_l !== rs_r,
      cleared: s.clearing_spinal_flexion_pain },
  ];
}

export function computeTotal(patterns: PatternResult[]): number | null {
  if (patterns.some(p => p.final === null)) return null;
  return patterns.reduce((sum, p) => sum + (p.final as number), 0);
}

/**
 * Cook's Corrective Algorithm hierarchy:
 *  1. Mobility       — ASLR or Shoulder Mobility = 1
 *  2. Motor Control  — Rotary Stability or Trunk Stability Push-Up = 1
 *  3. Functional     — Inline Lunge, Hurdle Step, or Deep Squat = 1
 * If any final score = 0 (pain), that takes absolute priority.
 */
export function primaryCorrective(patterns: PatternResult[]): {
  level: 'pain' | 'mobility' | 'motor_control' | 'functional' | 'clear' | 'incomplete';
  label: string;
  detail: string;
} {
  if (patterns.some(p => p.final === null)) {
    return { level: 'incomplete', label: 'Incompleto', detail: 'Assegna un punteggio a ogni pattern per generare il focus correttivo.' };
  }
  const painful = patterns.filter(p => p.final === 0);
  if (painful.length) {
    return {
      level: 'pain',
      label: 'Riferire / Gestire il Dolore',
      detail: `Dolore rilevato in: ${painful.map(p => p.label).join(', ')}. Trattare il dolore prima di progredire nella gerarchia correttiva.`,
    };
  }
  const at = (key: string) => patterns.find(p => p.key === key)!;
  const mobility = [at('aslr'), at('shoulder_mobility')].filter(p => p.final === 1);
  if (mobility.length) {
    return {
      level: 'mobility',
      label: 'Mobilità',
      detail: `Priorità ai correttivi di mobilità per: ${mobility.map(p => p.label).join(', ')}.`,
    };
  }
  const motor = [at('rotary_stability'), at('trunk_stability_pushup')].filter(p => p.final === 1);
  if (motor.length) {
    return {
      level: 'motor_control',
      label: 'Controllo Motorio / Stabilità',
      detail: `Priorità ai correttivi di stabilità per: ${motor.map(p => p.label).join(', ')}.`,
    };
  }
  const fn = [at('inline_lunge'), at('hurdle_step'), at('deep_squat')].filter(p => p.final === 1);
  if (fn.length) {
    return {
      level: 'functional',
      label: 'Ri-pattern Funzionale',
      detail: `Ri-pattern: ${fn.map(p => p.label).join(', ')}.`,
    };
  }
  return { level: 'clear', label: 'Nessuna Limitazione', detail: 'Tutti i pattern ≥ 2. Allenare con fiducia.' };
}

/**
 * Color tokens per score:
 *  0 = rosso (pain), 1 = giallo (warning), 2 = arancione (dysfunction), 3 = verde (functional)
 */
export const scoreColor = (s: Score): string => {
  if (s === null) return 'bg-muted text-muted-foreground';
  if (s === 0) return 'bg-pain text-destructive-foreground';
  if (s === 1) return 'bg-dysfunction text-warning-foreground';
  if (s === 2) return 'bg-warning text-warning-foreground';
  return 'bg-functional text-success-foreground';
};
