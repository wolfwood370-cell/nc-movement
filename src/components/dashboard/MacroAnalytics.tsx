import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { Users, Activity, ArrowLeftRight, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  computeMacroAnalytics, pickLatestPerClient, type MacroAnalytics,
} from '@/lib/macroAnalytics';
import type { FmsAssessmentRow } from '@/lib/insights';

interface KpiProps {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'pain' | 'functional';
}

const TONE: Record<NonNullable<KpiProps['tone']>, { ring: string; iconBg: string; iconText: string }> = {
  default:    { ring: '',                 iconBg: 'bg-primary/10',    iconText: 'text-primary' },
  functional: { ring: 'border-functional/40', iconBg: 'bg-functional/15', iconText: 'text-functional' },
  warning:    { ring: 'border-warning/40',    iconBg: 'bg-warning/15',    iconText: 'text-warning' },
  pain:       { ring: 'border-pain/40',       iconBg: 'bg-pain/15',       iconText: 'text-pain' },
};

function KpiCard({ icon: Icon, label, value, hint, tone = 'default' }: KpiProps) {
  const t = TONE[tone];
  return (
    <Card className={`surface-card ${t.ring}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${t.iconBg} ${t.iconText} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
            {label}
          </div>
          <div className="font-display font-bold text-2xl leading-none mt-0.5">{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MacroAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<MacroAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: clientsRows }, { data: fmsRows }] = await Promise.all([
        supabase.from('clients').select('id'),
        supabase.from('fms_assessments').select('*').order('assessed_at', { ascending: false }),
      ]);
      if (cancelled) return;
      const totalClients = clientsRows?.length ?? 0;
      const latestMap = pickLatestPerClient((fmsRows ?? []) as unknown as FmsAssessmentRow[]);
      const latestRows = [...latestMap.values()];
      setAnalytics(computeMacroAnalytics(totalClients, latestRows));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const radarData = useMemo(() => {
    if (!analytics) return [];
    return analytics.patternAverages.map(p => ({
      axis: p.label,
      score: p.average ?? 0,
    }));
  }, [analytics]);

  const barData = useMemo(() => {
    if (!analytics) return [];
    return analytics.weakLinkDistribution.map(w => ({
      label: w.label,
      Clienti: w.count,
      percent: w.percent,
    }));
  }, [analytics]);

  const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

  if (loading || !analytics) {
    return (
      <div className="surface-card p-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Calcolo analytics di clinica…
      </div>
    );
  }

  const noData = analytics.clientsWithFms === 0;

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Users}
          label="Clienti Attivi"
          value={String(analytics.totalClients)}
          hint={`${analytics.clientsWithFms} con FMS`}
        />
        <KpiCard
          icon={Activity}
          label="Score FMS Medio"
          value={analytics.averageFmsScore != null ? `${analytics.averageFmsScore}` : '—'}
          hint="su 21"
          tone={analytics.averageFmsScore != null && analytics.averageFmsScore < 14 ? 'warning' : 'functional'}
        />
        <KpiCard
          icon={ArrowLeftRight}
          label="Asimmetrie"
          value={`${analytics.asymmetryRate}%`}
          hint="clienti con almeno 1 asimmetria"
          tone={analytics.asymmetryRate >= 40 ? 'warning' : 'default'}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Red Flag"
          value={`${analytics.redFlagRate}%`}
          hint="clearing test positivo o dolore"
          tone={analytics.redFlagRate > 0 ? 'pain' : 'functional'}
        />
      </div>

      {noData ? (
        <Card className="surface-card">
          <CardContent className="p-10 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Dati insufficienti</p>
            <p className="text-sm text-muted-foreground mt-1">
              Esegui almeno una valutazione FMS per popolare la panoramica clinica.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Radar — Movement Profile */}
          <Card className="surface-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display">
                Profilo di Movimento Globale
              </CardTitle>
              <p className="text-xs text-muted-foreground">Media (0–3) per pattern · ultima FMS per cliente</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-72">
                <ResponsiveContainer>
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ ...axisStyle, fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 3]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [v.toFixed(2), 'Score medio']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar — Weak Link distribution */}
          <Card className="surface-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-display">
                Distribuzione delle Disfunzioni Primarie
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {analytics.topWeakLink
                  ? `Top weak link: ${analytics.topWeakLink.label} (${analytics.topWeakLink.count} client${analytics.topWeakLink.count === 1 ? 'e' : 'i'})`
                  : 'Nessuna priorità correttiva rilevata'}
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {barData.length === 0 ? (
                <div className="h-72 grid place-items-center text-sm text-muted-foreground text-center px-6">
                  Tutti i clienti valutati hanno un baseline ottimale.
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={axisStyle} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={axisStyle} width={120} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number, _n, item) => {
                          const pct = (item?.payload as { percent?: number })?.percent;
                          return [`${v} (${pct ?? 0}%)`, 'Clienti'];
                        }}
                      />
                      <Bar dataKey="Clienti" radius={[0, 6, 6, 0]}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
