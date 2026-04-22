import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ClipboardList, Gauge, Compass, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InsightsTab from '@/components/insights/InsightsTab';
import { calcAge, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';
import { analyzeSfma, type SfmaFormValues } from '@/lib/sfma';
import { computeFcsMetrics, type FcsFormValues } from '@/lib/fcs';
import { parseBreakoutResults, DIAGNOSIS_META, type BreakoutResults } from '@/lib/breakouts';

interface Client {
  id: string; full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  primary_sport: string | null;
  competition_level: string | null;
  email: string | null;
  notes: string | null;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [fms, setFms] = useState<FmsAssessmentRow[]>([]);
  const [latestSfma, setLatestSfma] = useState<SfmaFormValues | null>(null);
  const [latestSfmaBreakouts, setLatestSfmaBreakouts] = useState<BreakoutResults>({});
  const [latestFcs, setLatestFcs] = useState<FcsFormValues | null>(null);
  const [latestYbt, setLatestYbt] = useState<YbtRow | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: a }, { data: s }, { data: f }, { data: y }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).maybeSingle(),
        supabase.from('fms_assessments').select('*')
          .eq('client_id', id).order('assessed_at', { ascending: false }),
        supabase.from('sfma_assessments').select('*')
          .eq('client_id', id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('fcs_assessments').select('*')
          .eq('client_id', id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('ybt_assessments').select('*')
          .eq('client_id', id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setClient((c ?? null) as Client | null);
      setFms((a ?? []) as unknown as FmsAssessmentRow[]);
      setLatestSfma((s ?? null) as unknown as SfmaFormValues | null);
      setLatestSfmaBreakouts(parseBreakoutResults((s as { breakout_results?: unknown } | null)?.breakout_results));
      setLatestFcs((f ?? null) as unknown as FcsFormValues | null);
      setLatestYbt((y ?? null) as unknown as YbtRow | null);
    })();
  }, [id]);

  const sfmaAlert = useMemo(() => (latestSfma ? analyzeSfma(latestSfma) : null), [latestSfma]);
  const fcsMetrics = useMemo(() => (latestFcs ? computeFcsMetrics(latestFcs) : null), [latestFcs]);

  if (!client) return <div className="text-sm text-muted-foreground">Caricamento…</div>;
  const age = calcAge(client.date_of_birth);
  const meta = [
    age !== null ? `${age} anni` : null,
    client.gender === 'male' ? 'M' : client.gender === 'female' ? 'F' : client.gender === 'other' ? 'Altro' : null,
    client.primary_sport,
    client.competition_level === 'pro' ? 'Pro' : client.competition_level === 'amateur' ? 'Agonista' : client.competition_level === 'recreational' ? 'Amatoriale' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground tap-target">
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <div className="surface-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold text-xl shrink-0">
          {client.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl truncate">{client.full_name}</h1>
          <p className="text-xs text-muted-foreground truncate">{meta || `${fms.length} valutazion${fms.length === 1 ? 'e' : 'i'}`}</p>
          {(client.height_cm || client.weight_kg) && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {client.height_cm ? `${client.height_cm} cm` : ''} {client.weight_kg ? `· ${client.weight_kg} kg` : ''}
            </p>
          )}
        </div>
      </div>

      {sfmaAlert?.hasPain && (
        <div className="surface-card border-pain/40 bg-pain/5 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-pain shrink-0" />
          <div className="text-xs">
            <div className="font-semibold text-pain">SFMA: dolore rilevato</div>
            <div className="text-muted-foreground">
              {sfmaAlert.painPatterns.length} pattern doloros{sfmaAlert.painPatterns.length === 1 ? 'o' : 'i'} nell'ultima valutazione.
            </div>
          </div>
        </div>
      )}

      {Object.keys(latestSfmaBreakouts).length > 0 && (
        <div className="surface-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            <div className="text-xs font-semibold">Diagnosi SFMA (ultimo breakout)</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(latestSfmaBreakouts).map(([key, outcome]) => (
              <span
                key={key}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIAGNOSIS_META[outcome.diagnosis].chip}`}
                title={`${key}: ${DIAGNOSIS_META[outcome.diagnosis].full}`}
              >
                {outcome.diagnosis}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button onClick={() => navigate(`/assessments/fms/new?clientId=${client.id}`)} className="w-full tap-target h-14 rounded-2xl">
          <Plus className="w-5 h-5 mr-2" /> Nuova FMS
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(`/assessments/fcs/new?clientId=${client.id}`)}
          className="w-full tap-target h-14 rounded-2xl"
        >
          <Gauge className="w-5 h-5 mr-2" /> Nuova FCS
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(`/assessments/sfma/new?clientId=${client.id}`)}
          className="w-full tap-target h-14 rounded-2xl"
        >
          <Compass className="w-5 h-5 mr-2" /> Nuova SFMA
        </Button>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="history">Storico</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
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
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <InsightsTab fmsHistory={fms} fcsMetrics={fcsMetrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
