import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  deriveConsent, deriveWorkMode, buildUnifiedFlags, buildIntakeSummary,
  SUBMISSION_SELECT, HEALTH_SELECT, COLONNE_RISERVATE,
  type HealthSafe, type SubmissionSafe,
} from '@/lib/intake';
import type { ReferralClearingFinding } from '@/lib/medicalReferral';

const ROOT = process.cwd();

const salute = (p: Partial<HealthSafe> = {}): HealthSafe => ({
  submission_id: 's1',
  parq_heart: false, parq_chest_pain: false, parq_balance: false,
  parq_other_chronic: false, parq_meds: false, parq_msk: false, parq_supervised: false,
  conditions_meds: null, pain_now: null, pain_where: null, past_injuries: null,
  ...p,
});

const intervista = (p: Partial<SubmissionSafe> = {}): SubmissionSafe => ({
  id: 's1', client_id: 'c1', created_at: '2026-07-03T10:00:00Z', status: 'new',
  consent_version: 'v2.1', consented_at: '2026-07-03T10:00:00Z',
  full_name: 'Test', phone: null, email: null,
  main_goal: null, movement_goal: null,
  max_days_week: null, session_minutes: null, availability: null, equipment: null,
  work_mode: null, experience_level: null,
  ...p,
});

const clearing = (
  ...v: Array<[string, ReferralClearingFinding['status']]>
): ReferralClearingFinding[] =>
  v.map(([test, status]) => ({ test, status, description: `${test}: ${status}` }));

// ---------------------------------------------------------------------------

describe('intake — consenso a tre stati', () => {
  it('firmato sulla versione in vigore', () => {
    const c = deriveConsent(intervista({ consent_version: 'v2.1' }), 'v2.1');
    expect(c.status).toBe('firmato');
    expect(c.tone).toBe('ok');
  });

  it('firmato su versione superata quando la firmata non e la corrente', () => {
    const c = deriveConsent(intervista({ consent_version: 'v2.1' }), 'v2.2');
    expect(c.status).toBe('versione-superata');
    expect(c.signedVersion).toBe('v2.1');
    expect(c.currentVersion).toBe('v2.2');
    expect(c.label).toBe('Consenso v2.1 · corrente v2.2');
    expect(c.tone).toBe('compliance');
  });

  it('mai firmato quando non c e la submission', () => {
    expect(deriveConsent(null, 'v2.1').status).toBe('mai-firmato');
  });

  it('mai firmato quando c e la versione ma non la data: consent_version ha un DEFAULT sul database', () => {
    // Una riga nasce gia' con consent_version='v2.1' per default: da sola non prova
    // che qualcuno abbia firmato qualcosa.
    const c = deriveConsent(intervista({ consent_version: 'v2.1', consented_at: null }), 'v2.1');
    expect(c.status).toBe('mai-firmato');
  });

  it('la versione corrente mancante FALLISCE CHIUSO, non afferma la conformita', () => {
    // Una env var non impostata vale undefined a runtime anche se il tipo dice string.
    // Il default deve essere chiuso: mai dipingere di verde nove clienti senza aver
    // confrontato niente, e mai dire «superata» con la versione mancante.
    for (const assente of ['', '   ', undefined as unknown as string, null as unknown as string]) {
      expect(() => deriveConsent(intervista(), assente)).toThrow(/versione corrente/i);
    }
  });
});

describe('intake — modalita di lavoro', () => {
  it('presenza e ibrido accendono i test', () => {
    for (const m of ['presenza', 'ibrido']) {
      const w = deriveWorkMode(m);
      expect(w.testsEnabled).toBe(true);
      expect(w.disabledReason).toBeNull();
    }
  });

  it('remoto e app spengono i test e scrivono la ragione', () => {
    for (const m of ['remoto', 'app']) {
      const w = deriveWorkMode(m);
      expect(w.testsEnabled).toBe(false);
      expect(w.disabledReason).toMatch(/di persona/);
    }
  });

  it('work_mode assente resta «Modalita ignota» senza valore predefinito', () => {
    for (const v of [null, undefined, '', '  ']) {
      const w = deriveWorkMode(v);
      expect(w.mode).toBeNull();
      expect(w.label).toBe('Modalità ignota');
    }
  });
});

describe('intake — bandiere unite D e M', () => {
  it('un clearing not-performed NON e una bandiera', () => {
    const f = buildUnifiedFlags(
      salute(),
      clearing(['Spinal Extension Clearing', 'not-performed'], ['Spinal Flexion Clearing', 'not-performed']),
    );
    expect(f.measured).toHaveLength(0);
    expect(f.flags).toHaveLength(0);
    expect(JSON.stringify(f)).not.toContain('Spinal Extension');
  });

  it('nemmeno un clearing negative e una bandiera; solo positive lo e', () => {
    const f = buildUnifiedFlags(
      salute(),
      clearing(['Shoulder Clearing', 'negative'], ['Ankle Clearing', 'positive']),
    );
    expect(f.measured.map(m => m.label)).toEqual(['Ankle Clearing positivo']);
    expect(f.measured.every(m => m.source === 'M')).toBe(true);
  });

  it('i PAR-Q positivi diventano bandiere D, quelli falsi no', () => {
    const f = buildUnifiedFlags(salute({ parq_heart: true, parq_msk: true }), clearing());
    expect(f.declared.map(d => d.label).sort()).toEqual(['Cuore', 'Problema osteoarticolare']);
    expect(f.declared.every(d => d.source === 'D')).toBe(true);
  });

  it('pain_now null non e una bandiera: null vuol dire non risposto', () => {
    expect(buildUnifiedFlags(salute({ pain_now: null }), clearing()).declared).toHaveLength(0);
    expect(buildUnifiedFlags(salute({ pain_now: false }), clearing()).declared).toHaveLength(0);
    expect(buildUnifiedFlags(salute({ pain_now: true }), clearing()).declared).toHaveLength(1);
  });

  it('past_injuries di soli spazi non produce una bandiera', () => {
    expect(buildUnifiedFlags(salute({ past_injuries: '   ' }), clearing()).declared).toHaveLength(0);
    expect(buildUnifiedFlags(salute({ past_injuries: 'spalla sx' }), clearing()).declared).toHaveLength(1);
  });

  it('conditions_meds non si perde quando parq_meds e falso', () => {
    // Caso REALE del database: una riga su nove ha parq_balance vero, parq_meds falso
    // e conditions_meds valorizzato. Attaccare quel testo a un PAR-Q in particolare
    // lo farebbe sparire proprio su quella riga.
    const testo = 'Ho perso conoscenza in seguito a febbre alta.';
    const f = buildUnifiedFlags(
      salute({ parq_balance: true, parq_meds: false, conditions_meds: testo }),
      clearing(),
    );
    expect(JSON.stringify(f)).toContain('perso conoscenza');
    expect(f.declared.some(d => d.detail === testo)).toBe(true);
  });

  it('la banda NON diventa verde quando meta del quadro non e stata chiesta', () => {
    // Zero bandiere D perche' il questionario e' pulito e zero perche' il questionario
    // non esiste sono due cose diverse. Dire «nessuna bandiera rossa» a chi non ha mai
    // risposto e' un'affermazione clinica su un silenzio.
    const senzaIntervista = buildUnifiedFlags(null, clearing(['Shoulder Clearing', 'negative']));
    expect(senzaIntervista.tone).not.toBe('verde');
    expect(senzaIntervista.declaredKnown).toBe(false);
    expect(senzaIntervista.halfMissing).toBe(true);
    expect(senzaIntervista.title).not.toBe('Nessuna bandiera rossa');

    const senzaTest = buildUnifiedFlags(salute(), null);
    expect(senzaTest.tone).not.toBe('verde');
    expect(senzaTest.measuredKnown).toBe(false);

    const nessunDato = buildUnifiedFlags(null, null);
    expect(nessunDato.tone).toBe('neutra');
    expect(nessunDato.title).toBe('Nessun dato: né intervista né test');
  });

  it('verde solo quando entrambe le meta sono state lette e sono pulite', () => {
    const f = buildUnifiedFlags(salute(), clearing(['Shoulder Clearing', 'negative']));
    expect(f.tone).toBe('verde');
    expect(f.halfMissing).toBe(false);
    expect(f.title).toBe('Nessuna bandiera rossa');
  });
});

describe('intake — riassunto: un campo vuoto sparisce', () => {
  it('un condizionale vuoto non produce riga', () => {
    const s = buildIntakeSummary(intervista(), salute({ past_injuries: null }));
    expect(s.fields.some(f => f.key === 'infortuni')).toBe(false);
    expect(s.conditionalShown).toBe(0);
  });

  it('nemmeno una stringa di soli spazi produce riga', () => {
    const s = buildIntakeSummary(intervista(), salute({ past_injuries: '   ', conditions_meds: '' }));
    expect(s.fields.some(f => f.key === 'infortuni')).toBe(false);
    expect(s.fields.some(f => f.key === 'farmaci')).toBe(false);
  });

  it('un condizionale valorizzato produce la sua riga', () => {
    const s = buildIntakeSummary(intervista(), salute({ past_injuries: 'spalla sx dal 2024' }));
    const riga = s.fields.find(f => f.key === 'infortuni');
    expect(riga?.value).toBe('spalla sx dal 2024');
    expect(riga?.kind).toBe('condizionale');
  });

  it('anche un campo fisso vuoto sparisce invece di stampare un trattino', () => {
    const s = buildIntakeSummary(intervista({ main_goal: null, movement_goal: null }), salute());
    expect(s.fields.some(f => f.key === 'obiettivo')).toBe(false);
  });

  it('gli otto campi ci sono tutti quando ci sono tutti i dati', () => {
    const s = buildIntakeSummary(
      intervista({
        main_goal: 'Tornare a correre', max_days_week: '3', experience_level: 'intermedio',
        availability: 'sera', session_minutes: '60', equipment: 'palestra completa',
        phone: '333', email: 'a@b.it',
      }),
      salute({ pain_now: true, pain_where: 'lombare', past_injuries: 'spalla', conditions_meds: 'nessuno' }),
    );
    expect(s.fields).toHaveLength(8);
    expect(s.fields.filter(f => f.kind === 'fisso')).toHaveLength(5);
    expect(s.conditionalShown).toBe(3);
    expect(s.fields.find(f => f.key === 'esperienza')?.value).toBe('Intermedio');
  });

  it('senza intervista il riassunto e vuoto, non pieno di trattini', () => {
    expect(buildIntakeSummary(null, null).fields).toHaveLength(0);
  });
});

/**
 * Il cancello della privacy.
 *
 * Gravidanza, ciclo, codice fiscale e indirizzo non compaiono mai in ciò che è sempre
 * visibile. La barriera vera non è un tipo — `Object.entries` aggira qualunque `Omit` —
 * ma la richiesta al server: se quelle colonne non attraversano la rete, non c'è cache,
 * pannello di rete o dump dello stato che le possa perdere.
 *
 * Legge i sorgenti dal disco perché verifica una proprietà del repo e non un
 * comportamento, nello stile del test di cordone che vive in src/test/.
 */
describe('intake — il cancello della privacy', () => {
  it('le quattro colonne riservate non sono nella richiesta al server', () => {
    for (const col of COLONNE_RISERVATE) {
      expect(SUBMISSION_SELECT.split(',')).not.toContain(col);
      expect(HEALTH_SELECT.split(',')).not.toContain(col);
    }
  });

  it('nessun file della scheda le nomina', () => {
    const daLeggere = [
      'src/lib/intake.ts',
      'src/hooks/useIntake.ts',
      ...(existsSync(join(ROOT, 'src/components/client'))
        ? readdirSync(join(ROOT, 'src/components/client')).map(f => join('src/components/client', f))
        : []),
    ];
    // Questo file le nomina per mestiere (COLONNE_RISERVATE): si legge da sé, non dal disco.
    const colpevoli: string[] = [];
    for (const f of daLeggere) {
      const testo = readFileSync(join(ROOT, f), 'utf8');
      for (const col of COLONNE_RISERVATE) {
        // In intake.ts le quattro compaiono solo dentro COLONNE_RISERVATE, che è
        // l'elenco di ciò che è vietato: quella riga è il divieto, non una violazione.
        const righe = testo.split('\n').filter(r => r.includes(col) && !r.includes('COLONNE_RISERVATE'));
        const vere = righe.filter(r => !/^\s*(\/\/|\*)/.test(r) && !r.includes("'tax_code', 'address'"));
        if (vere.length) colpevoli.push(`${f} → ${col}: ${vere[0].trim().slice(0, 60)}`);
      }
    }
    expect(colpevoli).toEqual([]);
  });
});
