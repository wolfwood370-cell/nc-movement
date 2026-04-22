// Aggregates clinical "red flag" findings from FMS, SFMA, YBT and breakout
// outcomes into a structured report suitable for medical referral.

import { computePatterns, emptyFmsScores, type FmsScores } from './fms';
import type { SfmaFormValues, SfmaPatternKey, SfmaScore } from './sfma';
import { SFMA_PATTERNS } from './sfma';
import {
  parseBreakoutResults,
  DIAGNOSIS_META,
  type BreakoutDiagnosis,
  type BreakoutResults,
} from './breakouts';
import { ANTERIOR_ASYMMETRY_THRESHOLD_CM } from './ybt';

export interface ReferralFmsFinding {
  pattern: string;
  side?: 'left' | 'right' | 'bilateral';
  description: string;
}

export interface ReferralClearingFinding {
  test: string;
  description: string;
}

export interface ReferralYbtFinding {
  asymmetryCm: number;
  description: string;
}

export interface ReferralSfmaFinding {
  pattern: string;
  score: SfmaScore;
  description: string;
}

export interface ReferralBreakoutFinding {
  pattern: string;
  diagnosis: BreakoutDiagnosis;
  full: string;
  qualifier?: string;
  detail?: string;
}

export interface MedicalReferralData {
  hasFindings: boolean;
  fms: ReferralFmsFinding[];
  clearing: ReferralClearingFinding[];
  ybt: ReferralYbtFinding[];
  sfma: ReferralSfmaFinding[];
  breakouts: ReferralBreakoutFinding[];
  /** ISO date of the most recent contributing assessment, if any. */
  lastAssessedAt: string | null;
}

interface FmsRow extends Partial<FmsScores> {
  assessed_at?: string;
}

interface YbtRow {
  assessed_at?: string;
  anterior_left_cm: number | null;
  anterior_right_cm: number | null;
}

interface SfmaRow extends Partial<SfmaFormValues> {
  assessed_at?: string;
  breakout_results?: unknown;
}

const SFMA_LABEL: Record<SfmaPatternKey, string> = SFMA_PATTERNS.reduce((acc, p) => {
  acc[p.key] = p.label;
  return acc;
}, {} as Record<SfmaPatternKey, string>);

export function buildReferralData(
  fms: FmsRow | null | undefined,
  ybt: YbtRow | null | undefined,
  sfma: SfmaRow | null | undefined,
): MedicalReferralData {
  const fmsFindings: ReferralFmsFinding[] = [];
  const clearingFindings: ReferralClearingFinding[] = [];
  const ybtFindings: ReferralYbtFinding[] = [];
  const sfmaFindings: ReferralSfmaFinding[] = [];
  const breakoutFindings: ReferralBreakoutFinding[] = [];
  let lastAssessedAt: string | null = null;

  const trackDate = (d?: string) => {
    if (!d) return;
    if (!lastAssessedAt || new Date(d) > new Date(lastAssessedAt)) lastAssessedAt = d;
  };

  // ---- FMS -----------------------------------------------------------------
  if (fms) {
    trackDate(fms.assessed_at);
    const full = { ...emptyFmsScores(), ...fms } as FmsScores;
    const patterns = computePatterns(full);

    for (const p of patterns) {
      if (p.final === 0) {
        const side: ReferralFmsFinding['side'] = !p.bilateral
          ? 'bilateral'
          : p.left === 0 && p.right === 0
            ? 'bilateral'
            : p.left === 0 ? 'left' : 'right';
        fmsFindings.push({
          pattern: p.label,
          side,
          description: `Punteggio 0 (dolore) in ${p.label}${p.bilateral ? ` — lato ${sideIt(side)}` : ''}.`,
        });
      }
    }

    const clearingMap: { flag: boolean; test: string }[] = [
      { flag: !!full.clearing_shoulder_pain || !!full.clearing_shoulder_left_pain || !!full.clearing_shoulder_right_pain, test: 'Shoulder Clearing' },
      { flag: !!full.clearing_spinal_extension_pain, test: 'Spinal Extension Clearing' },
      { flag: !!full.clearing_spinal_flexion_pain, test: 'Spinal Flexion Clearing' },
      { flag: !!full.ankle_clearing_left_pain || !!full.ankle_clearing_right_pain, test: 'Ankle Clearing' },
    ];
    for (const c of clearingMap) {
      if (c.flag) {
        clearingFindings.push({
          test: c.test,
          description: `Test di esclusione positivo: ${c.test} — dolore riferito durante l’esecuzione.`,
        });
      }
    }
  }

  // ---- YBT -----------------------------------------------------------------
  if (ybt) {
    trackDate(ybt.assessed_at);
    if (ybt.anterior_left_cm != null && ybt.anterior_right_cm != null) {
      const asym = Math.abs(ybt.anterior_left_cm - ybt.anterior_right_cm);
      if (asym > ANTERIOR_ASYMMETRY_THRESHOLD_CM) {
        ybtFindings.push({
          asymmetryCm: asym,
          description: `Y-Balance Test: asimmetria del reach anteriore di ${asym.toFixed(1)} cm (soglia clinica > ${ANTERIOR_ASYMMETRY_THRESHOLD_CM} cm) — fattore di rischio per lesioni dell'arto inferiore.`,
        });
      }
    }
  }

  // ---- SFMA Top-Tier -------------------------------------------------------
  if (sfma) {
    trackDate(sfma.assessed_at);
    for (const p of SFMA_PATTERNS) {
      const score = sfma[p.key as keyof SfmaFormValues] as SfmaScore | null | undefined;
      if (score === 'DP' || score === 'FP') {
        sfmaFindings.push({
          pattern: p.label,
          score,
          description: `SFMA ${p.label}: pattern ${score === 'DP' ? 'disfunzionale e doloroso (DP)' : 'funzionale ma doloroso (FP)'}.`,
        });
      }
    }

    // ---- Breakout diagnoses ------------------------------------------------
    const results: BreakoutResults = parseBreakoutResults(sfma.breakout_results);
    for (const [key, outcome] of Object.entries(results)) {
      if (!outcome) continue;
      const meta = DIAGNOSIS_META[outcome.diagnosis];
      const patternLabel = SFMA_LABEL[key as SfmaPatternKey] ?? key;
      breakoutFindings.push({
        pattern: patternLabel,
        diagnosis: outcome.diagnosis,
        full: meta.full,
        qualifier: outcome.qualifier,
        detail: outcome.detail,
      });
    }
  }

  const hasFindings =
    fmsFindings.length + clearingFindings.length + ybtFindings.length +
    sfmaFindings.length + breakoutFindings.length > 0;

  return {
    hasFindings,
    fms: fmsFindings,
    clearing: clearingFindings,
    ybt: ybtFindings,
    sfma: sfmaFindings,
    breakouts: breakoutFindings,
    lastAssessedAt,
  };
}

function sideIt(side: ReferralFmsFinding['side']): string {
  if (side === 'left') return 'sinistro';
  if (side === 'right') return 'destro';
  return 'bilaterale';
}
