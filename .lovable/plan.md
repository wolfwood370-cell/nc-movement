# Piano: Bridge Gaps per Vendita a FMS

Obiettivo: portare la valutazione da €30-120k → €200-500k (exit) o preparare SaaS da €900k-3M in 3 anni.

## Fase 1 — Multi-tenancy (settimana 1-2)
**Perché:** oggi l'app è single-tenant. FMS ha migliaia di professionisti certificati → serve isolamento dati per organizzazione/studio.

- Nuova tabella `organizations` (id, name, plan, created_at)
- Nuova tabella `organization_members` (org_id, user_id, role: owner/admin/member)
- Colonna `organization_id` su tutte le tabelle dati (clients, assessments, sessions, prescriptions, insights, pt_packs)
- RLS aggiornate: accesso solo se `organization_id` appartiene alle org dell'utente (via `has_org_access(auth.uid(), org_id)` SECURITY DEFINER)
- Migrazione dati esistenti: creare org default per ogni utente attuale
- UI: switcher organizzazione in header, pagina "Team" per invitare membri

## Fase 2 — Billing (settimana 2-3)
**Perché:** senza monetizzazione non c'è SaaS vendibile.

- Integrazione **Paddle** (merchant of record, gestisce tasse globali — ideale per SaaS internazionale FMS)
- Piani:
  - **Free trial** 14 giorni
  - **Pro** €49/mese (singolo professionista, assessments illimitati)
  - **Team** €199/mese (fino a 5 professionisti, org sharing)
  - **Enterprise** custom (FMS-branded, SSO, API)
- Tabella `subscriptions` collegata a `organizations`
- Webhook Paddle per attivare/disattivare accesso
- Gating: limite clienti/assessments su piano free

## Fase 3 — White-label FMS-ready (settimana 3-4)
**Perché:** rende il progetto "drop-in replacement" per la suite FMS attuale.

- Config `branding` per org: logo, colori primari, nome brand
- Env `VITE_BRAND_MODE` per build "FMS edition" (logo FMS, palette rosso/nero FMS)
- Rimozione riferimenti "NC Movement" dai componenti (già token-based dopo)
- Pagina onboarding con verifica certificazione FMS (upload attestato, review manuale MVP)

## Fase 4 — Data portability + Compliance (settimana 5)
- Export CSV/JSON di tutti i dati cliente (GDPR art. 20)
- Import da CSV (per migrare da FMS Pro App)
- Pagina Privacy + DPA template
- Cookie banner + consent tracking

## Fase 5 — Beta program (settimana 6-8)
- Landing page dedicata (fuori dall'app) per raccogliere iscrizioni FMS pros
- Outreach: 200 professionisti FMS certificati via LinkedIn
- Onboarding 20-50 beta tester gratuiti in cambio di feedback + testimonial
- KPI: DAU, retention 4 settimane, NPS, feature request

## Fase 6 — Pitch a FMS (settimana 8)
- Deck con: prodotto live, 20-50 utenti attivi, roadmap, ask
- Contatto: CEO FMS (Gray Cook / Lee Burton team) via warm intro o email diretta
- Due opzioni concrete: (A) acquisizione tech €200-500k, (B) partnership + revenue share + equity

## Ordine di attacco proposto ORA
Comincio da **Fase 1 (multi-tenancy)** perché blocca tutto il resto. Include:
1. Migration: `organizations`, `organization_members`, funzione `has_org_access`
2. Migration: aggiungere `organization_id` alle tabelle esistenti + backfill
3. Update RLS su tutte le tabelle
4. Update client Supabase queries per filtrare per org attiva
5. UI org switcher + pagina team

**Tempo stimato Fase 1:** 3-5 sessioni Lovable.

## Da confermare prima di iniziare
1. **OK a partire da Fase 1 multi-tenancy?** (raccomandato)
2. **Preferisci saltare a Paddle billing subito** (più veloce da mostrare, ma senza multi-tenancy limita il valore)?
3. **Vuoi che prepari prima il deck FMS** con lo stato attuale, senza toccare codice?

---

# Piano: Integrazione Design Handoff Claude (rifacimento schermata per schermata)

Riferimento: `/tmp/ncm/design_handoff_lovable/` (già letto e mappato).

## Fase A — Foundations (tokens + PhoneShell + BottomNav) ← IN CORSO
- Aggiungere token CSS mancanti (`--desk-bg`, `--risk-critico/alto/medio/basso/idle`, ombra `cta`, radius `phone`)
- Estendere `tailwind.config.ts` con `risk.*`, `boxShadow.cta`, `borderRadius.phone`
- Nuovo componente `<PhoneShell>` che su desktop rende cornice 390×844 rounded-[44px] su sfondo desk-bg
- Refactor `AppShell` per usare PhoneShell (mobile: full-screen; desktop: framed)

## Fase B — Dashboard (screenshot 01)
- Riordinare sezioni: Panoramica clinica (2×2 tinted) → Avvio rapido (2×2 grandi con logo+desc) → Clienti recenti (eyebrow con "Tutti (N)")
- KPI card più grande con valore in colore del tono
- Rimuovere MacroAnalytics dalla Dashboard (o spostarla in fondo come sezione secondaria)

## Fase C — Clienti (screenshot 02)
- Header "Clienti · N clienti · X a rischio" + pill "+ Nuovo"
- Chip filtro Tutti / A rischio / Da valutare (funzionali)
- Righe con barra rischio sinistra + avatar + meta + badge rischio + chevron

## Fase D — Test picker (screenshot 03)
- Route `/assessments` come picker: FMS attivo (glow rosso + pill Avvia), SFMA/YBT/FCS card info

## Fase E — FMS Setup (screenshot 05)
- Header "Nuova FMS" + eyebrow + titolo
- Sezione "Assegna a un cliente" (lista selezionabile)
- Sezione "Tipo di screening" (Completo/Modificato cards)
- CTA sticky footer

## Fase F — FMS Wizard (screenshot 06)
- Header sticky con anello progresso + rail 7/3 segmenti colorati + chip focus live
- Corpo pattern: label+hint+box punteggio live colorato+badge asimmetria+bottoni 0/1/2/3 (bilaterale = 2 gruppi L/R)
- Moduli condizionali (misure, ankle clearing, clearing pain toggles)

## Fase G — Scheda cliente + PT Pack (screenshot 07)
- Card profilo + Ultima FMS con anello + Prossimo passo + Banner Lock
- Griglia 4 CTA test (con lucchetto se lock)
- Tab PT Pack / Storico / Insights

## Fase H — Storico + Past Test (screenshot 08)
- Timeline verticale + overlay Past Test read-only

## Fase I — Insights (screenshot 09)
- Line chart + stat row + banner mover + tabella evoluzione per pattern

## Fase J — Libreria correttivi (screenshot 04)
- Chip pattern + selettore 3R (Reset/Reactivate/Reinforce) + griglia card esercizio

## Fase K — Report cliente (screenshot 10)
- Overlay "Il tuo report di movimento" consumer-friendly

## Fase L — QA finale
- Confronto pixel con tutti i 10 screenshot
- Responsive check (< 430px full-screen, ≥ 430px cornice desktop)
