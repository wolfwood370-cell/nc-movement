import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  QUESTIONARIO_BASE_URL, linkIntake, statoInvito, type StatoInvito,
} from '@/lib/intake';

/**
 * Il link personale con cui si invita un cliente a compilare il questionario.
 *
 * Legge tre colonne di `movement.clients` e chiama le due funzioni che il database
 * espone già: `genera_invito_intake` e `annulla_invito_intake`. Nessuna scrittura parte
 * da qui — avviene dentro la funzione, che controlla `private.is_admin()` prima di
 * toccare la riga. In questo file non esiste nessuna `update`.
 *
 * ⚠️ `genera_invito_intake` RIGENERA: crea un token nuovo e invalida il precedente.
 * Chi usa questo hook deve dirlo all'utente prima che prema, e la card lo fa.
 */

/** Le tre colonne che questa fetta chiede. Letterale, come le whitelist di `intake.ts`. */
const INVITO_SELECT = 'intake_token,intake_token_scade_il,intake_inviato_il' as const;

/**
 * Trenta giorni. È anche il default lato database, ma scritto qui per non dipenderne
 * in silenzio — ed esportato perché la card possa dirlo all'utente senza ricopiarlo.
 */
export const GIORNI_VALIDITA = 30;

interface RigaInvito {
  intake_token: string | null;
  intake_token_scade_il: string | null;
  intake_inviato_il: string | null;
}

interface ErrorePostgrest {
  message: string;
  code?: string;
}

interface Esito<T> {
  data: T;
  error: ErrorePostgrest | null;
}

/**
 * ⛔ L'unico punto in cui il client Supabase viene guardato attraverso un'altra lente.
 *
 * `src/integrations/supabase/types.ts` è un file GENERATO ed è più vecchio del
 * database: non conosce le quattro colonne `intake_*` né le due funzioni. Rigenerarlo è
 * una fetta a sé — 1700 righe generate — quindi la distanza fra i tipi e la realtà
 * resta confinata qui, in un'interfaccia scritta a mano che ricopia la firma vera,
 * letta sul server con `pg_get_functiondef` prima di scrivere queste righe:
 *
 *   movement.genera_invito_intake(cliente uuid, giorni integer DEFAULT 30)
 *     RETURNS TABLE(token uuid, scade_il timestamptz)
 *   movement.annulla_invito_intake(cliente uuid) RETURNS void
 *
 * Il client è già agganciato allo schema `movement`, quindi niente `.schema()`.
 */
interface ClientConInvito {
  from(tabella: 'clients'): {
    select(colonne: typeof INVITO_SELECT): {
      eq(colonna: 'id', valore: string): {
        maybeSingle(): Promise<Esito<RigaInvito | null>>;
      };
    };
  };
  rpc(
    funzione: 'genera_invito_intake',
    argomenti: { cliente: string; giorni: number },
  ): Promise<Esito<Array<{ token: string | null; scade_il: string | null }> | null>>;
  rpc(
    funzione: 'annulla_invito_intake',
    argomenti: { cliente: string },
  ): Promise<Esito<null>>;
}

const db = supabase as unknown as ClientConInvito;

/**
 * L'errore del server, detto in italiano.
 *
 * Le due funzioni sollevano «non autorizzato» con SQLSTATE 42501 quando chi chiama non
 * è amministratore: è il caso più probabile e merita una frase, non un codice. Tutto il
 * resto passa com'è — inventare una spiegazione è peggio che mostrare il messaggio.
 */
function inItaliano(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? '');
  if (/non autorizzato/i.test(m) || /42501/.test(m)) {
    return 'Non hai i permessi per gestire il link: serve un profilo amministratore.';
  }
  if (/cliente inesistente/i.test(m) || /P0002/.test(m)) {
    return 'Il server non trova questo cliente.';
  }
  return m.trim() || 'Errore sconosciuto dal server.';
}

export interface InvitoIntake {
  stato: StatoInvito;
  token: string | null;
  scadeIl: string | null;
  /**
   * `intake_inviato_il`, cioè QUANDO il link è stato creato. La colonna si chiama
   * «inviato» ma nessuno invia niente: la funzione la valorizza con `now()` al momento
   * della generazione. Il nome resta quello del database; l'etichetta in pagina no.
   */
  creatoIl: string | null;
  /** Il link completo, e solo col token vivo. Un link scaduto non si mostra: non serve. */
  link: string | null;
  caricamento: boolean;
  errore: Error | null;
  /** Vero mentre una delle due azioni è in volo: i bottoni si spengono. */
  inCorso: boolean;
  /** L'errore dell'ultima azione, già in italiano. Null quando non ce n'è. */
  erroreAzione: string | null;
  genera: () => void;
  annulla: () => void;
}

export function useInvitoIntake(clientId: string | undefined): InvitoIntake {
  const qc = useQueryClient();
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);

  const chiave = useMemo(() => ['invito-intake', clientId] as const, [clientId]);

  const { data, isLoading, error } = useQuery({
    queryKey: chiave,
    queryFn: async (): Promise<RigaInvito | null> => {
      const { data: riga, error: err } = await db
        .from('clients')
        .select(INVITO_SELECT)
        .eq('id', clientId as string)
        .maybeSingle();
      // Un errore è un errore. Restituire `null` direbbe «nessun link» di un cliente
      // che magari ce l'ha, e il coach ne genererebbe un secondo invalidando il primo —
      // cioè romperebbe un link già in mano a qualcuno per colpa di una lettura fallita.
      if (err) throw new Error(err.message);
      return riga ?? null;
    },
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });

  const invalida = useCallback(
    () => { void qc.invalidateQueries({ queryKey: chiave }); },
    [qc, chiave],
  );

  const generaM = useMutation({
    mutationFn: async () => {
      const { data: righe, error: err } = await db.rpc('genera_invito_intake', {
        cliente: clientId as string, giorni: GIORNI_VALIDITA,
      });
      if (err) throw new Error(err.code ? `${err.message} (${err.code})` : err.message);
      // La funzione torna una TABELLA: la riga utile è la prima. Nessuna riga vuol dire
      // che la generazione non è avvenuta, e va detto — non mostrato come un link
      // costruito su `undefined`.
      const riga = righe?.[0];
      if (!riga?.token) throw new Error('Il server non ha restituito nessun token.');
      return riga;
    },
    onSuccess: () => { setErroreAzione(null); invalida(); },
    onError: (e: unknown) => setErroreAzione(inItaliano(e)),
  });

  const annullaM = useMutation({
    mutationFn: async () => {
      const { error: err } = await db.rpc('annulla_invito_intake', { cliente: clientId as string });
      if (err) throw new Error(err.code ? `${err.message} (${err.code})` : err.message);
    },
    onSuccess: () => { setErroreAzione(null); invalida(); },
    onError: (e: unknown) => setErroreAzione(inItaliano(e)),
  });

  // `new Date()` sta qui e non dentro `statoInvito`: la funzione pura resta provabile
  // senza congelare l'orologio del processo.
  const stato = useMemo(
    () => statoInvito(data?.intake_token, data?.intake_token_scade_il, new Date()),
    [data],
  );

  const token = data?.intake_token ?? null;

  const genera = useCallback(() => { setErroreAzione(null); generaM.mutate(); }, [generaM]);
  const annulla = useCallback(() => { setErroreAzione(null); annullaM.mutate(); }, [annullaM]);

  return {
    stato,
    token,
    scadeIl: data?.intake_token_scade_il ?? null,
    creatoIl: data?.intake_inviato_il ?? null,
    link: stato === 'vivo' && token ? linkIntake(QUESTIONARIO_BASE_URL, token) : null,
    caricamento: !!clientId && isLoading,
    errore: (error as Error) ?? null,
    inCorso: generaM.isPending || annullaM.isPending,
    erroreAzione,
    genera,
    annulla,
  };
}
