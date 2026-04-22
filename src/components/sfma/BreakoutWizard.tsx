import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DIAGNOSIS_META,
  type BreakoutOption,
  type BreakoutOutcome,
  type BreakoutSchema,
} from '@/lib/breakouts';

const TONE_STYLES: Record<BreakoutOption['tone'], string> = {
  success: 'border-success/40 text-success hover:bg-success/10',
  warning: 'border-warning/40 text-warning hover:bg-warning/10',
  pain: 'border-pain/40 text-pain hover:bg-pain/10',
  neutral: 'border-border text-foreground hover:bg-accent/40',
};

interface BreakoutWizardProps {
  schema: BreakoutSchema;
  initial?: BreakoutOutcome | null;
  onSave: (outcome: BreakoutOutcome) => void;
  onCancel?: () => void;
  saving?: boolean;
}

export default function BreakoutWizard({ schema, initial, onSave, onCancel, saving }: BreakoutWizardProps) {
  const [path, setPath] = useState<string[]>([schema.startNodeId]);
  const [outcome, setOutcome] = useState<BreakoutOutcome | null>(initial ?? null);

  const currentNodeId = path[path.length - 1];
  const currentNode = schema.nodes[currentNodeId];
  const totalNodes = useMemo(() => Object.keys(schema.nodes).length, [schema]);
  const progress = outcome ? 100 : Math.round((path.length / (totalNodes + 1)) * 100);

  const pick = (opt: BreakoutOption) => {
    if (opt.outcome) {
      setOutcome(opt.outcome);
      return;
    }
    if (opt.next && schema.nodes[opt.next]) {
      setPath([...path, opt.next]);
    }
  };

  const goBack = () => {
    if (outcome) {
      setOutcome(null);
      return;
    }
    if (path.length > 1) setPath(path.slice(0, -1));
  };

  const restart = () => {
    setPath([schema.startNodeId]);
    setOutcome(null);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{outcome ? 'Diagnosi' : `Nodo ${path.length} / ${totalNodes}`}</span>
          <span className="truncate ml-3">{schema.title}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {!outcome && currentNode && (
        <section className="space-y-5">
          <div className="surface-card p-5 text-center space-y-1.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Test clinico
            </div>
            <h3 className="font-display font-bold text-xl leading-tight">{currentNode.prompt}</h3>
            {currentNode.hint && (
              <p className="text-xs text-muted-foreground pt-1">{currentNode.hint}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentNode.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => pick(opt)}
                className={`tap-target w-full rounded-2xl border-2 px-5 py-5 flex items-center justify-between gap-4 transition-all bg-background ${TONE_STYLES[opt.tone]}`}
              >
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="font-display font-bold text-2xl leading-tight">{opt.label}</span>
                  {opt.subtitle && <span className="text-[11px] text-muted-foreground">{opt.subtitle}</span>}
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 opacity-50" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={path.length <= 1}
              className="tap-target"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="tap-target">
                Annulla
              </Button>
            )}
          </div>
        </section>
      )}

      {outcome && (
        <section className="space-y-4">
          <div className={`surface-card p-5 space-y-3 ${DIAGNOSIS_META[outcome.diagnosis].ring}`}>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Diagnosi finale
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center justify-center font-display font-bold text-xl px-3 py-1.5 rounded-xl ${DIAGNOSIS_META[outcome.diagnosis].chip}`}
              >
                {outcome.diagnosis}
              </span>
              <div className="min-w-0">
                <div className="font-display font-semibold leading-tight">
                  {DIAGNOSIS_META[outcome.diagnosis].full}
                </div>
                {outcome.qualifier && (
                  <div className="text-xs text-muted-foreground">{outcome.qualifier}</div>
                )}
              </div>
            </div>
            {outcome.detail && (
              <p className="text-sm text-muted-foreground border-t border-border/60 pt-3">
                {outcome.detail}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={restart} className="tap-target">
              <RotateCcw className="w-4 h-4 mr-1" /> Ripeti
            </Button>
            <Button
              type="button"
              onClick={() => onSave(outcome)}
              disabled={saving}
              className="flex-1 tap-target h-12 rounded-2xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvataggio…' : 'Salva e torna all’hub'}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
