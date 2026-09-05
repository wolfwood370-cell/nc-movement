import type { LucideIcon } from 'lucide-react';
import { Activity, ClipboardList, LayoutDashboard, Library, Users, Users2 } from 'lucide-react';

/**
 * Le voci di navigazione dell'app: UNA sorgente sola.
 *
 * Le legge la barra in basso del telefono (solo le principali) e la barra laterale
 * della scrivania (principali + scrivania). Due elenchi paralleli divergono, sempre:
 * per questo qui non ce n'e' che uno, e il test `cornice.test.tsx` confronta cio' che
 * le due barre rendono davvero.
 */
export type Voce = {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * true: la voce e' attiva solo se il percorso coincide esattamente. Serve alla
   * radice "/", che altrimenti sarebbe prefisso di qualunque percorso e resterebbe
   * accesa ovunque.
   */
  esatta: boolean;
};

/** Le quattro voci della barra in basso, stesso ordine e stesse icone di sempre. */
export const VOCI_PRINCIPALI: readonly Voce[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, esatta: true },
  { to: '/clients', label: 'Clienti', icon: Users, esatta: false },
  { to: '/assessments', label: 'Test', icon: Activity, esatta: false },
  { to: '/library', label: 'Libreria', icon: Library, esatta: false },
];

/**
 * Le due rotte che esistono gia' ma nella barra in basso non entravano. Nella barra
 * laterale stanno in un secondo gruppo, sotto una riga di separazione.
 */
export const VOCI_SCRIVANIA: readonly Voce[] = [
  { to: '/daily-prep', label: 'Preparazione', icon: ClipboardList, esatta: false },
  { to: '/team', label: 'Team', icon: Users2, esatta: false },
];

/**
 * Decide se una voce e' quella attiva per il percorso corrente. Pura: nessun hook,
 * nessun router, cosi' si prova a tavolino (`navigazione.test.ts`, T1).
 *
 * Una voce non esatta e' attiva sul suo percorso e su tutto cio' che gli sta sotto —
 * "/clients/abc-123" accende Clienti — ma solo a confine di segmento: "/clientsXYZ"
 * non e' sotto "/clients".
 */
export function voceAttiva(pathname: string, voce: Voce): boolean {
  // Senza distinguere le maiuscole, come fanno le rotte di react-router e come faceva
  // NavLink: "/Clients/abc" apre la pagina Clienti, quindi deve accendere Clienti.
  const percorso = pathname.toLowerCase();
  const radice = voce.to.toLowerCase();
  if (voce.esatta) return percorso === radice;
  return percorso === radice || percorso.startsWith(radice + '/');
}
