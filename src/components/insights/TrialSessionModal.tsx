import { useEffect, useMemo, useState } from 'react';
import { Printer, Flame, Droplet, Activity as ActivityIcon, Zap, Target, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestFms: FmsAssessmentRow | null;
  clientName?: string;
}

function pickRandom<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

function doseFor(ex: ExerciseRow | null, fallback = '—'): string {
  if (!ex) return fallback;
  if (ex.default_sets && ex.default_reps_time) return `${ex.default_sets} Serie x ${ex.default_reps_time}`;
  return ex.dose ?? fallback;
}

export default function TrialSessionModal({ open, onOpenChange, latestFms, clientName }: Props) {
  const priority = useMemo(
    () => (latestFms ? getCorrectivePriority(latestFms as unknown as FmsScores) : null),
    [latestFms],
  );
  const patternKey = priority?.patternKey && priority.patternKey !== 'none' && priority.patternKey !== 'pain'
    ? priority.patternKey
    : 'aslr';

  const [loading, setLoading] = useState(false);
  const [reset, setReset] = useState<ExerciseRow | null>(null);
  const [reactivate, setReactivate] = useState<ExerciseRow | null>(null);
  const [reinforce, setReinforce] = useState<ExerciseRow | null>(null);
  const [raise, setRaise] = useState<ExerciseRow | null>(null);
  const [activateExtra, setActivateExtra] = useState<ExerciseRow | null>(null);
  const [potentiate, setPotentiate] = useState<ExerciseRow | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryItem[]>([]);

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
      ] = await Promise.all([
        supabase.from('exercises_library').select('*').eq('pattern', patternKey),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'A'),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'D').eq('workout_target', 'Full Body'),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'F').eq('workout_target', 'Full Body'),
        // Discovery 1 — Pattern Stress
        supabase.from('exercises_library').select('*').eq('pattern', patternKey).eq('phase', 'Reinforce'),
        // Discovery 2 — Asymmetry Challenge
        supabase.from('exercises_library').select('*').ilike('name', '%Single Leg%'),
        supabase.from('exercises_library').select('*').ilike('name', '%Split Squat%'),
        // Discovery 3 — Core Stability
        supabase.from('exercises_library').select('*').eq('pattern', 'Rotary_Stability').eq('phase', 'Reactivate'),
        supabase.from('exercises_library').select('*').eq('pattern', 'TSPU').eq('phase', 'Reactivate'),
        // Discovery 4 — Power / Integration
        supabase.from('exercises_library').select('*').eq('ramp_category', 'F'),
      ]);
      if (cancelled) return;

      const pAll = (pRows ?? []) as ExerciseRow[];
      setReset(pickRandom(pAll.filter(r => r.phase === 'Reset')));
      const reactivateEx = pickRandom(pAll.filter(r => r.phase === 'Reactivate'));
      setReactivate(reactivateEx);
      setReinforce(pickRandom(pAll.filter(r => r.phase === 'Reinforce')));
      setRaise(pickRandom((aRows ?? []) as ExerciseRow[]));
      setActivateExtra(pickRandom((dRows ?? []) as ExerciseRow[]));
      setPotentiate(pickRandom((fRows ?? []) as ExerciseRow[]));

      // ---- Discovery Workout (4 exercises) ----
      const items: DiscoveryItem[] = [];

      // 1. Pattern Stress
      const stress = pickRandom((stressRows ?? []) as ExerciseRow[]);
      items.push({
        label: 'Pattern Stress',
        name: stress?.name ?? 'Goblet Squat',
        dose: stress?.default_reps_time ? `3 Serie x ${stress.default_reps_time}` : '3 Serie x 8 reps',
        note: 'Tempo 4-2-1-0',
      });

      // 2. Asymmetry Challenge
      const asymPool = [...((asymRowsA ?? []) as ExerciseRow[]), ...((asymRowsB ?? []) as ExerciseRow[])];
      const asym = pickRandom(asymPool);
      items.push({
        label: 'Asymmetry Challenge',
        name: asym?.name ?? 'Bulgarian Split Squat',
        dose: asym?.default_reps_time ? `3 Serie x ${asym.default_reps_time}` : '3 Serie x 8 reps/lato',
      });

      // 3. Core Stability
      const corePool = [...((coreRotaryRows ?? []) as ExerciseRow[]), ...((coreTspuRows ?? []) as ExerciseRow[])];
      const core = pickRandom(corePool);
      items.push({
        label: 'Core Stability',
        name: core?.name ?? 'Bird Dog',
        dose: doseFor(core, '3 Serie x 8 reps/lato'),
      });

      // 4. Power / Integration
      const power = pickRandom((powerRows ?? []) as ExerciseRow[]);
      items.push({
        label: 'Power / Integration',
        name: power?.name ?? 'Med Ball Slam',
        dose: doseFor(power, '3 Serie x 5 reps'),
      });

      setDiscovery(items);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, patternKey]);

  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  const focusLabel = priority?.focus ?? 'Pattern Globale';

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
              <p className="text-xs text-muted-foreground mt-0.5">{today}</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              className="no-print shrink-0"
            >
              <Printer className="w-4 h-4 mr-2" />
              Stampa / PDF
            </Button>
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
                    name={raise?.name ?? 'Assault Bike / Rower / Skipping'}
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
                <p className="text-xs text-muted-foreground mb-3">
                  Circuito a 4 stazioni · 60-90&quot; rest · 2-3 round
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
                    </div>
                  ))}
                </div>
              </section>

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
