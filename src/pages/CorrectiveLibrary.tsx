import { useEffect, useMemo, useState } from 'react';
import { Library, Search, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ExerciseVideoDialog from '@/components/insights/ExerciseVideoDialog';
import type { CorrectivePhase, ExerciseRow } from '@/hooks/useCorrectiveExercises';

const PATTERNS: { key: string; label: string }[] = [
  { key: 'deep_squat', label: 'Deep Squat' },
  { key: 'hurdle_step', label: 'Hurdle Step' },
  { key: 'inline_lunge', label: 'Inline Lunge' },
  { key: 'shoulder_mobility', label: 'Shoulder Mobility' },
  { key: 'aslr', label: 'ASLR' },
  { key: 'trunk_stability_pushup', label: 'TSPU' },
  { key: 'rotary_stability', label: 'Rotary Stability' },
];

const PHASES: { key: CorrectivePhase; label: string; sublabel: string }[] = [
  { key: 'Reset', label: 'Reset', sublabel: 'Livelli 1–3 · Supine, Prone, Side Lying' },
  { key: 'Reactivate', label: 'Reactivate', sublabel: 'Livelli 4–8 · Quadruped → Half Kneeling' },
  { key: 'Reinforce', label: 'Reinforce', sublabel: 'Livelli 9–12 · Split Stance → Standing' },
];

export default function CorrectiveLibrary() {
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePattern, setActivePattern] = useState(PATTERNS[0].key);
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

  const totalForPattern = (key: string) =>
    grouped[key].Reset.length + grouped[key].Reactivate.length + grouped[key].Reinforce.length;

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

      <Tabs value={activePattern} onValueChange={setActivePattern}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="inline-flex w-max">
            {PATTERNS.map(p => (
              <TabsTrigger key={p.key} value={p.key} className="whitespace-nowrap">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {PATTERNS.map(p => (
          <TabsContent key={p.key} value={p.key} className="space-y-3">
            <div className="text-xs text-muted-foreground px-1">
              {loading ? 'Caricamento…' : `${totalForPattern(p.key)} esercizi`}
            </div>
            <Accordion type="multiple" defaultValue={['Reset', 'Reactivate', 'Reinforce']}>
              {PHASES.map(phase => {
                const list = grouped[p.key][phase.key];
                return (
                  <AccordionItem key={phase.key} value={phase.key}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{phase.label}</span>
                          <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-normal">{phase.sublabel}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {list.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Nessun esercizio.</p>
                      ) : (
                        <div className="grid gap-2">
                          {list.map(ex => (
                            <Card key={ex.id} className="border-border">
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[10px]">
                                    L{ex.posture_level} · {ex.posture_name}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium leading-snug">{ex.name}</div>
                                {ex.goal && (
                                  <div className="text-xs text-muted-foreground">{ex.goal}</div>
                                )}
                                {ex.dose && (
                                  <div className="text-xs text-muted-foreground italic">{ex.dose}</div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
