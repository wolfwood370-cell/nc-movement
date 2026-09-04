import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Link2, RefreshCw, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GIORNI_VALIDITA, useInvitoIntake } from '@/hooks/useInvitoIntake';

/**
 * Il link personale da mandare al cliente perché compili il questionario.
 *
 * Tre stati, e non uno di più: nessun link, link vivo, link scaduto. Ogni stato ha
 * una sola cosa ovvia da fare, perché questo link finisce in una chat con una persona
 * vera e un errore qui non è invisibile.
 *
 * Due regole che valgono più del disegno:
 *
 * 1. **Rigenerare uccide il link precedente** — lo fa il database, non io. Quindi la
 *    frase che lo dice compare PRIMA di agire, e serve un secondo tocco diverso per
 *    procedere. Nessuna finestra di sistema — né quella di conferma né quella di
 *    avviso: bloccano la pagina, escono da un telaio che non somiglia all'app e
 *    vengono chiuse senza leggerle. La conferma sta in pagina, dove si legge.
 *
 * 2. **La copia può fallire** — `navigator.clipboard` non esiste fuori dai contesti
 *    sicuri e può essere negato dall'utente. Quando fallisce il campo di testo resta
 *    lì, selezionato, e la riga sotto lo dice. Non esiste un vicolo cieco in cui il
 *    link c'è ma non si può portare via.
 */

const scadenzaInChiaro = (iso: string | null, ora: Date): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // L'anno si scrive solo se non è questo: «scade il 4 ottobre» si legge, «scade il
  // 4 ottobre 2026» quando siamo nel 2026 è rumore.
  const opzioni: Intl.DateTimeFormatOptions = d.getFullYear() === ora.getFullYear()
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('it-IT', opzioni);
};

const BOTTONE_PRIMARIO =
  'w-full min-h-[44px] rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground ' +
  'transition-opacity active:opacity-[0.55] disabled:opacity-50';

const BOTTONE_SECONDARIO =
  'flex-1 min-h-[44px] rounded-xl border border-border bg-muted/30 px-3 text-xs font-semibold ' +
  'transition-opacity active:opacity-[0.55] disabled:opacity-50';

export default function InvitoIntakeCard({ clientId }: { clientId: string }) {
  const invito = useInvitoIntake(clientId);
  const campo = useRef<HTMLInputElement>(null);
  const [copia, setCopia] = useState<'ferma' | 'fatta' | 'fallita'>('ferma');
  const [conferma, setConferma] = useState<null | 'rigenera' | 'annulla'>(null);

  // Il link è cambiato: l'esito della copia di prima non parla più di questo link.
  useEffect(() => { setCopia('ferma'); setConferma(null); }, [invito.link]);

  const copiaLink = async () => {
    const link = invito.link;
    if (!link) return;
    try {
      const appunti = navigator.clipboard;
      if (!appunti?.writeText) throw new Error('appunti non disponibili');
      await appunti.writeText(link);
      setCopia('fatta');
    } catch {
      // Nessun vicolo cieco: si seleziona il campo, così basta il gesto di copia del
      // sistema. La riga sotto spiega che tocca a lui.
      setCopia('fallita');
      campo.current?.focus();
      campo.current?.select();
    }
  };

  if (invito.caricamento) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-xs text-muted-foreground">Controllo se esiste già un link…</p>
      </div>
    );
  }

  if (invito.errore) {
    return (
      <div
        className="flex items-start gap-2 rounded-xl border p-3.5"
        style={{
          background: 'hsl(var(--compliance) / 0.09)',
          borderColor: 'hsl(var(--compliance) / 0.4)',
        }}
      >
        <AlertTriangle className="mt-px w-4 h-4 shrink-0" style={{ color: 'hsl(var(--compliance-foreground))' }} />
        <div className="min-w-0">
          <p className="text-xs font-semibold">Non riesco a leggere lo stato del link.</p>
          {/* Non dico «nessun link»: non lo so. Un generato per sbaglio ne ucciderebbe uno vivo. */}
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground break-words">
            {invito.errore.message}
          </p>
        </div>
      </div>
    );
  }

  const scade = scadenzaInChiaro(invito.scadeIl, new Date());
  const vivo = invito.stato === 'vivo' && !!invito.link;

  return (
    <div className="surface-card p-3.5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 shrink-0 text-muted-foreground" />
        <h3 className="font-display text-sm font-semibold">Link al questionario</h3>
      </div>

      {invito.stato === 'scaduto' && (
        <p
          className="flex items-start gap-1.5 rounded-lg border p-2 text-[11px] leading-snug"
          style={{
            background: 'hsl(var(--compliance) / 0.09)',
            borderColor: 'hsl(var(--compliance) / 0.4)',
            color: 'hsl(var(--compliance-foreground))',
          }}
        >
          <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
          <span>
            Il link precedente è scaduto{scade ? ` il ${scade}` : ''} e non funziona più.
            Per invitare questo cliente ne serve uno nuovo.
          </span>
        </p>
      )}

      {vivo ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`link-intake-${clientId}`} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Link personale di questo cliente
            </label>
            {/* Sola lettura ma selezionabile: è la via d'uscita se gli appunti non vanno. */}
            <input
              id={`link-intake-${clientId}`}
              ref={campo}
              readOnly
              value={invito.link ?? ''}
              onFocus={e => e.currentTarget.select()}
              className="w-full rounded-lg border border-border bg-muted/40 px-2.5 py-2 font-mono text-[11px] leading-snug"
            />
            {scade && (
              <p className="text-[11px] text-muted-foreground">
                Scade il {scade}.
              </p>
            )}
          </div>

          <button type="button" onClick={copiaLink} className={cn(BOTTONE_PRIMARIO, 'inline-flex items-center justify-center gap-2')}>
            {copia === 'fatta' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copia === 'fatta' ? 'Link copiato' : 'Copia link'}
          </button>

          {copia === 'fatta' && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              È negli appunti: incollalo nella chat col cliente.
            </p>
          )}
          {copia === 'fallita' && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Non sono riuscito a copiarlo: il browser non me lo permette. Il campo qui
              sopra è già selezionato — copialo a mano, il link è quello giusto.
            </p>
          )}

          {conferma === null && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={invito.inCorso}
                onClick={() => setConferma('rigenera')}
                className={cn(BOTTONE_SECONDARIO, 'inline-flex items-center justify-center gap-1.5')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Rigenera
              </button>
              <button
                type="button"
                disabled={invito.inCorso}
                onClick={() => setConferma('annulla')}
                className={cn(BOTTONE_SECONDARIO, 'inline-flex items-center justify-center gap-1.5')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Annulla
              </button>
            </div>
          )}

          {/* La frase PRIMA del gesto, in pagina, non in una finestra che blocca. */}
          {conferma !== null && (
            <div
              className="flex flex-col gap-2 rounded-lg border p-2.5"
              style={{
                background: 'hsl(var(--compliance) / 0.09)',
                borderColor: 'hsl(var(--compliance) / 0.4)',
              }}
            >
              <p className="text-[11px] leading-snug" style={{ color: 'hsl(var(--compliance-foreground))' }}>
                {conferma === 'rigenera'
                  ? 'Il link qui sopra smetterà di funzionare all’istante. Se il cliente lo ha già ricevuto, dovrai mandargli quello nuovo.'
                  : 'Il link qui sopra smetterà di funzionare all’istante e non ne resterà nessuno: il cliente non potrà più compilare finché non ne generi un altro.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={invito.inCorso}
                  onClick={() => {
                    if (conferma === 'rigenera') invito.genera();
                    else invito.annulla();
                    setConferma(null);
                  }}
                  className={cn(BOTTONE_SECONDARIO, 'border-transparent bg-primary text-primary-foreground')}
                >
                  {invito.inCorso
                    ? 'Un attimo…'
                    : conferma === 'rigenera' ? 'Sì, rigenera' : 'Sì, annulla il link'}
                </button>
                <button
                  type="button"
                  disabled={invito.inCorso}
                  onClick={() => setConferma(null)}
                  className={BOTTONE_SECONDARIO}
                >
                  Lascia stare
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Genera un link personale e mandalo tu al cliente — in chat, per email, come
            preferisci. Vale {GIORNI_VALIDITA} giorni e apre il questionario già intestato a lui.
          </p>
          <button
            type="button"
            disabled={invito.inCorso}
            onClick={invito.genera}
            className={cn(BOTTONE_PRIMARIO, 'inline-flex items-center justify-center gap-2')}
          >
            <Send className="w-4 h-4" />
            {invito.inCorso ? 'Genero…' : 'Genera link questionario'}
          </button>
        </>
      )}

      {invito.erroreAzione && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug" style={{ color: 'hsl(var(--pain))' }}>
          <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
          <span className="break-words">{invito.erroreAzione}</span>
        </p>
      )}
    </div>
  );
}
