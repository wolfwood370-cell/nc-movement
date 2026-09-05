import { Link, useLocation } from 'react-router-dom';
import { VOCI_PRINCIPALI, voceAttiva } from '@/lib/navigazione';

/**
 * La barra in basso del telefono: 66px, quattro voci in griglia. Resta esattamente
 * com'era — stesse classi, stesse icone, stesso ordine. Le voci NON sono scritte qui:
 * vengono da lib/navigazione.ts, lo stesso elenco che legge la barra laterale.
 *
 * Il `grid-cols-4` e' il vincolo del telefono, non un secondo elenco: quattro colonne
 * perche' sotto i 700px ci stanno quattro etichette e basta.
 */
export default function BarraInBasso() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Barra in basso"
      className="h-[66px] shrink-0 border-t border-border bg-card/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 h-full">
        {VOCI_PRINCIPALI.map((voce) => {
          const attiva = voceAttiva(pathname, voce);
          return (
            <Link
              key={voce.to}
              to={voce.to}
              aria-current={attiva ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-[color,opacity] active:opacity-50 ${
                attiva ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <voce.icon className="w-5 h-5" strokeWidth={2.25} />
              {voce.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
