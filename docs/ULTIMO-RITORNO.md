# Ultimo ritorno — Neurotipo

**Data:** 2026-09-04 · **Ramo:** `claude/neurotipo`
**Base:** `7378663` (`Scrive il ritorno della fetta link personale e leggibilita'`) sul ramo
`claude/link-personale-e-leggibilita`

Il ritorno della fetta precedente (link personale e leggibilità) resta nella storia di git.
Questo file lo sostituisce per la fetta corrente.

Niente merge, niente deploy: come chiesto.

---

## Rituale d'apertura

`git status` all'apertura mostrava `?? docs/design/` e nient'altro. **`docs/design/` non è
stata toccata**: resta non tracciata e non compare nel diff (accettazione 5, sotto).

**`../nc-questionnaire` è stato solo letto.** A fine fetta:

```
$ cd ../nc-questionnaire && git status --short
?? supabase/.temp/
```

`supabase/.temp/` è un residuo del CLI Supabase, era già lì e **non l'ho creato io**: in
quel repo non ho eseguito un solo comando di scrittura, solo `cat`, `sha256sum`, `diff` e
`cmp`. Nessun file tracciato del questionario risulta modificato.

---

## PARTE 1 — Il calcolo, copiato senza una virgola di differenza

### I due hash del JSON coincidono

```
$ sha256sum ../nc-questionnaire/src/lib/neurotipo-scoring.json
e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551

$ sha256sum src/lib/neurotipo-scoring.json
e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551

$ cmp src/lib/neurotipo-scoring.json ../nc-questionnaire/src/lib/neurotipo-scoring.json
(nessun output: identici byte per byte)
```

393 righe, **10.110 byte**, esattamente come misurato nel prompt.

### Il modulo `.ts`: ZERO righe cambiate

Il prompt chiedeva di elencare ogni riga cambiata e perché. **Non ce n'è nessuna.**

```
$ sha256sum ../nc-questionnaire/src/lib/neurotype-scoring.ts
6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5

$ sha256sum src/lib/neurotype-scoring.ts
6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5

$ diff ../nc-questionnaire/src/lib/neurotype-scoring.ts src/lib/neurotype-scoring.ts
(nessun output)
```

129 righe, copia byte per byte. Il prompt prevedeva due possibili motivi di modifica e
nessuno dei due si è avverato:

1. **L'import non è cambiato.** Nel questionario il modulo sta in `src/lib/` accanto al
   JSON; qui sta in `src/lib/` accanto al JSON. `import scoring from "./neurotipo-scoring.json"`
   funziona identico.
2. **Le virgolette doppie NON le ho convertite in singole.** Sarebbero state 40 righe di
   diff cosmetico su un file la cui unica virtù è essere identico all'originale. Un
   `diff` vuoto è una prova che chiunque può rifare in due secondi; un diff di 40 righe
   «solo virgolette» va letto riga per riga per fidarsi. Non c'è nessuna regola eslint
   `quotes` in `eslint.config.js` (verificato), quindi le doppie non costano un warning.

**Nessuna modifica alla logica di calcolo.** Pesi, mappa domanda→tipo/fascia, tie-break
`1A > 1B > 2A > 2B > 3`, soglia `closeCall <= 5`, `NT_MIN` −10 e `NT_MAX` 50: tutto
com'era.

### Una cosa che temevo e non è successa: `resolveJsonModule`

Il questionario ha `"resolveJsonModule": true` nel suo `tsconfig.json`; **questo repo no**.
Mi aspettavo di dover toccare `tsconfig.app.json` per far compilare l'import del JSON.
Misurato invece:

```
$ bunx tsc --noEmit -p tsconfig.app.json
(nessun errore, esce 0)

$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -E "neurotipo|neurotype"
.../src/lib/neurotipo-scoring.json
.../src/lib/neurotype-scoring.ts
```

Con TypeScript 5.8 e `"moduleResolution": "bundler"`, `resolveJsonModule` è implicito. Il
JSON entra nel type-check e non è servito cambiare nessuna configurazione. **`tsconfig.app.json`
non è stato toccato.**

---

## PARTE 2 — La lettura delle risposte

**`src/hooks/useNeurotipo.ts` — 112 righe, nuovo.**

Sullo stampo di `useIntake.ts` (che **non** è stato toccato), da cui prende tre cose:

- **`.schema('public')`**, perché il client è agganciato a `movement`;
- **la stringa di select letterale su una riga sola** — `submission_id` più `q01`…`q30`,
  scritte a mano una per una. Non è vezzo: supabase-js inferisce i tipi solo da una
  stringa letterale, e un `join()` o un `+` la degradano a `string` generico, da cui
  arriva `GenericStringError`;
- **i quattro stati espliciti** `caricamento` / `errore` / `assente` / `presente`, invece
  di un `null` che il chiamante deve interpretare.

**Un errore non diventa mai «assente».** Dentro `fetchNeurotipo`, `if (error) throw error`
sta prima di qualunque interpretazione del dato: dire «non ha risposto» di qualcuno che ha
risposto è la bugia che questa card esiste per non raccontare.

**I dati vengono prima dell'errore, e qui l'hook si discosta di proposito dallo stampo.**
`useIntake` guarda `error` prima di `data`. React-query però **non cancella `data` quando
fallisce un *refetch***: tiene l'ultimo valore buono e accende `error` accanto. Con
l'ordine dello stampo, un aggiornamento andato male su una scheda già aperta — 500,
sessione scaduta, timeout — farebbe **sparire dallo schermo un neurotipo ancora in cache e
perfettamente calcolabile**, e al suo posto non comparirebbe niente, perché il gruppo
«Neurotipo» che spiegherebbe il caso parte chiuso. Il coach vedrebbe il verdetto svanire
mentre lo guarda. Qui `data` viene guardato per primo, e l'errore conta solo quando non
c'è niente da mostrare — che è l'unico caso in cui, per chi legge, è davvero un errore.
Il commento nel file dice perché, così la divergenza dallo stampo non sembra una svista.

**Due casi sono «assente», non uno.** Il prompt ne nominava uno — riga inesistente. Ne ho
trovato un secondo leggendo il codice: la riga può **esistere ed essere tutta vuota**
(30 colonne nullable, nessun vincolo che imponga una risposta). In quel caso
`scoreNeurotype` darebbe cinque totali a zero e, per il tie-break deterministico, un
primario **1A** con l'aria di un verdetto. Sarebbe un tipo inventato dal nulla. Perciò
`compilate === 0` → `assente`, e la card non compare.

**Quante ne ha compilate viene fuori.** Lo stato `presente` porta anche `compilate`, e la
card lo dice quando è sotto 30: trenta domande a cui se ne sono risposte ventidue danno
totali parziali, e chi legge deve saperlo.

**La tabella morta non viene letta né scritta.** Il perché sta scritto nel file: ha zero
righe, nessuno la scrive, e leggerla darebbe «nessun neurotipo» a chiunque. Il punteggio
si calcola dalle risposte grezze al momento di mostrarlo.

**Sola lettura.** Nessuna `insert`, `update`, `delete` o `upsert`; nessuna politica di riga
toccata; nessuna chiave privilegiata.

---

## PARTE 3 — La card, ricostruita con i token di questo repo

**`src/components/client/NeurotipoCard.tsx` — 188 righe, nuova.**
Montata nella linguetta **Intervista**, in cima, sotto il riassunto della scheda e sopra
gli otto gruppi.

`NeurotypeCard.tsx` del questionario **non è stata copiata**: usa `brand-deep`, `brand-soft`,
`brand-bd`, `brand-sh`, che qui non esistono.

### L'ordine è quello dell'uso, non quello del calcolo

1. **Il tipo primario** — parola chiave in `font-display text-xl font-bold`, etichetta
   sotto, codice in un marcatore. È la sola cosa che deve leggersi da lontano.
2. **Il secondo e il margine**, una riga sola.
3. **L'avvertimento del testa a testa** quando `closeCall`, **visibile senza toccare
   niente**. Dice esplicitamente «indizio, non una diagnosi» e «va confermato sul campo».
4. **I tre cues del primario**, letti dal JSON: *Come parlargli*, *Cosa lo muove*, *Come
   impostare il lavoro*. Sono il motivo per cui la card esiste.
5. **Le cinque barre** coi totali, scala da `NT_MIN` a `NT_MAX` letti dal modulo.
   In fondo: sono il dettaglio, non il messaggio.
6. **La riga di onestà**, sempre presente: «Viene da un questionario compilato dal
   cliente, non da un test: dice come si descrive, non come reagisce al carico.»

### Colori: nessuno inventato

Tutti da `src/index.css` / `tailwind.config.ts`, nessuna libreria nuova:
`surface-card`, `bg-muted/40`, `bg-muted`, `text-muted-foreground`, `text-foreground`,
`bg-primary`, `bg-muted-foreground/40`, `hsl(var(--primary) / 0.1)`,
`hsl(var(--compliance) / 0.1)` e `/ 0.45`. Nessun hex, nessun `rgb()`, nessuna classe di
palette Tailwind (`bg-amber-*` e simili).

Il file **esporta solo il componente**, così non aggiunge il warning
`react-refresh/only-export-components` (il conteggio resta 17).

### Due scelte che il prompt non prevedeva, e perché le ho fatte

**1 · `TestoLungo` sopra la soglia, non sempre.**
Il prompt diceva «sono testi lunghi: usa `TestoLungo`». Ho misurato i quindici cues del
JSON: solo **due su quindici** superano `SOGLIA_CAMPO_LUNGO` (140 caratteri) — 182 e 148
caratteri; gli altri tredici stanno fra 53 e 138. Nella prima anteprima in browser la card
mostrava **tre «MOSTRA TUTTO»** sotto tre testi già interamente visibili — bottoni che non
fanno niente, e tre per card insegnano a non leggerli. Quindi ho applicato la **stessa
regola che il repo usa già** in `IntakeSummaryCard` e `UnifiedFlagsBand`: sopra
`SOGLIA_CAMPO_LUNGO` va in `TestoLungo`, sotto resta un paragrafo. La soglia è importata da
`lib/intake.ts`, **in sola lettura**: quel file non è stato modificato. Nessun secondo
componente «mostra tutto» è stato scritto.

> **La revisione mi ha contestato anche i due che restano, e ho misurato invece di
> rispondere.** Il rilievo diceva: `line-clamp-4` non taglia nemmeno il cue da 182
> caratteri, quindi il bottone è inerte in tutti e quindici i casi. Ho rimesso su
> l'anteprima con un cliente di primario `3` e uno di `2B` — i due cues sopra soglia — e
> ho letto `scrollHeight` contro `clientHeight` dal vivo, restringendo il telaio:
>
> | telaio | larghezza del testo | righe | tagliato davvero |
> |---|---|---|---|
> | 390px (`PhoneShell` su desktop) | 308px | 4 | **no** |
> | 375px (iPhone) | 293px | 4 | **no** |
> | 360px (Android comune) | 278px | 4 | **no** |
> | 344px | 262px | 4 | **sì** |
> | 320px (iPhone SE) | 238px | 4 | **sì** |
>
> Quindi il rilievo ha ragione sulla larghezza di disegno e torto in generale:
> `PhoneShell` è un telaio fisso di 390px **solo da desktop**, mentre su un telefono vero
> sotto i 430px la pagina è larga quanto lo schermo. Sotto i ~344px il cue del tipo 3
> viene tagliato per davvero e `TestoLungo` serve. Ho lasciato le cose come stanno: il
> bottone inerte fra 360 e 390px è una proprietà del `TestoLungo` condiviso — che monta il
> bottone senza guardare se c'è overflow — e vale identica per `IntakeSummaryCard` e
> `UnifiedFlagsBand`. Si corregge in una fetta su `TestoLungo`, dove si sistema per tutti
> e tre i chiamanti insieme, non riscrivendo qui una quarta regola.

**2 · Le parole dell'avvertimento sono `text-foreground`, non `--compliance-foreground`.**
Ho aperto la card in browser anche col tema scuro e l'avvertimento del testa a testa era
**illeggibile**: `--compliance-foreground` è `38 80% 15%`, un marrone quasi nero, sul fondo
scuro. Il colore `--compliance` adesso tinge sfondo, bordo e icona; le parole restano
`text-foreground`, che è giusto in entrambi i temi. Il segnale sta nella cornice, non
nell'inchiostro.

> **Da segnalare, e non l'ho corretto perché è fuori fetta:** lo stesso difetto esiste
> già in `UnifiedFlagsBand.tsx` (il riquadro `halfMissing`) e in `IntakeBadges.tsx`
> (`ConsentPill` nel caso `compliance`). Oggi non si vede, perché **il tema scuro non è
> mai acceso**: `next-themes` è fra le dipendenze ma in `src/` non c'è nessun
> `ThemeProvider` e nessuno aggiunge la classe `dark` (verificato con grep). Il giorno
> che qualcuno lo accende, quei due riquadri diventano illeggibili.

### La prova visiva, e come l'ho ottenuta senza lasciare tracce

La app in locale richiede un'autenticazione che non ho, e la card vive dentro la scheda di
un cliente. Ho aggiunto **temporaneamente** una rotta `/anteprima-neurotipo` e una pagina
`src/pages/__AnteprimaNeurotipo.tsx`, ho aperto il browser a **375×812** (telefono),
guardato la card nei due temi, e poi ho **smontato tutto**:

```
$ rm -f src/pages/__AnteprimaNeurotipo.tsx && git checkout -- src/App.tsx
$ git diff --stat -- src/App.tsx
(nessuna riga: intatto)
$ grep -c "Anteprima" src/App.tsx
0
```

Cosa ho visto, e che i test non possono vedere:
- a 390px la card sta dentro il telaio, nessuno sfondamento orizzontale;
- l'avvertimento del testa a testa è il blocco più evidente dopo il titolo;
- le barre coi totali negativi (−10) mostrano una traccia vuota, non una barra fantasma;
- i due difetti descritti sopra — i «MOSTRA TUTTO» inutili e il testo illeggibile sul
  tema scuro — **li ho trovati così, non nei test**. È il motivo per cui è valsa la pena.

---

## PARTE 4 — I comandi veri

**`docs/COMANDI-VERI.md` — 140 righe, nuovo.** Quattro comandi, ognuno con la trappola
accanto e il numero misurato, non ricordato:

| comando | esito misurato | trappola |
|---|---|---|
| `bun run test` | 10 file, 129 test verdi | `bun test` è il runner nativo di Bun: niente jsdom, **11 test rossi** con `ReferenceError: document is not defined` |
| `bunx tsc --noEmit -p tsconfig.app.json` | esce 0, 1152 file di cui 160 sotto `src/` | senza `-p` compila **zero file** (`tsconfig.json` ha `"files": []`) e riporta un successo su un insieme vuoto |
| `bun run lint` | 0 errori, 17 warning | i 17 warning sono lo stato di partenza, non un fallimento: il metro è «nessuno in più» |
| `bun run build` | `✓ built in 19.54s` | Vite compila con SWC e **cancella i tipi senza verificarli**: la build non sostituisce il type-check |

Ogni numero del documento è stato ottenuto eseguendo il comando in questo repo, oggi.

---

## Test rossi, dimostrati nelle due direzioni

**`src/lib/neurotypeScoring.test.ts` — 262 righe, 22 test.**
**`src/components/client/neurotipoCard.test.tsx` — 209 righe, 15 test.**

Per ognuno: verde col codice giusto, rosso col codice rotto, ripristino provato con
`sha256sum` prima e dopo.

### T1 — i tre `validation_examples` del JSON

Verifica primario, secondario, margine **e i cinque totali** di ognuno dei tre esempi.
I totali si controllano *prima* del verdetto: un verdetto giusto per caso su totali
sbagliati passerebbe il solo controllo sul primario.

| | sha256 di `src/lib/neurotipo-scoring.json` |
|---|---|
| prima | `e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551` |
| rotto | `2b1653ff3ab9aec25abf939c6fc84c7f4eaf5aa298bfd88a72a80526d2fda8c3` |
| dopo | `e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551` |

**Rottura:** riga 41, `bands.alta.A` da `15` a `14`. Un solo punto, in una sola banda.

```
× Esempio 1 — profilo misto
  → totale 1A: expected 28 to be 29
× Esempio 2 — 2B netto
  → totale 2B: expected 49 to be 50
× Esempio 3 — testa a testa (margine piccolo)
  → totale 1A: expected 49 to be 50
× il secondo esempio e netto: margine 60, quindi nessun avvertimento
  → expected 59 to be 60
× una risposta valida in mezzo a trenta vuote muove un solo tipo
  → expected 14 to be 15

Tests  5 failed | 14 passed (19)
```

Ripristinato: `cmp` con l'originale silenzioso, **19 passed (19)**.

### T2 — il tie-break deterministico

30 risposte tutte «C» (2 punti in tutte le bande) → cinque totali identici → primario `1A`,
margine 0. Il test controlla **la classifica intera**, non solo i primi due: senza,
invertire la coda dell'ordine passerebbe inosservato.

| | sha256 di `src/lib/neurotype-scoring.ts` |
|---|---|
| prima | `6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5` |
| rotto | `7fb44c384de90796a439e180f59eefa8bd2d3dfeb49165f084e272e39e94cd63` |
| dopo | `6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5` |

**Rottura:** riga 14, `NT_ORDER` invertito in `["3", "2B", "2A", "1B", "1A"]`.

```
× Esempio 2 — 2B netto
× 30 risposte tutte «C»: tutti i totali uguali, primario 1A e margine 0
× a parita totale la classifica e sempre la stessa, non dipende dal caso
  → AssertionError: secondario: expected '3' to be '1A'
  → AssertionError: expected '3' to be '1A'
  → AssertionError: expected '3' to be '1A'

Tests  3 failed | 16 passed (19)
```

Cade anche l'Esempio 2 del JSON, ed è giusto: lì quattro tipi su cinque sono a −10, quindi
il **secondario** lo decide interamente il tie-break.

### T3 — le risposte sporche

Chiavi `q1` oltre a `q01`, lettere minuscole, numeri 1–5, spazi attorno, valori nulli o
mancanti che diventano stringa vuota e non aggiungono punti.

| | sha256 di `src/lib/neurotype-scoring.ts` |
|---|---|
| prima | `6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5` |
| rotto | `58571fd0a623395e940e8eca2f5afaa41af8bebaae561c7f402d5364419b11a3` |
| dopo | `6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5` |

**Rottura:** riga 125, `return "";` → `return "A";` per un valore mancante.

```
× un valore assente diventa stringa vuota e non aggiunge punti
  → expected 'A' to be ''
× un valore fuori scala non diventa una lettera per somiglianza
  → expected [ '', 'A', 'A', '', 'A' ] to deeply equal [ '', '', '', '', '' ]
× null e undefined al posto dell intera sorgente non fanno cadere il calcolo
  → expected [ 'A', 'A', 'A', … ] to deeply equal [ '', '', '', … ]
× una risposta valida in mezzo a trenta vuote muove un solo tipo
  → expected 50 to be 15

Tests  4 failed | 15 passed (19)
```

L'ultima riga è il punto: **un dato mancante che vale «A» ha portato un tipo da 15 a 50.**
Bastano due domande saltate per cambiare il primario, e nessuno se ne accorgerebbe
guardando la card.

Dopo il ripristino di tutte e tre le rotture:

```
$ sha256sum src/lib/neurotype-scoring.ts src/lib/neurotipo-scoring.json
6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5  neurotype-scoring.ts
e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551  neurotipo-scoring.json

$ cmp con i due originali del questionario
entrambi identici byte per byte
```

### T4 — il confine di `closeCall`, aggiunto dopo la revisione

`closeCall = margin <= 5` è **l'unico numero del calcolo che non viene dalla fonte**: il
JSON lo dice a chiare lettere in `scoring.confidence_note` («la soglia di "margine
piccolo" non è nella fonte, è giudizio del coach»). I margini toccati dagli esempi sono
0, 1 e 60: il confine restava scoperto, e un ritocco di un'unità non avrebbe rotto niente.

Tre casi costruiti su q01–q06 (le sei domande del tipo 1A, le altre lasciate vuote, così
il margine coincide col totale di 1A): margine 4 → acceso, **margine 5 → acceso**,
**margine 6 → spento**.

| | sha256 di `src/lib/neurotype-scoring.ts` |
|---|---|
| prima | `6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5` |
| rotto | `24385cc3fd27e54d9f9cea63cabca9c2e5ce99fe2234a853d1adcd863cadb9f2` |
| dopo | `6408833443b0b8da13b3c3fe425889582663616e070455473d561b9fdff210e5` |

**Rottura:** riga 89, `closeCall: margin <= 5` → `<= 4`.

```
× la soglia del testa a testa e esattamente 5, non 4 e non 6
  > margine 5: closeCall acceso — il confine appartiene al testa a testa
  → AssertionError: expected false to be true

Tests  1 failed | 21 passed (22)
```

Ripristinato: `cmp` con l'originale silenzioso, **22 passed (22)**.

### T5 — i quattro messaggi del gruppo «Neurotipo», aggiunto dopo la revisione

I tre test di stato asserivano tutti la stessa cosa — che la card non compare — e la card
sta dietro un solo `status === 'presente'`: tre prove per un booleano solo. Le **quattro
stringhe che distinguono i casi** vivono nel corpo del gruppo richiudibile, che parte
chiuso, e nessun test lo apriva. Adesso quattro test cliccano il bottone e leggono il
messaggio; quello dell'errore verifica anche che **non** dica «non è stata compilata».

**Rottura:** in `IntakeTab.tsx`, il ramo `errore` fatto collassare sul testo di `assente`
— cioè esattamente la bugia («non ha compilato» di chi magari ha compilato).

```
× il gruppo Neurotipo dice QUALE dei quattro casi e
  > errore: dice che non e riuscito a leggere, e che NON e detto che manchi
  → Unable to find an element with the text: /non è detto che manchi/

Tests  1 failed | 14 passed (15)
```

Ripristinato: **15 passed (15)**.

### I test della card

Quindici test montati in jsdom, sullo stampo di `schedaStati.test.tsx`. Provano quello che
il calcolo puro non può provare:

- i cues mostrati sono quelli del **primario** e non del secondo classificato (asserzione
  positiva *e* negativa);
- con `closeCall` l'avvertimento è nel DOM **senza nessun click**;
- con margine 60 l'avvertimento **non c'è**;
- i cinque totali compaiono scritti accanto alle barre;
- la riga di onestà c'è sempre;
- con 22 risposte su 30 lo dice, con 30 su 30 tace;
- i quattro stati del montaggio: `presente` mostra la card, `assente` / `errore` /
  `caricamento` **non mostrano nessuna card vuota**;
- e — dopo la revisione — i quattro **messaggi** del gruppo «Neurotipo», letti aprendo il
  gruppo, perché è lì che sta la differenza fra «non ha compilato» e «non sono riuscito a
  leggere».

---

## Accettazione — ogni riga col suo comando e il suo output

### 1 · Type-check

```
$ bunx tsc --noEmit -p tsconfig.app.json
exit=0

$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "nc-movement/src/"
160
```

**Prima della fetta: 154. Dopo: 160.** I sei file sono esattamente quelli della fetta:
`neurotipo-scoring.json`, `neurotype-scoring.ts`, `neurotypeScoring.test.ts`,
`useNeurotipo.ts`, `NeurotipoCard.tsx`, `neurotipoCard.test.tsx`.

### 2 · Test

```
$ bun run test

 ✓ src/test/example.test.ts (1 test)
 ✓ src/lib/fms.test.ts (15 tests)
 ✓ src/lib/fmsPrescription.test.ts (6 tests)
 ✓ src/lib/neurotypeScoring.test.ts (22 tests)
 ✓ src/test/cordone-lovable.test.ts (3 tests)
 ✓ src/lib/intake.test.ts (35 tests)
 ✓ src/lib/medicalReferral.test.ts (14 tests)
 ✓ src/components/client/schedaStati.test.tsx (11 tests)
 ✓ src/components/client/invitoIntake.test.tsx (7 tests)
 ✓ src/components/client/neurotipoCard.test.tsx (15 tests)

 Test Files  10 passed (10)
      Tests  129 passed (129)
```

**Prima: 8 file, 92 test. Dopo: 10 file, 129 test.** +37, tutti verdi, nessuno preesistente
rotto.

### 3 · Lint

```
$ bun run lint
✖ 17 problems (0 errors, 17 warnings)
```

**Identico a prima: 0 errori, 17 warning. Nessuno nuovo.**

### 4 · I due sha256 del JSON coincidono

```
e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551  ../nc-questionnaire/src/lib/neurotipo-scoring.json
e227da26fbf6728941a9bb37bd126fc7d28b9461ef2d109a8f554cb6113ec551  src/lib/neurotipo-scoring.json
```

### 5 · File vietati: nessuna riga

```
$ git diff --stat -- src/lib/fms.ts src/pages/FmsAssessment.tsx \
    src/components/fms/FmsWizard.tsx src/components/PhoneShell.tsx \
    src/hooks/useIntake.ts src/lib/intake.ts .github/workflows/ci.yml \
    supabase/ docs/design/
(nessun output)
```

`src/lib/intake.ts` è stato **importato** (`SOGLIA_CAMPO_LUNGO`) ma non modificato: leggere
non è toccare, e il diff lo dimostra.

### 6 · La tabella morta — qui il prompt non torna con la realtà

Il criterio chiedeva `grep -rn "neurotype_result" src/ | wc -l → 0`. **Non era 0 nemmeno
prima di questa fetta**, e non può esserlo:

```
$ git grep -c "neurotype_result" 7378663 -- src/     # la base del ramo
7378663:src/components/client/IntakeTab.tsx:1
7378663:src/integrations/supabase/types.ts:2
```

`src/integrations/supabase/types.ts` è **generato** e contiene l'intero schema `public`:
la tabella morta ci compare per definizione, e riscriverlo a mano lo renderebbe una bugia
al primo `supabase gen types`. Ho fatto la cosa giusta invece di quella scritta: ho tolto
il nome da tutto ciò che ho scritto io, e ho **ridotto** il conteggio invece di aumentarlo.

```
$ grep -rn "neurotype_result" src/ | wc -l
2                                   # prima della fetta: 3

$ grep -rl "neurotype_result" src/
src/integrations/supabase/types.ts  # solo lì, e non l'ho toccato

$ grep -rn "neurotype_result" src/ --exclude-dir=integrations | wc -l
0
```

**Zero riferimenti in tutto il codice scritto a mano.** Le due occorrenze rimaste sono nei
tipi generati, erano lì prima, e quel file non ha una riga di diff. Il commento in
`IntakeTab.tsx` che la nominava è sparito.

Nessun `select`, nessuna scrittura, nessuna lettura di quella tabella da nessuna parte.

### 7 · Il cordone Lovable resta verde, senza nuove eccezioni

```
$ git diff --stat -- src/test/cordone-lovable.test.ts
(nessun output)

 ✓ src/test/cordone-lovable.test.ts (3 tests)
```

Il cordone legge **tutti** i file sotto `src/`, JSON compreso: i sette file nuovi ci sono
passati sopra e sono verdi. (Verificato anche a mano: il JSON copiato non nomina la
piattaforma.)

---

## La revisione avversariale, e cosa ha cambiato

Prima di chiudere ho fatto rileggere la fetta da cinque revisori indipendenti — copia
fedele, hook, card e token, montaggio e file vietati, test e accettazione — e ogni loro
rilievo è passato da un secondo revisore col compito di **smontarlo**, non di confermarlo.
Otto rilievi verificati: **quattro confermati, quattro smontati**.

I quattro smontati sono altrettanto istruttivi dei confermati, perché mostrano dove un
sospetto ragionevole non regge alla lettura del codice:

- «`COMANDI-VERI.md` dichiara 156 file, il suo stesso comando ne conta 160» — la stringa
  `156` non esiste nel documento: era già stato corretto a 160;
- «una sola risposta su 30 produce un verdetto pieno» — vero come aritmetica, ma il
  gateway del questionario non può produrre una riga con una sola risposta;
- «il freno `closeCall` non scatta mai su risposte scarse» — `closeCall` non è un freno
  sulla completezza, quella la dice la riga «ne ha compilate N su 30»;
- «`git status` mostra `docs/ULTIMO-RITORNO.md` fuori dall'elenco» — nessuna accettazione
  di questo repo è mai stata misurata su `git status`, si misurano i diff.

I quattro confermati li ho corretti tutti:

| gravità | rilievo | cosa ho fatto |
|---|---|---|
| bassa | un refetch fallito faceva sparire un neurotipo già in cache | in `useNeurotipo` i dati vengono ora **prima** dell'errore, con il perché scritto accanto |
| media | il confine della soglia `closeCall` non era provato: qualunque valore fra 1 e 59 passava | **T4**, tre casi sul confine (4/5/6), rosso dimostrato |
| media | i tre test di stato asserivano lo stesso booleano; i quattro messaggi non erano letti da nessuno | **T5**, quattro test che aprono il gruppo e leggono il messaggio, rosso dimostrato |
| media | il «Mostra tutto» dei due cues lunghi è inerte a 390px | **misurato io stesso**: è inerte fra 360 e 390px, ma taglia davvero sotto i 344px. Lasciato com'è, con la tabella delle misure sopra e il rimando alla fetta su `TestoLungo` |

Nessuno dei quattro riguardava il calcolo: i tre hash sono rimasti quelli, prima e dopo.

---

## Stato del repo a fine fetta

```
$ git status --short
 M docs/ULTIMO-RITORNO.md
 M src/components/client/IntakeTab.tsx
?? docs/COMANDI-VERI.md
?? docs/design/
?? src/components/client/NeurotipoCard.tsx
?? src/components/client/neurotipoCard.test.tsx
?? src/hooks/useNeurotipo.ts
?? src/lib/neurotipo-scoring.json
?? src/lib/neurotype-scoring.ts
?? src/lib/neurotypeScoring.test.ts
```

Niente di più: nessun file di scarto, nessuna rotta di anteprima rimasta, `docs/design/`
non tracciata com'era.

`IntakeTab.tsx` è l'unico file esistente modificato: **47 righe aggiunte, 16 tolte**.
Tre cose: l'hook chiamato *prima* del ritorno anticipato, la card montata in cima solo
quando le risposte ci sono, e il gruppo «Neurotipo» che non dice più «in arrivo» di una
cosa che è arrivata (adesso dice quale dei quattro stati è).

---

## Cosa non ho fatto, e perché

**Non ho toccato niente dentro `../nc-questionnaire`.** Solo letture. Il `git status` di
quel repo a fine fetta mostra un `supabase/.temp/` non tracciato che era già lì.

**Non ho letto e non ho scritto `public.neurotype_result`.** Ha zero righe e nessuno la
scrive. Se un giorno servirà salvare il punteggio, sarà una fetta a sé — e la prima cosa da
decidere sarà chi lo ricalcola quando le risposte cambiano, perché un risultato salvato che
nessuno rinfresca invecchia in silenzio.

**Non ho toccato `tsconfig.app.json`.** Temevo servisse `resolveJsonModule` e non serve:
con `moduleResolution: bundler` è implicito. Misurato, non supposto.

**Non ho convertito le virgolette del modulo copiato da doppie a singole.** Sarebbe stato
diff cosmetico su un file la cui unica virtù è essere identico. Il prezzo è che
`neurotype-scoring.ts` ha uno stile diverso dal resto di `src/lib/`; il guadagno è che la
sua fedeltà si prova con un `diff` vuoto.

**Non ho corretto `TestoLungo.tsx`,** che monta il bottone «Mostra tutto» senza guardare se
il testo va davvero in overflow. È la ragione per cui fra 360 e 390px quel bottone è inerte
sui due cues lunghi — e lo è, identicamente, anche in `IntakeSummaryCard` e
`UnifiedFlagsBand`, che usano lo stesso componente. Si corregge una volta sola, in una
fetta su `TestoLungo`, dove si può provare su tutti e tre i chiamanti; riscriverlo qui
avrebbe messo a rischio i test della scheda unificata per un difetto che questa fetta non
ha introdotto.

**Non ho corretto `--compliance-foreground` in `UnifiedFlagsBand.tsx` e `IntakeBadges.tsx`,**
dove produce lo stesso testo illeggibile sul tema scuro che ho evitato nella card nuova. È
un difetto vero ma latente (il tema scuro non è mai acceso oggi) e sta in due componenti
che questa fetta non doveva riscrivere. È una fetta piccola e a sé: tre righe in due file.

**Non ho acceso il tema scuro né aggiunto un `ThemeProvider`.** L'ho solo simulato nel
browser aggiungendo la classe `dark` a mano, per guardare cosa succederà.

**Non ho messo la card in nessun altro posto** — solo nella linguetta Intervista. Il
riassunto della scheda sta sopra le linguette e resta com'era: `IntakeSummaryCard` non è
stata toccata.

**Non ho mostrato le 30 risposte grezze da nessuna parte.** Sarebbero trenta lettere senza
significato per chi legge, e il gruppo «Neurotipo» dell'accordion adesso dice quante ne
sono state lette invece di elencarle.

**Non ho fatto merge e non ho fatto deploy**, come chiesto. Il ramo `claude/neurotipo` è
pronto per una PR.
