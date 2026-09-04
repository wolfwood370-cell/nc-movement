import scoring from "./neurotipo-scoring.json";

// Scoring del neurotipo (modello Thibaudeau) — port 1:1 di
// src/lib/neurotipo-scoring.json (schema nc-neurotipo-scoring/v1).
// Pesi, mappa domanda→tipo/fascia e cues sono LETTI DAL JSON, che resta
// la fonte di verità; questo modulo aggiunge solo la meccanica.
// La correttezza è garantita dai 3 validation_examples del JSON, eseguiti
// come test di regressione in neurotype-scoring.test.ts.

export type NeuroTypeCode = "1A" | "1B" | "2A" | "2B" | "3";
export type NeuroLetter = "A" | "B" | "C" | "D" | "E";

/** Ordine fisso dei tipi: è anche il tie-break deterministico (1A > 1B > 2A > 2B > 3). */
export const NT_ORDER: readonly NeuroTypeCode[] = ["1A", "1B", "2A", "2B", "3"];

export const NT_MIN = scoring.scoring.range_per_type.min; // -10
export const NT_MAX = scoring.scoring.range_per_type.max; // 50

type Band = "alta" | "media" | "bassa";
const BANDS = scoring.bands as Record<Band, Record<NeuroLetter, number>>;
const MAP = scoring.map as Record<string, { n: number; type: NeuroTypeCode; band: Band }>;

export type NeuroTypeInfo = {
  code: NeuroTypeCode;
  label: string;
  keyword: string;
  profilo: string;
  cues: { comunicazione: string; motivazione: string; allenamento: string };
};

const TYPES = scoring.types as Record<
  NeuroTypeCode,
  { label: string; keyword: string; profilo: string }
>;
const CUES = scoring.cues as Record<
  NeuroTypeCode,
  { comunicazione: string; motivazione: string; allenamento: string }
>;

export const NT_TYPES: Record<NeuroTypeCode, NeuroTypeInfo> = Object.fromEntries(
  NT_ORDER.map((code) => [
    code,
    {
      code,
      label: TYPES[code].label,
      keyword: TYPES[code].keyword,
      profilo: TYPES[code].profilo,
      cues: CUES[code],
    },
  ]),
) as Record<NeuroTypeCode, NeuroTypeInfo>;

export function neuroKeyOf(n: number): string {
  return `q${String(n).padStart(2, "0")}`;
}

export type NeuroScoreEntry = NeuroTypeInfo & { total: number };

export type NeuroScore = {
  totals: Record<NeuroTypeCode, number>;
  /** Tipi ordinati per totale decrescente; a parità vince l'ordine 1A > 1B > 2A > 2B > 3. */
  ranked: NeuroScoreEntry[];
  primary: NeuroScoreEntry;
  secondary: NeuroScoreEntry;
  margin: number;
  /** Margine ≤ 5: testa a testa — indizio, non diagnosi. */
  closeCall: boolean;
};

/**
 * Calcola i totali per tipo dalle 30 risposte (array di lettere A–E in
 * ordine q01→q30). Risposte mancanti o non valide non aggiungono punti.
 */
export function scoreNeurotype(answers: readonly string[]): NeuroScore {
  const totals: Record<NeuroTypeCode, number> = { "1A": 0, "1B": 0, "2A": 0, "2B": 0, "3": 0 };
  for (let n = 1; n <= 30; n++) {
    const entry = MAP[neuroKeyOf(n)];
    const letter = (answers[n - 1] ?? "").toUpperCase() as NeuroLetter;
    const pts = BANDS[entry.band][letter];
    if (typeof pts === "number") totals[entry.type] += pts;
  }
  const ranked: NeuroScoreEntry[] = NT_ORDER.map((code) => ({
    ...NT_TYPES[code],
    total: totals[code],
  })).sort((a, b) => b.total - a.total || NT_ORDER.indexOf(a.code) - NT_ORDER.indexOf(b.code));
  const primary = ranked[0];
  const secondary = ranked[1];
  const margin = primary.total - secondary.total;
  return { totals, ranked, primary, secondary, margin, closeCall: margin <= 5 };
}

const LETTERS: readonly NeuroLetter[] = ["A", "B", "C", "D", "E"];

/**
 * Normalizza le risposte al formato array di 30 lettere A–E.
 * Accetta: chiavi `q01`…`q30` o `q1`…`q30`, lettere (a/A) o numeri 1–5
 * (1=A … 5=E), oppure un array `neuro` di 30 elementi.
 * Valori assenti o non riconosciuti diventano "" (nessun punto).
 */
export function normalizeNeuroAnswers(
  source: Record<string, unknown> | null | undefined,
  neuroArray?: unknown,
): string[] {
  if (Array.isArray(neuroArray) && neuroArray.length === 30) {
    return neuroArray.map((x) => normalizeLetter(x));
  }
  const out: string[] = [];
  for (let n = 1; n <= 30; n++) {
    let v = source?.[neuroKeyOf(n)];
    if (v === null || v === undefined || v === "") v = source?.[`q${n}`];
    out.push(normalizeLetter(v));
  }
  return out;
}

function normalizeLetter(v: unknown): string {
  if (typeof v === "string") {
    const up = v.trim().toUpperCase();
    if ((LETTERS as readonly string[]).includes(up)) return up;
    const num = Number(up);
    if (Number.isInteger(num) && num >= 1 && num <= 5) return LETTERS[num - 1];
    return "";
  }
  if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) return LETTERS[v - 1];
  return "";
}

/** Esempi di validazione del JSON: usati dai test di regressione. */
export const VALIDATION_EXAMPLES = scoring.validation_examples;
