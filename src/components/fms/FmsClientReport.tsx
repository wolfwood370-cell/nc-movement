import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Printer, Activity } from 'lucide-react';
import {
  computePatterns,
  computeTotal,
  getCorrectivePriority,
  FmsScores,
  scoreColor,
  type CorrectivePriorityLevel,
  fmsMaxTotal,
  isModifiedFms,
} from '@/lib/fms';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  clientName: string;
  assessedAt?: string | null;
  scores: FmsScores;
}

type TrafficLight = 'red' | 'yellow' | 'green';

function trafficLightFor(
  level: CorrectivePriorityLevel,
  total: number | null,
  hasAsymmetry: boolean
): { color: TrafficLight; label: string; helper: string } {
  if (level === 'red_flag') {
    return {
      color: 'red',
      label: 'Rosso · Stop',
      helper: 'Dolore rilevato. Sospendere il carico e procedere con valutazione clinica.',
    };
  }
  if (level === 'incomplete') {
    return {
      color: 'yellow',
      label: 'Valutazione incompleta',
      helper: 'Compila tutti i pattern per generare il semaforo definitivo.',
    };
  }
  const score = total ?? 0;
  if (hasAsymmetry || score < 14) {
    return {
      color: 'yellow',
      label: 'Giallo · Attenzione',
      helper: hasAsymmetry
        ? 'Asimmetria L/R o punteggio < 14. Necessario lavoro correttivo prima di progredire.'
        : 'Punteggio totale < 14. Maggiore rischio di infortunio sotto carico.',
    };
  }
  return {
    color: 'green',
    label: 'Verde · Ottimale',
    helper: 'Punteggio ≥ 14 senza asimmetrie significative. Allenamento autorizzato.',
  };
}

const lightStyles: Record<TrafficLight, string> = {
  red: 'bg-pain text-destructive-foreground',
  yellow: 'bg-warning text-warning-foreground',
  green: 'bg-success text-success-foreground',
};

export default function FmsClientReport({ clientName, assessedAt, scores }: Props) {
  const patterns = useMemo(() => computePatterns(scores), [scores]);
  const total = useMemo(() => computeTotal(patterns), [patterns]);
  const priority = useMemo(() => getCorrectivePriority(scores), [scores]);
  const hasAsymmetry = patterns.some(p => p.asymmetric);
  const light = trafficLightFor(priority.level, total, hasAsymmetry);
  const modified = isModifiedFms(scores);
  const maxTotal = fmsMaxTotal(scores);

  const dateLabel = assessedAt
    ? new Date(assessedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  const LightIcon = light.color === 'red' ? ShieldAlert : light.color === 'yellow' ? AlertTriangle : CheckCircle2;

  return (
    <div className="space-y-5 pb-6 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 print:border-b print:pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">FMS · Report Cliente</p>
          <h1 className="font-display font-bold text-2xl leading-tight">{clientName}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">Valutazione del {dateLabel}</p>
            {modified && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary text-primary">
                FMS Modificato (Trial)
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer className="w-4 h-4 mr-1.5" /> Stampa
        </Button>
      </div>

      {/* Section A — Safety Traffic Light */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
            A · Indice di Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`rounded-xl p-4 flex items-center gap-3 ${lightStyles[light.color]}`}>
            <LightIcon className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <div className="font-display font-bold text-lg leading-tight">{light.label}</div>
              <div className="text-xs opacity-90 mt-0.5">{light.helper}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Totale</div>
              <div className="font-display font-bold text-xl">{total ?? '—'}<span className="text-xs text-muted-foreground">/{maxTotal}</span></div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Asimmetrie</div>
              <div className="font-display font-bold text-xl">{patterns.filter(p => p.asymmetric).length}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dolore</div>
              <div className="font-display font-bold text-xl">{patterns.filter(p => p.final === 0).length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B — Weak Link */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
            B · Il Tuo Focus Principale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{priority.category}</Badge>
          <div className="font-display font-bold text-2xl leading-tight">{priority.focus}</div>
          <p className="text-sm text-muted-foreground leading-relaxed">{priority.detail}</p>
        </CardContent>
      </Card>

      {/* Section C — Actionable translation for the client */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
            C · Cosa Significa Per Te
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{priority.clientExplanation}</p>
        </CardContent>
      </Card>

      {/* Pattern breakdown — printable summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Riepilogo Pattern
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {patterns.map(p => (
            <div key={p.key} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0 border-border/50">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.label}</div>
                {p.bilateral && p.left !== null && p.right !== null && (
                  <div className="text-[11px] text-muted-foreground">L {p.left} · R {p.right}{p.asymmetric ? ' · asimmetrico' : ''}</div>
                )}
              </div>
              <div className={`font-display font-bold text-base px-2.5 py-0.5 rounded-md ${scoreColor(p.final)}`}>
                {p.final ?? '—'}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground italic text-center print:mt-6">
        Functional Movement Screen — metodologia Gray Cook. Il presente report è uno strumento di screening, non una diagnosi medica.
      </p>
    </div>
  );
}
