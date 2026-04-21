import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Save, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  computePatterns, computeTotal, emptyFmsScores, FmsScores, primaryCorrective, Score, scoreColor,
} from '@/lib/fms';
import ScoreSelector from '@/components/fms/ScoreSelector';

interface PatternDef {
  key: string;
  label: string;
  bilateral: boolean;
  scoreField?: keyof FmsScores;        // unilateral
  leftField?: keyof FmsScores;          // bilateral
  rightField?: keyof FmsScores;
  clearedBy?: keyof FmsScores;          // clearing flag that forces 0
  clearedNote?: string;
}

const PATTERNS: PatternDef[] = [
  { key: 'deep_squat', label: 'Deep Squat', bilateral: false, scoreField: 'deep_squat_score' },
  { key: 'hurdle_step', label: 'Hurdle Step', bilateral: true, leftField: 'hurdle_step_left', rightField: 'hurdle_step_right' },
  { key: 'inline_lunge', label: 'Inline Lunge', bilateral: true, leftField: 'inline_lunge_left', rightField: 'inline_lunge_right' },
  { key: 'shoulder_mobility', label: 'Shoulder Mobility', bilateral: true,
    leftField: 'shoulder_mobility_left', rightField: 'shoulder_mobility_right',
    clearedBy: 'clearing_shoulder_pain', clearedNote: 'Shoulder Impingement Clearing +' },
  { key: 'aslr', label: 'Active Straight-Leg Raise', bilateral: true, leftField: 'aslr_left', rightField: 'aslr_right' },
  { key: 'tspu', label: 'Trunk Stability Push-Up', bilateral: false, scoreField: 'trunk_stability_pushup_score',
    clearedBy: 'clearing_spinal_extension_pain', clearedNote: 'Spinal Extension Clearing +' },
  { key: 'rotary_stability', label: 'Rotary Stability', bilateral: true,
    leftField: 'rotary_stability_left', rightField: 'rotary_stability_right',
    clearedBy: 'clearing_spinal_flexion_pain', clearedNote: 'Spinal Flexion Clearing +' },
];

export default function FmsAssessment() {
  const { id } = useParams();              // 'new' or assessment id
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

  // Load existing or fetch client name
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
    };
    const { data, error } = await supabase.from('fms_assessments').insert(payload).select('id').single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
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

  return (
    <div className="space-y-5 pb-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground tap-target">
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">FMS</p>
        <h1 className="font-display font-bold text-2xl">{clientName || 'Valutazione'}</h1>
        <p className="text-sm text-muted-foreground">
          {readOnly ? 'Sola lettura — valutazione completata' : 'Tocca per assegnare un punteggio. Conta il valore più basso L/R.'}
        </p>
      </header>

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

      {/* Clearing tests */}
      <section className="surface-card p-4">
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Test di esclusione del dolore</h2>
        <div className="space-y-3">
          {([
            { key: 'clearing_shoulder_pain' as const, label: 'Impingement spalla', forces: 'Mobilità Spalla → 0' },
            { key: 'clearing_spinal_extension_pain' as const, label: 'Estensione spinale', forces: 'Trunk Stability Push-Up → 0' },
            { key: 'clearing_spinal_flexion_pain' as const, label: 'Flessione spinale', forces: 'Rotary Stability → 0' },
          ]).map(c => {
            const active = scores[c.key];
            return (
              <div key={c.key} className={`flex items-center justify-between rounded-xl p-3 transition-colors ${active ? 'bg-pain/10 border border-pain/40' : 'bg-muted/40'}`}>
                <div>
                  <div className="font-medium text-sm">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground">{active ? c.forces : 'Negativo (nessun dolore)'}</div>
                </div>
                <Switch
                  checked={active}
                  disabled={readOnly}
                  onCheckedChange={(v) => setField(c.key, v)}
                  aria-label={c.label}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Patterns */}
      <section className="space-y-3">
        {PATTERNS.map((p, i) => {
          const result = patterns[i];
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
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Sinistra</div>
                    <ScoreSelector
                      value={scores[p.leftField!] as Score}
                      onChange={(s) => setField(p.leftField!, s)}
                      disabled={readOnly || cleared}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Destra</div>
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
        })}
      </section>

      {!readOnly && (
        <div className="sticky bottom-20 z-10">
          <Button
            onClick={save}
            disabled={saving || total === null}
            className="w-full h-14 rounded-2xl text-base shadow-elevated tap-target"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Salvataggio…' : total === null ? 'Compila tutti i pattern per salvare' : `Salva valutazione · ${total}/21`}
          </Button>
        </div>
      )}
    </div>
  );
}
