import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Un testo lungo che non prende tutta la pagina: quattro righe, poi si apre.
 *
 * Il troncamento è `line-clamp-4`, cioè CSS: il testo INTERO resta nel DOM, si può
 * selezionare, cercare col Ctrl+F del telefono e leggere da uno screen reader anche
 * mentre è chiuso. Tagliare la stringa con `slice()` avrebbe dato lo stesso disegno e
 * un dato mutilato — su un'anamnesi, la parte tagliata è esattamente quella che serve.
 *
 * Il bottone è un `<button>` vero, non un `<div>` cliccabile, così arriva col Tab e
 * porta con sé `aria-expanded`. Un'unica implementazione per i due posti che ne hanno
 * bisogno — il riassunto e le bandiere — perché due copie divergono.
 */
export default function TestoLungo({
  testo, className, classeBottone,
}: {
  testo: string;
  /** Le classi del paragrafo: il chiamante decide corpo e colore, non il troncamento. */
  className?: string;
  classeBottone?: string;
}) {
  const [aperto, setAperto] = useState(false);

  return (
    <div className="flex flex-col items-start gap-1">
      <p className={cn('break-words', className, !aperto && 'line-clamp-4')}>
        {testo}
      </p>
      <button
        type="button"
        onClick={() => setAperto(a => !a)}
        aria-expanded={aperto}
        className={cn(
          'rounded text-[10px] font-semibold uppercase tracking-wider text-muted-foreground underline underline-offset-2',
          classeBottone,
        )}
      >
        {aperto ? 'Riduci' : 'Mostra tutto'}
      </button>
    </div>
  );
}
