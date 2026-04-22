import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import NumPadInput from '@/components/fcs/NumPadInput';

import {
  YBT_DEFAULTS,
  ybtSchema,
  type YbtFormValues,
  computeYbtMetrics,
  ANTERIOR_ASYMMETRY_THRESHOLD_CM,
} from '@/lib/ybt';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function AsymBadge({ value, danger }: { value: number | null; danger?: boolean }) {
  if (value == null) {
    return (
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Δ —
      </span>
    );
  }
  const formatted = value.toFixed(1);
  if (danger) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pain text-pain-foreground px-2.5 py-1 text-[11px] font-bold">
        <AlertTriangle className="w-3 h-3" />
        Δ {formatted} cm
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2.5 py-1 text-[11px] font-semibold">
      <CheckCircle2 className="w-3 h-3" />
      Δ {formatted} cm
    </span>
  );
}

function ReachRow({
  title,
  hint,
  rightField,
  leftField,
  asym,
  danger,
  readOnly,
  control,
}: {
  title: string;
  hint?: string;
  rightField: keyof YbtFormValues;
  leftField: keyof YbtFormValues;
  asym: number | null;
  danger?: boolean;
  readOnly: boolean;
  control: ReturnType<typeof useForm<YbtFormValues>>['control'];
}) {
  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">{title}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <AsymBadge value={asym} danger={danger} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Destra">
          <Controller
            control={control}
            name={rightField}
            render={({ field }) => (
              <NumPadInput
                value={field.value as number | null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={readOnly}
                suffix="cm"
                placeholder="0.0"
                ariaLabel={`${title} destra`}
              />
            )}
          />
        </Field>
        <Field label="Sinistra">
          <Controller
            control={control}
            name={leftField}
            render={({ field }) => (
              <NumPadInput
                value={field.value as number | null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={readOnly}
                suffix="cm"
                placeholder="0.0"
                ariaLabel={`${title} sinistra`}
              />
            )}
          />
        </Field>
      </div>
    </div>
  );
}

export default function YbtAssessment() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const clientIdParam = params.get('clientId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clientId, setClientId] = useState<string | null>(clientIdParam);
  const [clientName, setClientName] = useState('');
  const [clientGender, setClientGender] = useState<string | null>(null);
  const [clientSport, setClientSport] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<YbtFormValues>({
    resolver: zodResolver(ybtSchema),
    defaultValues: YBT_DEFAULTS,
    mode: 'onBlur',
  });
  const { control, handleSubmit, reset, watch } = form;
  const values = watch();
  const metrics = useMemo(
    () => computeYbtMetrics(values, { gender: clientGender, primarySport: clientSport }),
    [values, clientGender, clientSport],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (id && id !== 'new') {
        const { data } = await supabase
          .from('ybt_assessments')
          .select('*, clients(full_name)')
          .eq('id', id)
          .maybeSingle();
        if (!cancelled && data) {
          const next: YbtFormValues = { ...YBT_DEFAULTS };
          (Object.keys(YBT_DEFAULTS) as (keyof YbtFormValues)[]).forEach((k) => {
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

  const onSubmit = async (data: YbtFormValues) => {
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
      .from('ybt_assessments')
      .insert(payload as never)
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Valutazione YBT salvata');
    navigate(`/assessments/ybt/${saved!.id}`, { replace: true });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;

  const fmtPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-28">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground tap-target"
      >
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">YBT</p>
        <h1 className="font-display font-bold text-2xl mt-1">Y-Balance Test</h1>
        {clientName && <p className="text-sm text-muted-foreground mt-1">{clientName}</p>}
      </header>

      {/* Limb length */}
      <div className="surface-card p-4 space-y-3">
        <div className="font-display font-semibold">Lunghezza arto inferiore</div>
        <div className="text-[11px] text-muted-foreground -mt-1">
          SIAS → malleolo mediale (cm). Usata per i punteggi compositi.
        </div>
        <Field label="Lunghezza arto">
          <Controller
            control={control}
            name="limb_length_cm"
            render={({ field }) => (
              <NumPadInput
                value={field.value as number | null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={readOnly}
                suffix="cm"
                placeholder="0.0"
                ariaLabel="Lunghezza arto"
              />
            )}
          />
        </Field>
      </div>

      {/* Reaches */}
      <ReachRow
        title="Anteriore"
        hint={`Asimmetria > ${ANTERIOR_ASYMMETRY_THRESHOLD_CM} cm = rischio elevato`}
        rightField="anterior_right_cm"
        leftField="anterior_left_cm"
        asym={metrics.asym.anterior}
        danger={metrics.anteriorRisk}
        readOnly={readOnly}
        control={control}
      />
      <ReachRow
        title="Posteromediale"
        rightField="posteromedial_right_cm"
        leftField="posteromedial_left_cm"
        asym={metrics.asym.posteromedial}
        readOnly={readOnly}
        control={control}
      />
      <ReachRow
        title="Posterolaterale"
        rightField="posterolateral_right_cm"
        leftField="posterolateral_left_cm"
        asym={metrics.asym.posterolateral}
        readOnly={readOnly}
        control={control}
      />

      {/* Composite scores */}
      <div className="surface-card p-4">
        <div className="font-display font-semibold mb-3">Composite Score</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Destra</div>
            <div className="font-display font-bold text-3xl mt-1">{fmtPct(metrics.composite.right)}</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sinistra</div>
            <div className="font-display font-bold text-3xl mt-1">{fmtPct(metrics.composite.left)}</div>
          </div>
        </div>
        {metrics.compositeAsym != null && (
          <div className="text-[11px] text-muted-foreground mt-3 text-center">
            Differenza composita: {metrics.compositeAsym.toFixed(1)}%
          </div>
        )}
        {metrics.anteriorRisk && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-pain/10 border border-pain/40 p-3 text-pain">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold">Bandiera rossa</div>
              Asimmetria anteriore &gt; {ANTERIOR_ASYMMETRY_THRESHOLD_CM} cm: rischio infortunio aumentato.
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="surface-card p-4 space-y-2">
        <div className="font-display font-semibold">Note</div>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Textarea
              value={field.value ?? ''}
              onChange={field.onChange}
              disabled={readOnly}
              placeholder="Osservazioni cliniche…"
              className="min-h-24"
            />
          )}
        />
      </div>

      {!readOnly && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvataggio…' : 'Salva valutazione YBT'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
