import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Client { id: string; full_name: string; date_of_birth: string | null; sex: string | null; notes: string | null }
interface Fms { id: string; assessed_at: string; total_score: number | null; primary_corrective: string | null }

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [fms, setFms] = useState<Fms[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).maybeSingle(),
        supabase.from('fms_assessments').select('id, assessed_at, total_score, primary_corrective')
          .eq('client_id', id).order('assessed_at', { ascending: false }),
      ]);
      setClient((c ?? null) as Client | null);
      setFms((a ?? []) as Fms[]);
    })();
  }, [id]);

  if (!client) return <div className="text-sm text-muted-foreground">Caricamento…</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground tap-target">
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <div className="surface-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold text-xl">
          {client.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl truncate">{client.full_name}</h1>
          <p className="text-xs text-muted-foreground">{fms.length} valutazion{fms.length === 1 ? 'e' : 'i'}</p>
        </div>
      </div>

      <Button onClick={() => navigate(`/assessments/fms/new?clientId=${client.id}`)} className="w-full tap-target h-14 rounded-2xl">
        <Plus className="w-5 h-5 mr-2" /> Nuova valutazione FMS
      </Button>

      <section>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Storico FMS</h2>
        {fms.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nessuna valutazione FMS.</p>
          </div>
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {fms.map(a => (
              <Link key={a.id} to={`/assessments/fms/${a.id}`} className="flex items-center justify-between p-4 hover:bg-accent/40 tap-target">
                <div className="min-w-0">
                  <div className="font-medium">{new Date(a.assessed_at).toLocaleDateString('it-IT')}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.primary_corrective ?? '—'}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-display font-bold text-2xl">{a.total_score ?? '—'}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">/ 21</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
