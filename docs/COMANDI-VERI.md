# I comandi veri di questo repo

Quattro comandi, ognuno con la trappola che gli sta accanto. Non sono opinioni: ogni
riga qui sotto è stata eseguita in questo repo e il numero riportato è quello che è
uscito. Le trappole non sono ipotetiche — sono i modi in cui questi quattro comandi
sono già stati sbagliati.

Misurato il 2026-09-04, sul branch `claude/neurotipo`.

---

## Test

```bash
bun run test
```

Gira `vitest run`, che legge `vitest.config.ts`: ambiente `jsdom`, `setupFiles`
`src/test/setup.ts`, e prende `src/**/*.{test,spec}.{ts,tsx}`.

**Esito misurato:** 10 file, 129 test, tutti verdi.

> ### ⚠️ La trappola: `bun test` non è `bun run test`
>
> ```bash
> bun test    # ← NON questo
> ```
>
> `bun test` è il runner **nativo di Bun**. Non legge `vitest.config.ts`, quindi non
> monta `jsdom` e non esegue `setupFiles`. Il risultato misurato adesso:
>
> ```
>  98 pass
>  11 fail
>  2 errors
> Ran 109 tests across 10 files.
> ```
>
> Gli undici che cadono sono tutti quelli che montano un componente, e cadono tutti
> sulla stessa riga: `ReferenceError: document is not defined`. Non c'è un DOM perché
> nessuno gliel'ha dato.
>
> È la trappola peggiore delle quattro, perché non dà un errore di configurazione: dà
> **dei test rossi**. Chi la incontra passa mezz'ora a cercare cosa ha rotto nel
> proprio codice, e non ha rotto niente.

---

## Type-check

```bash
bunx tsc --noEmit -p tsconfig.app.json
```

**Esito misurato:** esce 0, nessun errore. 1152 file compilati in tutto, di cui
**160** sotto `nc-movement/src/`:

```bash
bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "nc-movement/src/"
```

> ### ⚠️ La trappola: senza `-p` compila zero file
>
> ```bash
> bunx tsc --noEmit    # ← NON questo
> ```
>
> Esce **0** e non stampa niente, quindi sembra che sia andato bene. Non è andato
> bene: non ha guardato **nessun file**. Misurato:
>
> ```bash
> bunx tsc --noEmit --listFiles | wc -l   # → 0
> ```
>
> Il motivo è in `tsconfig.json`, che è un file di sole `references`:
>
> ```json
> { "files": [], "references": [{ "path": "./tsconfig.app.json" }, ...] }
> ```
>
> `"files": []` significa letteralmente «nessun file da compilare». Senza `-p`, `tsc`
> prende quel tsconfig, obbedisce, e riporta un successo su un insieme vuoto.
>
> Un type-check che passa senza aver letto niente è peggio di un type-check che
> fallisce: fallire lo vedi.

---

## Lint

```bash
bun run lint
```

Gira `eslint .` con `eslint.config.js` (flat config, typescript-eslint + react-hooks).

**Esito misurato:** `✖ 17 problems (0 errors, 17 warnings)`.

> ### ⚠️ La trappola: i 17 warning sono lo stato di partenza, non un fallimento
>
> `bun run lint` esce **0** anche con i warning: sono `react-hooks/exhaustive-deps` e
> `react-refresh/only-export-components`, già presenti prima. Il metro giusto non è
> «zero problemi», è **«nessun problema in più di 17, e nessun errore»**.
>
> Corollario: un file `.tsx` che esporta anche qualcosa che non è un componente
> guadagna un warning `react-refresh/only-export-components`. Non è un bug, è il
> contatore che sale: se sale, va detto.

---

## Build

```bash
bun run build
```

Gira `vite build`.

**Esito misurato:** `✓ built in 19.54s`, esce 0.

> ### ⚠️ La trappola: la build non fa il type-check
>
> Vite compila con SWC, che **cancella i tipi senza verificarli**. Un errore di tipo
> non ferma la build: `bun run build` passa verde su codice che `tsc` rifiuta.
>
> Perciò la build non sostituisce il type-check, e nemmeno lo implica. Sono due
> controlli diversi e vanno eseguiti entrambi.
>
> L'avviso `Some chunks are larger than 500 kB` è preesistente e non è un errore.

---

## In fila, per chiudere una fetta

```bash
bunx tsc --noEmit -p tsconfig.app.json && bun run test && bun run lint && bun run build
```

Se uno dei quattro non è stato eseguito, la fetta non è finita — a prescindere da
quanto sembri finita.
