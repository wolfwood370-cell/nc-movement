# Ultimo ritorno — Clearing a tre stati

**Data:** 2026-09-04 · **Ramo:** `claude/clearing-tre-stati` · **Base:** `main` = `90d3171`
**PR:** [#4 — Clearing test a tre stati: il referto non dichiara più negativo ciò che nessuno ha misurato](https://github.com/wolfwood370-cell/nc-movement/pull/4)
**Run CI:** [33862416691](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33862416691)
**Prompt conservato:** [`docs/prompts/2026-09-04-clearing-tre-stati.md`](prompts/2026-09-04-clearing-tre-stati.md)

**Commit:** `f9c5006` (il codice) + il commit di documentazione che porta questo file.
Il ritorno della fetta precedente (type-check vero) resta nella storia di git e nella
[PR #3](https://github.com/wolfwood370-cell/nc-movement/pull/3).

---

## Rituale d'apertura — due divergenze, una delle quali pesa

`git status` era **pulito**, non con i due file attesi: `VALUTAZIONE-VENDITA-FMS.md` non
esiste nella working copy e `docs/design/` è una cartella **vuota** (git non traccia le
cartelle vuote). Come nella fetta precedente: due cose in meno, non in più. Nessuno dei due
è stato toccato o creato.

**La divergenza che pesa:** il prompt dice «Leggi `docs/design/DECISIONI.md` (§ clearing) e
`docs/design/componente-clearing-tre-stati.html` prima di scrivere: il disegno di questa
fetta esiste già», e al punto 3 indica l'HTML come riferimento visivo.

**Quei due file non esistono.** Né su disco, né in alcun commit, né su alcun branch:

```
$ find . -iname "*DECISIONI*" -o -iname "*clearing-tre-stati*" | grep -v node_modules
(nessun risultato)
$ git log --all --oneline -- 'docs/design/**'
(nessun risultato)
$ git ls-files docs/
docs/ULTIMO-RITORNO.md
docs/plan-lovable-storico.md
docs/prompts/2026-09-03-ci-verde.md
docs/prompts/2026-09-03-stacco-lovable.md
docs/prompts/2026-09-04-typecheck-vero.md
```

**Non ho fermato la fetta**, e la ragione è che il punto 3 il prompt lo descrive comunque in
prosa con precisione: quattro voci col loro stato, più la riga di nota col testo letterale. La
parte mancante è solo l'aspetto grafico, e per quello mi sono attenuto allo stile che
`MedicalReferralReport.tsx` già ha (serif, stampabile, `FindingsBlock` con `<ul><li>`).
**Se esiste un disegno che non ho visto, il componente va riguardato.**

---

## Dove ho messo la costante, e come la leggono wizard e referto

In **`src/lib/fms.ts`**, dopo `fmsMaxTotal` — **56 righe di sole aggiunte, zero rimozioni**:

```ts
export const CLEARING_KEYS = [
  'shoulder_clearing', 'spinal_extension', 'spinal_flexion', 'ankle_clearing',
] as const;
export type ClearingKey = (typeof CLEARING_KEYS)[number];

export const CLEARING_TEST_LABEL: Record<ClearingKey, string> = { /* le 4 etichette */ };

export const CLEARING_BY_TYPE: Record<FmsAssessmentType, readonly ClearingKey[]> = {
  full: CLEARING_KEYS,
  modified: ['shoulder_clearing', 'ankle_clearing'],
};

export const isClearingKey = (k: string): k is ClearingKey => /* ... */;
export const clearingKeysFor = (s) => CLEARING_BY_TYPE[isModifiedFms(s) ? 'modified' : 'full'];
```

**Il referto** (`medicalReferral.ts`) ne deriva lo stato con `clearingKeysFor(fms)`, leggendo
il tipo da `fms.assessment_type`: la riga ce l'aveva già, nessun parametro aggiunto.

**Il wizard** (`FmsWizard.tsx`) fa due cose. Il suo `ExtraKey` ora **è composto** dal tipo
condiviso, così un typo non compila:

```diff
-type ExtraKey = 'tibia' | 'hand' | 'ankle_clearing' | 'shoulder_clearing' | 'spinal_extension' | 'spinal_flexion';
+type ExtraKey = 'tibia' | 'hand' | ClearingKey;
```

e **filtra** i propri extra attraverso la costante:

```ts
const allowedClearing = useMemo(() => new Set<ClearingKey>(clearingKeysFor(scores)), [scores]);
const visibleExtras = (step.extras ?? []).filter(
  ex => !isClearingKey(ex) || allowedClearing.has(ex),
);
```

### Perché filtra e non genera — e perché da solo non basterebbe

Una verifica avversariale ha giustamente obiettato che **un filtro non rende la costante la
fonte unica**: può solo togliere da `step.extras`, mai aggiungere, quindi la conoscenza reale
resterebbe in `STEPS_MODIFIED`. È vero, e il prompt lo dice: «se le due strade divergessero
domani, il difetto tornerebbe».

Ma **generare** gli extra dalla costante è peggio, ed è dimostrabile: l'ospite di un clearing
**cambia col tipo** — `ankle_clearing` sta su *Inline Lunge* nella piena e su *ASLR* nella
modificata, dove Inline Lunge non esiste come step. Una lista piatta `ClearingKey[]` non
contiene quell'informazione: chi generasse gli extra da lì aggancerebbe `ankle_clearing` a uno
step inesistente, e il test **sparirebbe dalla FMS modificata senza un errore e senza un test
rosso**.

La soluzione è il filtro **più un cordone che rende la divergenza rossa**:

```ts
it.each([['full','STEPS_FULL'], ['modified','STEPS_MODIFIED']])(
  'gli step %s del wizard portano esattamente i clearing di CLEARING_BY_TYPE', (tipo, costante) => {
    expect([...clearingDichiaratiIn(costante)].sort()).toEqual([...CLEARING_BY_TYPE[tipo]].sort());
  });
```

Legge il sorgente di `FmsWizard.tsx` dal disco, come già fa il test di cordone in `src/test/`.
Le prove rosse (a) e (b) qui sotto lo dimostrano: **entrambe lo fanno scattare**.

### Il set di extra renderizzati non cambia

| tipo | step | prima | dopo |
|---|---|---|---|
| full | inline_lunge | `[ankle_clearing]` | `[ankle_clearing]` |
| full | shoulder_mobility | `[shoulder_clearing, hand]` | `[shoulder_clearing, hand]` |
| full | trunk_stability_pushup | `[spinal_extension]` | `[spinal_extension]` |
| full | rotary_stability | `[spinal_flexion]` | `[spinal_flexion]` |
| modified | shoulder_mobility | `[shoulder_clearing, hand]` | `[shoulder_clearing, hand]` |
| modified | aslr | `[ankle_clearing]` | `[ankle_clearing]` |

Il filtro oggi non toglie nulla: `full` ammette tutti e quattro, e la modificata già non
presenta i due spinali. `tibia` e `hand` non sono clearing, quindi passano sempre.

---

## Il referto prodotto da una modificata, testo com'esce

**A) FMS modificata, pulita** — il caso di 11 clienti su 21:

```
REPERTI CLINICI
  (nessun reperto critico rilevato nelle valutazioni piu recenti)

  TEST DI ESCLUSIONE — ESITO
   • NEGATIVO — Shoulder Clearing: nessun dolore riferito agli atti.
   • NON ESEGUITO — Spinal Extension Clearing: non somministrato — non fa parte del protocollo di questa valutazione.
   • NON ESEGUITO — Spinal Flexion Clearing: non somministrato — non fa parte del protocollo di questa valutazione.
   • NEGATIVO — Ankle Clearing: nessun dolore riferito agli atti.
   FMS modificata: estensione e flessione spinale non fanno parte del protocollo eseguito.

  hasFindings = false   |   lock clinico = false
```

**B) FMS modificata con Deep Squat 0** — il caso in cui il referto si apre davvero:

```
REPERTI CLINICI

  FMS — PATTERN DOLOROSI (PUNTEGGIO 0)
   • Punteggio 0 (dolore) in Deep Squat.

  TEST DI ESCLUSIONE — ESITO
   • NEGATIVO — Shoulder Clearing: nessun dolore riferito agli atti.
   • NON ESEGUITO — Spinal Extension Clearing: non somministrato — non fa parte del protocollo di questa valutazione.
   • NON ESEGUITO — Spinal Flexion Clearing: non somministrato — non fa parte del protocollo di questa valutazione.
   • NEGATIVO — Ankle Clearing: nessun dolore riferito agli atti.
   FMS modificata: estensione e flessione spinale non fanno parte del protocollo eseguito.

  hasFindings = true   |   lock clinico = true
```

**Prima** di questa fetta, entrambi stampavano lo stesso blocco clearing: **niente**. Il medico
leggeva un referto senza test di esclusione e concludeva che fossero tutti negativi.

---

## Tre scelte che il prompt non chiedeva, e perché le ho fatte

Il referto è un documento medico-legale firmato dal professionista e indirizzato a un medico.
Tre verifiche avversariali hanno convissuto sullo stesso punto, e avevano ragione.

### 1. Il dolore viene prima del protocollo, sempre

`hasCriticalRedFlags` è **cieco al tipo di FMS**: si accende su `clearing_spinal_extension_pain
= true` anche quando `assessment_type = 'modified'`. Se il referto valutasse prima
l'appartenenza al protocollo, una riga con quel flag a `true` su una modificata verrebbe
stampata «non eseguito» **mentre nella stessa schermata il cliente è bloccato su FCS/YBT/PT
Pack**. Il referto negherebbe per iscritto il motivo del blocco: l'unico modo in cui questa
fetta poteva peggiorare il problema che deve risolvere.

L'ordine è quindi `if (flag) → positive` **prima** di ogni considerazione di protocollo, ed è
pinnato da un test che asserisce insieme `status === 'positive'` e
`hasCriticalRedFlags(...).hasFlags === true`.

### 2. La voce negativa non dice «eseguito»

La formulazione naturale sarebbe «Test di esclusione negativo: X — eseguito, nessun dolore
riferito». **«Eseguito» è un'asserzione di fatto su un atto clinico che nessun dato sostiene:**
i flag sono `Switch` che partono a `false` e non richiedono alcuna interazione, quindi nel
database `false` non distingue «chiesto e risposto no» da «mai chiesto». È esattamente il
difetto che questa fetta elimina — e scriverlo lo farebbe passare **da omissione a
dichiarazione firmata**.

Il testo dichiara quindi cosa risulta agli atti, non cosa è stato fatto al paziente:

```
Shoulder Clearing: nessun dolore riferito agli atti.
```

Per lo stesso motivo **la lateralità resta solo sui positivi**: «Shoulder Clearing
(bilaterale): negativo» si leggerebbe come un reperto. C'è un test che lo pinna.

### 3. `hasFindings` conta solo i positivi

`hasFindings` sommava `clearing.length`. Con quattro voci sempre presenti sarebbe diventato
**sempre vero appena esiste una FMS**, e il referto avrebbe chiesto una valutazione
specialistica a chiunque. Ora filtra su `status === 'positive'`, e vale esattamente quanto
valeva prima. Sopra le righe c'è un commento che spiega il perché a chi aggiungerà il prossimo
blocco.

**Nota onesta:** quel ramo è oggi quasi irraggiungibile, perché il bottone che apre il referto
è disabilitato salvo `risk === 'critical'` — un gate che vive in `InsightsTab.tsx`, file
vietato. Non è una rete di sicurezza voluta: basta togliere quel `disabled` e la bugia si
armerebbe da sola.

Ho inoltre cambiato il **titolo del blocco** da «Test di Esclusione Positivi» a «Test di
Esclusione — Esito»: intitolare «Positivi» una lista di negativi è peggio del difetto di
partenza. E la nota richiesta al punto 3 è renderizzata **fuori dalla `<ul>`**, come `<p>` in
corsivo: dentro avrebbe ereditato il pallino e su carta si sarebbe letta come un quinto reperto.

---

## Acceptance, voce per voce

### 1. Una modificata produce quattro voci, i due spinali `not-performed`, mai `negative` ✅

Test `una FMS modificata produce quattro voci, con i due spinali NON ESEGUITI e mai negativi`.
Asserisce `toHaveLength(4)`, `not-performed` su entrambi gli spinali, `negative` sui due
somministrati, e che `Spinal Extension Clearing` **non** compaia fra i negativi.

### 2. Una piena con tutti i flag a `false` produce quattro `negative` ✅

Test `una FMS piena con tutti i flag a false produce quattro NEGATIVI e nessun non eseguito`:
`every(status === 'negative')` e `some(status === 'not-performed') === false`.

### 3. Un positivo resta positivo e conserva la lateralità ✅

Test dedicato su tre casi: `(sinistro)` su una piena, `(destro)` su una **modificata**,
`(bilaterale)`. Più un test che verifica che la lateralità **non** finisca sulle altre voci.

### 4. 🔴 Tre prove rosse, nei due sensi, con ripristino byte-identico ✅

| prova | md5 sano | md5 sondato | md5 ripristino | esito sonda |
|---|---|---|---|---|
| **(a)** togliere `spinal_extension` da `full` | `c7d77417…` | `5bf91e49…` | `c7d77417…` ✅ | **2 test rossi** |
| **(b)** aggiungere `spinal_extension` a `modified` | `c7d77417…` | `f14ddc86…` | `c7d77417…` ✅ | **2 test rossi** |
| **(c)** emettere `negative` invece di `not-performed` | `eda6319f…` | `d150894d…` | `eda6319f…` ✅ | **1 test rosso** |

Gli errori, letterali:

```
(a)  → expected false to be true                                          [i quattro negativi]
     → expected [ 'ankle_clearing', …(3) ] to deeply equal [ …(2) ]        [cordone wizard↔costante]
(b)  → expected 'negative' to be 'not-performed'                          [i due spinali]
     → expected [ 'ankle_clearing', …(1) ] to deeply equal [ …(2) ]        [cordone wizard↔costante]
(c)  → expected 'negative' to be 'not-performed'
```

Le prove (a) e (b) fanno scattare **anche il cordone**: è la dimostrazione che la divergenza
fra wizard e costante non può passare silenziosa.

**Una nota sugli md5, perché altrimenti i numeri non tornano.** Al primo `git checkout` di un
file, `.gitattributes` (`* text=auto eol=lf`) normalizza CRLF→LF e **l'md5 su disco cambia pur
restando `git status` vuoto**. Le tre prove qui sopra sono state eseguite partendo da file già
normalizzati, e sono byte-identiche. La verifica che il contenuto *tracciato* non sia mai
cambiato è più forte dell'md5:

```
$ git hash-object src/lib/medicalReferral.ts   → 155628def7554a84924b0d58ae27c97b4044f31a
$ git rev-parse HEAD:src/lib/medicalReferral.ts → 155628def7554a84924b0d58ae27c97b4044f31a
$ git status --porcelain                        → (vuoto)
```

### 5. Il lock clinico è invariato ✅ — e **esisteva già un test parziale**

Test `il lock clinico non si accende su una modificata con tutti i clearing a false`, che
verifica `hasFlags === false`, `hasClearingPain === false` e `hasFindings === false`.

**Dichiarazione richiesta:** un test equivalente esisteva **solo per la FMS piena** —
`fms.test.ts`, «nessun red flag su FMS vuota», che usa `emptyFmsScores()` con
`assessment_type: 'full'`. Per la **modificata** non ce n'era nessuno, ed è il caso che
riguarda 11 clienti su 21. Il nuovo test sta in `medicalReferral.test.ts` perché
`fms.test.ts` non è fra i file modificabili.

La prova più forte è strutturale: **`src/lib/fms.ts` ha 56 inserzioni e 0 rimozioni**.
`hasCriticalRedFlags` non è stata sfiorata.

```
$ git diff --stat src/lib/fms.ts
 src/lib/fms.ts | 56 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 56 insertions(+)
$ git diff src/lib/fms.ts | grep "^-" | grep -v "^---"
(nessuna riga)
```

E `not-performed` non può accendere nulla, perché l'unico consumatore di `.clearing` in tutto
`src/` è `MedicalReferralReport.tsx`. `ClientDetail.tsx` e `macroAnalytics.ts` chiamano
`hasCriticalRedFlags` sulla riga grezza: hanno **zero righe di diff**.

### 6. I cinque test esistenti restano verdi e non riscritti ✅

```
$ git diff src/lib/medicalReferral.test.ts | grep "^-" | grep -v "^---"
-import { emptyFmsScores } from '@/lib/fms';
```

**L'unica riga rimossa è l'import**, che ho esteso per aggiungere `hasCriticalRedFlags`,
`CLEARING_KEYS` e `CLEARING_BY_TYPE`. I corpi dei cinque test non sono stati toccati: 145
inserzioni, 1 rimozione.

**Ma vanno detti due limiti.** Il test 2 (`does NOT double-count a clearing-forced zero`)
asserisce `data.clearing.some(c => c.test === 'Shoulder Clearing')`: dopo questa fetta quella
voce **c'è sempre**, quindi quell'asserzione passerebbe anche con un'implementazione che
ignora del tutto i flag di dolore. Non l'ho riscritto perché il prompt lo vieta, ma la
copertura che perde è ricoperta dai nuovi test, che asseriscono lo `status` e non la presenza.

### 7. I cancelli ✅

```
$ bunx tsc --noEmit -p tsconfig.app.json   → EXIT=0
$ bun run lint                             → ✖ 17 problems (0 errors, 17 warnings) · EXIT=0
$ bun run test                             → Test Files 5 passed · Tests 39 passed (30 + 9 nuovi) · EXIT=0
$ bun run build                            → ✓ built · EXIT=0
```

**Sulla CI vera**, [run 33862416691](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33862416691),
job `verify` → **success in 22s**, con i tre passi eseguiti: `Lint`, `Test` e `Type-check`
(quest'ultimo, dalla fetta precedente, esegue `bunx tsc --noEmit -p tsconfig.app.json` senza
`continue-on-error`, quindi un errore di tipo nei nuovi test avrebbe bocciato il run).

**Un incidente da raccontare, perché è istruttivo.** A metà lavoro `bun run lint` ha riportato
**170 warning** invece di 17. Non era il mio codice: gli agenti di verifica avevano lasciato
nove `git worktree` sotto `.claude/worktrees/`, ognuno una copia completa del repo, ed
`eslint .` li stava analizzando. Rimossi con `git worktree remove`, il conteggio è tornato a 17.
Vale la pena saperlo: `.claude/` è in `.gitignore` ma **eslint non legge `.gitignore`**.

E un secondo, ancora più istruttivo: il primo giro di test è andato **rosso sul cordone dello
stacco**, perché un mio commento citava per nome il file `src/test/cordone-*.test.ts` e la
regex `/lovable/i` vieta quella parola in tutto `src/`. Il cordone ha funzionato esattamente
come previsto, su di me. Ho riformulato il commento.

### 8. File toccati ✅

```
$ git diff --name-only origin/main...HEAD
docs/ULTIMO-RITORNO.md
docs/prompts/2026-09-04-clearing-tre-stati.md
src/components/fms/FmsWizard.tsx
src/components/insights/MedicalReferralReport.tsx
src/lib/fms.ts
src/lib/medicalReferral.test.ts
src/lib/medicalReferral.ts
```

I **vietati a zero righe**:

```
$ git diff --stat origin/main...HEAD -- src/lib/insights.ts src/lib/fmsPrescription.ts \
    src/lib/ptPackProgram.ts src/pages src/integrations supabase docs/design \
    tsconfig.json tsconfig.app.json tsconfig.node.json .github/workflows/ci.yml
(nessun output)
```

---

## Ciò che ho visto e non ho toccato

Ordinato per quanto pesa. Nessuna di queste cose è stata modificata: sono tutte fuori fetta, e
tre su cinque vivono in file vietati.

**1. «Una sola fonte di verità» non è ancora vera, e il file che manca è quello che ha creato
il problema.** `src/pages/FmsAssessment.tsx` (vietato) è una **seconda UI completa** di
inserimento FMS che sa per conto proprio quali clearing appartengono a quale protocollo, con
due `!modified` scritti a mano. Ed è il codice che al passaggio full→modified **azzera
`clearing_spinal_*_pain` a `false`**: è lui che ha prodotto i 14 record da cui nasce questa
fetta. Dopo questo lavoro le fonti sono **due**, non una. Oggi concordano; niente lo garantisce
domani. Il cordone che ho aggiunto pinna il wizard, **non quella pagina**.

**2. `Ankle Clearing` ha un esito che il referto non guarda.** Non è un booleano: è uno
`StoplightSelector` (`ankle_clearing_left/right`, `'green'|'yellow'|'red'|null`) **più** due
flag di dolore. Il referto legge solo i flag. Quindi un cliente con semaforo `'red'` e nessun
dolore viene certificato «Ankle Clearing: negativo», mentre `deriveClinicalConstraints` lo
tratta già come vincolo. E i semafori sono `null` di default senza che nulla obblighi a
compilarli: è lo stesso «non misurato ma stampato negativo», spostato dalla colonna spinale a
quella della caviglia.

**Perché non l'ho corretto:** derivarne `not-performed` **violerebbe l'acceptance 2** di questa
fetta, che richiede quattro `negative` su una piena con tutti i flag a `false` — con i semafori
a `null`, che è il default, ne uscirebbero due `not-performed`. La definizione di
`not-performed` data dal prompt è «non appartiene al protocollo», e a quella mi sono attenuto.
Ho mitigato con il linguaggio: «nessun dolore riferito agli atti» non certifica normalità.

**3. Lo stesso difetto esiste un livello sopra, ed è più grande.** In una FMS modificata non
vengono eseguiti **4 pattern su 7** — Hurdle Step, Inline Lunge, Trunk Stability Push-Up,
Rotary Stability. `computePatterns` li filtra via, il referto non li vede, e il blocco si
intitola «FMS — Pattern Dolorosi (Punteggio 0)» come se coprisse lo screening completo. Un
medico che lo legge vuoto conclude «nessun pattern doloroso», esattamente come prima concludeva
«clearing negativi». Correggerlo tocca `computePatterns`, che alimenta il lock: è una fetta a
sé e va fatta con la stessa cura.

**4. Il bottone che apre il referto ignora il dolore alla caviglia.** `computeRisk` in
`insights.ts` (vietato) somma cinque flag e **omette** `ankle_clearing_left/right_pain`, mentre
`hasCriticalRedFlags` e il referto li includono. Un cliente con solo dolore alla caviglia ha
FCS/YBT/PT Pack bloccati ma `risk = 'high'`, non `'critical'`: il bottone resta disabilitato
con la scritta «Nessun reperto da rinviare», e il referto che non si può aprire conterrebbe
«Test di esclusione positivo: Ankle Clearing». Preesistente. Correggerlo cambierebbe il livello
di rischio di clienti reali.

**5. `CLEARING_BY_TYPE` unifica un asse, non tutti.** Restano cinque definizioni diverse di
«clearing positivo»: `hasCriticalRedFlags` (7 flag), `getCorrectivePriority` (zeri dei pattern
più la sola caviglia), `computeRisk` (5 flag senza caviglia), `buildReferralData` (7 flag
raggruppati in 4 test), `deriveClinicalConstraints` (che aggiunge i semafori). Questa costante
risponde solo a «questo test fa parte del protocollo?», che è ortogonale. **La frammentazione è
identica a prima**, ed è scritto anche nel commento sopra la costante perché non si venda
un'unificazione che non c'è.

**6. Due dettagli minori.** La nota «FMS modificata: estensione e flessione spinale…» compare
quando c'è almeno un `not-performed`: nel caso raro di una modificata con un dato di dolore
spinale anomalo, resta vera (quel test *non* fa parte del protocollo) ma convive con una voce
POSITIVO sullo stesso test. E la voce positiva stampa «POSITIVO — Test di esclusione
positivo: …», leggermente ridondante: ho tenuto la descrizione **identica a oggi** come il
prompt richiede, e il tag è quello che rende leggibile la lista.

**7. Sull'attribution.** Il prompt chiedeva `Co-Authored-By: Claude <noreply@anthropic.com>`;
l'ambiente di esecuzione impone `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` come
regola che sostituisce le precedenti. Ho seguito l'ambiente, come nella fetta scorsa.
