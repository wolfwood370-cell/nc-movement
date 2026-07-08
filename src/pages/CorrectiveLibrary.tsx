import { Fragment, useEffect, useMemo, useState } from 'react';
import { Library, Search, ChevronRight } from 'lucide-react';
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

const PHASES: { key: CorrectivePhase; label: string }[] = [
  { key: 'Reset', label: 'Reset' },
  { key: 'Reactivate', label: 'Reactivate' },
  { key: 'Reinforce', label: 'Reinforce' },
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

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Library className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold">Libreria Esercizi Correttivi</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Esplora l'intero database correttivo per pattern FMS e fase neuro-evolutiva.
        </p>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca esercizio o postura…"
            className="pl-9"
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

      {/* Selettore fasi a segmenti: Reset → Reactivate → Reinforce (single-select) */}
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
              className="group flex-1 h-auto min-w-0 rounded-full px-2 py-2 text-xs sm:text-sm font-medium gap-1.5 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground"
            >
              <span className="truncate">{p.label}</span>
              <span className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[1.25rem] h-4 bg-background/70 text-foreground group-data-[state=on]:bg-primary-foreground/20 group-data-[state=on]:text-primary-foreground">
                {grouped[activePattern][p.key].length}
              </span>
            </ToggleGroupItem>
          </Fragment>
        ))}
      </ToggleGroup>

      <div className="text-xs text-muted-foreground px-1">
        {loading
          ? 'Caricamento…'
          : `${list.length} esercizi · ${PHASES.find((p) => p.key === phase)?.label}`}
      </div>

      {list.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {loading ? 'Caricamento…' : 'Nessun esercizio per questa combinazione.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
