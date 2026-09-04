import { ReactNode } from 'react';
import AppHeader from '@/components/AppHeader';
import BarraInBasso from '@/components/BarraInBasso';
import BarraLaterale from '@/components/BarraLaterale';
import { useCornice } from '@/hooks/useCornice';

/**
 * Le cornici dell'app, una per fascia di larghezza. La decisione sta in useCornice:
 *
 *   < 700px     telefono: telaio di PhoneShell, intestazione, contenuto, barra in basso.
 *               Stesse classi di prima, elemento per elemento.
 *   700–1023px  tablet: intestazione, rail da 72px a sole icone, contenuto nel resto.
 *   >= 1024px   scrivania: intestazione, barra laterale da 240px, contenuto in una
 *               colonna da 1040px (32px di margine per lato, 976 utili) centrata.
 *
 * UN SOLO ALBERO per tutte e tre: gli stessi elementi nelle stesse posizioni, cambiano
 * solo le classi, e le due barre stanno in due slot condizionali che restano `false`
 * quando non servono. Cosi' React aggiorna invece di rimontare, e un telefono che ruota
 * (390 -> 844px, cioe' da telefono a tablet) non perde lo stato della pagina — un test
 * a meta' resta a meta'. Con due alberi diversi (PhoneShell da una parte, un div
 * dall'altra) la pagina ripartiva da zero a ogni attraversamento dei 700px.
 *
 * Le due barre non stanno mai insieme nel DOM, e il contenuto e' montato una volta sola.
 *
 * Il telaio del telefono e' quello di PhoneShell.tsx, copiato classe per classe perche'
 * quel componente avvolge tutto e non puo' cambiare forma con la larghezza. PhoneShell
 * resta intatto e continua a servire il wizard FMS (FmsSetup, FmsWizardPage), che non
 * passa di qui: stretto e senza navigazione anche sulla scrivania, per decisione presa.
 * `cornice.test.tsx` confronta le due copie: se PhoneShell cambia, quel test va rosso.
 */
const TELAIO_TELEFONO = {
  esterno: 'min-h-screen w-full bg-background sm:bg-desk sm:grid sm:place-items-center sm:p-6',
  interno: 'w-full h-[100dvh] bg-background overflow-hidden flex flex-col sm:h-[844px] sm:w-[390px] sm:rounded-phone sm:border sm:border-border sm:shadow-phone',
};

const TELAIO_SCRIVANIA = {
  esterno: 'min-h-screen w-full bg-background',
  interno: 'w-full h-[100dvh] bg-background overflow-hidden flex flex-col',
};

export default function AppShell({ children }: { children: ReactNode }) {
  const cornice = useCornice();
  const telefono = cornice === 'telefono';
  const scrivania = cornice === 'scrivania';
  const telaio = telefono ? TELAIO_TELEFONO : TELAIO_SCRIVANIA;

  return (
    <div className={telaio.esterno}>
      <div className={telaio.interno}>
        <AppHeader />

        <div className="flex-1 min-h-0 flex">
          {!telefono && <BarraLaterale rail={!scrivania} />}

          {/* Il main resta il contenitore che scorre in tutte le cornici: le pagine che
              usano `sticky` dentro il main si comportano uguale. Sulla scrivania la barra
              di scorrimento resta visibile di proposito. Il `pb-24` c'e' anche sulla
              scrivania perche' tre pagine (SFMA, YBT, FCS) hanno una barra `fixed` in
              basso che copre gli ultimi 80-90px: senza quel margine il fondo del
              contenuto resterebbe irraggiungibile. */}
          <main
            className={telefono
              ? 'flex-1 overflow-y-auto px-4 pt-4 pb-24 animate-fade-in scrollbar-none'
              : 'flex-1 min-w-0 overflow-y-auto animate-fade-in'}
          >
            <div
              className={telefono
                ? undefined
                : scrivania
                  ? 'mx-auto w-full max-w-[1040px] px-8 pt-6 pb-24'
                  : 'px-5 pt-4 pb-24'}
            >
              {children}
            </div>
          </main>
        </div>

        {telefono && <BarraInBasso />}
      </div>
    </div>
  );
}
