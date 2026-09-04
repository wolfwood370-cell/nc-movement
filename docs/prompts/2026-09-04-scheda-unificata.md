# Prompt conservato — Scheda unificata

**Data:** 2026-09-04 · **Strumento:** Claude Code · **Branch:** `claude/scheda-unificata` · **Base:** `main` = `bc564f1`

Questo è il prompt ricevuto, conservato alla lettera. Il ritorno è in
[`docs/ULTIMO-RITORNO.md`](../ULTIMO-RITORNO.md).

---

**DOVE SI LANCIA: Claude Code** — nella cartella del repo `nc-movement`, su un ramo NUOVO `claude/scheda-unificata` creato da `main` (`bc564f1`).

**Task:** la scheda cliente diventa il posto dove l'intervista d'ingresso e i test di movimento convivono. Oggi mostra solo i test; l'intervista vive in un'altra applicazione, sullo stesso database, in un altro schema. Qui NC Movement impara a leggerla e la scheda si riscrive secondo il disegno che trovi nel repo: due tracce affiancate, Dichiarato e Misurato, con le bandiere rosse unite sotto. Nessuna scrittura, nessuna superficie pubblica nuova: solo lettura e interfaccia.
**Data:** 2026-09-04
**Strumento di destinazione:** [x] Claude Code
**Branch previsto:** claude/scheda-unificata

## PRIMA DI SCRIVERE: IL DISEGNO È LA SPECIFICA
In `docs/design/` (cartella non tracciata da git, non committarla e non modificarla) ci sono 12 file. **Leggili prima di toccare codice**, in quest'ordine:
- `DECISIONI.md` per intero — è il documento di riferimento, contiene le scelte e il perché;
- `scheda-1b-presenza.html` — lo stato pieno: header, due tracce, bandiere unite, riassunto intervista, azioni, quattro linguette;
- `scheda-1b-distanza.html` · `scheda-1b-senza-consenso.html` · `scheda-1b-solo-modificate.html` — gli altri tre stati;
- `componente-consenso-tre-stati.html` · `componente-clearing-tre-stati.html` · `componente-rischio-modificata.html`;
- `clientdetail-oggi.html` è la ricostruzione della pagina attuale, serve solo per confronto.

**Regola:** dove disegno e prompt divergono, **il disegno vince sull'aspetto, questo prompt vince sui dati e sui divieti.** Se il disegno mostra un dato che questo prompt non elenca fra le fonti, non inventarlo: nominalo nel ritorno.

## LA MISURA (Cowork, 04/09, database vivo)
1. **Dove vive l'intervista.** Stesso progetto Supabase, schema **`public`**: `submissions` (54 colonne, 9 righe) più i figli collegati da `submission_id` — `health_screening` (17 colonne, dov'è il PAR-Q), `nutrition` (8), `neurotype_answers` (31). `public.submissions.client_id` punta a `movement.clients(id)` ed è **valorizzato su 9 righe su 9**.
2. **La sicurezza è già a posto, non toccarla.** Le policy di `submissions` chiedono `private.is_admin()`, e `public.admins` contiene **una sola riga: l'uid di Nicolò**. La sua sessione autenticata legge già quei dati oggi. ⛔ **Non allentare nessuna policy, non aggiungere `service_role` da nessuna parte, non creare viste per aggirare la RLS.**
3. **Come si legge da qui.** Il client è agganciato a `movement` (`createClient<Database, 'movement'>` in `src/integrations/supabase/client.ts`). Per l'intervista serve **`supabase.schema('public')`**. Nel repo non c'è ancora **nessuna** occorrenza di `.schema(`: sarà la prima.
4. **I tipi.** `src/integrations/supabase/types.ts` è generato solo per `movement`. Va rigenerato con **due schemi**: `npx supabase@latest gen types typescript --project-id srrmauojpficdswmtjya --schema movement --schema public`. Se la CLI non è autenticata, fermati e scrivilo: **non scrivere i tipi a mano.**
5. **I numeri veri, che il disegno usa.** 22 clienti · 9 con intervista · **13 senza** · 9 su 9 collegati · **11 clienti su 21 hanno come ultima FMS una modificata e 10 non ne hanno mai fatta una piena** · 2 clienti con `work_mode` `remoto`/`app` · consensi tutti a versione `v2.1`.
6. **Cosa NON esiste ancora**, e quindi non va costruito come funzionante: il **link personale** al modulo, le colonne `intake_inviato_il` e `intake_sollecitato_il`, il **neurotipo** (9 righe di risposte, 0 risultati). Dove il disegno li mostra, rendili **inerti e dichiarati** (un pulsante che non parte, con una riga che dice «in arrivo»), mai finti.

## COSA FAI
1. **Rigenera i tipi** come al punto 4 della misura.
2. **Un modulo puro per le derivazioni: `src/lib/intake.ts`.** Qui sta *tutta* la logica, e i componenti si limitano a mostrarla. Serve perché è l'unico modo di provarla:
   - lo **stato del consenso**: `firmato` · `firmato su versione superata` (firmata ≠ corrente) · `mai firmato`. La versione corrente **arriva da fuori** come parametro, non si scrive in pagina;
   - le **bandiere unite**: i PAR-Q positivi da `health_screening` più dolore attuale e infortuni, marcati **D**, e i clearing test positivi dalla FMS, marcati **M**. ⛔ **`not-performed` non è una bandiera** e non deve comparire nella banda;
   - il **riassunto**: gli otto campi, divisi in una parte **fissa** (obiettivo, frequenza, esperienza, disponibilità e logistica, contatto) e una **condizionale** che compare solo quando il dato c'è (dolore attuale, infortuni passati, farmaci). **Un campo vuoto non occupa una riga: sparisce.**
3. **Un hook `src/hooks/useIntake.ts`** che legge l'intervista del cliente con `.schema('public')`: la submission più recente per `client_id` più i suoi figli. Se non ce n'è nessuna, ritorna uno stato «assente» esplicito, non `null` ambiguo.
4. **La scheda, secondo il disegno.** Le due tracce affiancate con la loro data e il loro tipo in testa; la banda delle bandiere sotto, ogni riga col marcatore D o M; il riassunto; le azioni; **le linguette da tre a quattro**, con Intervista che contiene gli otto gruppi a scomparsa. Riusa ciò che esiste (`LastFmsCard`, `NextStepCard`, `RiskGauge`) invece di riscriverlo, ed estendilo dove serve.
5. **I quattro stati devono reggere senza cambiare forma:** in presenza con tutto · a distanza senza nessuna FMS (`work_mode` `remoto` o `app`: i quattro pulsanti dei test restano **visibili e spenti con la ragione scritta**, non nascosti) · con i test ma senza intervista (13 clienti su 22) · con sole FMS modificate. **`work_mode` assente resta «Modalità ignota»**, nessun valore predefinito.
6. ⛔ **Privacy, e non è un dettaglio di stile.** Gravidanza e stato del ciclo (`health_screening`), codice fiscale e indirizzo (`submissions`) **non compaiono mai** nel riassunto, nelle bandiere, nella testata o in qualunque parte sempre visibile. Vivono **solo** dentro i gruppi Salute e Anagrafica, che si aprono di proposito.
7. **Il token nuovo:** in `src/index.css`, `--compliance` come alias di `--warning` (`38 92% 50%`), usato per il consenso assente — che è un problema amministrativo, non clinico, e non deve suonare come una bandiera rossa. Nessun altro colore, raggio, ombra, altezza o dimensione di testo è nuovo: tutto il resto viene dai token che ci sono.
8. **Nient'altro.** Nessuna scrittura sul database, nessuna migrazione, nessuna modifica alle edge function, nessun tocco al modulo pubblico o al repo del questionario. La logica di `fms.ts`, `insights.ts`, `medicalReferral.ts`, `fmsPrescription.ts` e `ptPackProgram.ts` **non cambia**: la scheda le legge, non le riscrive.

## FILE
- **NUOVI:** `src/lib/intake.ts` (+ `intake.test.ts`) · `src/hooks/useIntake.ts` · i componenti della scheda che decidi di isolare, sotto `src/components/client/`.
- **MODIFICATI:** `src/pages/ClientDetail.tsx` · `src/integrations/supabase/types.ts` · `src/index.css` · `docs/ULTIMO-RITORNO.md` · `docs/prompts/2026-09-04-scheda-unificata.md`.
- **VIETATI (zero righe di diff):** `src/lib/fms.ts` · `src/lib/insights.ts` · `src/lib/medicalReferral.ts` · `src/lib/fmsPrescription.ts` · `src/lib/ptPackProgram.ts` · `src/integrations/supabase/client.ts` (salvo che tu debba dimostrare il contrario, e allora lo dici) · `supabase/**` · `.github/**` · ogni `tsconfig*.json` · **`docs/design/**`**.

## ACCEPTANCE (ognuno può bocciare)
1. **I quattro stati si vedono davvero**, con dati veri, girando la app in locale: un cliente in presenza con intervista e FMS piena, uno a distanza, uno dei 13 senza intervista, uno dei 10 con sole modificate. Riporta per ognuno che cosa mostra la scheda in tre righe.
2. 🔴 **Prove rosse sul modulo puro, nelle due direzioni e con ripristino byte-identico:**
   **(a)** consenso: firmata `v2.1`, corrente `v2.2` → deve dare «versione superata»; forzalo a «firmato» → **rosso**;
   **(b)** bandiere: un clearing `not-performed` → **non** compare fra le bandiere; fallo comparire → **rosso**;
   **(c)** riassunto: un campo condizionale vuoto → non produce riga; falla produrre → **rosso**.
   Riporta i sei stati con gli output.
3. 🔴 **Il cancello della privacy**, un test che legge i sorgenti dal disco come fa `cordone-lovable.test.ts`: nessun componente del riassunto, della testata o della banda nomina `pregnancy`, `cycle_status`, `tax_code`, `address`. Provalo rosso aggiungendone uno, poi ripristina.
4. `grep -rn "service_role\|is_admin\|rls" src/` → **nessuna riga nuova** rispetto a `main`. La sicurezza non è stata toccata.
5. I cancelli: `bunx tsc --noEmit -p tsconfig.app.json` exit 0 · `bun run lint` exit 0 con **17 warning** · `bun run test` exit 0 (39 esistenti + i nuovi) · `bun run build` exit 0 · **CI verde con i tre passi**.
6. `git diff --name-only origin/main...HEAD` = solo i FILE elencati; i VIETATI a 0 righe; **`docs/design/` non compare** (resta non tracciata).

## COSA RIMANDI INDIETRO
`docs/ULTIMO-RITORNO.md`: ramo e hash · che cosa hai letto del disegno e dove te ne sei discostato, con il perché · come legge l'intervista (la forma esatta della query con `.schema('public')`) · i quattro stati descritti · l'acceptance voce per voce · le prove rosse nei sei stati · ciò che il disegno mostra e i dati non sanno produrre · il link della PR. Commit con `Co-Authored-By: Claude <noreply@anthropic.com>`.
