import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PhoneShell from '@/components/PhoneShell';
import { calcAge, computeRisk, riskTone, type FmsAssessmentRow, type RiskResult } from '@/lib/insights';

interface Client {
  id: string; full_name: string;
  date_of_birth: string | null; primary_sport: string | null;
}
interface Enriched extends Client {
  risk: RiskResult;
  fmsScore: number | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * FMS Setup — schermata modale prima di avviare uno screening FMS.
 * Non usa AppShell: sostituisce header e bottom nav con proprio chrome
 * (back "Nuova FMS" / close X in alto; CTA sticky "Avvia valutazione" in basso).
 */
export default function FmsSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [latestByClient, setLatestByClient] = useState<Record<string, FmsAssessmentRow>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: cs, error: csErr } = await supabase
        .from('clients')
        .select('id, full_name, date_of_birth, primary_sport')
        .order('full_name', { ascending: true });
      if (csErr) toast.error('Impossibile caricare i clienti.');
      const list = (cs ?? []) as Client[];
      setClients(list);
      if (list.length) {
        const { data: fms } = await supabase
          .from('fms_assessments')
          .select('*')
          .in('client_id', list.map(c => c.id))
          .order('assessed_at', { ascending: false })
          .limit(1000);
        const map: Record<string, FmsAssessmentRow> = {};
        (fms ?? []).forEach((row) => {
          const r = row as unknown as FmsAssessmentRow & { client_id: string };
          if (!map[r.client_id]) map[r.client_id] = r;
        });
        setLatestByClient(map);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const enriched = useMemo<Enriched[]>(() => clients.map(c => {
    const latest = latestByClient[c.id];
    return { ...c, risk: computeRisk(latest), fmsScore: latest?.total_score ?? null };
  }), [clients, latestByClient]);

  const start = () => {
    if (!selected) { toast.error('Seleziona un cliente'); return; }
    navigate(`/assessments/fms/new?clientId=${selected}`);
  };

  return (
    <PhoneShell>
      {/* Header locale con back + close */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-border bg-card">
        <Link
          to="/assessments"
          className="flex items-center gap-1 text-[14px] font-medium text-foreground/80 hover:text-foreground px-2 py-1 -ml-1"
        >
          <ChevronLeft className="w-4 h-4" /> Nuova FMS
        </Link>
        <Link
          to="/assessments"
          aria-label="Chiudi"
          className="p-2 -mr-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scrollbar-none animate-fade-in">
        <p className="text-[11px] uppercase tracking-widest font-bold text-primary">Nuova valutazione</p>
        <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Functional Movement Screen</h1>

        <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mt-5 mb-2">
          Assegna a un cliente
        </p>

        {loading ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">Caricamento…</div>
        ) : enriched.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nessun cliente disponibile.</p>
            <Button className="mt-3" onClick={() => navigate('/clients')}>Aggiungi cliente</Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {enriched.map(c => {
              const tone = riskTone[c.risk.level];
              const age = calcAge(c.date_of_birth);
              const meta = [age !== null ? `${age} anni` : null, c.primary_sport].filter(Boolean).join(' · ');
              const isSel = selected === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 text-left transition-all active:scale-[0.99]',
                      isSel
                        ? 'border-primary bg-primary/5 shadow-cta'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold shrink-0',
                      tone.bg,
                      tone.text,
                    )}>
                      {initials(c.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-[14px] truncate leading-tight">{c.full_name}</div>
                      {meta && (
                        <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{meta}</div>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {c.fmsScore !== null ? `FMS ${c.fmsScore}` : 'Nessun test'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          onClick={start}
          disabled={!selected || loading}
          className="w-full h-12 rounded-2xl text-[15px] font-semibold shadow-cta disabled:opacity-50"
        >
          Avvia valutazione <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </PhoneShell>
  );
}
