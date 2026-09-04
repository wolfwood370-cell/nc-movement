import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VOCI_PRINCIPALI, VOCI_SCRIVANIA, voceAttiva, type Voce } from '@/lib/navigazione';

/**
 * La barra laterale della cornice da scrivania.
 *
 *   >= 1024px   240px: icona ed etichetta accanto, un gruppo "Scrivania" sotto una
 *               riga di separazione.
 *   700–1023px  rail da 72px, solo icone su bersagli da 44px: l'etichetta resta nel
 *               nome accessibile (aria-label) e nel title, il titolo del gruppo resta
 *               per gli screen reader (sr-only).
 *
 * Una sola voce attiva, marcata dal fondo --sidebar-accent e dal testo
 * --sidebar-accent-foreground: nessuna barretta, nessun grassetto in piu'. Tutti i
 * colori dai token --sidebar-* di index.css, finora mai usati.
 *
 * Le voci NON sono scritte qui: vengono da lib/navigazione.ts, lo stesso elenco che
 * legge la barra in basso del telefono.
 */
export default function BarraLaterale({ rail }: { rail: boolean }) {
  const { pathname } = useLocation();

  const gruppo = cn('flex flex-col', rail ? 'items-center gap-1.5' : 'gap-0.5');

  return (
    <nav
      aria-label="Barra laterale"
      className={cn(
        'shrink-0 overflow-y-auto bg-sidebar border-r border-sidebar-border flex flex-col',
        rail ? 'w-[72px] py-3.5 items-center' : 'w-[240px] px-3 py-4',
      )}
    >
      <div role="group" aria-label="Principale" className={gruppo}>
        {VOCI_PRINCIPALI.map((voce) => (
          <VoceLink key={voce.to} voce={voce} attiva={voceAttiva(pathname, voce)} rail={rail} />
        ))}
      </div>

      <div role="separator" className={cn('h-px bg-sidebar-border my-3.5', rail ? 'w-9' : 'mx-3')} />

      <div role="group" aria-labelledby="barra-laterale-scrivania" className={gruppo}>
        <div
          id="barra-laterale-scrivania"
          className={rail
            ? 'sr-only'
            : 'font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-sidebar-foreground px-3 pb-2'}
        >
          Scrivania
        </div>
        {VOCI_SCRIVANIA.map((voce) => (
          <VoceLink key={voce.to} voce={voce} attiva={voceAttiva(pathname, voce)} rail={rail} />
        ))}
      </div>
    </nav>
  );
}

function VoceLink({ voce, attiva, rail }: { voce: Voce; attiva: boolean; rail: boolean }) {
  const Icona = voce.icon;
  return (
    <Link
      to={voce.to}
      aria-current={attiva ? 'page' : undefined}
      aria-label={rail ? voce.label : undefined}
      title={rail ? voce.label : undefined}
      className={cn(
        'rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        rail
          ? 'w-11 h-11 grid place-items-center'
          : 'h-10 px-3 flex items-center gap-2.5 text-[13px] font-medium',
        attiva
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-muted/70 hover:text-foreground',
      )}
    >
      <Icona className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
      {!rail && voce.label}
    </Link>
  );
}
