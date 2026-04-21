import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ClientForm, { toClientPayload } from '@/components/clients/ClientForm';
import { calcAge, computeRisk, riskTone, type FmsAssessmentRow } from '@/lib/insights';

interface Client {
  id: string; full_name: string; created_at: string;
  date_of_birth: string | null; primary_sport: string | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [latestByClient, setLatestByClient] = useState<Record<string, FmsAssessmentRow>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase
      .from('clients')
      .select('id, full_name, created_at, date_of_birth, primary_sport')
      .order('created_at', { ascending: false });
    const list = (cs ?? []) as Client[];
    setClients(list);

    if (list.length) {
      const { data: fms } = await supabase
        .from('fms_assessments')
        .select('*')
        .in('client_id', list.map(c => c.id))
        .order('assessed_at', { ascending: false });
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
  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Clienti</h1>
          <p className="text-sm text-muted-foreground">{clients.length} in lista</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-1" />Nuovo</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Aggiungi cliente</DialogTitle></DialogHeader>
            <ClientForm onSubmit={create} submitting={submitting} submitLabel="Aggiungi cliente" />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">Caricamento…</div>
      ) : clients.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nessun cliente</p>
        </div>
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {clients.map(c => {
            const latest = latestByClient[c.id];
            const risk = computeRisk(latest);
            const tone = riskTone[risk.level];
            const age = calcAge(c.date_of_birth);
            return (
              <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between p-4 hover:bg-accent/40 tap-target">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-bold shrink-0">
                    {c.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[age !== null ? `${age} anni` : null, c.primary_sport].filter(Boolean).join(' · ') ||
                        `Aggiunto il ${new Date(c.created_at).toLocaleDateString('it-IT')}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${tone.chip}`}>
                    {risk.level === 'unknown' ? '—' : risk.level === 'critical' ? 'critico'
                      : risk.level === 'high' ? 'alto' : risk.level === 'moderate' ? 'medio' : 'basso'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
