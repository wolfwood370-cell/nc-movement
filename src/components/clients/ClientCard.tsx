import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClientAvatar from '@/components/ClientAvatar';
import { calcAge, riskShortLabel, riskTone, type RiskResult } from '@/lib/insights';

interface Props {
  id: string;
  fullName: string;
  createdAt: string;
  dateOfBirth: string | null;
  primarySport: string | null;
  fmsScore: number | null;
  risk: RiskResult;
}

export default function ClientCard({
  id, fullName, createdAt, dateOfBirth, primarySport, fmsScore, risk,
}: Props) {
  const tone = riskTone[risk.level];
  const age = calcAge(dateOfBirth);
  const meta = [
    age !== null ? `${age} anni` : null,
    primarySport,
    fmsScore !== null ? `FMS ${fmsScore}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/clients/${id}`}
      className={cn(
        'surface-card card-interactive tap-target flex items-center justify-between gap-3 p-4 border-l-4',
        tone.border,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ClientAvatar fullName={fullName} className="w-10 h-10 text-sm" />
        <div className="min-w-0">
          <div className="font-medium truncate">{fullName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {meta || `Aggiunto il ${new Date(createdAt).toLocaleDateString('it-IT')}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold',
          tone.chip,
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {riskShortLabel[risk.level]}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
