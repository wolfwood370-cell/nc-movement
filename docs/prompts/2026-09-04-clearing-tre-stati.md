# Prompt conservato — Clearing a tre stati

**Data:** 2026-09-04 · **Strumento:** Claude Code · **Branch:** `claude/clearing-tre-stati` · **Base:** `main` = `90d3171`

Questo è il prompt ricevuto, conservato alla lettera. Il ritorno è in
[`docs/ULTIMO-RITORNO.md`](../ULTIMO-RITORNO.md).

---

**DOVE SI LANCIA: Claude Code** — nella cartella del repo `nc-movement`, su un ramo NUOVO `claude/clearing-tre-stati` creato da `main` (dopo il merge di `claude/typecheck-vero`).

**Task:** il referto medico costruito da `buildReferralData` elenca solo i clearing test POSITIVI. Chi legge il referto vede tre test citati su quattro e conclude che gli altri erano negativi. Ma in una FMS **modificata** due dei quattro non vengono mai eseguiti, e nel database risultano `false` invece che «non misurato»: il referto dichiara negativo ciò che nessuno ha misurato. Qui i clearing test acquistano **tre stati** — positivo, negativo, non eseguito — e il referto li elenca tutti e quattro col loro stato.
**Data:** 2026-09-04
**Strumento di destinazione:** [x] Claude Code
**Branch previsto:** claude/clearing-tre-stati

## RITUALE D'APERTURA
`git status` deve mostrare solo `?? VALUTAZIONE-VENDITA-FMS.md` e `?? docs/design/`, che sono di Nicolò: non toccarle, non committarle. Leggi `docs/design/DECISIONI.md` (§ clearing) e `docs/design/componente-clearing-tre-stati.html` prima di scrivere: il disegno di questa fetta esiste già.

## LA MISURA (Cowork, 04/09 · repo e database vivo)
1. **Quali clearing vengono eseguiti dipende dal tipo di FMS.** `src/components/fms/FmsWizard.tsx`: `STEPS_FULL` (righe ~27-32) porta `ankle_clearing` su Inline Lunge, `shoulder_clearing` su Shoulder Mobility, `spinal_extension` su Trunk Stability Push-Up, `spinal_flexion` su Rotary Stability. `STEPS_MODIFIED` (righe ~36-38) ha **solo** Deep Squat, Shoulder Mobility (`shoulder_clearing`) e ASLR (`ankle_clearing`). **In una modificata, estensione e flessione spinale non vengono MAI chieste.**
2. **Il database non sa dirlo.** Su **14 FMS modificate su 14**, `clearing_spinal_extension_pain` e `clearing_spinal_flexion_pain` valgono `false`, mai `null`. I punteggi dei pattern non misurati sono invece correttamente `null` (14 su 14 per `hurdle_step_left` e `trunk_stability_pushup_score`). Quei due `false` sono **un campo mai toccato, non un esito**.
3. **Quanto pesa:** 11 clienti su 21 hanno come ultima FMS una modificata, e 10 non ne hanno mai fatta una piena. Non è un caso limite.
4. **Dove si rompe.** `src/lib/medicalReferral.ts`, `clearingMap` (righe ~126-131) e il ciclo subito sotto: `if (c.flag)` spinge nel referto **solo i positivi**. Non esiste il concetto di negativo né di non eseguito. Unico chiamante: `src/components/insights/MedicalReferralReport.tsx:50`.
5. **Il rischio invece è a posto:** `insights.ts:99-103` scala già `fmsMax` e `fmsCutoff` col tipo, e `anyClearing` (`:109-114`) si accende solo sui `true`, quindi i `false` finti non producono falsi allarmi. **Il difetto vive solo nel referto.**

## COSA FAI
1. **Una sola fonte di verità su quali clearing appartengono a quale protocollo.** Oggi la conoscenza sta dentro `FmsWizard.tsx` come struttura dei passi. Estraila in `src/lib/fms.ts` — per esempio `CLEARING_BY_TYPE: Record<FmsAssessmentType, ClearingKey[]>` — e fai in modo che **il wizard e il referto leggano la stessa costante**. Il wizard non deve cambiare comportamento: deve solo smettere di essere l'unico posto che lo sa. Se le due strade divergessero domani, il difetto tornerebbe.
2. **`ReferralClearingFinding` acquista uno stato:** `'positive' | 'negative' | 'not-performed'`. `buildReferralData` riceve il tipo di FMS (leggilo da `fms.assessment_type` con `isModifiedFms`, non aggiungere un parametro se il dato è già nella riga) e produce **una voce per ognuno dei quattro** clearing, non solo per i positivi:
   - **positivo** quando il flag di dolore è `true` — descrizione come oggi, lateralità compresa;
   - **negativo** quando il test appartiene al protocollo eseguito e il flag è `false`;
   - **non eseguito** quando il test **non appartiene** al protocollo di quel tipo di FMS.
3. **`MedicalReferralReport.tsx` li mostra tutti e quattro**, ognuno col suo stato, e quando ce n'è almeno uno non eseguito aggiunge sotto una riga: «FMS modificata: estensione e flessione spinale non fanno parte del protocollo eseguito». Il disegno di riferimento è `docs/design/componente-clearing-tre-stati.html`.
4. ⛔ **Il lock clinico non cambia.** Solo `positive` alimenta i red flag e il blocco di FCS/YBT/PT Pack, esattamente come oggi. `not-performed` **non è** una bandiera e non deve accendere niente. Se dopo la tua modifica un cliente che prima non era bloccato risulta bloccato, hai rotto qualcosa: fermati.
5. **Non toccare il database, né le migrazioni, né i tipi generati.** Lo stato si deriva, non si memorizza.
6. **Nient'altro.** `insights.ts`, il calcolo del rischio, `fmsPrescription.ts`, il PT Pack: zero righe.

## FILE
- **MODIFICATI:** `src/lib/fms.ts` · `src/lib/medicalReferral.ts` · `src/lib/medicalReferral.test.ts` · `src/components/fms/FmsWizard.tsx` (solo per leggere la costante) · `src/components/insights/MedicalReferralReport.tsx` · `docs/ULTIMO-RITORNO.md` · `docs/prompts/2026-09-04-clearing-tre-stati.md`.
- **VIETATI (zero righe di diff):** `src/lib/insights.ts` · `src/lib/fmsPrescription.ts` · `src/lib/ptPackProgram.ts` · `src/pages/**` · `src/integrations/**` · `supabase/**` · `docs/design/**` · ogni `tsconfig*.json` e `.github/workflows/ci.yml`.

## ACCEPTANCE (ognuno può bocciare)
1. **Una FMS modificata produce quattro voci di clearing**, di cui `Spinal Extension Clearing` e `Spinal Flexion Clearing` con stato **`not-performed`**, e **mai** `negative`. Mostralo con un test.
2. **Una FMS piena con tutti i flag a `false` produce quattro voci `negative`**, nessuna `not-performed`.
3. **Un flag positivo resta positivo** e conserva la lateralità («(sinistro)», «(destro)», «(bilaterale)»), su piena e su modificata.
4. 🔴 **Prove rosse, tutte nelle due direzioni e con ripristino byte-identico:**
   **(a)** togli `spinal_extension` da `CLEARING_BY_TYPE.full` → il test del punto 2 diventa **rosso**;
   **(b)** aggiungi `spinal_extension` a `CLEARING_BY_TYPE.modified` → il test del punto 1 diventa **rosso**;
   **(c)** fai emettere `negative` al posto di `not-performed` → rosso.
   Riporta i sei stati con l'output e i md5.
5. **Il lock clinico è invariato:** un test che monta il calcolo dei red flag su una FMS modificata con tutti i clearing a `false` e verifica che **non** ci sia blocco. Dichiara se esisteva già un test equivalente.
6. I cinque test esistenti di `medicalReferral.test.ts` **restano verdi e non riscritti**. Se uno va sistemato, spiega perché e mostra il prima e il dopo.
7. I cancelli: `bun run lint` exit 0 · `bunx tsc --noEmit -p tsconfig.app.json` exit 0 · `bun run test` exit 0 · `bun run build` exit 0 · CI verde con i tre passi eseguiti.
8. `git diff --name-only origin/main...HEAD` = solo i FILE elencati; i VIETATI a 0 righe.

## COSA RIMANDI INDIETRO
`docs/ULTIMO-RITORNO.md`: ramo e hash · dove hai messo la costante e come la leggono wizard e referto · un esempio del referto prodotto da una modificata, testo com'esce · l'acceptance voce per voce · le tre prove rosse nei sei stati coi md5 · la prova che il lock non è cambiato · le divergenze e ciò che hai visto e non toccato · il link della PR. Commit con `Co-Authored-By: Claude <noreply@anthropic.com>`.
