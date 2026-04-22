import { triggerHapticFeedback } from '@/lib/haptics';

export type Stoplight = 'red' | 'yellow' | 'green' | null;

interface Props {
  value: Stoplight;
  onChange: (s: Stoplight) => void;
  disabled?: boolean;
}

const opts: { key: Exclude<Stoplight, null>; bg: string; aria: string; letter: string }[] = [
  { key: 'red',    bg: 'bg-pain',        aria: 'Rosso',  letter: 'R' },
  { key: 'yellow', bg: 'bg-warning',     aria: 'Giallo', letter: 'G' },
  { key: 'green',  bg: 'bg-functional',  aria: 'Verde',  letter: 'V' },
];

/**
 * Tap-friendly Red / Yellow / Green selector. Each button is a colored swatch
 * carrying its own initial letter (R, G, V).
 */
export default function StoplightSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map(o => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => {
              triggerHapticFeedback(o.key === 'red' ? 'alert' : o.key === 'green' ? 'success' : 'neutral');
              onChange(active ? null : o.key);
            }}
            className={`tap-target h-14 rounded-xl font-display font-bold text-2xl transition-all border-2 ${
              active
                ? `${o.bg} text-white border-transparent shadow-elevated scale-[1.02]`
                : `${o.bg}/25 text-foreground/70 border-border hover:border-primary/40`
            } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            aria-label={o.aria}
            aria-pressed={active}
          >
            {o.letter}
          </button>
        );
      })}
    </div>
  );
}
