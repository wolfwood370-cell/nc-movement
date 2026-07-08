import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  computePatterns, computeTotal, primaryCorrective, fmsMaxTotal, isModifiedFms, type FmsScores,
} from '@/lib/fms';
import type { FmsAssessmentRow } from '@/lib/insights';
import FmsProgressRing from '@/components/fms/FmsProgressRing';

interface Props {
  fmsHistory: FmsAssessmentRow[];
}

// Mappe di sola presentazione (nessuna logica di scoring): livello corrective → tono.
const FOCUS_TONE: Record<string, string> = {
  pain: 'bg-pain text-destructive-foreground',
  mobility: 'bg-warning text-warning-foreground',
  motor_control: 'bg-warning text-warning-foreground',
  functional: 'bg-accent text-accent-foreground',
  clear: 'bg-success text-success-foreground',
  incomplete: 'bg-muted text-muted-foreground',
};
const RING_TONE: Record<string, string> = {
  pain: 'text-pain',
  mobility: 'text-warning',
  motor_control: 'text-warning',
  functional: 'text-warning',
  clear: 'text-functional',
  incomplete: 'text-primary',
};

/**
 * Hero-card "Ultima FMS · focus": anello score (n/max) + chip focus + delta vs FMS
 * precedente + mini-trend. Legge lo stesso data layer (FMS history); non ricalcola scoring.
 */
export default function LastFmsCard({ fmsHistory }: Props) {
  if (fmsHistory.length === 0) return null;
  const latest = fmsHistory[0];
  const penult = fmsHistory[1];
  const patterns = computePatterns(latest as unknown as FmsScores);
  const total = latest.total_score ?? computeTotal(patterns);
  const max = fmsMaxTotal(latest as Partial<FmsScores>);
  const corrective = primaryCorrective(patterns);

  // Delta solo se confrontabile (stesso tipo di assessment: full↔full o mod↔mod).
  const sameType = penult
    ? isModifiedFms(latest as Partial<FmsScores>) === isModifiedFms(penult as Partial<FmsScores>)
    : false;
  const delta = total != null && penult?.total_score != null && sameType ? total - penult.total_score : null;

  const trend = [...fmsHistory].slice(0, 6).reverse(); // vecchio → recente
  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaTone = delta == null || delta === 0 ? 'text-muted-foreground' : delta > 0 ? 'text-functional' : 'text-pain';

  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-4">
        <FmsProgressRing
          value={total ?? 0}
          max={max}
          progress={total != null ? 1 : 0}
          toneClass={RING_TONE[corrective.level] ?? 'text-primary'}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ultima FMS</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${FOCUS_TONE[corrective.level] ?? 'bg-muted text-muted-foreground'}`}>
              {corrective.label}
            </span>
            {delta != null && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${deltaTone}`}>
                <DeltaIcon className="w-3.5 h-3.5" /> {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {new Date(latest.assessed_at).toLocaleDateString('it-IT')}
            {isModifiedFms(latest as Partial<FmsScores>) && ' · Modificato'}
          </div>
        </div>
        {trend.length >= 2 && (
          <div className="flex items-end gap-1 h-12 shrink-0" aria-hidden="true">
            {trend.map((f, i) => {
              const t = f.total_score;
              const fMax = fmsMaxTotal(f as Partial<FmsScores>);
              const h = t != null && fMax > 0 ? Math.max(8, Math.round((t / fMax) * 100)) : 8;
              const isLast = i === trend.length - 1;
              return (
                <div
                  key={f.id}
                  className={`w-1.5 rounded-full ${isLast ? 'bg-primary' : 'bg-primary/30'}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
