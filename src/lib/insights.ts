// Injury Risk Index + insight helpers
import type { FmsScores } from './fms';
import { computePatterns, computeTotal } from './fms';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

export interface RiskResult {
  level: RiskLevel;
  label: string;
  detail: string;
  /** 0–100, higher = more risk (for gauge fill) */
  score: number;
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

export function computeRisk(latestFms?: FmsAssessmentRow | null, latestYbt?: YbtRow | null): RiskResult {
  if (!latestFms) {
    return { level: 'unknown', label: 'Nessun dato', detail: 'Nessuna valutazione registrata.', score: 0 };
  }
  const scores = latestFms as FmsScores;
  const patterns = computePatterns(scores);
  const total = computeTotal(patterns) ?? latestFms.total_score;

  // CRITICAL: any 0 or any clearing test positive
  const anyPain = patterns.some(p => p.final === 0);
  const anyClearing =
    !!scores.clearing_shoulder_pain ||
    !!scores.clearing_spinal_extension_pain ||
    !!scores.clearing_spinal_flexion_pain;
  if (anyPain || anyClearing) {
    return {
      level: 'critical',
      label: 'Rinvio Medico (SFMA)',
      detail: 'Dolore o test di esclusione positivo. Indicato approfondimento clinico.',
      score: 95,
    };
  }

  const ant = ybtAnteriorAsymmetry(latestYbt);
  if ((total !== null && total < 14) || (ant !== null && ant > 4)) {
    return {
      level: 'high',
      label: 'Rischio Elevato',
      detail:
        total !== null && total < 14
          ? `Punteggio FMS ${total}/21 sotto soglia (14).`
          : `Asimmetria anteriore YBT ${ant?.toFixed(1)} cm (>4).`,
      score: 75,
    };
  }

  const asym = patterns.some(p => p.asymmetric);
  if (asym) {
    return {
      level: 'moderate',
      label: 'Rischio Moderato',
      detail: 'Presenti asimmetrie destra/sinistra: priorità ai correttivi unilaterali.',
      score: 50,
    };
  }

  return {
    level: 'low',
    label: 'Rischio Basso',
    detail: 'Nessun dolore, nessuna asimmetria, FMS ≥ 14. Allena con fiducia.',
    score: 20,
  };
}

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
