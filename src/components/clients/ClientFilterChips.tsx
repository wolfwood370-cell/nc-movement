import { cn } from '@/lib/utils';

export type ClientFilter = 'all' | 'atRisk' | 'toAssess';

interface Props {
  value: ClientFilter;
  onChange: (v: ClientFilter) => void;
  counts: Record<ClientFilter, number>;
}

const CHIPS: { value: ClientFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'atRisk', label: 'A rischio' },
  { value: 'toAssess', label: 'Da valutare' },
];

export default function ClientFilterChips({ value, onChange, counts }: Props) {
  return (
    <div className="flex items-center gap-2">
      {CHIPS.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            aria-pressed={active}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
              'transition-colors active:scale-[0.96]',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            {c.label}
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 min-w-[1.25rem] h-5',
                active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/70 text-foreground',
              )}
            >
              {counts[c.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
