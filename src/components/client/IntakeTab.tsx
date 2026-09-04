import { useState } from 'react';
import { ChevronDown, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import InvitoIntakeCard from '@/components/client/InvitoIntakeCard';
import NeurotipoCard from '@/components/client/NeurotipoCard';
import { useNeurotipo } from '@/hooks/useNeurotipo';
import type { HealthSafe, SubmissionSafe, ConsentBadge } from '@/lib/intake';

/**
 * La quarta linguetta: l'intervista d'ingresso, negli otto gruppi che si aprono
 * di proposito.
 *
 * ⛔ Gravidanza, ciclo, codice fiscale e indirizzo NON compaiono qui. Non è una
 * dimenticanza: questa scheda non li chiede nemmeno al server (vedi la whitelist in
 * `lib/intake.ts`), quindi non esistono in memoria. Il prompt li ammetterebbe dentro
 * i gruppi Salute e Anagrafica; ho preferito una garanzia eseguita a una dichiarata,
 * al costo di due gruppi meno ricchi. Per mostrarli servirà una lettura separata,
 * fatta solo all'apertura del gruppo.
 */

interface Props {
  clientId: string;
  submission: SubmissionSafe | null;
  screening: HealthSafe | null;
  consent: ConsentBadge;
  /**
   * L'intervista è stata CERCATA e non c'è. Non è `!submission`: durante il
   * caricamento e in caso di errore `submission` è già null, e in nessuno dei due
   * casi so che il questionario manchi. Invitare qualcuno che ha già compilato, o
   * mentre ancora non lo so, è il modo più rapido di far arrivare un link inutile.
   */
  intakeAssente: boolean;
}

const PARQ: Array<[keyof HealthSafe, string]> = [
  ['parq_heart', 'Cuore'],
  ['parq_chest_pain', 'Dolore al torace sotto sforzo'],
  ['parq_balance', 'Equilibrio'],
  ['parq_other_chronic', 'Altre patologie croniche'],
  ['parq_meds', 'Farmaci'],
  ['parq_msk', 'Problema osteoarticolare'],
  ['parq_supervised', 'Supervisione medica'],
];

export default function IntakeTab({ clientId, submission, screening, consent, intakeAssente }: Props) {
  const [aperto, setAperto] = useState<string | null>(null);

  // Le 30 risposte del neurotipo vivono in una tabella a parte dello stesso schema
  // `public`, e si leggono da qui perché è qui che si mostrano. La chiamata sta PRIMA
  // del ritorno anticipato: un hook dopo un `if` cambia l'ordine degli hook fra un
  // render e l'altro, ed è il modo classico di rompere React senza accorgersene.
  const neuro = useNeurotipo(submission?.id);

  if (!submission) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center gap-3 text-center">
          <FileQuestion className="w-8 h-8 text-muted-foreground" />
          <p className="font-display text-sm font-semibold">Nessuna intervista collegata</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Questo cliente non ha un questionario d'ingresso collegato. Gli otto gruppi
            compaiono qui appena viene compilato.
          </p>
        </div>
        {/* Il modo di rimediare sta subito sotto il vuoto che lo richiede, non altrove. */}
        {intakeAssente && <InvitoIntakeCard clientId={clientId} />}
      </div>
    );
  }

  const gruppi: Array<{ key: string; titolo: string; corpo: React.ReactNode }> = [
    {
      key: 'obiettivi',
      titolo: 'Obiettivi',
      corpo: <Campi voci={[['Obiettivo principale', submission.main_goal], ['Obiettivo di movimento', submission.movement_goal]]} />,
    },
    {
      key: 'salute',
      titolo: 'Salute e PAR-Q',
      corpo: screening ? (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1">
            {PARQ.map(([k, label]) => (
              <li key={k} className="flex items-center justify-between gap-2 text-xs">
                <span>{label}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    screening[k] === true
                      ? 'bg-pain text-destructive-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {screening[k] === true ? 'Sì' : 'No'}
                </span>
              </li>
            ))}
          </ul>
          <Campi
            voci={[
              ['Dolore attuale', screening.pain_now === true ? (screening.pain_where ?? 'riferito') : screening.pain_now === false ? 'No' : null],
              ['Infortuni passati', screening.past_injuries],
              ['Farmaci e condizioni', screening.conditions_meds],
            ]}
          />
          <p className="text-[10px] italic leading-snug text-muted-foreground">
            Gravidanza e stato del ciclo restano fuori da questa scheda: non vengono
            nemmeno letti dal database.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Screening sanitario non compilato.</p>
      ),
    },
    {
      key: 'allenamento',
      titolo: 'Allenamento',
      corpo: <Campi voci={[['Esperienza', submission.experience_level], ['Giorni a settimana', submission.max_days_week], ['Minuti a sessione', submission.session_minutes]]} />,
    },
    {
      key: 'logistica',
      titolo: 'Logistica',
      corpo: <Campi voci={[['Disponibilità', submission.availability], ['Attrezzatura', submission.equipment], ['Modalità di lavoro', submission.work_mode]]} />,
    },
    {
      key: 'anagrafica',
      titolo: 'Anagrafica',
      corpo: (
        <div className="flex flex-col gap-2">
          <Campi voci={[['Nome nel questionario', submission.full_name], ['Telefono', submission.phone], ['Email', submission.email]]} />
          <p className="text-[10px] italic leading-snug text-muted-foreground">
            Codice fiscale e indirizzo restano fuori da questa scheda: non vengono
            nemmeno letti dal database.
          </p>
        </div>
      ),
    },
    {
      key: 'consenso',
      titolo: 'Consenso',
      corpo: (
        <Campi
          voci={[
            ['Stato', consent.status === 'firmato' ? 'Firmato sulla versione in vigore' : consent.status === 'versione-superata' ? 'Firmato su versione superata' : 'Mai firmato'],
            ['Versione firmata', consent.signedVersion],
            ['Versione corrente', consent.currentVersion],
          ]}
        />
      ),
    },
    {
      key: 'nutrizione',
      titolo: 'Nutrizione',
      corpo: <p className="text-xs text-muted-foreground">Non letta da questa scheda.</p>,
    },
    {
      key: 'neurotipo',
      titolo: 'Neurotipo',
      // Il calcolo adesso c'è, e sta nella scheda in cima a questa linguetta: qui
      // dentro resterebbe chiuso dietro un tocco, e un tipo che decide come si parla
      // a una persona non si nasconde in un gruppo richiudibile. Questo riquadro dice
      // solo dove guardare — o perché non c'è niente da guardare.
      corpo: (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {neuro.status === 'presente'
            ? `Calcolato dalle ${neuro.compilate} risposte lette: il risultato è nella scheda in cima a questa linguetta.`
            : neuro.status === 'caricamento'
              ? 'Sto leggendo le 30 risposte.'
              : neuro.status === 'errore'
                ? 'Non sono riuscito a leggere le risposte: il neurotipo non è calcolabile adesso, e non è detto che manchi.'
                : 'Le 30 risposte non ci sono: il questionario è collegato ma la sezione neurotipo non è stata compilata.'}
        </p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Il neurotipo sta in cima alla linguetta, sotto il riassunto della scheda e
          sopra gli otto gruppi: è un verdetto che si legge, non un dettaglio che si
          apre. Compare SOLO quando le risposte ci sono davvero — in caricamento, in
          errore e senza risposte non esiste una card vuota da mostrare, e il gruppo
          «Neurotipo» qui sotto dice quale dei tre casi è. */}
      {neuro.status === 'presente' && (
        <NeurotipoCard answers={neuro.answers} compilate={neuro.compilate} />
      )}

      <div className="surface-card overflow-hidden">
        {gruppi.map((g, i) => (
          <div key={g.key} className={cn(i > 0 && 'border-t border-border')}>
            <button
              onClick={() => setAperto(aperto === g.key ? null : g.key)}
              className="flex w-full items-center justify-between gap-2 p-3.5 text-left"
            >
              <span className="text-sm font-medium">{g.titolo}</span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', aperto === g.key && 'rotate-180')} />
            </button>
            {aperto === g.key && <div className="px-3.5 pb-3.5">{g.corpo}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Una voce senza valore non stampa un trattino: sparisce, come nel riassunto. */
function Campi({ voci }: { voci: Array<[string, string | null | undefined]> }) {
  const vive = voci.filter(([, v]) => (v ?? '').trim().length > 0);
  if (!vive.length) return <p className="text-xs text-muted-foreground">Nessuna risposta in questo gruppo.</p>;
  return (
    <dl className="flex flex-col gap-1.5">
      {vive.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3">
          <dt className="text-[11px] text-muted-foreground shrink-0">{k}</dt>
          <dd className="text-xs text-right break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
