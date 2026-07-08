import { useMemo } from 'react';
import { Share2, AlertCircle, PlayCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  computePatterns, computeTotal, getCorrectivePriority, fmsMaxTotal, primaryCorrective,
  type FmsScores,
} from '@/lib/fms';

interface Exercise {
  name: string;
  posture?: string | null;
  dosage?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  practitionerName?: string | null;
  brandName?: string;
  assessedAt?: string | null;
  scores: FmsScores;
  /** Optional 1-3 correttivi da mostrare come "piano iniziale". */
  starterExercises?: Exercise[];
}

// Tono del badge sotto il punteggio (in linea con LastFmsCard).
function scoreTone(level: string): { chip: string; number: string; label: string } {
  switch (level) {
    case 'red_flag':
      return { chip: 'bg-pain text-primary-foreground', number: 'text-pain', label: 'Richiede attenzione' };
    case 'incomplete':
      return { chip: 'bg-muted text-muted-foreground', number: 'text-muted-foreground', label: 'Valutazione da completare' };
    case 'clear':
      return { chip: 'bg-functional text-primary-foreground', number: 'text-functional', label: 'Ottimo lavoro' };
    default:
      return { chip: 'bg-warning text-warning-foreground', number: 'text-warning', label: 'Da migliorare' };
  }
}

/**
 * Report cliente semplificato (consumer-friendly).
 * Riprende il tono di voce di screenshot 10: niente gergo clinico,
 * un solo focus, azione condivisibile via Web Share API.
 */
export default function ClientMovementReport({
  open, onOpenChange, clientName, practitionerName, brandName = 'NC Movement',
  assessedAt, scores, starterExercises,
}: Props) {
  const patterns = useMemo(() => computePatterns(scores), [scores]);
  const total = useMemo(() => computeTotal(patterns), [patterns]);
  const max = fmsMaxTotal(scores);
  const priority = useMemo(() => getCorrectivePriority(scores), [scores]);
  const corr = primaryCorrective(patterns);
  const tone = scoreTone(priority.level);

  const dateLabel = (assessedAt ? new Date(assessedAt) : new Date())
    .toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  const initials = (practitionerName ?? brandName).slice(0, 3).toUpperCase();

  const share = async () => {
    const text = `Report movimento — ${clientName}\nPunteggio: ${total ?? '—'}/${max}\nFocus: ${priority.focus}`;
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: 'Il tuo report di movimento',
          text,
        });
        return;
      }
    } catch {
      // user annullato / non supportato → fallback clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Report copiato negli appunti');
    } catch {
      toast.error('Condivisione non disponibile su questo dispositivo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md gap-0 overflow-hidden bg-card">
        <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Brand row */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground grid place-items-center text-[10px] font-display font-bold tracking-tight">
              {initials}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {practitionerName ? `${practitionerName} · ` : ''}{brandName}
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl leading-tight">
              Il tuo report<br />di movimento
            </h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              {clientName} · {dateLabel}
            </p>
          </div>

          {/* Card punteggio */}
          <div className="surface-card p-5 text-center space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Punteggio movimento
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`font-display font-bold text-5xl leading-none ${tone.number}`}>
                {total ?? '—'}
              </span>
              <span className="text-sm text-muted-foreground">/ {max}</span>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${tone.chip}`}>
              {tone.label}
            </span>
          </div>

          {/* Cosa significa */}
          <div className="surface-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary shrink-0" />
              <div className="font-semibold text-sm">Cosa significa</div>
            </div>
            <div className="text-[13px] font-semibold text-primary">
              Focus: {corr.label}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/80">
              {priority.clientExplanation}
            </p>
          </div>

          {/* Piano iniziale */}
          {starterExercises && starterExercises.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold px-1">Il tuo piano iniziale</div>
              <div className="space-y-2">
                {starterExercises.slice(0, 3).map((ex, i) => (
                  <div key={i} className="surface-card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{ex.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {[ex.posture, ex.dosage].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={share} size="lg" className="w-full tap-target h-12 rounded-2xl">
            <Share2 className="w-4 h-4 mr-2" /> Condividi con il cliente
          </Button>

          <p className="text-[11px] text-muted-foreground text-center italic">
            Report semplificato · i dettagli clinici restano nella scheda professionale.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
