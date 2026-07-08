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
