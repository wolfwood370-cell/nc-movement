# Ultimo ritorno — CI verde

**Data:** 2026-09-03 · **Ramo:** `claude/ci-verde` · **Base:** `main` = `834b0fd`
**PR:** [#2 — CI verde: tolti i quattro as any che bloccavano il passo Lint](https://github.com/wolfwood370-cell/nc-movement/pull/2)
**Run CI:** [#36](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33752931139) → **verify succeeded in 14s**
**Prompt conservato:** [`docs/prompts/2026-09-03-ci-verde.md`](prompts/2026-09-03-ci-verde.md)

**Commit:** `29ae6f4` (il codice) + il commit di documentazione che porta questo file.
Il ritorno della fetta precedente (stacco da Lovable) resta nella storia di git e nella
[PR #1](https://github.com/wolfwood370-cell/nc-movement/pull/1).

## Rituale d'apertura

`git status --porcelain` mostrava una sola riga, `?? VALUTAZIONE-VENDITA-FMS.md` — il file di Nicolò,
non tracciato, mai toccato. Nessuna modifica pendente: `.gitattributes` e `core.autocrlf` fanno il
loro lavoro. Ramo creato da `origin/main` = `834b0fd`.

---

## Il punto 1: il messaggio esatto di `tsc`

**Non c'è nessun messaggio. E il motivo è il fatto che questa fetta ha trovato.**

Tolti i quattro cast, `bunx tsc --noEmit` risponde exit 0 e non stampa niente. Ma non perché il
codice sia a posto: perché **quel comando non compila nulla**.

```
$ bunx tsc --noEmit --listFiles | grep -c "src/"
0
```

`tsconfig.json` ha `"files": []` e delega tutto a due project references (`tsconfig.app.json`,
`tsconfig.node.json`). Senza `-b` o `-p`, `tsc` compila il progetto radice: zero file. **Passa
sempre**, qualunque cosa ci sia nel codice.

Me ne sono accorto perché le prime sonde davano risultati impossibili: passando a `push()` righe
della forma completamente sbagliata, `tsc` restava verde. Non era il codice a essere `any` — era il
compilatore a non guardare.

Il comando che compila davvero vede **161 file**:

```
$ bunx tsc --noEmit -p tsconfig.app.json
src/components/ui/chart.tsx(106,7): error TS2339: Property 'payload' does not exist on type 'Omit<Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { active?: boolean; ... }, "ref">'.
src/components/ui/chart.tsx(111,7): error TS2339: Property 'label' does not exist on type 'Omit<Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { active?: boolean; ... }, "ref">'.
src/components/ui/chart.tsx(233,41): error TS2344: Type '"payload" | "verticalAlign"' does not satisfy the constraint '"string" | "style" | ... 422 more ... | "portal"'.
src/components/ui/chart.tsx(240,17): error TS2339: Property 'length' does not exist on type 'unknown'.
src/components/ui/chart.tsx(249,16): error TS2339: Property 'map' does not exist on type 'unknown'.
```

**Cinque errori, tutti preesistenti, tutti in `src/components/ui/chart.tsx`** (attriti fra shadcn e
i tipi di recharts). **Nessuno in `Dashboard.tsx`.**

E soprattutto: con i quattro `as any` e senza, l'output è **identico riga per riga**.

```
$ diff tsc-con-cast.txt tsc-senza-cast.txt
(nessuna differenza)
```

## Quale delle tre strade ho preso: **nessuna**

Il prompt ne ammetteva tre — allargare la firma di `push`, tipizzare la `select`, o gestire un caso
scoperto. Non ne serviva nessuna, e questa è la risposta onesta: **i quattro cast erano ridondanti**.
Le `select` restituiscono già la forma che `push()` dichiara, e per `sfma`, `fcs` e `ybt` il
`total_score` assente è coperto dal campo opzionale nella firma. Firma invariata, `select` invariate,
comportamento invariato.

L'ipotesi della misura (`client_id` nullo) era caduta per misura sul database; anche la mia — «i cast
servivano con i tipi vecchi di Lovable» — è caduta, e l'ho verificata invece di supporla:

```
$ git show af0f7d0:src/integrations/supabase/types.ts   → client_id: string · assessed_at: string · total_score: number | null
$ cat src/integrations/supabase/types.ts                 → identici
```

I tipi delle quattro tabelle sono **gli stessi prima e dopo lo stacco**. I cast erano già inutili
allora.

### Perché non è un caso fortunato: la prova sa fallire

Non basta che `tsc` sia verde: bisogna sapere che **sta guardando**. Due controlli positivi, sul
progetto giusto, poi ripristinati:

**(1)** Passando a `push()` le righe di `clients` invece di quelle di `fms`:
```
src/pages/Dashboard.tsx(113,10): error TS2345: Argument of type '{ id: string; full_name: string; created_at: string; }[]' is not assignable to parameter of type '{ client_id: string; assessed_at: string; total_score?: number; }[]'.
```

**(2)** Rendendo `total_score` obbligatorio nella firma di `push` — le tre chiamate senza quel campo
saltano, e solo quelle:
```
src/pages/Dashboard.tsx(114,10): error TS2345: Argument of type '{ client_id: string; assessed_at: string; }[]' is not assignable to parameter of type '{ client_id: string; assessed_at: string; total_score: number; }[]'.
src/pages/Dashboard.tsx(115,10): error TS2345: ...
src/pages/Dashboard.tsx(116,10): error TS2345: ...
```

Il tipo è reale, il controllo è attivo, e la riga `fms` (che il `total_score` ce l'ha) resta verde:
è esattamente la distinzione che ci si aspetta.

## Casi non gestiti: nessuno

Il compilatore non ha rivelato righe che finirebbero come chiave nulla nella `Map` né campi assenti.
`client_id` e `assessed_at` sono non annullabili nei tipi e nel database. La `Map`, l'ordinamento per
ultima attività e il fallback su `created_at` sono rimasti intatti: il diff è di quattro righe, e in
ognuna cambia solo la sparizione di ` as any`.

---

## Acceptance, voce per voce

### 1. `bun run lint` → exit 0 ✅

```
$ bun run lint
✖ 17 problems (0 errors, 17 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.
LINT EXIT=0
```

**17 warning, identici alla baseline** (che ne aveva 17, più i 4 errori):
```
baseline: 17 warning    ora: 17 warning
```
Righe `error` rimaste nell'output: **zero**. Il numero non è cambiato perché non ho toccato nulla che
li riguardasse: erano e restano fuori perimetro.

### 2. `tsc` · `test` · `build` ✅ (con una riserva sul primo)

```
$ bunx tsc --noEmit                      → EXIT=0   ⚠️ ma compila 0 file, vedi sopra
$ bunx tsc --noEmit -p tsconfig.app.json → 5 errori preesistenti in chart.tsx, nessuno in Dashboard.tsx
$ bun run test                           → 5 file, 30 test, EXIT=0
$ bun run build                          → EXIT=0
```

Dichiaro la riserva invece di incassare il verde: l'acceptance chiede `bunx tsc --noEmit` exit 0 ed è
soddisfatta, ma quel comando **non prova niente**. Ciò che prova qualcosa è il confronto con
`-p tsconfig.app.json`, ed è verde su `Dashboard.tsx` prima e dopo.

### 3. Niente nascosto ✅

```
$ grep -rn "as any\|as unknown as\|eslint-disable\|@ts-ignore\|@ts-expect-error" src/pages/Dashboard.tsx
(0 righe)
```

Nessun cast nuovo da nessuna parte, nessuna direttiva di soppressione, nessun `tsconfig` né
`eslint.config.js` toccato.

### 4. 🔴 Prova rossa — i due stati

**md5 identico prima e dopo: `1554c80e30fcfcf4a65643f7e19ac2e0`.**

Stato rosso — rimesso **un solo** `as any` su `sfma`:
```
  114:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
✖ 18 problems (1 error, 17 warnings)
LINT EXIT=1
```

Stato verde — ripristinato (`md5 1554c80e30fcfcf4a65643f7e19ac2e0`, identico; `git status` pulito):
```
✖ 17 problems (0 errors, 17 warnings)
LINT EXIT=0
```

Un errore, non quattro: il cancello conta ciò che trova, non un numero fisso.

### 5. 🟢 La CI vera — run #36

`verify` **succeeded in 14s**. Per la prima volta nella storia del repo, dopo `Lint` **verde** viene
eseguito `Test`:

```
Set up job                  1s ✅
Run actions/checkout@v4     2s ✅
Setup Bun                   1s ✅
Install dependencies        1s ✅
Lint                        3s ✅   ← prima moriva qui
Test                        2s ✅   ← non era mai partito
Type-check (non-blocking)   0s ✅
Complete job                0s ✅
```

Log del passo **Lint**:
```
▶ Run bun run lint
$ eslint .
...
✖ 17 problems (0 errors, 17 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.
```

Log del passo **Test** — le righe che contano:
```
▶ Run bun run test
$ vitest run

 RUN  v3.2.4 /home/runner/work/nc-movement/nc-movement

 ✓ src/lib/fmsPrescription.test.ts (6 tests) 7ms
 ✓ src/lib/medicalReferral.test.ts (5 tests) 4ms
 ✓ src/lib/fms.test.ts (15 tests) 8ms
 ✓ src/test/example.test.ts (1 test) 2ms
 ✓ src/test/cordone-lovable.test.ts (3 tests) 19ms

 Test Files  5 passed (5)
      Tests  30 passed (30)
   Start at  12:02:16
   Duration  1.63s
```

**`src/test/cordone-lovable.test.ts (3 tests)`** — il cancello anti-Lovable scritto nella fetta
precedente è stato eseguito da un runner, non solo su questa macchina. Da adesso, se Lovable rientra,
la CI se ne accorge.

### 6. Diff ✅

```
$ git diff --name-only origin/main...HEAD
docs/ULTIMO-RITORNO.md
docs/prompts/2026-09-03-ci-verde.md
src/pages/Dashboard.tsx
```

I vietati — `.github/workflows/ci.yml`, `eslint.config.js`, `tsconfig*.json`, `src/integrations/**`,
`src/test/**` e ogni altro file sotto `src/` — non compaiono. Il diff del codice è di quattro righe:

```diff
-    push(fms.data as any, 'FMS');
-    push(sfma.data as any, 'SFMA');
-    push(fcs.data as any, 'FCS');
-    push(ybt.data as any, 'YBT');
+    push(fms.data, 'FMS');
+    push(sfma.data, 'SFMA');
+    push(fcs.data, 'FCS');
+    push(ybt.data, 'YBT');
```

---

## Il difetto vero, che questa fetta non poteva sistemare

**Il passo `Type-check (non-blocking)` della CI non controlla niente.** Esegue `bunx tsc --noEmit`,
cioè il comando che compila zero file. È verde da sempre e sarebbe verde anche se ogni file del
progetto fosse rotto. Il commento nel workflow dice «*Surfaced, not enforced*»: in realtà non è
nemmeno *surfaced*.

Il comando corretto è `bunx tsc --noEmit -p tsconfig.app.json`, e oggi trova 5 errori reali in
`src/components/ui/chart.tsx`. Metterlo nel workflow senza prima sistemare quel file renderebbe il
passo rosso — che è il punto, ma è un'altra fetta.

**Non l'ho toccato**, e non per pigrizia: `.github/workflows/ci.yml`, `tsconfig*.json` e
`src/components/ui/chart.tsx` sono tutti fuori dal perimetro dichiarato. Lo lascio scritto qui e
nella descrizione della PR.

## Cosa ho visto e non ho toccato

- **I 17 warning** di eslint: fuori perimetro, invariati.
- **`chart.tsx`**: 5 errori di tipo preesistenti, fuori perimetro.
- **`continue-on-error` sul type-check**: resta com'è, come chiesto.
- **La firma di `push` e le `select`**: invariate, perché non c'era niente da correggere.

## La riga per Nicolò

La PR [#2](https://github.com/wolfwood370-cell/nc-movement/pull/2) è aperta e **verde**. Se la mergi,
`main` avrà per la prima volta una CI che esegue i test a ogni push — cancello anti-Lovable compreso.

L'unica cosa che vale la pena decidere dopo: se vuoi che il type-check serva a qualcosa, serve una
fetta che sistemi i 5 errori di `chart.tsx` e poi cambi il comando del workflow in
`bunx tsc --noEmit -p tsconfig.app.json`. Finché resta com'è, quel passo è verde per finta.
