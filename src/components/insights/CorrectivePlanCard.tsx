import { Activity, Dumbbell, RotateCcw, Sparkles, AlertTriangle, Info, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import {
  getCorrectiveProtocol,
  type CorrectiveStep,
} from '@/lib/correctiveProtocols';
import { useCorrectiveExercises, type ExerciseRow, type CorrectivePhase } from '@/hooks/useCorrectiveExercises';

interface Props {
  /** Latest FMS row (Partial — pattern fields used directly). */
  fms?: Partial<FmsScores> | null;
}

const PHASE_META: Record<CorrectivePhase, { icon: typeof Activity; tint: string }> = {
  Reset:      { icon: RotateCcw, tint: 'bg-primary/10 text-primary border-primary/30' },
  Reactivate: { icon: Activity,  tint: 'bg-warning/10 text-warning border-warning/30' },
  Reinforce:  { icon: Dumbbell,  tint: 'bg-functional/10 text-functional border-functional/30' },
};

const PHASE_ORDER: CorrectivePhase[] = ['Reset', 'Reactivate', 'Reinforce'];

export default function CorrectivePlanCard({ fms }: Props) {
  // Hook always called (rules of hooks); pass null when no FMS yet.
  const { loading, exercises, severity, postureRange } = useCorrectiveExercises(fms ?? null);

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

  // ---- Pain → refer out (use static pain protocol) -----------------------
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

  // ---- Dynamic prescription from exercises_library -----------------------
  const fallback = getCorrectiveProtocol(priority.patternKey);
  const severityLabel =
    severity === 'severe' ? 'Severo · Posture 1–5'
    : severity === 'moderate' ? 'Moderato · Posture 6–12'
    : '';

  return (
    <Card className="surface-card border-warning/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-warning" /> Protocollo Correttivo Raccomandato
          </CardTitle>
          <Badge variant="outline" className="border-warning/40 text-warning">{priority.category}</Badge>
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
              const ex = exercises[phase];
              if (ex) return <DynamicStepRow key={phase} phase={phase} exercise={ex} />;
              // Fallback: keep coach unblocked with static step if library has a gap.
              const fb = fallback.steps.find(s => s.phase === phase);
              return fb ? <StaticStepRow key={phase} step={fb} /> : null;
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Dynamic row (library exercise with posture badge) -------------------
function DynamicStepRow({ phase, exercise }: { phase: CorrectivePhase; exercise: ExerciseRow }) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  return (
    <li className={`rounded-xl border px-3 py-3 ${meta.tint}`}>
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
          <div className="text-sm text-foreground mt-0.5">{exercise.name}</div>
          {exercise.dose && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{exercise.dose}</div>
          )}
        </div>
      </div>
    </li>
  );
}

// ---- Static row (fallback / pain protocol) -------------------------------
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
