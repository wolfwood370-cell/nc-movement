// Aggregates clinical "red flag" findings from FMS, SFMA, YBT and breakout
// outcomes into a structured report suitable for medical referral.

import {
  computePatterns, emptyFmsScores, clearingKeysFor,
  CLEARING_KEYS, CLEARING_TEST_LABEL,
  type FmsScores, type ClearingKey,
} from './fms';
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

/**
 * Stato di un test di esclusione sul referto.
 *  - 'positive'      dolore riferito durante l'esecuzione
 *  - 'negative'      test previsto dal protocollo, nessun dolore registrato
 *  - 'not-performed' test non previsto dal protocollo somministrato
 *
 * Solo 'positive' e' un reperto clinico: alimenta `hasFindings` ed e' l'unico che
 * corrisponde ai flag su cui si accendono i lock a valle. 'negative' e
 * 'not-performed' sono informativi e non accendono nulla.
 */
export type ReferralClearingStatus = 'positive' | 'negative' | 'not-performed';

export interface ReferralClearingFinding {
  test: string;
  status: ReferralClearingStatus;
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
  /** 'LQ' or 'UQ' — reach #1 is anterior (LQ) vs medial (UQ). */
  test_type?: string | null;
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
      // Skip clearing-forced zeros here: a positive clearing test is reported
      // once, accurately, in the dedicated "Test di Esclusione" block below.
      // Counting it here too would duplicate it and mislabel it as "dolore".
      if (p.final === 0 && !p.cleared) {
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

    // Side label so clearing-test laterality survives onto the referral.
    const sideTag = (l: boolean, r: boolean): string =>
      l && r ? ' (bilaterale)' : l ? ' (sinistro)' : r ? ' (destro)' : '';
    const shL = !!full.clearing_shoulder_left_pain;
    const shR = !!full.clearing_shoulder_right_pain;
    const akL = !!full.ankle_clearing_left_pain;
    const akR = !!full.ankle_clearing_right_pain;
    const clearingMap: Record<ClearingKey, { flag: boolean; side?: string }> = {
      shoulder_clearing: { flag: !!full.clearing_shoulder_pain || shL || shR, side: sideTag(shL, shR) },
      spinal_extension: { flag: !!full.clearing_spinal_extension_pain },
      spinal_flexion: { flag: !!full.clearing_spinal_flexion_pain },
      ankle_clearing: { flag: akL || akR, side: sideTag(akL, akR) },
    };
    // Il protocollo somministrato: stessa costante che filtra gli extra del wizard.
    const performed = new Set<ClearingKey>(clearingKeysFor(fms));

    // Elencando solo i positivi, il referto faceva concludere che gli altri fossero
    // negativi — e in una modificata due di essi non erano mai stati somministrati.
    // Ora escono tutti e quattro con lo stato reale.
    for (const key of CLEARING_KEYS) {
      const test = CLEARING_TEST_LABEL[key];
      const c = clearingMap[key];
      if (c.flag) {
        // Il dolore registrato viene PRIMA del protocollo, sempre. hasCriticalRedFlags
        // e' cieco al tipo di FMS: si accende su un flag true anche in una modificata.
        // Se qui il protocollo avesse la precedenza, una riga anomala verrebbe stampata
        // «non eseguito» mentre il cliente e' bloccato, e il referto negherebbe per
        // iscritto il motivo del blocco.
        clearingFindings.push({
          test,
          status: 'positive',
          description: `Test di esclusione positivo: ${test}${c.side ?? ''} — dolore riferito durante l’esecuzione.`,
        });
      } else if (performed.has(key)) {
        // Deliberatamente NON dice «eseguito»: il flag a false significa che nessuno
        // ha spuntato la casella, non che il test sia stato somministrato e sia
        // risultato negativo. Il referto dichiara cosa risulta agli atti, non cosa e'
        // stato fatto al paziente. Niente lateralita' qui: «(bilaterale)» accanto a un
        // negativo si leggerebbe come un reperto.
        clearingFindings.push({
          test,
          status: 'negative',
          description: `${test}: nessun dolore riferito agli atti.`,
        });
      } else {
        clearingFindings.push({
          test,
          status: 'not-performed',
          description: `${test}: non somministrato — non fa parte del protocollo di questa valutazione.`,
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
        // Reach #1 is the anterior reach for LQ but the MEDIAL reach for UQ —
        // and UQ asymmetry is an upper-limb (not lower-limb) risk factor.
        const uq = ybt.test_type === 'UQ';
        const reach = uq ? 'reach mediale' : 'reach anteriore';
        const limb = uq ? "dell'arto superiore" : "dell'arto inferiore";
        ybtFindings.push({
          asymmetryCm: asym,
          description: `Y-Balance Test: asimmetria del ${reach} di ${asym.toFixed(1)} cm (soglia clinica > ${ANTERIOR_ASYMMETRY_THRESHOLD_CM} cm) — fattore di rischio per lesioni ${limb}.`,
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
      if (!meta) continue; // skip unknown/legacy diagnosis codes (don't crash the referral)
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

  // ATTENZIONE a chi aggiunge blocchi qui: `clearing` ora contiene SEMPRE quattro
  // voci, perche' elenca anche i negativi e i non eseguiti. Contarle tutte
  // renderebbe `hasFindings` sempre vero appena esiste una FMS, e il referto
  // chiederebbe una valutazione specialistica a chiunque. Solo i positivi sono
  // reperti: con questo filtro `hasFindings` vale esattamente quanto valeva prima.
  const clearingPositives = clearingFindings.filter(c => c.status === 'positive');
  const hasFindings =
    fmsFindings.length + clearingPositives.length + ybtFindings.length +
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
