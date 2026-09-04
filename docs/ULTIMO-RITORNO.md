# Ultimo ritorno — Scheda unificata

**Data:** 2026-09-04 · **Ramo:** `claude/scheda-unificata` · **Base:** `main` = `bc564f1`
**PR:** [#5 — Scheda unificata: l'intervista d'ingresso e i test di movimento nella stessa scheda](https://github.com/wolfwood370-cell/nc-movement/pull/5)
**Prompt conservato:** [`docs/prompts/2026-09-04-scheda-unificata.md`](prompts/2026-09-04-scheda-unificata.md)

**Commit:** `27961fd` (il codice) + il commit di documentazione che porta questo file.
Il ritorno della fetta precedente (clearing a tre stati) resta nella storia di git e nella
[PR #4](https://github.com/wolfwood370-cell/nc-movement/pull/4).

---

## Rituale d'apertura

`git status` mostrava `?? docs/design/` e nient'altro. `VALUTAZIONE-VENDITA-FMS.md` non
esiste nella working copy — come nelle due fette precedenti. **`docs/design/` non è stata
toccata né committata**, e infatti non compare nel diff.

Stavolta il disegno **c'è davvero**: 13 file, non 12 (oltre agli undici attesi ci sono
`direzione-1a`, `direzione-1c` e `note-messo-da-parte.html`).

---

## Che cosa ho letto del disegno, e dove me ne sono discostato

Letto per intero `DECISIONI.md`, i quattro stati, i tre componenti e `clientdetail-oggi.html`.
`DECISIONI.md` conferma che i tre stati dei clearing — la fetta precedente — nascevano da qui.

### I discostamenti, con il perché

**1. Gravidanza, ciclo, codice fiscale e indirizzo non compaiono nemmeno nei gruppi Salute e
Anagrafica.** Il prompt li ammetterebbe lì; io non li leggo affatto dal database.

Il motivo è che una verifica avversariale ha dimostrato che le altre due difese non
reggono. Un tipo `Omit` blocca solo l'accesso nominato: un componente che fa
`Object.entries(submission)` compila senza un solo `any` e rende le quattro colonne nel DOM
— è stato scritto e montato davvero. E con `select('*')` le colonne arrivano comunque nel
browser anche quando nessuno le mostra: cache di react-query, pannello di rete, qualunque
dump dello stato.

L'unica barriera che regge è **non chiederle al server**:

```ts
export const SUBMISSION_SELECT = 'id,client_id,created_at,status,consent_version,…' as const;
```

Ciò che non attraversa la rete non si può perdere. Il costo è che i due gruppi mostrano
meno di quanto il disegno vorrebbe, e i due gruppi lo dichiarano in una riga. Per mostrarli
servirà una lettura separata, fatta all'apertura del gruppo — che è anche il modo giusto.

**2. Il tono della banda non lo decide il conteggio delle righe.** Il disegno lo dice in tre
file e io l'ho preso alla lettera: quando una delle due metà non è mai stata interrogata la
banda **non diventa verde**. Zero bandiere dichiarate perché il questionario è pulito e zero
perché il questionario non esiste sono due cose diverse, e la seconda non autorizza a
scrivere «nessuna bandiera rossa» addosso a un silenzio. Riguarda 14 clienti su 23.

**3. Il consenso lancia invece di indovinare.** Il disegno dice che la versione corrente
«arriva da fuori, il disegno la riceve». Ho aggiunto che se **non** arriva, `deriveConsent`
solleva un errore. Una env var non impostata vale `undefined` a runtime anche se il tipo
dice `string`, e le due alternative erano entrambe peggiori: affermare la conformità senza
aver confrontato niente, o stampare «Consenso v2.1 · corrente » con la versione mancante a
tutti e nove i clienti in regola.

**4. La pillola per `work_mode = 'app'`** non è disegnata da nessuna parte. Ho usato la
stessa geometria delle altre con l'icona del telefono e l'etichetta «Solo app», e la tratto
come `remoto` per l'accensione dei test, come dice `DECISIONI.md`.

**5. Il gap del `main` da 24px a 16px**, che il disegno prescrive, **non l'ho applicato**:
avrebbe cambiato la spaziatura di tutta la pagina, comprese le parti che questa fetta non
tocca. I blocchi nuovi si inseriscono nella spaziatura esistente.

---

## Come legge l'intervista

`src/hooks/useIntake.ts`. La forma esatta:

```ts
const { data: subs, error: subErr } = await supabase
  .schema('public')
  .from('submissions')
  .select(SUBMISSION_SELECT)
  .eq('client_id', clientId)
  .order('created_at', { ascending: false })
  .limit(1);

const { data: hs, error: hsErr } = await supabase
  .schema('public')
  .from('health_screening')
  .select(HEALTH_SELECT)
  .eq('submission_id', submission.id)
  .maybeSingle();
```

**È la prima occorrenza di `.schema(` nel repo** — prima non ce n'era nessuna.

Tre cose che vale la pena sapere:

- **`client.ts` non è stato toccato**, benché il prompt lo ammettesse «dimostrando il
  contrario». Non serve: rigenerati i tipi con due schemi, `createClient<Database, 'movement'>`
  accetta `.schema('public')` così com'è. Provato con una sonda, poi rimossa: `tsc` exit 0.
- **La stringa di `select` è letterale e non costruita con `join()`**. Non è estetica:
  supabase-js inferisce le colonne solo da una stringa letterale, e con un `+` di mezzo il
  tipo degrada a `string` e la query torna `GenericStringError`. Ci ho sbattuto contro.
- **Un errore è un errore.** Se la query fallisce l'hook propaga; non restituisce «assente»,
  che direbbe «non ha mai compilato» di un cliente che magari ha compilato.

---

## I quattro stati, tre righe per uno

Montati davvero con `@testing-library/react` in
[`src/components/client/schedaStati.test.tsx`](../src/components/client/schedaStati.test.tsx).

**A · in presenza, intervista e FMS piena** (1 cliente, `c2fcfed3…`, `presenza`, 3 FMS)
Entrambe le tracce piene: a sinistra i PAR-Q positivi su 7 con la data del questionario, a
destra «FMS piena · 12/08/26» con la scala /21 e il conteggio «3 FMS · 3 piene».
La banda è rossa e conta le provenienze: «3 bandiere rosse insieme», «2 D · 1 M».
Il riassunto rende i campi che hanno un valore, e i quattro pulsanti dei test sono accesi.

**B · a distanza** (2 clienti, `856ab95e…`, `app`)
La colonna Misurato **non sparisce**: prende un fondo neutro e dice «Seguita a distanza»,
con «L'FMS si somministra di persona. Questa traccia è vuota per come lavoriamo, non per un
dato mancante.»
I quattro pulsanti restano **visibili e spenti**, con la ragione scritta sotto la griglia.
La banda non è verde: dichiara che le bandiere M sono zero perché non è stato misurato niente.

**C · test senza intervista** (9 con FMS, 14 in tutto senza intervista, `56519fd8…`)
La colonna Dichiarato resta e dice «Traccia mai aperta», «Nessun PAR-Q, nessun consenso,
nessuno degli 8 gruppi. Anagrafica inserita a mano.»
Il riassunto non stampa otto trattini: una carta tratteggiata dice che i campi compaiono
appena il modulo viene compilato.
La banda porta il riquadro ambra: «le bandiere D sono zero perché non gliele ho mai chieste».

**D · solo FMS modificate** (11 clienti: 6 con intervista come `09a46aa8…`, 5 senza)
La traccia Misurato dice «FMS modificata» e la scala è **/9**, non /21, con «2 FMS ·
2 modificate».
I due clearing spinali sono `not-performed` e **non compaiono fra le bandiere**.
Con entrambe le metà lette e pulite la banda è verde — l'unico caso in cui può esserlo.

---

## Acceptance, voce per voce

### 1. I quattro stati ⚠️ — verificati, ma non come chiede il prompt

**Va detto chiaro: non li ho visti nella app in locale.** Il dev server gira (l'ho avviato,
la pagina di login risponde su `localhost:8080`), ma la scheda sta dietro autenticazione e
**non inserisco credenziali** — è una regola che non aggiro nemmeno per un'acceptance.

Al suo posto ho montato i quattro stati con `@testing-library/react`, sugli stessi dati che
il database produce, e ho verificato riga per riga cosa mostra la scheda. Sono 7 test che
restano nel repo: riproducibili, e più duraturi di uno screenshot. **Se serve la prova
visiva, basta che qualcuno faccia il login e apra i quattro id elencati sopra.**

### 2. 🔴 Tre prove rosse sul modulo puro ✅

Tutte con ripristino **byte-identico**, su `src/lib/intake.ts` (md5 sano `76b272ef…`):

| prova | sonda | md5 sondato | rossi | errore |
|---|---|---|---|---|
| **(a)** consenso | il ramo «superata» non si prende più | `2b0370a7…` | **1** | `expected 'firmato' to be 'versione-superata'` |
| **(b)** bandiere | `not-performed` entra fra le bandiere | `ea854924…` | **2** | `expected [{source:'M'},…] to have a length of +0 but got 2` |
| **(c)** riassunto | un campo vuoto stampa `—` | `6656e40b…` | **3** | `expected true to be false` |

Ripristino verificato a `76b272ef…` in tutti e tre i casi, `git status` vuoto, 70 test verdi.
La (b) va rossa **due volte**: nel modulo puro e nel rendering.

### 3. 🔴 Il cancello della privacy ✅

Due reti indipendenti. Una legge i sorgenti dal disco (`src/lib/intake.ts`,
`src/hooks/useIntake.ts` e tutto `src/components/client/`), l'altra ispeziona il DOM
renderizzato nei quattro stati.

Provato rosso aggiungendo `pregnancy` a `IntakeSummaryCard.tsx`
(md5 `0dbaff79…` → `f912c520…`):

```
→ expected [ Array(1) ] to deeply equal []
→ expected 'Le due tracceDichiaratoQuestionario ·…' not to contain 'pregnancy'
Failed Tests 2
```

Ripristinato a `0dbaff79…`, byte-identico, 70 verdi.

C'è anche una terza rete, la più forte: quelle colonne **non sono nelle stringhe di
`select`**, quindi non arrivano nemmeno nel browser.

### 4. La sicurezza non è stata toccata ✅

```
$ grep -rn "service_role\|is_admin\|rls" src/
(nessuna riga)     ← 0 ora, 0 su main
```

Nessuna policy toccata, nessuna vista di comodo, nessuna scrittura: `useIntake.ts` non
contiene un solo `.insert(`, `.update(` o `.delete(`. Le tabelle di `public` restano protette
come sono e l'hook legge con la sessione dell'utente.

Nota: due miei commenti nominavano quei termini per dichiarare di *non* averli toccati, e
facevano scattare il grep. Li ho riformulati — un cancello meccanico va lasciato pulito.

### 5. I cancelli ✅

```
$ bunx tsc --noEmit -p tsconfig.app.json   → EXIT=0
$ bun run lint                             → ✖ 17 problems (0 errors, 17 warnings) · EXIT=0
$ bun run test                             → Test Files 7 passed · Tests 70 passed · EXIT=0
$ bun run build                            → ✓ built · EXIT=0
```

**Sulla CI vera**, [run 33890211739](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33890211739),
job `verify` → **success in 31s**, con i tre passi: `Lint`, `Test` e `Type-check`. Quest'ultimo,
dalla fetta del type-check, gira senza `continue-on-error`: un errore di tipo nel modulo nuovo
o nei test avrebbe bocciato il run.

70 test: i 39 esistenti più 31 nuovi (24 sul modulo puro, 7 sui quattro stati). Nessuno dei
39 preesistenti è stato toccato.

**Di nuovo l'inciampo dei worktree**, come nella fetta scorsa: `bun run lint` dava **170**
warning finché non ho rimosso i nove `git worktree` lasciati dagli agenti sotto
`.claude/worktrees/`. `eslint .` li analizza perché **non legge `.gitignore`**. Rimossi,
tornano 17.

### 6. File toccati ✅

```
$ git diff --name-only origin/main...HEAD
docs/ULTIMO-RITORNO.md
docs/prompts/2026-09-04-scheda-unificata.md
src/components/client/IntakeBadges.tsx
src/components/client/IntakeSummaryCard.tsx
src/components/client/IntakeTab.tsx
src/components/client/TwoTracks.tsx
src/components/client/UnifiedFlagsBand.tsx
src/components/client/schedaStati.test.tsx
src/hooks/useIntake.ts
src/index.css
src/integrations/supabase/types.ts
src/lib/intake.test.ts
src/lib/intake.ts
src/pages/ClientDetail.tsx
```

**`docs/design/` non compare**: resta non tracciata, come deve. I **vietati a zero righe**,
`src/integrations/supabase/client.ts` compreso:

```
$ git diff --stat origin/main...HEAD -- src/lib/fms.ts src/lib/insights.ts \
    src/lib/medicalReferral.ts src/lib/fmsPrescription.ts src/lib/ptPackProgram.ts \
    src/integrations/supabase/client.ts supabase .github tsconfig*.json
(nessun output)
```

---

## I numeri: la misura del prompt è di ieri

| | prompt | oggi |
|---|---:|---:|
| clienti | 22 | **23** |
| con intervista | 9 | 9 ✓ |
| **senza intervista** | 13 | **14** |
| ultima FMS modificata | 11 su 21 | **12** |
| mai una piena | 10 | **11** |
| a distanza | 2 | 2 ✓ |
| `submissions` collegate | 9 su 9 | 9 su 9 ✓ |
| `public.admins` | 1 | 1 ✓ |
| `neurotype_result` | 0 | 0 ✓ |

Un cliente è entrato dopo la misura e sposta di uno i conteggi derivati. **I testi del
disegno che citano «13 clienti su 22» sono già vecchi di un giorno**: per questo nel codice
non ho scritto da nessuna parte un conteggio aggregato — la scheda parla del cliente che ha
davanti, non della popolazione.

---

## Ciò che il disegno mostra e i dati non sanno produrre

L'elenco è lungo perché il disegno è ricco. Niente di tutto questo è stato inventato.

**Reso inerte e dichiarato** (esiste nel disegno, non nei dati):
- **Il link personale al modulo** e tutto il suo corredo — «Copia il link personale», «Link
  copiato · si disattiva quando lo compila», «Valido fino al 03/12», «Inviato il 26/08»,
  «Mai sollecitato», il bottone «Sollecita». Il token opaco non esiste: nessuna colonna,
  nessuna tabella. Le due date richiederebbero `intake_inviato_il` e `intake_sollecitato_il`
  su `movement.clients`, che non ci sono. In pagina resta una riga: «Invio del modulo: in arrivo».
- **Il neurotipo** — `neurotype_answers` ha 9 righe di risposte, `neurotype_result` ne ha
  **zero**. Il gruppo lo dice: «Il calcolo del neurotipo non esiste ancora: in arrivo».

**Non prodotto, e non sostituito con una stima:**
- **L'intensità del dolore «4/10»**, che compare due volte. `health_screening` ha `pain_now`
  (booleano) e `pain_where` (testo): **nessuna colonna numerica di intensità**. Si stampa
  la sede, non un numero inventato.
- **«Consensi · 7 flag»** — i booleani di consenso sono **sei**, non sette
  (`consent_health`, `consent_disclaimer`, `consent_nutrition`, `consent_photos`,
  `consent_share_medical`, `consent_marketing`). Il settimo non esiste: `consent_version`
  non è un flag.
- **«54 campi»** — è il numero di *colonne* di `submissions`, incluse quelle tecniche
  (`id`, `created_at`, `status`, `client_id`). Non è un conteggio di risposte, e non l'ho scritto.
- **I conteggi per gruppo** («Anagrafica 9 campi», «Obiettivi 5», «Nutrizione 6»…) — nessuna
  mappa colonna→gruppo esiste, né nel disegno né nel codice. I gruppi non portano un contatore.
- **«Esperienza: 3 anni · intermedio»** e **«Infortuni: Spalla sx · 2024»** — non ci sono
  colonne per gli anni di pratica né per lato/anno strutturati. `past_injuries` è un testo
  libero e si stampa così com'è.
- **«4 clearing negativi»** nella colonna Misurato — la fetta precedente si rifiuta
  deliberatamente di chiamare «eseguiti» dei flag mai spuntati, e non l'ho contraddetta.
- **Il delta del punteggio** confronta solo tipi uguali, come già fa `LastFmsCard`; con una
  storia mista viene omesso, non stimato.

**Due cose che il disegno dà per scontate e il database smentisce:**
- **`work_mode` sta su `submissions`, non su `clients`.** I 14 clienti senza intervista non
  hanno *nessuna* modalità: per loro la pillola dice «Modalità ignota», che è la verità.
- **Lo stato «consenso su versione superata» oggi non è osservabile su nessun dato reale**:
  nel database esiste una sola versione, `v2.1`. È implementato e testato, ma finché non
  esce una `v2.2` nessun cliente lo mostrerà.

---

## Il token nuovo

In `src/index.css`, accanto a `--warning`:

```css
--compliance: var(--warning);
--compliance-foreground: var(--warning-foreground);
```

Usato per il consenso assente e per il riquadro «metà del quadro manca». Non è registrato in
`tailwind.config.ts` — che è fuori dalla lista dei file modificabili — quindi si usa via
`hsl(var(--compliance))`, che è l'idioma già presente nel repo. Nessun altro colore, raggio,
ombra o dimensione è nuovo.

---

## Sull'attribution

Il prompt chiedeva `Co-Authored-By: Claude <noreply@anthropic.com>`; l'ambiente di esecuzione
impone `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` come regola che sostituisce le
precedenti. Ho seguito l'ambiente, come nelle due fette scorse.
