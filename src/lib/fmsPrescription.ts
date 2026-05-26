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
// Under a Modified FMS (Deep Squat + Shoulder Mobility + ASLR only) the
// engine substitutes clinically defensible proxies so that mobility
// restrictions still constrain sessions B and C:
//
//   B → TSPU absent: use Deep Squat as a trunk-control proxy;
//                    DS ≤ 1 caps the session tier at 'integration'.
//   C → RS + IL absent: apply Cook's hierarchy on the screened patterns
//                       (ASLR > Shoulder Mobility > Deep Squat).
//
// =====================================================================
import type { FmsScores, Score, PatternResult } from '@/lib/fms';
import { computePatterns, isModifiedFms } from '@/lib/fms';

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
  /** True when this pattern is used as a proxy for an absent native pattern
   *  (only set in Modified FMS sessions B/C). */
  proxy?: boolean;
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
  /** True when the assessment is a Modified FMS (DS + SM + ASLR only). */
  isModified: boolean;
}

/**
 * Build a complete prescription profile from an FMS assessment row.
 * Patterns missing from a Modified FMS are simply absent from the map;
 * Sessions B/C use proxy logic to compensate (see `getSessionPrescription`).
 */
export function buildFmsProfile(scores: FmsScores | null | undefined): FmsProfile {
  if (!scores) return { patterns: {}, warmupPatterns: [], isModified: false };
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
  return { patterns: map, warmupPatterns: warmup, isModified: isModifiedFms(scores) };
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
  /** True when Modified-FMS proxy substitution was applied (Sessions B or C). */
  proxyApplied?: boolean;
}

const TIER_ORDER: PrescriptionTier[] = ['corrective', 'integration', 'performance'];

function worstTier(prescriptions: PatternPrescription[]): PrescriptionTier {
  if (prescriptions.length === 0) return 'integration';
  return prescriptions.reduce<PrescriptionTier>(
    (acc, p) => (TIER_ORDER.indexOf(p.tier) < TIER_ORDER.indexOf(acc) ? p.tier : acc),
    'performance',
  );
}

/** Return the more conservative (lower-ranked) of `t` and `ceiling`. */
function capTier(t: PrescriptionTier, ceiling: PrescriptionTier): PrescriptionTier {
  return TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(ceiling) ? t : ceiling;
}

/**
 * Derive the tier + warm-up plan for a single PT Pack session by inspecting
 * only the patterns clinically relevant to that session's focus. Under a
 * Modified FMS, Sessions B and C route through proxy logic.
 */
export function getSessionPrescription(letter: SessionLetter, profile: FmsProfile): SessionPrescription {
  // Modified FMS: Session A unchanged (both natives present); B/C use proxies.
  if (profile.isModified && letter !== 'A') {
    return getModifiedSessionPrescription(letter, profile);
  }

  const focus = SESSION_FOCUS[letter];
  const driving = focus.patternKeys
    .map(k => profile.patterns[k])
    .filter((p): p is PatternPrescription => !!p);

  // The worst (lowest) tier wins — slowest car sets the convoy speed.
  let tier: PrescriptionTier = 'integration';
  if (driving.length > 0) tier = worstTier(driving);

  const warmupPatterns = driving.filter(p => p.warmupRequired).map(p => p.key);

  return {
    focus,
    tier,
    drivingPatterns: driving,
    warmupPatterns,
    rationale: buildSessionRationale(focus, tier, driving, warmupPatterns.length),
  };
}

/**
 * Modified FMS proxy logic for Sessions B and C.
 *
 * Session B: shoulder_mobility direct + deep_squat as trunk-control proxy.
 *            DS ≤ 1 caps the session tier at 'integration' to protect the
 *            spine under load when no direct TSPU read is available.
 *
 * Session C: both native patterns absent → Cook's hierarchy on the screened
 *            patterns. Order: ASLR > Shoulder Mobility > Deep Squat.
 */
function getModifiedSessionPrescription(letter: SessionLetter, profile: FmsProfile): SessionPrescription {
  const focus = SESSION_FOCUS[letter];
  const ds   = profile.patterns['deep_squat'];
  const sm   = profile.patterns['shoulder_mobility'];
  const aslr = profile.patterns['aslr'];

  if (letter === 'B') {
    const driving: PatternPrescription[] = [];
    if (sm) driving.push(sm);
    if (ds) driving.push({ ...ds, proxy: true });

    let tier: PrescriptionTier = driving.length > 0 ? worstTier(driving) : 'integration';
    let capped = false;
    if (ds && ds.score !== null && ds.score !== undefined && ds.score <= 1) {
      const newTier = capTier(tier, 'integration');
      if (newTier !== tier) capped = true;
      tier = newTier;
    }

    const warmupPatterns: string[] = [];
    if (sm && sm.warmupRequired) warmupPatterns.push('shoulder_mobility');
    if (ds && ds.score !== null && ds.score !== undefined && ds.score <= 1) {
      if (!warmupPatterns.includes('deep_squat')) warmupPatterns.push('deep_squat');
    }

    return {
      focus,
      tier,
      drivingPatterns: driving,
      warmupPatterns,
      proxyApplied: true,
      rationale: buildModifiedRationaleB(focus, driving, warmupPatterns, ds, capped),
    };
  }

  // letter === 'C' — Cook hierarchy on proxies.
  const driving: PatternPrescription[] = [];
  if (aslr) driving.push({ ...aslr, proxy: true });
  if (sm)   driving.push({ ...sm,   proxy: true });
  if (ds)   driving.push({ ...ds,   proxy: true });

  let tier: PrescriptionTier;
  const warmupPatterns: string[] = [];

  if (aslr && aslr.warmupRequired) {
    tier = 'corrective';
    warmupPatterns.push('aslr');
    // A co-existing shoulder restriction is also surfaced — Session C also
    // loads upper-body rotation, so both mobility gates matter.
    if (sm && sm.warmupRequired) warmupPatterns.push('shoulder_mobility');
  } else if (sm && sm.warmupRequired) {
    tier = 'corrective';
    warmupPatterns.push('shoulder_mobility');
  } else {
    tier = ds ? ds.tier : 'integration';
    if (ds && ds.warmupRequired) warmupPatterns.push('deep_squat');
  }

  return {
    focus,
    tier,
    drivingPatterns: driving,
    warmupPatterns,
    proxyApplied: true,
    rationale: buildModifiedRationaleC(focus, tier, driving, warmupPatterns, aslr, sm, ds),
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

function buildModifiedRationaleB(
  focus: SessionFocusDef,
  driving: PatternPrescription[],
  warmupPatterns: string[],
  ds: PatternPrescription | undefined,
  capped: boolean,
): string {
  const detail = driving
    .map(p => `${p.label} ${p.score}/3${p.proxy ? ' (proxy)' : ''}${p.asymmetric ? ' (asimmetria L/R)' : ''}`)
    .join(' · ');
  const proxyLine = capped
    ? `FMS Modificato: Trunk Stability Push-Up non testato; Deep Squat (${ds?.score}/3) usato come proxy del controllo del tronco e ha cappato la sessione a 'integrazione' per proteggere la colonna sotto sforzo.`
    : `FMS Modificato: Trunk Stability Push-Up non testato; Deep Squat usato come proxy del controllo del tronco (nessun cap attivo: DS ≥ 2).`;
  const warmupNote = warmupPatterns.length > 0
    ? ` Forzati ${warmupPatterns.length * 2} esercizi correttivi sui pattern carenti (${warmupPatterns.join(', ')}).`
    : '';
  return `Focus ${focus.title}. ${proxyLine} Pattern di riferimento: ${detail}.${warmupNote}`;
}

function buildModifiedRationaleC(
  focus: SessionFocusDef,
  tier: PrescriptionTier,
  driving: PatternPrescription[],
  warmupPatterns: string[],
  aslr: PatternPrescription | undefined,
  sm: PatternPrescription | undefined,
  ds: PatternPrescription | undefined,
): string {
  const detail = driving
    .map(p => `${p.label} ${p.score}/3${p.proxy ? ' (proxy)' : ''}`)
    .join(' · ');
  let proxyLine: string;
  if (aslr?.warmupRequired) {
    proxyLine = `FMS Modificato: Rotary Stability e Inline Lunge non testati. ASLR in tier correttivo → per gerarchia Cook la mobilità d'anca limita ogni pattern dinamico/rotazionale, sessione forzata a tier correttivo.`;
  } else if (sm?.warmupRequired) {
    proxyLine = `FMS Modificato: Rotary Stability e Inline Lunge non testati. ASLR pulito, ma Shoulder Mobility in tier correttivo condiziona le rotazioni caricate → sessione forzata a tier correttivo.`;
  } else if (ds?.warmupRequired) {
    proxyLine = `FMS Modificato: Rotary Stability e Inline Lunge non testati. Mobilità (ASLR + Shoulder Mobility) pulita, Deep Squat = ${ds.score}/3 usato come limitatore globale di stabilità dinamica.`;
  } else {
    proxyLine = `FMS Modificato: Rotary Stability e Inline Lunge non testati. Mobilità pulita, prescrizione basata sul Deep Squat come proxy globale (tier ${tier}).`;
  }
  const warmupNote = warmupPatterns.length > 0
    ? ` Forzati ${warmupPatterns.length * 2} esercizi correttivi (${warmupPatterns.join(', ')}).`
    : '';
  return `Focus ${focus.title}. ${proxyLine} Pattern coinvolti: ${detail}.${warmupNote}`;
}

/**
 * Returns a human-friendly tier label (IT) for UI badges.
 */
export const TIER_LABEL_IT: Record<PrescriptionTier, string> = {
  corrective:  'Correttivo',
  integration: 'Integrazione',
  performance: 'Performance',
};
