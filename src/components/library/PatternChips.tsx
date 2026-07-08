import FilterChips, { type ChipItem } from '@/components/ui/FilterChips';

export interface PatternDef {
  key: string;
  label: string;
}

interface Props {
  patterns: PatternDef[];
  value: string;
  onChange: (v: string) => void;
  /** Conteggio esercizi per pattern (dal grouped) — opzionale. */
  counts?: Record<string, number>;
}

/** Chip pattern FMS (single-select, scrollabili). Delega a FilterChips. */
export default function PatternChips({ patterns, value, onChange, counts }: Props) {
  const items: ChipItem<string>[] = patterns.map((p) => ({
    value: p.key,
    label: p.label,
    count: counts?.[p.key],
  }));
  return <FilterChips items={items} value={value} onChange={onChange} scroll />;
}
