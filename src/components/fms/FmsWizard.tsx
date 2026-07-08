import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import PhoneShell from '@/components/PhoneShell';
import ScoreSelector from '@/components/fms/ScoreSelector';
import StoplightSelector, { type Stoplight } from '@/components/fms/StoplightSelector';
import {
  computePatterns, computeTotal, primaryCorrective, type FmsScores, type Score,
  isModifiedFms, fmsMaxTotal, type FmsAssessmentType,
} from '@/lib/fms';

type ExtraKey = 'tibia' | 'hand' | 'ankle_clearing' | 'shoulder_clearing' | 'spinal_extension' | 'spinal_flexion';

interface StepDef {
  key: string;              // pattern key
  label: string;
  desc: string;
  extras?: ExtraKey[];
}

const STEPS_FULL: StepDef[] = [
  { key: 'deep_squat',              label: 'Deep Squat',                desc: 'Punteggio singolo · scarico e simmetrico.' },
  { key: 'hurdle_step',             label: 'Hurdle Step',               desc: 'Bilaterale · valuta Sinistra e Destra.', extras: ['tibia'] },
  { key: 'inline_lunge',            label: 'Inline Lunge',              desc: 'Bilaterale · valuta Sinistra e Destra.', extras: ['ankle_clearing'] },
  { key: 'shoulder_mobility',       label: 'Shoulder Mobility',         desc: 'Bilaterale + clearing impingement.', extras: ['shoulder_clearing', 'hand'] },
  { key: 'aslr',                    label: 'Active Straight-Leg Raise', desc: 'Bilaterale · valuta Sinistra e Destra.' },
  { key: 'trunk_stability_pushup',  label: 'Trunk Stability Push-Up',   desc: 'Punteggio singolo + clearing estensione.', extras: ['spinal_extension'] },
  { key: 'rotary_stability',        label: 'Rotary Stability',          desc: 'Bilaterale + clearing flessione.', extras: ['spinal_flexion'] },
];

const STEPS_MODIFIED: StepDef[] = [
  { key: 'deep_squat',        label: 'Deep Squat',                desc: 'Punteggio singolo · scarico e simmetrico.' },
  { key: 'shoulder_mobility', label: 'Shoulder Mobility',         desc: 'Bilaterale + clearing impingement.', extras: ['shoulder_clearing', 'hand'] },
  { key: 'aslr',              label: 'Active Straight-Leg Raise', desc: 'Bilaterale · valuta Sinistra e Destra + Ankle Clearing.', extras: ['ankle_clearing'] },
];

const railTone = (s: Score, cleared: boolean): string => {
  if (cleared || s === 0) return 'bg-pain';
  if (s === 1) return 'bg-warning';
  if (s === 2) return 'bg-dysfunction';
  if (s === 3) return 'bg-functional';
  return 'bg-muted';
};

interface Props {
  scores: FmsScores;
  setField: <K extends keyof FmsScores>(k: K, v: FmsScores[K]) => void;
  setAssessmentType: (t: FmsAssessmentType) => void;
  clientName: string;
  saving: boolean;
  onSave: () => void;
  onExit: () => void;
}

/**
 * FMS Wizard — step-by-step editor per una nuova valutazione (design screenshot 06).
 * Riusa `scores`/`setField` del parent: al termine dell'ultimo step lancia `onSave()`,
 * che innesca lo stesso flusso di salvataggio+PT Pack esistente.
 */
export default function FmsWizard({
  scores, setField, setAssessmentType, clientName, saving, onSave, onExit,
}: Props) {
  const modified = isModifiedFms(scores);
  const steps = modified ? STEPS_MODIFIED : STEPS_FULL;
  const [idx, setIdx] = useState(0);
  const step = steps[Math.min(idx, steps.length - 1)];

  const patterns = useMemo(() => computePatterns(scores), [scores]);
  const total = useMemo(() => computeTotal(patterns), [patterns]);
  const corrective = useMemo(() => primaryCorrective(patterns), [patterns]);
  const maxTotal = fmsMaxTotal(scores);

  const railPatterns = useMemo(
    () => steps.map(s => patterns.find(p => p.key === s.key)!).filter(Boolean),
    [steps, patterns],
  );
  const completed = railPatterns.filter(p => p.final !== null).length;
  const provTotal = railPatterns.reduce((sum, p) => sum + (p.final ?? 0), 0);

  const current = patterns.find(p => p.key === step.key);
  const isLast = idx === steps.length - 1;
  const focusLabel = completed === 0
    ? 'Focus: in attesa di punteggi'
    : `Focus: ${corrective.label}`;

  const next = () => {
    if (isLast) { onSave(); return; }
    setIdx(i => Math.min(i + 1, steps.length - 1));
    // scroll main to top for the new step
    document.getElementById('fms-wizard-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prev = () => setIdx(i => Math.max(i - 1, 0));

  return (
    <PhoneShell>
      {/* Top bar */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-border bg-card">
        <button
          onClick={idx === 0 ? onExit : prev}
          className="flex items-center gap-1 text-[14px] font-medium text-foreground/80 hover:text-foreground px-2 py-1 -ml-1"
        >
          <ChevronLeft className="w-4 h-4" /> FMS{clientName ? ` · ${clientName}` : ''}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">
            Pattern {idx + 1}/{steps.length}
          </span>
          <button
            onClick={onExit}
            aria-label="Chiudi"
            className="p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main id="fms-wizard-main" className="flex-1 overflow-y-auto px-4 pt-4 pb-4 scrollbar-none animate-fade-in">
        {/* Provisional score card */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 grid place-items-center shrink-0">
              <div className="text-center leading-none">
                <div className="font-display font-bold text-lg text-primary">{provTotal}</div>
                <div className="text-[8px] uppercase tracking-wider text-primary/70 font-bold mt-0.5">Provv</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Punteggio provvisorio
                </p>
                <p className="text-[10px] text-muted-foreground font-medium tabular-nums">
                  {completed} di {steps.length} completati
                </p>
              </div>
              <div className="flex gap-1 mt-1.5">
                {railPatterns.map((p, i) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`Vai a pattern ${i + 1}`}
                    className={cn(
                      'flex-1 h-2 rounded-full transition-all',
                      railTone(p.final, p.cleared),
                      i === idx ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'opacity-90',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <Sparkles className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">{focusLabel}</span>
          </div>
        </div>

        {/* Type toggle (mini) */}
        <div className="mt-3 flex gap-1.5">
          {(['full', 'modified'] as FmsAssessmentType[]).map(t => {
            const active = (scores.assessment_type ?? 'full') === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setAssessmentType(t); setIdx(0); }}
                className={cn(
                  'flex-1 h-7 rounded-full text-[11px] font-semibold transition-colors border',
                  active
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/30',
                )}
              >
                {t === 'full' ? 'FMS Completo · /21' : 'FMS Modificato · /9'}
              </button>
            );
          })}
        </div>

        {/* Step body */}
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Pattern {idx + 1}/{steps.length}
          </p>
          <h1 className="font-display font-bold text-[24px] leading-tight mt-1">{step.label}</h1>
          <p className="text-[12px] text-muted-foreground mt-1">{step.desc}</p>

          {/* Current pattern score chip */}
          <div className="mt-4 rounded-xl border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Punteggio pattern</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  'inline-block w-8 h-1.5 rounded-full',
                  railTone(current?.final ?? null, current?.cleared ?? false),
                )} />
                <span className="text-[12px] font-medium text-foreground">
                  {current?.final !== null && current?.final !== undefined
                    ? `${current.final} / 3${current.asymmetric ? ' · asimmetrico' : ''}${current.cleared ? ' · cleared' : ''}`
                    : 'da valutare'}
                </span>
              </div>
            </div>
          </div>

          {/* Score selectors */}
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Punteggio</p>
            {renderScoring(step, scores, setField)}
          </div>

          {/* Extras */}
          {step.extras?.map(ex => (
            <div key={ex} className="mt-5">
              {renderExtra(ex, scores, setField)}
            </div>
          ))}
        </div>
      </main>

      {/* Footer CTA */}
      <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2">
        <button
          type="button"
          onClick={prev}
          disabled={idx === 0}
          aria-label="Pattern precedente"
          className={cn(
            'w-12 h-12 rounded-2xl border border-border grid place-items-center shrink-0 transition-colors',
            idx === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted',
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <Button
          onClick={next}
          disabled={saving || (isLast && total === null)}
          className="flex-1 h-12 rounded-2xl text-[15px] font-semibold shadow-cta disabled:opacity-50"
        >
          {isLast ? (
            <>
              <Save className="w-4 h-4 mr-2" /> Salva screening
            </>
          ) : (
            <>
              Pattern successivo <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </PhoneShell>
  );
}

// ---- helpers ----------------------------------------------------------------

function renderScoring(
  step: StepDef,
  scores: FmsScores,
  setField: <K extends keyof FmsScores>(k: K, v: FmsScores[K]) => void,
) {
  switch (step.key) {
    case 'deep_squat':
      return (
        <ScoreSelector
          value={scores.deep_squat_score}
          onChange={(v) => setField('deep_squat_score', v)}
        />
      );
    case 'trunk_stability_pushup':
      return (
        <ScoreSelector
          value={scores.trunk_stability_pushup_score}
          onChange={(v) => setField('trunk_stability_pushup_score', v)}
        />
      );
    case 'hurdle_step':
      return <Bilateral leftK="hurdle_step_left" rightK="hurdle_step_right" scores={scores} setField={setField} />;
    case 'inline_lunge':
      return <Bilateral leftK="inline_lunge_left" rightK="inline_lunge_right" scores={scores} setField={setField} />;
    case 'shoulder_mobility':
      return <Bilateral leftK="shoulder_mobility_left" rightK="shoulder_mobility_right" scores={scores} setField={setField} />;
    case 'aslr':
      return <Bilateral leftK="aslr_left" rightK="aslr_right" scores={scores} setField={setField} />;
    case 'rotary_stability':
      return <Bilateral leftK="rotary_stability_left" rightK="rotary_stability_right" scores={scores} setField={setField} />;
    default:
      return null;
  }
}

function Bilateral({
  leftK, rightK, scores, setField,
}: {
  leftK: keyof FmsScores; rightK: keyof FmsScores;
  scores: FmsScores;
  setField: <K extends keyof FmsScores>(k: K, v: FmsScores[K]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Sinistro</div>
        <ScoreSelector value={scores[leftK] as Score} onChange={(v) => setField(leftK, v as never)} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Destro</div>
        <ScoreSelector value={scores[rightK] as Score} onChange={(v) => setField(rightK, v as never)} />
      </div>
    </div>
  );
}

function NumberField({
  label, hint, value, onChange, placeholder,
}: {
  label: string; hint?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">{label}</div>
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
        className="h-12 rounded-xl"
      />
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function PainRow({
  label, checked, onCheckedChange,
}: {
  label: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors',
      checked ? 'bg-pain/10 border-pain/40' : 'bg-muted/30 border-transparent',
    )}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{checked ? 'Dolore presente' : 'Nessun dolore'}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function renderExtra(
  ex: ExtraKey,
  scores: FmsScores,
  setField: <K extends keyof FmsScores>(k: K, v: FmsScores[K]) => void,
) {
  switch (ex) {
    case 'tibia':
      return (
        <NumberField
          label="Lunghezza Tibia (cm)"
          value={scores.tibia_length_cm}
          onChange={(v) => setField('tibia_length_cm', v)}
          placeholder="es. 42.5"
        />
      );
    case 'hand':
      return (
        <NumberField
          label="Lunghezza Mano (cm)"
          value={scores.hand_length_cm}
          onChange={(v) => setField('hand_length_cm', v)}
          placeholder="es. 19.0"
        />
      );
    case 'shoulder_clearing':
      return (
        <div className="space-y-2">
          <div>
            <div className="font-display font-semibold text-sm">Shoulder Impingement Clearing</div>
            <div className="text-[11px] text-muted-foreground">Positivo → Shoulder Mobility = 0 sul lato corrispondente.</div>
          </div>
          <PainRow label="Lato Sinistro" checked={scores.clearing_shoulder_left_pain}
            onCheckedChange={(v) => setField('clearing_shoulder_left_pain', v)} />
          <PainRow label="Lato Destro" checked={scores.clearing_shoulder_right_pain}
            onCheckedChange={(v) => setField('clearing_shoulder_right_pain', v)} />
        </div>
      );
    case 'spinal_extension':
      return (
        <div className="space-y-2">
          <div>
            <div className="font-display font-semibold text-sm">Spinal Extension Clearing</div>
            <div className="text-[11px] text-muted-foreground">Positivo → Trunk Stability Push-Up = 0.</div>
          </div>
          <PainRow label="Estensione spinale" checked={scores.clearing_spinal_extension_pain}
            onCheckedChange={(v) => setField('clearing_spinal_extension_pain', v)} />
        </div>
      );
    case 'spinal_flexion':
      return (
        <div className="space-y-2">
          <div>
            <div className="font-display font-semibold text-sm">Spinal Flexion Clearing</div>
            <div className="text-[11px] text-muted-foreground">Positivo → Rotary Stability = 0.</div>
          </div>
          <PainRow label="Flessione spinale" checked={scores.clearing_spinal_flexion_pain}
            onCheckedChange={(v) => setField('clearing_spinal_flexion_pain', v)} />
        </div>
      );
    case 'ankle_clearing':
      return (
        <div className="space-y-2">
          <div>
            <div className="font-display font-semibold text-sm">Ankle Clearing</div>
            <div className="text-[11px] text-muted-foreground">Solo informativo · non altera i punteggi.</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Sinistro</div>
            <StoplightSelector value={scores.ankle_clearing_left as Stoplight}
              onChange={(v) => setField('ankle_clearing_left', v)} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lato Destro</div>
            <StoplightSelector value={scores.ankle_clearing_right as Stoplight}
              onChange={(v) => setField('ankle_clearing_right', v)} />
          </div>
          <PainRow label="Sinistro · dolore" checked={scores.ankle_clearing_left_pain}
            onCheckedChange={(v) => setField('ankle_clearing_left_pain', v)} />
          <PainRow label="Destro · dolore" checked={scores.ankle_clearing_right_pain}
            onCheckedChange={(v) => setField('ankle_clearing_right_pain', v)} />
        </div>
      );
    default:
      return null;
  }
}
