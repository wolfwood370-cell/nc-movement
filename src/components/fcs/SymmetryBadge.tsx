import { Badge } from '@/components/ui/badge';
import { formatPct, type RatioResult } from '@/lib/fcs';

interface Props {
  label: string;
  result: RatioResult;
}

export default function SymmetryBadge({ label, result }: Props) {
  const tone =
    result.passes === null
      ? 'bg-muted text-muted-foreground'
      : result.passes
        ? 'bg-functional/15 text-functional border-functional/40'
        : 'bg-pain/15 text-pain border-pain/40';

  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${tone}`}>
      <span className="text-xs font-medium">{label}</span>
      <Badge variant="outline" className="border-current text-current bg-transparent">
        {formatPct(result.value)} <span className="opacity-60 ml-1">/ {formatPct(result.target)}</span>
      </Badge>
    </div>
  );
}
