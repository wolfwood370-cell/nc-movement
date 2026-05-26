// =====================================================================
// PT Pack Program Generator (v2 — FMS-driven)
// ---------------------------------------------------------------------
// Generates a coherent 3-session PT Pack where each exercise is selected
// from `exercises_library` strictly through the FMS Prescription Engine:
//   - Pattern score → tier (corrective / integration / performance)
//   - Tier → ramp_category pool
//   - Tier → posture_level window (Cook's 4x4 Matrix postural regression):
//       corrective  → posture_level ≤ 2 (supine / prone / quadruped /
//                                          half-kneeling): no axial load,
//                                          isolate segmental mobility & core.
//       integration → posture_level 3-4 (kneeling / split-stance /
//                                          stable single-leg): integrate
//                                          moderate load with segmental
//                                          control.
//       performance → posture_level = 4 (standing dynamic, complex force
//                                          vectors).
//   - Score ≤ 1 on a session-relevant pattern → 2 forced warm-up
//     mobility/stability exercises (phase Reset/Reactivate) prepended.
//   - Main / Accessory pools are PATTERN-AWARE: exercises whose `pattern`
//     column matches a deficit pattern from the FMS are preferred over
//     the broad workout_target × ramp_category cohort. The broad cohort
//     remains as a fallback when the pattern-specific pool is empty or
//     cannot fill all slots.
//   - When a (ramp_category × posture_level) combination yields an empty
//     pool, the posture constraint is relaxed by one step before the
//     hard-coded FOCUS_FALLBACKS list is considered.
//
// Output is JSONB-serialisable and persisted on `sessions.program`,
// alongside a coach + client-facing rationale string per exercise and
// per session.
// =====================================================================
import { supabase } from '@/integrations/supabase/client';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import type { FmsAssessmentRow } from '@/lib/insights';
import {
  buildFmsProfile,
  getSessionPrescription,
  SESSION_FOCUS,
  TIER_RAMP_CATEGORIES,
  TIER_LABEL_IT,
  type FmsProfile,
  type PatternPrescription,
  type SessionLetter,
  type PrescriptionTier,
} from '@/lib/fmsPrescription';

export type PtGoal = 'Forza' | 'Ipertrofia' | 'Dimagrimento' | 'Performance' | 'Rieducazione';

export const PT_GOALS: { value: PtGoal; label: string; desc: string }[] = [
  { value: 'Forza',         label: 'Forza',         desc: 'Carichi alti, basse ripetizioni, recuperi lunghi' },
  { value: 'Ipertrofia',    label: 'Ipertrofia',    desc: 'Volume e TUT per ipertrofia muscolare' },
  { value: 'Dimagrimento',  label: 'Dimagrimento',  desc: 'Circuiti metabolici, alta densità' },
  { value: 'Performance',   label: 'Performance',   desc: 'Potenza, esplosività, transfer atletico' },
  { value: 'Rieducazione',  label: 'Rieducazione',  desc: 'Volume basso, focus su correttivi e stabilità' },
];

export interface ProgramExercise {
  block: string;              // "W1","W2","A1","B1","C1"...
  label: string;              // "Warm-up correttivo", "Main Lift"...
  name: string;
  sets: number;
  reps: string;
  tut: string;
  rest: string;
  /** Scientific rationale shown to coach/client. */
  rationale?: string;
  notes?: string;
}

export interface PtPackProgram {
  goal: PtGoal;
  /** Display focus, e.g. "Squat / Hinge" */
  focus: string;
  /** Tier driving the session: corrective / integration / performance */
  tier: PrescriptionTier;
  /** Coach-facing scientific rationale for the whole session. */
  session_rationale: string;
  /** Concise cause→effect line, e.g. "Tier Correttivo pilotato da: ASLR 1/3". */
  tier_driver?: string;
  /** Pattern keys that triggered forced warm-up (mirrored from prescription). */
  warmup_patterns?: string[];
  /** Primary FMS limitation (Cook hierarchy) at generation time. */
  weak_link?: string | null;
  exercises: ProgramExercise[];
  generated_at: string;
}

interface ExRow {
  id: string;
  name: string;
  pattern: string;
  phase: string | null;
  posture_level: number | null;
  posture_name: string | null;
  ramp_category: string | null;
  workout_target: string | null;
  goal: string | null;
  default_sets: string | null;
  default_reps_time: string | null;
}

/** Pattern-aware pool result. `specific` matches a deficit pattern; `fallback`
 *  is the broad workout_target × ramp_category cohort minus the specific ids. */
interface PoolResult {
  specific: ExRow[];
  fallback: ExRow[];
}

// ────────────────────────────────────────────────────────────────────────
// Loading schemes — Goal × Block
// ────────────────────────────────────────────────────────────────────────
const MAIN_SCHEME: Record<PtGoal, { sets: number; reps: string; tut: string; rest: string }> = {
  Forza:        { sets: 5, reps: '3-5',   tut: '2-1-X-1', rest: '2-3 min' },
  Ipertrofia:   { sets: 4, reps: '8-12',  tut: '3-1-1-0', rest: '60-90 sec' },
  Dimagrimento: { sets: 3, reps: '12-15', tut: '2-0-1-0', rest: '30-45 sec' },
  Performance:  { sets: 4, reps: '4-6',   tut: '2-0-X-1', rest: '90 sec' },
  Rieducazione: { sets: 3, reps: '10-12', tut: '3-2-2-0', rest: '60 sec' },
};

const ACCESSORY_SCHEME: Record<PtGoal, { sets: number; reps: string; tut: string; rest: string }> = {
  Forza:        { sets: 3, reps: '6-8',   tut: '3-0-1-0', rest: '90 sec' },
  Ipertrofia:   { sets: 3, reps: '10-15', tut: '3-1-1-0', rest: '60 sec' },
  Dimagrimento: { sets: 3, reps: '15-20', tut: '2-0-1-0', rest: '30 sec' },
  Performance:  { sets: 3, reps: '8-10',  tut: '2-0-1-0', rest: '60 sec' },
  Rieducazione: { sets: 3, reps: '12-15', tut: '3-1-2-0', rest: '45 sec' },
};

const WARMUP_SCHEME = { sets: 2, reps: '8-10 lente', tut: '3-2-3-0', rest: '30 sec' };

const FOCUS_FALLBACKS: Record<SessionLetter, { main: string; secondary: string; acc: [string, string]; finisher: string }> = {
  A: { main: 'Goblet Squat',  secondary: 'Romanian Deadlift', acc: ['Reverse Lunge', 'Hip Thrust'], finisher: 'KB Swing 30/30' },
  B: { main: 'Chest Press',   secondary: 'Seated Row',        acc: ['Lateral Raise', 'Tricep Pushdown'], finisher: 'Push-Up AMRAP' },
  C: { main: 'Half-Kneeling Press', secondary: 'Pallof Press', acc: ['Bird Dog Row', 'Side Plank'], finisher: 'Med Ball Slam' },
};

/** Italian label per pattern key — used in pattern-match rationale text. */
const PATTERN_LABELS_IT: Record<string, string> = {
  deep_squat:             'Deep Squat',
  aslr:                   'ASLR (mobilità anca)',
  shoulder_mobility:      'Shoulder Mobility',
  trunk_stability_pushup: 'Trunk Stability Push-Up',
  rotary_stability:       'Rotary Stability',
  inline_lunge:           'Inline Lunge',
  hurdle_step:            'Hurdle Step',
};

/**
 * Postural matrix per tier (Cook's 4x4 Matrix). For each tier we keep a
 * `primary` posture window (the tier's clinical sweet spot) and a `fallback`
 * window — one step looser — used only when the primary search yields an
 * empty pool. If the fallback also fails, generateSession falls through to
 * the FOCUS_FALLBACKS hard-coded variants.
 *
 *   corrective  primary [1, 2] → fallback [1, 3]  (allow up to kneeling)
 *   integration primary [3, 4] → fallback [2, 4]  (allow quadruped regression)
 *   performance primary [4, 4] → fallback [3, 4]  (allow kneeling regression)
 *
 * Tuples are [minLevel, maxLevel] inclusive.
 */
const POSTURE_RANGES: Record<PrescriptionTier, { primary: [number, number]; fallback: [number, number] }> = {
  corrective:  { primary: [1, 2], fallback: [1, 3] },
  integration: { primary: [3, 4], fallback: [2, 4] },
  performance: { primary: [4, 4], fallback: [3, 4] },
};

// ────────────────────────────────────────────────────────────────────────
// Selection helpers
// ────────────────────────────────────────────────────────────────────────
function pickDistinct<T extends { id: string }>(arr: T[], n: number, used: Set<string>): T[] {
  const pool = arr.filter(x => !used.has(x.id));
  const out: T[] = [];
  const copy = [...pool];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    const [x] = copy.splice(i, 1);
    out.push(x);
    used.add(x.id);
  }
  return out;
}

/**
 * Pick `n` distinct exercises from a `PoolResult`. Pattern-specific candidates
 * are tried first (shuffled for variety); the broad fallback only kicks in
 * when the specific pool can't fill all slots. Mutates `used` to enforce
 * cross-session de-duplication.
 */
function pickWithPriority(pool: PoolResult, n: number, used: Set<string>): ExRow[] {
  const out = pickDistinct(pool.specific, n, used);
  if (out.length < n) {
    out.push(...pickDistinct(pool.fallback, n - out.length, used));
  }
  return out;
}

/** Deficit pattern keys (score ≤ 2) that the pool query should bias toward. */
function deficitPatternKeys(driving: PatternPrescription[]): string[] {
  return driving
    .filter(p => p.score !== null && p.score !== undefined && (p.score as number) <= 2)
    .map(p => p.key);
}

// ────────────────────────────────────────────────────────────────────────
// Library queries — pattern-aware, batched per session
// ────────────────────────────────────────────────────────────────────────
/**
 * Main lift pool. Two queries fired in parallel:
 *   1. `workout_target × ramp_category × pattern ∈ drivingPatternKeys`
 *   2. broad `workout_target × ramp_category` fallback (minus the specific ids)
 * Returned separately so `pickWithPriority` fills A1/A2 from the pattern-
 * specific cohort first and only dips into the fallback when needed.
 */
async function fetchMainPool(
  target: string,
  tier: PrescriptionTier,
  drivingPatternKeys: string[],
): Promise<PoolResult> {
  const ramps = TIER_RAMP_CATEGORIES[tier];
  return fetchPoolWithPostureFallback(target, ramps, drivingPatternKeys, POSTURE_RANGES[tier]);
}

/**
 * Accessory pool — same prioritisation contract as `fetchMainPool`. The ramp
 * window allows one tier lower than the main to keep volume manageable; the
 * postural window follows the same Cook 4x4 matrix as the main pool.
 */
async function fetchAccessoryPool(
  target: string,
  tier: PrescriptionTier,
  drivingPatternKeys: string[],
): Promise<PoolResult> {
  const ramps = tier === 'performance' ? ['C', 'D', 'E']
              : tier === 'integration' ? ['B', 'C', 'D']
              : ['A', 'B', 'C'];
  return fetchPoolWithPostureFallback(target, ramps, drivingPatternKeys, POSTURE_RANGES[tier]);
}

/**
 * Two-step postural fallback: query with the tier's primary posture range
 * first; if both the pattern-specific cohort and the broad cohort come back
 * empty, retry once with the looser `fallback` range. If still empty,
 * `generateSession` falls through to the FOCUS_FALLBACKS hard-coded list.
 */
async function fetchPoolWithPostureFallback(
  target: string,
  ramps: string[],
  drivingPatternKeys: string[],
  posture: { primary: [number, number]; fallback: [number, number] },
): Promise<PoolResult> {
  let pool = await fetchPool(target, ramps, drivingPatternKeys, posture.primary);
  if (pool.specific.length === 0 && pool.fallback.length === 0) {
    pool = await fetchPool(target, ramps, drivingPatternKeys, posture.fallback);
  }
  return pool;
}

async function fetchPool(
  target: string,
  ramps: string[],
  drivingPatternKeys: string[],
  postureRange: [number, number],
): Promise<PoolResult> {
  const [minLevel, maxLevel] = postureRange;

  const specificQuery = drivingPatternKeys.length > 0
    ? supabase.from('exercises_library').select('*')
        .eq('workout_target', target)
        .in('ramp_category', ramps)
        .in('pattern', drivingPatternKeys)
        .gte('posture_level', minLevel)
        .lte('posture_level', maxLevel)
    : Promise.resolve({ data: [] as ExRow[], error: null });

  const fallbackQuery = supabase.from('exercises_library').select('*')
    .eq('workout_target', target)
    .in('ramp_category', ramps)
    .gte('posture_level', minLevel)
    .lte('posture_level', maxLevel);

  const [specificRes, fallbackRes] = await Promise.all([specificQuery, fallbackQuery]);

  const specific = (specificRes.data ?? []) as ExRow[];
  const fallbackAll = (fallbackRes.data ?? []) as ExRow[];
  const specificIds = new Set(specific.map(r => r.id));
  const fallback = fallbackAll.filter(r => !specificIds.has(r.id));

  return { specific, fallback };
}

async function fetchFinisherPool(target: string, goal: PtGoal): Promise<ExRow[]> {
  const q = supabase.from('exercises_library').select('*').eq('ramp_category', 'F');
  // Dimagrimento/Performance: any target; otherwise restrict to session target.
  const { data } = goal === 'Dimagrimento' || goal === 'Performance'
    ? await q
    : await q.eq('workout_target', target);
  return (data ?? []) as ExRow[];
}

/**
 * Warm-up pool for a single failing pattern: mobility/stability biased
 * (phase Reset → Reactivate). Returns the lowest posture levels first.
 */
async function fetchWarmupPool(patternKey: string): Promise<ExRow[]> {
  const { data } = await supabase.from('exercises_library').select('*')
    .eq('pattern', patternKey)
    .in('phase', ['Reset', 'Reactivate'])
    .order('posture_level', { ascending: true });
  return (data ?? []) as ExRow[];
}

// ────────────────────────────────────────────────────────────────────────
// Rationale builders
// ────────────────────────────────────────────────────────────────────────
function rationaleWarmup(patternLabel: string, score: number): string {
  return `Pattern ${patternLabel} = ${score}/3 (zona correttiva). Forzato come warm-up per riattivare mobilità/stabilità prima del carico.`;
}

/**
 * Tier-aware postural rationale fragment for main lifts. Wraps the
 * `posture_name` of the chosen exercise with the Cook 4x4 Matrix narrative.
 */
function postureRationale(tier: PrescriptionTier, postureName: string): string {
  if (tier === 'corrective') {
    return `Postura regredita a livello ${postureName} per azzerare il carico gravitazionale e ottimizzare l'apprendimento motorio del pattern.`;
  }
  if (tier === 'integration') {
    return `Postura ${postureName} con vincoli di stabilità asimmetrica per integrare carico moderato e controllo segmentario.`;
  }
  return `Postura ${postureName} eretta/dinamica per esprimere il pattern sotto vettori di forza complessi.`;
}

function rationaleMain(
  tier: PrescriptionTier,
  focus: string,
  weakLink: string | null,
  patternMatched: boolean,
  matchedPattern: string | undefined,
  postureName: string | null,
): string {
  const postureFragment = postureName ? ` ${postureRationale(tier, postureName)}` : '';
  if (patternMatched && matchedPattern) {
    const label = PATTERN_LABELS_IT[matchedPattern] ?? matchedPattern;
    return `Esercizio selezionato specificamente per indirizzare il pattern ${label} evidenziato nel test FMS (main lift, tier ${TIER_LABEL_IT[tier].toLowerCase()}).${postureFragment}`;
  }
  const base =
    tier === 'corrective'  ? `Tier correttivo: main lift su pattern ${focus} con complessità ridotta (ramp B/C) per costruire competenza prima del carico.` :
    tier === 'integration' ? `Tier integrazione: main lift su pattern ${focus} con carico progressivo moderato (ramp C/D).` :
                             `Tier performance: main lift complesso/dinamico (ramp D/E) per esprimere il pattern ${focus} sotto carico.`;
  const weakLinkFragment = weakLink ? ` Selezione orientata a bypassare il weak-link FMS: ${weakLink}.` : '';
  return `${base}${weakLinkFragment}${postureFragment}`;
}

function rationaleAccessory(
  tier: PrescriptionTier,
  focus: string,
  patternMatched: boolean,
  matchedPattern: string | undefined,
): string {
  if (patternMatched && matchedPattern) {
    const label = PATTERN_LABELS_IT[matchedPattern] ?? matchedPattern;
    return `Esercizio selezionato specificamente per indirizzare il pattern ${label} evidenziato nel test FMS (accessorio, tier ${TIER_LABEL_IT[tier].toLowerCase()}).`;
  }
  return `Accessorio per ${focus}, tier ${TIER_LABEL_IT[tier].toLowerCase()}: rinforza il pattern principale con uno stimolo complementare.`;
}

function rationaleFinisher(goal: PtGoal): string {
  if (goal === 'Dimagrimento') return 'Finisher metabolico ad alta densità — bias glicolitico per spesa energetica.';
  if (goal === 'Performance')  return 'Finisher esplosivo — output di potenza a fatica controllata.';
  return 'Finisher a chiusura della sessione — consolidamento del pattern dominante.';
}

// ────────────────────────────────────────────────────────────────────────
// Per-session generator
// ────────────────────────────────────────────────────────────────────────
async function generateSession(
  letter: SessionLetter,
  goal: PtGoal,
  profile: FmsProfile,
  weakLink: string | null,
  usedIds: Set<string>,
): Promise<PtPackProgram> {
  const prescription = getSessionPrescription(letter, profile);
  const { focus, tier, drivingPatterns, warmupPatterns } = prescription;
  const drivingKeys = deficitPatternKeys(drivingPatterns);

  const exercises: ProgramExercise[] = [];

  // 1) Forced warm-up (2 exercises on the worst-scored pattern of the session)
  if (warmupPatterns.length > 0) {
    const worstKey = warmupPatterns
      .map(k => drivingPatterns.find(p => p.key === k)!)
      .sort((a, b) => (a.score ?? 3) - (b.score ?? 3))[0].key;
    const worstMeta = drivingPatterns.find(p => p.key === worstKey)!;
    const pool = await fetchWarmupPool(worstKey);
    const picks = pickDistinct(pool, 2, usedIds);
    picks.forEach((e, i) => {
      exercises.push({
        block: `W${i + 1}`,
        label: 'Warm-up correttivo',
        name: e.name,
        sets: WARMUP_SCHEME.sets,
        reps: WARMUP_SCHEME.reps,
        tut: WARMUP_SCHEME.tut,
        rest: WARMUP_SCHEME.rest,
        rationale: rationaleWarmup(worstMeta.label, worstMeta.score as number),
      });
    });
  }

  // 2) Pattern-aware Main + Accessory pools + finisher (parallel fetch)
  const [mainPool, accessoryPool, finishers] = await Promise.all([
    fetchMainPool(focus.workout_target, tier, drivingKeys),
    fetchAccessoryPool(focus.workout_target, tier, drivingKeys),
    fetchFinisherPool(focus.workout_target, goal),
  ]);

  const mainSpecificIds = new Set(mainPool.specific.map(r => r.id));
  const accSpecificIds  = new Set(accessoryPool.specific.map(r => r.id));

  const mainScheme = MAIN_SCHEME[goal];
  const accScheme  = ACCESSORY_SCHEME[goal];

  // A1 — Main lift (preferentially pattern-matched)
  const main = pickWithPriority(mainPool, 1, usedIds)[0];
  const mainMatched = !!main && mainSpecificIds.has(main.id);
  exercises.push({
    block: 'A1',
    label: 'Main Lift',
    name: main?.name ?? FOCUS_FALLBACKS[letter].main,
    sets: mainScheme.sets,
    reps: mainScheme.reps,
    tut: mainScheme.tut,
    rest: mainScheme.rest,
    rationale: rationaleMain(tier, focus.title, weakLink, mainMatched, main?.pattern, main?.posture_name ?? null),
  });

  // A2 — Compound secondario (also preferentially pattern-matched, but the
  // pattern-specific pool may already be exhausted by A1)
  const secondary = pickWithPriority(mainPool, 1, usedIds)[0];
  const secondaryMatched = !!secondary && mainSpecificIds.has(secondary.id);
  exercises.push({
    block: 'A2',
    label: 'Compound Secondario',
    name: secondary?.name ?? FOCUS_FALLBACKS[letter].secondary,
    sets: Math.max(3, mainScheme.sets - 1),
    reps: goal === 'Forza' ? '6-8' : mainScheme.reps,
    tut: mainScheme.tut,
    rest: mainScheme.rest,
    rationale: rationaleMain(tier, focus.title, null, secondaryMatched, secondary?.pattern, secondary?.posture_name ?? null),
  });

  // B1/B2 — Accessori
  const accs = pickWithPriority(accessoryPool, 2, usedIds);
  for (let i = 0; i < 2; i += 1) {
    const e = accs[i];
    const matched = !!e && accSpecificIds.has(e.id);
    exercises.push({
      block: `B${i + 1}`,
      label: 'Accessorio',
      name: e?.name ?? FOCUS_FALLBACKS[letter].acc[i],
      sets: accScheme.sets,
      reps: accScheme.reps,
      tut: accScheme.tut,
      rest: accScheme.rest,
      rationale: rationaleAccessory(tier, focus.title, matched, e?.pattern),
    });
  }

  // C1 — Finisher (no pattern bias)
  const fin = pickDistinct(finishers, 1, usedIds)[0];
  exercises.push({
    block: 'C1',
    label: goal === 'Dimagrimento' ? 'Finisher Metabolico' : 'Finisher / Potenza',
    name: fin?.name ?? FOCUS_FALLBACKS[letter].finisher,
    sets: 3,
    reps: goal === 'Dimagrimento' ? '30 sec lavoro' : '5-6',
    tut: 'X-0-X-0',
    rest: goal === 'Dimagrimento' ? '30 sec' : '90 sec',
    rationale: rationaleFinisher(goal),
    notes: goal === 'Dimagrimento' ? 'AMRAP — intensità RPE 8' : 'Esplosivo · max velocità',
  });

  // Cause→effect line: pick the lowest-scoring driving pattern as the "driver".
  const tierDriver = (() => {
    const dp = prescription.drivingPatterns ?? [];
    if (dp.length === 0) return `Tier ${TIER_LABEL_IT[tier]} · prescrizione di default (nessun pattern FMS rilevante).`;
    const worst = [...dp].sort((a, b) => (a.score ?? 9) - (b.score ?? 9))[0];
    const asym = worst.asymmetric ? ' (asimmetria L/R)' : '';
    const proxy = worst.proxy ? ' · proxy FMS Modificato' : '';
    return `Tier ${TIER_LABEL_IT[tier]} pilotato da: ${worst.label} ${worst.score}/3${asym}${proxy}`;
  })();

  return {
    goal,
    focus: focus.title,
    tier,
    session_rationale: prescription.rationale,
    tier_driver: tierDriver,
    warmup_patterns: prescription.warmupPatterns,
    weak_link: weakLink,
    exercises,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate the complete 3-session PT Pack as a coherent set.
 * Single shared `usedIds` Set keeps the 3 workouts varied (no duplicate
 * exercises across the pack) and unified (same goal + same FMS profile).
 */
export async function generatePtPackSet(
  goal: PtGoal,
  latestFms: FmsAssessmentRow | null,
): Promise<PtPackProgram[]> {
  const profile = buildFmsProfile(latestFms as unknown as FmsScores | null);
  const priority = latestFms ? getCorrectivePriority(latestFms as unknown as FmsScores) : null;
  const weakLink = priority && priority.patternKey !== 'none' && priority.patternKey !== 'pain'
    ? priority.focus
    : null;
  const used = new Set<string>();
  const out: PtPackProgram[] = [];
  for (const letter of ['A', 'B', 'C'] as SessionLetter[]) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await generateSession(letter, goal, profile, weakLink, used));
  }
  return out;
}

// Re-exports kept for backwards compatibility with old imports.
export { SESSION_FOCUS };
