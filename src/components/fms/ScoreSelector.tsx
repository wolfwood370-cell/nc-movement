import { Score, scoreColor } from '@/lib/fms';
import { triggerHapticFeedback } from '@/lib/haptics';

interface Props {
  value: Score;
  onChange: (s: Score) => void;
  disabled?: boolean;
}

const opts: Score[] = [0, 1, 2, 3];

/**
 * Big tap-friendly 0/1/2/3 score selector. Each button is color-coded by score:
 *  0 = rosso, 1 = giallo, 2 = arancione, 3 = verde.
 * Inactive buttons show a faint tint of the same color so the scale is always readable.
 */
export default function ScoreSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {opts.map(n => {
        const active = value === n;
        const colorClass = scoreColor(n);
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => {
              triggerHapticFeedback(n === 0 ? 'alert' : n === 3 ? 'success' : 'neutral');
              onChange(n);
            }}
            className={`tap-target h-14 rounded-xl font-display font-bold text-2xl transition-all border-2 ${
              active
                ? `${colorClass} border-transparent shadow-elevated scale-[1.02]`
                : 'bg-background text-foreground border-border hover:border-primary/40'
            } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
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
