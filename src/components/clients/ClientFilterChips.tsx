import FilterChips, { type ChipItem } from '@/components/ui/FilterChips';

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

/**
 * Chip filtro clienti. Firma pubblica invariata ({value,onChange,counts}); internamente
 * costruisce gli items e delega al componente generico FilterChips.
 */
export default function ClientFilterChips({ value, onChange, counts }: Props) {
  const items: ChipItem<ClientFilter>[] = CHIPS.map((c) => ({
    value: c.value,
    label: c.label,
    count: counts[c.value],
  }));
  return <FilterChips items={items} value={value} onChange={onChange} />;
}
