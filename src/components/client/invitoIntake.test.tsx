import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import InvitoIntakeCard from '@/components/client/InvitoIntakeCard';
import type { InvitoIntake } from '@/hooks/useInvitoIntake';

/**
 * I tre stati del link personale, montati davvero.
 *
 * Il link finisce in una chat con una persona vera: un bottone sbagliato qui non e'
 * invisibile. La logica dello stato e' gia' provata pura in `intake.test.ts` (T1);
 * qui si prova la sola cosa che quella non copre — che ogni stato mostri UNA cosa da
 * fare, e che rigenerare dica prima di agire che il link vecchio muore.
 *
 * L'hook e' sostituito perche' parla col database: questo test riguarda la schermata,
 * non la rete.
 */

const stato = vi.hoisted(() => ({ valore: null as InvitoIntake | null }));

vi.mock('@/hooks/useInvitoIntake', () => ({
  GIORNI_VALIDITA: 30,
  useInvitoIntake: () => stato.valore,
}));

const invito = (p: Partial<InvitoIntake> = {}): InvitoIntake => ({
  stato: 'assente',
  token: null,
  scadeIl: null,
  creatoIl: null,
  link: null,
  caricamento: false,
  errore: null,
  inCorso: false,
  erroreAzione: null,
  genera: vi.fn(),
  annulla: vi.fn(),
  ...p,
});

const monta = (v: InvitoIntake) => {
  stato.valore = v;
  return render(<InvitoIntakeCard clientId="c1" />);
};

beforeEach(() => cleanup());

describe('link al questionario — tre stati, una cosa da fare per volta', () => {
  it('assente: un solo bottone, e genera', () => {
    const genera = vi.fn();
    monta(invito({ stato: 'assente', genera }));

    const bottone = screen.getByRole('button', { name: /Genera link questionario/ });
    fireEvent.click(bottone);
    expect(genera).toHaveBeenCalledTimes(1);

    // Nessun campo da copiare: non c'e' niente da copiare.
    expect(screen.queryByRole('button', { name: /Copia link/ })).toBeNull();
  });

  it('scaduto: dice che il precedente non funziona piu, e offre di rifarlo', () => {
    monta(invito({
      stato: 'scaduto',
      token: 't-1',
      scadeIl: '2026-08-04T10:00:00Z',
    }));

    expect(screen.getByText(/non funziona più/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Genera link questionario/ })).toBeTruthy();
    // Un link scaduto non si mostra: consegnarlo sarebbe peggio che non averlo.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('vivo: il link si vede per intero, e selezionabile, e la scadenza e in chiaro', () => {
    const link = 'https://q.example/?t=11111111-2222-3333-4444-555555555555';
    monta(invito({
      stato: 'vivo',
      token: '11111111-2222-3333-4444-555555555555',
      scadeIl: '2026-10-04T10:00:00Z',
      link,
    }));

    const campo = screen.getByRole('textbox') as HTMLInputElement;
    expect(campo.value).toBe(link);
    expect(campo.readOnly).toBe(true);
    // Per esteso, non in cifre: «scade il 4 ottobre» si legge senza decodificare.
    expect(screen.getByText(/Scade il 4 ottobre/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Copia link/ })).toBeTruthy();
  });

  it('rigenera: la frase che il link vecchio muore compare PRIMA di agire', () => {
    const genera = vi.fn();
    monta(invito({
      stato: 'vivo', token: 't-1', link: 'https://q.example/?t=t-1',
      scadeIl: '2026-10-04T10:00:00Z', genera,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Rigenera/ }));

    // Detto, e non ancora fatto.
    expect(screen.getByText(/smetterà di funzionare/)).toBeTruthy();
    expect(genera).not.toHaveBeenCalled();

    // Serve un secondo gesto, diverso dal primo.
    fireEvent.click(screen.getByRole('button', { name: /Sì, rigenera/ }));
    expect(genera).toHaveBeenCalledTimes(1);
  });

  it('rigenera: «Lascia stare» non tocca niente', () => {
    const genera = vi.fn();
    monta(invito({
      stato: 'vivo', token: 't-1', link: 'https://q.example/?t=t-1',
      scadeIl: '2026-10-04T10:00:00Z', genera,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Rigenera/ }));
    fireEvent.click(screen.getByRole('button', { name: /Lascia stare/ }));
    expect(genera).not.toHaveBeenCalled();
    expect(screen.queryByText(/smetterà di funzionare/)).toBeNull();
  });

  it('copia fallita: il campo resta selezionabile e la riga lo dice', async () => {
    const link = 'https://q.example/?t=t-1';
    monta(invito({ stato: 'vivo', token: 't-1', link, scadeIl: '2026-10-04T10:00:00Z' }));

    // jsdom non ha `navigator.clipboard`: e' esattamente il caso da coprire.
    fireEvent.click(screen.getByRole('button', { name: /Copia link/ }));
    expect(await screen.findByText(/copialo a mano/)).toBeTruthy();

    // La via d'uscita c'e' ancora: il link e' ancora tutto li'.
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(link);
  });

  it('errore di lettura: non dice «nessun link», perche non lo sa', () => {
    monta(invito({ errore: new Error('permission denied for table clients') }));

    expect(screen.getByText(/Non riesco a leggere lo stato del link/)).toBeTruthy();
    // Nessun bottone che generi: rigenerare al buio ucciderebbe un link vivo.
    expect(screen.queryByRole('button')).toBeNull();
  });
});
