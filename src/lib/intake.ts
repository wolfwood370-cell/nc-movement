// Derivazioni pure sull'intervista d'ingresso (schema `public`) e sul loro incontro
// con i test di movimento (schema `movement`).
//
// Qui sta TUTTA la logica della scheda unificata: i componenti si limitano a mostrare
// ciò che queste funzioni restituiscono. È l'unico modo di provarla senza montare la
// pagina, ed è il motivo per cui questo file non importa né React né Supabase.
//
// ⛔ PRIVACY — quattro colonne non entrano mai qui dentro: `tax_code` e `address`
// (submissions), `pregnancy` e `cycle_status` (health_screening). Non è un divieto
// scritto in un commento e basta: i tipi sotto sono costruiti su una whitelist di
// colonne, e l'hook che li popola chiede al server SOLO quelle. Ciò che non attraversa
// la rete non può finire in una cache, in un pannello di rete o in un dump dello stato.
// Gravidanza, ciclo, codice fiscale e indirizzo vivono solo nei gruppi Salute e
// Anagrafica, che si aprono di proposito e leggono per conto loro.

import type { ReferralClearingFinding } from './medicalReferral';

// ---------------------------------------------------------------------------
// Le colonne ammesse — la whitelist è la barriera, non una convenzione
// ---------------------------------------------------------------------------

// Le due stringhe qui sotto sono la barriera vera: è ciò che finisce nella richiesta
// HTTP. Sono letterali e non costruite con `join()` per due motivi — supabase-js
// inferisce i tipi solo da una stringa letterale, e una barriera che si legge a occhio
// nel sorgente è più difficile da allargare per sbaglio di una costruita a runtime.

// Restano su una riga sola, senza concatenazione: supabase-js infersce le colonne
// solo da una stringa letterale, e un `+` la degrada a `string` generico.

/** Colonne di `public.submissions` che questa scheda può chiedere al server. */
export const SUBMISSION_SELECT = 'id,client_id,created_at,status,consent_version,consented_at,full_name,phone,email,main_goal,movement_goal,max_days_week,session_minutes,availability,equipment,work_mode,experience_level' as const;

/** Colonne di `public.health_screening` che questa scheda può chiedere al server. */
export const HEALTH_SELECT = 'submission_id,parq_heart,parq_chest_pain,parq_balance,parq_other_chronic,parq_meds,parq_msk,parq_supervised,conditions_meds,pain_now,pain_where,past_injuries' as const;

/** Le stesse colonne in forma di elenco, per i test di cancello. */
export const SUBMISSION_COLS = SUBMISSION_SELECT.split(',');
export const HEALTH_COLS = HEALTH_SELECT.split(',');

/**
 * Le quattro colonne che non escono da `public` verso questa scheda.
 * Esportate perché il test di cancello le legge da qui invece di riscriverle.
 */
export const COLONNE_RISERVATE = ['tax_code', 'address', 'pregnancy', 'cycle_status'] as const;

export type SubmissionSafe = {
  id: string;
  client_id: string | null;
  created_at: string;
  status: string;
  consent_version: string | null;
  consented_at: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  main_goal: string | null;
  movement_goal: string | null;
  max_days_week: string | null;
  session_minutes: string | null;
  availability: string | null;
  equipment: string | null;
  work_mode: string | null;
  experience_level: string | null;
};
export type HealthSafe = {
  submission_id: string;
  parq_heart: boolean; parq_chest_pain: boolean; parq_balance: boolean;
  parq_other_chronic: boolean; parq_meds: boolean; parq_msk: boolean;
  parq_supervised: boolean;
  conditions_meds: string | null;
  pain_now: boolean | null;
  pain_where: string | null;
  past_injuries: string | null;
};

/** Un testo che c'è davvero: null, undefined e le stringhe di soli spazi non contano. */
const testo = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
};

// ---------------------------------------------------------------------------
// Consenso — tre stati, e la versione corrente arriva da fuori
// ---------------------------------------------------------------------------

export type ConsentStatus = 'firmato' | 'versione-superata' | 'mai-firmato';

export interface ConsentBadge {
  status: ConsentStatus;
  /** Versione che il cliente ha firmato, se l'ha firmata. */
  signedVersion: string | null;
  /** Versione in vigore, quella contro cui si è confrontato. */
  currentVersion: string;
  signedAt: string | null;
  label: string;
  /** `compliance` è amministrativo, non clinico: non deve suonare come una bandiera. */
  tone: 'ok' | 'compliance';
}

/**
 * Lo stato del consenso.
 *
 * `currentVersion` arriva da fuori — non si scrive in pagina — e per questo è l'input
 * più fragile: una env var non impostata vale `undefined` a runtime anche se il tipo
 * dice `string`. Qui fallisce CHIUSO e rumoroso: senza una versione con cui
 * confrontare non si può affermare la conformità, e dire «firmato» sarebbe una
 * dichiarazione di conformità mai verificata.
 */
export function deriveConsent(
  submission: Pick<SubmissionSafe, 'consent_version' | 'consented_at'> | null | undefined,
  currentVersion: string,
): ConsentBadge {
  const corrente = testo(currentVersion);
  if (!corrente) {
    throw new Error(
      'deriveConsent: la versione corrente del consenso è obbligatoria. ' +
      'Senza, la conformità non può essere affermata.',
    );
  }

  const firmata = testo(submission?.consent_version);
  const firmatoIl = testo(submission?.consented_at);

  // Firmato è «c'è una versione E una data»: `consent_version` ha un DEFAULT sul
  // database, quindi da sola non prova che qualcuno abbia firmato qualcosa.
  if (!firmata || !firmatoIl) {
    return {
      status: 'mai-firmato',
      signedVersion: null,
      currentVersion: corrente,
      signedAt: null,
      label: 'Nessun consenso',
      tone: 'compliance',
    };
  }

  if (firmata.toLowerCase() !== corrente.toLowerCase()) {
    return {
      status: 'versione-superata',
      signedVersion: firmata,
      currentVersion: corrente,
      signedAt: firmatoIl,
      label: `Consenso ${firmata} · corrente ${corrente}`,
      tone: 'compliance',
    };
  }

  return {
    status: 'firmato',
    signedVersion: firmata,
    currentVersion: corrente,
    signedAt: firmatoIl,
    label: `Consenso ${firmata} · ${dataBreve(firmatoIl)}`,
    tone: 'ok',
  };
}

const dataBreve = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// ---------------------------------------------------------------------------
// Modalità di lavoro — e quali test restano accesi
// ---------------------------------------------------------------------------

export type WorkMode = 'presenza' | 'remoto' | 'ibrido' | 'app';

export interface WorkModeBadge {
  mode: WorkMode | null;
  label: string;
  /** I test in presenza si accendono? `ibrido` si comporta come `presenza`. */
  testsEnabled: boolean;
  /** La ragione scritta accanto ai pulsanti spenti. Null quando sono accesi. */
  disabledReason: string | null;
}

const WORK_MODE_LABEL: Record<WorkMode, string> = {
  presenza: 'In presenza',
  remoto: 'A distanza',
  ibrido: 'Ibrido',
  app: 'Solo app',
};

/**
 * `remoto` e `app` spengono i test ma NON li nascondono: restano visibili con la
 * ragione scritta. `work_mode` assente resta «Modalità ignota», senza valore
 * predefinito — non si indovina come lavora una persona.
 */
export function deriveWorkMode(mode: string | null | undefined): WorkModeBadge {
  const m = testo(mode) as WorkMode | null;
  if (!m || !(m in WORK_MODE_LABEL)) {
    return { mode: null, label: 'Modalità ignota', testsEnabled: true, disabledReason: null };
  }
  const aDistanza = m === 'remoto' || m === 'app';
  return {
    mode: m,
    label: WORK_MODE_LABEL[m],
    testsEnabled: !aDistanza,
    disabledReason: aDistanza
      ? `Lavora ${WORK_MODE_LABEL[m].toLowerCase()}: i test si somministrano di persona.`
      : null,
  };
}

// ---------------------------------------------------------------------------
// Le bandiere unite — D dichiarate, M misurate
// ---------------------------------------------------------------------------

export type FlagSource = 'D' | 'M';

export interface IntakeFlag {
  source: FlagSource;
  label: string;
  /** Il dettaglio libero scritto dal cliente, quando c'è. */
  detail: string | null;
}

export interface UnifiedFlags {
  flags: IntakeFlag[];
  declared: IntakeFlag[];
  measured: IntakeFlag[];
  /** L'intervista è stata letta? Se no, le D sono zero perché non sono state chieste. */
  declaredKnown: boolean;
  /** Esiste una FMS? Se no, le M sono zero perché non è stato misurato niente. */
  measuredKnown: boolean;
  /** Vero quando una delle due metà non è mai stata interrogata. */
  halfMissing: boolean;
  tone: 'rossa' | 'neutra' | 'verde';
  title: string;
}

const PARQ_LABEL: Record<string, string> = {
  parq_heart: 'Cuore',
  parq_chest_pain: 'Dolore al torace sotto sforzo',
  parq_balance: 'Equilibrio',
  parq_other_chronic: 'Altre patologie croniche',
  parq_meds: 'Farmaci',
  parq_msk: 'Problema osteoarticolare',
  parq_supervised: 'Supervisione medica',
};

/**
 * Unisce ciò che il cliente dichiara e ciò che ho misurato io.
 *
 * `not-performed` NON è una bandiera: un test mai somministrato non è un reperto, ed
 * è esattamente la confusione che la fetta precedente ha tolto dal referto.
 *
 * Il tono non si decide contando le righe. Zero bandiere D perché il questionario è
 * pulito e zero bandiere D perché il questionario non esiste sono due cose diverse, e
 * dire «nessuna bandiera rossa» a chi non ha mai risposto è un'affermazione clinica
 * su un silenzio.
 */
export function buildUnifiedFlags(
  health: HealthSafe | null | undefined,
  clearing: readonly ReferralClearingFinding[] | null | undefined,
): UnifiedFlags {
  const declared: IntakeFlag[] = [];
  const measured: IntakeFlag[] = [];

  const declaredKnown = !!health;
  const measuredKnown = !!clearing;

  if (health) {
    // `conditions_meds` è il testo libero che accompagna il quadro clinico. Non si
    // appende a un PAR-Q in particolare: su una riga vera del database è valorizzato
    // mentre `parq_meds` è falso, e attaccarlo lì lo farebbe sparire.
    const dettaglioClinico = testo(health.conditions_meds);

    for (const key of Object.keys(PARQ_LABEL)) {
      if (health[key as keyof HealthSafe] === true) {
        declared.push({ source: 'D', label: PARQ_LABEL[key], detail: null });
      }
    }

    if (dettaglioClinico) {
      declared.push({ source: 'D', label: 'Quadro clinico dichiarato', detail: dettaglioClinico });
    }

    // `pain_now` è nullable: solo `true` è una bandiera. Null vuol dire non risposto.
    if (health.pain_now === true) {
      declared.push({ source: 'D', label: 'Dolore attuale', detail: testo(health.pain_where) });
    }

    const infortuni = testo(health.past_injuries);
    if (infortuni) {
      declared.push({ source: 'D', label: 'Infortuni passati', detail: infortuni });
    }
  }

  for (const c of clearing ?? []) {
    if (c.status === 'positive') {
      measured.push({ source: 'M', label: `${c.test} positivo`, detail: null });
    }
  }

  const flags = [...declared, ...measured];
  const halfMissing = !declaredKnown || !measuredKnown;

  let tone: UnifiedFlags['tone'];
  let title: string;
  if (flags.length > 0) {
    tone = 'rossa';
    title = flags.length === 1 ? '1 bandiera rossa' : `${flags.length} bandiere rosse insieme`;
  } else if (halfMissing) {
    // Mai verde con metà del quadro mancante.
    tone = 'neutra';
    title = !declaredKnown && !measuredKnown
      ? 'Nessun dato: né intervista né test'
      : !declaredKnown
        ? 'Nessuna bandiera misurata · intervista mai compilata'
        : 'Nessuna bandiera dichiarata · nessun test ancora';
  } else {
    tone = 'verde';
    title = 'Nessuna bandiera rossa';
  }

  return { flags, declared, measured, declaredKnown, measuredKnown, halfMissing, tone, title };
}

// ---------------------------------------------------------------------------
// Il riassunto — otto campi, e quelli vuoti spariscono
// ---------------------------------------------------------------------------

export type SummaryKind = 'fisso' | 'condizionale';

export interface SummaryField {
  key: string;
  label: string;
  value: string;
  kind: SummaryKind;
}

export interface IntakeSummary {
  fields: SummaryField[];
  /** Quanti dei campi condizionali hanno prodotto una riga. */
  conditionalShown: number;
}

const EXPERIENCE_LABEL: Record<string, string> = {
  novizio: 'Novizio', principiante: 'Principiante', intermedio: 'Intermedio',
  avanzato: 'Avanzato', master: 'Master',
};

/**
 * Gli otto campi del riassunto: cinque fissi e tre condizionali.
 *
 * Un campo vuoto non occupa una riga: sparisce. Vale anche per i fissi — una riga
 * «Obiettivo: —» non informa nessuno e ruba spazio a ciò che c'è. La differenza fra
 * fisso e condizionale sta nel significato, non nella presenza: i condizionali
 * riguardano la salute e la loro assenza è essa stessa un'informazione neutra.
 */
export function buildIntakeSummary(
  submission: SubmissionSafe | null | undefined,
  health: HealthSafe | null | undefined,
): IntakeSummary {
  const fields: SummaryField[] = [];
  const aggiungi = (key: string, label: string, value: string | null, kind: SummaryKind) => {
    const v = testo(value);
    if (v) fields.push({ key, label, value: v, kind });
  };

  if (submission) {
    aggiungi('obiettivo', 'Obiettivo', testo(submission.main_goal) ?? testo(submission.movement_goal), 'fisso');

    const giorni = testo(submission.max_days_week);
    aggiungi('frequenza', 'Frequenza', giorni ? `${giorni} giorni a settimana` : null, 'fisso');

    const liv = testo(submission.experience_level);
    aggiungi('esperienza', 'Esperienza', liv ? (EXPERIENCE_LABEL[liv] ?? liv) : null, 'fisso');

    const logistica = [
      testo(submission.availability),
      testo(submission.session_minutes) ? `${testo(submission.session_minutes)} min` : null,
      testo(submission.equipment),
    ].filter(Boolean).join(' · ');
    aggiungi('logistica', 'Disponibilità e logistica', logistica || null, 'fisso');

    const contatto = [testo(submission.phone), testo(submission.email)].filter(Boolean).join(' · ');
    aggiungi('contatto', 'Contatto', contatto || null, 'fisso');
  }

  if (health) {
    const dove = testo(health.pain_where);
    aggiungi(
      'dolore', 'Dolore attuale',
      health.pain_now === true ? (dove ?? 'riferito, sede non indicata') : null,
      'condizionale',
    );
    aggiungi('infortuni', 'Infortuni passati', testo(health.past_injuries), 'condizionale');
    aggiungi('farmaci', 'Farmaci e condizioni', testo(health.conditions_meds), 'condizionale');
  }

  return {
    fields,
    conditionalShown: fields.filter(f => f.kind === 'condizionale').length,
  };
}
