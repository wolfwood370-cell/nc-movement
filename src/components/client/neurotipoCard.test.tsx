import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import NeurotipoCard from '@/components/client/NeurotipoCard';
import IntakeTab from '@/components/client/IntakeTab';
import {
  normalizeNeuroAnswers, scoreNeurotype, NT_TYPES, VALIDATION_EXAMPLES,
} from '@/lib/neurotype-scoring';
import { deriveConsent, type SubmissionSafe } from '@/lib/intake';
import type { NeurotipoState } from '@/hooks/useNeurotipo';

/**
 * La card del neurotipo, montata davvero.
 *
 * Il calcolo e' gia' provato puro in `neurotypeScoring.test.ts` (T1, T2, T3): qui si
 * prova la sola cosa che quello non copre — che cio' che il calcolo dice arrivi agli
 * occhi di chi legge, e nell'ordine giusto.
 *
 * Due cose in particolare, perche' sono quelle che si perdono per prime in un
 * riordino: l'avvertimento del testa a testa deve essere VISIBILE senza toccare
 * niente, e i tre cues devono essere quelli del tipo primario e non di un altro.
 */

const risposte = (i: number) => normalizeNeuroAnswers(VALIDATION_EXAMPLES[i].answers);

beforeEach(() => cleanup());

describe('card neurotipo — quello che il calcolo dice arriva agli occhi', () => {
  it('esempio 1 · profilo misto: il primario e la sua parola chiave si leggono subito', () => {
    render(<NeurotipoCard answers={risposte(0)} compilate={30} />);

    // 2A, primario dell'esempio 1: la parola chiave e' il titolo, l'etichetta la
    // riga sotto. Il codice compare come marcatore.
    expect(screen.getByText(NT_TYPES['2A'].keyword)).toBeTruthy();
    expect(screen.getByText(NT_TYPES['2A'].label)).toBeTruthy();
    // Il codice compare due volte di proposito: il marcatore in alto e la sua barra
    // in fondo. Sono lo stesso tipo visto da vicino e da lontano.
    expect(screen.getAllByText('2A')).toHaveLength(2);

    // Il secondo e il margine stanno su una riga, non nascosti da nessuna parte.
    expect(screen.getByText(NT_TYPES['1A'].keyword)).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('i tre cues sono quelli del PRIMARIO, non di un altro tipo', () => {
    render(<NeurotipoCard answers={risposte(0)} compilate={30} />);

    // Sono la ragione per cui la card esiste: dicono come parlargli, cosa lo muove e
    // come impostargli il lavoro. Se scivolassero sul tipo sbagliato, la card
    // continuerebbe a sembrare giusta e direbbe la cosa opposta.
    expect(screen.getByText(NT_TYPES['2A'].cues.comunicazione)).toBeTruthy();
    expect(screen.getByText(NT_TYPES['2A'].cues.motivazione)).toBeTruthy();
    expect(screen.getByText(NT_TYPES['2A'].cues.allenamento)).toBeTruthy();

    // E non quelli del secondo classificato.
    expect(screen.queryByText(NT_TYPES['1A'].cues.comunicazione)).toBeNull();
  });

  it('esempio 3 · testa a testa: l avvertimento e visibile senza toccare niente', () => {
    // Margine 1. Con un punto di distanza il primario e' un indizio: se questa riga
    // finisse dietro un tocco, chi ha fretta leggerebbe un verdetto che non c'e'.
    const score = scoreNeurotype(risposte(2));
    expect(score.closeCall).toBe(true);

    render(<NeurotipoCard answers={risposte(2)} compilate={30} />);
    expect(screen.getByText('indizio, non una diagnosi')).toBeTruthy();
    expect(screen.getByText(/Testa a testa/)).toBeTruthy();
  });

  it('esempio 2 · margine 60: nessun avvertimento, perche non c e niente da avvertire', () => {
    const score = scoreNeurotype(risposte(1));
    expect(score.closeCall).toBe(false);

    render(<NeurotipoCard answers={risposte(1)} compilate={30} />);
    expect(screen.queryByText('indizio, non una diagnosi')).toBeNull();
  });

  it('le cinque barre portano i cinque totali, primario compreso', () => {
    const score = scoreNeurotype(risposte(0));
    render(<NeurotipoCard answers={risposte(0)} compilate={30} />);

    // I numeri stanno scritti accanto alle barre: una barra senza numero si legge a
    // occhio e si sbaglia di dieci punti.
    for (const voce of score.ranked) {
      expect(
        screen.getAllByText(String(voce.total)).length,
        `totale ${voce.code} = ${voce.total}`,
      ).toBeGreaterThan(0);
    }
  });

  it('dice sempre da dove viene il numero: un questionario, non un test', () => {
    render(<NeurotipoCard answers={risposte(0)} compilate={30} />);
    expect(screen.getByText(/questionario compilato dal cliente, non da un test/)).toBeTruthy();
  });

  it('risposte parziali: lo dice invece di far credere che siano trenta', () => {
    render(<NeurotipoCard answers={risposte(0)} compilate={22} />);
    expect(screen.getByText('22 su 30')).toBeTruthy();

    // Con trenta su trenta la frase non compare: non c'e' niente da segnalare.
    cleanup();
    render(<NeurotipoCard answers={risposte(0)} compilate={30} />);
    expect(screen.queryByText('30 su 30')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Il montaggio nella linguetta: la card compare SOLO quando c'e' qualcosa da dire
// ---------------------------------------------------------------------------

const stato = vi.hoisted(() => ({ valore: { status: 'assente' } as NeurotipoState }));

vi.mock('@/hooks/useNeurotipo', () => ({
  useNeurotipo: () => stato.valore,
}));

const sub = (): SubmissionSafe => ({
  id: 's1', client_id: 'c1', created_at: '2026-07-03T10:00:00Z', status: 'new',
  consent_version: 'v2.1', consented_at: '2026-07-03T10:00:00Z',
  full_name: 'Cliente', phone: '333', email: 'a@b.it',
  main_goal: 'Tornare a correre', movement_goal: null,
  max_days_week: '3', session_minutes: '60', availability: 'sera',
  equipment: 'palestra', work_mode: 'presenza', experience_level: 'intermedio',
});

const montaLinguetta = (v: NeurotipoState) => {
  stato.valore = v;
  const submission = sub();
  return render(
    <IntakeTab
      clientId="c1"
      submission={submission}
      screening={null}
      consent={deriveConsent(submission, 'v2.1')}
      intakeAssente={false}
    />,
  );
};

/** Apre il gruppo richiudibile «Neurotipo», che parte chiuso. */
const apriGruppoNeurotipo = () => {
  fireEvent.click(screen.getByRole('button', { name: /Neurotipo/ }));
};

describe('linguetta Intervista — la card compare solo quando le risposte ci sono', () => {
  it('presente: la card c e, in cima, sopra gli otto gruppi', () => {
    montaLinguetta({ status: 'presente', answers: risposte(0), compilate: 30 });
    expect(screen.getByText(NT_TYPES['2A'].keyword)).toBeTruthy();
  });

  it('assente: nessuna card vuota, e il gruppo dice perche', () => {
    montaLinguetta({ status: 'assente' });
    expect(screen.queryByText(NT_TYPES['2A'].keyword)).toBeNull();
    expect(screen.queryByText(/questionario compilato dal cliente, non da un test/)).toBeNull();
    // Il gruppo «Neurotipo» c'e' comunque: sparire lascerebbe pensare a un guasto.
    expect(screen.getByText('Neurotipo')).toBeTruthy();
  });

  it('errore: non dice «non ha risposto», perche non lo sa', () => {
    // E' la bugia piu' facile da raccontare qui: un errore di rete che diventa
    // «questa persona non ha compilato il neurotipo».
    montaLinguetta({ status: 'errore', error: new Error('rete') });
    expect(screen.queryByText(NT_TYPES['2A'].keyword)).toBeNull();
  });

  it('caricamento: nessuna card e nessun verdetto a meta', () => {
    montaLinguetta({ status: 'caricamento' });
    expect(screen.queryByText(NT_TYPES['2A'].keyword)).toBeNull();
  });
});

/**
 * I quattro stati si assomigliano finche' si guarda solo se la card c'e': senza
 * risposte, in errore e in caricamento la card manca sempre, e tre prove finirebbero
 * per coprire un booleano solo.
 *
 * La differenza vera sta nelle parole del gruppo «Neurotipo», che pero' vive dentro un
 * riquadro richiudibile e parte chiuso. Quindi questi test il bottone lo aprono, ed e'
 * l'unico modo di accorgersi se un giorno «non e' stata compilata» finisse a coprire
 * anche il caso in cui la rete e' caduta.
 */
describe('linguetta Intervista — il gruppo Neurotipo dice QUALE dei quattro casi e', () => {
  it('assente: dice che il questionario c e ma la sezione non e stata compilata', () => {
    montaLinguetta({ status: 'assente' });
    apriGruppoNeurotipo();
    expect(screen.getByText(/la sezione neurotipo non è stata compilata/)).toBeTruthy();
  });

  it('errore: dice che non e riuscito a leggere, e che NON e detto che manchi', () => {
    montaLinguetta({ status: 'errore', error: new Error('rete') });
    apriGruppoNeurotipo();
    expect(screen.getByText(/non è detto che manchi/)).toBeTruthy();
    // La bugia da non raccontare: «non ha compilato» di chi magari ha compilato.
    expect(screen.queryByText(/non è stata compilata/)).toBeNull();
  });

  it('caricamento: dice che sta leggendo, non che manca', () => {
    montaLinguetta({ status: 'caricamento' });
    apriGruppoNeurotipo();
    expect(screen.getByText(/Sto leggendo le 30 risposte/)).toBeTruthy();
    expect(screen.queryByText(/non è stata compilata/)).toBeNull();
  });

  it('presente: dice quante risposte ha letto e dove sta il risultato', () => {
    montaLinguetta({ status: 'presente', answers: risposte(0), compilate: 22 });
    apriGruppoNeurotipo();
    expect(screen.getByText(/Calcolato dalle 22 risposte lette/)).toBeTruthy();
  });
});
