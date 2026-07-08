import { useNavigate } from 'react-router-dom';
import { Plus, Compass, Sparkles, CalendarClock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  clientId: string;
  hasFms: boolean;
  redFlag: boolean;
  /** Esistono sessioni PT Pack per l'ultima FMS (scoped come in PtPackPanel). */
  hasPtPack: boolean;
}

/**
 * Card "Prossimo passo": testo adattivo derivato dallo stato già presente
 * (red flag / FMS salvate / PT Pack). Solo presentazione + navigazione.
 */
export default function NextStepCard({ clientId, hasFms, redFlag, hasPtPack }: Props) {
  const navigate = useNavigate();

  const step = !hasFms
    ? {
        icon: Plus, tone: 'bg-primary/10 text-primary',
        title: 'Inizia con una FMS',
        detail: 'Nessuna valutazione ancora: parti da un Functional Movement Screen.',
        cta: { label: 'Nuova FMS', to: `/assessments/fms/new?clientId=${clientId}` },
      }
    : redFlag
    ? {
        icon: Compass, tone: 'bg-pain/10 text-pain',
        title: 'Risolvi i red flag con una SFMA',
        detail: 'Red flag FMS attivi: serve una SFMA prima di procedere (FCS, YBT e PT Pack bloccati).',
        cta: { label: 'Nuova SFMA', to: `/assessments/sfma/new?clientId=${clientId}` },
      }
    : hasPtPack
    ? {
        icon: Sparkles, tone: 'bg-primary/10 text-primary',
        title: 'Genera e programma il PT Pack',
        detail: 'Sessioni PT Pack pronte: apri la scheda PT Pack qui sotto per generarle e programmarle.',
        cta: null as { label: string; to: string } | null,
      }
    : {
        icon: CalendarClock, tone: 'bg-success/10 text-success',
        title: 'Pianifica un follow-up',
        detail: 'Percorso in regola: pianifica una rivalutazione FMS.',
        cta: { label: 'Nuova FMS', to: `/assessments/fms/new?clientId=${clientId}` },
      };

  const { icon: Icon, tone, title, detail, cta } = step;

  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Prossimo passo</div>
        <div className="font-display font-semibold text-sm leading-tight mt-0.5">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{detail}</div>
      </div>
      {cta && (
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => navigate(cta.to)}>
          {cta.label} <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      )}
    </div>
  );
}
