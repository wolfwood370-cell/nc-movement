import { forwardRef, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
} from 'recharts';
import { AlertTriangle, Sparkles, FileText, RefreshCw, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RiskGauge from './RiskGauge';
import MedicalReferralReport from './MedicalReferralReport';
import CorrectivePlanCard from './CorrectivePlanCard';
import { Button } from '@/components/ui/button';
import { computeRisk, mobilityStability, ybtAnteriorAsymmetry, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';
import { getCorrectivePriority, type FmsScores } from '@/lib/fms';
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
  const navigate = useNavigate();

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

  const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

  return (
    <div className="space-y-5">
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
                    <Line type="monotone" dataKey="Totale" stroke="hsl(var(--primary))" strokeWidth={2.5} dot />
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
