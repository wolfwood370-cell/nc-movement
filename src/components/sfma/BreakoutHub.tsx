import { useMemo, useState } from 'react';
import { Compass, ChevronRight, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { analyzeSfma, SFMA_PATTERNS, type SfmaFormValues, type SfmaPatternKey, type SfmaScore } from '@/lib/sfma';
import {
  BREAKOUT_SCHEMAS,
  DIAGNOSIS_META,
  type BreakoutOutcome,
  type BreakoutResults,
} from '@/lib/breakouts';
import BreakoutWizard from './BreakoutWizard';

const SCORE_CHIP: Record<SfmaScore, string> = {
  FN: 'bg-success text-success-foreground',
  DN: 'bg-warning text-warning-foreground',
  FP: 'bg-dysfunction text-white',
  DP: 'bg-pain text-white',
};

interface BreakoutHubProps {
  values: SfmaFormValues;
  results: BreakoutResults;
  onSave: (patternKey: SfmaPatternKey, outcome: BreakoutOutcome) => Promise<void> | void;
  saving?: boolean;
}

export default function BreakoutHub({ values, results, onSave, saving }: BreakoutHubProps) {
  const analysis = useMemo(() => analyzeSfma(values), [values]);
  const [openKey, setOpenKey] = useState<SfmaPatternKey | null>(null);

  // Anything not FN needs a breakout
  const items = analysis.breakouts;
  const openSchema = openKey ? BREAKOUT_SCHEMAS[openKey] : undefined;
  const openPattern = openKey ? SFMA_PATTERNS.find((p) => p.key === openKey) : undefined;

  if (items.length === 0) {
    return (
      <div className="surface-card p-6 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 mx-auto text-success" />
        <div className="font-display font-semibold">Nessun breakout necessario</div>
        <p className="text-xs text-muted-foreground">
          Tutti i pattern Top-Tier sono FN. Non servono approfondimenti.
        </p>
      </div>
    );
  }

  const completed = items.filter((b) => results[b.key]).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-primary shrink-0" />
          <div className="font-display font-semibold truncate">Breakout Hub</div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {completed}/{items.length} completati
        </span>
      </div>

      <ul className="space-y-2">
        {items.map((b) => {
          const schema = BREAKOUT_SCHEMAS[b.key];
          const outcome = results[b.key];
          const isPain = b.score === 'FP' || b.score === 'DP';
          const available = !!schema;

          return (
            <li key={b.key}>
              <button
                type="button"
                disabled={!available}
                onClick={() => available && setOpenKey(b.key)}
                className={`w-full text-left surface-card p-4 flex items-center justify-between gap-3 tap-target transition-all ${
                  available ? 'hover:border-primary/50 hover:shadow-elevated' : 'opacity-60 cursor-not-allowed'
                } ${isPain ? 'border-pain/40' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isPain && <AlertTriangle className="w-3.5 h-3.5 text-pain shrink-0" />}
                    <span className="font-medium text-sm truncate">{b.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {b.breakout}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCORE_CHIP[b.score]}`}>
                    {b.score}
                  </span>
                  {outcome ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIAGNOSIS_META[outcome.diagnosis].chip}`}
                    >
                      {outcome.diagnosis}
                    </span>
                  ) : !available ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Lock className="w-3 h-3" /> presto
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{openPattern?.label ?? 'Breakout'}</DialogTitle>
          </DialogHeader>
          {openKey && openSchema ? (
            <BreakoutWizard
              schema={openSchema}
              initial={results[openKey] ?? null}
              saving={saving}
              onCancel={() => setOpenKey(null)}
              onSave={async (outcome) => {
                await onSave(openKey, outcome);
                setOpenKey(null);
              }}
            />
          ) : openKey ? (
            <div className="surface-card p-5 text-center space-y-2">
              <Lock className="w-6 h-6 mx-auto text-muted-foreground" />
              <div className="font-display font-semibold">Breakout in arrivo</div>
              <p className="text-xs text-muted-foreground">
                Albero clinico non ancora disponibile per questo pattern. Per favore valuta manualmente.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
