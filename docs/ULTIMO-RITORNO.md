# Ultimo ritorno — Stacco da Lovable

**Data:** 2026-09-03 · **Ramo:** `claude/stacco-lovable` · **Base:** `main` = `af0f7d0`
**Prompt conservato:** [`docs/prompts/2026-09-03-stacco-lovable.md`](prompts/2026-09-03-stacco-lovable.md)

## Commit

| hash | cosa |
|---|---|
| `4a5ea3f` | Normalizza i fine-riga con `.gitattributes` (`* text=auto eol=lf`) |
| `d6f0abf` | Taglia il cordone Lovable: dipendenze, ponte OAuth e testi |
| `0ef3d99` | Punta il client al progetto NC-TOOLS e allo schema `movement` |
| `2ad80ec` | Mura le 45 migrazioni scritte per `public` e ripunta `config.toml` |
| `ab6611b` | Aggiunge il cancello derivato che va rosso se Lovable torna |

(a questi si aggiunge il commit di documentazione che porta questo file.)

---

## Rituale d'apertura

L'albero **non era** come descritto nella misura. `git status --porcelain` mostrava **una** riga
(`?? VALUTAZIONE-VENDITA-FMS.md`) e `git diff --name-only` ne mostrava **zero**, non 197.

Il motivo: qui `core.autocrlf=true` **è** impostato — a livello di repo, non globale — e git è
**2.54.0.windows.1**, non 2.34. Con quella configurazione git normalizza in lettura e non vede
alcuna differenza. La misura diceva «`core.autocrlf` non è impostato»: sulla macchina o nel
momento della misura non lo era, adesso sì.

Poiché `git diff --name-only` era vuoto, la prova del passo 0 sarebbe stata vuota anche lei
(0 identici / 0 diversi: nessuna informazione). L'ho quindi rifatta **su tutti i 224 file
tracciati**, confrontando i byte grezzi e poi i byte senza `\r`. Nessun `git stash`, nessun
`git checkout -- .`, i due file non tracciati mai toccati.

## Prova fine-riga — i due numeri

```
file tracciati totali      : 224
identici byte-a-byte (raw) : 27
diversi byte-a-byte (raw)  : 197
  -> di cui SOLO CRLF (identici dopo tr -d \r) : 197
  -> di cui CON MODIFICHE VERE                 : 0
```

**197 identici · 0 diversi.** Il numero coincide con la misura.

Comando che li ha prodotti (per ogni file tracciato: blob di `HEAD` contro file su disco, prima
grezzi, poi entrambi privati dei `\r`):

```bash
python - <<'PY'
import subprocess, os
files = [f.decode('utf-8') for f in subprocess.run(['git','ls-files','-z'],
         capture_output=True).stdout.split(b'\0') if f]
raw_same=0; crlf_only=[]; real_diff=[]
for f in files:
    blob = subprocess.run(['git','cat-file','blob','HEAD:'+f],
                          capture_output=True, check=True).stdout
    disk = open(f,'rb').read()
    if blob == disk: raw_same += 1; continue
    (crlf_only if blob.replace(b'\r',b'') == disk.replace(b'\r',b'') else real_diff).append(f)
print('identici byte-a-byte (raw) :', raw_same)
print('solo CRLF                  :', len(crlf_only))
print('con modifiche vere         :', len(real_diff))
PY
```

**Conferma indipendente:** dopo `git add --renormalize .` l'indice conteneva **solo**
`.gitattributes` — `1 file changed, 1 insertion(+)`. Se anche un solo file avesse avuto modifiche
vere, sarebbe comparso lì.

**Divergenza di ordine, dichiarata:** il prompt diceva di committare `.gitattributes` e *poi*
creare il ramo. Ho creato il ramo prima e messo quel commit come primo commit del ramo, per non
lasciare `main` locale divergente da `origin/main`. Il risultato nella PR è identico:
`.gitattributes` è nel diff in entrambi i casi.

---

## Manifesto dei file

`git diff --name-status -M origin/main...HEAD` — 65 voci, di cui **46 rinomini R100**
(byte-identici: 45 migrazioni + `.lovable/plan.md`).

**Nuovi (A):** `.gitattributes` · `vercel.json` · `supabase/LEGGIMI-NIENTE-PUSH.md` ·
`src/test/cordone-lovable.test.ts`
**Modificati (M):** `.env.example` · `.gitignore` · `PITCH_FMS.md` · `README.md` · `bun.lock` ·
`package.json` · `src/integrations/supabase/client.ts` · `src/integrations/supabase/types.ts` ·
`src/pages/Auth.tsx` · `src/pages/BugReports.tsx` · `supabase/config.toml` · `vite.config.ts`
**Cancellati (D):** `src/integrations/lovable/index.ts` · `.env` · `.env.backup` (dall'indice; i
file restano sul disco)
**Rinominati (R100):** `.lovable/plan.md` → `docs/plan-lovable-storico.md` ·
`supabase/migrations/*` → `supabase/migrazioni-lovable-storiche/*` (45 file)

### Vietati — tutti a zero

```
$ git diff --name-only -M origin/main...HEAD | grep -E "^supabase/functions/|^src/hooks/useIsStaff|^src/components/AdminRoute|^src/lib/|VALUTAZIONE"
(nessuna riga)

$ git diff --name-status -M origin/main...HEAD | grep "^R" | grep -v "^R100"
(nessuna riga — ogni rinomino è byte-identico)
```

`supabase/functions/**`, `src/hooks/useIsStaff.ts`, `src/components/AdminRoute.tsx`, `src/lib/**`
e i tre test che ci vivono: **non compaiono affatto** nel diff. `VALUTAZIONE-VENDITA-FMS.md`
è rimasto non tracciato e fuori da ogni commit.

---

## Acceptance

### 1. `grep -i lovable package.json` → 0 righe ✅

```
$ grep -i lovable package.json
(nessuna riga)
$ grep -ci lovable package.json
0
```

### 2. `grep -rniI ... -l lovable .` — ⚠️ sette file, non tre

```
$ grep -rniI --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -l lovable .
./docs/plan-lovable-storico.md
./docs/prompts/2026-09-03-stacco-lovable.md
./docs/ULTIMO-RITORNO.md
./src/test/cordone-lovable.test.ts
./supabase/LEGGIMI-NIENTE-PUSH.md
./supabase/migrazioni-lovable-storiche/20260527130000_security_hardening.sql
./VALUTAZIONE-VENDITA-FMS.md
```

Tre sono quelle attese: `docs/plan-lovable-storico.md`, `VALUTAZIONE-VENDITA-FMS.md` e il prompt
conservato. Le altre quattro sono **divergenze**, di due nature diverse.

**Una è un conflitto fra due criteri del prompt.**
`supabase/migrazioni-lovable-storiche/20260527130000_security_hardening.sql:121` contiene il
commento «*so the first assignment must be done via the Lovable SQL Editor*». Quel file è nella
lista dei **vietati**: zero righe di diff. L'acceptance 2 e la lista dei vietati non possono
essere soddisfatte insieme; ho rispettato il divieto e lascio la decisione a Nicolò. Una riga di
`sed` lo sistemerebbe, ma toccherebbe un file che il prompt dice di non toccare.

**Tre sono file che parlano di Lovable per mestiere**, tutti previsti dal prompt fra i NUOVI, ma
non contati nell'elenco dell'acceptance: `supabase/LEGGIMI-NIENTE-PUSH.md` (spiega perché quelle
migrazioni non si spingono), `src/test/cordone-lovable.test.ts` (è il cancello: deve nominare ciò
che vieta) e `docs/ULTIMO-RITORNO.md` (questo documento). Nessuno dei tre può esistere senza la
parola.

**Il criterio che conta — nessun `lovable` in `package.json`, `vite.config.ts` e nel codice
applicativo sotto `src/` — è rispettato**, ed è esattamente ciò che il cancello derivato verifica
a ogni `bun run test`.

### 3. 🔴 Le tre prove rosse — sei stati

Verifica del ripristino: **md5 identico** prima e dopo, e `git status --porcelain` che torna a
mostrare solo `?? VALUTAZIONE-VENDITA-FMS.md` (il ramo era committato, quindi qualsiasi residuo
sarebbe comparso lì).

**(a) `lovable-tagger` rimesso in `package.json`**

Stato 1 — guasto inserito (`md5 252abad89b6468691f45a106c4de6c20`, riga 82 aggiunta):
```
FAIL  src/test/cordone-lovable.test.ts > cordone Lovable > package.json, vite.config.ts e src/ non lo nominano piu
AssertionError: expected [ 'package.json' ] to deeply equal []
Test Files  1 failed (1)
Tests  1 failed | 2 passed (3)
EXIT=1
```
Stato 2 — ripristinato (`md5 252abad89b6468691f45a106c4de6c20`, identico; `git status` pulito):
```
✓ src/test/cordone-lovable.test.ts (3 tests) 61ms
Test Files  1 passed (1)
Tests  3 passed (3)
EXIT=0
```

**(b) `movement` cambiato in `public` in `client.ts`**

Stato 3 — guasto inserito (`md5 c3e76c2fda481fc29cd8afbf94779f11`, riga 13 `schema: 'public',`):
```
FAIL  src/test/cordone-lovable.test.ts > cordone Lovable > il client Supabase punta allo schema movement
AssertionError: expected '// This file is automatically generat…' to contain 'schema: \'movement\''
Test Files  1 failed (1)
Tests  1 failed | 2 passed (3)
EXIT=1
```
Stato 4 — ripristinato (`md5 c3e76c2fda481fc29cd8afbf94779f11`, identico; `git status` pulito):
```
✓ src/test/cordone-lovable.test.ts (3 tests) 49ms
Test Files  1 passed (1)
Tests  3 passed (3)
EXIT=0
```

**(c) `supabase/migrations/` vuota ricreata**

Stato 5 — guasto inserito (`mkdir supabase/migrations`):
```
FAIL  src/test/cordone-lovable.test.ts > cordone Lovable > supabase/migrations non esiste piu
AssertionError: expected true to be false // Object.is equality
Test Files  1 failed (1)
Tests  1 failed | 2 passed (3)
EXIT=1
```
Stato 6 — ripristinato (`rmdir`; `git status` pulito):
```
✓ src/test/cordone-lovable.test.ts (3 tests) 80ms
Test Files  1 passed (1)
Tests  3 passed (3)
EXIT=0
```

Le tre asserzioni sanno fallire, ognuna per il proprio motivo e nominando il colpevole.

### 4. Prova dei fine-riga

Sopra: **197 identici / 0 diversi**, col comando.

### 5. I cancelli

| cancello | baseline (`af0f7d0`) | arrivo (`ab6611b`) |
|---|---|---|
| `bunx tsc --noEmit` | exit **0** | exit **0** |
| `bun run lint` | exit **1** — `✖ 21 problems (4 errors, 17 warnings)` | exit **1** — `✖ 21 problems (4 errors, 17 warnings)` |
| `bun run test` | 4 file, **27 test**, exit 0 | 5 file, **30 test**, exit 0 |
| `bun run build` | exit **0** | exit **0** |

Lint: baseline e arrivo **coincidono**, verificato con `diff` fra i due output filtrati, non a
occhio — «IDENTICO alla baseline». Il lint era già rosso su `main` (4 errori `no-explicit-any`
preesistenti) e lo è rimasto uguale: non ho né sistemato né peggiorato nulla.

Test: i 4 file esistenti (27 test) restano verdi, +3 test del cancello = 30.

### 6. `bun run dev` e `/auth`

Server partito sulla 8080, pagina caricata. Testo della pagina:

```
NC Movement
Bentornato
Accesso riservato. Inserisci le tue credenziali.
EMAIL
PASSWORD
Password dimenticata?
Accedi
Accesso riservato al titolare. Le registrazioni sono disabilitate.
```

**Nessun pulsante Google, nessun separatore «oppure».** Console:

```
[debug] [vite] connecting...
[debug] [vite] connected.
[info] Download the React DevTools for a better development experience
```

**Zero errori.** Prova aggiuntiva sul bundle di produzione:

```
$ grep -roh "https://[a-z]*\.supabase\.co" dist/assets/ | sort -u
https://srrmauojpficdswmtjya.supabase.co
$ grep -rl "zvsbkbqyjlkxocwlzegj" dist/     → vuoto
$ grep -rli "lovable" dist/                 → vuoto
```

**Il login non l'ho fatto: la password è di Nicolò. Mi sono fermato alla schermata di accesso.**

### 7. Diff dei file

Vedi il manifesto sopra: le voci corrispondono all'elenco del prompt, i vietati sono a zero.
Un'aggiunta non prevista, dichiarata: `.gitignore` ignora anche `supabase/.temp/`, cartella di
cache che la CLI Supabase crea da sola quando si generano i tipi — senza quella riga sarebbe
finita in git al primo `git add -A`.

---

## Divergenze dalla misura

1. **L'albero era pulito, non a 197 file.** `core.autocrlf=true` è impostato a livello di repo e
   git è 2.54: git normalizzava già in lettura. La differenza CRLF/LF sul disco c'era davvero
   (197 file), ma non emergeva da `git diff`. `.gitattributes` la rende esplicita e indipendente
   dalla configurazione della singola macchina.
2. **`bun.lock` non si è sistemato da solo.** Dopo aver tolto le due dipendenze e rilanciato
   `bun install`, restavano **154** occorrenze di `lovable`: erano gli **URL del registry** —
   `https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...` — congelati nel
   lockfile da un `bun install` girato dentro la sandbox di Lovable. Ogni pacchetto del progetto,
   Supabase e React compresi, si scaricava da un mirror di Lovable. Le ho riportate a
   `registry.npmjs.org` e ho **reinstallato da zero** (`rm -rf node_modules && bun install`):
   492 pacchetti, hash `sha512` tutti verificati — prova che i tarball del registry ufficiale sono
   gli stessi. Senza questo passaggio il repo sarebbe rimasto dipendente da un'infrastruttura
   Lovable per ogni installazione futura.
3. **I test esistenti non usano `readFileSync`.** Il prompt diceva «come i test già presenti»: i
   quattro test presenti sono unitari puri. Il cancello legge comunque i sorgenti dal disco, come
   richiesto, ma è il primo del suo genere nel repo.
4. **L'acceptance 2 e la lista dei vietati sono in conflitto** su
   `migrazioni-lovable-storiche/20260527130000_security_hardening.sql` (vedi acceptance 2).
5. **Attribuzione dei commit:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` invece di
   `Claude`, come impone la configurazione della sessione.

## Visto e non toccato

- **Le tre edge function** — `accept-invite`, `admin-bug-reports`, `bootstrap-owner`: **non
  distribuite** su NC-TOOLS. Nessun file sotto `supabase/functions/**` è cambiato e nessuna
  chiamata è stata riscritta. Conseguenze note e accettate: `accept-invite` parte solo con
  `?invite=` nell'indirizzo (0 inviti in tabella); `admin-bug-reports` sta dietro `AdminRoute`.
  **Finché non sono distribuite, la pagina BugReports non caricherà nulla dal server** — la sua
  unica sorgente dati è quella funzione.
- **`user_roles` è vuoto** — lo era anche su Lovable. `useIsStaff` legge lì, quindi Team e
  BugReports restano chiuse. Non ho scritto righe di ruolo, non ho allentato `AdminRoute`, non ho
  aggirato niente.
- **Le 45 migrazioni** sono murate, non riscritte: rinomina pura, zero righe cambiate. Restano
  leggibili come storia dello schema.
- **`gen types` è riuscito**: `npx supabase@latest gen types typescript --project-id
  srrmauojpficdswmtjya --schema movement` ha risposto senza bisogno di autenticazione e ha
  prodotto **14 tabelle** — esattamente le 14 contate sul database. `tsc` passa contro quei tipi,
  il che conferma che le 12 tabelle usate dal codice esistono davvero nello schema `movement` e
  con le colonne attese.
- **`.env` e `.env.backup`** erano **tracciati**: ora sono fuori dall'indice e in `.gitignore`
  insieme a `.claude/`. I file restano sul disco. La chiave nel `.env` è la **anon**, pubblica per
  costruzione: finisce nel bundle JS e chi la protegge è la RLS.

---

## Le righe per Nicolò

### 1. Le tre variabili da mettere su Vercel

Project → Settings → Environment Variables (Production, Preview e Development):

```
VITE_SUPABASE_URL              https://srrmauojpficdswmtjya.supabase.co
VITE_SUPABASE_PROJECT_ID       srrmauojpficdswmtjya
VITE_SUPABASE_PUBLISHABLE_KEY  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycm1hdW9qcGZpY2Rzd210anlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk5MDMsImV4cCI6MjA5ODU5NTkwM30.zPaBX6GAQIOycb7NJIsdyY3E49LCr6ajVYyeYRTGz94
```

Sono le stesse tre del `.env` locale. Vanno rimesse a mano a ogni cambio di progetto: Vercel non
le legge dal repo, e il `.env` ora non è più committato.

### 2. Il comando `gen types`

Non serve — l'ho eseguito e `src/integrations/supabase/types.ts` è già rigenerato. Da rilanciare
solo quando lo schema `movement` cambia:

```bash
npx supabase@latest gen types typescript --project-id srrmauojpficdswmtjya --schema movement > src/integrations/supabase/types.ts
```

### 3. La prova finale, che tocca a te

```bash
bun run dev
```

Vai su `http://localhost:8080/auth`, entra con `nctrainingsystems@gmail.com` e la tua password —
io mi sono fermato prima, la password non ce l'ho. Devi vedere:

- **21 clienti**
- **667 esercizi**
- **184 sessioni**

Se i numeri tornano, il codice sta parlando con lo schema `movement` di NC-TOOLS e lo stacco è
completo. Se la pagina è vuota ma il login riesce, il problema è la RLS o la sessione, non lo
schema. **Le Segnalazioni Bug resteranno vuote in ogni caso**: dipendono da una edge function non
ancora distribuita (vedi «Visto e non toccato»).
