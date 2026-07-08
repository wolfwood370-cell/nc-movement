# Valutazione di vendita di NC Movement come SaaS / asset tech

## 1. Executive summary

NC Movement è un MVP maturo per la registrazione, analisi e prescrizione di valutazioni funzionali (FMS, SFMA, YBT, FCS). L'obiettivo dichiarato è venderlo a Functional Movement Systems (FMS) come sostituto della loro suite software per professionisti certificati. Il progetto è attualmente single-tenant, pre-revenue, con un prescription engine e un PT Pack generator già implementati.

**Verdetto di valutazione (range):**
- **Exit tech oggi:** €30.000 – €120.000, con upside fino a €200.000-€300.000 se presentato come acquisizione strategica a FMS.
- **Potenziale SaaS:** €900.000 – €3.000.000 se portato a €300k-€1M ARR con un modello B2C pro / B2B cliniche.

## 2. Stima di valutazione come exit tech (oggi)

Per un progetto pre-revenue la valutazione si basa su:

| Driver | Valutazione |
|--------|-------------|
| Codice pulito, testato, TypeScript, RLS sicura, edge functions | Positivo |
| Prescription engine clinico (FMS -> tier -> RAMP -> esercizi) | Asset di differenziazione |
| Multi-assessment (FMS, SFMA, YBT, FCS) | Completo rispetto alla concorrenza |
| Single-tenant, nessun billing, nessun utente pagante | Deprezza |
| Dipendenza da framework proprietari (FMS/SFMA/YBT/FCS) | Rischio legale/licenze |

**Range di mercato per MVP pre-revenue con IP clinico:** €30k-€120k.

**Upside strategico verso FMS:** se il prodotto viene posizionato come "nuova piattaforma ufficiale FMS" che sostituisce la loro suite esistente, l'acquirente strategico può pagare un premio. Stima realistica: **€100k-€300k**, con tetto superiore solo se dimostri traction o esclusività.

## 3. Stima di valutazione come SaaS ricorrente

### 3.1 Mercato potenziale

- **TAM:** professionisti certificati FMS/SFMA/YBT/FCS nel mondo. Stima indicativa: 50.000-100.000 professionisti.
- **SAM:** professionisti attivi che usano regolarmente screening e hanno budget software: ~10.000-20.000.
- **SOM realistico a 3 anni:** 500-2.000 utenti paganti.

### 3.2 Modello di pricing

| Piano | Target | Prezzo indicativo |
|-------|--------|-------------------|
| Pro (singolo professionista) | PT, strength coach, personal trainer | €39-€79/mese |
| Team/Clinica | Centri fisioterapici, squadre sportive | €149-€399/mese |
| Enterprise | Catene, federazioni, militari | custom |

### 3.3 Scenario ARR e valuation

````text
Scenario conservativo:   500 utenti Pro a €49/mese  → €294k ARR → valuation €900k-€1.5M
Scenario base:          1.500 utenti Pro a €59/mese → €1.06M ARR → valuation €3M-€5M
Scenario ottimistico:   3.000 utenti + 100 cliniche → €3M+ ARR  → valuation €10M+
````

Multipli applicati: **3x-8x ARR** per SaaS bootstrapped con crescita moderata; **5x-12x ARR** se c'è crescita >100% YoY e margini alti.

**Valuation potenziale realistico a 3 anni:** €900.000 – €3.000.000.

## 4. Cosa rende il progetto appetibile per FMS

- **Sostituzione della suite legacy:** FMS ha FMS Pro App e Move2Perform; una piattaforma web moderna, multi-tenant e white-label è un upgrade naturale.
- **Prescription engine integrato:** la maggior parte dei competitor si ferma alla raccolta dati; NC Movement genera programmi correttivi e PT Pack.
- **Multi-assessment:** FMS, SFMA, YBT, FCS in un unico flusso clinico.
- **Codice pronto per la produzione:** RLS blindata, edge functions, autenticazione, audit di sicurezza già effettuato.

## 5. Gap da colmare prima di una vendita a FMS

Per massimizzare il prezzo di vendita o il potenziale SaaS, servono questi interventi:

1. **Multi-tenancy:** ogni professionista deve avere il proprio tenant, team e ruoli.
2. **White-label / branding FMS:** skin, colori, logo e dominio customizzabili.
3. **Verifica certificazione FMS:** integrazione con il registro certificati dell'acquirente.
4. **Billing e subscription:** Paddle/Stripe, trial, piani Pro/Team/Enterprise.
5. **Import/export dati:** migrazione dalla suite software attuale di FMS.
6. **Mobile / PWA:** l'app deve funzionare bene su tablet in campo sportivo/clinica.
7. **Compliance:** GDPR, HIPAA (se target US), terms of service.
8. **Traction:** anche 20-50 beta tester paganti aumentano enormemente la valuation.

## 6. Strategia di approccio a FMS

1. **Preparare un pitch deck tecnico-commerciale** che mostri:
   - screenshot del flusso assessment -> prescription -> PT Pack
   - architettura sicura (RLS, edge functions)
   - piano di migrazione dalla loro suite attuale
   - modello di business e pricing
2. **Contattare il CEO/Head of Product di FMS** con una demo personalizzata, non una vendita generica.
3. **Proporre due opzioni:**
   - **Acquisizione tech:** vendita del codice e IP per €100k-€300k.
   - **Partnership + equity:** FMS ottiene licenza esclusiva, tu resti CTO/founder con equity sul SaaS futuro.
4. **Negoziare la licenza dei framework FMS/SFMA/YBT/FCS** prima o in parallelo: senza poter usare i loro marchi, il valore strategico crolla.

## 7. Rischi e ipotesi chiave

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| FMS sviluppa internamente | Alto | Mostra velocità e IP unico (prescription engine) |
| Dipendenza da marchi FMS | Alto | Negozia licenza ufficiale o partnership |
| Nessuna traction | Medio | Lancia beta a 20-50 professionisti certificati |
| Single-tenant limita scalabilità | Medio | Trasforma in multi-tenant prima della vendita |
| Concorrenza da app generiche (PhysioMaster, PromptEMR) | Medio | Differenziazione sul prescription engine clinico |

## 8. Conclusione e raccomandazione

**Oggi**, come asset tech pre-revenue, NC Movement vale **€30k-€120k** in una vendita generica, con potenziale **€100k-€300k** se venduto strategicamente a FMS.

**Come SaaS**, con il giusto go-to-market e 500-2.000 utenti paganti, può raggiungere una valuation di **€900k-€3M** in 2-3 anni.

**Raccomandazione:** prima di contattare FMS, investire 4-8 settimane per aggiungere multi-tenancy, billing e una beta con 20-50 utenti. Questo può raddoppiare o triplicare il prezzo di vendita.