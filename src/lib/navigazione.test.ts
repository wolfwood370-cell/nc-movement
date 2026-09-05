import { describe, it, expect } from 'vitest';
import { VOCI_PRINCIPALI, VOCI_SCRIVANIA, voceAttiva, type Voce } from '@/lib/navigazione';

/**
 * T1 — la voce attiva, decisa a tavolino.
 *
 * `voceAttiva` e' pura: nessun router, nessun DOM. Qui si prova la decisione in se',
 * su percorsi veri dell'app; che le due barre la usino davvero lo prova
 * `cornice.test.tsx`.
 */

const TUTTE: readonly Voce[] = [...VOCI_PRINCIPALI, ...VOCI_SCRIVANIA];

/** Le etichette accese per un percorso, nell'ordine dell'elenco. */
const accese = (pathname: string): string[] =>
  TUTTE.filter((v) => voceAttiva(pathname, v)).map((v) => v.label);

describe('T1 · voceAttiva — quale voce si accende', () => {
  it('"/" accende Dashboard e nient altro', () => {
    expect(accese('/')).toEqual(['Dashboard']);
  });

  it('"/clients" accende Clienti', () => {
    expect(accese('/clients')).toEqual(['Clienti']);
  });

  it('"/clients/abc-123" accende ancora Clienti, e NON Dashboard', () => {
    const acc = accese('/clients/abc-123');
    expect(acc).toContain('Clienti');
    expect(acc).not.toContain('Dashboard');
    expect(acc).toEqual(['Clienti']);
  });

  it('"/assessments/fms/12" accende Test', () => {
    expect(accese('/assessments/fms/12')).toEqual(['Test']);
  });

  it('"/library" accende Libreria', () => {
    expect(accese('/library')).toEqual(['Libreria']);
  });

  it('"/daily-prep" accende Preparazione', () => {
    expect(accese('/daily-prep')).toEqual(['Preparazione']);
  });

  it('"/team" accende Team', () => {
    expect(accese('/team')).toEqual(['Team']);
  });

  it('un percorso fuori dalle voci non accende niente: "/admin/bugs", "/auth"', () => {
    expect(accese('/admin/bugs')).toEqual([]);
    expect(accese('/auth')).toEqual([]);
  });

  it('il prefisso vale solo a confine di segmento: "/clientsXYZ" non e sotto "/clients"', () => {
    expect(accese('/clientsXYZ')).toEqual([]);
    expect(accese('/clients/')).toEqual(['Clienti']);
  });

  it('senza distinguere le maiuscole, come le rotte e come faceva NavLink: "/Clients/abc-123" accende Clienti', () => {
    // react-router apre la pagina Clienti anche su "/Clients": se la barra non
    // accendesse niente, la pagina giusta avrebbe la voce sbagliata.
    expect(accese('/Clients/abc-123')).toEqual(['Clienti']);
    expect(accese('/CLIENTS')).toEqual(['Clienti']);
    expect(accese('/Daily-Prep')).toEqual(['Preparazione']);
  });

  it('in nessun caso due voci accese insieme', () => {
    const percorsi = [
      '/', '/clients', '/clients/abc-123', '/assessments', '/assessments/fms/12',
      '/assessments/fms/setup', '/assessments/fms/new', '/assessments/ybt/7',
      '/library', '/daily-prep', '/daily-prep?client=1', '/team', '/admin/bugs', '/auth',
      '/reset-password', '/qualcosa/che/non/esiste',
    ];
    for (const p of percorsi) {
      expect(accese(p).length, `percorso ${p}: ${accese(p).join(', ')}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('T1 · l elenco delle voci — forma', () => {
  it('quattro voci principali, due di scrivania, nello stesso ordine di sempre', () => {
    expect(VOCI_PRINCIPALI.map((v) => v.label)).toEqual(['Dashboard', 'Clienti', 'Test', 'Libreria']);
    expect(VOCI_PRINCIPALI.map((v) => v.to)).toEqual(['/', '/clients', '/assessments', '/library']);
    expect(VOCI_SCRIVANIA.map((v) => v.label)).toEqual(['Preparazione', 'Team']);
    expect(VOCI_SCRIVANIA.map((v) => v.to)).toEqual(['/daily-prep', '/team']);
  });

  it('percorsi ed etichette sono tutti distinti, e solo la radice e esatta', () => {
    expect(new Set(TUTTE.map((v) => v.to)).size).toBe(TUTTE.length);
    expect(new Set(TUTTE.map((v) => v.label)).size).toBe(TUTTE.length);
    expect(TUTTE.filter((v) => v.esatta).map((v) => v.to)).toEqual(['/']);
    for (const v of TUTTE) expect(typeof v.icon === 'function' || typeof v.icon === 'object').toBe(true);
  });
});
