import { Activity, Dumbbell, RotateCcw, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
import {
  getCorrectiveProtocol,
  type CorrectiveStep,
} from '@/lib/correctiveProtocols';

interface Props {
  /** Latest FMS row (Partial — pattern fields used directly). */
  fms?: Partial<FmsScores> | null;
}

const PHASE_META: Record<CorrectiveStep['phase'], { icon: typeof Activity; tint: string }> = {
  Reset:      { icon: RotateCcw, tint: 'bg-primary/10 text-primary border-primary/30' },
  Reactivate: { icon: Activity,  tint: 'bg-warning/10 text-warning border-warning/30' },
  Reinforce: { icon: Dumbbell,  tint: 'bg-functional/10 text-functional border-functional/30' },
};

export default function CorrectivePlanCard({ fms }: Props) {
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
              <StepRow key={step.phase} step={step} />
            ))}
          </ol>
        </CardContent>
      </Card>
    );
  }

  // ---- Standard prescription ---------------------------------------------
  const protocol = getCorrectiveProtocol(priority.patternKey);

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
          <p className="text-xs text-muted-foreground">{protocol.rationale}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {protocol.steps.map((step) => (
            <StepRow key={step.phase} step={step} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function StepRow({ step }: { step: CorrectiveStep }) {
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
