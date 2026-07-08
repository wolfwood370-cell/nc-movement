import FilterChips, { type ChipItem } from '@/components/ui/FilterChips';

export type ClientFilter = 'all' | 'atRisk' | 'toAssess';

interface Props {
  value: ClientFilter;
  onChange: (v: ClientFilter) => void;
  counts: Record<ClientFilter, number>;
  /** Show the count badge on each chip. Default true. Set false for a cleaner pill-only look. */
  showCounts?: boolean;
}

const CHIPS: { value: ClientFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'atRisk', label: 'A rischio' },
  { value: 'toAssess', label: 'Da valutare' },
];

/**
 * Chip filtro clienti. Firma pubblica invariata ({value,onChange,counts}); internamente
 * costruisce gli items e delega al componente generico FilterChips.
 */
export default function ClientFilterChips({ value, onChange, counts, showCounts = true }: Props) {
  const items: ChipItem<ClientFilter>[] = CHIPS.map((c) => ({
    value: c.value,
    label: c.label,
    count: showCounts ? counts[c.value] : undefined,
  }));
  return <FilterChips items={items} value={value} onChange={onChange} />;
}
