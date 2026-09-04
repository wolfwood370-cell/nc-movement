import { ChevronRight, FileQuestion, Wifi } from 'lucide-react';
import { fmsMaxTotal, isModifiedFms, type FmsScores } from '@/lib/fms';
import type { FmsAssessmentRow } from '@/lib/insights';
import type { HealthSafe, SubmissionSafe, WorkModeBadge } from '@/lib/intake';

/**
 * Le due tracce affiancate: Dichiarato e Misurato, stessa geometria, ognuna con la
 * propria data e il proprio tipo in testa.
 *
 * La regola che regge i quattro stati senza cambiare forma: quando una delle due metà
 * non esiste, la sua colonna NON sparisce e non si allarga l'altra — dice perché è
 * vuota. Un vuoto spiegato è un'informazione; un vuoto nascosto è una bugia.
 */

interface Props {
  submission: SubmissionSafe | null;
  screening: HealthSafe | null;
  fmsHistory: FmsAssessmentRow[];
  workMode: WorkModeBadge;
  onOpenIntake: () => void;
  onOpenHistory: () => void;
}

const PARQ_KEYS = [
  'parq_heart', 'parq_chest_pain', 'parq_balance', 'parq_other_chronic',
  'parq_meds', 'parq_msk', 'parq_supervised',
] as const;

const dataBreve = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function TwoTracks({
  submission, screening, fmsHistory, workMode, onOpenIntake, onOpenHistory,
}: Props) {
  const latest = fmsHistory[0];
  const parqPositivi = screening
    ? PARQ_KEYS.filter(k => screening[k] === true).length
    : null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
        Le due tracce
      </p>
      <div className="surface-card grid grid-cols-[1fr_1px_1fr] overflow-hidden">
        {/* ---- DICHIARATO ---- */}
        <div
          className="flex flex-col gap-2 p-3.5"
          style={submission ? undefined : { background: 'hsl(var(--compliance) / 0.06)' }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Dichiarato
          </p>
          {submission ? (
            <>
              <p className="text-[10px] font-medium text-muted-foreground">
                Questionario · {dataBreve(submission.consented_at ?? submission.created_at)}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-display text-[28px] font-bold leading-none"
                  style={{
                    color: parqPositivi && parqPositivi > 0
                      ? 'hsl(var(--pain))'
                      : 'hsl(var(--success-dark))',
                  }}
                >
                  {parqPositivi ?? '—'}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">PAR-Q su 7</span>
              </div>
              <p className="text-[10px] text-muted-foreground">8 gruppi di risposte</p>
              <button
                onClick={onOpenIntake}
                className="mt-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary text-left"
              >
                Apri gli 8 gruppi <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <p className="text-[10px] font-medium" style={{ color: 'hsl(var(--compliance-foreground))' }}>
                Mai compilato
              </p>
              <div className="flex items-center gap-1.5">
                <FileQuestion className="w-4 h-4" style={{ color: 'hsl(var(--compliance))' }} />
                <span
                  className="font-display text-xs font-semibold"
                  style={{ color: 'hsl(var(--compliance-foreground))' }}
                >
                  Traccia mai aperta
                </span>
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Nessun PAR-Q, nessun consenso, nessuno degli 8 gruppi.
                Anagrafica inserita a mano.
              </p>
              {/* Il link personale al modulo non esiste ancora: nessun token, nessuna
                  rotta. Resta inerte e dichiarato, mai finto. */}
              <p className="mt-auto text-[10px] italic text-muted-foreground">
                Invio del modulo: in arrivo
              </p>
            </>
          )}
        </div>

        <div className="bg-border" />

        {/* ---- MISURATO ---- */}
        <div
          className="flex flex-col gap-2 p-3.5"
          style={latest ? undefined : { background: 'hsl(var(--muted) / 0.6)' }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Misurato
          </p>
          {latest ? (
            <>
              <p className="text-[10px] font-medium text-muted-foreground">
                {isModifiedFms(latest as Partial<FmsScores>) ? 'FMS modificata' : 'FMS piena'}
                {' · '}{dataBreve(latest.assessed_at)}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[28px] font-bold leading-none text-foreground">
                  {latest.total_score ?? '—'}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  /{fmsMaxTotal(latest as Partial<FmsScores>)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{contaStorico(fmsHistory)}</p>
              <button
                onClick={onOpenHistory}
                className="mt-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary text-left"
              >
                Storico completo <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <p className="text-[10px] font-medium text-muted-foreground">Nessun test</p>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                <span className="font-display text-xs font-semibold text-foreground/80">
                  {workMode.testsEnabled ? 'Nessuna FMS ancora' : 'Seguita a distanza'}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground">
                {workMode.testsEnabled
                  ? 'Nessun test somministrato finora.'
                  : "L'FMS si somministra di persona. Questa traccia è vuota per come lavoriamo, non per un dato mancante."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** «4 FMS · 3 piene, 1 modificata» — il tipo si nomina, non si sottintende. */
function contaStorico(h: FmsAssessmentRow[]): string {
  const mod = h.filter(r => isModifiedFms(r as Partial<FmsScores>)).length;
  const full = h.length - mod;
  const parti: string[] = [];
  if (full) parti.push(full === 1 ? '1 piena' : `${full} piene`);
  if (mod) parti.push(mod === 1 ? '1 modificata' : `${mod} modificate`);
  return `${h.length} FMS · ${parti.join(', ')}`;
}
