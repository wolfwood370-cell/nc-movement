import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeNeuroAnswers } from '@/lib/neurotype-scoring';

/**
 * Legge le 30 risposte del neurotipo, che vivono nell'ALTRA applicazione sullo stesso
 * database, nello schema `public`. Il client e' agganciato a `movement`, quindi anche
 * qui serve `.schema('public')`, esattamente come in `useIntake`.
 *
 * ⛔ LA TABELLA DEI RISULTATI NON SI LEGGE — nello stesso schema, accanto alle
 * risposte, esiste anche una tabella dei punteggi gia' calcolati (si trova nei tipi
 * generati, subito sotto `neurotype_answers`). Ha zero righe e nessuno la scrive:
 * non e' una fonte di verita', e' una struttura mai riempita. Leggerla darebbe
 * «nessun neurotipo» a chiunque, comprese le persone che hanno risposto a tutte e
 * trenta le domande. Il punteggio si calcola dalle risposte grezze nel momento in cui
 * lo si mostra, come fa oggi il questionario: una sola implementazione, nessuna cache
 * da invalidare, nessun risultato che invecchia in silenzio.
 *
 * ⛔ PRIVACY — le colonne si chiedono UNA PER UNA, mai `select('*')`, e la stringa
 * resta LETTERALE: supabase-js inferisce i tipi solo da un letterale, e un `join()`
 * o un `+` la degradano a `string` generico (di li' arriva `GenericStringError`).
 * Questa tabella non porta dati personali — solo `submission_id` e trenta lettere —
 * ma la forma della richiesta resta quella di `useIntake`, perche' due stampi diversi
 * per la stessa cosa e' il modo in cui una barriera si allarga per distrazione.
 *
 * ⛔ SICUREZZA — sola lettura. Nessuna politica di riga toccata, nessuna chiave
 * privilegiata: si legge con la sessione dell'utente, come farebbe lui a mano.
 */

/** Colonne di `public.neurotype_answers` che questa scheda chiede al server. */
export const NEURO_SELECT = 'submission_id,q01,q02,q03,q04,q05,q06,q07,q08,q09,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20,q21,q22,q23,q24,q25,q26,q27,q28,q29,q30' as const;

export type NeurotipoState =
  | { status: 'caricamento' }
  | { status: 'errore'; error: Error }
  /**
   * Nessuna risposta da calcolare: o la riga non esiste, o esiste ed e' vuota.
   * Non e' un errore, ed e' il motivo per cui la card semplicemente non compare
   * invece di comparire vuota.
   */
  | { status: 'assente' }
  | {
      status: 'presente';
      /** Le 30 risposte gia' normalizzate in lettere A–E; il vuoto resta vuoto. */
      answers: string[];
      /** Quante delle 30 sono state davvero compilate: sotto 30 il calcolo e' parziale. */
      compilate: number;
    };

async function fetchNeurotipo(
  submissionId: string,
): Promise<{ kind: 'assente' } | { kind: 'presente'; answers: string[]; compilate: number }> {
  const { data, error } = await supabase
    .schema('public')
    .from('neurotype_answers')
    .select(NEURO_SELECT)
    .eq('submission_id', submissionId)
    .maybeSingle();

  // Un errore e' un errore. Restituire «assente» qui direbbe «non ha risposto» di
  // qualcuno che magari ha risposto a tutte e trenta: e' la bugia che questa card
  // esiste per non raccontare.
  if (error) throw error;

  // La riga non c'e': il questionario e' collegato, la sezione neurotipo no.
  if (!data) return { kind: 'assente' };

  const answers = normalizeNeuroAnswers(data as unknown as Record<string, unknown>);
  const compilate = answers.filter(a => a !== '').length;

  // Riga presente ma tutta vuota. Calcolarla darebbe cinque totali a zero e, per il
  // tie-break, un primario 1A pieno di sicurezza costruito sul nulla. Sono trenta
  // domande senza risposta, e si dicono cosi'.
  if (compilate === 0) return { kind: 'assente' };

  return { kind: 'presente', answers, compilate };
}

/**
 * Lo stato delle risposte del neurotipo per una submission. Quando non ce ne sono lo
 * stato e' `assente` in modo esplicito, non un `null` che il chiamante deve
 * interpretare — lo stesso contratto di `useIntake`.
 */
export function useNeurotipo(submissionId: string | undefined): NeurotipoState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['neurotipo', submissionId],
    queryFn: () => fetchNeurotipo(submissionId as string),
    enabled: !!submissionId,
    staleTime: 5 * 60 * 1000,
  });

  if (!submissionId || isLoading) return { status: 'caricamento' };

  // I DATI VENGONO PRIMA DELL'ERRORE, e qui e' l'unico punto in cui questo hook si
  // discosta dallo stampo di `useIntake`.
  //
  // react-query non cancella `data` quando un *refetch* fallisce: tiene l'ultimo
  // valore buono e accende `error` accanto. Guardando `error` per primo, un aggiornamento
  // andato male su una scheda gia' aperta — 500, sessione scaduta, timeout — farebbe
  // sparire un neurotipo che era sullo schermo un attimo prima e che e' ancora in cache,
  // perfettamente calcolabile. Il coach vedrebbe il verdetto svanire mentre guarda.
  //
  // Con quest'ordine l'errore conta solo quando non c'e' niente da mostrare, che e'
  // l'unico caso in cui e' davvero un errore per chi legge.
  if (data) {
    if (data.kind === 'assente') return { status: 'assente' };
    return { status: 'presente', answers: data.answers, compilate: data.compilate };
  }

  if (error) return { status: 'errore', error: error as Error };
  return { status: 'assente' };
}
