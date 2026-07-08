# Pitch Deck — NC Movement per Functional Movement Systems

> Piattaforma web moderna per assessment, monitoraggio e prescrizione FMS / SFMA / YBT / FCS.

---

## 1. Opportunity

Functional Movement Systems ha costruito un ecosistema di formazione e certificazione di livello mondiale. La suite software attuale (FMS Pro App, Move2Perform) è funzionale ma invecchiata: non offre un flusso unificato assessment → prescription → programma, né un'esperienza multi-tenant per team e cliniche.

**NC Movement è pronto a diventare la nuova piattaforma software ufficiale FMS.**

---

## 2. Prodotto

NC Movement è un MVP maturo che copre l'intero ciclo clinico:

| Modulo | Descrizione |
|--------|-------------|
| **Clienti** | CRM leggero per professionisti e cliniche |
| **FMS Assessment** | Deep Squat, Hurdle Step, ASLR, Shoulder Mobility, TSPU, Rotary Stability, Inline Lunge |
| **SFMA Assessment** | Top-tier breakout logic con regional interdependence |
| **YBT Assessment** | Y Balance Test con calcolo composite score e asimmetrie |
| **FCS Assessment** | Fundamental Capacity Screen |
| **Insights** | Report clinici, risk gauge, referral medico, piano correttivo |
| **PT Pack Generator** | Generazione automatica di 3 sessioni (A/B/C) basata su FMS Prescription Engine |
| **Daily Prep** | Warm-up giornaliero personalizzato (Daily 3R) |
| **Corrective Library** | Libreria esercizi con taxonomy RAMP, pattern, postura, fase |

---

## 3. Differenziazione

La maggior parte delle app di screening si ferma alla raccolta dati. NC Movement aggiunge:

- **FMS Prescription Engine**: da punteggio FMS a tier clinico (corrective / integration / performance) e selezione esercizi basata su RAMP, pattern e postura.
- **PT Pack Generator**: crea automaticamente main lift, accessory, finisher e warm-up correttivo con rationale scientifico.
- **Multi-assessment unificato**: FMS, SFMA, YBT, FCS in un'unica piattaforma.
- **Sicurezza enterprise-ready**: RLS blindata, edge functions, autenticazione JWT, audit di sicurezza passato.

---

## 4. Tecnologia

- **Frontend:** Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Lovable Cloud / Supabase (Postgres + Auth + RLS + Edge Functions)
- **Forms:** react-hook-form + zod
- **Routing:** react-router-dom v6
- **Testing:** vitest + React Testing Library

Architettura pronta per la produzione e scalabile.

---

## 5. Mercato e pricing

| Segmento | Target | Prezzo indicativo |
|----------|--------|-------------------|
| **Pro** | PT, strength coach, personal trainer certificati | €39-€79/mese |
| **Team** | Cliniche, squadre sportive, centri riabilitativi | €149-€399/mese |
| **Enterprise** | Catene, federazioni, militari, università | custom |

**Mercato potenziale:**
- TAM: 50.000-100.000 professionisti certificati FMS/SFMA/YBT/FCS
- SAM: 10.000-20.000 professionisti attivi con budget software
- SOM realistico a 3 anni: 500-2.000 utenti paganti

---

## 6. Scenari di valutazione

### Exit tech oggi (pre-revenue)

| Scenario | Range |
|----------|-------|
| Vendita generica di MVP | €30.000 – €120.000 |
| Acquisizione strategica da FMS | €100.000 – €300.000 |

### Potenziale SaaS

| Scenario | Utenti | ARR | Valuation |
|----------|--------|-----|-----------|
| Conservativo | 500 Pro a €49/mese | €294k | €900k – €1.5M |
| Base | 1.500 Pro a €59/mese | €1.06M | €3M – €5M |
| Ottimistico | 3.000 utenti + 100 cliniche | €3M+ | €10M+ |

Multipli: 3x-8x ARR (bootstrapped), 5x-12x ARR (crescita >100% YoY).

---

## 7. Roadmap per massimizzare il valore

Per portare NC Movement da MVP a prodotto enterprise pronto per FMS:

1. **Multi-tenancy** — tenant per professionista, team e ruoli.
2. **White-label** — branding FMS, colori, logo, dominio custom.
3. **Verifica certificazione FMS** — integrazione con registro certificati.
4. **Billing & subscriptions** — trial, piani Pro/Team/Enterprise.
5. **Import/export** — migrazione dalla suite software attuale.
6. **Mobile / PWA** — ottimizzazione tablet e offline-first.
7. **Compliance** — GDPR, HIPAA, terms of service.
8. **Traction** — beta con 20-50 professionisti certificati.

**Investimento stimato:** 4-8 settimane di sviluppo.

**Impatto sulla valuation:** può raddoppiare o triplicare il prezzo di vendita.

---

## 8. Proposta a FMS

Due opzioni di collaborazione:

1. **Acquisizione tech** — vendita del codice e dell'IP per €100k-€300k.
2. **Partnership + equity** — licenza esclusiva a FMS, founder rimane CTO con equity sul SaaS futuro.

---

## 9. Conclusione

NC Movement non è solo un MVP: è un **prescription platform** pronto a sostituire la suite software FMS con un'esperienza moderna, sicura e clinicamente valida. Con 4-8 settimane di sviluppo su multi-tenancy, billing e traction, il progetto può essere posizionato come acquisizione strategica o SaaS da €900k-€3M.
