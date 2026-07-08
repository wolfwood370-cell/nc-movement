import { cn } from '@/lib/utils';

export interface ChipItem<T extends string> {
  value: T;
  label: string;
  /** Se assente → nessun badge conteggio. */
  count?: number;
}

interface FilterChipsProps<T extends string> {
  items: ChipItem<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Wrappa in overflow-x-auto per liste lunghe (es. pattern). */
  scroll?: boolean;
}

/**
 * Pill di filtro single-select, presentazionale e generico. Stesso linguaggio
 * visivo dei chip di slice 2 (attivo = primary, inattivo = muted). Riusato da
 * ClientFilterChips (Clienti) e PatternChips (Libreria).
 */
export default function FilterChips<T extends string>({ items, value, onChange, scroll }: FilterChipsProps<T>) {
  return (
    <div className={cn('flex items-center gap-2', scroll && 'overflow-x-auto -mx-4 px-4 pb-1')}>
      {items.map((c) => {
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
            {c.count !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 min-w-[1.25rem] h-5',
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/70 text-foreground',
                )}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
