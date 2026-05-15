import { useEffect, useState } from 'react';
import { Dumbbell, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SafeStrengthRow {
  id: string;
  name: string;
  pattern: string;
  default_sets: string | null;
  default_reps_time: string | null;
  goal: string | null;
  video_url: string | null;
}

interface Props {
  /** Weak-link pattern key, e.g. 'deep_squat'. When 'none'/'pain'/falsy the card is hidden. */
  patternKey: string | null | undefined;
  /** Optional human focus label to show as subtitle. */
  focusLabel?: string;
  /** Visual variant: full surface card (insights) or inline section (modal). */
  variant?: 'card' | 'inline';
  /** Max number of suggestions to show. */
  limit?: number;
}

/**
 * "🏋️ Sala Pesi: Esercizi Sicuri Consigliati" — surfaces machine/heavy
 * commercial-gym alternatives that bypass the client's FMS weak link.
 * Pulls from `exercises_library` where phase = 'Safe_Strength' and
 * pattern matches the provided weak-link key.
 */
export default function SafeStrengthCard({
  patternKey,
  focusLabel,
  variant = 'card',
  limit = 3,
}: Props) {
  const [rows, setRows] = useState<SafeStrengthRow[]>([]);
  const [loading, setLoading] = useState(false);

  const skip = !patternKey || patternKey === 'none' || patternKey === 'pain';

  useEffect(() => {
    let cancelled = false;
    if (skip) { setRows([]); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('exercises_library')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('id,name,pattern,default_sets,default_reps_time,goal,video_url')
        .eq('pattern', patternKey)
        // @ts-expect-error - 'Safe_Strength' newly added to corrective_phase enum; types may lag.
        .eq('phase', 'Safe_Strength')
        .limit(limit);
      if (cancelled) return;
      setRows((data as SafeStrengthRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patternKey, skip, limit]);

  if (skip) return null;
  if (!loading && rows.length === 0) return null;

  const wrapperClass =
    variant === 'card'
      ? 'surface-card border border-primary/20 p-5'
      : 'rounded-lg border border-primary/30 bg-primary/5 p-4';

  return (
    <section className={wrapperClass}>
      <div className="flex items-start gap-2 mb-1">
        <Dumbbell className="w-4 h-4 text-primary mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider">
            🏋️ Sala Pesi · Esercizi Sicuri Consigliati
          </h3>
          {focusLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Alternative macchine per <strong>{focusLabel}</strong>
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        Carico pesante in sicurezza: queste opzioni a macchina/cavi bypassano il
        weak link del cliente, garantendo un buon allenamento senza esporre il
        pattern compromesso.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento alternative…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r, i) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                {String(i + 1).padStart(2, '0')} · Safe Strength
              </div>
              <div className="font-display font-semibold text-sm leading-snug">{r.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {[r.default_sets, r.default_reps_time].filter(Boolean).join(' · ') || '—'}
              </div>
              {r.goal && (
                <div className="text-[10px] text-muted-foreground/80 mt-1 leading-snug">
                  {r.goal}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
