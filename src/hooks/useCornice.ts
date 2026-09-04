import { useSyncExternalStore } from 'react';

/**
 * Quale cornice disegnare, decisa dalla larghezza della finestra.
 *
 *   telefono   < 700px      PhoneShell e barra in basso, identico a prima.
 *   tablet     700–1023px   intestazione, rail da 72px a sole icone.
 *   scrivania  >= 1024px    intestazione, barra laterale da 240px.
 *
 * Perche' non lampeggia: `useSyncExternalStore` legge `matchMedia` DURANTE il primo
 * render, in modo sincrono, e quel primo render e' l'unico — l'app monta con
 * `createRoot().render`, non idrata HTML del server. Non esiste quindi un render
 * "di default" seguito da uno "giusto": il primo commit ha gia' la cornice corretta.
 *
 * E' anche il motivo per cui `hooks/use-mobile.tsx` (che il progetto ha e nessuno
 * fuori da ui/sidebar.tsx usa) qui NON va bene: parte da `undefined`, legge la
 * larghezza in un `useEffect`, e quindi fa esattamente il lampo che vogliamo evitare —
 * un primo render "non mobile" e un secondo, dopo il commit, con il valore vero.
 * Oltre a questo, la sua soglia e' 768 e qui ne servono due (700 e 1024).
 *
 * Il terzo argomento (snapshot per il server) e' omesso di proposito: se un giorno
 * l'app venisse idratata, React lo segnalerebbe con un errore invece di scivolare
 * in un lampo silenzioso.
 */
export type Cornice = 'telefono' | 'tablet' | 'scrivania';

export const SOGLIA_SCRIVANIA = 1024;
export const SOGLIA_TABLET = 700;

const QUERY_SCRIVANIA = `(min-width: ${SOGLIA_SCRIVANIA}px)`;
const QUERY_TABLET = `(min-width: ${SOGLIA_TABLET}px)`;

function leggiCornice(): Cornice {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'telefono';
  if (window.matchMedia(QUERY_SCRIVANIA).matches) return 'scrivania';
  if (window.matchMedia(QUERY_TABLET).matches) return 'tablet';
  return 'telefono';
}

function iscriviti(avvisa: () => void): () => void {
  const liste = [window.matchMedia(QUERY_SCRIVANIA), window.matchMedia(QUERY_TABLET)];
  liste.forEach((l) => l.addEventListener('change', avvisa));
  return () => liste.forEach((l) => l.removeEventListener('change', avvisa));
}

export function useCornice(): Cornice {
  return useSyncExternalStore(iscriviti, leggiCornice);
}
