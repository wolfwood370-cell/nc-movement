import { forwardRef, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { AlertTriangle, Sparkles, FileText } from 'lucide-react';
import RiskGauge from './RiskGauge';
import MedicalReferralReport from './MedicalReferralReport';
import { Button } from '@/components/ui/button';
import { computeRisk, mobilityStability, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';
import type { computeFcsMetrics } from '@/lib/fcs';
import type { SfmaFormValues } from '@/lib/sfma';

type FcsMetrics = ReturnType<typeof computeFcsMetrics>;

interface ClientLite {
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  primary_sport: string | null;
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
  ybtLatest?: YbtRow | null;
  fcsMetrics?: FcsMetrics | null;
  sfmaLatest?: SfmaWithBreakouts | null;
  client?: ClientLite | null;
  practitioner?: PractitionerLite | null;
}

/** Convert a 0..1+ ratio against its target into a 0..100 score (capped at 100). */
function ratioToScore(value: number | null, target: number): number {
  if (value == null || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

const abs = (a: number | null, b: number | null) =>
  a !== null && b !== null ? Math.abs(a - b) : null;

export default function InsightsTab({ fmsHistory, ybtLatest, fcsMetrics, sfmaLatest, client, practitioner }: Props) {
  const latestFms = fmsHistory[0] ?? null;
  const [referralOpen, setReferralOpen] = useState(false);
  const risk = useMemo(
    () => computeRisk(latestFms, ybtLatest ?? null, sfmaLatest ?? null),
    [latestFms, ybtLatest, sfmaLatest],
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

  // ---- YBT asymmetry bars ------------------------------------------------
  const ybtBars = useMemo(() => {
    if (!ybtLatest) return null;
    return [
      { axis: 'Anteriore',      diff: abs(ybtLatest.anterior_left_cm, ybtLatest.anterior_right_cm) ?? 0, critical: true },
      { axis: 'Posteromediale', diff: abs(ybtLatest.posteromedial_left_cm, ybtLatest.posteromedial_right_cm) ?? 0, critical: false },
      { axis: 'Posterolaterale',diff: abs(ybtLatest.posterolateral_left_cm, ybtLatest.posterolateral_right_cm) ?? 0, critical: false },
    ];
  }, [ybtLatest]);

  const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

  return (
    <div className="space-y-5">
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
                className="w-full tap-target"
              >
                <FileText className="w-4 h-4 mr-2" />
                {referralEligible ? 'Esporta Referto Medico' : 'Genera Referto (anche se assente)'}
              </Button>
              {referralEligible && (
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  Red flag rilevati: si raccomanda rinvio clinico.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

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

      {/* FMS total trend */}
      <section className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          FMS — Progressione Totale
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
                <Line type="monotone" dataKey="Totale" stroke="hsl(var(--primary))" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

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
    </div>
  );
}

const EmptyChart = forwardRef<HTMLDivElement, { label: string }>(({ label }, ref) => (
  <div ref={ref} className="h-40 grid place-items-center text-center px-6">
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
));
EmptyChart.displayName = 'EmptyChart';
