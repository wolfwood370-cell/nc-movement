import { ShieldAlert, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import type { RiskResult } from '@/lib/insights';
import { riskTone } from '@/lib/insights';

const ICON = {
  critical: ShieldAlert,
  high: AlertTriangle,
  moderate: AlertTriangle,
  low: CheckCircle2,
  unknown: Activity,
} as const;

export default function RiskGauge({ risk }: { risk: RiskResult }) {
  const tone = riskTone[risk.level];
  const Icon = ICON[risk.level];
  // Semicircle gauge: 0..100 → 0..180 deg
  const angle = Math.max(0, Math.min(100, risk.score)) * 1.8;
  const r = 70;
  const cx = 90, cy = 90;
  const polar = (deg: number) => {
    const rad = (180 - deg) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };
  const end = polar(angle);
  const arcPath = `M ${polar(0).x} ${polar(0).y} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
  const trackPath = `M ${polar(0).x} ${polar(0).y} A ${r} ${r} 0 1 1 ${polar(180).x} ${polar(180).y}`;

  return (
    <div className="surface-card p-5">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
        Injury Risk Index
      </div>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 180 110" className="w-40 h-24 shrink-0">
          <path d={trackPath} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
          <path
            d={arcPath} fill="none"
            stroke={`hsl(var(--${risk.level === 'critical' ? 'pain' : risk.level === 'high' ? 'warning' : risk.level === 'moderate' ? 'dysfunction' : risk.level === 'low' ? 'functional' : 'muted'}))`}
            strokeWidth="14" strokeLinecap="round"
          />
          <text x="90" y="86" textAnchor="middle" className="font-display font-bold fill-foreground" style={{ fontSize: 28 }}>
            {risk.level === 'unknown' ? '—' : `${risk.score}`}
          </text>
        </svg>
        <div className="min-w-0">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tone.chip}`}>
            <Icon className="w-3.5 h-3.5" /> {risk.label}
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-snug">{risk.detail}</p>
        </div>
      </div>
    </div>
  );
}
