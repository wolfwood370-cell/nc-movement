import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  emptyFmsScores, hasCriticalRedFlags, CLEARING_KEYS, CLEARING_BY_TYPE,
} from '@/lib/fms';
import { buildReferralData } from '@/lib/medicalReferral';

describe('medicalReferral — FMS pain findings', () => {
  it('reports a pattern scored 0 (pain) as an FMS finding', () => {
    const data = buildReferralData({ ...emptyFmsScores(), deep_squat_score: 0 }, null, null);
    expect(data.hasFindings).toBe(true);
    expect(data.fms.some(f => f.pattern.includes('Deep Squat'))).toBe(true);
  });

  it('does NOT double-count a clearing-forced zero as FMS pain', () => {
    // Positive shoulder clearing forces Shoulder Mobility → 0 (cleared).
    const data = buildReferralData(
      { ...emptyFmsScores(), shoulder_mobility_left: 3, shoulder_mobility_right: 3, clearing_shoulder_pain: true },
      null, null,
    );
    // It must appear ONCE, in the clearing block — not also as "Punteggio 0 (dolore)".
    expect(data.fms.some(f => f.pattern.toLowerCase().includes('shoulder'))).toBe(false);
    expect(data.clearing.some(c => c.test === 'Shoulder Clearing')).toBe(true);
  });
});

describe('medicalReferral — YBT reach #1 laterality (LQ vs UQ)', () => {
  it('labels an LQ asymmetry as anterior / lower limb', () => {
    const data = buildReferralData(null, { anterior_left_cm: 10, anterior_right_cm: 16 }, null);
    expect(data.ybt).toHaveLength(1);
    expect(data.ybt[0].description).toContain('reach anteriore');
    expect(data.ybt[0].description).toContain("dell'arto inferiore");
  });

  it('labels a UQ asymmetry as medial / upper limb', () => {
    const data = buildReferralData(
      null,
      { test_type: 'UQ', anterior_left_cm: 10, anterior_right_cm: 16 },
      null,
    );
    expect(data.ybt).toHaveLength(1);
    expect(data.ybt[0].description).toContain('reach mediale');
    expect(data.ybt[0].description).toContain("dell'arto superiore");
  });

  it('ignores a sub-threshold asymmetry', () => {
    const data = buildReferralData(null, { anterior_left_cm: 10, anterior_right_cm: 12 }, null);
    expect(data.ybt).toHaveLength(0);
  });
});

/**
 * I clearing test a tre stati.
 *
 * Il referto elencava solo i positivi, e chi lo leggeva concludeva che gli altri
 * fossero negativi. Ma una FMS modificata non somministra mai estensione e
 * flessione spinale, e sul database quei campi restano `false` perche' nessuno li
 * ha toccati: il referto dichiarava negativo cio' che nessuno aveva misurato.
 */
describe('medicalReferral — clearing test a tre stati', () => {
  const piena = () => ({ ...emptyFmsScores(), assessment_type: 'full' as const });
  const modificata = () => ({ ...emptyFmsScores(), assessment_type: 'modified' as const });
  const stato = (d: ReturnType<typeof buildReferralData>, test: string) =>
    d.clearing.find(c => c.test === test)?.status;

  it('una FMS modificata produce quattro voci, con i due spinali NON ESEGUITI e mai negativi', () => {
    const data = buildReferralData(modificata(), null, null);

    expect(data.clearing).toHaveLength(4);
    expect(stato(data, 'Spinal Extension Clearing')).toBe('not-performed');
    expect(stato(data, 'Spinal Flexion Clearing')).toBe('not-performed');
    // I due somministrati anche dalla modificata restano negativi.
    expect(stato(data, 'Shoulder Clearing')).toBe('negative');
    expect(stato(data, 'Ankle Clearing')).toBe('negative');
    // Il punto della fetta: nessuno dei due spinali puo' uscire come "negativo".
    expect(data.clearing.filter(c => c.status === 'negative').map(c => c.test))
      .not.toContain('Spinal Extension Clearing');
  });

  it('una FMS piena con tutti i flag a false produce quattro NEGATIVI e nessun non eseguito', () => {
    const data = buildReferralData(piena(), null, null);

    expect(data.clearing).toHaveLength(4);
    expect(data.clearing.every(c => c.status === 'negative')).toBe(true);
    expect(data.clearing.some(c => c.status === 'not-performed')).toBe(false);
  });

  it('un flag positivo resta positivo e conserva la lateralita, su piena e su modificata', () => {
    const sinistro = buildReferralData(
      { ...piena(), clearing_shoulder_left_pain: true }, null, null,
    );
    expect(stato(sinistro, 'Shoulder Clearing')).toBe('positive');
    expect(sinistro.clearing.find(c => c.test === 'Shoulder Clearing')?.description)
      .toContain('(sinistro)');

    const destro = buildReferralData(
      { ...modificata(), ankle_clearing_right_pain: true }, null, null,
    );
    expect(stato(destro, 'Ankle Clearing')).toBe('positive');
    expect(destro.clearing.find(c => c.test === 'Ankle Clearing')?.description)
      .toContain('(destro)');

    const bilaterale = buildReferralData(
      { ...piena(), ankle_clearing_left_pain: true, ankle_clearing_right_pain: true }, null, null,
    );
    expect(bilaterale.clearing.find(c => c.test === 'Ankle Clearing')?.description)
      .toContain('(bilaterale)');
  });

  it('la lateralita NON finisce sulle voci negative o non eseguite', () => {
    // «Shoulder Clearing (bilaterale): negativo» si leggerebbe come un reperto.
    const data = buildReferralData(piena(), null, null);
    for (const c of data.clearing) {
      expect(c.description).not.toMatch(/\((sinistro|destro|bilaterale)\)/);
    }
  });

  it('il dolore registrato vince sul protocollo: un flag true su una modificata resta POSITIVO', () => {
    // hasCriticalRedFlags e' cieco al tipo di FMS e blocca comunque. Se qui il
    // protocollo avesse la precedenza, il referto stamperebbe «non eseguito» e
    // negherebbe per iscritto il motivo per cui il cliente e' bloccato.
    const riga = { ...modificata(), clearing_spinal_extension_pain: true };
    const data = buildReferralData(riga, null, null);

    expect(stato(data, 'Spinal Extension Clearing')).toBe('positive');
    expect(data.hasFindings).toBe(true);
    expect(hasCriticalRedFlags(riga).hasFlags).toBe(true);
  });
});

describe('medicalReferral — i tre stati non alterano ne il referto pulito ne il lock', () => {
  it('una FMS senza dolore non ha reperti, malgrado le quattro voci di clearing', () => {
    // Se hasFindings contasse tutte le voci, ogni screening diventerebbe un rinvio
    // medico: il referto direbbe «si richiede valutazione specialistica» a chiunque.
    for (const tipo of ['full', 'modified'] as const) {
      const data = buildReferralData({ ...emptyFmsScores(), assessment_type: tipo }, null, null);
      expect(data.clearing).toHaveLength(4);
      expect(data.hasFindings).toBe(false);
    }
  });

  it('il lock clinico non si accende su una modificata con tutti i clearing a false', () => {
    // Esisteva gia' un test equivalente per la FMS PIENA (fms.test.ts, «nessun red
    // flag su FMS vuota», che usa emptyFmsScores() = full). Per la MODIFICATA no:
    // questo e' nuovo, ed e' il caso che riguarda 11 clienti su 21.
    const riga = {
      ...emptyFmsScores(),
      assessment_type: 'modified' as const,
      deep_squat_score: 2 as const,
      shoulder_mobility_left: 3 as const, shoulder_mobility_right: 3 as const,
      aslr_left: 2 as const, aslr_right: 2 as const,
    };
    expect(hasCriticalRedFlags(riga).hasFlags).toBe(false);
    expect(hasCriticalRedFlags(riga).hasClearingPain).toBe(false);
    // e il referto resta muto
    expect(buildReferralData(riga, null, null).hasFindings).toBe(false);
  });
});

/**
 * Il cordone contro la divergenza.
 *
 * CLEARING_BY_TYPE e' la fonte da cui il referto ricava «non eseguito», ma il
 * wizard la usa per filtrare i propri step, non per generarli. Se le due strade
 * divergessero, il referto direbbe «eseguito» un test che il wizard non chiede —
 * cioe' esattamente il difetto che questa fetta elimina. Questo test va rosso.
 *
 * Legge il sorgente dal disco perche' verifica una proprieta' del repo e non un
 * comportamento, nello stile del test di cordone che vive in src/test/.
 */
describe('clearing — il wizard e il referto non possono divergere', () => {
  const wizard = readFileSync(
    join(process.cwd(), 'src/components/fms/FmsWizard.tsx'), 'utf8',
  );

  const clearingDichiaratiIn = (costante: string): string[] => {
    const inizio = wizard.indexOf(`const ${costante}: StepDef[] = [`);
    expect(inizio, `${costante} non trovata in FmsWizard.tsx`).toBeGreaterThan(-1);
    const blocco = wizard.slice(inizio, wizard.indexOf('];', inizio));
    return CLEARING_KEYS.filter(k => blocco.includes(`'${k}'`));
  };

  it.each([
    ['full', 'STEPS_FULL'],
    ['modified', 'STEPS_MODIFIED'],
  ] as const)('gli step %s del wizard portano esattamente i clearing di CLEARING_BY_TYPE', (tipo, costante) => {
    expect([...clearingDichiaratiIn(costante)].sort())
      .toEqual([...CLEARING_BY_TYPE[tipo]].sort());
  });
});
