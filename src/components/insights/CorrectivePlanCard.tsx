import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Dumbbell, RotateCcw, Sparkles, AlertTriangle, Info, Loader2, MapPin,
  PlayCircle, ArrowDownCircle, ArrowUpCircle, Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import {
  getCorrectiveProtocol,
  type CorrectiveStep,
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

const PHASE_META: Record<CorrectivePhase, { icon: typeof Activity; tint: string }> = {
  Reset:      { icon: RotateCcw, tint: 'bg-primary/10 text-primary border-primary/30' },
  Reactivate: { icon: Activity,  tint: 'bg-warning/10 text-warning border-warning/30' },
  Reinforce:  { icon: Dumbbell,  tint: 'bg-functional/10 text-functional border-functional/30' },
};

const PHASE_ORDER: CorrectivePhase[] = ['Reset', 'Reactivate', 'Reinforce'];

export default function CorrectivePlanCard({ fms, client }: Props) {
  const { loading, exercises, severity, postureRange } = useCorrectiveExercises(fms ?? null);

  // Local overrides from progression/regression swaps, keyed by phase.
  const [overrides, setOverrides] = useState<Partial<Record<CorrectivePhase, ExerciseRow>>>({});

  // Reset overrides whenever the underlying selection changes.
  useEffect(() => { setOverrides({}); }, [exercises]);

  // Video dialog state
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);

  // Merged display set: override > library pick.
  const display = useMemo(() => {
    const out: Partial<Record<CorrectivePhase, ExerciseRow>> = {};
    for (const ph of PHASE_ORDER) {
      out[ph] = overrides[ph] ?? exercises[ph];
    }
    return out;
  }, [overrides, exercises]);

  async function swap(phase: CorrectivePhase, pattern: string, name: string) {
    const { data } = await supabase
      .from('exercises_library')
      .select('*')
      .eq('pattern', pattern)
      .eq('name', name)
      .limit(1)
      .maybeSingle();
    if (data) setOverrides(prev => ({ ...prev, [phase]: data as ExerciseRow }));
  }

  // ---- No FMS yet ---------------------------------------------------------
  if (!fms) {
    return (
      <Card className="surface-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
            <Info className="w-4 h-4" /> Protocollo Correttivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esegui un FMS per generare automaticamente la prescrizione correttiva (Reset → Reactivate → Reinforce).
          </p>
        </CardContent>
      </Card>
    );
  }

  const priority = getCorrectivePriority(fms as FmsScores);

  // ---- Optimal baseline ---------------------------------------------------
  if (priority.level === 'optimal') {
    return (
      <Card className="surface-card border-functional/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-functional" /> Baseline Ottimale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            Movement baseline ottimale. Procedi alla programmazione di performance training.
          </p>
          <p className="text-xs text-muted-foreground">{priority.detail}</p>
        </CardContent>
      </Card>
    );
  }

  // ---- Incomplete ---------------------------------------------------------
  if (priority.level === 'incomplete') {
    return (
      <Card className="surface-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
            <Info className="w-4 h-4" /> Protocollo Correttivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{priority.detail}</p>
        </CardContent>
      </Card>
    );
  }

  // ---- Pain → refer out ---------------------------------------------------
  if (priority.level === 'red_flag') {
    const protocol = getCorrectiveProtocol('pain');
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
        <CardContent className="space-y-3">
          <p className="text-sm">{priority.detail}</p>
          <ol className="space-y-2">
            {protocol.steps.map((step) => (
              <StaticStepRow key={step.phase} step={step} />
            ))}
          </ol>
        </CardContent>
      </Card>
    );
  }

  // ---- Dynamic prescription ----------------------------------------------
  const fallback = getCorrectiveProtocol(priority.patternKey);
  const severityLabel =
    severity === 'severe' ? 'Severo · Regressione posturale'
    : severity === 'moderate' ? 'Moderato · Progressione completa'
    : '';

  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <Card className="surface-card border-warning/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-warning" /> Protocollo Correttivo Raccomandato
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-warning/40 text-warning">{priority.category}</Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="no-print h-8"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Esporta PDF
              </Button>
            </div>
          </div>
          <div className="pt-2 space-y-1">
            <div className="font-display font-bold text-base leading-tight">{priority.focus}</div>
            <p className="text-xs text-muted-foreground">{fallback.rationale}</p>
            {severityLabel && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {severityLabel}
                </Badge>
                {postureRange && (
                  <span className="text-[10px] text-muted-foreground">
                    Posture livello {postureRange[0]}–{postureRange[1]}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carico esercizi dalla libreria…
            </div>
          ) : (
            <ol className="space-y-2">
              {PHASE_ORDER.map((phase) => {
                const ex = display[phase];
                if (ex) return (
                  <DynamicStepRow
                    key={phase + ex.id}
                    phase={phase}
                    exercise={ex}
                    onPlay={() => ex.video_url && setVideo({ url: ex.video_url, title: ex.name })}
                    onRegression={ex.regression ? () => swap(phase, ex.pattern, ex.regression!) : undefined}
                    onProgression={ex.progression ? () => swap(phase, ex.pattern, ex.progression!) : undefined}
                  />
                );
                const fb = fallback.steps.find(s => s.phase === phase);
                return fb ? <StaticStepRow key={phase} step={fb} /> : null;
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Print-only take-home protocol */}
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
            {severityLabel && (
              <div className="text-xs mt-1"><em>{severityLabel}</em></div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
              Esercizi Prescritti
            </h2>
            <ol className="space-y-3">
              {PHASE_ORDER.map((phase) => {
                const ex = display[phase];
                if (ex) return (
                  <li key={phase} className="border border-black/40 rounded p-3">
                    <div className="text-xs font-bold uppercase tracking-wider">{phase}</div>
                    <div className="text-sm font-semibold mt-1">{ex.name}</div>
                    <div className="text-xs mt-0.5">
                      Postura: L{ex.posture_level} · {ex.posture_name}
                    </div>
                    {ex.goal && <div className="text-xs mt-0.5"><strong>Obiettivo:</strong> {ex.goal}</div>}
                    {ex.dose && <div className="text-xs mt-0.5"><strong>Dose:</strong> {ex.dose}</div>}
                  </li>
                );
                const fb = fallback.steps.find(s => s.phase === phase);
                return fb ? (
                  <li key={phase} className="border border-black/40 rounded p-3">
                    <div className="text-xs font-bold uppercase tracking-wider">{phase}</div>
                    <div className="text-sm font-semibold mt-1">{fb.exercise}</div>
                    <div className="text-xs mt-0.5"><strong>Obiettivo:</strong> {fb.goal}</div>
                    {fb.dose && <div className="text-xs mt-0.5"><strong>Dose:</strong> {fb.dose}</div>}
                  </li>
                ) : null;
              })}
            </ol>
          </section>

          <footer className="text-[10px] opacity-70 pt-4 border-t border-black/30">
            Documento generato automaticamente. Eseguire il protocollo sotto supervisione professionale.
          </footer>
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

// ---- Dynamic row --------------------------------------------------------
function DynamicStepRow({
  phase, exercise, onPlay, onRegression, onProgression,
}: {
  phase: CorrectivePhase;
  exercise: ExerciseRow;
  onPlay: () => void;
  onRegression?: () => void;
  onProgression?: () => void;
}) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  return (
    <li className={`rounded-xl border px-3 py-3 ${meta.tint} animate-fade-in`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-sm uppercase tracking-wider">{phase}</span>
            <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {exercise.posture_name}
            </Badge>
            <span className="text-[10px] text-muted-foreground">L{exercise.posture_level}</span>
            {exercise.goal && (
              <span className="text-[11px] text-muted-foreground">· {exercise.goal}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="text-sm text-foreground flex-1">{exercise.name}</div>
            {exercise.video_url && (
              <button
                type="button"
                onClick={onPlay}
                aria-label="Guarda video"
                className="shrink-0 text-foreground/70 hover:text-foreground transition-colors"
              >
                <PlayCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          {exercise.dose && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{exercise.dose}</div>
          )}
          {(onRegression || onProgression) && (
            <div className="flex items-center gap-2 mt-2 no-print">
              {onRegression && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRegression}
                  className="h-7 text-[11px] px-2"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1" />
                  Troppo difficile
                </Button>
              )}
              {onProgression && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onProgression}
                  className="h-7 text-[11px] px-2"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1" />
                  Troppo facile
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ---- Static row ---------------------------------------------------------
function StaticStepRow({ step }: { step: CorrectiveStep }) {
  const meta = PHASE_META[step.phase];
  const Icon = meta.icon;
  return (
    <li className={`rounded-xl border px-3 py-3 ${meta.tint}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-sm uppercase tracking-wider">{step.phase}</span>
            <span className="text-[11px] text-muted-foreground">· {step.goal}</span>
          </div>
          <div className="text-sm text-foreground mt-0.5">{step.exercise}</div>
          {step.dose && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{step.dose}</div>
          )}
        </div>
      </div>
    </li>
  );
}
