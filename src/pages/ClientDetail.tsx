import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ClipboardList, Gauge, Compass, AlertTriangle, Lock, Activity, CheckCircle2, Sparkles, Dumbbell, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generatePtPackSet, PT_GOALS, type PtGoal, type PtPackProgram } from '@/lib/ptPackProgram';
import InsightsTab from '@/components/insights/InsightsTab';
import { calcAge, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';
import { analyzeSfma, type SfmaFormValues } from '@/lib/sfma';
import { computeFcsMetrics, type FcsFormValues } from '@/lib/fcs';
import { hasCriticalRedFlags, fmsMaxTotal, isModifiedFms } from '@/lib/fms';
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
  const [sessions, setSessions] = useState<Array<{ id: string; session_type: string; session_number: number | null; status: string; scheduled_at: string | null; created_at: string; fms_assessment_id: string | null }>>([]);
  const [practitioner, setPractitioner] = useState<{ display_name: string | null; professional_title: string | null } | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    const profilePromise = user
      ? supabase.from('profiles').select('display_name, professional_title').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null });

    const [{ data: c }, { data: a }, { data: s }, { data: f }, { data: y }, { data: p }, { data: sess }] = await Promise.all([
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
      supabase.from('sessions')
        .select('id, session_type, session_number, status, scheduled_at, created_at, fms_assessment_id')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ]);
    setClient((c ?? null) as Client | null);
    setFms((a ?? []) as unknown as FmsAssessmentRow[]);
    setLatestSfma((s ?? null) as (SfmaFormValues & { breakout_results?: unknown; assessed_at?: string }) | null);
    setLatestSfmaBreakouts(parseBreakoutResults((s as { breakout_results?: unknown } | null)?.breakout_results));
    setLatestFcs((f ?? null) as unknown as FcsFormValues | null);
    setYbtHistory((y ?? []) as unknown as YbtRow[]);
    setPractitioner((p ?? null) as { display_name: string | null; professional_title: string | null } | null);
    setSessions((sess ?? []) as typeof sessions);
  }, [id]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Auto-generate the PT Pack from the most recent Modified FMS when the
  // client has no sessions yet. Unique indexes on `sessions` make this safe
  // even if the effect runs concurrently — duplicates are silently ignored.
  useEffect(() => {
    if (!client) return;
    if (sessions.length > 0) return;
    const lastModified = fms.find(a => isModifiedFms(a as unknown as Parameters<typeof isModifiedFms>[0]));
    if (!lastModified) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const rows = [
        { practitioner_id: user.id, client_id: client.id, fms_assessment_id: lastModified.id,
          session_type: 'Triage' as const, status: 'completed' as const, session_number: null },
        { practitioner_id: user.id, client_id: client.id, fms_assessment_id: lastModified.id,
          session_type: 'PT Pack' as const, status: 'draft' as const, session_number: 1 },
        { practitioner_id: user.id, client_id: client.id, fms_assessment_id: lastModified.id,
          session_type: 'PT Pack' as const, status: 'draft' as const, session_number: 2 },
        { practitioner_id: user.id, client_id: client.id, fms_assessment_id: lastModified.id,
          session_type: 'PT Pack' as const, status: 'draft' as const, session_number: 3 },
      ];
      const { error } = await supabase.from('sessions').insert(rows);
      // 23505 = unique violation → another tab/session already generated the pack.
      if (error && error.code !== '23505') return;
      if (!cancelled) void loadAll();
    })();
    return () => { cancelled = true; };
  }, [client, fms, sessions.length, loadAll]);


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

      <Tabs defaultValue="ptpack" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="ptpack">PT Pack</TabsTrigger>
          <TabsTrigger value="history">Storico</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="ptpack" className="mt-4">
          <PtPackPanel sessions={sessions} clientId={client.id} latestFms={fms[0] ?? null} onChanged={loadAll} />
        </TabsContent>



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
                      <div className="text-[10px] uppercase text-muted-foreground">
                        / {fmsMaxTotal(a as unknown as Parameters<typeof fmsMaxTotal>[0])}
                        {isModifiedFms(a as unknown as Parameters<typeof isModifiedFms>[0]) && (
                          <span className="ml-1 text-primary font-bold">· Mod</span>
                        )}
                      </div>
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

// =====================================================================
// PT Pack panel — generates and displays the program (exercises, sets,
// reps, TUT, rest) for each of the 3 PT Pack sessions.
// =====================================================================
type SessionRow = {
  id: string; session_type: string; session_number: number | null;
  status: string; scheduled_at: string | null; created_at: string; fms_assessment_id: string | null;
};

function PtPackPanel({ sessions, clientId, latestFms, onChanged }: {
  sessions: SessionRow[]; clientId: string; latestFms: FmsAssessmentRow | null; onChanged: () => void;
}) {
  const navigate = useNavigate();
  const ptPack = sessions.filter(s => s.session_type === 'PT Pack')
    .sort((a, b) => (a.session_number ?? 0) - (b.session_number ?? 0));
  const triage = sessions.find(s => s.session_type === 'Triage');

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [programs, setPrograms] = useState<Record<string, { program: PtPackProgram; goal: string }>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  // Load existing programs for all PT Pack sessions
  useEffect(() => {
    if (ptPack.length === 0) return;
    let cancelled = false;
    (async () => {
      const ids = ptPack.map(s => s.id);
      const { data } = await supabase.from('sessions')
        .select('id, program, goal')
        .in('id', ids);
      if (cancelled || !data) return;
      const map: Record<string, { program: PtPackProgram; goal: string }> = {};
      for (const r of data) {
        if (r.program && r.goal) {
          map[r.id] = { program: r.program as unknown as PtPackProgram, goal: r.goal as string };
        }
      }
      setPrograms(map);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptPack.map(s => s.id).join(','), generating]);

  const generated = ptPack.length > 0 && ptPack.every(s => programs[s.id]);
  const sharedGoal = generated ? programs[ptPack[0].id]?.goal : null;

  const handleGenerateAll = async (selectedGoal: PtGoal) => {
    setGoalDialogOpen(false);
    setGenerating(true);
    try {
      const progs = await generatePtPackSet(selectedGoal, latestFms);
      // Batch-update the 3 session rows (one update per session — Supabase
      // doesn't support multi-row update of distinct values in a single call).
      await Promise.all(ptPack.map((s, i) => {
        const prog = progs[i];
        if (!prog) return Promise.resolve();
        return supabase.from('sessions')
          .update({ program: JSON.parse(JSON.stringify(prog)), goal: selectedGoal })
          .eq('id', s.id);
      }));
      onChanged();
    } finally {
      setGenerating(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="surface-card p-8 text-center space-y-3">
        <Sparkles className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nessun PT Pack generato. Completa una nuova FMS per creare automaticamente il pacchetto promozionale.
        </p>
        <Button onClick={() => navigate(`/assessments/fms/new?clientId=${clientId}`)}>
          <Plus className="w-4 h-4 mr-2" /> Nuova FMS
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {triage && (
        <div className="surface-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/15 text-success grid place-items-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-sm">Sessione Triage</div>
            <div className="text-[11px] text-muted-foreground">
              {new Date(triage.created_at).toLocaleDateString('it-IT')} · Completata
            </div>
          </div>
        </div>
      )}

      {/* Single Genera CTA — produces all 3 coherent sessions at once */}
      <div className="surface-card p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${
          generated ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-sm">PT Pack — 3 Sessioni</div>
          <div className="text-[11px] text-muted-foreground">
            {generated
              ? <>Obiettivo: <span className="font-semibold text-foreground">{sharedGoal}</span> · Riscaldamento dalla scheda <span className="font-semibold">Insights</span></>
              : 'Genera in un click tutte e 3 le sessioni con coerenza unificante'}
          </div>
        </div>
        <Button size="sm" onClick={() => setGoalDialogOpen(true)} disabled={generating}>
          {generating ? 'Generazione…' : generated ? 'Rigenera' : 'Genera'}
        </Button>
      </div>

      <div className="space-y-3">
        {ptPack.map(s => {
          const entry = programs[s.id];
          return (
            <PtPackSessionCard
              key={s.id}
              session={s}
              program={entry?.program ?? null}
              goal={entry?.goal ?? null}
              open={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          );
        })}
      </div>

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Obiettivo del PT Pack</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Seleziona l'obiettivo di allenamento. Verranno generate <span className="font-semibold text-foreground">tutte e 3 le sessioni</span> in modo coerente,
            bypassando le limitazioni rilevate dall'FMS. Il riscaldamento è gestito separatamente nella scheda Insights.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {PT_GOALS.map(g => (
              <button
                key={g.value}
                onClick={() => void handleGenerateAll(g.value)}
                disabled={generating}
                className="text-left rounded-xl border border-border bg-card p-3 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div className="font-display font-semibold text-sm">{g.label}</div>
                <div className="text-[11px] text-muted-foreground">{g.desc}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
// Single PT Pack session — collapsible card with a readable, mobile-first
// block layout (no dense table). Each exercise renders as its own row with
// a clear block badge and stat chips for sets/reps/TUT/rest.
// =====================================================================
function PtPackSessionCard({ session, program, goal, open, onToggle }: {
  session: SessionRow;
  program: PtPackProgram | null;
  goal: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const hasProgram = !!program;

  // Group exercises by block letter (W / A / B / C) for visual separation
  const groups = useMemo(() => {
    if (!program) return [] as { key: string; title: string; items: PtPackProgram['exercises'] }[];
    const titles: Record<string, string> = {
      W: 'Warm-up Correttivo · forzato dal FMS',
      A: 'Blocco A · Forza',
      B: 'Blocco B · Accessori',
      C: 'Blocco C · Finisher',
    };
    const order = ['W', 'A', 'B', 'C'];
    const out: Record<string, PtPackProgram['exercises']> = {};
    for (const ex of program.exercises) {
      const key = ex.block.charAt(0);
      (out[key] ??= []).push(ex);
    }
    return order.filter(k => out[k]).map(k => ({ key: k, title: titles[k] ?? `Blocco ${k}`, items: out[k] }));
  }, [program]);

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={onToggle}
        disabled={!hasProgram}
        className="w-full p-4 flex items-center gap-3 text-left disabled:cursor-default"
      >
        <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${
          hasProgram ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          <Dumbbell className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-sm">
            Sessione {session.session_number}
            {program && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">· {program.focus}</span>}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {hasProgram
              ? <>{program?.exercises.length} esercizi · Obiettivo {goal}</>
              : 'In attesa di generazione'}
          </div>
        </div>
        {hasProgram && (
          <span className="text-[11px] text-primary font-semibold shrink-0">
            {open ? 'Nascondi' : 'Apri'}
          </span>
        )}
      </button>

      {hasProgram && open && program && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-5">
          {program.proxy_applied && program.assessment_type === 'modified' && (
            <div className="rounded-xl border border-primary/50 bg-primary/10 p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-0.5">
                  Protezione Clinica · FMS Modificato
                </div>
                <p className="text-[12px] leading-snug text-foreground">
                  Sessione impostata su <span className="font-semibold">Tier {program.tier === 'corrective' ? 'Correttivo' : program.tier === 'integration' ? 'Integrazione' : 'Performance'}</span>
                  {' '}tramite proxy di mobilità: test nativi non eseguiti per screening rapido,
                  applicata protezione gerarchica FMS (Cook) sui pattern non valutati.
                </p>
              </div>
            </div>
          )}
          {program.tier_driver && (
            <div className={`rounded-xl border p-3 flex items-start gap-2 ${
              program.tier === 'corrective' ? 'border-warning/40 bg-warning/10 text-warning-foreground'
              : program.tier === 'integration' ? 'border-primary/30 bg-primary/5'
              : 'border-success/40 bg-success/10'
            }`}>
              <span className={`text-[10px] uppercase tracking-wider font-bold shrink-0 px-1.5 py-0.5 rounded ${
                program.tier === 'corrective' ? 'bg-warning text-warning-foreground'
                : program.tier === 'integration' ? 'bg-primary/15 text-primary'
                : 'bg-success text-success-foreground'
              }`}>FMS · Causa→Effetto</span>
              <p className="text-[12px] font-medium leading-snug">{program.tier_driver}</p>
            </div>
          )}
          {program.session_rationale && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary">Razionale Scientifico</div>
              <p className="text-[12px] text-foreground leading-snug">{program.session_rationale}</p>
            </div>
          )}
          {groups.map(g => (
            <div key={g.key} className="space-y-2">
              <div className={`text-[10px] uppercase tracking-wider font-bold ${g.key === 'W' ? 'text-warning' : 'text-primary'}`}>{g.title}</div>
              <div className="space-y-2">
                {g.items.map((e, i) => (
                  <div key={`${g.key}-${i}`} className={`rounded-xl border p-3 space-y-2 ${g.key === 'W' ? 'border-warning/40 bg-warning/5' : 'border-border bg-card'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`font-mono text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 ${g.key === 'W' ? 'text-warning bg-warning/15' : 'text-primary bg-primary/10'}`}>
                        {e.block}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-semibold text-sm leading-tight">{e.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{e.label}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-0">
                      <StatChip label="Serie" value={String(e.sets)} />
                      <StatChip label="Reps" value={e.reps} />
                      <StatChip label="TUT" value={e.tut} />
                      <StatChip label="Recupero" value={e.rest} />
                    </div>
                    {e.rationale && (
                      <div className="text-[11px] text-muted-foreground leading-snug border-l-2 border-primary/30 pl-2">
                        <span className="font-semibold text-foreground">Perché: </span>{e.rationale}
                      </div>
                    )}
                    {e.notes && (
                      <div className="text-[11px] text-muted-foreground italic">{e.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {program.weak_link && (
            <div className="text-[11px] text-muted-foreground italic">
              Weak link FMS considerato: <span className="font-semibold text-foreground">{program.weak_link}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1 rounded-md bg-background border border-border px-2 py-1">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <span className="text-[12px] font-mono font-bold">{value}</span>
    </div>
  );
}

