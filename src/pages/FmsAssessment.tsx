import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Save, AlertTriangle, CheckCircle2, ShieldAlert, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  computePatterns, computeTotal, emptyFmsScores, FmsScores, primaryCorrective, Score, scoreColor,
} from '@/lib/fms';
import ScoreSelector from '@/components/fms/ScoreSelector';
import FmsClientReport from '@/components/fms/FmsClientReport';
import AssessedAtPicker from '@/components/assessments/AssessedAtPicker';
import { useFormDraft } from '@/hooks/useFormDraft';

interface PatternDef {
  key: string;
  index: number;            // index in computePatterns output
  label: string;
  bilateral: boolean;
  scoreField?: keyof FmsScores;
  leftField?: keyof FmsScores;
  rightField?: keyof FmsScores;
  clearedBy?: keyof FmsScores;
  clearedNote?: string;
}

// Display order requested by the practitioner.
const PATTERNS: PatternDef[] = [
  { key: 'deep_squat',        index: 0, label: 'Deep Squat',                bilateral: false, scoreField: 'deep_squat_score' },
  { key: 'hurdle_step',       index: 1, label: 'Hurdle Step',               bilateral: true,  leftField: 'hurdle_step_left',       rightField: 'hurdle_step_right' },
  { key: 'shoulder_mobility', index: 3, label: 'Shoulder Mobility',         bilateral: true,  leftField: 'shoulder_mobility_left', rightField: 'shoulder_mobility_right',
    clearedBy: 'clearing_shoulder_pain', clearedNote: 'Shoulder Impingement Clearing +' },
  { key: 'aslr',              index: 4, label: 'Active Straight-Leg Raise', bilateral: true,  leftField: 'aslr_left',              rightField: 'aslr_right' },
  { key: 'tspu',              index: 5, label: 'Trunk Stability Push-Up',   bilateral: false, scoreField: 'trunk_stability_pushup_score',
    clearedBy: 'clearing_spinal_extension_pain', clearedNote: 'Spinal Extension Clearing +' },
  { key: 'rotary_stability',  index: 6, label: 'Rotary Stability',          bilateral: true,  leftField: 'rotary_stability_left',  rightField: 'rotary_stability_right',
    clearedBy: 'clearing_spinal_flexion_pain', clearedNote: 'Spinal Flexion Clearing +' },
  { key: 'inline_lunge',      index: 2, label: 'Inline Lunge',              bilateral: true,  leftField: 'inline_lunge_left',      rightField: 'inline_lunge_right' },
];

/**
 * Stable input components — declared at module scope so they keep focus across re-renders
 * (defining them inside the page component recreates the type on every keystroke).
 */
function NumberInput({ value, onChange, placeholder, disabled }: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.1"
      min="0"
      placeholder={placeholder}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? null : Number(raw));
      }}
      className="h-12 rounded-xl"
    />
  );
}

function PainToggle({ checked, onCheckedChange, label, disabled }: {
  checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${checked ? 'bg-pain/10 border border-pain/40' : 'bg-muted/40 border border-transparent'}`}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{checked ? 'Dolore presente' : 'Nessun dolore'}</div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

export default function FmsAssessment() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const clientIdParam = params.get('clientId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scores, setScores] = useState<FmsScores>(emptyFmsScores());
  const [clientName, setClientName] = useState<string>('');
  const [clientId, setClientId] = useState<string | null>(clientIdParam);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [assessedAt, setAssessedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (id && id !== 'new') {
        const { data } = await supabase.from('fms_assessments')
          .select('*, clients(full_name)').eq('id', id).maybeSingle();
        if (data) {
          const empty = emptyFmsScores();
          const s: FmsScores = { ...empty };
          (Object.keys(empty) as (keyof FmsScores)[]).forEach((k) => {
            const v = (data as unknown as Record<string, unknown>)[k as string];
            if (v !== undefined && v !== null) {
              (s as unknown as Record<string, unknown>)[k as string] = v;
            }
          });
          setScores(s);
          setClientId(data.client_id);
          setAssessedAt(data.assessed_at ?? null);
          const joined = (data as { clients?: { full_name?: string } | null }).clients;
          setClientName(joined?.full_name ?? '');
          setReadOnly(true);
        }
      } else if (clientIdParam) {
        const { data } = await supabase.from('clients').select('full_name').eq('id', clientIdParam).maybeSingle();
        setClientName(data?.full_name ?? '');
      }
      setLoading(false);
    })();
  }, [id, clientIdParam]);

  // ---- Auto-save draft (per-field) — only for new assessments -----------
  const draftKey = id === 'new' && clientIdParam ? `nc:fms:new:${clientIdParam}` : null;
  const { draft, hasDraft, clear: clearDraft, dismiss: dismissDraft } = useFormDraft<FmsScores>(draftKey, scores);

  const patterns = useMemo(() => computePatterns(scores), [scores]);
  const total = useMemo(() => computeTotal(patterns), [patterns]);
  const corrective = useMemo(() => primaryCorrective(patterns), [patterns]);

  const setField = <K extends keyof FmsScores>(k: K, v: FmsScores[K]) =>
    setScores(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!user || !clientId) { toast.error('Cliente mancante'); return; }
    if (total === null) { toast.error('Compila tutti i pattern prima di salvare.'); return; }
    setSaving(true);
    const payload = {
      practitioner_id: user.id,
      client_id: clientId,
      ...scores,
      total_score: total,
      primary_corrective: corrective.label,
      assessed_at: assessedAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabase.from('fms_assessments').insert(payload).select('id').single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    clearDraft();
    toast.success('Valutazione salvata');
    navigate(`/assessments/fms/${data!.id}`, { replace: true });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;

  const correctiveTone =
    corrective.level === 'pain' ? 'bg-pain text-destructive-foreground' :
    corrective.level === 'mobility' ? 'bg-warning text-warning-foreground' :
    corrective.level === 'motor_control' ? 'bg-warning text-warning-foreground' :
    corrective.level === 'functional' ? 'bg-accent text-accent-foreground' :
    corrective.level === 'clear' ? 'bg-success text-success-foreground' :
    'bg-muted text-muted-foreground';

  const correctiveIcon =
    corrective.level === 'pain' ? ShieldAlert :
    corrective.level === 'clear' ? CheckCircle2 :
    AlertTriangle;
  const Icon = correctiveIcon;

  // ---- Reusable pieces ---------------------------------------------------

  const renderPattern = (p: PatternDef) => {
    const result = patterns[p.index];
    const cleared = result.cleared;
    return (
      <div key={p.key} className="surface-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display font-semibold">{p.label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {p.bilateral ? 'Bilaterale · valuta Sinistra & Destra' : 'Punteggio singolo'}
              {cleared && <span className="ml-1 text-pain font-semibold">· {p.clearedNote}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`font-display font-bold text-2xl px-3 py-1 rounded-lg inline-block ${scoreColor(result.final)}`}>
              {result.final ?? '—'}
            </div>
            {result.asymmetric && (
              <div className="text-[10px] uppercase font-bold text-warning mt-1 flex items-center gap-1 justify-end">
                <AlertTriangle className="w-3 h-3" /> Asimmetria
              </div>
            )}
          </div>
        </div>

        {p.bilateral ? (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Sinistro</div>
              <ScoreSelector
                value={scores[p.leftField!] as Score}
                onChange={(s) => setField(p.leftField!, s)}
                disabled={readOnly || cleared}
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Destro</div>
              <ScoreSelector
                value={scores[p.rightField!] as Score}
                onChange={(s) => setField(p.rightField!, s)}
                disabled={readOnly || cleared}
              />
            </div>
          </div>
        ) : (
          <ScoreSelector
            value={scores[p.scoreField!] as Score}
            onChange={(s) => setField(p.scoreField!, s)}
            disabled={readOnly || cleared}
          />
        )}
      </div>
    );
  };

  const get = (key: string) => PATTERNS.find(p => p.key === key)!;

  return (
    <div className="space-y-5 pb-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground tap-target">
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">FMS</p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-2xl">{clientName || 'Valutazione'}</h1>
            <p className="text-sm text-muted-foreground">
              {readOnly ? 'Sola lettura — valutazione completata' : 'Tocca per assegnare un punteggio. Conta il valore più basso L/R.'}
            </p>
          </div>
          {total !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportOpen(true)}
              className="shrink-0"
            >
              <FileText className="w-4 h-4 mr-1.5" /> Report
            </Button>
          )}
        </div>
      </header>

      {hasDraft && draft && !readOnly && (() => {
        // Only surface the recovery banner when the cached draft contains
        // at least one user-entered value (avoids flashing on a fresh open).
        const isEmpty = Object.values(draft).every(
          (v) => v === null || v === false || v === undefined,
        );
        if (isEmpty) return null;
        return (
          <div className="surface-card border-warning/40 bg-warning/5 p-3 flex items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-semibold text-warning-foreground">Bozza non salvata trovata</div>
              <div className="text-muted-foreground">Vuoi recuperare i punteggi inseriti in precedenza?</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => { dismissDraft(); clearDraft(); }}>Scarta</Button>
              <Button size="sm" onClick={() => { setScores(draft); dismissDraft(); }}>Recupera</Button>
            </div>
          </div>
        );
      })()}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Report cliente FMS</DialogTitle>
          </DialogHeader>
          <FmsClientReport clientName={clientName || 'Cliente'} assessedAt={assessedAt} scores={scores} />
        </DialogContent>
      </Dialog>

      {!readOnly && (
        <AssessedAtPicker value={assessedAt} onChange={setAssessedAt} />
      )}

      {/* Live total + corrective */}
      <div className="surface-card p-5 flex items-center gap-4">
        <div className="text-center shrink-0">
          <div className="font-display font-bold text-4xl leading-none">{total ?? '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">/ 21</div>
        </div>
        <div className={`flex-1 rounded-xl px-3 py-2.5 ${correctiveTone}`}>
          <div className="flex items-center gap-2 font-display font-bold text-sm">
            <Icon className="w-4 h-4" /> {corrective.label}
          </div>
          <div className="text-xs leading-snug mt-0.5 opacity-90">{corrective.detail}</div>
        </div>
      </div>

      {/* Patterns in the requested order */}
      <section className="space-y-3">
        {/* Deep Squat */}
        {renderPattern(get('deep_squat'))}

        {/* Tibia length */}
        <div className="surface-card p-4">
          <div className="font-display font-semibold text-sm mb-2">Lunghezza Tibia (cm)</div>
          <NumberInput
          disabled={readOnly}
            value={scores.tibia_length_cm}
            onChange={(v) => setField('tibia_length_cm', v)}
            placeholder="es. 42.5"
          />
        </div>

        {/* Hurdle Step */}
        {renderPattern(get('hurdle_step'))}

        {/* Inline Lunge (moved here) */}
        {renderPattern(get('inline_lunge'))}

        {/* Ankle Clearing (moved below Inline Lunge) */}
        <div className="surface-card p-4 space-y-3">
          <div>
            <div className="font-display font-semibold">Ankle Clearing</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Solo informativo · non altera i punteggi</div>
          </div>
          <PainToggle
          disabled={readOnly}
            label="Lato Sinistro"
            checked={scores.ankle_clearing_left_pain}
            onCheckedChange={(v) => setField('ankle_clearing_left_pain', v)}
          />
          <PainToggle
          disabled={readOnly}
            label="Lato Destro"
            checked={scores.ankle_clearing_right_pain}
            onCheckedChange={(v) => setField('ankle_clearing_right_pain', v)}
          />
        </div>

        {/* Shoulder Mobility */}
        {renderPattern(get('shoulder_mobility'))}

        {/* Shoulder Clearing — L/R like Ankle Clearing */}
        <div className="surface-card p-4 space-y-3">
          <div>
            <div className="font-display font-semibold">Shoulder Impingement Clearing</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Positivo → Shoulder Mobility forzata a 0 sul lato corrispondente.</div>
          </div>
          <PainToggle
          disabled={readOnly}
            label="Lato Sinistro"
            checked={scores.clearing_shoulder_left_pain}
            onCheckedChange={(v) => setField('clearing_shoulder_left_pain', v)}
          />
          <PainToggle
          disabled={readOnly}
            label="Lato Destro"
            checked={scores.clearing_shoulder_right_pain}
            onCheckedChange={(v) => setField('clearing_shoulder_right_pain', v)}
          />
        </div>

        {/* Hand length */}
        <div className="surface-card p-4">
          <div className="font-display font-semibold text-sm mb-2">Lunghezza Mano (cm)</div>
          <NumberInput
          disabled={readOnly}
            value={scores.hand_length_cm}
            onChange={(v) => setField('hand_length_cm', v)}
            placeholder="es. 19.0"
          />
        </div>

        {/* ASLR */}
        {renderPattern(get('aslr'))}

        {/* Trunk Stability Push-Up + Extension Clearing */}
        {renderPattern(get('tspu'))}
        <div className="surface-card p-4">
          <div className="font-display font-semibold text-sm mb-2">Spinal Extension Clearing</div>
          <PainToggle
          disabled={readOnly}
            label="Test di estensione spinale"
            checked={scores.clearing_spinal_extension_pain}
            onCheckedChange={(v) => setField('clearing_spinal_extension_pain', v)}
          />
          <p className="text-[11px] text-muted-foreground mt-2">Positivo → Trunk Stability Push-Up forzato a 0.</p>
        </div>

        {/* Rotary Stability + Flexion Clearing */}
        {renderPattern(get('rotary_stability'))}
        <div className="surface-card p-4">
          <div className="font-display font-semibold text-sm mb-2">Spinal Flexion Clearing</div>
          <PainToggle
          disabled={readOnly}
            label="Test di flessione spinale"
            checked={scores.clearing_spinal_flexion_pain}
            onCheckedChange={(v) => setField('clearing_spinal_flexion_pain', v)}
          />
          <p className="text-[11px] text-muted-foreground mt-2">Positivo → Rotary Stability forzata a 0.</p>
        </div>
      </section>

      {!readOnly && (
        <div className="sticky bottom-20 z-10">
          <Button
            onClick={save}
            disabled={saving || total === null}
            className="w-full h-14 rounded-2xl text-base shadow-elevated tap-target"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Salvataggio…' : `Salva valutazione${total !== null ? ` · ${total}/21` : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
