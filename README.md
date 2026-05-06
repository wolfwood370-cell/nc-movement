# NC Movement

Studio Practitioner web-app per registrare, monitorare e analizzare valutazioni funzionali del movimento (FMS, SFMA, YBT, FCS).

Single-tenant: pensata per un solo professionista titolare con la propria lista clienti.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui + Recharts
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions)
- **Forms:** react-hook-form + zod
- **Routing:** react-router-dom v6

## Requisiti

- Node ≥ 20 (o Bun ≥ 1.1)
- Account Supabase con un progetto attivo

## Setup locale

```bash
# 1. Installa le dipendenze
bun install        # oppure: npm install

# 2. Configura le variabili d'ambiente
cp .env.example .env
# poi compila .env con i valori del tuo progetto Supabase

# 3. Applica le migrations al tuo Supabase
# (dal pannello SQL Editor o tramite supabase CLI)
# vedi: supabase/migrations/

# 4. Bootstrap dell'utente owner (una volta sola)
# Invoca la function bootstrap-owner con il token segreto
# vedi: supabase/functions/bootstrap-owner/

# 5. Avvia in dev
bun dev            # oppure: npm run dev
# apri http://localhost:8080
```

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `bun dev` | Server di sviluppo (porta 8080) |
| `bun run build` | Build di produzione |
| `bun run preview` | Anteprima build di produzione |
| `bun test` | Esegui i test (vitest) |
| `bun test:watch` | Test in watch mode |
| `bun run lint` | Lint del codice |

## Struttura

```
src/
├── components/        # UI riutilizzabile (incl. shadcn/ui in components/ui/)
├── hooks/             # useAuth, useFormDraft, ...
├── integrations/
│   └── supabase/      # client + types generati
├── lib/               # logica clinica pura: fms.ts, sfma.ts, fcs.ts, ybt.ts,
│                      # breakouts.ts, medicalReferral.ts, correctiveProtocols.ts
├── pages/             # route-level components
└── test/              # setup vitest + test
supabase/
├── migrations/        # schema versionato
└── functions/         # Edge Functions (Deno)
```

## Sicurezza

- **RLS** abilitata su tutte le tabelle: `auth.uid() = practitioner_id` per `clients` e tutti gli `*_assessments`.
- L'INSERT su un assessment verifica anche che il `client_id` referenziato appartenga al practitioner corrente (vedi migration `20260506_harden_rls_and_indexes.sql`).
- **Signup pubblico disabilitato** lato Supabase; l'unico account viene creato dalla Edge Function `bootstrap-owner` protetta da token.
- `.env` mai committato (vedi `.gitignore`).

## Deploy

Lovable / Vercel / Netlify — qualsiasi host statico per la SPA + Supabase per il backend.

## Licenza

Proprietaria · Nicolò Castello · Tutti i diritti riservati.
