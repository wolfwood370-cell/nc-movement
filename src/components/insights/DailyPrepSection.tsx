import { useEffect, useMemo, useState } from 'react';
import { Flame, Play, Sparkles, Zap, Activity as ActivityIcon, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ExerciseVideoDialog from '@/components/insights/ExerciseVideoDialog';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import type { FmsAssessmentRow } from '@/lib/insights';

type PatternKey =
  | 'deep_squat' | 'hurdle_step' | 'inline_lunge' | 'shoulder_mobility'
  | 'aslr' | 'trunk_stability_pushup' | 'rotary_stability';

type WorkoutFocus = 'Lower Body' | 'Upper Body' | 'Full Body';

const PATTERN_OPTIONS: { value: PatternKey; label: string }[] = [
  { value: 'aslr',                   label: 'ASLR' },
  { value: 'shoulder_mobility',      label: 'Shoulder Mobility' },
  { value: 'trunk_stability_pushup', label: 'Trunk Stability Push-Up' },
  { value: 'rotary_stability',       label: 'Rotary Stability' },
  { value: 'deep_squat',             label: 'Deep Squat' },
  { value: 'hurdle_step',            label: 'Hurdle Step' },
  { value: 'inline_lunge',           label: 'Inline Lunge' },
];

const FOCUS_OPTIONS: WorkoutFocus[] = ['Lower Body', 'Upper Body', 'Full Body'];

interface ExerciseRow {
  id: string;
  pattern: string;
  phase: 'Reset' | 'Reactivate' | 'Reinforce';
  posture_level: number;
  posture_name: string;
  name: string;
  goal: string | null;
  dose: string | null;
  video_url: string | null;
  default_sets: string | null;
  default_reps_time: string | null;
  ramp_category: string | null;
  workout_target: string | null;
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

interface CardProps {
  title: string;
  exercise?: ExerciseRow | null;
  fallbackText?: string;
  staticDose?: string;
  onPlay?: (url: string, name: string) => void;
}

function ExerciseCard({ title, exercise, fallbackText, staticDose, onPlay }: CardProps) {
  const sets = exercise?.default_sets;
  const reps = exercise?.default_reps_time;
  const dose = staticDose ?? (sets && reps ? `${sets} Serie x ${reps}` : exercise?.dose ?? '—');
  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
        <div className="font-display font-semibold text-sm truncate mt-0.5">
          {exercise?.name ?? fallbackText ?? '—'}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{dose}</div>
        {exercise?.posture_name && (
          <div className="text-[10px] text-muted-foreground/80 mt-0.5">L{exercise.posture_level} · {exercise.posture_name}</div>
        )}
      </div>
      {exercise?.video_url && onPlay && (
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full shrink-0"
          onClick={() => onPlay(exercise.video_url!, exercise.name)}
          aria-label="Riproduci video"
        >
          <Play className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, hint }: { icon: typeof Flame; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="font-display font-bold text-sm">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

interface Props {
  latestFms: FmsAssessmentRow | null;
}

/**
 * Detect the FMS "Weak Link" from the latest assessment and use it as the
 * default priority. The shared `getCorrectivePriority` helper already encodes
 * the lowest-score-wins + clinical-hierarchy tie-breaking rules.
 */
function detectDefaultPattern(latestFms: FmsAssessmentRow | null): PatternKey {
  if (!latestFms) return 'aslr';
  const priority = getCorrectivePriority(latestFms as unknown as FmsScores);
  const allowed = PATTERN_OPTIONS.map(p => p.value);
  if (allowed.includes(priority.patternKey as PatternKey)) {
    return priority.patternKey as PatternKey;
  }
  return 'aslr';
}

export default function DailyPrepSection({ latestFms }: Props) {
  const defaultPattern = useMemo(() => detectDefaultPattern(latestFms), [latestFms]);

  const [pattern, setPattern] = useState<PatternKey>(defaultPattern);
  const [focus, setFocus] = useState<WorkoutFocus>('Full Body');

  // Re-sync when the detected weak link changes (e.g., new FMS loaded).
  useEffect(() => { setPattern(defaultPattern); }, [defaultPattern]);

  const [reset, setReset] = useState<ExerciseRow | null>(null);
  const [reactivate, setReactivate] = useState<ExerciseRow | null>(null);
  const [reinforce, setReinforce] = useState<ExerciseRow | null>(null);
  const [activateExtra, setActivateExtra] = useState<ExerciseRow | null>(null);
  const [potentiate, setPotentiate] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');

  // Fetch 3R exercises whenever pattern changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('exercises_library')
        .select('*')
        .eq('pattern', pattern);
      if (cancelled) return;
      const rows = (data ?? []) as ExerciseRow[];
      setReset(pickRandom(rows.filter(r => r.phase === 'Reset')));
      setReactivate(pickRandom(rows.filter(r => r.phase === 'Reactivate')));
      setReinforce(pickRandom(rows.filter(r => r.phase === 'Reinforce')));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pattern]);

  // Fetch RAMP-6 D & F exercises whenever focus changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: dRows } = await supabase
        .from('exercises_library')
        .select('*')
        .eq('ramp_category', 'D')
        .eq('workout_target', focus);
      const { data: fRows } = await supabase
        .from('exercises_library')
        .select('*')
        .eq('ramp_category', 'F')
        .eq('workout_target', focus);
      if (cancelled) return;
      setActivateExtra(pickRandom((dRows ?? []) as ExerciseRow[]));
      const fAll = (fRows ?? []) as ExerciseRow[];
      const shuffled = [...fAll].sort(() => Math.random() - 0.5).slice(0, 2);
      setPotentiate(shuffled);
    })();
    return () => { cancelled = true; };
  }, [focus]);

  const onPlay = (url: string, title: string) => { setVideoUrl(url); setVideoTitle(title); };

  const patternLabel = useMemo(
    () => PATTERN_OPTIONS.find(p => p.value === pattern)?.label ?? pattern,
    [pattern],
  );
  const isAutoDetected = pattern === defaultPattern;

  return (
    <section className="surface-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" /> Daily Prep & RAMP-6
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Protocolli quotidiani basati sulla priorità FMS rilevata e sul focus dell'allenamento.
          </p>
        </div>
        {latestFms && isAutoDetected && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Weak Link auto
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            FMS Priority
          </label>
          <Select value={pattern} onValueChange={(v) => setPattern(v as PatternKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PATTERN_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}{opt.value === defaultPattern && latestFms ? ' · Weak Link' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Workout Focus
          </label>
          <Select value={focus} onValueChange={(v) => setFocus(v as WorkoutFocus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FOCUS_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="threer" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="threer">Protocollo 3R (Quotidiano)</TabsTrigger>
          <TabsTrigger value="ramp">RAMP-6 (Pre-Workout)</TabsTrigger>
        </TabsList>

        <TabsContent value="threer" className="mt-4 space-y-5">
          <div className="text-xs text-muted-foreground">
            Pattern: <span className="font-semibold text-foreground">{patternLabel}</span>
          </div>

          <div>
            <SectionHeader icon={Flame} label="1. RESET" hint="Ripristina mobilità e input sensoriale" />
            {loading ? <Skeleton className="h-20 w-full" /> :
              <ExerciseCard title="Reset" exercise={reset} fallbackText="Nessun esercizio trovato" onPlay={onPlay} />}
          </div>

          <div>
            <SectionHeader icon={Sparkles} label="2. REACTIVATE" hint="Riattiva il controllo motorio" />
            {loading ? <Skeleton className="h-20 w-full" /> :
              <ExerciseCard title="Reactivate" exercise={reactivate} fallbackText="Nessun esercizio trovato" onPlay={onPlay} />}
          </div>

          <div>
            <SectionHeader icon={Dumbbell} label="3. REINFORCE" hint="Consolida lo schema motorio" />
            {loading ? <Skeleton className="h-20 w-full" /> :
              <ExerciseCard title="Reinforce" exercise={reinforce} fallbackText="Nessun esercizio trovato" onPlay={onPlay} />}
          </div>
        </TabsContent>

        <TabsContent value="ramp" className="mt-4 space-y-5">
          <div className="text-xs text-muted-foreground">
            Pattern: <span className="font-semibold text-foreground">{patternLabel}</span> ·
            Focus: <span className="font-semibold text-foreground"> {focus}</span>
          </div>

          <div>
            <SectionHeader icon={ActivityIcon} label="1. RAISE" hint="Innalza la temperatura corporea" />
            <ExerciseCard
              title="Cardio Warm-up"
              fallbackText="Assault Bike / Rower / Skipping"
              staticDose="3-5 Min · RPE 5-6"
            />
          </div>

          <div>
            <SectionHeader icon={Flame} label="2. MOBILIZE" hint="Mobilità mirata sul pattern debole" />
            {loading ? <Skeleton className="h-20 w-full" /> :
              <ExerciseCard title="Reset (Pattern Specifico)" exercise={reset} fallbackText="Nessun esercizio trovato" onPlay={onPlay} />}
          </div>

          <div className="space-y-3">
            <SectionHeader icon={Sparkles} label="3. ACTIVATE" hint="Attivazione neuromuscolare specifica" />
            {loading ? <Skeleton className="h-20 w-full" /> :
              <ExerciseCard title="Reactivate (Pattern)" exercise={reactivate} fallbackText="Nessun esercizio trovato" onPlay={onPlay} />}
            <ExerciseCard
              title={`Attivazione ${focus}`}
              exercise={activateExtra}
              fallbackText="In arrivo · Categoria D non ancora popolata"
              onPlay={onPlay}
            />
          </div>

          <div className="space-y-3">
            <SectionHeader icon={Zap} label="4. POTENTIATE" hint="Potenziamento esplosivo pre-workout" />
            {potentiate.length === 0 ? (
              <ExerciseCard
                title={`Potenziamento ${focus}`}
                fallbackText="In arrivo · Categoria F non ancora popolata"
              />
            ) : (
              potentiate.map((ex, i) => (
                <ExerciseCard
                  key={ex.id}
                  title={`Potenziamento ${i + 1}`}
                  exercise={ex}
                  onPlay={onPlay}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ExerciseVideoDialog
        open={!!videoUrl}
        onClose={() => setVideoUrl(null)}
        url={videoUrl}
        title={videoTitle}
      />
    </section>
  );
}
