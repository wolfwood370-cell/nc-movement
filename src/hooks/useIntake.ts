import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  SUBMISSION_SELECT, HEALTH_SELECT,
  type SubmissionSafe, type HealthSafe,
} from '@/lib/intake';

/**
 * Legge l'intervista d'ingresso, che vive in un'ALTRA applicazione sullo stesso
 * database, nello schema `public`. Il client è agganciato a `movement`
 * (`createClient<Database, 'movement'>`), quindi qui serve `.schema('public')` —
 * ed è la prima occorrenza di `.schema(` in tutto il repo.
 *
 * ⛔ PRIVACY — le colonne si chiedono UNA PER UNA, mai `select('*')`. `tax_code`,
 * `address`, `pregnancy` e `cycle_status` non compaiono nelle due liste, quindi non
 * attraversano nemmeno la rete: non finiscono nella cache di react-query, nel
 * pannello di rete o in un dump dello stato. Una whitelist che il server applica è
 * una barriera; un tipo `Omit` sul client no, perché `Object.entries` lo aggira.
 *
 * ⛔ SICUREZZA — nessuna politica di riga toccata, nessuna chiave privilegiata,
 * nessuna vista di comodo. Le tabelle di `public` sono già protette a livello di
 * database e questo hook legge con la sessione dell'utente, esattamente come farebbe
 * lui a mano. Di conseguenza è di sola lettura: qui non esiste nessuna scrittura.
 */

export type IntakeState =
  | { status: 'caricamento' }
  | { status: 'errore'; error: Error }
  /** Nessuna submission collegata a questo cliente. */
  | { status: 'assente' }
  | { status: 'presente'; submission: SubmissionSafe; screening: HealthSafe | null };

async function fetchIntake(clientId: string): Promise<
  { kind: 'assente' } | { kind: 'presente'; submission: SubmissionSafe; screening: HealthSafe | null }
> {
  const { data: subs, error: subErr } = await supabase
    .schema('public')
    .from('submissions')
    .select(SUBMISSION_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);

  // Un errore è un errore. Restituire «assente» qui direbbe «non ha mai compilato»
  // di un cliente che magari ha compilato: è proprio la bugia che questa schermata
  // esiste per non raccontare.
  if (subErr) throw subErr;

  const submission = (subs?.[0] ?? null) as SubmissionSafe | null;
  if (!submission) return { kind: 'assente' };

  const { data: hs, error: hsErr } = await supabase
    .schema('public')
    .from('health_screening')
    .select(HEALTH_SELECT)
    .eq('submission_id', submission.id)
    .maybeSingle();

  if (hsErr) throw hsErr;

  return { kind: 'presente', submission, screening: (hs ?? null) as HealthSafe | null };
}

/**
 * Lo stato dell'intervista per un cliente. Quando non ce n'è nessuna lo stato è
 * `assente` in modo esplicito, non un `null` che il chiamante deve interpretare.
 */
export function useIntake(clientId: string | undefined): IntakeState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['intake', clientId],
    queryFn: () => fetchIntake(clientId as string),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  if (!clientId || isLoading) return { status: 'caricamento' };
  if (error) return { status: 'errore', error: error as Error };
  if (!data || data.kind === 'assente') return { status: 'assente' };
  return { status: 'presente', submission: data.submission, screening: data.screening };
}
