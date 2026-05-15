import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ClipboardList, Gauge, Compass, AlertTriangle, Lock, Activity, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import InsightsTab from '@/components/insights/InsightsTab';
import TrialSessionModal from '@/components/insights/TrialSessionModal';
import { calcAge, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';
import { analyzeSfma, type SfmaFormValues } from '@/lib/sfma';
import { computeFcsMetrics, type FcsFormValues } from '@/lib/fcs';
import { hasCriticalRedFlags } from '@/lib/fms';
import { parseBreakoutResults, DIAGNOSIS_META, type BreakoutResults } from '@/lib/breakouts';
import EditClientDialog from '@/components/clients/EditClientDialog';
import DeleteClientDialog from '@/components/clients/DeleteClientDialog';
import DeleteAssessmentButton from '@/components/assessments/DeleteAssessmentButton';
import BiometricGuard from '@/components/clients/BiometricGuard';
import ClientAvatar from '@/components/ClientAvatar';

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
  const [latestSfma, setLatestSfma] = useState<(SfmaFormValues & { breakout_results?: unknown; assessed_at?: string }) | null>(null);
  const [latestSfmaBreakouts, setLatestSfmaBreakouts] = useState<BreakoutResults>({});
  const [latestFcs, setLatestFcs] = useState<FcsFormValues | null>(null);
  const [ybtHistory, setYbtHistory] = useState<YbtRow[]>([]);
  const [practitioner, setPractitioner] = useState<{ display_name: string | null; professional_title: string | null } | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    const profilePromise = user
      ? supabase.from('profiles').select('display_name, professional_title').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null });

    const [{ data: c }, { data: a }, { data: s }, { data: f }, { data: y }, { data: p }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('fms_assessments').select('*')
        .eq('client_id', id).order('assessed_at', { ascending: false }),
      supabase.from('sfma_assessments').select('*')
        .eq('client_id', id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('fcs_assessments').select('*')
        .eq('client_id', id).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('ybt_assessments').select('*')
        .eq('client_id', id).order('assessed_at', { ascending: false }),
      profilePromise,
    ]);
    setClient((c ?? null) as Client | null);
    setFms((a ?? []) as unknown as FmsAssessmentRow[]);
    setLatestSfma((s ?? null) as (SfmaFormValues & { breakout_results?: unknown; assessed_at?: string }) | null);
    setLatestSfmaBreakouts(parseBreakoutResults((s as { breakout_results?: unknown } | null)?.breakout_results));
    setLatestFcs((f ?? null) as unknown as FcsFormValues | null);
    setYbtHistory((y ?? []) as unknown as YbtRow[]);
    setPractitioner((p ?? null) as { display_name: string | null; professional_title: string | null } | null);
  }, [id]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const sfmaAlert = useMemo(() => (latestSfma ? analyzeSfma(latestSfma) : null), [latestSfma]);
  const fcsMetrics = useMemo(() => (latestFcs ? computeFcsMetrics(latestFcs) : null), [latestFcs]);
  const redFlags = useMemo(() => hasCriticalRedFlags(fms[0] ?? null), [fms]);

  // ---- FCS biometric pre-flight ------------------------------------------
  const [biometricGuardOpen, setBiometricGuardOpen] = useState(false);
  const launchFcs = (extra?: { foot_length_cm: number }) => {
    if (!client) return;
    const missing = !client.height_cm || !client.weight_kg
      || (!extra && !(latestFcs && (latestFcs as { foot_length_cm?: number | null }).foot_length_cm));
    if (missing) {
      setBiometricGuardOpen(true);
      return;
    }
    const params = new URLSearchParams({ clientId: client.id });
    if (extra?.foot_length_cm) params.set('foot', String(extra.foot_length_cm));
    navigate(`/assessments/fcs/new?${params.toString()}`);
  };

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
        <ClientAvatar fullName={client.full_name} className="w-14 h-14 text-xl font-display" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-xl truncate">{client.full_name}</h1>
          <p className="text-xs text-muted-foreground truncate">{meta || `${fms.length} valutazion${fms.length === 1 ? 'e' : 'i'}`}</p>
          {(client.height_cm || client.weight_kg) && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {client.height_cm ? `${client.height_cm} cm` : ''} {client.weight_kg ? `· ${client.weight_kg} kg` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <EditClientDialog client={client} onSaved={loadAll} />
          <DeleteClientDialog clientId={client.id} clientName={client.full_name} navigateAfter />
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

      {redFlags.hasFlags && (
        <div className="surface-card border-pain/40 bg-pain/5 p-3 flex items-start gap-3">
          <Lock className="w-5 h-5 text-pain shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-pain">Lock Clinico: FCS e YBT bloccati</div>
            <div className="text-muted-foreground">
              Risolvi i red flag della FMS (Dolore / Asimmetria) tramite SFMA prima di procedere con i test di capacità dinamica.
            </div>
            {redFlags.reasons.length > 0 && (
              <ul className="list-disc list-inside text-muted-foreground/80">
                {redFlags.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button onClick={() => navigate(`/assessments/fms/new?clientId=${client.id}`)} className="w-full tap-target h-14 rounded-2xl">
            <Plus className="w-5 h-5 mr-2" /> Nuova FMS
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/assessments/sfma/new?clientId=${client.id}`)}
            className="w-full tap-target h-14 rounded-2xl"
          >
            <Compass className="w-5 h-5 mr-2" /> Nuova SFMA
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full">
                <Button
                  variant="secondary"
                  disabled={redFlags.hasFlags}
                  onClick={() => launchFcs()}
                  className="w-full tap-target h-14 rounded-2xl disabled:opacity-50"
                >
                  {redFlags.hasFlags ? <Lock className="w-5 h-5 mr-2" /> : <Gauge className="w-5 h-5 mr-2" />}
                  Nuova FCS
                </Button>
              </span>
            </TooltipTrigger>
            {redFlags.hasFlags && (
              <TooltipContent className="max-w-xs text-xs">
                Lock Clinico: risolvi i red flag della FMS (Dolore / Asimmetria) tramite SFMA prima del Fundamental Capacity Screen.
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full">
                <Button
                  variant="secondary"
                  disabled={redFlags.hasFlags}
                  onClick={() => navigate(`/assessments/ybt/new?clientId=${client.id}`)}
                  className="w-full tap-target h-14 rounded-2xl disabled:opacity-50"
                >
                  {redFlags.hasFlags ? <Lock className="w-5 h-5 mr-2" /> : <Activity className="w-5 h-5 mr-2" />}
                  Nuova YBT
                </Button>
              </span>
            </TooltipTrigger>
            {redFlags.hasFlags && (
              <TooltipContent className="max-w-xs text-xs">
                Lock Clinico: risolvi i red flag della FMS (Dolore / Asimmetria) tramite SFMA prima dello Y-Balance Test.
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>

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
                <div key={a.id} className="flex items-center justify-between p-2 pl-4 hover:bg-accent/40">
                  <Link to={`/assessments/fms/${a.id}`} className="flex items-center justify-between flex-1 min-w-0 py-2 tap-target">
                    <div className="min-w-0">
                      <div className="font-medium">{new Date(a.assessed_at).toLocaleDateString('it-IT')}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.primary_corrective ?? '—'}</div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-display font-bold text-2xl">{a.total_score ?? '—'}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">/ 21</div>
                    </div>
                  </Link>
                  <DeleteAssessmentButton
                    table="fms_assessments"
                    id={a.id}
                    label={`FMS ${new Date(a.assessed_at).toLocaleDateString('it-IT')}`}
                    onDeleted={loadAll}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <InsightsTab fmsHistory={fms} fcsMetrics={fcsMetrics} ybtHistory={ybtHistory} sfmaLatest={latestSfma} client={client} practitioner={practitioner} clientId={client.id} />
        </TabsContent>
      </Tabs>

      <BiometricGuard
        open={biometricGuardOpen}
        onOpenChange={setBiometricGuardOpen}
        clientId={client.id}
        initial={{
          height_cm: client.height_cm,
          weight_kg: client.weight_kg,
          foot_length_cm: (latestFcs as { foot_length_cm?: number | null } | null)?.foot_length_cm ?? null,
        }}
        onComplete={async ({ foot_length_cm }) => {
          await loadAll();
          launchFcs({ foot_length_cm });
        }}
      />
    </div>
  );
}
