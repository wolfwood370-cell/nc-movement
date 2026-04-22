import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Save, AlertTriangle, ListChecks, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

import {
  analyzeSfma,
  SFMA_DEFAULTS,
  SFMA_PATTERNS,
  sfmaSchema,
  type SfmaFormValues,
  type SfmaPatternKey,
  type SfmaScore,
} from '@/lib/sfma';
import {
  parseBreakoutResults,
  type BreakoutOutcome,
  type BreakoutResults,
} from '@/lib/breakouts';
import BreakoutHub from '@/components/sfma/BreakoutHub';
import { triggerHapticFeedback } from '@/lib/haptics';

// Color classes per score, using design system tokens (HSL via Tailwind config).
const SCORE_STYLES: Record<SfmaScore, { active: string; idle: string; chip: string; full: string; subtitle: string }> = {
  FN: {
    active: 'bg-success text-success-foreground border-success',
    idle: 'border-success/40 text-success hover:bg-success/10',
    chip: 'bg-success text-success-foreground',
    full: 'Functional Non-Painful',
    subtitle: 'Funzionale · Indolore',
  },
  DN: {
    active: 'bg-warning text-warning-foreground border-warning',
    idle: 'border-warning/40 text-warning hover:bg-warning/10',
    chip: 'bg-warning text-warning-foreground',
    full: 'Dysfunctional Non-Painful',
    subtitle: 'Disfunzionale · Indolore',
  },
  FP: {
    active: 'bg-dysfunction text-white border-dysfunction',
    idle: 'border-dysfunction/40 text-dysfunction hover:bg-dysfunction/10',
    chip: 'bg-dysfunction text-white',
    full: 'Functional Painful',
    subtitle: 'Funzionale · Doloroso',
  },
  DP: {
    active: 'bg-pain text-white border-pain',
    idle: 'border-pain/40 text-pain hover:bg-pain/10',
    chip: 'bg-pain text-white',
    full: 'Dysfunctional Painful',
    subtitle: 'Disfunzionale · Doloroso',
  },
};

const SCORE_ORDER: SfmaScore[] = ['FN', 'DN', 'FP', 'DP'];

export default function SfmaAssessment() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const clientIdParam = params.get('clientId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clientId, setClientId] = useState<string | null>(clientIdParam);
  const [clientName, setClientName] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [breakoutResults, setBreakoutResults] = useState<BreakoutResults>({});
  const [savingBreakout, setSavingBreakout] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0); // 0..SFMA_PATTERNS.length-1, then "review"
  const [reviewing, setReviewing] = useState(false);

  const form = useForm<SfmaFormValues>({
    resolver: zodResolver(sfmaSchema),
    defaultValues: SFMA_DEFAULTS,
    mode: 'onBlur',
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const values = watch();
  const analysis = useMemo(() => analyzeSfma(values), [values]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (id && id !== 'new') {
        const { data } = await supabase
          .from('sfma_assessments')
          .select('*, clients(full_name)')
          .eq('id', id)
          .maybeSingle();
        if (!cancelled && data) {
          const next: SfmaFormValues = { ...SFMA_DEFAULTS };
          (Object.keys(SFMA_DEFAULTS) as (keyof SfmaFormValues)[]).forEach((k) => {
            const v = (data as unknown as Record<string, unknown>)[k as string];
            if (v !== undefined && v !== null) {
              (next as unknown as Record<string, unknown>)[k as string] = v as never;
            }
          });
          reset(next);
          setClientId((data as { client_id: string }).client_id);
          setAssessmentId((data as { id: string }).id);
          setBreakoutResults(
            parseBreakoutResults((data as { breakout_results?: unknown }).breakout_results)
          );
          const joined = (data as { clients?: { full_name?: string } | null }).clients;
          setClientName(joined?.full_name ?? '');
          setReadOnly(true);
          setReviewing(true);
        }
      } else if (clientIdParam) {
        const { data } = await supabase
          .from('clients')
          .select('full_name')
          .eq('id', clientIdParam)
          .maybeSingle();
        if (!cancelled && data) setClientName(data.full_name ?? '');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, clientIdParam, reset]);

  const total = SFMA_PATTERNS.length;
  const currentPattern = SFMA_PATTERNS[step];

  const handlePick = (score: SfmaScore) => {
    if (!currentPattern) return;
    triggerHapticFeedback(score === 'FN' ? 'success' : score === 'DN' ? 'neutral' : 'alert');
    setValue(currentPattern.key, score, { shouldDirty: true, shouldValidate: true });
    // Auto-advance
    setTimeout(() => {
      if (step < total - 1) {
        setStep(step + 1);
      } else {
        setReviewing(true);
      }
    }, 140);
  };

  const goBackStep = () => {
    if (reviewing) {
      setReviewing(false);
      return;
    }
    if (step > 0) setStep(step - 1);
  };

  const editPattern = (key: string) => {
    const idx = SFMA_PATTERNS.findIndex((p) => p.key === key);
    if (idx >= 0) {
      setStep(idx);
      setReviewing(false);
    }
  };

  const onSubmit = async (data: SfmaFormValues) => {
    if (!user || !clientId) {
      toast.error('Cliente mancante');
      return;
    }
    setSaving(true);
    const payload = {
      ...data,
      practitioner_id: user.id,
      client_id: clientId,
    };
    const { data: saved, error } = await supabase
      .from('sfma_assessments')
      .insert(payload as never)
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('SFMA Top-Tier salvato');
    navigate(`/assessments/sfma/${saved!.id}`, { replace: true });
  };

  const handleSaveBreakout = async (patternKey: SfmaPatternKey, outcome: BreakoutOutcome) => {
    if (!assessmentId) {
      toast.error('Salva prima la valutazione SFMA.');
      return;
    }
    const next: BreakoutResults = { ...breakoutResults, [patternKey]: outcome };
    setSavingBreakout(true);
    const { error } = await supabase
      .from('sfma_assessments')
      .update({ breakout_results: next as never })
      .eq('id', assessmentId);
    setSavingBreakout(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBreakoutResults(next);
    toast.success(`Breakout salvato: ${outcome.diagnosis}`);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;

  const progressPct = reviewing ? 100 : Math.round(((step) / total) * 100);

  // ============ READ-ONLY / RESULTS VIEW ============
  if (readOnly) {
    return (
      <div className="space-y-5 pb-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground tap-target"
        >
          <ChevronLeft className="w-4 h-4" /> Indietro
        </button>
        <header>
          <h1 className="font-display font-bold text-2xl">SFMA — Risultati</h1>
          <p className="text-sm text-muted-foreground">
            {clientName ? <>Cliente: <span className="text-foreground">{clientName}</span></> : 'Cliente'}
          </p>
        </header>
        <ResultsPanel analysis={analysis} values={values} />
        <BreakoutHub
          values={values}
          results={breakoutResults}
          onSave={handleSaveBreakout}
          saving={savingBreakout}
        />
        {values.clinical_notes && (
          <div className="surface-card p-4 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note cliniche</div>
            <div className="text-sm whitespace-pre-wrap">{values.clinical_notes}</div>
          </div>
        )}
      </div>
    );
  }

  // ============ WIZARD VIEW ============
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-32">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground tap-target"
      >
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <header className="space-y-2">
        <h1 className="font-display font-bold text-2xl">SFMA — Top-Tier</h1>
        <p className="text-sm text-muted-foreground">
          {clientName ? <>Cliente: <span className="text-foreground">{clientName}</span></> : 'Cliente'}
        </p>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{reviewing ? 'Revisione' : `Step ${step + 1} di ${total}`}</span>
            <span>{analysis.completed}/{total} valutati</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>
      </header>

      {!reviewing && currentPattern && (
        <section className="space-y-5">
          <div className="surface-card p-6 text-center space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Pattern {step + 1} / {total}
            </div>
            <h2 className="font-display font-bold text-2xl leading-tight">{currentPattern.label}</h2>
            {values[currentPattern.key] && (
              <div className="pt-1">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${SCORE_STYLES[values[currentPattern.key] as SfmaScore].chip}`}>
                  Selezionato: {values[currentPattern.key]}
                </span>
              </div>
            )}
          </div>

          <Controller
            control={control}
            name={currentPattern.key}
            render={() => (
              <div className="grid grid-cols-1 gap-3">
                {SCORE_ORDER.map((s) => {
                  const style = SCORE_STYLES[s];
                  const active = values[currentPattern.key] === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handlePick(s)}
                      className={`tap-target w-full rounded-2xl border-2 px-5 py-5 flex items-center justify-between gap-4 transition-all ${
                        active
                          ? style.active + ' shadow-elevated scale-[1.01]'
                          : 'bg-background ' + style.idle
                      }`}
                      aria-label={style.full}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-display font-bold text-3xl w-12 text-left">{s}</span>
                        <span className="flex flex-col items-start text-left min-w-0">
                          <span className="font-display font-semibold text-sm leading-tight">{style.full}</span>
                          <span className={`text-[11px] ${active ? 'opacity-90' : 'text-muted-foreground'}`}>{style.subtitle}</span>
                        </span>
                      </div>
                      <ChevronRight className={`w-5 h-5 shrink-0 ${active ? '' : 'opacity-40'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          />

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={goBackStep}
              disabled={step === 0}
              className="tap-target"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Precedente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewing(true)}
              disabled={analysis.completed === 0}
              className="tap-target"
            >
              Vai al riepilogo
            </Button>
          </div>
        </section>
      )}

      {reviewing && (
        <section className="space-y-5">
          <div className="surface-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <div className="font-display font-semibold">Riepilogo punteggi</div>
            </div>
            <ul className="divide-y divide-border/60">
              {SFMA_PATTERNS.map((p, idx) => {
                const v = values[p.key] as SfmaScore | null | undefined;
                return (
                  <li key={p.key} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                      <span className="text-sm truncate">{p.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v ? (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${SCORE_STYLES[v].chip}`}>
                          {v}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">—</span>
                      )}
                      <button
                        type="button"
                        onClick={() => editPattern(p.key)}
                        className="tap-target text-muted-foreground hover:text-foreground"
                        aria-label={`Modifica ${p.label}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <ResultsPanel analysis={analysis} values={values} />

          <div className="surface-card p-4 space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note cliniche</label>
            <Controller
              control={control}
              name="clinical_notes"
              render={({ field }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Osservazioni, asimmetrie, contesto del test…"
                  className="min-h-[100px]"
                />
              )}
            />
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
            <div className="max-w-2xl mx-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setReviewing(false); setStep(Math.max(0, analysis.completed - 1)); }}
                className="tap-target h-14 rounded-2xl"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                type="submit"
                disabled={saving || analysis.completed === 0}
                className="flex-1 tap-target h-14 rounded-2xl text-base"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Salvataggio…' : `Salva SFMA (${analysis.completed}/${total})`}
              </Button>
            </div>
          </div>
        </section>
      )}
    </form>
  );
}

// ============ RESULTS PANEL (shared between review & read-only) ============
function ResultsPanel({
  analysis,
  values,
}: {
  analysis: ReturnType<typeof analyzeSfma>;
  values: SfmaFormValues;
}) {
  const painBreakouts = analysis.breakouts.filter((b) => b.score === 'FP' || b.score === 'DP');
  const dysfunctionBreakouts = analysis.breakouts.filter((b) => b.score === 'DN');

  return (
    <div className="space-y-4">
      {analysis.hasPain && (
        <div className="surface-card border-pain/40 bg-pain/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-pain shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-display font-semibold text-pain">Allerta clinica — Dolore rilevato</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {analysis.painPatterns.length} pattern doloros{analysis.painPatterns.length === 1 ? 'o' : 'i'}.
              Approfondimento clinico immediato consigliato.
            </div>
          </div>
        </div>
      )}

      {painBreakouts.length > 0 && (
        <div className="surface-card border-pain/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-pain" />
            <div className="font-display font-semibold text-pain">Red Flags — Pain (Breakout urgente)</div>
          </div>
          <ul className="space-y-2">
            {painBreakouts.map((b) => (
              <li key={b.key} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{b.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{b.breakout}</div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${SCORE_STYLES[b.score].chip}`}>
                  {b.score}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dysfunctionBreakouts.length > 0 && (
        <div className="surface-card border-warning/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-warning" />
            <div className="font-display font-semibold text-warning">Disfunzioni di movimento (Breakout DN)</div>
          </div>
          <ul className="space-y-2">
            {dysfunctionBreakouts.map((b) => (
              <li key={b.key} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{b.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{b.breakout}</div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${SCORE_STYLES[b.score].chip}`}>
                  {b.score}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Identificare se la causa è di mobilità o controllo motorio.
          </p>
        </div>
      )}

      {analysis.breakouts.length === 0 && analysis.completed === analysis.total && (
        <div className="surface-card border-success/40 bg-success/5 p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <div className="font-display font-semibold text-success">Tutti i pattern FN</div>
            <div className="text-xs text-muted-foreground mt-0.5">Nessun breakout richiesto.</div>
          </div>
        </div>
      )}

      {/* values reference suppresses unused warning in some setups */}
      <span className="hidden">{Object.keys(values).length}</span>
    </div>
  );
}
