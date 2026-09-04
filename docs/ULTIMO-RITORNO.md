# Ultimo ritorno — Link personale e leggibilità

**Data:** 2026-09-04 · **Ramo:** `claude/link-personale-e-leggibilita`
**Base:** `cccfde7` (`Scrive il ritorno della fetta scheda unificata`) sul ramo `claude/scheda-unificata`
**Commit:** `73b6b73` (il codice) + il commit di documentazione che porta questo file

Il ritorno della fetta precedente (scheda unificata) resta nella storia di git e nella
[PR #5](https://github.com/wolfwood370-cell/nc-movement/pull/5). Questo file lo sostituisce
per la fetta corrente.

Niente merge, niente deploy: come chiesto.

---

## Rituale d'apertura

`git status` all'apertura mostrava `?? docs/design/` e nient'altro. **`docs/design/` non è
stata toccata**: resta non tracciata, e infatti non compare nel diff (verificato sotto,
accettazione 5).

---

## Il contesto, verificato invece che creduto

Il prompt diceva «non fidarti, verifica». Ho verificato, e su due punti la realtà non
coincide con il prompt. Li dico subito perché cambiano il codice.

### Verificato e confermato

Interrogato il progetto Supabase `srrmauojpficdswmtjya` (quello di `.env`):

- le quattro colonne `intake_token`, `intake_token_scade_il`, `intake_inviato_il`,
  `intake_sollecitato_il` **esistono** su `movement.clients`, tutte nullable, `uuid` la
  prima e `timestamptz` le altre tre;
- le due funzioni **esistono**, `SECURITY DEFINER`, con `execute` concesso a
  `postgres` e `authenticated` e a nessun altro (né `PUBLIC`, né `anon`);
- entrambe controllano `private.is_admin()` e sollevano `non autorizzato` con
  SQLSTATE `42501` se il chiamante non lo è.

Ho letto anche il corpo con `pg_get_functiondef`, e ne ho ricavato due cose che il
prompt non diceva e che sono finite nel codice:

1. `genera_invito_intake` valorizza anche **`intake_inviato_il = now()`** e azzera
   `intake_sollecitato_il`. Quindi la colonna «inviato» in realtà segna **quando il link
   è stato creato**, non quando è stato mandato a qualcuno — in questa fetta *niente
   invia niente*. L'hook la espone col nome onesto `creatoIl` e il commento lo dice.
2. `giorni` è vincolato lato server a `greatest(1, least(coalesce(giorni,30), 365))`.
   I 30 giorni che passo sono dentro il vincolo.

**Niente sotto `supabase/` è stato toccato, e nessuna migrazione è stata scritta.**

### Discrepanza 1 — i tipi generati sono più vecchi del database

`src/integrations/supabase/types.ts` **non conosce** né le quattro colonne `intake_*` né
le due funzioni: nello schema `movement` il blocco `Functions` è letteralmente
`[_ in never]: never`. Scritto come nel prompt

```ts
const { data, error } = await supabase.rpc('genera_invito_intake', { … });
```

il type-check **non passa**, ed è il passo che il CI esegue per ultimo.

Tre strade: rigenerare `types.ts` (1700 righe generate, diff enorme, fetta a sé),
spargere `any` sui punti di chiamata, oppure confinare la distanza fra tipi e realtà in
un punto solo. Ho scelto la terza: in `useInvitoIntake.ts` c'è **una** interfaccia
scritta a mano, `ClientConInvito`, che ricopia la firma vera letta sul server, e **un**
solo `as unknown as`. Da lì in poi tutto è tipizzato davvero — `token` e `scade_il`
esistono, `giorni` è un numero, e chi sbaglia nome di colonna se ne accorge subito.
La firma copiata è scritta nel commento sopra l'interfaccia, così il giorno che
`types.ts` verrà rigenerato si vede cosa cancellare.

### Discrepanza 2 — un test di cancello esistente vietava l'indirizzo del questionario

`src/test/cordone-lovable.test.ts` va rosso se la stringa `/lovable/i` compare in
`package.json`, `vite.config.ts` o **qualunque file sotto `src/`**. L'accettazione 6
chiede invece che `https://nc-questionnaire.lovable.app` compaia **esattamente una
volta in `src/`**. Le due cose, come stanno scritte, si escludono.

Non ho indebolito il cordone spegnendolo su un file. Ho tolto dal testo **solo quella
stringa esatta**, presa dalla costante e non ricopiata nel test:

```ts
const senzaEccezione = (testo: string): string =>
  testo.split(QUESTIONARIO_BASE_URL).join('');
```

Effetto: il cordone continua a beccare la parola ovunque, **anche dentro `intake.ts`
stesso** — solo quell'indirizzo passa. E siccome il test importa la costante invece di
riscriverla, l'eccezione **sparisce da sola** il giorno che il modulo entrerà dentro
NC Movement e la costante cambierà. L'accettazione 6 continua a tornare 1.

### Discrepanza 3 — `bun test` non è il comando dei test di questo repo

Il prompt dice `bun test`. `bun test` invoca il **runner nativo di Bun**, che non ha
jsdom configurato: **sul commit base, prima di toccare qualsiasi cosa, falliva già 5
test** con `ReferenceError: document is not defined`.

```
 65 pass
 5 fail
Ran 70 tests across 7 files. [1.88s]
```

Il comando vero — quello di `package.json` e del CI (`.github/workflows/ci.yml`, passo
«Test») — è `bun run test`, cioè `vitest run`, che legge `vitest.config.ts` con
`environment: "jsdom"`. Tutti i numeri qui sotto usano `bun run test`.

---

## Che cosa ho cambiato, file per file

### File nuovi (4)

| File | Righe | Cosa fa |
|---|---:|---|
| `src/hooks/useInvitoIntake.ts` | 200 | Legge le tre colonne, chiama le due RPC, invalida la query. Nessuna `update` parte da qui. |
| `src/components/client/InvitoIntakeCard.tsx` | 258 | I tre stati del link: genera / mostra e copia / rigenera e annulla. |
| `src/components/client/TestoLungo.tsx` | 44 | Quattro righe di `line-clamp` più un bottone apri/chiudi. Un'implementazione sola per i due posti che ne hanno bisogno. |
| `src/components/client/invitoIntake.test.tsx` | 140 | Sette prove sulla card (vedi «Un test in più del richiesto»). |

### File modificati (9)

| File | +/− | Cosa |
|---|---:|---|
| `src/lib/intake.ts` | +85 / −1 | `QUESTIONARIO_BASE_URL`, `StatoInvito`, `statoInvito()`, `linkIntake()`, `SOGLIA_CAMPO_LUNGO`, e `lungo` su `SummaryField` calcolato in `buildIntakeSummary`. |
| `src/lib/intake.test.ts` | +93 / −0 | T1 (8 casi) e T2 (3 casi). |
| `src/components/client/UnifiedFlagsBand.tsx` | +42 / −21 | Il dettaglio lungo scende sotto l'etichetta come blocco troncato; quello corto resta in linea fra virgolette. |
| `src/components/client/schedaStati.test.tsx` | +84 / −1 | T3 e tre prove gemelle (campo corto, dettaglio lungo, dettaglio corto). |
| `src/components/client/IntakeTab.tsx` | +21 / −9 | Due prop nuove (`clientId`, `intakeAssente`) e la card montata sotto il vuoto che la richiede. Tolta la riga «Invio del modulo: in arrivo». |
| `src/components/client/IntakeSummaryCard.tsx` | +20 / −2 | Il campo lungo prende `col-span-2` e passa da `TestoLungo`. |
| `src/test/cordone-lovable.test.ts` | +18 / −1 | L'eccezione mirata descritta sopra. |
| `src/pages/ClientDetail.tsx` | +7 / −1 | Le due prop nuove passate a `IntakeTab`. |
| `src/components/client/TwoTracks.tsx` | +5 / −3 | La riga «Invio del modulo: in arrivo» non è più vera: adesso dice dove si genera il link. |

Totale sui file tracciati: **+375 / −39**.

### Le tre decisioni che non erano scritte nel prompt

**`intakeAssente` non è `!submission`.** Durante il caricamento e in caso di errore
`submission` è già `null`, e in nessuno dei due casi so che il questionario manchi.
`ClientDetail` passa `intake.status === 'assente'`, cioè «l'ho cercato e non c'è».
Senza questa distinzione la card lampeggerebbe a ogni apertura della linguetta, e
inviterebbe qualcuno di cui non so ancora niente.

**Anche «Annulla» chiede conferma, non solo «Rigenera».** Il prompt lo impone solo per
Rigenera. Annullare è più distruttivo — non resta nessun link — e usa lo stesso identico
meccanismo già in pagina: è una riga di `state` in più, non un pezzo nuovo. Il testo
delle due conferme è diverso perché le conseguenze sono diverse.

**Il bottone di annullamento della conferma si chiama «Lascia stare», non «Annulla».**
«Annulla» in quella card significa già *annulla il link*: due «Annulla» adiacenti con
significato opposto sono il modo più rapido di far cancellare un link per sbaglio.

---

## I test rossi, dimostrati nelle due direzioni

Hash presi **prima** delle rotture:

```
353512f1882ba3b1968089067b6c71f047ef943574235f5625e910627ca66172 *src/lib/intake.ts
83ea0cf38cba6eebb04ea5c7255e042cc02a68fbb6206b2c8f5d08d320272a58 *src/components/client/TestoLungo.tsx
```

### T1 — `statoInvito`, cinque casi più il confine

Rottura: in `src/lib/intake.ts`, `istante > ora.getTime()` diventa `istante < ora.getTime()`.

```
ROTTURA T1 applicata: > diventa <
   × intake — lo stato del link personale > scadenza nel futuro: vivo, anche di un solo secondo
     → expected 'scaduto' to be 'vivo' // Object.is equality
   × intake — lo stato del link personale > scadenza nel passato: scaduto, anche di un solo secondo
     → expected 'vivo' to be 'scaduto' // Object.is equality
 Test Files  1 failed (1)
      Tests  2 failed | 33 passed (35)
```

### T2 — `buildIntakeSummary` marca i campi lunghi

Rottura: `SOGLIA_CAMPO_LUNGO` da `140` a `100000`.

```
ROTTURA T2 applicata: soglia 140 -> 100000
   × intake — i campi lunghi si dichiarano lunghi > un conditions_meds da 400 caratteri e lungo, un main_goal da 20 no
AssertionError: expected false to be true // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 34 passed (35)
```

### T3 — il campo lungo si tronca e si apre

Rottura: il `<button>` tolto da `TestoLungo.tsx`.

```
ROTTURA T3 applicata: bottone rimosso
   × leggibilita sul telefono … > il riassunto: il campo lungo prende la riga intera, si tronca e si apre
     → Unable to find an accessible element with the role "button" and name "Mostra tutto"
   × leggibilita sul telefono … > le bandiere: il dettaglio lungo scende sotto l etichetta invece di allungare la riga
     → Unable to find an accessible element with the role "button" and name "Mostra tutto"
 Test Files  1 failed (1)
      Tests  2 failed | 9 passed (11)
```

### Ripristino byte per byte

```
$ sha256sum src/lib/intake.ts src/components/client/TestoLungo.tsx
353512f1882ba3b1968089067b6c71f047ef943574235f5625e910627ca66172 *src/lib/intake.ts
83ea0cf38cba6eebb04ea5c7255e042cc02a68fbb6206b2c8f5d08d320272a58 *src/components/client/TestoLungo.tsx

$ sha256sum -c   # contro gli hash presi prima
src/lib/intake.ts: OK
src/components/client/TestoLungo.tsx: OK
```

Identici. Le rotture non sono rimaste nel ramo.

### Il limite di T3, dichiarato

jsdom **non fa layout**: non posso contare i pixel e affermare che il testo esce dallo
schermo. Quello che T3 prova davvero, e che è scritto nel commento del test:

- il testo **intero** è nel DOM (`paragrafo.textContent` è identico alla stringa
  d'origine) — cioè non c'è nessuno `slice()` che mutila un'anamnesi;
- il paragrafo porta `line-clamp-4` mentre è chiuso e **non** ce l'ha dopo il click:
  il troncamento c'è, è in CSS, e si toglie al tocco;
- il riquadro sta in `col-span-2`, cioè occupa la riga intera;
- il bottone esiste, ha `aria-expanded="false"`, e dopo il click dice «Riduci» con
  `aria-expanded="true"`.

Contare i pixel richiederebbe un browser vero con l'app autenticata. Non l'ho fatto,
ed è scritto sotto fra le cose non fatte.

---

## Accettazione, riga per riga

### 1. Type-check

```
$ bunx tsc --noEmit -p tsconfig.app.json
exit=0
```

Nessun output, uscita 0.

```
$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "/src/"
174
```

**Il numero è cresciuto, non calato — ma non partiva da 141.** Misurato sul commit base
prima di toccare qualsiasi cosa: **170**. Il conteggio `grep "/src/"` include 20 file di
`node_modules` che hanno una cartella `src/`; i file **di questo repo** sono:

```
$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "nc-movement/src/"
154        # erano 150 sul commit base
```

+4, esattamente i quattro file nuovi. Il 141 del prompt è il numero di una fetta
precedente, non quello di partenza di questa.

### 2. Test

```
$ bun run test
 ✓ src/test/example.test.ts (1 test)
 ✓ src/lib/fms.test.ts (15 tests)
 ✓ src/lib/fmsPrescription.test.ts (6 tests)
 ✓ src/test/cordone-lovable.test.ts (3 tests)
 ✓ src/lib/intake.test.ts (35 tests)
 ✓ src/lib/medicalReferral.test.ts (14 tests)
 ✓ src/components/client/schedaStati.test.tsx (11 tests)
 ✓ src/components/client/invitoIntake.test.tsx (7 tests)

 Test Files  8 passed (8)
      Tests  92 passed (92)
```

**Prima: 70 test in 7 file. Dopo: 92 test in 8 file.** +22.
(Con `bun test`, il runner nativo, erano 65 pass / 5 fail **già prima** di questa fetta.)

### 3. Lint

```
$ bun run lint
✖ 17 problems (0 errors, 17 warnings)
lint_exit=0
```

**Identico al commit base: 0 errori, gli stessi 17 warning preesistenti**, tutti in file
che questa fetta non tocca (`FcsAssessment`, `FmsAssessment`, `FmsSetup`,
`SfmaAssessment`, `YbtAssessment`, e un `eslint-disable` inutile in `ClientDetail`).
Nessun warning nuovo introdotto.

### 4. Colonne riservate in `useIntake.ts` — **non torna 0, e non poteva**

```
$ grep -c "tax_code\|address\|pregnancy\|cycle_status" src/hooks/useIntake.ts
2
```

Le due occorrenze sono nel commento `⛔ PRIVACY` in testa al file, righe 14–15, e
**c'erano già prima di questa fetta**:

```
$ git show HEAD:src/hooks/useIntake.ts | grep -c "tax_code\|address\|pregnancy\|cycle_status"
2
$ git diff --stat -- src/hooks/useIntake.ts
(vuoto: il file è intatto)
```

Il criterio come scritto è incompatibile con «il file può restare identico»: per portarlo
a 0 dovrei **cancellare il divieto scritto**, che è la parte del file che spiega perché
quelle colonne non ci sono. Non l'ho fatto. L'invariante vera — che le colonne non
attraversino la rete — regge, ed è provata dal cancello che già esiste:

```
✓ intake — il cancello della privacy > le quattro colonne riservate non sono nella richiesta al server
✓ intake — il cancello della privacy > nessun file della scheda le nomina
```

Le due stringhe di `select` sono byte per byte quelle di prima.

### 5. File vietati — zero righe

```
$ git diff --stat -- src/lib/fms.ts src/pages/FmsAssessment.tsx \
    src/components/fms/FmsWizard.tsx src/components/PhoneShell.tsx \
    .github/workflows/ci.yml supabase/ docs/design/
(nessun output)
```

`docs/design/` resta non tracciata, esattamente com'era all'apertura.

### 6. La base del questionario in un file solo

```
$ grep -rn "nc-questionnaire.lovable.app" src/ | wc -l
1
$ grep -rn "nc-questionnaire.lovable.app" src/
src/lib/intake.ts:99:export const QUESTIONARIO_BASE_URL = 'https://nc-questionnaire.lovable.app';
```

### 7. Nessuna finestra di sistema

```
$ grep -rn "window.confirm\|[^.]alert(" src/components/client/ | wc -l
0
```

Nota: la prima misura tornava **1** — e il colpevole era un *commento* di
`InvitoIntakeCard.tsx` che diceva di non usare `window.confirm`. Ho riscritto il
commento senza nominarlo. La conferma è in pagina, a due tocchi, mai in una finestra.

---

## Un test in più del richiesto, e perché

Il prompt chiedeva tre test. Ne ho scritti quattro gruppi: il quarto è
`invitoIntake.test.tsx`, sette prove sulla card dell'invito.

La ragione è la frase d'apertura del prompt: *«un link che va copiato e mandato a una
persona vera»*. Senza questo file la card sarebbe stata l'unico pezzo della fetta mai
montato, e il pezzo con più conseguenze fuori dallo schermo. Le sette prove sono:

- **assente** → un solo bottone, e chiama `genera`; nessun campo da copiare;
- **scaduto** → dice che il precedente non funziona più, offre di rifarlo, e **non
  mostra** il link morto;
- **vivo** → il link intero in un campo `readOnly` selezionabile, «Scade il 4 ottobre»
  per esteso, il bottone «Copia link»;
- **rigenera** → la frase «smetterà di funzionare» compare **prima**, e `genera` **non
  è stato chiamato** finché non arriva il secondo gesto;
- **«Lascia stare»** → non tocca niente;
- **copia fallita** → jsdom non ha `navigator.clipboard`, che è precisamente il caso da
  coprire: compare «copialo a mano» e il campo col link è ancora tutto lì;
- **errore di lettura** → dice che non riesce a leggere, e **non offre nessun bottone**:
  generare al buio ucciderebbe un link magari vivo.

L'hook è sostituito con `vi.mock` perché parla col database; la sua logica di stato è
già provata pura in T1.

---

## Cosa non ho fatto, e perché

**Non ho aperto il browser.** La app in locale richiede un'autenticazione che non ho, e
la card dell'invito vive dentro la scheda di un cliente. Ho verificato con i test montati
in jsdom, che è ciò che il CI esegue. Di conseguenza **non ho misurato i pixel**: che
quattro righe di `line-clamp` bastino davvero a 390px è una scelta di disegno provata sul
meccanismo, non sulla resa. È la prima cosa da guardare quando l'app sarà aperta su un
telefono vero.

**Non ho rigenerato `src/integrations/supabase/types.ts`.** Serve, ed è una fetta a sé:
sono 1700 righe generate e il diff seppellirebbe questa. Finché non si fa, la distanza
fra tipi e database vive tutta in `ClientConInvito` dentro `useInvitoIntake.ts`, con la
firma vera scritta accanto.

**Non ho toccato niente sotto `supabase/`, e non ho scritto nessuna migrazione.** Il
database era già pronto e l'ho solo interrogato in lettura.

**Non ho fatto nulla di ciò che il nome `intake_inviato_il` promette.** Questa fetta
*genera un link*; non manda email, non manda messaggi, non sollecita. `intake_sollecitato_il`
esiste sul database e resta **non letta e non scritta**: non c'è ancora niente che
solleciti, e leggerla per mostrarla suggerirebbe una funzione che non c'è.

**Non ho aggiunto un modo di sapere se il cliente ha aperto il link.** Sarebbe utile e
non c'è: il questionario vive in un'altra applicazione e questa fetta non la tocca.

**Non ho messo la card in nessun altro posto** — solo nella linguetta Intervista, sotto
il vuoto che la richiede. In `TwoTracks` ho cambiato una riga di testo (diceva «in
arrivo» di una cosa che è arrivata) ma **non** ci ho messo un secondo bottone: due punti
da cui rigenerare lo stesso link sono due modi di ucciderlo per sbaglio.

**Non ho corretto `annulla_invito_intake`**, che non controlla `if not found` e quindi
riesce in silenzio anche su un cliente inesistente — a differenza di
`genera_invito_intake`, che solleva `P0002`. È una asimmetria vera lato database, ma il
database è fuori da questa fetta. L'ho annotata qui perché non si perda.

**Non ho fatto merge e non ho fatto deploy**, come chiesto. Il ramo
`claude/link-personale-e-leggibilita` è pronto per una PR.
