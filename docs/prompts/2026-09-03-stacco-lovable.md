**DOVE SI LANCIA: Claude Code** — nella cartella del repo `nc-movement`, su un ramo NUOVO `claude/stacco-lovable` creato da `main` (`af0f7d0`).

**Task:** NC Movement deve smettere di dipendere da Lovable. Il database è già stato migrato e provato: vive nel progetto Supabase **NC-TOOLS**, schema **`movement`**. Qui si stacca il codice: via le due dipendenze Lovable e il login Google che ci passa attraverso, il client Supabase punta al nuovo progetto e al nuovo schema, le 45 migrazioni scritte per `public` vengono murate perché non possano più essere spinte per sbaglio, e un cancello derivato va rosso se Lovable torna. Poi push e il link della PR nel ritorno.
**Data:** 2026-09-03
**Strumento di destinazione:** [x] Claude Code
**Branch previsto:** claude/stacco-lovable

## RITUALE D'APERTURA (prima di toccare codice)
L'albero di lavoro NON è pulito: 197 file modificati. Prima di creare il ramo, esegui il passo 0 qui sotto e riportane l'esito. Non fare `git stash`, non fare `git checkout -- .` e non toccare i due file non tracciati (`.claude/`, `VALUTAZIONE-VENDITA-FMS.md`): il secondo è di Nicolò e resta fuori dai commit.

## LA MISURA (Cowork, 03/09 08:00–09:00 · DB vivo *chiamato*, non letto · `main` = `af0f7d0`)
1. **Lo schema è esposto davvero.** Chiamato PostgREST di NC-TOOLS dal browser, con la chiave publishable, nelle due direzioni: `Accept-Profile: movement` → **HTTP 401 `42501 permission denied for schema movement`**; `Accept-Profile: schema_che_non_esiste` → **HTTP 406 `PGRST106`**, con l'elenco che il server stesso stampa: «Only the following schemas are exposed: public, graphql_public, **movement**». Controllo positivo riuscito: la prova sa fallire. `movement_app` → 406, ed è giusto: le 5 funzioni interne non devono affacciarsi sull'API.
2. **`anon` non entra.** Quel `permission denied` al punto 1 è la prova d'accettazione n. 2 del piano, fatta sulla rete vera e non più solo dentro il database: senza login non si vede niente di `movement`.
3. **`public` è pulito.** `public.clients` → `PGRST205 Could not find the table`. NC Movement non ha sporcato lo schema di NC Questionario.
4. **Righe vive in `movement`:** clienti **21** · esercizi **667** · sessioni **184** · valutazioni FMS **56** (34 colonne) · `fms_screenings`, `sfma`, `ybt`, `fcs`, `bug_reports`, `organization_invitations`, `user_roles` a **0**. Tabelle 14, policy 80, funzioni `movement_app` 5, tabelle di staging rimaste **0**.
5. **L'utente.** `auth.users` ha **una** riga: `nctrainingsystems@gmail.com`, email confermata, password presente, `auth.identities.provider = email` (nessuna identità Google). Ha 1 profilo, è `owner` dell'organizzazione «Nicolò Workspace», e i 21 clienti sono suoi. **`user_roles` è vuoto** — lo era anche su Lovable, non è un danno della migrazione: `useIsStaff` legge lì, quindi le pagine Team e BugReports restano chiuse. È noto e voluto per ora: **non aggirarlo, non scrivere righe di ruolo, non allentare `AdminRoute`.**
6. **I 197 file.** `git diff` dice 197 file, 23629 righe aggiunte e 23629 tolte. Confrontando **byte a byte** ogni file fra `HEAD` e il disco dopo aver tolto i `\r`: **197 su 197 identici, 0 con modifiche vere**. È solo CRLF sul disco contro LF in `HEAD`; non c'è `.gitattributes` e `core.autocrlf` non è impostato. (Nota: `git diff --ignore-cr-at-eol` **non** lo vede su git 2.34 — non fidarti di quel flag, rifai il confronto a byte.)
7. **Il cordone Lovable, per file:** `package.json` (`@lovable.dev/cloud-auth-js` dip., `lovable-tagger` dev-dip.) · `vite.config.ts:4` (`componentTagger`) · `src/integrations/lovable/index.ts` (l'intero file: `createLovableAuth`) · `src/pages/Auth.tsx:5` (import) e `:126` (`lovable.auth.signInWithOAuth('google')`) · `src/pages/BugReports.tsx:31,194,196,214` (SQL da incollare nel SQL Editor di Lovable) · `README.md:79` · `PITCH_FMS.md:47` · `.lovable/plan.md` · `bun.lock` (158 righe, si sistema da solo). `index.html` è già pulito. `dist/` è ignorato da git e si rifà con la build.
8. **La mina.** `supabase/config.toml` ha `project_id = "zvsbkbqyjlkxocwlzegj"` — il progetto **di Lovable** — e `supabase/migrations/` ha **45 file** che creano `public.clients`, `public.sessions`… Se qualcuno domani cambia quel ref in NC-TOOLS e lancia `supabase db push`, quelle 45 migrazioni riversano NC Movement dentro lo schema `public` di un progetto condiviso. Nessuno le ha mai applicate a NC-TOOLS e non devono poterlo essere.
9. **Cosa NON serve:** nessuna chiamata `supabase.rpc(...)` nel codice (0 occorrenze) e nessun uso di `supabase.storage` (0 occorrenze) — quindi i trigger di `storage.*` non applicati durante la migrazione non hanno lettori. Le tabelle davvero usate dal codice sono 12 delle 14.

## COSA FAI
**0. Fine-riga, prima di tutto e in un commit suo.** Rifai TU la prova del punto 6 nelle due direzioni: per ogni file di `git diff --name-only`, confronta `git show HEAD:<file> | tr -d '\r'` con il file su disco passato per `tr -d '\r'`; conta gli identici e i diversi, e **stampa i due numeri nel ritorno**. Se anche **un solo** file risulta diverso nel contenuto: **fermati**, non normalizzare, scrivi quale nel ritorno — vuol dire che dopo la mia misura qualcuno ha lavorato lì dentro. Se sono 197 su 197 identici: crea `.gitattributes` con `* text=auto` e `eol=lf`, poi `git add --renormalize .` e committa da solo, con messaggio che dice il numero provato. Solo dopo crea il ramo e fai il resto.

**1. Via il cordone Lovable.**
(a) `package.json`: togli `@lovable.dev/cloud-auth-js` dalle dipendenze e `lovable-tagger` dalle dev-dipendenze, poi `bun install` così `bun.lock` si riscrive.
(b) `vite.config.ts`: via l'import di riga 4 e via `componentTagger` dall'array — resta `plugins: [react()]`, senza `.filter(Boolean)` se diventa inutile.
(c) **Cancella** `src/integrations/lovable/index.ts` e la cartella che lo contiene: è l'unico file che importa il pacchetto.
(d) `src/pages/Auth.tsx`: via l'import di riga 5, via tutta `handleGoogleSignIn`, via il pulsante «Google» e il separatore «oppure» dal JSX. Restano email+password e il recupero password, **invariati**. Se restano import inutilizzati (icone, `Separator`), toglili.
(e) `src/pages/BugReports.tsx`: quella migrazione **è applicata** (le policy `bug_reports` per proprietario sono nello schema `movement`, misurate). Togli la costante con l'SQL inline, il ramo «Lovable Cloud non l'ha ancora applicato», il pulsante che copia l'SQL e il testo che nomina la chat di Lovable. Ciò che resta della pagina deve continuare a compilare; se un pezzo diventa codice morto, va via anche quello.
(f) `README.md` e `PITCH_FMS.md`: il backend è **Supabase, progetto NC-TOOLS, schema `movement`**; l'host è **Vercel**. Due righe, non un capitolo.
(g) `git mv .lovable/plan.md docs/plan-lovable-storico.md` e togli la cartella `.lovable/`. Il documento è storia e si tiene; il cordone no.

**2. Il nuovo backend.**
(a) `src/integrations/supabase/client.ts`: aggiungi il blocco `db: { schema: 'movement' }` accanto ad `auth`, e tipizza il client con lo schema — `createClient<Database, 'movement'>(...)` — altrimenti `tsc` non trova le tabelle. Il resto del file non si tocca.
(b) `.env` (locale, non committato) e `.env.example` (committato, valori vuoti) hanno le tre variabili di sempre. I valori per `.env`: `VITE_SUPABASE_URL=https://srrmauojpficdswmtjya.supabase.co` · `VITE_SUPABASE_PROJECT_ID=srrmauojpficdswmtjya` · `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycm1hdW9qcGZpY2Rzd210anlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk5MDMsImV4cCI6MjA5ODU5NTkwM30.zPaBX6GAQIOycb7NJIsdyY3E49LCr6ajVYyeYRTGz94` — è la chiave **anon**, pubblica per costruzione: finisce nel bundle JS e la protezione è la RLS, provata al punto 2 della misura. Nessun segreto vero entra in questo prompt.
(c) **`.env` esce da git:** `git rm --cached .env .env.backup`, e `.gitignore` += `.env`, `.env.backup`, `.claude/`. Oggi sono **tracciati**: è così che un giorno una chiave vera finisce su GitHub.
(d) `src/integrations/supabase/types.ts` rigenerato per il nuovo schema: `npx supabase@latest gen types typescript --project-id srrmauojpficdswmtjya --schema movement > src/integrations/supabase/types.ts`. Se la CLI non è autenticata: **non scrivere i tipi a mano e non tirare a indovinare** — lascia il file com'è, scrivilo nel ritorno e metti il comando fra le righe per Nicolò.
(e) `vercel.json` nuovo, con la riscrittura SPA (`/(.*)` → `/index.html`): senza, i link profondi tipo `/clients/<id>` danno 404 su hosting statico.

**3. Mura le 45 migrazioni (punto 8 della misura).**
`git mv supabase/migrations supabase/migrazioni-lovable-storiche`; in `supabase/config.toml` porta `project_id` a `srrmauojpficdswmtjya`; aggiungi `supabase/LEGGIMI-NIENTE-PUSH.md` che spiega in cinque righe perché quelle migrazioni non si spingono (sono scritte per `public`, il database vive in `movement`, e il progetto ora è condiviso con NC Questionario). Le migrazioni **non si riscrivono** in questa fetta: sono storia, e riallinearle al nuovo schema è un lavoro a sé.

**4. Un cancello derivato** — `src/test/cordone-lovable.test.ts`, in vitest, che legge i sorgenti con `readFileSync` come i test già presenti:
(a) `package.json`, `vite.config.ts` e ogni file sotto `src/` → **0** occorrenze di `lovable` senza distinzione di maiuscole;
(b) `src/integrations/supabase/client.ts` contiene `schema: 'movement'`;
(c) la cartella `supabase/migrations` **non esiste**.

**5. Nient'altro.** Le tre edge function (`accept-invite`, `admin-bug-reports`, `bootstrap-owner`) **non sono distribuite** su NC-TOOLS e in questa fetta **non si distribuiscono e non si riscrivono le chiamate**: `accept-invite` parte solo con `?invite=` nell'indirizzo (`Auth.tsx:80-86`) e gli inviti in tabella sono 0; `admin-bug-reports` sta dietro `AdminRoute`, che è chiuso perché `user_roles` è vuoto. **Nominale nel ritorno**, non toccarle. Nessun file sotto `supabase/functions/**` cambia.

## FILE
- **NUOVI:** `.gitattributes` · `vercel.json` · `supabase/LEGGIMI-NIENTE-PUSH.md` · `src/test/cordone-lovable.test.ts` · `docs/plan-lovable-storico.md` (spostato) · `docs/ULTIMO-RITORNO.md` · `docs/prompts/2026-09-03-stacco-lovable.md` (questo prompt, conservato).
- **MODIFICATI:** `package.json` · `bun.lock` · `vite.config.ts` · `src/pages/Auth.tsx` · `src/pages/BugReports.tsx` · `src/integrations/supabase/client.ts` · `src/integrations/supabase/types.ts` · `.env.example` · `.gitignore` · `supabase/config.toml` · `README.md` · `PITCH_FMS.md`.
- **CANCELLATI / SPOSTATI:** `src/integrations/lovable/` · `.lovable/` · `supabase/migrations/` → `supabase/migrazioni-lovable-storiche/` · `.env` e `.env.backup` fuori dall'indice (i file restano sul disco).
- **VIETATI (zero righe di diff):** `supabase/functions/**` · ogni file dentro `supabase/migrazioni-lovable-storiche/` · `src/hooks/useIsStaff.ts` · `src/components/AdminRoute.tsx` · `src/lib/**` e i tre test che ci vivono · `VALUTAZIONE-VENDITA-FMS.md` (non tracciato, resta fuori).

## ACCEPTANCE (ognuno può bocciare)
1. `grep -i lovable package.json` → **0 righe**. È il criterio che ha chiesto Nicolò.
2. `grep -rniI --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -l lovable .` → solo `docs/plan-lovable-storico.md`, `VALUTAZIONE-VENDITA-FMS.md` e `docs/prompts/2026-09-03-stacco-lovable.md`. Niente altro.
3. 🔴 **Prove rosse, tutte nelle due direzioni e con ripristino byte-identico:** il cancello (a) con `lovable-tagger` rimesso in `package.json` → **rosso**; il (b) con `movement` cambiato in `public` → **rosso**; il (c) con una `supabase/migrations/` vuota ricreata → **rosso**. Riporta gli output dei sei stati.
4. La prova dei fine-riga del passo 0, con i due numeri (identici / diversi) e il comando che li ha prodotti.
5. I cancelli: `bunx tsc --noEmit` · `bun run lint` (dichiara la baseline di partenza e quella d'arrivo: devono coincidere) · `bun run test` (i 3 test esistenti + i nuovi) · `bun run build`.
6. `bun run dev` parte, `/auth` si carica **senza errori in console** e senza pulsante Google. Il login **non lo fai tu**: la password è di Nicolò. Fermati lì e scrivilo.
7. `git diff --name-only origin/main...HEAD` = solo i FILE elencati sopra; i VIETATI a 0 righe.

## COSA RIMANDI INDIETRO
`docs/ULTIMO-RITORNO.md` scritto per questa fetta: ramo e hash · esito del rituale d'apertura · i due numeri della prova fine-riga · manifesto dei file e vietati a 0 · ogni voce dell'acceptance col comando e l'output · le tre prove rosse nei sei stati · le divergenze e ciò che hai visto e non toccato (le tre edge function, `user_roles` vuoto, le 45 migrazioni murate, l'esito di `gen types`) · il link per aprire la PR · **le righe per Nicolò, nell'ordine:** (1) le tre variabili da mettere su Vercel, (2) il comando `gen types` se non sei riuscito a eseguirlo, (3) la prova finale che tocca a lui — entrare con email e password e vedere **21 clienti, 667 esercizi, 184 sessioni**. Commit con `Co-Authored-By: Claude <noreply@anthropic.com>`.
