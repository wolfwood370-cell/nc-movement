import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import {
  ANKLE_POSITIONS,
  type AnklePosition,
  computeFcsMetrics,
  FCS_DEFAULTS,
  fcsSchema,
  type FcsFormValues,
} from '@/lib/fcs';
import NumPadInput from '@/components/fcs/NumPadInput';
import SymmetryBadge from '@/components/fcs/SymmetryBadge';
import AssessedAtPicker from '@/components/assessments/AssessedAtPicker';

// ---------- Small UI helpers (module scope to keep input focus stable) ------

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
  disabled,
}: {
  value: AnklePosition | null | undefined;
  onChange: (v: AnklePosition) => void;
  options: readonly AnklePosition[];
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`tap-target h-12 rounded-xl border text-sm font-semibold transition-colors ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-foreground hover:bg-accent'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function PainToggle({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
        checked ? 'bg-pain/10 border border-pain/40' : 'bg-muted/40 border border-transparent'
      }`}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">
          {checked ? 'Dolore presente' : 'Nessun dolore'}
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 space-y-4">
      <div>
        <div className="font-display font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------

export default function FcsAssessment() {
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
  const [tab, setTab] = useState('motor');
  const [assessedAt, setAssessedAt] = useState<string | null>(null);

  const form = useForm<FcsFormValues>({
    resolver: zodResolver(fcsSchema),
    defaultValues: FCS_DEFAULTS,
    mode: 'onBlur',
  });

  const { control, handleSubmit, reset, watch } = form;
  const values = watch();
  const metrics = useMemo(() => computeFcsMetrics(values), [values]);

  // Load existing assessment or client name
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (id && id !== 'new') {
        const { data } = await supabase
          .from('fcs_assessments')
          .select('*, clients(full_name)')
          .eq('id', id)
          .maybeSingle();
        if (!cancelled && data) {
          const next: FcsFormValues = { ...FCS_DEFAULTS };
          (Object.keys(FCS_DEFAULTS) as (keyof FcsFormValues)[]).forEach((k) => {
            const v = (data as unknown as Record<string, unknown>)[k as string];
            if (v !== undefined && v !== null) {
              (next as unknown as Record<string, unknown>)[k as string] = v as never;
            }
          });
          reset(next);
          setClientId((data as { client_id: string }).client_id);
          setAssessedAt((data as { assessed_at?: string | null }).assessed_at ?? null);
          const joined = (data as { clients?: { full_name?: string } | null }).clients;
          setClientName(joined?.full_name ?? '');
          setReadOnly(true);
        }
      } else if (clientIdParam) {
        const { data } = await supabase
          .from('clients')
          .select('full_name, weight_kg, height_cm')
          .eq('id', clientIdParam)
          .maybeSingle();
        if (!cancelled && data) {
          setClientName(data.full_name ?? '');
          const footParam = params.get('foot');
          // Pre-fill biometrics from client profile (and foot from biometric guard).
          reset({
            ...FCS_DEFAULTS,
            bodyweight_kg: data.weight_kg ?? null,
            height_cm: data.height_cm ?? null,
            foot_length_cm: footParam ? Number(footParam) : null,
          });
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, clientIdParam, reset]);

  const onSubmit = async (data: FcsFormValues) => {
    if (!user || !clientId) {
      toast.error('Cliente mancante');
      return;
    }
    setSaving(true);
    const payload = {
      ...data,
      practitioner_id: user.id,
      client_id: clientId,
      assessed_at: assessedAt ?? new Date().toISOString(),
    };
    const { data: saved, error } = await supabase
      .from('fcs_assessments')
      .insert(payload as never)
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Valutazione FCS salvata');
    navigate(`/assessments/fcs/${saved!.id}`, { replace: true });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-24">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground tap-target"
      >
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <header>
        <h1 className="font-display font-bold text-2xl">FCS — Fundamental Capacity Screen</h1>
        <p className="text-sm text-muted-foreground">
          {clientName ? <>Cliente: <span className="text-foreground">{clientName}</span></> : 'Cliente'}
        </p>
      </header>

      {!readOnly && (
        <AssessedAtPicker value={assessedAt} onChange={setAssessedAt} />
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-11">
          <TabsTrigger value="motor">1. Motor</TabsTrigger>
          <TabsTrigger value="power">2. Power</TabsTrigger>
          <TabsTrigger value="impact">3. Impact</TabsTrigger>
          <TabsTrigger value="postural">4. Postural</TabsTrigger>
        </TabsList>

        {/* ---------------- 1. MOTOR / MCS ---------------- */}
        <TabsContent value="motor" className="mt-4 space-y-4">
          <SectionCard title="Biometria" subtitle="Misure al momento del test">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Peso" hint="kg">
                <Controller
                  control={control}
                  name="bodyweight_kg"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="kg" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Altezza" hint="cm">
                <Controller
                  control={control}
                  name="height_cm"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Piede" hint="cm">
                <Controller
                  control={control}
                  name="foot_length_cm"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Ankle Clearing" subtitle="Posizione del ginocchio rispetto alla punta">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Sinistro</div>
                <Controller
                  control={control}
                  name="mcs_ankle_clearing_l"
                  render={({ field }) => (
                    <Segmented value={field.value} onChange={field.onChange} options={ANKLE_POSITIONS} disabled={readOnly} />
                  )}
                />
                <div className="mt-2">
                  <Controller
                    control={control}
                    name="mcs_ankle_pain_l"
                    render={({ field }) => (
                      <PainToggle checked={!!field.value} onCheckedChange={field.onChange} label="Dolore caviglia sinistra" disabled={readOnly} />
                    )}
                  />
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Destro</div>
                <Controller
                  control={control}
                  name="mcs_ankle_clearing_r"
                  render={({ field }) => (
                    <Segmented value={field.value} onChange={field.onChange} options={ANKLE_POSITIONS} disabled={readOnly} />
                  )}
                />
                <div className="mt-2">
                  <Controller
                    control={control}
                    name="mcs_ankle_pain_r"
                    render={({ field }) => (
                      <PainToggle checked={!!field.value} onCheckedChange={field.onChange} label="Dolore caviglia destra" disabled={readOnly} />
                    )}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Forward Reach" subtitle="Allungo anteriore — distanza in cm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinistro" hint="cm">
                <Controller
                  control={control}
                  name="mcs_forward_reach_l"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Destro" hint="cm">
                <Controller
                  control={control}
                  name="mcs_forward_reach_r"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
            </div>
            <SymmetryBadge label="Simmetria Forward Reach" result={metrics.forwardReachSymmetry} />
          </SectionCard>

          <SectionCard title="Upper Body — Wrist Extension" subtitle="Estensione del polso (gradi)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinistro" hint="°">
                <Controller control={control} name="mcs_wrist_extension_l"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="°" disabled={readOnly} />
                  )} />
              </Field>
              <Field label="Destro" hint="°">
                <Controller control={control} name="mcs_wrist_extension_r"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="°" disabled={readOnly} />
                  )} />
              </Field>
            </div>
            <SymmetryBadge label="Simmetria Wrist Extension" result={metrics.wristExtensionSymmetry} />
          </SectionCard>

          <SectionCard title="Upper Body — Horizontal Adduction" subtitle="Adduzione orizzontale di spalla (gradi)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinistro" hint="°">
                <Controller control={control} name="mcs_horizontal_adduction_l"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="°" disabled={readOnly} />
                  )} />
              </Field>
              <Field label="Destro" hint="°">
                <Controller control={control} name="mcs_horizontal_adduction_r"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="°" disabled={readOnly} />
                  )} />
              </Field>
            </div>
            <SymmetryBadge label="Simmetria Horizontal Adduction" result={metrics.horizontalAdductionSymmetry} />
          </SectionCard>

          <SectionCard title="Upper Body — Horizontal Reach" subtitle="Allungo orizzontale (cm)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinistro" hint="cm">
                <Controller control={control} name="mcs_horizontal_reach_l"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )} />
              </Field>
              <Field label="Destro" hint="cm">
                <Controller control={control} name="mcs_horizontal_reach_r"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )} />
              </Field>
            </div>
            <SymmetryBadge label="Simmetria Horizontal Reach" result={metrics.horizontalReachSymmetry} />
          </SectionCard>
        </TabsContent>

        {/* ---------------- 2. POWER / EXPLOSIVE ---------------- */}
        <TabsContent value="power" className="mt-4 space-y-4">
          <SectionCard title="Power — Broad Jump" subtitle="Salto in lungo da fermo">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Standard" hint="cm">
                <Controller
                  control={control}
                  name="power_broad_jump_cm"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Mani sui fianchi" hint="cm">
                <Controller
                  control={control}
                  name="power_broad_jump_hands_hips_cm"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
            </div>
            <SymmetryBadge label="Power Ratio (Jump / Altezza, target ≥ 110%)" result={metrics.powerRatio} />
          </SectionCard>

          <SectionCard title="Explosive — Single Leg Jump" subtitle="Salto monopodalico in lungo">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinistro" hint="cm">
                <Controller
                  control={control}
                  name="explosive_single_leg_jump_l"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Destro" hint="cm">
                <Controller
                  control={control}
                  name="explosive_single_leg_jump_r"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
            </div>
            <SymmetryBadge label="Simmetria Explosive (target ≥ 90%)" result={metrics.explosiveSymmetry} />
          </SectionCard>
        </TabsContent>

        {/* ---------------- 3. IMPACT ---------------- */}
        <TabsContent value="impact" className="mt-4 space-y-4">
          <SectionCard title="Impact — 2-1-2 Bound" subtitle="Sequenza di balzi a contatto controllato">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sinistro" hint="cm">
                <Controller
                  control={control}
                  name="impact_212_bound_l"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Destro" hint="cm">
                <Controller
                  control={control}
                  name="impact_212_bound_r"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="cm" disabled={readOnly} />
                  )}
                />
              </Field>
            </div>
            <SymmetryBadge label="Simmetria Impact (target ≥ 95%)" result={metrics.impactSymmetry} />
          </SectionCard>
        </TabsContent>

        {/* ---------------- 4. POSTURAL ---------------- */}
        <TabsContent value="postural" className="mt-4 space-y-4">
          <SectionCard
            title="Postural — Loaded Carry"
            subtitle={`Carico target: ${
              values.bodyweight_kg ? `${(values.bodyweight_kg * 0.75).toFixed(1)} kg (75% BW)` : '75% del peso corporeo'
            }`}
          >
            <div className="grid grid-cols-3 gap-3">
              <Field label="Carico" hint="kg">
                <Controller
                  control={control}
                  name="postural_carry_load_kg"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="kg" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Distanza" hint="m">
                <Controller
                  control={control}
                  name="postural_carry_distance_m"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="m" disabled={readOnly} />
                  )}
                />
              </Field>
              <Field label="Tempo" hint="sec">
                <Controller
                  control={control}
                  name="postural_carry_time_sec"
                  render={({ field }) => (
                    <NumPadInput value={field.value} onChange={field.onChange} suffix="s" disabled={readOnly} />
                  )}
                />
              </Field>
            </div>
            <SymmetryBadge label="Carry Load Ratio (Carico / BW, target ≈ 75%)" result={metrics.carryLoadRatio} />
          </SectionCard>

          <SectionCard title="Note">
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  disabled={readOnly}
                  rows={4}
                  placeholder="Osservazioni cliniche, qualità del movimento, compensazioni…"
                  className="rounded-xl"
                />
              )}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      {!readOnly && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-screen-md mx-auto">
          <Button type="submit" disabled={saving} className="w-full h-14 rounded-2xl shadow-elevated">
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Salvataggio…' : 'Salva valutazione FCS'}
          </Button>
        </div>
      )}
    </form>
  );
}
