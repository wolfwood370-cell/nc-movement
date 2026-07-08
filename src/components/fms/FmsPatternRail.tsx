import { cn } from '@/lib/utils';
import { scoreColor, type PatternResult } from '@/lib/fms';

interface Props {
  patterns: PatternResult[];
  activeKey?: string | null;
  onJump: (key: string) => void;
}

const SHORT: Record<string, string> = {
  deep_squat: 'DS',
  hurdle_step: 'HS',
  inline_lunge: 'IL',
  shoulder_mobility: 'SM',
  aslr: 'ASLR',
  trunk_stability_pushup: 'TSPU',
  rotary_stability: 'RS',
};

/**
 * Rail dei pattern: un segmento per pattern, colorato per il punteggio finale
 * (score-color token; grigio se non ancora valutato), cliccabile per saltare
 * all'ancora del pattern nel form. Solo UI — non calcola nulla.
 */
export default function FmsPatternRail({ patterns, activeKey, onJump }: Props) {
  return (
    <div className="flex items-stretch gap-1">
      {patterns.map((p) => {
        const active = p.key === activeKey;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onJump(p.key)}
            title={p.label}
            aria-label={`${p.label}${p.final !== null ? ` · punteggio ${p.final}` : ' · non valutato'}`}
            className={cn(
              'flex-1 min-w-0 rounded-md py-1.5 text-[10px] font-bold uppercase tracking-wide transition-transform active:scale-[0.95]',
              scoreColor(p.final),
              active && 'ring-2 ring-foreground/40 ring-offset-1 ring-offset-background',
            )}
          >
            <span className="block truncate px-0.5">{SHORT[p.key] ?? p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
