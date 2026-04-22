import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Activity, ChevronRight, ClipboardList, Target, Compass, Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ClientForm, { type ClientFormValues, toClientPayload } from '@/components/clients/ClientForm';

interface Client { id: string; full_name: string; created_at: string }
interface RecentAssessment {
  id: string; assessed_at: string; total_score: number | null; primary_corrective: string | null;
  client_id: string; clients: { full_name: string } | null;
}

const quickTests = [
  { key: 'fms',  label: 'FMS',  desc: 'Functional Movement Screen',   icon: ClipboardList, enabled: true  },
  { key: 'sfma', label: 'SFMA', desc: 'Selective Functional Mvt.',    icon: Compass,       enabled: true  },
  { key: 'ybt',  label: 'YBT',  desc: 'Y-Balance Test',                icon: Target,        enabled: true  },
  { key: 'fcs',  label: 'FCS',  desc: 'Capacità Fondamentali',         icon: Gauge,         enabled: true  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [recent, setRecent] = useState<RecentAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickTestOpen, setPickTestOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from('clients').select('id, full_name, created_at').order('created_at', { ascending: false }),
      supabase.from('fms_assessments')
        .select('id, assessed_at, total_score, primary_corrective, client_id, clients(full_name)')
        .order('assessed_at', { ascending: false }).limit(5),
    ]);
    setClients(c ?? []);
    setRecent((r ?? []) as RecentAssessment[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createClient = async (v: ClientFormValues) => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('clients')
      .insert(toClientPayload(v, user.id)).select('id').single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Cliente aggiunto');
    setOpen(false);
    await load();
    if (data?.id) navigate(`/assessments/fms/new?clientId=${data.id}`);
  };

  const startTest = (testKey: string, clientId: string) => {
    if (testKey === 'fms') navigate(`/assessments/fms/new?clientId=${clientId}`);
    else if (testKey === 'fcs') navigate(`/assessments/fcs/new?clientId=${clientId}`);
    else if (testKey === 'sfma') navigate(`/assessments/sfma/new?clientId=${clientId}`);
    else if (testKey === 'ybt') navigate(`/assessments/ybt/new?clientId=${clientId}`);
    else toast.info(`Modulo ${testKey.toUpperCase()} in arrivo.`);
    setPickTestOpen(null);
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Benvenuto</p>
        <h1 className="font-display text-3xl font-bold mt-1 text-gradient-primary">Practitioner Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">Scegli un cliente o avvia una nuova valutazione.</p>
      </section>

      {/* Quick start tests */}
      <section>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Avvio rapido</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickTests.map(t => (
            <button
              key={t.key}
              onClick={() => setPickTestOpen(t.key)}
              disabled={!t.enabled && clients.length === 0}
              className="surface-card p-4 text-left tap-target hover:shadow-elevated transition-all relative overflow-hidden group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent grid place-items-center mb-3">
                <t.icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="font-display font-bold text-lg">{t.label}</div>
              <div className="text-xs text-muted-foreground leading-snug">{t.desc}</div>
              {!t.enabled && (
                <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">presto</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Clients */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Clienti</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full"><Plus className="w-4 h-4 mr-1" />Nuovo</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Aggiungi cliente</DialogTitle></DialogHeader>
              <ClientForm onSubmit={createClient} submitting={submitting} submitLabel="Aggiungi e avvia FMS" />
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">Caricamento…</div>
        ) : clients.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Nessun cliente</p>
            <p className="text-sm text-muted-foreground mt-1">Aggiungi il primo cliente per iniziare a valutare.</p>
            <Button onClick={() => setOpen(true)} className="mt-4"><Plus className="w-4 h-4 mr-1" />Aggiungi cliente</Button>
          </div>
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {clients.slice(0, 5).map(c => (
              <Link key={c.id} to={`/clients/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-accent/40 transition-colors tap-target">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold shrink-0">
                    {c.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">Aggiunto il {new Date(c.created_at).toLocaleDateString('it-IT')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
            {clients.length > 5 && (
              <Link to="/clients" className="flex items-center justify-center p-3 text-sm text-primary font-medium hover:bg-accent/40">
                Vedi tutti i {clients.length} clienti
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Recent FMS */}
      <section>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Valutazioni recenti</h2>
        {recent.length === 0 ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-60" />
            Ancora nessuna valutazione.
          </div>
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {recent.map(a => (
              <Link key={a.id} to={`/assessments/fms/${a.id}`}
                className="flex items-center justify-between p-4 hover:bg-accent/40 transition-colors tap-target">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.clients?.full_name ?? 'Sconosciuto'}</div>
                  <div className="text-xs text-muted-foreground">
                    FMS · {new Date(a.assessed_at).toLocaleDateString('it-IT')} · {a.primary_corrective ?? '—'}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-display font-bold text-xl">{a.total_score ?? '—'}</div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">/ 21</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pick client for selected test */}
      <Dialog open={!!pickTestOpen} onOpenChange={(o) => !o && setPickTestOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avvia {pickTestOpen?.toUpperCase()} — scegli un cliente</DialogTitle>
          </DialogHeader>
          {clients.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Nessun cliente.</p>
              <Button onClick={() => { setPickTestOpen(null); setOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />Aggiungi prima un cliente
              </Button>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto -mx-2">
              {clients.map(c => (
                <button key={c.id}
                  onClick={() => pickTestOpen && startTest(pickTestOpen, c.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/40 tap-target text-left">
                  <div className="w-9 h-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-bold text-sm">
                    {c.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{c.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
