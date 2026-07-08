import { useEffect, useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ClientForm, { toClientPayload } from '@/components/clients/ClientForm';
import ClientFilterChips, { type ClientFilter } from '@/components/clients/ClientFilterChips';
import ClientCard from '@/components/clients/ClientCard';
import { computeRisk, isAtRisk, type FmsAssessmentRow, type RiskResult } from '@/lib/insights';

interface Client {
  id: string; full_name: string; created_at: string;
  date_of_birth: string | null; primary_sport: string | null;
}

interface EnrichedClient extends Client {
  risk: RiskResult;
  fmsScore: number | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [latestByClient, setLatestByClient] = useState<Record<string, FmsAssessmentRow>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<ClientFilter>('all');

  const load = async () => {
    setLoading(true);
    const { data: cs, error: csErr } = await supabase
      .from('clients')
      .select('id, full_name, created_at, date_of_birth, primary_sport')
      .order('full_name', { ascending: true });
    if (csErr) toast.error('Impossibile caricare i clienti.');
    const list = (cs ?? []) as Client[];
    setClients(list);

    if (list.length) {
      // Fetch only the latest 1 FMS per client (limit acts as a safety cap on the 1000-row default).
      const { data: fms, error: fmsErr } = await supabase
        .from('fms_assessments')
        .select('*')
        .in('client_id', list.map(c => c.id))
        .order('assessed_at', { ascending: false })
        .limit(1000);
      if (fmsErr) toast.error('Impossibile caricare i dati di rischio.');
      const map: Record<string, FmsAssessmentRow> = {};
      (fms ?? []).forEach((row) => {
        const r = row as unknown as FmsAssessmentRow & { client_id: string };
        if (!map[r.client_id]) map[r.client_id] = r;
      });
      setLatestByClient(map);
    } else {
      setLatestByClient({});
    }
    setLoading(false);
  };

  // Reload only when the authenticated user's id changes.
  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const create = async (v: Parameters<typeof toClientPayload>[0]) => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('clients').insert(toClientPayload(v, user.id));
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Cliente aggiunto');
    setOpen(false);
    load();
  };

  // Derive risk once per client — single source for badge, border, counts, filter.
  const enriched = useMemo<EnrichedClient[]>(() => clients.map((c) => {
    const latest = latestByClient[c.id];
    return { ...c, risk: computeRisk(latest), fmsScore: latest?.total_score ?? null };
  }), [clients, latestByClient]);

  const counts = useMemo(() => ({
    all: enriched.length,
    atRisk: enriched.filter(e => isAtRisk(e.risk.level)).length,
    toAssess: enriched.filter(e => e.risk.level === 'unknown').length,
  }), [enriched]);

  const visible = useMemo(() => {
    if (filter === 'atRisk') return enriched.filter(e => isAtRisk(e.risk.level));
    if (filter === 'toAssess') return enriched.filter(e => e.risk.level === 'unknown');
    return enriched;
  }, [enriched, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Clienti</h1>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {clients.length} {clients.length === 1 ? 'cliente' : 'clienti'} · {counts.atRisk} a rischio
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full active:scale-[0.94]"><Plus className="w-4 h-4 mr-1" />Nuovo</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Aggiungi cliente</DialogTitle></DialogHeader>
            <ClientForm onSubmit={create} submitting={submitting} submitLabel="Aggiungi cliente" />
          </DialogContent>
        </Dialog>
      </div>

      {!loading && clients.length > 0 && (
        <ClientFilterChips value={filter} onChange={setFilter} counts={counts} />
      )}

      {loading ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">Caricamento…</div>
      ) : clients.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nessun cliente</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {filter === 'atRisk' ? 'Nessun cliente a rischio.' : 'Nessun cliente da valutare.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(e => (
            <ClientCard
              key={e.id}
              id={e.id}
              fullName={e.full_name}
              createdAt={e.created_at}
              dateOfBirth={e.date_of_birth}
              primarySport={e.primary_sport}
              fmsScore={e.fmsScore}
              risk={e.risk}
            />
          ))}
        </div>
      )}
    </div>
  );
}
