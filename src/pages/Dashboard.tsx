import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Activity, ChevronRight, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ClientForm, { type ClientFormValues, toClientPayload } from '@/components/clients/ClientForm';
import ClientAvatar from '@/components/ClientAvatar';
import { useMacroAnalytics } from '@/hooks/useMacroAnalytics';
import logoFms from '@/assets/logo-fms.webp';
import logoSfma from '@/assets/logo-sfma.webp';
import logoFcs from '@/assets/logo-fcs.webp';
import logoYbt from '@/assets/logo-ybt.webp';

interface Client { id: string; full_name: string; created_at: string }

const quickTests = [
  { key: 'fms',  label: 'FMS',  desc: 'Movement Screen',      logo: logoFms  },
  { key: 'sfma', label: 'SFMA', desc: 'Functional Mvt.',      logo: logoSfma },
  { key: 'ybt',  label: 'YBT',  desc: 'Y-Balance',            logo: logoYbt  },
  { key: 'fcs',  label: 'FCS',  desc: 'Cap. Fondamentali',    logo: logoFcs  },
];

/* ---------- KPI card (tinted border, colored value) ---------- */
type KpiTone = 'default' | 'functional' | 'warning' | 'dysfunction' | 'pain';
const KPI_TONE: Record<KpiTone, { border: string; iconBg: string; iconText: string; value: string }> = {
  default:     { border: 'border-border',          iconBg: 'bg-primary/10',     iconText: 'text-primary',     value: 'text-foreground' },
  functional:  { border: 'border-functional/40',   iconBg: 'bg-functional/15',  iconText: 'text-functional',  value: 'text-functional' },
  warning:     { border: 'border-warning/40',      iconBg: 'bg-warning/15',     iconText: 'text-warning',     value: 'text-warning' },
  dysfunction: { border: 'border-dysfunction/40',  iconBg: 'bg-dysfunction/15', iconText: 'text-dysfunction', value: 'text-dysfunction' },
  pain:        { border: 'border-pain/40',         iconBg: 'bg-pain/15',        iconText: 'text-pain',        value: 'text-pain' },
};

function KpiCard({
  icon: Icon, label, value, hint, tone = 'default',
}: {
  icon: typeof Users; label: string; value: string; hint?: string; tone?: KpiTone;
}) {
  const t = KPI_TONE[tone];
  return (
    <div className={`bg-card rounded-card border ${t.border} shadow-card p-3.5`}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${t.iconBg} ${t.iconText} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div className="text-[9px] uppercase tracking-[0.09em] text-muted-foreground font-semibold truncate">
          {label}
        </div>
      </div>
      <div className={`font-display font-bold text-[30px] leading-none mt-2.5 ${t.value}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

/* ---------- Dashboard ---------- */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickTestOpen, setPickTestOpen] = useState<string | null>(null);
  const [practitionerName, setPractitionerName] = useState<string | null>(null);
  const { data: analytics } = useMacroAnalytics();
  const lastByClientRef = useRef<Map<string, { time: number; kind: string; score?: number | null }>>(new Map());

  const todayLabel = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date())
    .toUpperCase();

  useEffect(() => {
    if (!user?.id) { setPractitionerName(null); return; }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPractitionerName(data?.display_name ?? null);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    const [clientsRes, fms, fcs, sfma, ybt] = await Promise.all([
      supabase.from('clients').select('id, full_name, created_at').order('created_at', { ascending: false }),
      supabase.from('fms_assessments').select('client_id, assessed_at, total_score').order('assessed_at', { ascending: false }).limit(500),
      supabase.from('fcs_assessments').select('client_id, assessed_at').order('assessed_at', { ascending: false }).limit(500),
      supabase.from('sfma_assessments').select('client_id, assessed_at').order('assessed_at', { ascending: false }).limit(500),
      supabase.from('ybt_assessments').select('client_id, assessed_at').order('assessed_at', { ascending: false }).limit(500),
    ]);
    if (clientsRes.error || fms.error || fcs.error || sfma.error || ybt.error) {
      toast.error('Errore nel caricamento della dashboard.');
    }
    const c = clientsRes.data ?? [];
    // Last activity per client → sort recent clients
    const lastByClient = new Map<string, { time: number; kind: string; score?: number | null }>();
    const push = (rows: { client_id: string; assessed_at: string; total_score?: number | null }[] | null, kind: string) => {
      for (const a of rows ?? []) {
        const t = new Date(a.assessed_at).getTime();
        const prev = lastByClient.get(a.client_id);
        if (!prev || t > prev.time) lastByClient.set(a.client_id, { time: t, kind, score: a.total_score ?? null });
      }
    };
    push(fms.data as any, 'FMS');
    push(sfma.data as any, 'SFMA');
    push(fcs.data as any, 'FCS');
    push(ybt.data as any, 'YBT');
    const sorted = [...c].sort((a, b) => {
      const ta = lastByClient.get(a.id)?.time ?? new Date(a.created_at).getTime();
      const tb = lastByClient.get(b.id)?.time ?? new Date(b.created_at).getTime();
      return tb - ta;
    });
    setClients(sorted);
    setLoading(false);
    lastByClientRef.current = lastByClient;
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const lastByClient: Map<string, { time: number; kind: string; score?: number | null }> =
    (typeof window !== 'undefined' && (window as any).__lastByClient) || new Map();

  const relTime = (ms: number) => {
    const diff = Date.now() - ms;
    const day = 24 * 60 * 60 * 1000;
    if (diff < day) return 'oggi';
    if (diff < 2 * day) return 'ieri';
    if (diff < 7 * day) return `${Math.floor(diff / day)}g fa`;
    if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}sett fa`;
    return `${Math.floor(diff / (30 * day))}m fa`;
  };

  return (
    <div className="space-y-6">
      {/* Header: date eyebrow + greeting + Test pill */}
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">{todayLabel}</p>
          <h1 className="font-display text-[26px] font-bold mt-1.5 tracking-tight leading-none">
            Ciao, <span className="text-primary">{practitionerName ?? 'Nicolò'}</span>
          </h1>
        </div>
        <Button
          onClick={() => setPickTestOpen('fms')}
          className="rounded-full shrink-0 shadow-cta h-9 px-4 active:scale-[0.96]"
        >
          <Plus className="w-4 h-4 mr-1" /> Test
        </Button>
      </header>

      {/* Panoramica clinica — 2×2 tinted KPIs */}
      <section>
        <h2 className="font-display font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
          Panoramica clinica
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard
            icon={Users}
            label="Clienti attivi"
            value={String(analytics?.totalClients ?? '—')}
            hint={analytics ? `${analytics.clientsWithFms} con FMS` : undefined}
          />
          <KpiCard
            icon={Activity}
            label="Score FMS medio"
            value={analytics?.averageFmsScore != null ? `${analytics.averageFmsScore}` : '—'}
            hint="su 21"
            tone={analytics?.averageFmsScore != null && analytics.averageFmsScore < 14 ? 'warning' : 'functional'}
          />
          <KpiCard
            icon={ArrowLeftRight}
            label="Asimmetrie"
            value={analytics ? `${analytics.asymmetryRate}%` : '—'}
            hint="≥1 asimmetria"
            tone={analytics && analytics.asymmetryRate >= 40 ? 'dysfunction' : 'default'}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Red flag"
            value={analytics ? `${analytics.redFlagRate}%` : '—'}
            hint="clearing / dolore"
            tone={analytics && analytics.redFlagRate > 0 ? 'pain' : 'functional'}
          />
        </div>
      </section>

      {/* Avvio rapido — 2×2 test cards with logo + label + subtitle */}
      <section>
        <h2 className="font-display font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
          Avvio rapido
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {quickTests.map(t => (
            <button
              key={t.key}
              onClick={() => setPickTestOpen(t.key)}
              aria-label={`${t.label} — ${t.desc}`}
              className="surface-card card-interactive flex items-center gap-3 p-3.5 text-left"
            >
              <img src={t.logo} alt="" className="w-9 h-9 object-contain shrink-0" />
              <div className="min-w-0">
                <div className="font-display font-bold text-[15px] leading-tight">{t.label}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Clienti recenti */}
      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="font-display font-semibold text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Clienti recenti
          </h2>
          <div className="flex items-center gap-3">
            {clients.length > 0 && (
              <Link to="/clients" className="text-[11px] font-semibold text-primary tracking-wide">
                Tutti ({clients.length})
              </Link>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="text-primary" aria-label="Nuovo cliente">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Aggiungi cliente</DialogTitle></DialogHeader>
                <ClientForm onSubmit={createClient} submitting={submitting} submitLabel="Aggiungi e avvia FMS" />
              </DialogContent>
            </Dialog>
          </div>
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
          <div className="space-y-2">
            {clients.slice(0, 4).map(c => {
              const last = lastByClient.get(c.id);
              return (
                <Link key={c.id} to={`/clients/${c.id}`}
                  className="surface-card card-interactive flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ClientAvatar fullName={c.full_name} className="w-10 h-10 text-sm font-display" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[14px] truncate">{c.full_name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-functional inline-block" />
                        {last
                          ? `${last.kind}${last.score != null ? ' ' + last.score : ''} · ${relTime(last.time)}`
                          : `Aggiunto ${new Date(c.created_at).toLocaleDateString('it-IT')}`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
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
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/40 text-left">
                  <ClientAvatar fullName={c.full_name} className="w-9 h-9 text-sm" />
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
