// =====================================================================
// PT Pack Program Generator
// Generates a 5-block workout (Activation → Main A → Main B → Accessory →
// Finisher) based on the client's training goal and FMS weak link.
// Stored as JSONB on `sessions.program`.
// =====================================================================
import { supabase } from '@/integrations/supabase/client';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import type { FmsAssessmentRow } from '@/lib/insights';

export type PtGoal = 'Forza' | 'Ipertrofia' | 'Dimagrimento' | 'Performance' | 'Rieducazione';

export const PT_GOALS: { value: PtGoal; label: string; desc: string }[] = [
  { value: 'Forza',         label: 'Forza',         desc: 'Carichi alti, basse ripetizioni, recuperi lunghi' },
  { value: 'Ipertrofia',    label: 'Ipertrofia',    desc: 'Volume e TUT per ipertrofia muscolare' },
  { value: 'Dimagrimento',  label: 'Dimagrimento',  desc: 'Circuiti metabolici, alta densità' },
  { value: 'Performance',   label: 'Performance',   desc: 'Potenza, esplosività, transfer atletico' },
  { value: 'Rieducazione',  label: 'Rieducazione',  desc: 'Volume basso, focus su correttivi e stabilità' },
];

export interface ProgramExercise {
  block: string;              // e.g. "A1", "B1"
  label: string;              // "Attivazione", "Main Lift", ...
  name: string;
  sets: number;
  reps: string;               // "8-10", "12", "30 sec"
  tut: string;                // "3-1-1-0"
  rest: string;               // "2 min"
  notes?: string;
}

export interface PtPackProgram {
  goal: PtGoal;
  focus: string;               // session focus (Upper/Lower/Full Body)
  weak_link?: string | null;   // primary FMS weak link
  exercises: ProgramExercise[];
  generated_at: string;
}

interface ExRow {
  id: string;
  name: string;
  pattern: string;
  phase: string;
  ramp_category: string | null;
  workout_target: string | null;
  default_sets: string | null;
  default_reps_time: string | null;
}

// Goal → loading scheme (sets · reps · TUT · rest)
const SCHEME: Record<PtGoal, { sets: number; reps: string; tut: string; rest: string }> = {
  Forza:        { sets: 5, reps: '3-5',   tut: '2-1-X-1', rest: '2-3 min' },
  Ipertrofia:   { sets: 4, reps: '8-12',  tut: '3-1-1-0', rest: '60-90 sec' },
  Dimagrimento: { sets: 3, reps: '12-15', tut: '2-0-1-0', rest: '30-45 sec' },
  Performance:  { sets: 4, reps: '4-6',   tut: '2-0-X-1', rest: '90 sec' },
  Rieducazione: { sets: 3, reps: '10-12', tut: '3-2-2-0', rest: '60 sec' },
};

// Session-level focus rotation across the 3 PT Pack sessions
const FOCUS_ROTATION: Record<number, 'Full Body' | 'Lower Body' | 'Upper Body'> = {
  1: 'Full Body',
  2: 'Lower Body',
  3: 'Upper Body',
};

const ACCESSORY_SCHEME: Record<PtGoal, { sets: number; reps: string; tut: string; rest: string }> = {
  Forza:        { sets: 3, reps: '6-8',   tut: '3-0-1-0', rest: '90 sec' },
  Ipertrofia:   { sets: 3, reps: '10-15', tut: '3-1-1-0', rest: '60 sec' },
  Dimagrimento: { sets: 3, reps: '15-20', tut: '2-0-1-0', rest: '30 sec' },
  Performance:  { sets: 3, reps: '8-10',  tut: '2-0-1-0', rest: '60 sec' },
  Rieducazione: { sets: 3, reps: '12-15', tut: '3-1-2-0', rest: '45 sec' },
};

function pick<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

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

export async function generatePtPackProgram(
  goal: PtGoal,
  sessionNumber: number,
  latestFms: FmsAssessmentRow | null,
  usedIds: Set<string> = new Set(),
): Promise<PtPackProgram> {
  const focus = FOCUS_ROTATION[sessionNumber] ?? 'Full Body';
  const priority = latestFms ? getCorrectivePriority(latestFms as unknown as FmsScores) : null;
  const weakPattern = priority?.patternKey && priority.patternKey !== 'none' && priority.patternKey !== 'pain'
    ? priority.patternKey
    : null;

  // NOTE: No activation/warm-up block — the coach uses the dedicated warm-up
  // generated in the "Insights" tab before each PT Pack session.
  const [
    { data: safeRows },
    { data: mainRows },
    { data: accessoryRows },
    { data: finisherRows },
  ] = await Promise.all([
    weakPattern
      ? supabase.from('exercises_library').select('*').eq('pattern', weakPattern).eq('ramp_category', 'Safe_Strength')
      : Promise.resolve({ data: [] }),
    supabase.from('exercises_library').select('*')
      .in('ramp_category', ['D', 'E'])
      .eq('workout_target', focus),
    supabase.from('exercises_library').select('*')
      .in('ramp_category', ['C', 'D', 'E'])
      .eq('workout_target', focus),
    goal === 'Dimagrimento' || goal === 'Performance'
      ? supabase.from('exercises_library').select('*').eq('ramp_category', 'F')
      : supabase.from('exercises_library').select('*').eq('ramp_category', 'F').eq('workout_target', focus),
  ]);

  const safe = (safeRows ?? []) as ExRow[];
  const mains = (mainRows ?? []) as ExRow[];
  const accessories = (accessoryRows ?? []) as ExRow[];
  const finishers = (finisherRows ?? []) as ExRow[];

  const scheme = SCHEME[goal];
  const accScheme = ACCESSORY_SCHEME[goal];
  const used = usedIds;
  const exercises: ProgramExercise[] = [];

  // A1 — Main lift (Safe_Strength alternative if weak link exists)
  const mainPool = safe.length > 0 ? safe : mains;
  const main = pickDistinct(mainPool, 1, used)[0] ?? pick(mainPool);
  if (main && !used.has(main.id)) used.add(main.id);
  exercises.push({
    block: 'A1',
    label: 'Main Lift',
    name: main?.name ?? (focus === 'Lower Body' ? 'Goblet Squat' : focus === 'Upper Body' ? 'Chest Press' : 'Deadlift'),
    sets: scheme.sets,
    reps: scheme.reps,
    tut: scheme.tut,
    rest: scheme.rest,
    notes: safe.length > 0 ? 'Variante Safe Strength — bypassa il weak link' : undefined,
  });

  // A2 — Secondary compound
  const secondary = pickDistinct(mains, 1, used)[0];
  exercises.push({
    block: 'A2',
    label: 'Compound Secondario',
    name: secondary?.name ?? (focus === 'Lower Body' ? 'Romanian Deadlift' : focus === 'Upper Body' ? 'Seated Row' : 'Pull-Up'),
    sets: Math.max(3, scheme.sets - 1),
    reps: goal === 'Forza' ? '6-8' : scheme.reps,
    tut: scheme.tut,
    rest: scheme.rest,
  });

  // B1/B2 — Accessories
  const accs = pickDistinct(accessories, 2, used);
  const accFallbacks = focus === 'Lower Body'
    ? ['Leg Curl', 'Calf Raise']
    : focus === 'Upper Body'
      ? ['Lateral Raise', 'Tricep Pushdown']
      : ['Plank', 'Russian Twist'];
  for (let i = 0; i < 2; i += 1) {
    const e = accs[i];
    exercises.push({
      block: `B${i + 1}`,
      label: 'Accessorio',
      name: e?.name ?? accFallbacks[i],
      sets: accScheme.sets,
      reps: accScheme.reps,
      tut: accScheme.tut,
      rest: accScheme.rest,
    });
  }

  // C1 — Finisher
  const fin = pickDistinct(finishers, 1, used)[0] ?? pick(finishers);
  if (fin && !used.has(fin.id)) used.add(fin.id);
  exercises.push({
    block: 'C1',
    label: goal === 'Dimagrimento' ? 'Finisher Metabolico' : 'Finisher / Potenza',
    name: fin?.name ?? (goal === 'Dimagrimento' ? 'Battle Rope 30/30' : 'Med Ball Slam'),
    sets: 3,
    reps: goal === 'Dimagrimento' ? '30 sec lavoro' : '5-6',
    tut: 'X-0-X-0',
    rest: goal === 'Dimagrimento' ? '30 sec' : '90 sec',
    notes: goal === 'Dimagrimento' ? 'AMRAP — intensità RPE 8' : 'Esplosivo · max velocità',
  });

  return {
    goal,
    focus,
    weak_link: priority?.focus ?? null,
    exercises,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate the complete 3-session PT Pack as a coherent set.
 * A shared `used` tracker across sessions keeps the three workouts varied
 * and unified — same goal, same weak-link strategy, no duplicate exercises.
 */
export async function generatePtPackSet(
  goal: PtGoal,
  latestFms: FmsAssessmentRow | null,
): Promise<PtPackProgram[]> {
  const used = new Set<string>();
  const out: PtPackProgram[] = [];
  for (const n of [1, 2, 3]) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await generatePtPackProgram(goal, n, latestFms, used));
  }
  return out;
}
