import { cn } from '@/lib/utils';

interface Props {
  /** Punteggio provvisorio (somma dei pattern già valutati) o totale finale. */
  value: number;
  /** Massimo teorico (21 full · 9 modificato). */
  max: number;
  /** Frazione di completamento 0..1 (pattern valutati / totali) → riempimento anello. */
  progress: number;
  /** Classe text-* del token per il colore dell'anello (default primary). */
  toneClass?: string;
}

const R = 26;
const CIRC = 2 * Math.PI * R;

/**
 * Anello di progresso FMS (solo UI). Il riempimento riflette la frazione di pattern
 * valutati; al centro il punteggio provvisorio su massimo. Colore da token via currentColor.
 */
export default function FmsProgressRing({ value, max, progress, toneClass = 'text-primary' }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = CIRC * (1 - clamped);
  return (
    <div className="relative w-[60px] h-[60px] shrink-0" aria-hidden="true">
      <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
        <circle cx="30" cy="30" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={R}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-300 ease-out', toneClass)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="font-display font-bold text-base">{value}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">/{max}</div>
        </div>
      </div>
    </div>
  );
}
