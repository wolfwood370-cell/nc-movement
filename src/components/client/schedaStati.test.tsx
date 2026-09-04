import { describe, it, expect } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import TwoTracks from '@/components/client/TwoTracks';
import UnifiedFlagsBand from '@/components/client/UnifiedFlagsBand';
import IntakeSummaryCard from '@/components/client/IntakeSummaryCard';
import {
  deriveConsent, deriveWorkMode, buildUnifiedFlags, buildIntakeSummary,
  COLONNE_RISERVATE,
  type HealthSafe, type SubmissionSafe,
} from '@/lib/intake';
import type { ReferralClearingFinding } from '@/lib/medicalReferral';
import type { FmsAssessmentRow } from '@/lib/insights';

/**
 * I quattro stati della scheda, montati davvero.
 *
 * La app in locale richiede un'autenticazione che questi test non hanno; qui i
 * quattro stati si montano con gli stessi dati che il database produce, così la
 * prova è riproducibile e resta nel repo invece di vivere in uno screenshot.
 */

const sub = (p: Partial<SubmissionSafe> = {}): SubmissionSafe => ({
  id: 's1', client_id: 'c1', created_at: '2026-07-03T10:00:00Z', status: 'new',
  consent_version: 'v2.1', consented_at: '2026-07-03T10:00:00Z',
  full_name: 'Cliente', phone: '333', email: 'a@b.it',
  main_goal: 'Tornare a correre', movement_goal: null,
  max_days_week: '3', session_minutes: '60', availability: 'sera',
  equipment: 'palestra', work_mode: 'presenza', experience_level: 'intermedio',
  ...p,
});

const salute = (p: Partial<HealthSafe> = {}): HealthSafe => ({
  submission_id: 's1',
  parq_heart: false, parq_chest_pain: false, parq_balance: false,
  parq_other_chronic: false, parq_meds: false, parq_msk: false, parq_supervised: false,
  conditions_meds: null, pain_now: null, pain_where: null, past_injuries: null,
  ...p,
});

const fms = (tipo: 'full' | 'modified', total: number, when = '2026-08-12'): FmsAssessmentRow =>
  ({ id: 'f1', assessed_at: when, assessment_type: tipo, total_score: total } as unknown as FmsAssessmentRow);

const clr = (...v: Array<[string, ReferralClearingFinding['status']]>): ReferralClearingFinding[] =>
  v.map(([test, status]) => ({ test, status, description: `${test}` }));

function montaScheda(opts: {
  submission: SubmissionSafe | null;
  screening: HealthSafe | null;
  storico: FmsAssessmentRow[];
  clearing: ReferralClearingFinding[] | null;
}) {
  const workMode = deriveWorkMode(opts.submission?.work_mode);
  const flags = buildUnifiedFlags(opts.screening, opts.clearing);
  const summary = buildIntakeSummary(opts.submission, opts.screening);
  return render(
    <>
      <TwoTracks
        submission={opts.submission}
        screening={opts.screening}
        fmsHistory={opts.storico}
        workMode={workMode}
        onOpenIntake={() => {}}
        onOpenHistory={() => {}}
      />
      <UnifiedFlagsBand flags={flags} />
      <IntakeSummaryCard summary={summary} hasIntake={!!opts.submission} />
    </>,
  );
}

describe('scheda unificata — i quattro stati reggono senza cambiare forma', () => {
  it('A · in presenza, intervista e FMS piena: entrambe le tracce piene', () => {
    montaScheda({
      submission: sub(),
      screening: salute({ parq_msk: true, past_injuries: 'spalla sx dal 2024' }),
      storico: [fms('full', 14), fms('full', 16, '2026-05-14')],
      clearing: clr(['Shoulder Clearing', 'positive'], ['Ankle Clearing', 'negative']),
    });
    expect(screen.getByText('Dichiarato')).toBeTruthy();
    expect(screen.getByText('Misurato')).toBeTruthy();
    expect(screen.getByText(/FMS piena/)).toBeTruthy();
    expect(screen.getByText('/21')).toBeTruthy();
    // Bandiere di tutt'e due le provenienze, con i marcatori.
    expect(screen.getByText(/3 bandiere rosse insieme/)).toBeTruthy();
    expect(screen.getByText('2 D · 1 M')).toBeTruthy();
    cleanup();
  });

  it('B · a distanza, nessuna FMS: la colonna Misurato resta e dice perche e vuota', () => {
    montaScheda({
      submission: sub({ work_mode: 'app' }),
      screening: salute(),
      storico: [],
      clearing: null,
    });
    // La colonna non sparisce e non si allarga l'altra.
    expect(screen.getByText('Misurato')).toBeTruthy();
    expect(screen.getByText('Seguita a distanza')).toBeTruthy();
    expect(screen.getByText(/si somministra di persona/)).toBeTruthy();
    // E la banda NON e verde: manca meta del quadro.
    expect(screen.queryByText('Nessuna bandiera rossa')).toBeNull();
    expect(screen.getByText(/non ho misurato niente/)).toBeTruthy();
    cleanup();
  });

  it('C · test senza intervista: la colonna Dichiarato resta e dice perche e vuota', () => {
    montaScheda({
      submission: null,
      screening: null,
      storico: [fms('full', 15)],
      clearing: clr(['Shoulder Clearing', 'negative'], ['Ankle Clearing', 'negative']),
    });
    expect(screen.getByText('Traccia mai aperta')).toBeTruthy();
    expect(screen.getByText(/Anagrafica inserita a mano/)).toBeTruthy();
    // Il punto che il disegno vieta in tre file: mai verde a meta quadro.
    expect(screen.queryByText('Nessuna bandiera rossa')).toBeNull();
    expect(screen.getByText(/non gliele ho mai chieste/)).toBeTruthy();
    // Il riassunto non stampa otto trattini.
    expect(screen.getByText(/Compaiono appena il modulo viene compilato/)).toBeTruthy();
    cleanup();
  });

  it('D · solo FMS modificate: la scala e /9 e il tipo si legge', () => {
    montaScheda({
      submission: sub({ work_mode: 'ibrido' }),
      screening: salute(),
      storico: [fms('modified', 7, '2026-08-30'), fms('modified', 6, '2026-07-01')],
      clearing: clr(
        ['Shoulder Clearing', 'negative'],
        ['Spinal Extension Clearing', 'not-performed'],
        ['Spinal Flexion Clearing', 'not-performed'],
        ['Ankle Clearing', 'negative'],
      ),
    });
    expect(screen.getByText(/FMS modificata/)).toBeTruthy();
    expect(screen.getByText('/9')).toBeTruthy();
    expect(screen.getByText('2 FMS · 2 modificate')).toBeTruthy();
    // I due clearing non somministrati non compaiono fra le bandiere.
    expect(screen.queryByText(/Spinal Extension/)).toBeNull();
    expect(screen.getByText('Nessuna bandiera rossa')).toBeTruthy();
    cleanup();
  });

  it('work_mode assente resta «Modalita ignota» e non spegne i test', () => {
    const w = deriveWorkMode(null);
    expect(w.label).toBe('Modalità ignota');
    expect(w.testsEnabled).toBe(true);
  });

  it('nessuno dei quattro stati stampa le colonne riservate', () => {
    const casi = [
      { submission: sub(), screening: salute({ parq_msk: true }), storico: [fms('full', 14)], clearing: clr(['Ankle Clearing', 'positive']) },
      { submission: sub({ work_mode: 'remoto' }), screening: salute(), storico: [], clearing: null },
      { submission: null, screening: null, storico: [fms('full', 15)], clearing: clr(['Ankle Clearing', 'negative']) },
      { submission: sub(), screening: salute(), storico: [fms('modified', 7)], clearing: clr(['Spinal Flexion Clearing', 'not-performed']) },
    ];
    for (const caso of casi) {
      const { container } = montaScheda(caso);
      for (const col of COLONNE_RISERVATE) {
        expect(container.textContent ?? '').not.toContain(col);
      }
      cleanup();
    }
  });

  it('il consenso mancante non e una bandiera rossa: usa il tono amministrativo', () => {
    expect(deriveConsent(null, 'v2.1').tone).toBe('compliance');
    expect(deriveConsent(sub(), 'v2.1').tone).toBe('ok');
  });
});

/**
 * T3 — il muro di testo.
 *
 * Un'anamnesi da migliaia di caratteri in mezza colonna su 390px e' la striscia
 * verticale che rendeva illeggibile questa schermata. Qui si prova che il campo lungo
 * prende la riga intera, che il testo INTERO resta nel DOM — non e' stato tagliato con
 * `slice()` — e che c'e' un modo di aprirlo.
 *
 * ⚠️ Limite dichiarato: jsdom non fa layout, quindi «non interamente visibile» si
 * verifica sul meccanismo, cioe' sulla classe `line-clamp-4` che sta addosso al
 * paragrafo mentre e' chiuso e sparisce quando si apre. Contare i pixel richiederebbe
 * un browser vero; contare la classe prova comunque che il troncamento c'e', e' in CSS
 * e si toglie al tocco. Il testo intero e' verificato davvero, non per procura.
 */
describe('leggibilita sul telefono — i campi lunghi si troncano e si aprono', () => {
  const ANAMNESI =
    'Ipertensione arteriosa in terapia con ramipril 5 mg dal 2019, ' +
    'dislipidemia in trattamento con atorvastatina 20 mg, ' +
    'pregressa ernia discale L5-S1 trattata conservativamente nel 2021, ' +
    'intolleranza ai FANS, episodi ricorrenti di lombalgia acuta. ' +
    'z'.repeat(200);

  it('il riassunto: il campo lungo prende la riga intera, si tronca e si apre', () => {
    const summary = buildIntakeSummary(sub(), salute({ conditions_meds: ANAMNESI }));

    // La logica pura lo ha gia' marcato lungo: il componente non ridecide da solo.
    expect(summary.fields.find(f => f.key === 'farmaci')?.lungo).toBe(true);

    render(<IntakeSummaryCard summary={summary} hasIntake />);

    const paragrafo = screen.getByText(ANAMNESI);

    // Il testo intero c'e': selezionabile, cercabile, leggibile da uno screen reader.
    expect(paragrafo.textContent).toBe(ANAMNESI);
    // Ma non e' interamente visibile: quattro righe, in CSS.
    expect(paragrafo.className).toContain('line-clamp-4');
    // E il riquadro occupa la riga intera invece di mezza colonna.
    expect(paragrafo.closest('.col-span-2')).not.toBeNull();

    const bottone = screen.getByRole('button', { name: 'Mostra tutto' });
    expect(bottone.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(bottone);

    const dopo = screen.getByRole('button', { name: 'Riduci' });
    expect(dopo.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(ANAMNESI).className).not.toContain('line-clamp-4');

    cleanup();
  });

  it('un campo corto resta com era: mezza riga, nessun bottone', () => {
    const summary = buildIntakeSummary(sub({ main_goal: 'Tornare a correre' }), salute());
    render(<IntakeSummaryCard summary={summary} hasIntake />);
    expect(screen.getByText('Tornare a correre').className).not.toContain('line-clamp-4');
    expect(screen.queryByRole('button', { name: 'Mostra tutto' })).toBeNull();
    cleanup();
  });

  it('le bandiere: il dettaglio lungo scende sotto l etichetta invece di allungare la riga', () => {
    const flags = buildUnifiedFlags(salute({ conditions_meds: ANAMNESI }), []);
    render(<UnifiedFlagsBand flags={flags} />);

    // L'etichetta resta una riga sua: il dettaglio non le e' piu' appeso in linea.
    const etichetta = screen.getByText('Quadro clinico dichiarato');
    expect(etichetta.textContent).toBe('Quadro clinico dichiarato');

    const dettaglio = screen.getByText(ANAMNESI);
    expect(dettaglio.className).toContain('line-clamp-4');
    expect(screen.getByRole('button', { name: 'Mostra tutto' })).toBeTruthy();

    cleanup();
  });

  it('un dettaglio corto resta in linea, fra virgolette, come prima', () => {
    const flags = buildUnifiedFlags(salute({ past_injuries: 'spalla sx dal 2024' }), []);
    render(<UnifiedFlagsBand flags={flags} />);
    expect(screen.getByText(/spalla sx dal 2024/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mostra tutto' })).toBeNull();
    cleanup();
  });
});
