import { ShieldCheck, ShieldAlert, MapPin, Wifi, Repeat, Smartphone, HelpCircle } from 'lucide-react';
import type { ConsentBadge, WorkModeBadge } from '@/lib/intake';

/**
 * Le due pillole della testata: modalità di lavoro e consenso.
 *
 * Il consenso assente usa `--compliance` e non `--pain`: è un problema
 * amministrativo, non clinico, e non deve suonare come una bandiera rossa.
 */

const WORK_ICON = {
  presenza: MapPin,
  remoto: Wifi,
  ibrido: Repeat,
  app: Smartphone,
} as const;

export function WorkModePill({ badge }: { badge: WorkModeBadge }) {
  // Il disegno non fornisce icona né etichetta per 'app': riusa la stessa forma
  // delle altre, con l'icona del telefono, perché la pillola non deve cambiare
  // geometria a seconda del valore.
  const Icon = badge.mode ? WORK_ICON[badge.mode] : HelpCircle;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80">
      <Icon className="w-3 h-3" />
      {badge.label}
    </span>
  );
}

export function ConsentPill({ badge }: { badge: ConsentBadge }) {
  const ok = badge.tone === 'ok';
  const Icon = ok ? ShieldCheck : ShieldAlert;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
      style={
        ok
          ? {
              borderColor: 'hsl(var(--success) / 0.45)',
              background: 'hsl(var(--success) / 0.1)',
              color: 'hsl(var(--success-dark))',
            }
          : {
              borderColor: 'hsl(var(--compliance) / 0.55)',
              background: 'hsl(var(--compliance) / 0.12)',
              color: 'hsl(var(--compliance-foreground))',
            }
      }
    >
      <Icon className="w-3 h-3" />
      {badge.label}
    </span>
  );
}
