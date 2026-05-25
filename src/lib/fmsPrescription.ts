// =====================================================================
// FMS Prescription Engine
// ---------------------------------------------------------------------
// Pure, framework-agnostic mapping layer between an FMS assessment row
// and the constraints the PT Pack generator must respect.
//
//   Score 0  → red flag / pain  → handled upstream (red-flag locks the
//              entire PT Pack flow). Treated here as 'corrective' tier.
//   Score 1  → corrective: regress complexity, mobility/stability biased,
//              and FORCES 2 warm-up exercises for that pattern.
//   Score 2  → integration: pattern integration + moderate progressive
//              loading.
//   Score 3  → performance: complex / dynamic loading.
//
// Each of the 3 PT Pack sessions has a fixed clinical focus and reads
// from a deterministic subset of FMS patterns:
//
//   Sessione A → Squat / Hinge   ← Deep Squat + ASLR
//   Sessione B → Push / Pull     ← Trunk Stability Push-Up + Shoulder Mobility
//   Sessione C → Rotary / Dynamic← Rotary Stability + Inline Lunge
//
// =====================================================================
import type { FmsScores, Score, PatternResult } from '@/lib/fms';
import { computePatterns } from '@/lib/fms';

export type PrescriptionTier = 'corrective' | 'integration' | 'performance';

export type SessionLetter = 'A' | 'B' | 'C';

export interface SessionFocusDef {
  letter: SessionLetter;
  title: string;          // "Squat / Hinge"
  workout_target: 'Lower Body' | 'Upper Body' | 'Full Body';
  patternKeys: string[];  // FMS pattern keys that drive prescription
}

export const SESSION_FOCUS: Record<SessionLetter, SessionFocusDef> = {
  A: { letter: 'A', title: 'Squat / Hinge',     workout_target: 'Lower Body', patternKeys: ['deep_squat', 'aslr'] },
  B: { letter: 'B', title: 'Push / Pull',       workout_target: 'Upper Body', patternKeys: ['trunk_stability_pushup', 'shoulder_mobility'] },
  C: { letter: 'C', title: 'Rotary / Dynamic',  workout_target: 'Full Body',  patternKeys: ['rotary_stability', 'inline_lunge'] },
};

/** ramp_category pool by tier — derived from the exercise library taxonomy. */
export const TIER_RAMP_CATEGORIES: Record<PrescriptionTier, string[]> = {
  corrective:   ['B', 'C'],           // low complexity, propedeutico
  integration:  ['C', 'D'],           // pattern integration, carico moderato
  performance:  ['D', 'E'],           // complex / dynamic loading
};

/** Map a single pattern score to its prescriptive tier. */
export function tierForScore(score: Score | undefined | null): PrescriptionTier {
  if (score === null || score === undefined) return 'integration'; // unknown → safe default
  if (score <= 1) return 'corrective';
  if (score === 2) return 'integration';
  return 'performance';
}

export interface PatternPrescription {
  key: string;
  label: string;
  score: Score;
  tier: PrescriptionTier;
  side: 'left' | 'right' | 'bilateral' | 'none';
  asymmetric: boolean;
  /** True if this pattern triggers the forced 2-exercise warm-up rule. */
  warmupRequired: boolean;
}

function describeSide(p: PatternResult): 'left' | 'right' | 'bilateral' | 'none' {
  if (!p.bilateral) return 'none';
  if (p.left === null || p.right === null) return 'bilateral';
  if (p.left === p.right) return 'bilateral';
  return p.left < p.right ? 'left' : 'right';
}

export interface FmsProfile {
  patterns: Record<string, PatternPrescription>;
  /** Pattern keys (across the whole FMS) requiring forced warm-up. */
  warmupPatterns: string[];
}

/**
 * Build a complete prescription profile from an FMS assessment row.
 * Patterns missing from a Modified FMS are simply absent from the map;
 * downstream code falls back to 'integration' tier in that case.
 */
export function buildFmsProfile(scores: FmsScores | null | undefined): FmsProfile {
  if (!scores) return { patterns: {}, warmupPatterns: [] };
  const patterns = computePatterns(scores);
  const map: Record<string, PatternPrescription> = {};
  const warmup: string[] = [];
  for (const p of patterns) {
    if (p.final === null || p.final === undefined) continue;
    const tier = tierForScore(p.final);
    const warmupRequired = p.final !== null && p.final <= 1;
    map[p.key] = {
      key: p.key,
      label: p.label,
      score: p.final,
      tier,
      side: describeSide(p),
      asymmetric: p.asymmetric,
      warmupRequired,
    };
    if (warmupRequired) warmup.push(p.key);
  }
  return { patterns: map, warmupPatterns: warmup };
}

export interface SessionPrescription {
  focus: SessionFocusDef;
  /** The most limiting tier across the session's relevant patterns. */
  tier: PrescriptionTier;
  /** Patterns the session reads from, with their individual prescriptions. */
  drivingPatterns: PatternPrescription[];
  /** Pattern keys (subset of drivingPatterns) that force a warm-up. */
  warmupPatterns: string[];
  /** Coach-facing rationale for the session-level prescription. */
  rationale: string;
}

const TIER_ORDER: PrescriptionTier[] = ['corrective', 'integration', 'performance'];

/**
 * Derive the tier + warm-up plan for a single PT Pack session by inspecting
 * only the patterns clinically relevant to that session's focus.
 */
export function getSessionPrescription(letter: SessionLetter, profile: FmsProfile): SessionPrescription {
  const focus = SESSION_FOCUS[letter];
  const driving = focus.patternKeys
    .map(k => profile.patterns[k])
    .filter((p): p is PatternPrescription => !!p);

  // The worst (lowest) tier wins — slowest car sets the convoy speed.
  let tier: PrescriptionTier = 'integration';
  if (driving.length > 0) {
    tier = driving.reduce((acc, p) =>
      TIER_ORDER.indexOf(p.tier) < TIER_ORDER.indexOf(acc) ? p.tier : acc,
    'performance' as PrescriptionTier);
  }

  const warmupPatterns = driving.filter(p => p.warmupRequired).map(p => p.key);

  return {
    focus,
    tier,
    drivingPatterns: driving,
    warmupPatterns,
    rationale: buildSessionRationale(focus, tier, driving, warmupPatterns.length),
  };
}

function buildSessionRationale(
  focus: SessionFocusDef,
  tier: PrescriptionTier,
  driving: PatternPrescription[],
  warmupCount: number,
): string {
  if (driving.length === 0) {
    return `Focus ${focus.title}: nessun dato FMS sui pattern di riferimento — prescrizione su tier ${tier} di default.`;
  }
  const detail = driving
    .map(p => `${p.label} ${p.score}/3${p.asymmetric ? ' (asimmetria L/R)' : ''}`)
    .join(' · ');
  const tierIt =
    tier === 'corrective'  ? 'correttivo/propedeutico' :
    tier === 'integration' ? 'integrazione + carico progressivo' :
                             'performance complessa/dinamica';
  const warmupNote = warmupCount > 0
    ? ` Forzati ${warmupCount * 2} esercizi di mobilità/stabilità come warm-up sui pattern carenti.`
    : '';
  return `Focus ${focus.title}. Pattern di riferimento: ${detail}. Prescrizione su tier ${tierIt}.${warmupNote}`;
}

/**
 * Returns a human-friendly tier label (IT) for UI badges.
 */
export const TIER_LABEL_IT: Record<PrescriptionTier, string> = {
  corrective:  'Correttivo',
  integration: 'Integrazione',
  performance: 'Performance',
};
