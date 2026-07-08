import { Users, Activity, ArrowLeftRight, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMacroAnalytics } from '@/hooks/useMacroAnalytics';

interface KpiProps {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'pain' | 'functional';
}

const TONE: Record<NonNullable<KpiProps['tone']>, { ring: string; iconBg: string; iconText: string }> = {
  default:    { ring: '',                     iconBg: 'bg-primary/10',    iconText: 'text-primary' },
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

/**
 * The 4 clinic KPIs (Clienti Attivi · Score FMS Medio · Asimmetrie · Red Flag),
 * with their own loading/error states. Rendered at the top of the Dashboard.
 * Shares the ['macroAnalytics'] cache with the charts view via useMacroAnalytics.
 */
export default function ClinicalKpiRow() {
  const { data: analytics, isLoading, isError } = useMacroAnalytics();

  if (isError) {
    return (
      <div className="surface-card p-6 flex items-center justify-center text-sm text-destructive gap-2">
        <AlertTriangle className="w-4 h-4" /> Errore nel caricamento dei KPI clinici.
      </div>
    );
  }
  if (isLoading || !analytics) {
    return (
      <div className="surface-card p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Calcolo KPI clinici…
      </div>
    );
  }

  return (
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
  );
}
