import { Brain, ScanSearch } from 'lucide-react';
import TestoLungo from '@/components/client/TestoLungo';
import { SOGLIA_CAMPO_LUNGO } from '@/lib/intake';
import { scoreNeurotype, NT_MIN, NT_MAX } from '@/lib/neurotype-scoring';

/**
 * Il neurotipo: chi ho davanti, in ordine di cio' che serve a chi legge.
 *
 * Chi legge e' un allenatore, in palestra, sul telefono, con trenta secondi. Quindi
 * l'ordine non e' quello del calcolo ma quello dell'uso: prima il tipo, poi quanto ci
 * si puo' contare, poi come parlargli — e solo alla fine i numeri.
 *
 * I tre cues sono il motivo per cui questa card esiste. Il codice «2B» non dice a
 * nessuno cosa fare lunedi' mattina; «carichi pesanti, pause lunghe, volume bassissimo»
 * si'. Sopra `SOGLIA_CAMPO_LUNGO` usano `TestoLungo`, lo stesso del riassunto e delle
 * bandiere: quattro righe e poi si aprono, col testo intero sempre nel DOM. Sotto la
 * soglia restano un paragrafo e basta — la stessa regola del riassunto, e per lo
 * stesso motivo: un «Mostra tutto» sotto tre righe gia' tutte visibili e' un bottone
 * che non fa niente, e tre bottoni cosi' per card insegnano a non leggerli.
 *
 * Le cinque barre stanno in fondo di proposito. Sono il dettaglio che serve quando si
 * vuole controllare il verdetto, non il verdetto: metterle in cima farebbe leggere per
 * primo un grafico a cinque voci invece di una parola.
 *
 * ⚠️ NIENTE CACHE — il punteggio si calcola qui, a ogni render, dalle risposte grezze.
 * La tabella dei punteggi gia' calcolati che esiste sul database e' vuota e resta
 * vuota: non viene ne' letta ne' scritta (il perche' sta in `useNeurotipo`). Un
 * risultato salvato che nessuno ricalcola invecchia in silenzio, e in silenzio smette
 * di corrispondere alle risposte da cui e' nato.
 */

/** Le tre voci del JSON, nell'ordine in cui servono a chi allena. */
const CUES: Array<{ chiave: 'comunicazione' | 'motivazione' | 'allenamento'; titolo: string }> = [
  { chiave: 'comunicazione', titolo: 'Come parlargli' },
  { chiave: 'motivazione', titolo: 'Cosa lo muove' },
  { chiave: 'allenamento', titolo: 'Come impostare il lavoro' },
];

export default function NeurotipoCard({
  answers, compilate,
}: {
  /** Le 30 risposte gia' normalizzate in lettere A–E; il vuoto resta vuoto. */
  answers: string[];
  /** Quante delle 30 sono compilate davvero: sotto 30 il calcolo e' parziale. */
  compilate: number;
}) {
  const score = scoreNeurotype(answers);
  const { primary, secondary, margin, closeCall, ranked } = score;

  return (
    <div className="surface-card p-3.5 flex flex-col gap-3.5">
      {/* --- Il tipo primario: e' la sola cosa che deve leggersi da lontano --- */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Brain className="w-3 h-3" />
            Neurotipo
          </p>
          <h3 className="mt-1 font-display text-xl font-bold leading-tight break-words">
            {primary.keyword}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground break-words">
            {primary.label}
          </p>
        </div>
        <span
          className="shrink-0 rounded-lg px-2.5 py-1 font-display text-sm font-bold tabular-nums"
          style={{
            background: 'hsl(var(--primary) / 0.1)',
            color: 'hsl(var(--primary))',
          }}
        >
          {primary.code}
        </span>
      </div>

      {/* --- Il secondo e la distanza fra i due, su una riga sola --- */}
      <p className="text-xs leading-snug text-muted-foreground">
        Secondo: <span className="font-medium text-foreground">{secondary.keyword}</span>{' '}
        ({secondary.code}) · margine{' '}
        <span className="font-semibold tabular-nums text-foreground">{margin}</span>{' '}
        {margin === 1 ? 'punto' : 'punti'}
      </p>

      {/* --- Testa a testa: si dice subito, senza doverlo toccare per vederlo ---
          Nasconderla dietro un tocco significherebbe che chi ha fretta — cioe'
          sempre — legge il primario come se fosse certo. Con un punto di distanza
          non lo e'. */}
      {closeCall && (
        <p
          className="flex items-start gap-1.5 rounded-lg border p-2 text-[11px] leading-snug text-foreground"
          style={{
            background: 'hsl(var(--compliance) / 0.1)',
            borderColor: 'hsl(var(--compliance) / 0.45)',
          }}
        >
          {/* Il colore `--compliance` tinge sfondo, bordo e icona; le PAROLE restano
              `text-foreground`. Scriverle in `--compliance-foreground` — che e' un
              marrone quasi nero — le rende illeggibili sul fondo scuro il giorno che
              il tema scuro verra' acceso, e un avvertimento illeggibile e' peggio di
              nessun avvertimento. Il segnale sta nella cornice, non nell'inchiostro. */}
          <ScanSearch
            className="w-3.5 h-3.5 mt-px shrink-0"
            style={{ color: 'hsl(var(--compliance))' }}
          />
          <span>
            Testa a testa: {primary.code} e {secondary.code} distano {margin}{' '}
            {margin === 1 ? 'punto' : 'punti'}. Con un margine così stretto il risultato
            è un <strong className="font-semibold">indizio, non una diagnosi</strong>:
            va confermato sul campo, guardando come risponde al carico nelle prime sedute.
          </span>
        </p>
      )}

      {/* --- I tre cues: e' la parte che si usa, non quella che si guarda --- */}
      <div className="flex flex-col gap-2.5">
        {CUES.map(({ chiave, titolo }) => {
          const testo = primary.cues[chiave];
          const lungo = testo.length > SOGLIA_CAMPO_LUNGO;
          return (
            <div key={chiave} className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {titolo}
              </p>
              {lungo ? (
                <div className="mt-0.5">
                  <TestoLungo testo={testo} className="text-xs leading-snug" />
                </div>
              ) : (
                <p className="mt-0.5 text-xs leading-snug break-words">{testo}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* --- I cinque totali, in fondo: il dettaglio, non il messaggio --- */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          I cinque totali · scala da {NT_MIN} a {NT_MAX}
        </p>
        {ranked.map(t => {
          const quota = Math.round(((t.total - NT_MIN) / (NT_MAX - NT_MIN)) * 100);
          const eIlPrimo = t.code === primary.code;
          return (
            <div key={t.code} className="flex items-center gap-2">
              <span
                className={`w-7 shrink-0 text-[11px] font-semibold tabular-nums ${
                  eIlPrimo ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t.code}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${eIlPrimo ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                  style={{ width: `${quota}%` }}
                />
              </div>
              <span
                className={`w-7 shrink-0 text-right text-[11px] tabular-nums ${
                  eIlPrimo ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t.total}
              </span>
            </div>
          );
        })}
      </div>

      {/* --- L'onesta' va scritta in pagina, non solo nel codice ---
          Chi legge deve sapere da dove viene il numero prima di costruirci sopra un
          programma: e' un questionario che ha compilato il cliente, con quello che
          pensa di se', non una misura fatta in palestra. */}
      <p className="text-[10px] italic leading-snug text-muted-foreground">
        Viene da un questionario compilato dal cliente, non da un test: dice come si
        descrive, non come reagisce al carico.
        {compilate < 30 && (
          <>
            {' '}Qui poi ne ha compilate <strong className="not-italic font-semibold">{compilate} su 30</strong>:
            i totali sono parziali e le domande senza risposta valgono zero, non una media.
          </>
        )}
      </p>
    </div>
  );
}
