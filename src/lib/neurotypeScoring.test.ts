import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  normalizeNeuroAnswers,
  scoreNeurotype,
  NT_ORDER,
  NT_MIN,
  NT_MAX,
  NT_TYPES,
  VALIDATION_EXAMPLES,
} from './neurotype-scoring';

/**
 * Il calcolo del neurotipo non e' nato qui: e' arrivato dal questionario d'ingresso,
 * copiato byte per byte insieme al JSON che lo governa. Questo file esiste per una
 * ragione sola — accorgersi il giorno che qualcuno lo altera.
 *
 * Non e' una preoccupazione teorica. Il primario decide come si parla a una persona e
 * come le si scrive il programma: due punti spostati in una banda cambiano il tipo, e
 * il tipo cambia la seduta. Un errore qui non fa cadere l'app, fa allenare male
 * qualcuno per mesi senza che nessuno se ne accorga.
 *
 * I tre `validation_examples` non li ho inventati io: stavano gia' dentro il JSON,
 * scritti da chi ha portato il modello in codice. Sono il contratto, e T1 li esegue.
 */

// ---------------------------------------------------------------------------
// T1 — i tre esempi di validazione del JSON
// ---------------------------------------------------------------------------

describe('T1 · neurotipo — i tre validation_examples del JSON', () => {
  it('il JSON porta con se i tre esempi: se sparissero, questo file non proverebbe piu niente', () => {
    expect(VALIDATION_EXAMPLES).toHaveLength(3);
  });

  for (const esempio of VALIDATION_EXAMPLES) {
    it(esempio.nome, () => {
      const risposte = normalizeNeuroAnswers(esempio.answers);
      const score = scoreNeurotype(risposte);

      // I cinque totali PRIMA del verdetto: se il verdetto e' giusto per caso mentre
      // i totali sono sbagliati, questo lo vede e il solo controllo sul primario no.
      for (const tipo of NT_ORDER) {
        expect(score.totals[tipo], `totale ${tipo}`).toBe(
          esempio.expected_totals[tipo as keyof typeof esempio.expected_totals],
        );
      }

      expect(score.primary.code, 'primario').toBe(esempio.expected_primary);
      expect(score.secondary.code, 'secondario').toBe(esempio.expected_secondary);
      expect(score.margin, 'margine').toBe(esempio.expected_margin);
    });
  }

  it('ogni totale sta dentro il range dichiarato dal JSON (-10 … 50)', () => {
    for (const esempio of VALIDATION_EXAMPLES) {
      const score = scoreNeurotype(normalizeNeuroAnswers(esempio.answers));
      for (const tipo of NT_ORDER) {
        expect(score.totals[tipo]).toBeGreaterThanOrEqual(NT_MIN);
        expect(score.totals[tipo]).toBeLessThanOrEqual(NT_MAX);
      }
    }
  });

  it('il terzo esempio e testa a testa: margine 1, quindi closeCall', () => {
    // L'esempio si chiama «testa a testa» nella fonte. Se il flag non si accendesse
    // qui, la card mostrerebbe un primario secco su un margine di un punto.
    const score = scoreNeurotype(normalizeNeuroAnswers(VALIDATION_EXAMPLES[2].answers));
    expect(score.margin).toBe(1);
    expect(score.closeCall).toBe(true);
  });

  it('il secondo esempio e netto: margine 60, quindi nessun avvertimento', () => {
    const score = scoreNeurotype(normalizeNeuroAnswers(VALIDATION_EXAMPLES[1].answers));
    expect(score.margin).toBe(60);
    expect(score.closeCall).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Il confine di closeCall — il numero piu' esposto di tutto il file
// ---------------------------------------------------------------------------

describe('neurotipo — la soglia del testa a testa e esattamente 5, non 4 e non 6', () => {
  /**
   * `closeCall = margin <= 5` e' l'unico numero del calcolo che NON viene dalla fonte.
   * Il JSON lo dice a chiare lettere in `scoring.confidence_note`: «la soglia di
   * "margine piccolo" non e' nella fonte, e' giudizio del coach». Un numero senza una
   * fonte alle spalle e' esattamente quello che qualcuno ritocca di un'unita' senza
   * pensarci, e da quel ritocco dipende se la card accende o spegne l'avvertimento
   * «indizio, non una diagnosi».
   *
   * Gli esempi del JSON toccano 0, 1 e 60: il confine resta scoperto. Qui si prova con
   * due margini costruiti a mano, 5 e 6, che stanno uno da una parte e uno dall'altra.
   *
   * Le risposte si costruiscono su q01–q06, che nel JSON sono le sei domande del tipo
   * 1A. Tutte le altre restano vuote, quindi gli altri quattro tipi valgono 0 e il
   * margine coincide col totale di 1A.
   */
  const soloPrimeSei = (valori: Record<string, string>) =>
    scoreNeurotype(normalizeNeuroAnswers(valori));

  it('margine 5: closeCall acceso — il confine appartiene al testa a testa', () => {
    // q04 e' 1A in banda bassa, dove «A» vale 5.
    const score = soloPrimeSei({ q04: 'A' });
    expect(score.primary.code).toBe('1A');
    expect(score.margin).toBe(5);
    expect(score.closeCall).toBe(true);
  });

  it('margine 6: closeCall spento — un punto oltre il confine e gia fuori', () => {
    // q05 «B» = 4 piu' q06 «C» = 2, entrambe 1A in banda bassa.
    const score = soloPrimeSei({ q05: 'B', q06: 'C' });
    expect(score.primary.code).toBe('1A');
    expect(score.margin).toBe(6);
    expect(score.closeCall).toBe(false);
  });

  it('margine 4: acceso, come tutto cio che sta sotto il confine', () => {
    // q05 «B» = 4.
    const score = soloPrimeSei({ q05: 'B' });
    expect(score.margin).toBe(4);
    expect(score.closeCall).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T2 — il tie-break deterministico
// ---------------------------------------------------------------------------

describe('T2 · neurotipo — a parita vince l ordine fisso 1A > 1B > 2A > 2B > 3', () => {
  it('30 risposte tutte «C»: tutti i totali uguali, primario 1A e margine 0', () => {
    // «C» vale 2 punti in tutte e tre le bande: 30 risposte uguali danno cinque
    // totali identici. E' il caso in cui l'ordinamento e' l'unica cosa che decide.
    const score = scoreNeurotype(Array(30).fill('C'));

    expect(score.primary.code).toBe('1A');
    expect(score.secondary.code).toBe('1B');
    expect(score.margin).toBe(0);
    expect(score.closeCall).toBe(true);

    // La classifica intera, non solo i primi due: senza questo, invertire la coda
    // dell'ordine passerebbe inosservato.
    expect(score.ranked.map(r => r.code)).toEqual(['1A', '1B', '2A', '2B', '3']);
  });

  it('a parita totale la classifica e sempre la stessa, non dipende dal caso', () => {
    // Due calcoli sullo stesso input devono dare lo stesso ordine. Un sort instabile
    // o un tie-break casuale renderebbe il primario diverso a ogni apertura della
    // scheda, e nessuno saprebbe quale dei due leggere.
    const a = scoreNeurotype(Array(30).fill('D')); // «D» vale 0 in tutte le bande
    const b = scoreNeurotype(Array(30).fill('D'));
    expect(a.ranked.map(r => r.code)).toEqual(b.ranked.map(r => r.code));
    expect(a.primary.code).toBe('1A');
    expect(a.totals).toEqual({ '1A': 0, '1B': 0, '2A': 0, '2B': 0, '3': 0 });
  });
});

// ---------------------------------------------------------------------------
// T3 — la normalizzazione delle risposte sporche
// ---------------------------------------------------------------------------

describe('T3 · neurotipo — le risposte arrivano sporche e vanno normalizzate', () => {
  it('accetta chiavi q1…q30 oltre a q01…q30', () => {
    const sorgente: Record<string, string> = {};
    for (let n = 1; n <= 30; n++) sorgente[`q${n}`] = 'A';
    expect(normalizeNeuroAnswers(sorgente)).toEqual(Array(30).fill('A'));
  });

  it('accetta lettere minuscole e numeri 1–5 (1=A … 5=E)', () => {
    const sorgente: Record<string, unknown> = {};
    for (let n = 1; n <= 30; n++) {
      sorgente[`q${String(n).padStart(2, '0')}`] = n % 2 ? 'b' : 5;
    }
    const out = normalizeNeuroAnswers(sorgente);
    expect(out[0]).toBe('B');
    expect(out[1]).toBe('E');
    expect(out).toHaveLength(30);
  });

  it('un valore assente diventa stringa vuota e non aggiunge punti', () => {
    // Il punto piu' pericoloso di tutto il file. Una risposta mancante che ricadesse
    // su «A» varrebbe 15 punti in banda alta: bastano due domande vuote per spostare
    // un tipo. Il vuoto deve restare vuoto, e il vuoto deve valere zero.
    const out = normalizeNeuroAnswers({ q01: 'A', q02: null, q03: undefined, q04: '' });
    expect(out[0]).toBe('A');
    expect(out[1]).toBe('');
    expect(out[2]).toBe('');
    expect(out[3]).toBe('');
    expect(out).toHaveLength(30);

    // E la prova che il vuoto costa zero punti: 30 risposte assenti danno tutti zeri.
    expect(scoreNeurotype(normalizeNeuroAnswers({})).totals).toEqual({
      '1A': 0, '1B': 0, '2A': 0, '2B': 0, '3': 0,
    });
  });

  it('un valore fuori scala non diventa una lettera per somiglianza', () => {
    const out = normalizeNeuroAnswers({ q01: 'x', q02: 9, q03: 0, q04: 'AB', q05: true });
    expect(out.slice(0, 5)).toEqual(['', '', '', '', '']);
  });

  it('null e undefined al posto dell intera sorgente non fanno cadere il calcolo', () => {
    // La riga di risposte puo' non esserci affatto: la card non deve esplodere,
    // deve poter decidere di non mostrarsi.
    expect(normalizeNeuroAnswers(null)).toEqual(Array(30).fill(''));
    expect(normalizeNeuroAnswers(undefined)).toHaveLength(30);
  });

  it('gli spazi attorno alla lettera non contano', () => {
    expect(normalizeNeuroAnswers({ q01: '  a  ' })[0]).toBe('A');
  });

  it('una risposta valida in mezzo a trenta vuote muove un solo tipo', () => {
    // q01 e' 1A in banda alta: «A» vale 15. Se muovesse altro, la mappa domanda→tipo
    // non sarebbe quella del JSON.
    const score = scoreNeurotype(normalizeNeuroAnswers({ q01: 'A' }));
    expect(score.totals['1A']).toBe(15);
    expect(score.totals['1B']).toBe(0);
    expect(score.totals['2A']).toBe(0);
    expect(score.totals['2B']).toBe(0);
    expect(score.totals['3']).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Il JSON e' la fonte: il modulo non deve poterlo contraddire
// ---------------------------------------------------------------------------

describe('neurotipo — il JSON copiato e ancora quello del questionario', () => {
  it('le 30 domande ci sono tutte e sono divise 6 per tipo', () => {
    const grezzo = JSON.parse(
      readFileSync(join(process.cwd(), 'src/lib/neurotipo-scoring.json'), 'utf8'),
    ) as { map: Record<string, { type: string; band: string }> };

    const chiavi = Object.keys(grezzo.map);
    expect(chiavi).toHaveLength(30);

    const perTipo: Record<string, number> = {};
    for (const voce of Object.values(grezzo.map)) {
      perTipo[voce.type] = (perTipo[voce.type] ?? 0) + 1;
    }
    expect(perTipo).toEqual({ '1A': 6, '1B': 6, '2A': 6, '2B': 6, '3': 6 });
  });

  it('ogni tipo porta etichetta, parola chiave e i tre cues: sono cio che la card mostra', () => {
    for (const codice of NT_ORDER) {
      const tipo = NT_TYPES[codice];
      expect(tipo.label.length, `etichetta ${codice}`).toBeGreaterThan(0);
      expect(tipo.keyword.length, `parola chiave ${codice}`).toBeGreaterThan(0);
      expect(tipo.cues.comunicazione.length, `comunicazione ${codice}`).toBeGreaterThan(0);
      expect(tipo.cues.motivazione.length, `motivazione ${codice}`).toBeGreaterThan(0);
      expect(tipo.cues.allenamento.length, `allenamento ${codice}`).toBeGreaterThan(0);
    }
  });

  it('il range dichiarato e -10 … 50, e la card ci disegna sopra le barre', () => {
    expect(NT_MIN).toBe(-10);
    expect(NT_MAX).toBe(50);
  });
});
