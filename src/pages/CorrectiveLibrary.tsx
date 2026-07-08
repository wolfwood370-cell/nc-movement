import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import PatternChips, { type PatternDef } from '@/components/library/PatternChips';
import ExerciseCard from '@/components/library/ExerciseCard';
import ExerciseVideoDialog from '@/components/insights/ExerciseVideoDialog';
import type { CorrectivePhase, ExerciseRow } from '@/hooks/useCorrectiveExercises';

const PATTERNS: PatternDef[] = [
  { key: 'deep_squat', label: 'Deep Squat' },
  { key: 'hurdle_step', label: 'Hurdle Step' },
  { key: 'inline_lunge', label: 'Inline Lunge' },
  { key: 'shoulder_mobility', label: 'Shoulder Mobility' },
  { key: 'aslr', label: 'ASLR' },
  { key: 'trunk_stability_pushup', label: 'TSPU' },
  { key: 'rotary_stability', label: 'Rotary Stability' },
];


const PHASES: { key: CorrectivePhase; label: string; range: string; activeClass: string }[] = [
  { key: 'Reset',      label: 'Reset',      range: 'L 1-3',  activeClass: 'data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:hover:bg-blue-500 data-[state=on]:hover:text-white' },
  { key: 'Reactivate', label: 'Reactivate', range: 'L 4-8',  activeClass: 'data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=on]:hover:bg-green-500 data-[state=on]:hover:text-white' },
  { key: 'Reinforce',  label: 'Reinforce',  range: 'L 9-12', activeClass: 'data-[state=on]:bg-orange-500 data-[state=on]:text-white data-[state=on]:hover:bg-orange-500 data-[state=on]:hover:text-white' },
];

export default function CorrectiveLibrary() {
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePattern, setActivePattern] = useState(PATTERNS[0].key);
  const [phase, setPhase] = useState<CorrectivePhase>('Reset');
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises_library')
        .select('*')
        .order('posture_level', { ascending: true })
        .order('name', { ascending: true });
      if (cancelled) return;
      setLoading(false);
      if (!error && data) setRows(data as ExerciseRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map: Record<string, Record<CorrectivePhase, ExerciseRow[]>> = {};
    for (const p of PATTERNS) {
      map[p.key] = { Reset: [], Reactivate: [], Reinforce: [] };
    }
    for (const r of rows) {
      if (!map[r.pattern]) continue;
      if (q && !r.name.toLowerCase().includes(q) && !r.posture_name.toLowerCase().includes(q)) continue;
      map[r.pattern][r.phase]?.push(r);
    }
    return map;
  }, [rows, search]);

  // Conteggio esercizi per pattern (rispetta la ricerca) — alimenta i chip.
  const patternCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of PATTERNS) {
      const g = grouped[p.key];
      out[p.key] = g.Reset.length + g.Reactivate.length + g.Reinforce.length;
    }
    return out;
  }, [grouped]);

  const list = grouped[activePattern][phase];

  // Postures uniche presenti nella lista corrente (mostrate a destra dell'eyebrow)
  const postures = useMemo(() => {
    const set = new Set<string>();
    for (const ex of list) if (ex.posture_name) set.add(ex.posture_name);
    return Array.from(set);
  }, [list]);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-display font-bold tracking-tight">Libreria correttivi</h1>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca esercizio o postura…"
            className="pl-9 rounded-full bg-muted/40 border-transparent focus-visible:border-border"
          />
        </div>
      </header>

      {/* Chip pattern (single-select, scrollabili) */}
      <PatternChips
        patterns={PATTERNS}
        value={activePattern}
        onChange={setActivePattern}
        counts={patternCounts}
      />

      {/* Selettore fasi con range livelli (Reset L 1-3 → Reactivate L 4-8 → Reinforce L 9-12) */}
      <ToggleGroup
        type="single"
        value={phase}
        onValueChange={(v) => v && setPhase(v as CorrectivePhase)}
        className="w-full justify-between gap-1"
      >
        {PHASES.map((p, i) => (
          <Fragment key={p.key}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />}
            <ToggleGroupItem
              value={p.key}
              aria-label={p.label}
              className="group flex-1 h-auto min-w-0 rounded-2xl px-2 py-2 flex flex-col items-center gap-0 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground data-[state=on]:bg-functional data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-functional data-[state=on]:hover:text-primary-foreground"
            >
              <span className="text-xs sm:text-sm font-semibold truncate">{p.label}</span>
              <span className="text-[10px] font-medium opacity-80 group-data-[state=on]:opacity-90 tabular-nums">
                {p.range}
              </span>
            </ToggleGroupItem>
          </Fragment>
        ))}
      </ToggleGroup>

      {/* Eyebrow: fase corrente · N   ·   postures elencate a destra */}
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="font-semibold tracking-wide">
          {PHASES.find((p) => p.key === phase)?.label} · <span className="tabular-nums">{loading ? '…' : list.length}</span>
        </span>
        {postures.length > 0 && (
          <span className="text-muted-foreground truncate ml-3">{postures.join(' · ')}</span>
        )}
      </div>

      {list.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {loading ? 'Caricamento…' : 'Nessun esercizio per questa combinazione.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} onPlay={(e) => setVideo({ url: e.video_url!, title: e.name })} />
          ))}
        </div>
      )}

      <ExerciseVideoDialog
        open={!!video}
        onClose={() => setVideo(null)}
        url={video?.url ?? null}
        title={video?.title ?? ''}
      />
    </div>
  );
}
