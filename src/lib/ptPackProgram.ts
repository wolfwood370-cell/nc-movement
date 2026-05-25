// =====================================================================
// PT Pack Program Generator (v2 — FMS-driven)
// ---------------------------------------------------------------------
// Generates a coherent 3-session PT Pack where each exercise is selected
// from `exercises_library` strictly through the FMS Prescription Engine:
//   - Pattern score → tier (corrective / integration / performance)
//   - Tier → ramp_category pool
//   - Score ≤ 1 on a session-relevant pattern → 2 forced warm-up
//     mobility/stability exercises (phase Reset/Reactivate) prepended.
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

// ────────────────────────────────────────────────────────────────────────
// Library queries — all batched per session
// ────────────────────────────────────────────────────────────────────────
async function fetchMainPool(target: string, tier: PrescriptionTier): Promise<ExRow[]> {
  const ramps = TIER_RAMP_CATEGORIES[tier];
  const { data } = await supabase.from('exercises_library').select('*')
    .eq('workout_target', target)
    .in('ramp_category', ramps);
  return (data ?? []) as ExRow[];
}

async function fetchAccessoryPool(target: string, tier: PrescriptionTier): Promise<ExRow[]> {
  // Accessories allow one ramp_category lower than the main tier
  const ramps = tier === 'performance' ? ['C', 'D', 'E']
              : tier === 'integration' ? ['B', 'C', 'D']
              : ['A', 'B', 'C'];
  const { data } = await supabase.from('exercises_library').select('*')
    .eq('workout_target', target)
    .in('ramp_category', ramps);
  return (data ?? []) as ExRow[];
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
function rationaleMain(tier: PrescriptionTier, focus: string, weakLink: string | null): string {
  const base =
    tier === 'corrective'  ? `Tier correttivo: main lift su pattern ${focus} con complessità ridotta (ramp B/C) per costruire competenza prima del carico.` :
    tier === 'integration' ? `Tier integrazione: main lift su pattern ${focus} con carico progressivo moderato (ramp C/D).` :
                             `Tier performance: main lift complesso/dinamico (ramp D/E) per esprimere il pattern ${focus} sotto carico.`;
  return weakLink ? `${base} Selezione orientata a bypassare il weak-link FMS: ${weakLink}.` : base;
}
function rationaleAccessory(tier: PrescriptionTier, focus: string): string {
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

  const exercises: ProgramExercise[] = [];

  // 1) Forced warm-up (2 per failing pattern, capped at 2 total to stay focused)
  if (warmupPatterns.length > 0) {
    // Pick the worst pattern of the session and take 2 warm-up exercises from it.
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

  // 2) Main pool (tier-aware)
  const mains = await fetchMainPool(focus.workout_target, tier);
  const accessories = await fetchAccessoryPool(focus.workout_target, tier);
  const finishers = await fetchFinisherPool(focus.workout_target, goal);

  const mainScheme = MAIN_SCHEME[goal];
  const accScheme = ACCESSORY_SCHEME[goal];

  // A1 — Main lift
  const main = pickDistinct(mains, 1, usedIds)[0];
  exercises.push({
    block: 'A1',
    label: 'Main Lift',
    name: main?.name ?? FOCUS_FALLBACKS[letter].main,
    sets: mainScheme.sets,
    reps: mainScheme.reps,
    tut: mainScheme.tut,
    rest: mainScheme.rest,
    rationale: rationaleMain(tier, focus.title, weakLink),
  });

  // A2 — Compound secondario
  const secondary = pickDistinct(mains, 1, usedIds)[0];
  exercises.push({
    block: 'A2',
    label: 'Compound Secondario',
    name: secondary?.name ?? FOCUS_FALLBACKS[letter].secondary,
    sets: Math.max(3, mainScheme.sets - 1),
    reps: goal === 'Forza' ? '6-8' : mainScheme.reps,
    tut: mainScheme.tut,
    rest: mainScheme.rest,
    rationale: rationaleMain(tier, focus.title, null),
  });

  // B1/B2 — Accessori
  const accs = pickDistinct(accessories, 2, usedIds);
  for (let i = 0; i < 2; i += 1) {
    const e = accs[i];
    exercises.push({
      block: `B${i + 1}`,
      label: 'Accessorio',
      name: e?.name ?? FOCUS_FALLBACKS[letter].acc[i],
      sets: accScheme.sets,
      reps: accScheme.reps,
      tut: accScheme.tut,
      rest: accScheme.rest,
      rationale: rationaleAccessory(tier, focus.title),
    });
  }

  // C1 — Finisher
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

  return {
    goal,
    focus: focus.title,
    tier,
    session_rationale: prescription.rationale,
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
