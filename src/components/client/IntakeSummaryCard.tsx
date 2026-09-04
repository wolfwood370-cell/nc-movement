import type { IntakeSummary } from '@/lib/intake';

/**
 * Il riassunto dell'intervista: cinque campi fissi e tre condizionali.
 *
 * Un campo vuoto non occupa una riga — sparisce. Per questo il contatore segue i
 * riquadri effettivamente resi e non è un numero fisso: dire «8 campi» quando se ne
 * vedono cinque farebbe cercare al lettore tre riquadri che non ci sono.
 */
export default function IntakeSummaryCard({
  summary, hasIntake,
}: { summary: IntakeSummary; hasIntake: boolean }) {
  if (!hasIntake) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Nessuno degli 8 campi è disponibile. Compaiono appena il modulo viene compilato:
          gli stessi riquadri, nello stesso posto.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card p-3.5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold">Riassunto intervista</h3>
        <span className="text-[10px] text-muted-foreground">
          {summary.fields.length === 1 ? '1 campo' : `${summary.fields.length} campi`}
        </span>
      </div>

      {summary.fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Il questionario è collegato ma nessuno degli otto campi è stato compilato.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {summary.fields.map(f => (
            <div key={f.key} className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {f.label}
              </p>
              <p className="mt-0.5 text-xs leading-snug break-words">{f.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
