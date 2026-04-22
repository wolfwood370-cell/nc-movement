import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Save, AlertTriangle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import {
  analyzeSfma,
  SFMA_DEFAULTS,
  SFMA_PATTERNS,
  SFMA_SCORES,
  sfmaSchema,
  type SfmaFormValues,
  type SfmaScore,
} from '@/lib/sfma';

// Color classes per score, using design system tokens (HSL via Tailwind config).
const SCORE_STYLES: Record<SfmaScore, { active: string; idle: string; chip: string; full: string }> = {
  FN: {
    active: 'bg-success text-success-foreground border-success',
    idle: 'border-success/40 text-success hover:bg-success/10',
    chip: 'bg-success text-success-foreground',
    full: 'Functional Non-Painful',
  },
  DN: {
    active: 'bg-warning text-warning-foreground border-warning',
    idle: 'border-warning/40 text-warning hover:bg-warning/10',
    chip: 'bg-warning text-warning-foreground',
    full: 'Dysfunctional Non-Painful',
  },
  FP: {
    active: 'bg-dysfunction text-white border-dysfunction',
    idle: 'border-dysfunction/40 text-dysfunction hover:bg-dysfunction/10',
    chip: 'bg-dysfunction text-white',
    full: 'Functional Painful',
  },
  DP: {
    active: 'bg-pain text-white border-pain',
    idle: 'border-pain/40 text-pain hover:bg-pain/10',
    chip: 'bg-pain text-white',
    full: 'Dysfunctional Painful',
  },
};

function ScoreButtons({
  value,
  onChange,
  disabled,
}: {
  value: SfmaScore | null | undefined;
  onChange: (v: SfmaScore) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SFMA_SCORES.map((s) => {
        const active = value === s;
        const style = SCORE_STYLES[s];
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            className={`tap-target h-14 rounded-xl border-2 font-display font-bold text-lg transition-all ${
              active ? style.active + ' shadow-elevated scale-[1.02]' : 'bg-background ' + style.idle
            } ${disabled ? 'opacity-60' : ''}`}
            aria-label={style.full}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

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

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const form = useForm<SfmaFormValues>({
    resolver: zodResolver(sfmaSchema),
    defaultValues: SFMA_DEFAULTS,
    mode: 'onBlur',
  });

  const { control, handleSubmit, reset, watch } = form;
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
          const joined = (data as { clients?: { full_name?: string } | null }).clients;
          setClientName(joined?.full_name ?? '');
          setReadOnly(true);
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

  const focusNext = (currentKey: string) => {
    const idx = SFMA_PATTERNS.findIndex((p) => p.key === currentKey);
    const nextPattern = SFMA_PATTERNS[idx + 1];
    if (!nextPattern) return;
    const el = cardRefs.current[nextPattern.key];
    if (el) {
      // Slight delay so the active class repaints first
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
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

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-32">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground tap-target"
      >
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <header>
        <h1 className="font-display font-bold text-2xl">SFMA — Top-Tier</h1>
        <p className="text-sm text-muted-foreground">
          {clientName ? <>Cliente: <span className="text-foreground">{clientName}</span></> : 'Cliente'}
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          {analysis.completed} / {analysis.total} pattern valutati
        </div>
      </header>

      {/* High-priority alert */}
      {analysis.hasPain && (
        <div className="surface-card border-pain/40 bg-pain/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-pain shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-display font-semibold text-pain">Allerta clinica — Dolore rilevato</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {analysis.painPatterns.length} pattern doloros{analysis.painPatterns.length === 1 ? 'o' : 'i'}.
              Considerare immediato approfondimento clinico.
            </div>
            <ul className="mt-2 space-y-1">
              {analysis.painPatterns.map((p) => (
                <li key={p.key} className="text-xs flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SCORE_STYLES[p.score].chip}`}>
                    {p.score}
                  </span>
                  <span>{p.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Pattern cards */}
      <div className="space-y-3">
        {SFMA_PATTERNS.map((p) => (
          <div
            key={p.key}
            ref={(el) => { cardRefs.current[p.key] = el; }}
            className="surface-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-display font-semibold text-sm">{p.label}</div>
              {values[p.key] && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCORE_STYLES[values[p.key] as SfmaScore].chip}`}>
                  {values[p.key]}
                </span>
              )}
            </div>
            <Controller
              control={control}
              name={p.key}
              render={({ field }) => (
                <ScoreButtons
                  value={field.value}
                  disabled={readOnly}
                  onChange={(v) => {
                    field.onChange(v);
                    if (!readOnly) focusNext(p.key);
                  }}
                />
              )}
            />
          </div>
        ))}
      </div>

      {/* Breakouts required */}
      {analysis.breakouts.length > 0 && (
        <div className="surface-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            <div className="font-display font-semibold">Breakout consigliati</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.breakouts.map((b) => (
              <span
                key={b.key}
                className={`text-xs px-2.5 py-1 rounded-lg border ${
                  b.score === 'DP' || b.score === 'FP'
                    ? 'border-pain/40 text-pain bg-pain/5'
                    : 'border-warning/40 text-warning bg-warning/5'
                }`}
              >
                {b.breakout}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ogni pattern non-FN richiede un breakout dedicato per identificare la fonte (mobilità vs stabilità).
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="surface-card p-4 space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note cliniche</label>
        <Controller
          control={control}
          name="clinical_notes"
          render={({ field }) => (
            <Textarea
              value={field.value ?? ''}
              onChange={field.onChange}
              disabled={readOnly}
              placeholder="Osservazioni, asimmetrie, contesto del test…"
              className="min-h-[100px]"
            />
          )}
        />
      </div>

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <Button
              type="submit"
              disabled={saving || analysis.completed === 0}
              className="w-full tap-target h-14 rounded-2xl text-base"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Salvataggio…' : `Salva SFMA (${analysis.completed}/${analysis.total})`}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
