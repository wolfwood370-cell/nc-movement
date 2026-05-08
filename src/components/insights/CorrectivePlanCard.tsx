import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Info, Loader2, Sparkles, Printer, PlayCircle,
  ArrowDownCircle, ArrowUpCircle, Flame, Droplet, Activity as ActivityIcon, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import {
  getCorrectiveProtocol,
  deriveClinicalConstraints,
  filterRaiseCandidates,
  filterPotentiateCandidates,
  type ConstraintTag,
} from '@/lib/correctiveProtocols';
import { useCorrectiveExercises, type ExerciseRow, type CorrectivePhase } from '@/hooks/useCorrectiveExercises';
import ExerciseVideoDialog from './ExerciseVideoDialog';

interface ClientLite {
  full_name: string;
  date_of_birth?: string | null;
}

interface Props {
  fms?: Partial<FmsScores> | null;
  client?: ClientLite | null;
}

type WorkoutFocus = 'Lower Body' | 'Upper Body' | 'Full Body';
const FOCUS_OPTIONS: WorkoutFocus[] = ['Lower Body', 'Upper Body', 'Full Body'];

// Phase color theme — explicit palette per spec to ensure consistent semantic cues.
type PhaseTheme = {
  border: string;     // left border accent
  bg: string;         // light tint
  iconBg: string;     // icon chip background
  iconText: string;   // icon chip foreground
  label: string;      // chip text color
};

const THEME = {
  raise:      { border: 'border-l-red-500',    bg: 'bg-red-500/5',    iconBg: 'bg-red-500/15',    iconText: 'text-red-600 dark:text-red-400',     label: 'text-red-600 dark:text-red-400' },
  mobilize:   { border: 'border-l-blue-500',   bg: 'bg-blue-500/5',   iconBg: 'bg-blue-500/15',   iconText: 'text-blue-600 dark:text-blue-400',   label: 'text-blue-600 dark:text-blue-400' },
  activate:   { border: 'border-l-green-500',  bg: 'bg-green-500/5',  iconBg: 'bg-green-500/15',  iconText: 'text-green-600 dark:text-green-400', label: 'text-green-600 dark:text-green-400' },
  potentiate: { border: 'border-l-orange-500', bg: 'bg-orange-500/5', iconBg: 'bg-orange-500/15', iconText: 'text-orange-600 dark:text-orange-400', label: 'text-orange-600 dark:text-orange-400' },
} satisfies Record<string, PhaseTheme>;

const PHASE_THEME: Record<CorrectivePhase, PhaseTheme> = {
  Reset:      THEME.mobilize,
  Reactivate: THEME.activate,
  Reinforce:  THEME.potentiate,
};

const PHASE_ORDER: CorrectivePhase[] = ['Reset', 'Reactivate', 'Reinforce'];

function pickRandom<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

function doseFor(ex?: ExerciseRow | null): string | null {
  if (!ex) return null;
  if (ex.default_sets && ex.default_reps_time) return `${ex.default_sets} Serie x ${ex.default_reps_time}`;
  return ex.dose ?? null;
}

export default function CorrectivePlanCard({ fms, client }: Props) {
  const { loading, exercises } = useCorrectiveExercises(fms ?? null);
  const [overrides, setOverrides] = useState<Partial<Record<CorrectivePhase, ExerciseRow>>>({});
  useEffect(() => { setOverrides({}); }, [exercises]);

  const [focus, setFocus] = useState<WorkoutFocus>('Full Body');
  const [activateExtra, setActivateExtra] = useState<ExerciseRow | null>(null);
  const [potentiate, setPotentiate] = useState<ExerciseRow[]>([]);
  const [raise, setRaise] = useState<ExerciseRow | null>(null);
  const [rampLoading, setRampLoading] = useState(false);
  // Tags emitted by the clinical interceptor when an unsafe candidate was filtered out.
  const [raiseTag, setRaiseTag] = useState<ConstraintTag | null>(null);
  const [potentiateTag, setPotentiateTag] = useState<ConstraintTag | null>(null);

  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);

  const constraints = useMemo(() => deriveClinicalConstraints(fms ?? null), [fms]);
  const constraintList = useMemo(
    () => [constraints.lower, constraints.upper, constraints.spinal].filter(Boolean) as ConstraintTag[],
    [constraints],
  );

  // Fetch RAMP D, F, and Raise (A) exercises by focus + apply clinical constraints.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRampLoading(true);
      const [{ data: dRows }, { data: fRows }, { data: aRows }] = await Promise.all([
        supabase.from('exercises_library').select('*').eq('ramp_category', 'D').eq('workout_target', focus),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'F').eq('workout_target', focus),
        supabase.from('exercises_library').select('*').eq('ramp_category', 'A'),
      ]);
      if (cancelled) return;

      // Activate-extra (cat D) is focus-specific isolation; no impact constraints applied.
      setActivateExtra(pickRandom((dRows ?? []) as ExerciseRow[]));

      // Raise (cat A) — apply Constraints A & B.
      const aSafe = filterRaiseCandidates((aRows ?? []) as ExerciseRow[], constraints);
      setRaise(pickRandom(aSafe.rows));
      setRaiseTag(aSafe.appliedTag);

      // Potentiate (cat F) — apply Constraints A, B & C.
      const fSafe = filterPotentiateCandidates((fRows ?? []) as ExerciseRow[], constraints);
      setPotentiate([...fSafe.rows].sort(() => Math.random() - 0.5).slice(0, 2));
      setPotentiateTag(fSafe.appliedTag);

      setRampLoading(false);
    })();
    return () => { cancelled = true; };
  }, [focus, constraints]);

  const display = useMemo(() => {
    const out: Partial<Record<CorrectivePhase, ExerciseRow>> = {};
    for (const ph of PHASE_ORDER) out[ph] = overrides[ph] ?? exercises[ph];
    return out;
  }, [overrides, exercises]);

  async function swap(phase: CorrectivePhase, pattern: string, name: string) {
    const { data } = await supabase
      .from('exercises_library').select('*').eq('pattern', pattern).eq('name', name).limit(1).maybeSingle();
    if (data) setOverrides(prev => ({ ...prev, [phase]: data as ExerciseRow }));
  }

  // ---- Gating: no FMS / incomplete / optimal / red flag ------------------
  if (!fms) return <ShellEmpty title="Protocollo Correttivo & RAMP-6" body="Esegui un FMS per generare automaticamente il protocollo." />;

  const priority = getCorrectivePriority(fms as FmsScores);

  if (priority.level === 'optimal') {
    return (
      <Card className="surface-card border-functional/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-functional" /> Baseline Ottimale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Movement baseline ottimale. Procedi alla programmazione di performance training.</p>
          <p className="text-xs text-muted-foreground">{priority.detail}</p>
        </CardContent>
      </Card>
    );
  }

  if (priority.level === 'incomplete') {
    return <ShellEmpty title="Protocollo Correttivo & RAMP-6" body={priority.detail ?? 'FMS incompleto.'} />;
  }

  if (priority.level === 'red_flag') {
    return (
      <Card className="surface-card border-pain/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm uppercase tracking-wider text-pain font-display flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Stop Correttivi · Rinvio Clinico
            </CardTitle>
            <Badge variant="outline" className="border-pain/40 text-pain">Red Flag</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{priority.detail}</p>
        </CardContent>
      </Card>
    );
  }

  // ---- Active prescription ------------------------------------------------
  const fallback = getCorrectiveProtocol(priority.patternKey);
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <Card className="surface-card border-warning/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning" /> Protocollo Correttivo & RAMP-6
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-warning/40 text-warning">{priority.category}</Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => window.print()} className="no-print h-8">
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Esporta PDF
              </Button>
            </div>
          </div>
          <div className="pt-2 space-y-1">
            <div className="font-display font-bold text-base leading-tight">{priority.focus}</div>
            <p className="text-xs text-muted-foreground">{fallback.rationale}</p>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="threer" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="threer">Daily 3R (Routine Quotidiana)</TabsTrigger>
              <TabsTrigger value="ramp">RAMP-6 (Pre-Workout)</TabsTrigger>
            </TabsList>

            {/* ---- TAB 1: Daily 3R ---- */}
            <TabsContent value="threer" className="mt-4 space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carico esercizi…
                </div>
              ) : (
                PHASE_ORDER.map((phase, idx) => {
                  const ex = display[phase];
                  const theme = PHASE_THEME[phase];
                  const labels: Record<CorrectivePhase, { num: string; title: string; hint: string; icon: typeof Flame }> = {
                    Reset:      { num: '1', title: 'RESET',      hint: 'Mobilità & input sensoriale',  icon: Droplet },
                    Reactivate: { num: '2', title: 'REACTIVATE', hint: 'Controllo motorio',            icon: ActivityIcon },
                    Reinforce:  { num: '3', title: 'REINFORCE',  hint: 'Consolidamento dello schema',  icon: Zap },
                  };
                  const L = labels[phase];
                  if (!ex) {
                    const fb = fallback.steps.find(s => s.phase === phase);
                    return (
                      <PhaseRow
                        key={phase}
                        theme={theme}
                        Icon={L.icon}
                        sectionNum={`${idx + 1}`}
                        sectionTitle={L.title}
                        sectionHint={L.hint}
                        name={fb?.exercise ?? '—'}
                        dose={fb?.dose ?? null}
                        meta={fb?.goal ?? null}
                      />
                    );
                  }
                  return (
                    <PhaseRow
                      key={phase + ex.id}
                      theme={theme}
                      Icon={L.icon}
                      sectionNum={`${idx + 1}`}
                      sectionTitle={L.title}
                      sectionHint={L.hint}
                      name={ex.name}
                      dose={doseFor(ex)}
                      meta={ex.posture_name ? `L${ex.posture_level} · ${ex.posture_name}` : null}
                      onPlay={ex.video_url ? () => setVideo({ url: ex.video_url!, title: ex.name }) : undefined}
                      onRegression={ex.regression ? () => swap(phase, ex.pattern, ex.regression!) : undefined}
                      onProgression={ex.progression ? () => swap(phase, ex.pattern, ex.progression!) : undefined}
                    />
                  );
                })
              )}
            </TabsContent>

            {/* ---- TAB 2: RAMP-6 ---- */}
            <TabsContent value="ramp" className="mt-4 space-y-4">
              <div className="space-y-1.5 max-w-xs">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Workout Focus
                </label>
                <Select value={focus} onValueChange={(v) => setFocus(v as WorkoutFocus)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOCUS_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {/* 1. Raise */}
                {rampLoading && !raise ? <Skeleton className="h-20 w-full" /> : (
                  <PhaseRow
                    theme={THEME.raise} Icon={Flame}
                    sectionNum="1" sectionTitle="RAISE" sectionHint="Innalza temperatura & flusso ematico"
                    name={raise?.name ?? 'Assault Bike / Rower / Skipping'}
                    dose={doseFor(raise) ?? '3-5 Min · RPE 5-6'}
                    onPlay={raise?.video_url ? () => setVideo({ url: raise.video_url!, title: raise.name }) : undefined}
                    safetyTag={raiseTag}
                  />
                )}

                {/* 2. Mobilize (Reset, pattern-specific) */}
                {loading ? <Skeleton className="h-20 w-full" /> : (() => {
                  const ex = display.Reset;
                  return (
                    <PhaseRow
                      theme={THEME.mobilize} Icon={Droplet}
                      sectionNum="2" sectionTitle="MOBILIZE" sectionHint="Mobilità sul pattern debole"
                      name={ex?.name ?? '—'}
                      dose={doseFor(ex)}
                      meta={ex?.posture_name ? `L${ex.posture_level} · ${ex.posture_name}` : null}
                      onPlay={ex?.video_url ? () => setVideo({ url: ex.video_url!, title: ex.name }) : undefined}
                      onRegression={ex?.regression ? () => swap('Reset', ex.pattern, ex.regression!) : undefined}
                      onProgression={ex?.progression ? () => swap('Reset', ex.pattern, ex.progression!) : undefined}
                    />
                  );
                })()}

                {/* 3. Activate (Reactivate + focus extra) */}
                <div className="space-y-2">
                  {loading ? <Skeleton className="h-20 w-full" /> : (() => {
                    const ex = display.Reactivate;
                    return (
                      <PhaseRow
                        theme={THEME.activate} Icon={ActivityIcon}
                        sectionNum="3" sectionTitle="ACTIVATE" sectionHint="Attivazione neuromuscolare specifica"
                        name={ex?.name ?? '—'}
                        dose={doseFor(ex)}
                        meta={ex?.posture_name ? `L${ex.posture_level} · ${ex.posture_name}` : null}
                        onPlay={ex?.video_url ? () => setVideo({ url: ex.video_url!, title: ex.name }) : undefined}
                        onRegression={ex?.regression ? () => swap('Reactivate', ex.pattern, ex.regression!) : undefined}
                        onProgression={ex?.progression ? () => swap('Reactivate', ex.pattern, ex.progression!) : undefined}
                      />
                    );
                  })()}
                  <PhaseRow
                    theme={THEME.activate} Icon={ActivityIcon}
                    compact
                    sectionTitle={`Attivazione ${focus}`}
                    name={activateExtra?.name ?? 'In arrivo · Categoria D non popolata'}
                    dose={doseFor(activateExtra)}
                    onPlay={activateExtra?.video_url ? () => setVideo({ url: activateExtra.video_url!, title: activateExtra.name }) : undefined}
                  />
                </div>

                {/* 4. Potentiate */}
                <div className="space-y-2">
                  {potentiate.length === 0 ? (
                    <PhaseRow
                      theme={THEME.potentiate} Icon={Zap}
                      sectionNum="4" sectionTitle="POTENTIATE" sectionHint="Potenziamento esplosivo pre-workout"
                      name={`In arrivo · Categoria F (${focus}) non popolata`}
                      dose={null}
                    />
                  ) : (
                    potentiate.map((ex, i) => (
                      <PhaseRow
                        key={ex.id}
                        theme={THEME.potentiate} Icon={Zap}
                        sectionNum={i === 0 ? '4' : undefined}
                        sectionTitle={i === 0 ? 'POTENTIATE' : `Potenziamento ${i + 1}`}
                        sectionHint={i === 0 ? 'Potenziamento esplosivo pre-workout' : undefined}
                        compact={i > 0}
                        name={ex.name}
                        dose={doseFor(ex)}
                        onPlay={ex.video_url ? () => setVideo({ url: ex.video_url!, title: ex.name }) : undefined}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Print-only take-home protocol (3R only) */}
      <div id="take-home-print" className="hidden print:block">
        <div className="space-y-4 text-black">
          <header className="border-b-2 border-black pb-3">
            <h1 className="text-2xl font-bold">Protocollo Correttivo</h1>
            {client && (
              <div className="flex justify-between mt-2 text-sm">
                <div><strong>Cliente:</strong> {client.full_name}</div>
                <div><strong>Data:</strong> {today}</div>
              </div>
            )}
          </header>
          <section>
            <div className="text-xs uppercase tracking-wider opacity-70">Priorità Clinica</div>
            <div className="text-lg font-bold">{priority.focus}</div>
            <div className="text-xs opacity-80 mt-1">{fallback.rationale}</div>
          </section>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">Esercizi Prescritti</h2>
            <ol className="space-y-3">
              {PHASE_ORDER.map((phase) => {
                const ex = display[phase];
                if (ex) return (
                  <li key={phase} className="border border-black/40 rounded p-3">
                    <div className="text-xs font-bold uppercase tracking-wider">{phase}</div>
                    <div className="text-sm font-semibold mt-1">{ex.name}</div>
                    <div className="text-xs mt-0.5">Postura: L{ex.posture_level} · {ex.posture_name}</div>
                    {doseFor(ex) && <div className="text-xs mt-0.5"><strong>Dose:</strong> {doseFor(ex)}</div>}
                  </li>
                );
                const fb = fallback.steps.find(s => s.phase === phase);
                return fb ? (
                  <li key={phase} className="border border-black/40 rounded p-3">
                    <div className="text-xs font-bold uppercase tracking-wider">{phase}</div>
                    <div className="text-sm font-semibold mt-1">{fb.exercise}</div>
                    {fb.dose && <div className="text-xs mt-0.5"><strong>Dose:</strong> {fb.dose}</div>}
                  </li>
                ) : null;
              })}
            </ol>
          </section>
        </div>
      </div>

      <ExerciseVideoDialog
        open={!!video}
        onClose={() => setVideo(null)}
        url={video?.url ?? null}
        title={video?.title ?? ''}
      />
    </>
  );
}

// ---- Reusable phase row -------------------------------------------------
function PhaseRow({
  theme, Icon, sectionNum, sectionTitle, sectionHint, name, dose, meta,
  onPlay, onRegression, onProgression, compact, safetyTag,
}: {
  theme: PhaseTheme;
  Icon: typeof Flame;
  sectionNum?: string;
  sectionTitle?: string;
  sectionHint?: string;
  name: string;
  dose?: string | null;
  meta?: string | null;
  onPlay?: () => void;
  onRegression?: () => void;
  onProgression?: () => void;
  compact?: boolean;
  safetyTag?: ConstraintTag | null;
}) {
  return (
    <div className={`rounded-lg border border-l-4 ${theme.border} ${theme.bg} p-3 animate-fade-in`}>
      {(sectionTitle && !compact) && (
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-md ${theme.iconBg} ${theme.iconText} flex items-center justify-center shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className={`font-display font-bold text-xs uppercase tracking-wider ${theme.label}`}>
              {sectionNum ? `${sectionNum}. ` : ''}{sectionTitle}
            </div>
            {sectionHint && <div className="text-[10px] text-muted-foreground leading-tight">{sectionHint}</div>}
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {compact && sectionTitle && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{sectionTitle}</div>
          )}
          <div className="text-sm font-semibold text-foreground truncate">{name}</div>
          {dose && <div className="text-xs text-muted-foreground mt-0.5">{dose}</div>}
          {meta && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{meta}</div>}
          {safetyTag && (
            <div
              className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md bg-warning/15 text-warning text-[10px] font-semibold border border-warning/30"
              title={safetyTag.reason}
            >
              <AlertTriangle className="w-3 h-3" />
              {safetyTag.label}
            </div>
          )}

          {(onRegression || onProgression) && (
            <div className="flex items-center gap-2 mt-2 no-print">
              {onRegression && (
                <Button type="button" size="sm" variant="outline" onClick={onRegression} className="h-7 text-[11px] px-2">
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Troppo difficile
                </Button>
              )}
              {onProgression && (
                <Button type="button" size="sm" variant="outline" onClick={onProgression} className="h-7 text-[11px] px-2">
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Troppo facile
                </Button>
              )}
            </div>
          )}
        </div>
        {onPlay && (
          <button
            type="button"
            onClick={onPlay}
            aria-label="Guarda video"
            className="shrink-0 text-foreground/70 hover:text-foreground transition-colors no-print"
          >
            <PlayCircle className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

function ShellEmpty({ title, body }: { title: string; body: string }) {
  return (
    <Card className="surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
          <Info className="w-4 h-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
