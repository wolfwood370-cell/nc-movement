// Injury Risk Index + insight helpers
import type { FmsScores } from './fms';
import { computePatterns, computeTotal } from './fms';
import type { SfmaFormValues } from './sfma';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

export interface RiskResult {
  level: RiskLevel;
  label: string;
  detail: string;
  /** 0–100, higher = more risk (for gauge fill) */
  score: number;
  /** Human-readable clinical alerts explaining why the risk is elevated. */
  alerts: string[];
}

export interface FmsAssessmentRow extends Partial<FmsScores> {
  id: string;
  assessed_at: string;
  total_score: number | null;
  primary_corrective: string | null;
}

export interface YbtRow {
  id: string;
  assessed_at: string;
  anterior_left_cm: number | null;
  anterior_right_cm: number | null;
  posteromedial_left_cm: number | null;
  posteromedial_right_cm: number | null;
  posterolateral_left_cm: number | null;
  posterolateral_right_cm: number | null;
}

const diff = (a: number | null, b: number | null) =>
  a !== null && b !== null ? Math.abs(a - b) : null;

export function ybtAnteriorAsymmetry(y?: YbtRow | null): number | null {
  if (!y) return null;
  return diff(y.anterior_left_cm, y.anterior_right_cm);
}

export interface ClinicalContext {
  hasPreviousInjury?: boolean | null;
}

export function computeRisk(
  latestFms?: FmsAssessmentRow | null,
  latestYbt?: YbtRow | null,
  latestSfma?: Partial<SfmaFormValues> | null,
  ctx: ClinicalContext = {},
): RiskResult {
  const alerts: string[] = [];

  // ---- Anamnesi: storia di infortuni precedenti -------------------------
  // Il pregresso è il #1 predittore di nuovo infortunio (Cook). Sempre attivo.
  if (ctx.hasPreviousInjury) {
    alerts.push('Storia di infortunio precedente (vedi note) — mantenere vigilanza elevata.');
  }

  // ---- SFMA pain (Top-Tier DP/FP) ----------------------------------------
  let sfmaPain = false;
  if (latestSfma) {
    const sfmaKeys: (keyof SfmaFormValues)[] = [
      'cervical_flexion','cervical_extension','cervical_rotation_l','cervical_rotation_r',
      'upper_extremity_pattern_1_l','upper_extremity_pattern_1_r',
      'upper_extremity_pattern_2_l','upper_extremity_pattern_2_r',
      'multi_segmental_flexion','multi_segmental_extension',
      'multi_segmental_rotation_l','multi_segmental_rotation_r',
      'single_leg_stance_l','single_leg_stance_r','arms_down_deep_squat',
    ];
    for (const k of sfmaKeys) {
      const v = latestSfma[k] as string | null | undefined;
      if (v === 'DP' || v === 'FP') {
        sfmaPain = true;
        alerts.push(`SFMA: dolore in ${humanSfma(k)} (${v})`);
      }
    }
  }

  if (!latestFms && !latestSfma && !latestYbt) {
    return { level: 'unknown', label: 'Nessun dato', detail: 'Nessuna valutazione registrata.', score: 0, alerts };
  }

  // ---- FMS analysis -------------------------------------------------------
  let total: number | null = null;
  let anyPain = false;
  let anyClearing = false;
  let asym = false;
  if (latestFms) {
    const scores = latestFms as FmsScores;
    const patterns = computePatterns(scores);
    total = computeTotal(patterns) ?? latestFms.total_score;
    anyPain = patterns.some(p => p.final === 0);
    anyClearing =
      !!scores.clearing_shoulder_pain ||
      !!scores.clearing_shoulder_left_pain ||
      !!scores.clearing_shoulder_right_pain ||
      !!scores.clearing_spinal_extension_pain ||
      !!scores.clearing_spinal_flexion_pain;
    asym = patterns.some(p => p.asymmetric);
    if (anyPain) alerts.push('FMS: pattern con punteggio 0 (dolore)');
    if (anyClearing) alerts.push('FMS: clearing test positivo');
    if (total !== null && total < 14) alerts.push(`FMS: punteggio totale ${total}/21 sotto soglia (14)`);
    if (asym) alerts.push('FMS: asimmetria destra/sinistra rilevata');
  }

  // ---- YBT anterior asymmetry --------------------------------------------
  const ant = ybtAnteriorAsymmetry(latestYbt);
  if (ant !== null && ant > 4) alerts.push(`YBT: asimmetria anteriore ${ant.toFixed(1)} cm (>4)`);

  // ---- Decision tree ------------------------------------------------------
  if (anyPain || anyClearing || sfmaPain) {
    return {
      level: 'critical',
      label: 'Rinvio Medico',
      detail: 'Dolore o test di esclusione positivo. Indicato approfondimento clinico.',
      score: 95,
      alerts,
    };
  }
  if ((total !== null && total < 14) || (ant !== null && ant > 4)) {
    return {
      level: 'high',
      label: 'Rischio Elevato',
      detail:
        total !== null && total < 14
          ? `Punteggio FMS ${total}/21 sotto soglia (14).`
          : `Asimmetria anteriore YBT ${ant?.toFixed(1)} cm (>4).`,
      score: 75,
      alerts,
    };
  }
  if (asym) {
    return {
      level: 'moderate',
      label: 'Rischio Moderato',
      detail: 'Presenti asimmetrie destra/sinistra: priorità ai correttivi unilaterali.',
      score: 50,
      alerts,
    };
  }
  if (!latestFms) {
    return { level: 'unknown', label: 'Dati parziali', detail: 'Esegui una FMS per calcolare l\'indice.', score: 0, alerts };
  }
  return {
    level: 'low',
    label: 'Rischio Basso',
    detail: 'Nessun dolore, nessuna asimmetria, FMS ≥ 14. Allena con fiducia.',
    score: 20,
    alerts,
  };
}

const SFMA_LABELS: Record<string, string> = {
  cervical_flexion: 'Flessione Cervicale',
  cervical_extension: 'Estensione Cervicale',
  cervical_rotation_l: 'Rotazione Cervicale Sx',
  cervical_rotation_r: 'Rotazione Cervicale Dx',
  upper_extremity_pattern_1_l: 'UE Pattern 1 Sx',
  upper_extremity_pattern_1_r: 'UE Pattern 1 Dx',
  upper_extremity_pattern_2_l: 'UE Pattern 2 Sx',
  upper_extremity_pattern_2_r: 'UE Pattern 2 Dx',
  multi_segmental_flexion: 'Flessione Multi-Segmentale',
  multi_segmental_extension: 'Estensione Multi-Segmentale',
  multi_segmental_rotation_l: 'Rotazione Multi-Segmentale Sx',
  multi_segmental_rotation_r: 'Rotazione Multi-Segmentale Dx',
  single_leg_stance_l: 'Single Leg Stance Sx',
  single_leg_stance_r: 'Single Leg Stance Dx',
  arms_down_deep_squat: 'Deep Squat (braccia basse)',
};
function humanSfma(k: string): string { return SFMA_LABELS[k] ?? k; }

export const riskTone: Record<RiskLevel, { bg: string; text: string; ring: string; chip: string }> = {
  critical: { bg: 'bg-pain', text: 'text-destructive-foreground', ring: 'ring-pain/40', chip: 'bg-pain text-destructive-foreground' },
  high:     { bg: 'bg-warning', text: 'text-warning-foreground', ring: 'ring-warning/40', chip: 'bg-warning text-warning-foreground' },
  moderate: { bg: 'bg-dysfunction', text: 'text-warning-foreground', ring: 'ring-dysfunction/40', chip: 'bg-dysfunction text-warning-foreground' },
  low:      { bg: 'bg-functional', text: 'text-success-foreground', ring: 'ring-functional/40', chip: 'bg-functional text-success-foreground' },
  unknown:  { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-border', chip: 'bg-muted text-muted-foreground' },
};

export function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

/** Sum of mobility (ASLR + SM) and stability (RS + TSPU) from a fms row. */
export function mobilityStability(s: Partial<FmsScores>) {
  const v = (n: unknown) => (typeof n === 'number' ? n : 0);
  const mobility = v(s.aslr_left) + v(s.aslr_right) + v(s.shoulder_mobility_left) + v(s.shoulder_mobility_right);
  const stability =
    v(s.rotary_stability_left) + v(s.rotary_stability_right) + v(s.trunk_stability_pushup_score) * 2;
  return { mobility, stability };
}
