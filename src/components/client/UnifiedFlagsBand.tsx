import { AlertTriangle, EyeOff, ShieldCheck } from 'lucide-react';
import type { UnifiedFlags } from '@/lib/intake';

/**
 * La banda delle bandiere unite: una riga per bandiera, ognuna col marcatore
 * **D** (dichiarata dal cliente) o **M** (misurata da me).
 *
 * Il tono non si decide contando le righe. Quando una delle due metà non è mai stata
 * interrogata la banda NON diventa verde: zero bandiere dichiarate perché il
 * questionario è pulito e zero perché il questionario non esiste sono due cose
 * diverse, e la seconda non autorizza a scrivere «nessuna bandiera rossa».
 */
export default function UnifiedFlagsBand({ flags }: { flags: UnifiedFlags }) {
  const rossa = flags.tone === 'rossa';
  const verde = flags.tone === 'verde';

  const Icon = rossa ? AlertTriangle : verde ? ShieldCheck : EyeOff;
  const accento = rossa
    ? 'hsl(var(--pain))'
    : verde
      ? 'hsl(var(--success))'
      : 'hsl(var(--compliance))';

  return (
    <div
      className="rounded-xl border p-3.5 flex flex-col gap-3"
      style={{ background: `${accento.replace(')', ' / 0.05)')}`, borderColor: `${accento.replace(')', ' / 0.4)')}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0" style={{ color: accento }} />
          <h3 className="font-display text-xs font-bold" style={{ color: accento }}>
            {flags.title}
          </h3>
        </div>
        {flags.flags.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground shrink-0">
            {flags.declared.length} D · {flags.measured.length} M
          </span>
        )}
      </div>

      {flags.flags.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {flags.flags.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-px inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold"
                style={
                  f.source === 'D'
                    ? { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }
                    : { background: 'hsl(var(--pain))', color: 'hsl(var(--destructive-foreground))' }
                }
              >
                {f.source}
              </span>
              <span className="text-xs leading-snug">
                {f.label}
                {f.detail && (
                  <span className="text-muted-foreground"> — «{f.detail}»</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Metà del quadro mancante: si dice, non si lascia dedurre da una banda verde. */}
      {flags.halfMissing && (
        <p
          className="flex items-start gap-1.5 rounded-lg border p-2 text-[10px] leading-snug"
          style={{
            background: 'hsl(var(--compliance) / 0.09)',
            borderColor: 'hsl(var(--compliance) / 0.4)',
            color: 'hsl(var(--compliance-foreground))',
          }}
        >
          <EyeOff className="w-3 h-3 mt-px shrink-0" />
          <span>
            {!flags.declaredKnown
              ? 'Metà del quadro manca. Senza questionario non so se dichiara dolore, farmaci o patologie: le bandiere D sono zero perché non gliele ho mai chieste, non perché non ci sono.'
              : 'Nessun test ancora somministrato: le bandiere M sono zero perché non ho misurato niente, non perché sia tutto a posto.'}
          </span>
        </p>
      )}

      <p className="text-[10px] leading-snug text-muted-foreground">
        <strong className="font-semibold">D</strong> dichiarata dal cliente ·{' '}
        <strong className="font-semibold">M</strong> misurata in valutazione.
        Un clearing non somministrato non è una bandiera e non compare qui.
      </p>
    </div>
  );
}
