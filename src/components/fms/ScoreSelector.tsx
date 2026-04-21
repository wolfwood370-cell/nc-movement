import { Score, scoreColor } from '@/lib/fms';

interface Props {
  value: Score;
  onChange: (s: Score) => void;
  disabled?: boolean;
}

const opts: Score[] = [0, 1, 2, 3];

/**
 * Big tap-friendly 0/1/2/3 score selector. Color-coded:
 * 0 = pain (red), 1 = dysfunction (yellow), 2 = neutral, 3 = functional (green).
 */
export default function ScoreSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {opts.map(n => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`tap-target h-14 rounded-xl font-display font-bold text-2xl transition-all border-2 ${
              active
                ? `${scoreColor(n)} border-transparent shadow-elevated scale-[1.02]`
                : 'bg-card border-border text-muted-foreground hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={`Score ${n}`}
            aria-pressed={active}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
