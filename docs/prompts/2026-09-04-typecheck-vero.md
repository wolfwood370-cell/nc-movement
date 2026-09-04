# Prompt conservato — Type-check vero

**Data:** 2026-09-04 · **Strumento:** Claude Code · **Branch:** `claude/typecheck-vero` · **Base:** `main` = `15f91f9`

Questo è il prompt ricevuto, conservato alla lettera. Il ritorno è in
[`docs/ULTIMO-RITORNO.md`](../ULTIMO-RITORNO.md).

---

**DOVE SI LANCIA: Claude Code** — nella cartella del repo `nc-movement`, su un ramo NUOVO `claude/typecheck-vero` creato da `main` (`15f91f9`).

**Task:** il passo `Type-check (non-blocking)` della CI esegue `bunx tsc --noEmit`, che in questo repo **non compila niente**: `tsconfig.json` ha `"files": []` e delega a due project references, quindi senza `-p` il compilatore guarda il progetto radice, cioè zero file, e passa sempre. Il comando che compila davvero è `bunx tsc --noEmit -p tsconfig.app.json` (161 file) e oggi trova 5 errori, tutti in un solo file. Qui si sistemano quei 5 errori e si fa in modo che il passo controlli qualcosa e possa bocciare.
**Data:** 2026-09-04
**Strumento di destinazione:** [x] Claude Code
**Branch previsto:** claude/typecheck-vero

## RITUALE D'APERTURA
`git status` dovrebbe mostrare solo `?? VALUTAZIONE-VENDITA-FMS.md` e la cartella `?? docs/design/`, entrambe di Nicolò: non toccarle e non committarle. Se mostra altro, fermati e scrivilo.

## LA MISURA (Cowork, 03–04/09)
1. **Il comando vuoto.** `tsconfig.json` ha `"files": []` e `"references"` verso `tsconfig.app.json` e `tsconfig.node.json`. `bunx tsc --noEmit` esce 0 e `--listFiles | grep -c "src/"` dà **0**. È stato scoperto perché delle sonde deliberatamente sbagliate restavano verdi.
2. **Lo stesso comando è nel workflow**, al passo `Type-check (non-blocking)` di `.github/workflows/ci.yml`, con `continue-on-error: true` e il commento «Surfaced, not enforced». Non è nemmeno *surfaced*.
3. **Il comando vero trova 5 errori, tutti in `src/components/ui/chart.tsx`** e nessuno altrove: `TS2339` su `payload` (riga 106) e `label` (111), `TS2344` su `"payload" | "verticalAlign"` (233), `TS2339` su `length` (240) e `map` (249). Sono attriti fra il componente chart di shadcn e i tipi di recharts, preesistenti e mai visti da nessuno.
4. **L'asticella è bassa comunque:** `tsconfig.app.json` ha `strict: false` e `noImplicitAny: false`. Quei 5 errori sono ciò che sopravvive a un controllo già indulgente. **Non alzare la severità in questa fetta:** è un'altra fetta, molto più grande.
5. La CI è verde dal run #36 e da lì esegue lint e test a ogni push.

## COSA FAI
1. **Sistema i 5 errori di `src/components/ui/chart.tsx`**, al livello dei tipi. Sono errori di tipizzazione fra shadcn e recharts: si risolvono dichiarando i tipi che recharts espone davvero per quel punto, non spegnendo il controllo.
2. ⛔ **VIETATO nascondere:** nessun `any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, e nessun allentamento di `tsconfig*.json`. Se l'unica strada che vedi è una di queste, **fermati e scrivilo nel ritorno**: vuol dire che la fetta è più grande di così.
3. **Non cambiare il comportamento del componente.** `chart.tsx` disegna i grafici dell'app: il tooltip, la legenda e le serie devono restare identici. Se il tipo corretto rivela che il codice legge un campo che a runtime può non esserci, **quello è un difetto vero**: gestiscilo e nominalo forte nel ritorno.
4. **Il workflow.** In `.github/workflows/ci.yml`, il passo del type-check diventa `bunx tsc --noEmit -p tsconfig.app.json`, **perde `continue-on-error: true`** e cambia nome in `Type-check`. Il commento sopra si riscrive dicendo la verità: che il comando senza `-p` non compilava niente, e la data in cui l'abbiamo scoperto.
5. **Nient'altro.** I 17 warning di eslint restano, la severità di `tsconfig` resta, nessun altro file di `src/` si tocca.

## FILE
- **MODIFICATI:** `src/components/ui/chart.tsx` · `.github/workflows/ci.yml` · `docs/ULTIMO-RITORNO.md` · `docs/prompts/2026-09-04-typecheck-vero.md` (questo prompt, conservato).
- **VIETATI (zero righe di diff):** `tsconfig.json` · `tsconfig.app.json` · `tsconfig.node.json` · `eslint.config.js` · `src/lib/**` · `src/pages/**` · `src/integrations/**` · `src/test/**` · `docs/design/**` · `VALUTAZIONE-VENDITA-FMS.md`.

## ACCEPTANCE (ognuno può bocciare)
1. `bunx tsc --noEmit -p tsconfig.app.json` → **exit 0, zero errori**. Riporta anche il numero di file compilati (`--listFiles | grep -c "src/"`), che deve restare intorno a 161: se cala, hai escluso qualcosa invece di sistemarlo.
2. `grep -n "any\|as unknown as\|@ts-ignore\|@ts-expect-error\|eslint-disable" src/components/ui/chart.tsx` → nessuna riga **nuova** rispetto a `main` (dichiara quante ce n'erano prima e quante dopo).
3. `bun run lint` exit 0 con **17 warning**, `bun run test` exit 0 con **30 test**, `bun run build` exit 0.
4. 🔴 **Prova rossa, nelle due direzioni e con ripristino byte-identico:** introduci un errore di tipo evidente in un file qualsiasi sotto `src/` (per esempio assegna una stringa a un numero), lancia `bunx tsc --noEmit -p tsconfig.app.json` → **rosso, con quel file e quella riga**; ripristina (md5 identico, `git status` pulito) → **verde**. Riporta i due output e i due md5. Serve a provare che il comando nuovo **guarda davvero i file**, non solo che oggi passa.
5. 🟢 **La prova sulla CI vera:** apri la PR e leggi il log del run. Il passo `Type-check` deve comparire **senza** `continue-on-error`, eseguire il comando con `-p`, ed essere verde. Incolla le righe del log.
6. `git diff --name-only origin/main...HEAD` = solo i FILE elencati; i VIETATI a 0 righe.

## COSA RIMANDI INDIETRO
`docs/ULTIMO-RITORNO.md` per questa fetta: ramo e hash · i 5 errori con il messaggio originale e come hai sistemato ciascuno · se hai trovato un campo che a runtime può mancare, che cos'era · il conteggio dei file compilati prima e dopo · l'acceptance voce per voce col comando e l'output · la prova rossa nei due stati coi md5 · le righe del log della CI · il link della PR. Commit con `Co-Authored-By: Claude <noreply@anthropic.com>`.
