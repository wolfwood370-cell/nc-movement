import { useEffect, useMemo, useState } from 'react';
import { Printer, Flame, Droplet, Activity as ActivityIcon, Zap, Target, Sparkles, Loader2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import type { FmsAssessmentRow } from '@/lib/insights';

interface ExerciseRow {
  id: string;
  pattern: string;
  phase: 'Reset' | 'Reactivate' | 'Reinforce';
  posture_level: number;
  posture_name: string;
  name: string;
  goal: string | null;
  dose: string | null;
  default_sets: string | null;
  default_reps_time: string | null;
  ramp_category: string | null;
  workout_target: string | null;
}

interface DiscoveryItem {
  label: string;
  name: string;
  dose: string;
  note?: string;
  downgraded?: string;
}

type Goal = 'strength' | 'hypertrophy' | 'metabolic' | 'rehab';

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'strength', label: 'Forza Generale' },
  { value: 'hypertrophy', label: 'Ipertrofia Muscolare' },
  { value: 'metabolic', label: 'Perdita di Peso / Metabolico' },
  { value: 'rehab', label: 'Rieducazione / Gestione Dolore' },
];

const GOAL_PARAMS: Record<Goal, { sets: string; reps: string; note: string; circuitInfo: string }> = {
  strength: {
    sets: '3 Serie',
    reps: '4-6 Reps',
    note: 'Focus su carico pesante e recuperi completi (90-120s).',
    circuitInfo: 'Esecuzione a stazioni · Recupero 90-120" tra serie · 3 round',
  },
  hypertrophy: {
    sets: '3 Serie',
    reps: '8-12 Reps',
    note: 'Focus su connessione mente-muscolo e tempo eccentrico lento (3-4 sec).',
    circuitInfo: 'Esecuzione a stazioni · Recupero 60-75" · 3 round · Tempo 3-1-1-0',
  },
  metabolic: {
    sets: '4 Serie',
    reps: '40" Lavoro / 20" Recupero',
    note: 'Circuito ad alta intensità. Mantenere il battito cardiaco elevato.',
    circuitInfo: 'Circuito HIIT · 40" lavoro / 20" recupero · 4 round',
  },
  rehab: {
    sets: '2 Serie',
    reps: '8-10 Reps',
    note: 'Esecuzione controllata. Pausa isometrica di 2" nel punto di massima contrazione.',
    circuitInfo: 'Esecuzione controllata · Recupero 60" · 2 round · Pausa iso 2"',
  },
};

interface SafetyFlags {
  ankle: boolean;
  shoulder: boolean;
  spinalExtension: boolean;
  spinalFlexion: boolean;
}

function getSafetyFlags(fms: FmsAssessmentRow | null): SafetyFlags {
  if (!fms) return { ankle: false, shoulder: false, spinalExtension: false, spinalFlexion: false };
  const f = fms as unknown as FmsScores;
  return {
    ankle: !!f.ankle_clearing_left_pain || !!f.ankle_clearing_right_pain,
    shoulder: !!f.clearing_shoulder_pain || !!f.clearing_shoulder_left_pain || !!f.clearing_shoulder_right_pain,
    spinalExtension: !!f.clearing_spinal_extension_pain,
    spinalFlexion: !!f.clearing_spinal_flexion_pain,
  };
}

// Constraint Engine — returns true if the exercise is SAFE for the given flags.
function isSafe(ex: ExerciseRow, flags: SafetyFlags): boolean {
  const n = ex.name.toLowerCase();
  if (flags.ankle && /(jump|hop|bound|slam|swing|skipping|sprint|plyo|broad|box)/.test(n)) return false;
  if (flags.shoulder && /(overhead|press|snatch|jerk|push press|handstand|pull[- ]up|chin[- ]up)/.test(n)) return false;
  if (flags.spinalExtension && /(push[- ]?up|tspu|deadlift|good morning|bridge)/.test(n)) return false;
  if (flags.spinalFlexion && /(crunch|sit[- ]?up|rotary|russian twist|v[- ]?up|toe touch)/.test(n)) return false;
  return true;
}

// Safe fallback names per slot when nothing in pool passes constraints.
function safeAlternative(label: string, flags: SafetyFlags): { name: string; note: string } {
  if (flags.ankle && (label === 'Power / Integration' || label === 'Pattern Stress')) {
    return { name: 'Assault Bike Sprint', note: 'Alternativa zero-impact (ankle clearing positivo)' };
  }
  if (flags.shoulder && label === 'Pattern Stress') {
    return { name: 'Goblet Squat (presa neutra)', note: 'Evita pressa overhead (shoulder clearing positivo)' };
  }
  if (flags.spinalFlexion && label === 'Core Stability') {
    return { name: 'Dead Bug', note: 'Alternativa anti-estensione (spinal flexion clearing positivo)' };
  }
  if (flags.spinalExtension && label === 'Core Stability') {
    return { name: 'Half-Kneeling Pallof Press', note: 'Evita estensione spinale caricata' };
  }
  return { name: '—', note: 'Nessuna opzione sicura — consulta protocollo correttivo.' };
}

function pickRandom<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

function pickSafe(pool: ExerciseRow[], flags: SafetyFlags): ExerciseRow | null {
  const safe = pool.filter(e => isSafe(e, flags));
  return pickRandom(safe);
}

function doseFor(ex: ExerciseRow | null, fallback = '—'): string {
  if (!ex) return fallback;
  if (ex.default_sets && ex.default_reps_time) return `${ex.default_sets} Serie x ${ex.default_reps_time}`;
  return ex.dose ?? fallback;
}

// Goal-aware preference scoring — higher = better fit for goal.
function goalScore(ex: ExerciseRow, goal: Goal): number {
  const n = ex.name.toLowerCase();
  let s = 0;
  if (goal === 'strength') {
    if (/(deadlift|back squat|front squat|goblet squat|bench|row|press)/.test(n)) s += 3;
    if (ex.phase === 'Reinforce') s += 2;
  } else if (goal === 'hypertrophy') {
    if (/(single|split|bulgarian|unilateral|one[- ]?arm|lunge)/.test(n)) s += 3;
    if (ex.phase === 'Reinforce') s += 1;
  } else if (goal === 'metabolic') {
    if (/(swing|slam|burpee|jump|sprint|thruster|carry|lunge|skipping)/.test(n)) s += 3;
    if (ex.ramp_category === 'F' || ex.workout_target === 'Full Body') s += 2;
  } else if (goal === 'rehab') {
    if (/(half[- ]?kneeling|chop|lift|bird dog|dead bug|quadruped|tall kneeling)/.test(n)) s += 3;
    if (ex.phase === 'Reactivate' || ex.phase === 'Reset') s += 2;
  }
  return s;
}

function pickByGoal(pool: ExerciseRow[], flags: SafetyFlags, goal: Goal): ExerciseRow | null {
  const safe = pool.filter(e => isSafe(e, flags));
  if (safe.length === 0) return null;
  const ranked = [...safe].sort((a, b) => goalScore(b, goal) - goalScore(a, goal));
  const top = ranked.filter(e => goalScore(e, goal) === goalScore(ranked[0], goal));
  return pickRandom(top);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestFms: FmsAssessmentRow | null;
  clientName?: string;
}

export default function TrialSessionModal({ open, onOpenChange, latestFms, clientName }: Props) {
  const priority = useMemo(
    () => (latestFms ? getCorrectivePriority(latestFms as unknown as FmsScores) : null),
    [latestFms],
  );
  const patternKey = priority?.patternKey && priority.patternKey !== 'none' && priority.patternKey !== 'pain'
    ? priority.patternKey
    : 'aslr';

  const flags = useMemo(() => getSafetyFlags(latestFms), [latestFms]);
  const hasAnyFlag = flags.ankle || flags.shoulder || flags.spinalExtension || flags.spinalFlexion;

  const [goal, setGoal] = useState<Goal | ''>('');
  const [loading, setLoading] = useState(false);

  // RAMP-6 prep
  const [reset, setReset] = useState<ExerciseRow | null>(null);
  const [reactivate, setReactivate] = useState<ExerciseRow | null>(null);
  const [reinforce, setReinforce] = useState<ExerciseRow | null>(null);
  const [raise, setRaise] = useState<ExerciseRow | null>(null);
  const [activateExtra, setActivateExtra] = useState<ExerciseRow | null>(null);
  const [potentiate, setPotentiate] = useState<ExerciseRow | null>(null);

  // Discovery
  const [discovery, setDiscovery] = useState<DiscoveryItem[]>([]);

  // Reset goal each time modal reopens
  useEffect(() => { if (open) setGoal(''); }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [
        { data: pRows },
        { data: aRows },
        { data: dRows },
        { data: fRows },
        { data: stressRows },
        { data: asymRowsA },
        { data: asymRowsB },
        { data: coreRotaryRows },
        { data: coreTspuRows },
        { data: powerRows },
        { data: rehabReactivateRows },
        { data: rehabResetRows },
      ] = await Promise.all([
        supabase.from('exercises_library').select('*').eq('pattern', patternKey),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'A'),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'D').eq('workout_target', 'Full Body'),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'F').eq('workout_target', 'Full Body'),
        supabase.from('exercises_library').select('*').eq('pattern', patternKey).eq('phase', 'Reinforce'),
        supabase.from('exercises_library').select('*').ilike('name', '%Single Leg%'),
        supabase.from('exercises_library').select('*').ilike('name', '%Split Squat%'),
        supabase.from('exercises_library').select('*').eq('pattern', 'Rotary_Stability').eq('phase', 'Reactivate'),
        supabase.from('exercises_library').select('*').eq('pattern', 'TSPU').eq('phase', 'Reactivate'),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'F'),
        supabase.from('exercises_library').select('*').eq('phase', 'Reactivate'),
        supabase.from('exercises_library').select('*').eq('phase', 'Reset'),
      ]);
      if (cancelled) return;

      const pAll = (pRows ?? []) as ExerciseRow[];
      setReset(pickSafe(pAll.filter(r => r.phase === 'Reset'), flags));
      setReactivate(pickSafe(pAll.filter(r => r.phase === 'Reactivate'), flags));
      setReinforce(pickSafe(pAll.filter(r => r.phase === 'Reinforce'), flags));
      setRaise(pickSafe((aRows ?? []) as ExerciseRow[], flags));
      setActivateExtra(pickSafe((dRows ?? []) as ExerciseRow[], flags));
      setPotentiate(pickSafe((fRows ?? []) as ExerciseRow[], flags));

      // ---- Discovery Workout ----
      if (!goal) {
        setDiscovery([]);
        setLoading(false);
        return;
      }

      const params = GOAL_PARAMS[goal];
      const items: DiscoveryItem[] = [];

      // Pool selection per goal
      const stressPool = goal === 'rehab'
        ? ((rehabReactivateRows ?? []) as ExerciseRow[]).filter(r => r.pattern === patternKey)
        : (stressRows ?? []) as ExerciseRow[];

      const asymBase = [...((asymRowsA ?? []) as ExerciseRow[]), ...((asymRowsB ?? []) as ExerciseRow[])];
      const corePool = [...((coreRotaryRows ?? []) as ExerciseRow[]), ...((coreTspuRows ?? []) as ExerciseRow[])];
      const powerPool = goal === 'rehab'
        ? ((rehabResetRows ?? []) as ExerciseRow[])
        : ((powerRows ?? []) as ExerciseRow[]);

      const slots: { label: string; pool: ExerciseRow[]; defaultName: string }[] = [
        { label: 'Pattern Stress', pool: stressPool, defaultName: 'Goblet Squat' },
        { label: 'Asymmetry Challenge', pool: asymBase, defaultName: 'Bulgarian Split Squat' },
        { label: 'Core Stability', pool: corePool, defaultName: 'Bird Dog' },
        { label: 'Power / Integration', pool: powerPool, defaultName: 'Med Ball Slam' },
      ];

      for (const slot of slots) {
        const pick = pickByGoal(slot.pool, flags, goal);
        if (pick) {
          items.push({
            label: slot.label,
            name: pick.name,
            dose: `${params.sets} x ${params.reps}`,
            note: params.note,
          });
        } else {
          // Try unsafe pool just to check if downgrade is needed
          const unsafePick = pickRandom(slot.pool);
          if (unsafePick && !isSafe(unsafePick, flags)) {
            const alt = safeAlternative(slot.label, flags);
            items.push({
              label: slot.label,
              name: alt.name,
              dose: `${params.sets} x ${params.reps}`,
              note: params.note,
              downgraded: alt.note,
            });
          } else {
            const alt = safeAlternative(slot.label, flags);
            items.push({
              label: slot.label,
              name: slot.defaultName,
              dose: `${params.sets} x ${params.reps}`,
              note: params.note,
              downgraded: hasAnyFlag ? alt.note : undefined,
            });
          }
        }
      }

      setDiscovery(items);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, patternKey, goal, flags, hasAnyFlag]);

  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  const focusLabel = priority?.focus ?? 'Pattern Globale';
  const goalLabel = goal ? GOAL_OPTIONS.find(g => g.value === goal)?.label : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div id="trial-session-print" className="bg-background">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Sessione di Prova · Trial
              </div>
              <h2 className="font-display font-bold text-xl mt-1 truncate">
                {clientName ?? 'Atleta'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {today}{goalLabel ? ` · Obiettivo: ${goalLabel}` : ''}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              disabled={!goal}
              className="no-print shrink-0"
            >
              <Printer className="w-4 h-4 mr-2" />
              Stampa / PDF
            </Button>
          </div>

          {/* Goal Selector */}
          <div className="px-6 pt-4 pb-2 no-print">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Obiettivo del Cliente
            </label>
            <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona un obiettivo per generare il workout…" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasAnyFlag && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                <div className="text-[11px] text-destructive leading-snug">
                  <strong className="font-bold">Vincoli clinici attivi:</strong>{' '}
                  {[
                    flags.ankle && 'Ankle Clearing +',
                    flags.shoulder && 'Shoulder Clearing +',
                    flags.spinalExtension && 'Spinal Extension +',
                    flags.spinalFlexion && 'Spinal Flexion +',
                  ].filter(Boolean).join(' · ')}. Le selezioni non sicure verranno automaticamente sostituite.
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Generazione sessione…
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Section 1 — Weak Link */}
              <section className="rounded-lg border border-warning/40 bg-warning/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-warning" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                    1. Il tuo Weak Link
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Limitazione Primaria Rilevata:</p>
                <p className="font-display font-bold text-base">{focusLabel}</p>
                {priority?.clientExplanation && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {priority.clientExplanation}
                  </p>
                )}
              </section>

              {/* Section 2 — RAMP-6 Prep */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                    2. RAMP-6 Prep · The Cure
                  </h3>
                </div>
                <div className="space-y-2">
                  <RampRow
                    icon={Flame}
                    color="red"
                    num="1"
                    title="RAISE"
                    name={raise?.name ?? (flags.ankle ? 'Rower / Assault Bike' : 'Assault Bike / Rower / Skipping')}
                    dose={doseFor(raise, '3-5 Min · RPE 5-6')}
                  />
                  <RampRow
                    icon={Droplet}
                    color="blue"
                    num="2"
                    title="MOBILIZE"
                    name={reset?.name ?? '—'}
                    dose={doseFor(reset)}
                    meta={reset?.posture_name ? `L${reset.posture_level} · ${reset.posture_name}` : undefined}
                  />
                  <RampRow
                    icon={ActivityIcon}
                    color="green"
                    num="3"
                    title="ACTIVATE"
                    name={reactivate?.name ?? '—'}
                    dose={doseFor(reactivate)}
                    meta={reactivate?.posture_name ? `L${reactivate.posture_level} · ${reactivate.posture_name}` : undefined}
                  />
                  {activateExtra && (
                    <RampRow
                      icon={ActivityIcon}
                      color="green"
                      num="3b"
                      title="ACTIVATE · Full Body"
                      name={activateExtra.name}
                      dose={doseFor(activateExtra)}
                    />
                  )}
                  <RampRow
                    icon={Zap}
                    color="orange"
                    num="4"
                    title="POTENTIATE"
                    name={potentiate?.name ?? reinforce?.name ?? '—'}
                    dose={doseFor(potentiate ?? reinforce)}
                  />
                </div>
              </section>

              {/* Section 3 — Discovery Workout */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                    3. Discovery Workout · The Challenge
                  </h3>
                </div>
                {!goal ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                    <Target className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-display font-semibold">Seleziona un obiettivo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scegli l'obiettivo del cliente per generare il Discovery Workout calibrato.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {GOAL_PARAMS[goal].circuitInfo}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {discovery.map((item, i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-4">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                            {String(i + 1).padStart(2, '0')} · {item.label}
                          </div>
                          <div className="font-display font-semibold text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{item.dose}</div>
                          {item.note && (
                            <div className="text-[10px] text-warning font-semibold mt-1 uppercase tracking-wider">
                              {item.note}
                            </div>
                          )}
                          {item.downgraded && (
                            <div className="mt-2 flex items-start gap-1 text-[10px] text-destructive font-semibold">
                              <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{item.downgraded}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Section 4 — Safe Strength · Commercial gym alternatives */}
              <SafeStrengthCard
                patternKey={priority?.patternKey}
                focusLabel={focusLabel}
                variant="inline"
                limit={3}
              />

              <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
                Sessione generata on-the-fly · non salvata nello storico clinico.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RampRowProps {
  icon: typeof Flame;
  color: 'red' | 'blue' | 'green' | 'orange';
  num: string;
  title: string;
  name: string;
  dose: string;
  meta?: string;
}

const COLOR_MAP: Record<RampRowProps['color'], { bg: string; text: string; border: string }> = {
  red:    { bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',       border: 'border-l-red-500' },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',     border: 'border-l-blue-500' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-600 dark:text-green-400',   border: 'border-l-green-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-l-orange-500' },
};

function RampRow({ icon: Icon, color, num, title, name, dose, meta }: RampRowProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-lg border border-border border-l-4 ${c.border} bg-card p-3 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-md ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>
          {num} · {title}
        </div>
        <div className="font-display font-semibold text-sm truncate">{name}</div>
        <div className="text-xs text-muted-foreground">{dose}</div>
        {meta && <div className="text-[10px] text-muted-foreground/80">{meta}</div>}
      </div>
    </div>
  );
}
