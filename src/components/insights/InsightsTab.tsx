import { forwardRef, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
} from 'recharts';
import { AlertTriangle, Sparkles, FileText, RefreshCw, CalendarClock, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RiskGauge from './RiskGauge';
import MedicalReferralReport from './MedicalReferralReport';
import CorrectivePlanCard from './CorrectivePlanCard';
import TrialSessionModal from './TrialSessionModal';

import { Button } from '@/components/ui/button';
import { computeRisk, mobilityStability, ybtAnteriorAsymmetry, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';
import { computePatterns, getCorrectivePriority, isModifiedFms, type FmsScores } from '@/lib/fms';
import type { computeFcsMetrics } from '@/lib/fcs';
import type { SfmaFormValues } from '@/lib/sfma';

type FcsMetrics = ReturnType<typeof computeFcsMetrics>;

interface ClientLite {
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  primary_sport: string | null;
  has_previous_injury?: boolean | null;
  injury_notes?: string | null;
}

interface PractitionerLite {
  display_name?: string | null;
  professional_title?: string | null;
}

interface SfmaWithBreakouts extends Partial<SfmaFormValues> {
  assessed_at?: string;
  breakout_results?: unknown;
}

interface Props {
  fmsHistory: FmsAssessmentRow[];
  ybtHistory?: YbtRow[];
  fcsMetrics?: FcsMetrics | null;
  sfmaLatest?: SfmaWithBreakouts | null;
  client?: ClientLite | null;
  practitioner?: PractitionerLite | null;
  /** When provided, enables the closed-loop Re-Test banner CTA. */
  clientId?: string;
}

/** Convert a 0..1+ ratio against its target into a 0..100 score (capped at 100). */
function ratioToScore(value: number | null, target: number): number {
  if (value == null || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

const abs = (a: number | null, b: number | null) =>
  a !== null && b !== null ? Math.abs(a - b) : null;

export default function InsightsTab({ fmsHistory, ybtHistory, fcsMetrics, sfmaLatest, client, practitioner, clientId }: Props) {
  const latestFms = fmsHistory[0] ?? null;
  const ybtLatest = ybtHistory?.[0] ?? null;
  const [referralOpen, setReferralOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const navigate = useNavigate();
  const isModified = isModifiedFms(latestFms);

  // ---- Closed-loop Re-Test prompt ---------------------------------------
  // If the latest FMS prescribed correctives (priority != optimal/incomplete)
  // and is older than 14 days, surface a banner inviting a fresh re-test.
  const retest = useMemo(() => {
    if (!latestFms?.assessed_at) return null;
    const priority = getCorrectivePriority(latestFms as FmsScores);
    if (priority.level === 'optimal' || priority.level === 'incomplete') return null;
    const days = Math.floor((Date.now() - new Date(latestFms.assessed_at).getTime()) / 86_400_000);
    if (days < 14) return null;
    return { days, focus: priority.focus };
  }, [latestFms]);
  const risk = useMemo(
    () => computeRisk(latestFms, ybtLatest, sfmaLatest ?? null, { hasPreviousInjury: client?.has_previous_injury ?? false }),
    [latestFms, ybtLatest, sfmaLatest, client?.has_previous_injury],
  );

  const referralEligible = risk.level === 'critical';

  // ---- FCS radar ----------------------------------------------------------
  const fcsRadar = useMemo(() => {
    if (!fcsMetrics) return null;
    return [
      { axis: 'Motorio',   score: ratioToScore(fcsMetrics.forwardReachSymmetry.value, fcsMetrics.forwardReachSymmetry.target) },
      { axis: 'Posturale', score: ratioToScore(fcsMetrics.carryLoadRatio.value, fcsMetrics.carryLoadRatio.target) },
      { axis: 'Esplosivo', score: ratioToScore(fcsMetrics.explosiveSymmetry.value, fcsMetrics.explosiveSymmetry.target) },
      { axis: 'Impatto',   score: ratioToScore(fcsMetrics.impactSymmetry.value, fcsMetrics.impactSymmetry.target) },
    ];
  }, [fcsMetrics]);

  // ---- Mobility vs Stability trend ---------------------------------------
  const trend = useMemo(() => [...fmsHistory].reverse().map((f) => {
    const { mobility, stability } = mobilityStability(f);
    return {
      date: new Date(f.assessed_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      Mobilità: mobility,
      Stabilità: stability,
    };
  }), [fmsHistory]);

  // ---- FMS total trend ----------------------------------------------------
  const totalTrend = useMemo(() => [...fmsHistory].reverse().map((f) => ({
    id: f.id,
    date: new Date(f.assessed_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    Totale: f.total_score ?? 0,
  })), [fmsHistory]);

  // ---- YBT asymmetry bars (latest snapshot, all 3 reach directions) ------
  const ybtBars = useMemo(() => {
    if (!ybtLatest) return null;
    return [
      { axis: 'Anteriore',      diff: abs(ybtLatest.anterior_left_cm, ybtLatest.anterior_right_cm) ?? 0, critical: true },
      { axis: 'Posteromediale', diff: abs(ybtLatest.posteromedial_left_cm, ybtLatest.posteromedial_right_cm) ?? 0, critical: false },
      { axis: 'Posterolaterale',diff: abs(ybtLatest.posterolateral_left_cm, ybtLatest.posterolateral_right_cm) ?? 0, critical: false },
    ];
  }, [ybtLatest]);

  // ---- YBT anterior asymmetry trend (longitudinal) -----------------------
  // Skip rows where the anterior reach is missing on either side: a `0` would
  // misleadingly read as "perfect symmetry" on the chart.
  const ybtAntTrend = useMemo(() => {
    if (!ybtHistory?.length) return [];
    return [...ybtHistory]
      .reverse()
      .map((y) => ({ y, asym: ybtAnteriorAsymmetry(y) }))
      .filter((d): d is { y: YbtRow; asym: number } => d.asym !== null)
      .map(({ y, asym }) => ({
        date: new Date(y.assessed_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        Asimmetria: asym,
      }));
  }, [ybtHistory]);

  // ---- Evoluzione per pattern (prima → ora), stat row, best/worst mover ----
  const evolution = useMemo(() => {
    if (fmsHistory.length < 2) return null;
    const oldest = fmsHistory[fmsHistory.length - 1];
    const newest = fmsHistory[0];
    const oldP = computePatterns(oldest as unknown as FmsScores);
    const newP = computePatterns(newest as unknown as FmsScores);
    return newP.map((np) => {
      const op = oldP.find((p) => p.key === np.key);
      const before = op?.final ?? null;
      const now = np.final ?? null;
      const delta = before != null && now != null ? now - before : null;
      return { key: np.key, label: np.label, before, now, delta };
    });
  }, [fmsHistory]);

  const stats = useMemo(() => {
    const newest = fmsHistory[0];
    const oldest = fmsHistory[fmsHistory.length - 1];
    const newestModified = newest ? isModifiedFms(newest as unknown as FmsScores) : false;
    // Media/Variazione solo tra FMS dello STESSO tipo dell'ultima: le scale Full (0-21)
    // e Modified (0-9) non sono confrontabili (stesso principio del delta in LastFmsCard).
    const sameTypeTotals = fmsHistory
      .filter((f) => isModifiedFms(f as unknown as FmsScores) === newestModified)
      .map((f) => f.total_score)
      .filter((v): v is number => typeof v === 'number');
    const avg = sameTypeTotals.length
      ? Math.round((sameTypeTotals.reduce((s, v) => s + v, 0) / sameTypeTotals.length) * 10) / 10
      : null;
    const sameType = oldest ? isModifiedFms(oldest as unknown as FmsScores) === newestModified : false;
    const variation = fmsHistory.length >= 2 && sameType && newest?.total_score != null && oldest?.total_score != null
      ? newest.total_score - oldest.total_score : null;
    const asym = newest ? computePatterns(newest as unknown as FmsScores).filter((p) => p.asymmetric).length : 0;
    return { avg, variation, asym };
  }, [fmsHistory]);

  const movers = useMemo(() => {
    if (!evolution) return null;
    const withDelta = evolution.filter((r): r is typeof r & { delta: number } => r.delta != null && r.delta !== 0);
    if (withDelta.length === 0) return null;
    const best = withDelta.reduce((a, b) => (b.delta > a.delta ? b : a));
    const worst = withDelta.reduce((a, b) => (b.delta < a.delta ? b : a));
    return { best: best.delta > 0 ? best : null, worst: worst.delta < 0 ? worst : null };
  }, [evolution]);

  const renderFmsDot = (props: unknown) => {
    const { cx, cy, index, payload } = props as { cx?: number; cy?: number; index?: number; payload?: { id?: string } };
    if (typeof cx !== 'number' || typeof cy !== 'number') return <g key={`fd-${index ?? 0}`} />;
    const pid = payload?.id;
    return (
      <circle
        key={`fd-${index ?? 0}`}
        cx={cx}
        cy={cy}
        r={5}
        fill="hsl(var(--primary))"
        stroke="hsl(var(--card))"
        strokeWidth={2}
        style={{ cursor: pid ? 'pointer' : undefined }}
        onClick={pid ? () => navigate(`/assessments/fms/${pid}`) : undefined}
      />
    );
  };

  const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

  return (
    <div className="space-y-5">
      {isModified && (
        <div className="surface-card border border-primary/40 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="self-start shrink-0 whitespace-nowrap inline-block px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
            FMS Modificato (Trial)
          </span>
          <span className="text-xs text-muted-foreground">
            Screening rapido: solo Deep Squat, Shoulder Mobility e ASLR. Patterns mancanti esclusi dai grafici.
          </span>
        </div>
      )}
      {/* Closed-loop Re-Test prompt */}
      {retest && (
        <section className="surface-card border-warning/40 border bg-warning/5 p-4 flex items-start gap-3 flex-wrap">
          <CalendarClock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-display font-bold text-sm text-warning mb-1">
              Azione Clinica · Re-Test consigliato
            </h3>
            <p className="text-sm text-foreground">
              Sono passati <strong>{retest.days} giorni</strong> dalla prescrizione di
              correttivi per <strong>{retest.focus}</strong>. Si consiglia di rivalutare
              il pattern con un nuovo FMS per chiudere il ciclo.
            </p>
          </div>
          {clientId && (
            <Button
              type="button"
              size="sm"
              onClick={() => navigate(`/assessments/fms/new?clientId=${clientId}`)}
              className="tap-target"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nuovo FMS
            </Button>
          )}
        </section>
      )}

      {/* Risk + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RiskGauge risk={risk} />
        <section className="surface-card p-5">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Alert Clinici Attivi
          </h3>
          {risk.alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-functional" />
              Nessun alert attivo. Profilo entro le soglie.
            </div>
          ) : (
            <ul className="space-y-2">
              {risk.alerts.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}

          {client && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                type="button"
                variant={referralEligible ? 'default' : 'outline'}
                onClick={() => setReferralOpen(true)}
                disabled={!referralEligible}
                className="w-full tap-target"
              >
                <FileText className="w-4 h-4 mr-2" />
                {referralEligible ? 'Esporta Referto Medico' : 'Nessun reperto da rinviare'}
              </Button>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                {referralEligible
                  ? 'Red flag rilevati: si raccomanda rinvio clinico.'
                  : 'Il referto si abilita automaticamente in presenza di dolore o test di esclusione positivi.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Trial Session generator */}
      {latestFms && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setTrialOpen(true)}
            size="lg"
            className={
              isModified
                ? 'tap-target shadow-lg shadow-primary/30 animate-pulse'
                : 'tap-target'
            }
            variant={isModified ? 'default' : 'secondary'}
          >
            <Zap className="w-4 h-4 mr-2" />
            Genera Sessione Trial
          </Button>
        </div>
      )}

      <TrialSessionModal
        open={trialOpen}
        onOpenChange={setTrialOpen}
        latestFms={latestFms}
        clientName={client?.full_name}
      />

      {/* Corrective prescription engine */}
      <CorrectivePlanCard fms={latestFms} client={client} />


      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* FCS Spider */}
        <section className="surface-card p-4">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            FCS — Capacità Fondamentali
          </h3>
          {!fcsRadar ? (
            <EmptyChart label="Esegui un Fundamental Capacity Screen per sbloccare questo grafico." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={fcsRadar} outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="axis" tick={axisStyle} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* YBT */}
        <section className="surface-card p-4">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            YBT — Asimmetria Reach (cm)
          </h3>
          {!ybtBars ? (
            <EmptyChart label="Esegui uno Y-Balance Test per visualizzare le asimmetrie." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={ybtBars} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="axis" tick={axisStyle} />
                  <YAxis tick={axisStyle} unit=" cm" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="diff" name="Asimmetria" radius={[6, 6, 0, 0]}>
                    {ybtBars.map((d, i) => {
                      const isRed = d.critical && d.diff > 4;
                      return (
                        <Cell
                          key={i}
                          fill={isRed ? 'hsl(var(--pain))' : 'hsl(var(--primary))'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* ============ Evoluzione per pattern ============ */}
      {evolution && (
        <section className="surface-card p-4 space-y-4">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Evoluzione per pattern
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Media" value={stats.avg != null ? String(stats.avg) : '—'} />
            <StatTile
              label="Variazione"
              value={stats.variation == null ? '—' : stats.variation > 0 ? `+${stats.variation}` : String(stats.variation)}
              tone={stats.variation == null || stats.variation === 0 ? undefined : stats.variation > 0 ? 'up' : 'down'}
            />
            <StatTile label="Asimmetrie" value={String(stats.asym)} tone={stats.asym > 0 ? 'down' : undefined} />
          </div>

          {movers && (movers.best || movers.worst) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {movers.best && (
                <span className="inline-flex items-center gap-1 rounded-full bg-functional/10 text-functional px-2.5 py-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> Migliora: {movers.best.label} (+{movers.best.delta})
                </span>
              )}
              {movers.worst && (
                <span className="inline-flex items-center gap-1 rounded-full bg-pain/10 text-pain px-2.5 py-1 font-medium">
                  <TrendingDown className="w-3.5 h-3.5" /> Peggiora: {movers.worst.label} ({movers.worst.delta})
                </span>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold py-1.5">Pattern</th>
                  <th className="text-center font-semibold py-1.5 w-14">Prima</th>
                  <th className="text-center font-semibold py-1.5 w-14">Ora</th>
                  <th className="text-center font-semibold py-1.5 w-12">Δ</th>
                </tr>
              </thead>
              <tbody>
                {evolution.map((r) => (
                  <tr key={r.key} className="border-t border-border/50">
                    <td className="py-1.5 pr-2">{r.label}</td>
                    <td className="text-center tabular-nums text-muted-foreground">{r.before ?? '—'}</td>
                    <td className="text-center tabular-nums font-medium">{r.now ?? '—'}</td>
                    <td className={`text-center tabular-nums font-semibold ${
                      r.delta == null || r.delta === 0 ? 'text-muted-foreground' : r.delta > 0 ? 'text-functional' : 'text-pain'
                    }`}>
                      {r.delta == null ? '—' : r.delta > 0 ? `+${r.delta}` : r.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Confronto tra la prima e l'ultima FMS registrata.</p>
        </section>
      )}

      {/* ============ Longitudinal Progress ============ */}
      <div className="pt-2">
        <h2 className="font-display font-bold text-lg mb-3">Progressione Longitudinale</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* FMS total trend with risk reference line at 14 */}
          <section className="surface-card p-4">
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              FMS — Score Totale nel tempo
            </h3>
            {totalTrend.length === 0 ? (
              <EmptyChart label="Nessuna valutazione FMS registrata." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={totalTrend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={axisStyle} />
                    <YAxis tick={axisStyle} domain={[0, 21]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine
                      y={14}
                      stroke="hsl(var(--warning))"
                      strokeDasharray="4 4"
                      label={{ value: 'Soglia rischio (14)', fill: 'hsl(var(--warning))', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <Line type="monotone" dataKey="Totale" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={renderFmsDot} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* YBT anterior asymmetry trend with 4cm red-flag line */}
          <section className="surface-card p-4">
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              YBT — Asimmetria Anteriore (cm)
            </h3>
            {ybtAntTrend.length === 0 ? (
              <EmptyChart label="Nessuna valutazione YBT registrata." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={ybtAntTrend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={axisStyle} />
                    <YAxis tick={axisStyle} unit=" cm" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine
                      y={4}
                      stroke="hsl(var(--pain))"
                      strokeDasharray="4 4"
                      label={{ value: 'Red flag (>4)', fill: 'hsl(var(--pain))', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <Bar dataKey="Asimmetria" radius={[6, 6, 0, 0]}>
                      {ybtAntTrend.map((d, i) => (
                        <Cell key={i} fill={d.Asimmetria > 4 ? 'hsl(var(--pain))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobility vs Stability */}
      <section className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          FMS — Mobilità vs Stabilità
        </h3>
        {trend.length === 0 ? (
          <EmptyChart label="Nessuna valutazione FMS registrata." />
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Mobilità" stroke="hsl(var(--primary))" strokeWidth={2.5} dot />
                <Line type="monotone" dataKey="Stabilità" stroke="hsl(var(--functional))" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {client && (
        <MedicalReferralReport
          open={referralOpen}
          onClose={() => setReferralOpen(false)}
          autoPrint
          client={client}
          practitioner={practitioner ?? null}
          fms={latestFms}
          ybt={ybtLatest ?? null}
          sfma={sfmaLatest ?? null}
        />
      )}
    </div>
  );
}

const EmptyChart = forwardRef<HTMLDivElement, { label: string }>(({ label }, ref) => (
  <div ref={ref} className="h-40 grid place-items-center text-center px-6">
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
));
EmptyChart.displayName = 'EmptyChart';

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const toneClass = tone === 'up' ? 'text-functional' : tone === 'down' ? 'text-pain' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`font-display font-bold text-xl mt-0.5 ${toneClass}`}>{value}</div>
    </div>
  );
}
