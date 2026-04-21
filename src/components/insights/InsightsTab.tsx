import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import RiskGauge from './RiskGauge';
import { computeRisk, mobilityStability, type FmsAssessmentRow, type YbtRow } from '@/lib/insights';

interface Props {
  fmsHistory: FmsAssessmentRow[];
  /** Mocked until YBT entry UI exists. */
  ybtLatest?: YbtRow | null;
}

// --- Mock data fallbacks ------------------------------------------------------
const MOCK_YBT: YbtRow = {
  id: 'mock', assessed_at: new Date().toISOString(),
  anterior_left_cm: 64, anterior_right_cm: 67,
  posteromedial_left_cm: 102, posteromedial_right_cm: 99,
  posterolateral_left_cm: 96, posterolateral_right_cm: 94,
};

const MOCK_FCS = [
  { axis: 'Motorio',   score: 72, fullMark: 100 },
  { axis: 'Posturale', score: 81, fullMark: 100 },
  { axis: 'Esplosivo', score: 65, fullMark: 100 },
  { axis: 'Impatto',   score: 70, fullMark: 100 },
];

export default function InsightsTab({ fmsHistory, ybtLatest }: Props) {
  const ybt = ybtLatest ?? MOCK_YBT;
  const ybtIsMock = !ybtLatest;

  const latestFms = fmsHistory[0] ?? null;
  const risk = useMemo(() => computeRisk(latestFms, ybt), [latestFms, ybt]);

  const trend = useMemo(() => {
    return [...fmsHistory].reverse().map((f) => {
      const { mobility, stability } = mobilityStability(f);
      return {
        date: new Date(f.assessed_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        Mobilità: mobility,
        Stabilità: stability,
      };
    });
  }, [fmsHistory]);

  const ybtBars = useMemo(() => ([
    { axis: 'Anteriore',     L: ybt.anterior_left_cm ?? 0,       R: ybt.anterior_right_cm ?? 0 },
    { axis: 'Posteromediale', L: ybt.posteromedial_left_cm ?? 0,  R: ybt.posteromedial_right_cm ?? 0 },
    { axis: 'Posterolaterale', L: ybt.posterolateral_left_cm ?? 0, R: ybt.posterolateral_right_cm ?? 0 },
  ]), [ybt]);

  const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

  return (
    <div className="space-y-5">
      <RiskGauge risk={risk} />

      {/* Mobility vs Stability */}
      <section className="surface-card p-4">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Mobilità vs Stabilità
        </h3>
        {trend.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nessuna valutazione FMS registrata.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Mobilità" stroke="hsl(var(--primary))" strokeWidth={2.5} dot />
                <Line type="monotone" dataKey="Stabilità" stroke="hsl(var(--functional))" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* YBT */}
      <section className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            YBT — Simmetria Reach
          </h3>
          {ybtIsMock && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">demo</span>}
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={ybtBars} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="axis" tick={axisStyle} />
              <YAxis tick={axisStyle} unit=" cm" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="L" name="Sinistra" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="R" name="Destra" fill="hsl(var(--functional))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* FCS Spider */}
      <section className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            FCS — Capacità Fondamentali
          </h3>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">demo</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <RadarChart data={MOCK_FCS} outerRadius="75%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="axis" tick={axisStyle} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
