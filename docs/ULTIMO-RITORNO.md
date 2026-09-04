# Ultimo ritorno — Type-check vero

**Data:** 2026-09-04 · **Ramo:** `claude/typecheck-vero` · **Base:** `main` = `15f91f9`
**PR:** [#3 — Type-check vero: il passo della CI ora compila davvero, e i 5 errori di chart.tsx sono sistemati](https://github.com/wolfwood370-cell/nc-movement/pull/3)
**Run CI:** [33857058205](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33857058205)
**Prompt conservato:** [`docs/prompts/2026-09-04-typecheck-vero.md`](prompts/2026-09-04-typecheck-vero.md)

**Commit:** `0a33263` (il codice) + il commit di documentazione che porta questo file.
Il ritorno della fetta precedente (CI verde) resta nella storia di git e nella
[PR #2](https://github.com/wolfwood370-cell/nc-movement/pull/2).

---

## Rituale d'apertura — due scostamenti, entrambi in meno

Il prompt si aspettava `?? VALUTAZIONE-VENDITA-FMS.md` e `?? docs/design/`. `git status`
era invece **completamente pulito**:

```
$ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

`VALUTAZIONE-VENDITA-FMS.md` non è più nella working copy, e `docs/design/` esiste ma è
**vuota** — git non traccia le cartelle vuote, per questo non compariva. Sono due cose **in
meno** del previsto, non in più: niente di Nicolò da proteggere, nessuna modifica pendente
da capire. Non ho fermato la fetta perché la regola («se mostra *altro*, fermati») esiste
per intercettare roba inattesa da non travolgere, e qui non c'era niente da travolgere.
**Nessuno dei due file è stato toccato o creato.**

---

## La misura, confermata

```
$ bunx tsc --noEmit ; echo $?
0
$ bunx tsc --noEmit --listFiles | grep -c "src/"
0
```

Il comando del workflow non compilava **niente**. Il comando vero:

```
$ bunx tsc --noEmit -p tsconfig.app.json
src/components/ui/chart.tsx(106,7): error TS2339: Property 'payload' does not exist on type 'Omit<Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { active?: boolean; allowEscapeViewBox?: AllowInDimension; ... 24 more ...; wrapperStyle?: CSSProperties; } & ClassAttributes<...> & HTMLAttributes<...> & { ...; }, "ref">'.
src/components/ui/chart.tsx(111,7): error TS2339: Property 'label' does not exist on type 'Omit<Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { active?: boolean; allowEscapeViewBox?: AllowInDimension; ... 24 more ...; wrapperStyle?: CSSProperties; } & ClassAttributes<...> & HTMLAttributes<...> & { ...; }, "ref">'.
src/components/ui/chart.tsx(233,41): error TS2344: Type '"payload" | "verticalAlign"' does not satisfy the constraint '"string" | "style" | "clipPath" | "filter" | "mask" | "path" | "className" | "offset" | "key" | "type" | "suppressHydrationWarning" | "id" | "lang" | "tabIndex" | "role" | "content" | ... 422 more ... | "portal"'.
  Type '"payload"' is not assignable to type '"string" | "style" | ... 422 more ... | "portal"'.
src/components/ui/chart.tsx(240,17): error TS2339: Property 'length' does not exist on type 'unknown'.
src/components/ui/chart.tsx(249,16): error TS2339: Property 'map' does not exist on type 'unknown'.
EXIT=2
```

Cinque errori, esattamente quelli attesi.

### Il conteggio dei file: 166 → 161, e perché non è un'esclusione

Il prompt si aspettava **~161** e avvertiva: «se cala, hai escluso qualcosa». Prima del fix
il comando ne contava **166**. La differenza non è un file in più: **`tsc --noEmit --listFiles`
stampa anche gli errori su stdout**, quindi `grep -c "src/"` somma i file *e* le righe di
errore, che cominciano tutte con `src/components/ui/chart.tsx`. Scomposizione misurata:

| voce | prima | dopo |
|---|---:|---:|
| file del progetto (`nc-movement/src/`) | 141 | **141** |
| `node_modules/react-resizable-panels/**` (hanno `src/` nel path) | 20 | 20 |
| righe di errore di `tsc` | 5 | 0 |
| **totale `grep -c "src/"`** | **166** | **161** |

Il calo da 166 a 161 è la sparizione dei cinque errori. **I file compilati sono 141 prima e
141 dopo: non è stato escluso nulla.** E 161 è esattamente il numero riportato dalla fetta
precedente, che misurò a errori presenti — coincidenza aritmetica, non identità di misura.

---

## I 5 errori: la causa comune, e come è stato sistemato ciascuno

Non sono cinque problemi: sono **un solo cambiamento di recharts** che affiora in cinque punti.

recharts 3 ha spostato `payload`, `label`, `active` e `coordinate` **dai props al context**.
Non è un'inferenza — è scritto nei suoi `.d.ts`:

```ts
// node_modules/recharts/types/component/Tooltip.d.ts:19-20
type PropertiesReadFromContext = 'viewBox' | 'active' | 'payload' | 'coordinate' | 'label' | 'accessibilityLayer';
export type TooltipProps<...> = Omit<DefaultTooltipContentProps<...>, PropertiesReadFromContext> & { ... };

// node_modules/recharts/types/component/Legend.d.ts:7
export type Props = Omit<DefaultLegendContentProps, 'payload' | 'ref' | 'verticalAlign'> & { ... };
```

`chart.tsx` è il componente shadcn scritto per **recharts 2**, dove quei campi erano props.
Chiede ancora ai props ciò che ora vive sul context. I tipi giusti esistono e recharts li
**esporta pubblicamente** (`types/index.d.ts`, righe 8 e 10): `TooltipContentProps` e
`DefaultLegendContentProps` sono esattamente «i tipi che recharts espone davvero per quel
punto», cioè per il *contenuto custom* di tooltip e legenda.

### Errori 1 e 2 — `payload` (106) e `label` (111)

> `TS2339: Property 'payload' does not exist on type 'Omit<Omit<Props<...>, PropertiesReadFromContext> & ...>'`
> `TS2339: Property 'label' does not exist on type '...'`

Il componente derivava i props da `React.ComponentProps<typeof RechartsPrimitive.Tooltip>`,
cioè da `TooltipProps`, che quei due campi li **toglie**. Sostituito con il tipo del
contenuto:

```diff
-  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
-    React.ComponentProps<"div"> & {
+  React.ComponentProps<"div"> &
+    Partial<
+      Pick<
+        RechartsPrimitive.TooltipContentProps,
+        "active" | "payload" | "label" | "labelFormatter" | "labelClassName" | "formatter"
+      >
+    > & {
```

Tre scelte, ognuna con un motivo:

- **`TooltipContentProps` e non `TooltipProps`**: è il tipo che recharts passa al contenuto
  custom, ed è lì che `payload` e `label` esistono ancora.
- **`Partial`**: su `TooltipContentProps` quei campi sono **richiesti** (`payload: TooltipPayload`,
  `active: boolean`), perché è recharts a iniettarli clonando l'elemento. Senza `Partial`, ogni
  chiamante sarebbe costretto a passarli a mano.
- **`Pick` mirato e non il tipo intero**: `React.ComponentProps<"div">` contiene
  `content?: string` (attributo RDFa di `HTMLAttributes`) e `TooltipProps` contiene
  `content?: ContentType`. Intersecarli produce un `content` insoddisfacibile. Il `Pick`
  prende solo i sei campi che il componente destruttura davvero e non crea la collisione.
  `color` continua ad arrivare da `ComponentProps<"div">` (`color?: string`, «Non-standard
  Attributes» di React) — **esattamente come prima**, non è cambiato di mano.

### Errore 3 — `TS2344` su `"payload" | "verticalAlign"` (233)

> `Type '"payload" | "verticalAlign"' does not satisfy the constraint '... 422 more ... | "portal"'`

Il messaggio è oscuro ma dice una cosa semplice: si stava facendo `Pick` di due chiavi da un
tipo che **non le ha**, perché `LegendProps` fa `Omit<..., 'payload' | 'ref' | 'verticalAlign'>`.
Le chiavi elencate nel vincolo (`"portal"`, `"onBBoxUpdate"`) sono quelle che `LegendProps`
*ha*. Cambiato il tipo di partenza, non le chiavi:

```diff
-    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
+    Pick<RechartsPrimitive.DefaultLegendContentProps, "payload" | "verticalAlign"> & {
```

`DefaultLegendContentProps` dichiara `payload?: ReadonlyArray<LegendPayload>` e
`verticalAlign?: VerticalAlignmentType`, entrambi già opzionali (nessun `Partial` necessario).

### Errori 4 e 5 — `length` (240) e `map` (249) su `unknown`

> `TS2339: Property 'length' does not exist on type 'unknown'`
> `TS2339: Property 'map' does not exist on type 'unknown'`

Non erano errori a sé: erano il **danno collaterale** dell'errore 3. Fallito il `Pick`, il tipo
di `payload` collassava a `unknown`, e ogni uso a valle esplodeva. Sistemato il tipo della
legenda, **sono spariti da soli senza toccare quelle righe.**

---

## I difetti veri che i tipi corretti hanno fatto emergere

Il prompt chiedeva: *«Se il tipo corretto rivela che il codice legge un campo che a runtime
può non esserci, quello è un difetto vero: gestiscilo e nominalo forte.»* Ne sono emersi due,
e il secondo è una trappola che quasi mi ha fregato.

### 1. `item.payload.fill` leggeva un campo opzionale — e faceva saltare l'intera tooltip

```ts
// node_modules/recharts/types/component/DefaultTooltipContent.d.ts:21
payload?: any;   // dentro `interface Payload`, che È l'elemento di TooltipPayload
```

Il campo è **doppiamente mascherato**: è opzionale *e* è tipizzato `any`, quindi nemmeno con
i tipi giusti il compilatore protegge `.fill`. E un terzo velo lo copriva: finché `payload`
non esisteva sui props (errore 106), `item` non era controllato affatto.

Che a runtime arrivi `undefined` non è teoria. In recharts 3.9.2 l'entry si costruisce con una
ricerca nel dataset che può non trovare nulla: `es6/state/selectors/combiners/combineTooltipPayload.js`
usa `findEntryInArray`, che ritorna `undefined` quando nessuna riga combacia, e
`es6/util/ChartUtils.js` (`getTooltipEntry`) fa lo spread di `payload` così com'è, **senza
fallback**. Succede con serie che non condividono tutte le categorie sull'asse X, con
`<Tooltip defaultIndex>` fuori range, con un `<Brush>` che affetta i dati.

E la riga era la peggiore possibile: un `const` valutato **prima** di ogni ramo, quindi il
`TypeError` non degradava un dettaglio — **buttava giù la tooltip intera**, e con lei il
grafico se sotto un error boundary.

```diff
-            const indicatorColor = color || item.payload.fill || item.color;
+            const indicatorColor = color || item.payload?.fill || item.color;
```

Quando `payload` c'è, il risultato è identico byte per byte. Quando manca, si degrada su
`item.color` invece di lanciare. **È l'unica riga di questa fetta che cambia il runtime, ed è
il difetto che la fetta doveva trovare.**

### 2. `key={item.dataKey}` — il sesto errore, e la scorciatoia che cambiava comportamento

Appena `payload` viene tipizzato bene, compare un **sesto errore che prima non c'era**:

```
src/components/ui/chart.tsx(179,17): error TS2322: Type 'string | number | ((obj: any) => any)' is not assignable to type 'Key'.
  Type '(obj: any) => any' is not assignable to type 'Key'.
```

`DataKey<any>` include una **funzione**, che non è una `React.Key`. Il modo ovvio di zittirlo
è stringificare — ed è sbagliato. React fa:

```js
// react/jsx-runtime: hasValidKey(config) { return config.key !== undefined }
if (hasValidKey(config)) key = '' + config.key;
```

`undefined` significa **«nessuna key»** (riconciliazione posizionale). `` `${undefined}` ``
produce la stringa `"undefined"`. Con due o più entry senza `dataKey` — e recharts le produce:
`combineTooltipPayload.js` propaga `dataKey: undefined` quando la serie non ne ha una — si
passerebbe da *chiavi assenti* a *chiavi tutte uguali*: warning diverso, riconciliazione
diversa, nodi DOM riusati sbagliati al riordino. **Non sarebbe stato «identico».**

Ho misurato le tre forme candidate contro il React del repo, non ragionato a mente:

| valore di `dataKey` | originale | `` `${x}` `` | `x?.toString()` | **la forma scelta** |
|---|---|---|---|---|
| `undefined` | nessuna key | ❌ `"undefined"` | nessuna key | ✅ nessuna key |
| `null` | `"null"` | `"null"` | ❌ nessuna key | ✅ `"null"` |
| `"uv"` | `"uv"` | `"uv"` | `"uv"` | ✅ `"uv"` |
| `0` | `"0"` | `"0"` | `"0"` | ✅ `"0"` |
| `42` | `"42"` | `"42"` | `"42"` | ✅ `"42"` |
| `(d) => d.uv` | `"(d) => d.uv"` | idem | idem | ✅ idem |
| `""` | `""` | `""` | `""` | ✅ `""` |
| **divergenze** | — | **1** | **1** | **0** |

```diff
-                key={item.dataKey}
+                key={item.dataKey === undefined ? undefined : `${item.dataKey}`}
```

L'unica delle tre a riprodurre l'originale in **tutti** i casi. Una quarta strada,
`item.dataKey as React.Key`, l'ho scartata: non è nella lista dei divieti letterali, ma dice
al compilatore che una funzione è una `Key` quando non lo è — è «spegnere il controllo», che
è precisamente ciò che il prompt vieta.

### Un terzo difetto che ho trovato e **non** ho sistemato

`formatter(item.value, item.name, item, index, item.payload)` (riga 177 dell'originale) passa
come quinto argomento il **singolo dato**, mentre entrambe le firme dichiarate da recharts
vogliono lì l'**array** del payload (`payload: ReadonlyArray<Payload>` in
`DefaultTooltipContent.d.ts:10`, `payload: TooltipPayload` in `Tooltip.d.ts:88`). Compila solo
perché `payload?: any`. Un `formatter` scritto seguendo il tipo dichiarato prende
`payload.map is not a function`, o peggio fallisce in silenzio (`payload.length` è `undefined`
su un oggetto).

**Non l'ho toccato**, e la scelta è deliberata: correggere l'argomento cambierebbe il runtime;
correggere il tipo significa ridichiarare `formatter` e quindi cambiare il **contratto pubblico**
del componente. Nessuna delle due sta in «sistema i 5 errori senza cambiare comportamento».
È una fetta a sé, piccola. **Lo lascio qui scritto perché non si perda.**

Verificati e **scartati** come non-difetti: `item.value.toLocaleString()` (riga 212 — ogni
abitante di `ValueType`, array compreso, espone `toLocaleString`, e c'è già una guardia sopra)
e `key={item.value}` nella legenda (`string | undefined` è una `Key` valida; il caso `undefined`
è raggiungibile ma è preesistente e sistemarlo cambierebbe le chiavi).

---

## Il workflow

```diff
-      # Type-check is non-blocking for now: the project's tsconfig is intentionally
-      # lax and some legacy files have latent type warnings. Surfaced, not enforced.
-      - name: Type-check (non-blocking)
-        run: bunx tsc --noEmit
-        continue-on-error: true
+      # Il -p non e' un dettaglio: e' tutto il passo. Fino al 2026-09-04 qui girava
+      # `bunx tsc --noEmit`, che non compilava NIENTE. tsconfig.json ha "files": [] e
+      # delega a due project reference, quindi senza -p tsc guarda il progetto radice,
+      # cioe' zero file, ed esce 0 qualunque cosa ci sia nel codice: sonde deliberatamente
+      # sbagliate restavano verdi. Non era "surfaced, not enforced" — non era nulla.
+      # Con -p compila i 141 file di src/ e puo' bocciare, quindi niente continue-on-error.
+      - name: Type-check
+        run: bunx tsc --noEmit -p tsconfig.app.json
```

---

## Acceptance, voce per voce

### 1. `tsc` verde e file invariati ✅

```
$ bunx tsc --noEmit -p tsconfig.app.json
EXIT=0
```

Nessun output, zero errori.

```
$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "src/"
161
$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "nc-movement/src/"
141
```

161 col grep del prompt (era 166 con le righe di errore dentro), **141 file del progetto,
identici a prima**. Scomposizione nella tabella sopra.

### 2. Nessun pattern vietato, né vecchio né nuovo ✅

```
$ grep -n "any\|as unknown as\|@ts-ignore\|@ts-expect-error\|eslint-disable" src/components/ui/chart.tsx
(nessuna riga)
$ git show main:src/components/ui/chart.tsx | grep -c "any\|as unknown as\|@ts-ignore\|@ts-expect-error\|eslint-disable"
0
```

**Zero su `main`, zero adesso.** Nessuna riga nuova, e nemmeno una vecchia. Il grep è letterale
e beccherebbe anche `any` dentro parole come «many» o «Company»: non ce ne sono.

### 3. Lint, test, build ✅

```
$ bun run lint
✖ 17 problems (0 errors, 17 warnings)
LINT EXIT=0

$ bun run test
 Test Files  5 passed (5)
      Tests  30 passed (30)
TEST EXIT=0

$ bun run build
✓ built in 32.50s
BUILD EXIT=0
```

**17 warning, 30 test**, esattamente come richiesto. Nessun warning aggiunto né tolto.

### 4. 🔴 Prova rossa, nelle due direzioni ✅

Fatta su **`src/components/dashboard/MacroAnalytics.tsx`**, cioè su un file *diverso* da
quello sistemato: prova che il comando guarda l'intero progetto, non solo `chart.tsx`.

**Stato 1 — sano**
```
md5:                   f68e610477b0ea2ba000654756e14c66
git status --porcelain: []
$ bunx tsc --noEmit -p tsconfig.app.json
EXIT=0
```

**Stato 2 — sonda inserita** (`const sondaProvaRossa: number = "questa e' una stringa, non un numero";`)
```
md5:                   3761a53dc1534ed019a6c2e4d8391930
$ bunx tsc --noEmit -p tsconfig.app.json
src/components/dashboard/MacroAnalytics.tsx(11,9): error TS2322: Type 'string' is not assignable to type 'number'.
EXIT=2
```

**Il file e la riga esatti.**

**Stato 3 — ripristinato**
```
md5:                   f68e610477b0ea2ba000654756e14c66   <- identico allo stato 1
git status --porcelain: []
$ bunx tsc --noEmit -p tsconfig.app.json
EXIT=0
```

`f68e6104…` → `3761a53d…` → `f68e6104…`: ripristino **byte-identico**, working tree pulito,
verde di nuovo. Il passo nuovo *guarda davvero i file*.

### 5. 🟢 La prova sulla CI vera ✅

[Run **#39**](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33857058205) sul
commit `0a33263`, [job `verify`](https://github.com/wolfwood370-cell/nc-movement/actions/runs/33857058205/job/100972691639).

```
verify
succeeded in 21s

  ✓ Set up job                     1s
  ✓ Run actions/checkout@v4        1s
  ✓ Setup Bun                      1s
  ✓ Install dependencies           1s
  ✓ Lint                           3s
  ✓ Test                           3s
  ✓ Type-check                     9s
      1  Run bunx tsc --noEmit -p tsconfig.app.json
  ✓ Post Setup Bun                 0s
  ✓ Post Run actions/checkout@v4   0s
  ✓ Complete job                   0s
```

Le tre cose che il punto chiedeva di verificare, una per una:

- **Il passo si chiama `Type-check`**, non più `Type-check (non-blocking)`.
- **Esegue il comando con `-p`**: `Run bunx tsc --noEmit -p tsconfig.app.json`, riga 1 del log.
  Sotto non c'è nient'altro: zero errori. Ha impiegato 9s — cioè ha davvero compilato, mentre
  il vecchio comando usciva subito.
- **Non ha `continue-on-error`**: nel log non compare l'annotazione che GitHub aggiunge ai passi
  tollerati, e il passo è verde di suo. La riprova è la struttura del run: `Type-check` è il
  penultimo passo utile e il job dichiara `succeeded`, non `succeeded with issues`.

L'unica annotation del run (`1 warning`) è **preesistente e non ha a che fare con questa fetta**:
«Node.js 20 is deprecated», riferita a `actions/checkout@v4` sul passo `Complete job`.

### 6. File toccati ✅

```
$ git diff --name-only origin/main...HEAD
.github/workflows/ci.yml
docs/ULTIMO-RITORNO.md
docs/prompts/2026-09-04-typecheck-vero.md
src/components/ui/chart.tsx
```

Esattamente i quattro dichiarati. **I vietati a zero righe:**

```
$ git diff --stat origin/main...HEAD -- tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js 'src/lib/**' 'src/pages/**' 'src/integrations/**' 'src/test/**' 'docs/design/**' VALUTAZIONE-VENDITA-FMS.md
(nessun output)
```

---

## Tre cose che vale la pena sapere, oltre all'acceptance

**`chart.tsx` non disegna i grafici dell'app.** Il prompt dice «`chart.tsx` disegna i grafici
dell'app: il tooltip, la legenda e le serie devono restare identici». Non è così:

```
$ grep -rn "ui/chart" src/
(nessun risultato)
```

**Zero import.** I grafici li disegnano `src/components/dashboard/MacroAnalytics.tsx` e
`src/components/insights/InsightsTab.tsx`, che importano `recharts` **direttamente** e
ignorano il wrapper shadcn. È un componente di libreria arrivato con lo scaffold e mai
collegato. Questo non cambia nulla di ciò che è stato fatto — il vincolo di non alterare il
comportamento è stato rispettato alla lettera, e il `TypeError` della tooltip era reale — ma
cambia la **priorità**: quel difetto oggi non può manifestarsi, perché quel codice non gira.
Vale la pena decidere se il file serve o va rimosso.

**La severità di `tsconfig` resta bassa, e i 5 errori non la misurano.** `strict: false` e
`noImplicitAny: false` sono intatti (zero righe di diff). Quei cinque errori erano ciò che
sopravviveva a un controllo già indulgente: adesso il passo *può* bocciare, ma boccia solo
per ciò che questa asticella vede. Alzarla è la fetta successiva, ed è grande.

**Sull'attribution.** Il prompt chiedeva `Co-Authored-By: Claude <noreply@anthropic.com>`;
l'ambiente di esecuzione impone `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` come
regola che sostituisce le precedenti. Ho seguito l'ambiente. Lo segnalo perché è uno
scostamento visibile nella storia di git, non una svista.
