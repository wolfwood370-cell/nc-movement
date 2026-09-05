import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PhoneShell from '@/components/PhoneShell';
import BarraInBasso from '@/components/BarraInBasso';
import BarraLaterale from '@/components/BarraLaterale';
import { useCornice, type Cornice } from '@/hooks/useCornice';
import { VOCI_PRINCIPALI, VOCI_SCRIVANIA } from '@/lib/navigazione';

/**
 * T2 e T3 — le due cornici, montate davvero.
 *
 * jsdom non impagina e non applica le media query: la larghezza della finestra si
 * simula sostituendo `window.matchMedia` con una funzione che risponde alle query
 * `(min-width: Npx)` confrontando N con la larghezza scelta. E' lo stesso oggetto
 * che `useCornice` legge in produzione, quindi cio' che si prova qui e' la decisione
 * vera, non una sua copia.
 *
 * Il mock e' fedele anche nel ridimensionamento: come nel browser, una MediaQueryList
 * emette `change` SOLO quando il proprio `matches` cambia. Cosi' un hook iscritto a
 * una sola delle due query non passerebbe il test dei passi a soglia singola.
 */

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signOut: async () => {} }),
}));
vi.mock('@/hooks/useIsStaff', () => ({
  useIsStaff: () => ({ isStaff: false, loading: false }),
}));
// Le due barre avvolte in una spia: servono al test anti-lampo a livello di AppShell,
// che deve poter dire "la barra sbagliata non e' MAI stata resa", nemmeno per un render.
vi.mock('@/components/BarraInBasso', async (importa) => {
  const m = await importa<typeof import('@/components/BarraInBasso')>();
  return { default: vi.fn(m.default) };
});
vi.mock('@/components/BarraLaterale', async (importa) => {
  const m = await importa<typeof import('@/components/BarraLaterale')>();
  return { default: vi.fn(m.default) };
});

type Ascoltatore = () => void;
let larghezza = 0;
const ascoltatori = new Map<string, Set<Ascoltatore>>();
const matchMediaOriginale = window.matchMedia;

const risponde = (query: string, px: number): boolean => {
  const m = /\(min-width:\s*(\d+)px\)/.exec(query);
  return m ? px >= Number(m[1]) : false;
};

/** Fa rispondere matchMedia come una finestra larga `px`. */
function simulaLarghezza(px: number) {
  larghezza = px;
  window.matchMedia = ((query: string) => ({
    get matches() { return risponde(query, larghezza); },
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener(tipo: string, cb: Ascoltatore) {
      if (tipo !== 'change') return;
      if (!ascoltatori.has(query)) ascoltatori.set(query, new Set());
      ascoltatori.get(query)!.add(cb);
    },
    removeEventListener(_tipo: string, cb: Ascoltatore) { ascoltatori.get(query)?.delete(cb); },
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

/** Come una finestra che viene ridimensionata: avvisa SOLO le query il cui `matches` cambia. */
function ridimensiona(px: number) {
  const prima = larghezza;
  larghezza = px;
  act(() => {
    for (const [query, cbs] of ascoltatori) {
      if (risponde(query, prima) !== risponde(query, px)) cbs.forEach((cb) => cb());
    }
  });
}

function monta(pathname: string, figlio: React.ReactNode = <p>contenuto della pagina</p>) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppShell>{figlio}</AppShell>
    </MemoryRouter>,
  );
}

const laterale = () => screen.queryByRole('navigation', { name: 'Barra laterale' });
const inBasso = () => screen.queryByRole('navigation', { name: 'Barra in basso' });

/** I nomi accessibili dei link di una barra, nell'ordine in cui compaiono. */
const nomiDeiLink = (barra: HTMLElement): string[] =>
  within(barra).getAllByRole('link').map((a) => (a.getAttribute('aria-label') ?? a.textContent ?? '').trim());

/** Il nome dell'icona lucide dentro un link (`lucide-users`, `lucide-activity`, ...). */
const iconaDelLink = (a: HTMLElement): string | undefined =>
  a.querySelector('svg')?.getAttribute('class')?.split(/\s+/).find((c) => /^lucide-./.test(c));

const classi = (el: Element | null): string => (el?.className ?? '').split(/\s+/).filter(Boolean).join(' ');

const ETICHETTE_PRINCIPALI = VOCI_PRINCIPALI.map((v) => v.label);
const ETICHETTE_TUTTE = [...VOCI_PRINCIPALI, ...VOCI_SCRIVANIA].map((v) => v.label);

beforeEach(() => {
  cleanup();
  ascoltatori.clear();
  vi.mocked(BarraInBasso).mockClear();
  vi.mocked(BarraLaterale).mockClear();
});
afterEach(() => { window.matchMedia = matchMediaOriginale; });

describe('T2 · le due cornici non stanno mai insieme', () => {
  it('a 1440 c e la barra laterale con le sei voci, e la barra in basso NO', () => {
    simulaLarghezza(1440);
    monta('/clients');

    expect(laterale()).not.toBeNull();
    expect(inBasso()).toBeNull();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(nomiDeiLink(laterale()!)).toEqual(ETICHETTE_TUTTE);
    // Sulla scrivania l'etichetta e' scritta accanto all'icona, non solo nel nome.
    expect(within(laterale()!).getByRole('link', { name: 'Clienti' }).textContent).toBe('Clienti');
    expect(screen.getByText('Scrivania')).toBeTruthy();
  });

  it('a 390 c e la barra in basso con le quattro voci, e la barra laterale NO', () => {
    simulaLarghezza(390);
    monta('/clients');

    expect(inBasso()).not.toBeNull();
    expect(laterale()).toBeNull();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(nomiDeiLink(inBasso()!)).toEqual(ETICHETTE_PRINCIPALI);
    expect(screen.queryByText('Scrivania')).toBeNull();
  });

  it('a 834 c e il rail: la barra laterale con le sei voci a sole icone, e la barra in basso NO', () => {
    simulaLarghezza(834);
    monta('/clients');

    expect(laterale()).not.toBeNull();
    expect(inBasso()).toBeNull();
    expect(nomiDeiLink(laterale()!)).toEqual(ETICHETTE_TUTTE);
    // Sul rail l'etichetta vive solo nel nome accessibile: nessun testo visibile.
    for (const a of within(laterale()!).getAllByRole('link')) expect(a.textContent).toBe('');
  });

  it('le soglie sono 700 e 1024, incluse: 699 telefono, 700 rail, 1023 rail, 1024 barra piena', () => {
    const cornice = (px: number) => {
      cleanup();
      simulaLarghezza(px);
      monta('/');
      if (inBasso()) return 'telefono';
      const clienti = within(laterale()!).getByRole('link', { name: 'Clienti' });
      return clienti.textContent === '' ? 'rail' : 'laterale';
    };
    expect(cornice(699)).toBe('telefono');
    expect(cornice(700)).toBe('rail');
    expect(cornice(1023)).toBe('rail');
    expect(cornice(1024)).toBe('laterale');
  });

  it('in entrambe le cornici il contenuto e montato UNA volta sola', () => {
    simulaLarghezza(1440);
    monta('/');
    expect(screen.getAllByText('contenuto della pagina')).toHaveLength(1);
    cleanup();
    simulaLarghezza(390);
    monta('/');
    expect(screen.getAllByText('contenuto della pagina')).toHaveLength(1);
  });

  it('ridimensionando la finestra la cornice cambia senza ricaricare, una soglia per volta', () => {
    simulaLarghezza(390);
    monta('/clients');
    expect(inBasso()).not.toBeNull();

    // 390 -> 834: cambia solo la query dei 700. Un hook iscritto solo ai 1024 non se ne accorgerebbe.
    ridimensiona(834);
    expect(inBasso()).toBeNull();
    expect(within(laterale()!).getByRole('link', { name: 'Clienti' }).textContent).toBe('');

    // 834 -> 1440: cambia solo la query dei 1024.
    ridimensiona(1440);
    expect(within(laterale()!).getByRole('link', { name: 'Clienti' }).textContent).toBe('Clienti');

    // E a ritroso, una soglia per volta.
    ridimensiona(834);
    expect(within(laterale()!).getByRole('link', { name: 'Clienti' }).textContent).toBe('');
    ridimensiona(390);
    expect(laterale()).toBeNull();
    expect(inBasso()).not.toBeNull();
  });
});

describe('T2 · nessun lampo: la prima cornice e quella giusta', () => {
  /**
   * La sonda registra il valore che `useCornice` restituisce a OGNI render. Se il
   * meccanismo lampeggiasse — un primo render di default e un secondo, dopo il
   * commit, con il valore vero — qui comparirebbero due valori. Ne deve comparire
   * uno, ed e' quello giusto.
   */
  function Sonda({ visti }: { visti: Cornice[] }) {
    visti.push(useCornice());
    return null;
  }

  it('a 1440 il primo e unico render dice scrivania', () => {
    simulaLarghezza(1440);
    const visti: Cornice[] = [];
    render(<Sonda visti={visti} />);
    expect(visti).toEqual(['scrivania']);
  });

  it('a 834 il primo e unico render dice tablet', () => {
    simulaLarghezza(834);
    const visti: Cornice[] = [];
    render(<Sonda visti={visti} />);
    expect(visti).toEqual(['tablet']);
  });

  it('a 390 il primo e unico render dice telefono', () => {
    simulaLarghezza(390);
    const visti: Cornice[] = [];
    render(<Sonda visti={visti} />);
    expect(visti).toEqual(['telefono']);
  });

  /**
   * E a livello di AppShell, non solo dell'hook: la barra sbagliata non deve essere
   * stata RESA nemmeno una volta. `render` sta dentro `act`, che svuota effetti e
   * re-render: se AppShell rendesse prima una cornice di default e poi quella vera,
   * la spia della barra sbagliata avrebbe contato almeno una chiamata.
   */
  it('a 1440 la barra in basso non viene resa nemmeno per un render; a 390 la laterale', () => {
    simulaLarghezza(1440);
    monta('/');
    expect(vi.mocked(BarraInBasso)).not.toHaveBeenCalled();
    expect(vi.mocked(BarraLaterale)).toHaveBeenCalled();

    cleanup();
    vi.mocked(BarraInBasso).mockClear();
    vi.mocked(BarraLaterale).mockClear();

    simulaLarghezza(390);
    monta('/');
    expect(vi.mocked(BarraLaterale)).not.toHaveBeenCalled();
    expect(vi.mocked(BarraInBasso)).toHaveBeenCalled();
  });
});

describe('T2 · un solo albero: il cambio di cornice non rimonta la pagina', () => {
  /**
   * Un telefono che ruota passa da 390 a 844px: da telefono a tablet, attraverso i 700.
   * Se AppShell avesse due alberi diversi, React smonterebbe e rimonterebbe la pagina e
   * un test a meta' ripartirebbe da zero. Qui una pagina con stato locale e un contatore
   * di montaggi attraversa tutte le soglie, avanti e indietro, e deve restare la stessa.
   */
  function PaginaConStato({ montaggi }: { montaggi: { n: number } }) {
    const [passo, setPasso] = useState(0);
    useEffect(() => { montaggi.n += 1; }, [montaggi]);
    return <button onClick={() => setPasso((p) => p + 1)}>passo {passo}</button>;
  }

  it('lo stato della pagina sopravvive a 390 -> 834 -> 1440 -> 834 -> 390, con un solo montaggio', () => {
    const montaggi = { n: 0 };
    simulaLarghezza(390);
    monta('/assessments/sfma/1', <PaginaConStato montaggi={montaggi} />);

    fireEvent.click(screen.getByRole('button', { name: /passo/ }));
    fireEvent.click(screen.getByRole('button', { name: /passo/ }));
    fireEvent.click(screen.getByRole('button', { name: /passo/ }));
    expect(screen.getByRole('button', { name: /passo/ }).textContent).toBe('passo 3');

    for (const px of [834, 1440, 834, 390]) {
      ridimensiona(px);
      expect(screen.getByRole('button', { name: /passo/ }).textContent, `dopo ${px}px`).toBe('passo 3');
    }
    expect(montaggi.n).toBe(1);
    expect(inBasso()).not.toBeNull();
  });
});

describe('T2 · il telaio del telefono e quello di PhoneShell, classe per classe', () => {
  /**
   * AppShell non puo' usare PhoneShell (avvolge tutto e non cambia forma con la
   * larghezza), quindi ne copia le classi. Questo test e' il cordone: se PhoneShell
   * cambia, o la copia diverge, qui e' rosso.
   */
  it('i due div del telaio in AppShell a 390 hanno le stesse classi dei due div di PhoneShell', () => {
    const originale = render(<PhoneShell><span /></PhoneShell>);
    const esternoOriginale = classi(originale.container.firstElementChild);
    const internoOriginale = classi(originale.container.firstElementChild!.firstElementChild);
    cleanup();

    simulaLarghezza(390);
    const { container } = monta('/');
    expect(classi(container.firstElementChild)).toBe(esternoOriginale);
    expect(classi(container.firstElementChild!.firstElementChild)).toBe(internoOriginale);
    expect(esternoOriginale).toContain('sm:place-items-center');
    expect(internoOriginale).toContain('sm:w-[390px]');
  });

  it('sulla scrivania il telaio NON ha le classi del telefono (niente 390px, niente sfondo scrivania attorno)', () => {
    simulaLarghezza(1440);
    const { container } = monta('/');
    expect(classi(container.firstElementChild)).not.toContain('sm:');
    expect(classi(container.firstElementChild!.firstElementChild)).not.toContain('sm:w-[390px]');
  });
});

describe('T3 · una sorgente sola per le voci', () => {
  it('le etichette della barra in basso sono ESATTAMENTE quelle del gruppo principale della barra laterale', () => {
    simulaLarghezza(390);
    monta('/');
    const dalBasso = nomiDeiLink(inBasso()!);
    cleanup();

    simulaLarghezza(1440);
    monta('/');
    const principale = within(laterale()!).getByRole('group', { name: 'Principale' });
    const dalLato = nomiDeiLink(principale);

    expect(dalBasso).toEqual(dalLato);
  });

  it('e le due barre leggono entrambe da lib/navigazione.ts, gruppo per gruppo', () => {
    simulaLarghezza(390);
    monta('/');
    expect(nomiDeiLink(inBasso()!)).toEqual(ETICHETTE_PRINCIPALI);
    cleanup();

    simulaLarghezza(1440);
    monta('/');
    const barra = laterale()!;
    expect(nomiDeiLink(within(barra).getByRole('group', { name: 'Principale' }))).toEqual(ETICHETTE_PRINCIPALI);
    expect(nomiDeiLink(within(barra).getByRole('group', { name: 'Scrivania' })))
      .toEqual(VOCI_SCRIVANIA.map((v) => v.label));
    expect(nomiDeiLink(barra)).toEqual(ETICHETTE_TUTTE);
  });

  it('stessa voce, stessa icona e stesso percorso nelle due barre', () => {
    simulaLarghezza(390);
    monta('/');
    const basso = within(inBasso()!).getAllByRole('link')
      .map((a) => [a.textContent, a.getAttribute('href'), iconaDelLink(a)]);
    cleanup();

    simulaLarghezza(1440);
    monta('/');
    const lato = within(within(laterale()!).getByRole('group', { name: 'Principale' })).getAllByRole('link')
      .map((a) => [a.textContent, a.getAttribute('href'), iconaDelLink(a)]);

    expect(basso).toEqual(lato);
    for (const [, , icona] of basso) expect(icona).toMatch(/^lucide-./);
  });

  it('la voce attiva e una sola, e la decide lo stesso voceAttiva in tutte e tre le cornici', () => {
    for (const px of [390, 834, 1440]) {
      cleanup();
      simulaLarghezza(px);
      monta('/clients/abc-123');
      const attivi = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
      expect(attivi.map((a) => a.getAttribute('aria-label') ?? a.textContent), `a ${px}px`).toEqual(['Clienti']);
    }
  });
});
