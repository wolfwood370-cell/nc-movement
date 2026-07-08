import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, CalendarClock, Sparkles, UserRound, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PhoneShell from '@/components/PhoneShell';
import FmsWizard from '@/components/fms/FmsWizard';
import { useFormDraft } from '@/hooks/useFormDraft';
import {
  computePatterns, computeTotal, emptyFmsScores, type FmsScores,
  primaryCorrective, type FmsAssessmentType,
} from '@/lib/fms';

type PackSessionRow = { id: string; type: 'Triage' | 'PT Pack'; number: number | null; status: string };
type PackResult = { fmsAssessmentId: string; sessions: PackSessionRow[] };

/**
 * Nuova FMS in modalità wizard (route `/assessments/fms/new`).
 * Al termine salva la valutazione + genera Triage e 3 PT Pack, quindi mostra
 * la schermata di conferma con azioni "Vai al Profilo" / "Programma PT Pack".
 * La revisione delle valutazioni esistenti resta su `/assessments/fms/:id`.
 */
export default function FmsWizardPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientIdParam = params.get('clientId');
  const { user } = useAuth();

  const [scores, setScores] = useState<FmsScores>(emptyFmsScores());
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string | null>(clientIdParam);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packResult, setPackResult] = useState<PackResult | null>(null);

  const draftKey = clientIdParam ? `nc:fms:new:${clientIdParam}` : null;
  const { clear: clearDraft } = useFormDraft<FmsScores>(draftKey, scores);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (clientIdParam) {
        const { data: clientData } = await supabase.from('clients')
          .select('full_name').eq('id', clientIdParam).maybeSingle();
        setClientName(clientData?.full_name ?? '');
        setClientId(clientIdParam);
        const { data: lastAssessment } = await supabase.from('fms_assessments')
          .select('tibia_length_cm, hand_length_cm')
          .eq('client_id', clientIdParam)
          .order('assessed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastAssessment) {
          setScores(prev => ({
            ...prev,
            tibia_length_cm: lastAssessment.tibia_length_cm ?? prev.tibia_length_cm,
            hand_length_cm: lastAssessment.hand_length_cm ?? prev.hand_length_cm,
          }));
        }
      }
      setLoading(false);
    })();
  }, [clientIdParam]);

  const setField = <K extends keyof FmsScores>(k: K, v: FmsScores[K]) =>
    setScores(p => ({ ...p, [k]: v }));

  const setAssessmentType = (t: FmsAssessmentType) => {
    setScores(p => {
      if (t === 'modified') {
        return {
          ...p,
          assessment_type: 'modified',
          hurdle_step_left: null, hurdle_step_right: null,
          inline_lunge_left: null, inline_lunge_right: null,
          trunk_stability_pushup_score: null,
          rotary_stability_left: null, rotary_stability_right: null,
          clearing_spinal_extension_pain: false,
          clearing_spinal_flexion_pain: false,
        };
      }
      return { ...p, assessment_type: 'full' };
    });
  };

  const save = async () => {
    if (!user || !clientId) { toast.error('Cliente mancante'); return; }
    const patterns = computePatterns(scores);
    const total = computeTotal(patterns);
    if (total === null) { toast.error('Compila tutti i pattern prima di salvare.'); return; }
    const corrective = primaryCorrective(patterns);
    setSaving(true);
    const payload = {
      practitioner_id: user.id,
      client_id: clientId,
      ...scores,
      total_score: total,
      primary_corrective: corrective.label,
      assessed_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('fms_assessments').insert(payload).select('id').single();
    if (error || !data) { setSaving(false); toast.error(error?.message ?? 'Errore salvataggio'); return; }
    const fmsAssessmentId = data.id;
    const sessionRows = [
      { practitioner_id: user.id, client_id: clientId, fms_assessment_id: fmsAssessmentId,
        session_type: 'Triage' as const, status: 'scheduled' as const, session_number: null },
      { practitioner_id: user.id, client_id: clientId, fms_assessment_id: fmsAssessmentId,
        session_type: 'PT Pack' as const, status: 'draft' as const, session_number: 1 },
      { practitioner_id: user.id, client_id: clientId, fms_assessment_id: fmsAssessmentId,
        session_type: 'PT Pack' as const, status: 'draft' as const, session_number: 2 },
      { practitioner_id: user.id, client_id: clientId, fms_assessment_id: fmsAssessmentId,
        session_type: 'PT Pack' as const, status: 'draft' as const, session_number: 3 },
    ];
    const { data: inserted, error: sErr } = await supabase
      .from('sessions')
      .insert(sessionRows)
      .select('id, session_type, session_number, status');
    setSaving(false);
    if (sErr) {
      toast.error(`Valutazione salvata, ma errore generando il PT Pack: ${sErr.message}`);
      clearDraft();
      navigate(`/assessments/fms/${fmsAssessmentId}`, { replace: true });
      return;
    }
    clearDraft();
    toast.success('Valutazione salvata e PT Pack generato');
    setPackResult({
      fmsAssessmentId,
      sessions: (inserted ?? []).map(r => ({
        id: r.id,
        type: r.session_type as 'Triage' | 'PT Pack',
        number: r.session_number,
        status: r.status,
      })),
    });
  };

  if (loading) {
    return (
      <PhoneShell>
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </PhoneShell>
    );
  }

  if (saving && !packResult) {
    return (
      <PhoneShell>
        <div className="flex-1 p-4 space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <p className="text-xs text-muted-foreground text-center pt-2">
            Salvataggio screening e generazione del PT Pack…
          </p>
        </div>
      </PhoneShell>
    );
  }

  if (packResult) {
    const ptPack = packResult.sessions
      .filter(s => s.type === 'PT Pack')
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const rows = [
      { key: 'triage', title: 'Sessione di Prova (Triage)', status: 'Da svolgere', icon: ClipboardCheck },
      ...ptPack.map(s => ({
        key: `pt-${s.number}`,
        title: `PT Pack · Sessione ${s.number}`,
        status: 'Da programmare',
        icon: CalendarClock,
      })),
    ];
    return (
      <PhoneShell>
        <main className="flex-1 overflow-y-auto p-4 space-y-5 animate-fade-in scrollbar-none">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold">FMS · Riepilogo</p>
            <h1 className="font-display font-bold text-2xl">{clientName || 'Cliente'}</h1>
          </header>

          <div className="rounded-2xl border border-success/40 bg-success/5 p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11 h-11 rounded-full bg-success/15 grid place-items-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-[15px] leading-tight">
                  Screening FMS completato e PT Pack generato
                </h2>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Triage predisposta (ancora da svolgere) e 3 sessioni PT Pack pronte per la programmazione.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-2">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" /> Entità generate
            </div>
            <ul className="divide-y divide-border">
              {rows.map(r => {
                const Ico = r.icon;
                return (
                  <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-muted text-muted-foreground">
                        <Ico className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-sm truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground">{r.status}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md bg-warning/15 text-warning-foreground">
                      Draft
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <Button
              className="h-12 rounded-2xl shadow-cta"
              onClick={() => clientId && navigate(`/clients/${clientId}?tab=calendar`)}
            >
              <CalendarClock className="w-4 h-4 mr-2" /> Programma PT Pack
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={() => clientId && navigate(`/clients/${clientId}`)}
            >
              <UserRound className="w-4 h-4 mr-2" /> Vai al profilo atleta
            </Button>
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => navigate(`/assessments/fms/${packResult.fmsAssessmentId}`, { replace: true })}
            >
              <FileText className="w-4 h-4 mr-2" /> Apri valutazione
            </Button>
          </div>
        </main>
      </PhoneShell>
    );
  }

  return (
    <FmsWizard
      scores={scores}
      setField={setField}
      setAssessmentType={setAssessmentType}
      clientName={clientName}
      saving={saving}
      onSave={save}
      onExit={() => navigate('/assessments')}
    />
  );
}
