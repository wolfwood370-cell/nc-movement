# Ultimo ritorno — Cornice scrivania

**Data:** 2026-09-04/05 · **Ramo:** `claude/cornice-scrivania`
**Base:** `0970a42` (`Merge pull request #7 from wolfwood370-cell/claude/neurotipo`) su `main`

Il ritorno della fetta precedente (neurotipo) resta nella storia di git. Questo file lo
sostituisce per la fetta corrente.

Niente merge, niente deploy: come chiesto. Il ramo è committato e **non** spinto.

---

## Rituale d'apertura — e la prima cosa che non tornava

Il prompt diceva: «il ramo locale è ancora `claude/neurotipo`». **Non lo era.**

```
$ git branch --show-current
main
$ git checkout main && git pull
Already on 'main'
Your branch is up to date with 'origin/main'.
Already up to date.
```

Il ramo locale era già `main`, già allineato a `origin/main` sul merge della PR #7. Ho aperto
`claude/cornice-scrivania` da lì. `git status` mostrava `?? docs/design/` e nient'altro;
`docs/design/` **non è stata toccata** e resta non tracciata (accettazione 4, sotto).

Tutte le misure di partenza del prompt, rifatte prima di scrivere una riga: **tornano tutte.**

| misura | prompt | misurato |
|---|---|---|
| `tsc --listFiles \| grep -c "nc-movement/src/"` | 160 | **160** |
| `bun run test` | 10 file, 129 test | **10 file, 129 test** |
| `bun run lint` | 0 errori, 17 warning | **0 errori, 17 warning** |
| import di `ui/sidebar` fuori dal file stesso | 0 | **0** |
| colori hex fuori da `ui/` | 0 | **0** |
| classi di palette Tailwind fuori da `ui/` | 17 | **17**, tutte in `CorrectiveLibrary.tsx` |
| `use-mobile.tsx` importato da | — | **solo `ui/sidebar.tsx`** |

---

## PARTE 1 — Il meccanismo, e perché non lampeggia

**Scelta: un hook, `useCornice`, su `useSyncExternalStore` + `matchMedia`.** Non la via CSS.

Il motivo è strutturale, non di gusto. Sotto i 700px la cornice è il telaio di `PhoneShell`,
che da 640px (`sm:`) disegna da solo il telefono 390×844; sopra i 700px quel telaio non deve
esistere. Con le sole media query in CSS avrei dovuto montare *due* cornici e nasconderne una —
e le due cornici contengono la pagina, quindi la pagina sarebbe stata montata due volte, con le
sue query al database fatte due volte. La decisione va presa in JavaScript, e allora va presa
**prima del primo disegno**.

`useSyncExternalStore(iscriviti, leggiCornice)`:

- `leggiCornice` legge `window.matchMedia('(min-width: 1024px)')` e `('(min-width: 700px)')`
  **durante il render**, in modo sincrono. Il primo render ha già la cornice giusta.
- Il primo render è **l'unico**: `src/main.tsx` monta con `createRoot(...).render(...)`, non
  idrata HTML del server. Non esiste un render «di default» seguito da uno «giusto», che è
  esattamente ciò che produce il lampo.
- Il terzo argomento (`getServerSnapshot`) è **omesso di proposito**: se un giorno l'app venisse
  idratata, React lo segnalerebbe con un errore invece di scivolare in un lampo silenzioso.
- `iscriviti` ascolta `change` sulle due `MediaQueryList` e si disiscrive al cleanup; è una
  funzione a livello di modulo, identità stabile, nessuna reiscrizione a ogni render.

La prova che non lampeggia è in due test, non in una frase: una sonda registra il valore che
`useCornice` restituisce **a ogni render** e a 1440 / 834 / 390 l'elenco contiene **un solo
valore**; e a livello di `AppShell`, due spie sulle barre dicono che la barra sbagliata **non è
stata resa nemmeno una volta** (T2, sotto — la seconda è arrivata dalla revisione).

### `use-mobile.tsx`: guardato, e non va bene

Il prompt chiedeva di guardarlo prima di inventare un hook nuovo. L'ho letto (19 righe):

```ts
const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
React.useEffect(() => { ...; setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); }, []);
return !!isMobile;
```

Parte da `undefined`, legge la larghezza in un `useEffect` — cioè **dopo** il commit — e quindi
fa esattamente il lampo che questa fetta deve evitare: un primo render «non mobile», un secondo
render con il valore vero. Oltre a questo ha una soglia sola (768) e qui ne servono due (700 e
1024). Non l'ho modificato: lo importa solo `ui/sidebar.tsx`, che è in una cartella vietata.

### `ui/sidebar.tsx`: letto, e il prompt ha ragione

23.474 byte, zero importatori (misurato). Riga 15: `SIDEBAR_COOKIE_NAME`, stato salvato nei
cookie. Riga 155: `<Sheet>` a scomparsa per il telefono. Riga 6: `useIsMobile` a 768. Sono le
tre cose che il prompt diceva, e sono tre cose che qui non servono. **Non l'ho usato**,
`grep -rn "ui/sidebar"` resta a 0 (accettazione 5).

---

## PARTE 2 — I file, uno per uno

### `src/lib/navigazione.ts` — 56 righe, nuovo · la sorgente unica

Le sei voci in un posto solo. Ogni voce: `to`, `label`, `icon`, `esatta`.

- `VOCI_PRINCIPALI` — Dashboard `/`, Clienti `/clients`, Test `/assessments`, Libreria
  `/library`; icone `LayoutDashboard`, `Users`, `Activity`, `Library`. Stesso ordine, stesse
  icone di prima.
- `VOCI_SCRIVANIA` — Preparazione `/daily-prep` (`ClipboardList`), Team `/team` (`Users2`).
  `Users2` in lucide 0.462 è un alias di `UsersRound`: è l'icona `users-2` del disegno, e la
  stessa che l'intestazione usa già per il bottone Team.
- `voceAttiva(pathname, voce)` — **pura**: nessun hook, nessun router. `esatta: true` solo per
  la radice, che altrimenti sarebbe prefisso di tutto. Le altre voci sono attive sul loro
  percorso e su ciò che gli sta sotto, **ma solo a confine di segmento**: `/clients/abc-123`
  accende Clienti, `/clientsXYZ` no. **Senza distinguere le maiuscole**, come fanno le rotte di
  react-router e come faceva `NavLink`: `/Clients/abc` apre la pagina Clienti, quindi deve
  accendere Clienti (arrivato dalla revisione, vedi in fondo).

Le due barre non calcolano niente da sole: chiamano `voceAttiva` e mettono `aria-current="page"`.
Rompere la funzione rompe la UI in tutte e tre le cornici, ed è quello che T1 dimostra.

Il file esporta costanti e una funzione, nessun componente: **nessun warning `react-refresh`**
(lint resta a 17).

### `src/hooks/useCornice.ts` — 48 righe, nuovo

Descritto in Parte 1. Esporta `Cornice` (`'telefono' | 'tablet' | 'scrivania'`), le due
soglie `SOGLIA_TABLET = 700` e `SOGLIA_SCRIVANIA = 1024`, e l'hook. Il commento in testa spiega
perché non lampeggia e perché `use-mobile.tsx` non andava bene.

### `src/components/AppHeader.tsx` — 64 righe, nuovo · l'intestazione estratta

Il prompt: «se ti serve in due cornici, estraila in un componente suo invece di ricopiarla».
Fatto. Logo, Team, Segnalazioni Bug (solo staff), Esci, con la logica di uscita. **Nessuna classe
cambiata**: la prova è nel confronto del DOM più sotto.

### `src/components/BarraInBasso.tsx` — 38 righe, nuovo · la barra del telefono

Stesse classi di prima, legge `VOCI_PRINCIPALI`. Due differenze rispetto al vecchio blocco:

1. `Link` + `aria-current` calcolato da `voceAttiva`, invece di `NavLink` con `end`. Il DOM
   prodotto è lo stesso (`NavLink` mette esattamente `aria-current="page"` e la classe della
   funzione), ma la decisione ora è nella funzione pura e non dentro react-router.
2. `aria-label="Barra in basso"` sul `<nav>`, così i test possono distinguere le due barre e gli
   screen reader hanno un nome per il landmark.

`grid-cols-4` resta scritto: è il vincolo del telefono (quattro etichette sotto i 700px), non
un secondo elenco. Il commento nel file lo dice.

### `src/components/BarraLaterale.tsx` — 81 righe, nuovo · barra laterale e rail

Un componente, una prop `rail`.

| | ≥ 1024 | 700–1023 |
|---|---|---|
| larghezza | **240** (`w-[240px]`, `px-3 py-4`) | **72** (`w-[72px]`, `py-3.5`) |
| voce | `h-10 px-3`, icona 18px + etichetta `text-[13px] font-medium` | `w-11 h-11` (44×44), solo icona |
| etichetta | testo accanto | `aria-label` + `title` (tooltip nativo) |
| separatore | `h-px bg-sidebar-border mx-3 my-3.5` | `w-9 h-px my-3.5` |
| titolo «Scrivania» | visibile, `font-display 10px uppercase tracking-[0.14em] text-sidebar-foreground` | `sr-only` |
| attiva | `bg-sidebar-accent text-sidebar-accent-foreground` | idem |
| riposo | `text-sidebar-foreground`, hover `bg-muted/70 text-foreground` | idem |
| fuoco | `focus-visible:ring-2 ring-sidebar-ring` | idem |

Colori: **solo** `bg-sidebar`, `border-sidebar-border`, `text-sidebar-foreground`,
`bg-sidebar-accent`, `text-sidebar-accent-foreground`, `ring-sidebar-ring`, più `bg-muted/70` e
`text-foreground` che esistono già. Nessun hex, nessuna palette Tailwind (accettazione 6 e 7).
I token `--sidebar-*` erano in `index.css` dal primo giorno e **questa è la prima volta che
qualcuno li usa**, tema scuro compreso.

I due gruppi sono `role="group"` con nome («Principale», «Scrivania»): serve a T3 per
confrontare barra con barra, e agli screen reader per dire in che gruppo si è.

**Tre scelte dove disegno e prompt non coincidevano, e cosa ho seguito:**

- **Bersagli 44×44, non 44×40.** `vista-navigazione.html` disegna il rail con
  `width:44px;height:40px`; il prompt dice «bersagli da 44px di lato». Ho seguito il prompt:
  44 su entrambi i lati soddisfa entrambe le letture e la regola dei 44pt per il dito.
- **Nessun grassetto in più sulla voce attiva.** Lo stesso file disegna la riga attiva a
  `font:600` e le altre a `500`, ma la regola 3 scritta nel file stesso — e il prompt — dicono
  «nessun grassetto in più». Ho seguito la regola: `font-medium` ovunque, e la voce attiva si
  distingue **solo** per fondo e testo. Misurato in browser: `fontWeight: 500` sull'attiva.
- **Il titolo «Scrivania» è `text-sidebar-foreground`, non `text-muted-foreground`.** Il
  disegno usa `hsl(210 10% 45%)` (= muted-foreground), che sul fondo della barra fa
  **4,44:1**, sotto il minimo AA per un testo da 10px. Il token `--sidebar-foreground` che la
  fetta prescrive fa 5,35:1 nel chiaro e 6,14:1 nello scuro. Trovato dalla revisione.

### `src/components/AppShell.tsx` — 82 righe, +70 −84 · **un solo albero**

Prima: 96 righe con intestazione, main e barra scritti dentro, e `PhoneShell` come radice.
Adesso decide la cornice e monta **lo stesso albero** per tutte e tre:

```
<div telaio.esterno>
  <div telaio.interno>
    <AppHeader/>
    <div flex-1 min-h-0 flex>
      {!telefono && <BarraLaterale rail/>}     ← slot: `false` sul telefono
      <main …>
        <div …>{children}</div>
      </main>
    </div>
    {telefono && <BarraInBasso/>}              ← slot: `false` sopra i 700
  </div>
</div>
```

Cambiano solo le classi; gli elementi stanno nelle stesse posizioni, e le due barre vivono in
due slot condizionali che restano `false` quando non servono. Così React **aggiorna invece di
rimontare**, e un telefono che ruota (390 → 844px, cioè da telefono a tablet) non perde lo
stato della pagina: un test a metà resta a metà.

**Non era così nella prima stesura**, e la revisione l'ha beccato (in fondo): avevo due alberi,
`<PhoneShell>` sotto i 700 e un `<div>` sopra, e attraversare i 700px rimontava tutto. Su
`main` non succedeva mai — `PhoneShell` serviva ogni larghezza — quindi era una regressione mia.

**Il telaio del telefono è quello di `PhoneShell`, copiato classe per classe** (`TELAIO_TELEFONO`,
due stringhe). Non potevo usare il componente: avvolge tutto e non cambia forma con la
larghezza. `PhoneShell.tsx` resta intatto (diff zero) e continua a servire il wizard FMS. La
copia è tenuta d'occhio da un test che monta `PhoneShell` accanto ad `AppShell` a 390 e
confronta i due `div` classe per classe: se `PhoneShell` cambia, quel test va rosso.

Tre cose da sapere:

- **Il `main` resta il contenitore che scorre** in tutte le cornici. Le pagine che usano
  `sticky` dentro il main (`FmsAssessment.tsx` righe 517 e 788) si comportano uguale. Sulla
  scrivania però **non** c'è `scrollbar-none`: nascondere la barra di scorrimento a chi usa il
  mouse è una regressione, sul telefono no.
- **`pb-24` anche sulla scrivania e sul tablet.** Nella prima stesura avevo `pb-8`; la
  revisione ha fatto notare che `SfmaAssessment.tsx:424`, `YbtAssessment.tsx:409` e
  `FcsAssessment.tsx:554` hanno una barra `fixed` in basso da 80-90px: con `pb-8` il fondo di
  quelle pagine sarebbe rimasto **irraggiungibile** dietro la barra. Il `pb-24` del telefono
  esisteva per quello, e sulla scrivania serve uguale.
- **Sul telefono il `div` dentro il `main` è spoglio** (`className` assente): serve solo a
  tenere `children` nello stesso posto dell'albero nelle tre cornici. Nessuna pagina sotto
  `Shell` usa `h-full` alla radice (verificato con grep), quindi è trasparente.

### I test: `src/lib/navigazione.test.ts` (95 righe, 13 test) e `src/components/cornice.test.tsx` (370 righe, 17 test)

Descritti sotto, con le rotture.

---

## La cornice del telefono: il DOM dice cosa è cambiato, e non è niente che si veda

jsdom non impagina, ma il DOM lo produce. Ho preso la **vecchia** `AppShell` da `main`
(`git show main:src/components/AppShell.tsx`), l'ho montata a fianco della nuova in un test
temporaneo, a 390px, su sette percorsi (`/`, `/clients`, `/clients/abc-123`,
`/assessments/fms/12`, `/library`, `/team`, `/admin/bugs`), e ho confrontato la serializzazione
del DOM **con gli attributi in ordine alfabetico e gli spazi delle classi normalizzati**.

Il `diff` è lo stesso su tutti e sette i percorsi, dieci righe, e sono **tre differenze**:

```
17,20c17,22
<       <main class="flex-1 overflow-y-auto px-4 pt-4 pb-24 animate-fade-in scrollbar-none">
<         <p>
<           "contenuto"
<       <nav class="h-[66px] shrink-0 border-t border-border bg-card/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
---
>       <div class="flex-1 min-h-0 flex">                    ← 1. la riga attorno al main
>         <main class="flex-1 overflow-y-auto px-4 pt-4 pb-24 animate-fade-in scrollbar-none">
>           <div>                                             ← 2. il div spoglio dentro il main
>             <p>
>               "contenuto"
>       <nav aria-label="Barra in basso" class="h-[66px] …">   ← 3. il nome del landmark
```

Tutto il resto — i due `div` del telaio, l'intestazione con i suoi bottoni, il `main` con le
sue classi, i quattro link con classi, `href`, `aria-current` e le SVG di lucide — è **byte per
byte lo stesso**. I due `div` in più sono il prezzo dell'albero unico (vedi AppShell) e non
hanno nessun effetto visibile: misurato in browser, intestazione 56, `main` 722, barra 66,
esattamente come prima. Poi ho smontato:

```
$ rm -f src/components/__AppShellVecchia.tsx src/components/__confronto.test.tsx
$ ls src/components/__* → nessun residuo
```

---

## Test rossi, dimostrati nelle due direzioni

Per ognuno: verde col codice giusto, rosso col codice rotto, ripristino provato con
`sha256sum` prima e dopo e `cmp` con la copia di riserva. Gli hash sono quelli dei **file
finali**, dopo le correzioni della revisione: le rotture le ho rifatte tutte sull'ultima
versione.

### T1 — la voce attiva (`navigazione.test.ts`, 13 test)

`/` accende **solo** Dashboard; `/clients` Clienti; `/clients/abc-123` Clienti **e non**
Dashboard; `/assessments/fms/12` Test; `/library` Libreria; `/daily-prep` Preparazione; `/team`
Team; `/admin/bugs` e `/auth` niente; `/clientsXYZ` niente (confine di segmento) e `/clients/`
Clienti; `/Clients/abc-123`, `/CLIENTS`, `/Daily-Prep` accendono la voce giusta (maiuscole);
**mai due accese insieme** su sedici percorsi. Più due test di forma sull'elenco.

| | sha256 di `src/lib/navigazione.ts` |
|---|---|
| prima | `b4b60e66184c38b27b681e7cee8caa695a388d9995f23c45c3dc8594906c4fb4` |
| rotto | `d0b4068b88797ac01ffde1fb24a4b139e55ec68fd15f724e3798e60a9838a8aa` |
| dopo | `b4b60e66184c38b27b681e7cee8caa695a388d9995f23c45c3dc8594906c4fb4` |

**Rottura:** righe 54–55, il corpo di `voceAttiva` ridotto a `return percorso.startsWith(radice)`:
via la corrispondenza esatta alla radice e via il confine di segmento, così `/` combacia con tutto.

```
× "/clients" accende Clienti
  → expected [ 'Dashboard', 'Clienti' ] to deeply equal [ 'Clienti' ]
× "/clients/abc-123" accende ancora Clienti, e NON Dashboard
  → expected [ 'Dashboard', 'Clienti' ] to not include 'Dashboard'
× "/assessments/fms/12" accende Test
  → expected [ 'Dashboard', 'Test' ] to deeply equal [ 'Test' ]
× "/library" accende Libreria
× "/daily-prep" accende Preparazione
× "/team" accende Team
× un percorso fuori dalle voci non accende niente: "/admin/bugs", "/auth"
  → expected [ 'Dashboard' ] to deeply equal []
× il prefisso vale solo a confine di segmento: "/clientsXYZ" non e sotto "/clients"
  → expected [ 'Dashboard', 'Clienti' ] to deeply equal []
× senza distinguere le maiuscole ...: "/Clients/abc-123" accende Clienti
  → expected [ 'Dashboard', 'Clienti' ] to deeply equal [ 'Clienti' ]
× in nessun caso due voci accese insieme
  → percorso /clients: Dashboard, Clienti: expected 2 to be less than or equal to 1
× T3 · la voce attiva e una sola, e la decide lo stesso voceAttiva in tutte e tre le cornici
  → a 390px: expected [ 'Dashboard', 'Clienti' ] to deeply equal [ 'Clienti' ]

Tests  11 failed | 19 passed (30)
```

Undici rossi, e l'ultimo è quello che conta: cade anche il test **montato**, perché le barre
usano davvero la funzione. Ripristinato: `cmp` silenzioso, hash identico.

### T2 — le due cornici non stanno mai insieme (`cornice.test.tsx`)

`window.matchMedia` viene sostituito da una funzione che risponde alle query `(min-width: Npx)`
confrontando N con la larghezza simulata: è lo **stesso oggetto** che `useCornice` legge in
produzione. Il mock è fedele anche nel ridimensionamento: tiene gli ascoltatori **per query** e,
come nel browser, avvisa **solo** la `MediaQueryList` il cui `matches` è cambiato (anche questo
dalla revisione: prima avvisava tutti, e un hook iscritto a una sola delle due query sarebbe
passato). Sei test:

- a **1440** la barra laterale con le sei voci è nel DOM, la barra in basso **no**, un solo
  `<nav>`, «Clienti» ha testo visibile, «Scrivania» c'è;
- a **390** l'opposto, e «Scrivania» non c'è;
- a **834** il rail: sei voci, **nessun testo** nei link (solo nome accessibile), barra in basso no;
- le soglie sono **incluse**: 699 telefono, 700 rail, 1023 rail, 1024 barra piena;
- il contenuto è montato **una volta sola** in entrambe le cornici;
- ridimensionando **una soglia per volta** — 390 → 834 → 1440 → 834 → 390 — la cornice cambia
  senza ricaricare, in entrambe le direzioni.

Più i quattro test **anti-lampo**: la sonda su `useCornice` (un solo valore a 1440, 834, 390)
e, a livello di `AppShell`, due spie (`vi.fn` attorno a `BarraInBasso` e `BarraLaterale`) che a
1440 dicono «la barra in basso non è stata chiamata **nemmeno una volta**» e a 390 lo stesso
per la laterale. `render` sta dentro `act`, che svuota effetti e re-render: un `AppShell` che
rendesse prima una cornice di default e poi quella vera avrebbe chiamato la barra sbagliata
almeno una volta.

Più i due test sul **telaio copiato** da `PhoneShell` (uguale classe per classe a 390; niente
`sm:` sulla scrivania).

| | sha256 di `src/components/AppShell.tsx` |
|---|---|
| prima | `c449b02238a827aa74b966bce9cda97994806c0d1305f62c644fcd66bbd95ad7` |
| rotto | `aa2dfecb1d45ddf84b6c4a1f0670d4529501c00a22a159a1b5489e768596c3e4` |
| dopo | `c449b02238a827aa74b966bce9cda97994806c0d1305f62c644fcd66bbd95ad7` |

**Rottura:** entrambe le barre rese sempre — riga 53 `{!telefono && <BarraLaterale …/>}` →
`<BarraLaterale …/>`, riga 78 `{telefono && <BarraInBasso/>}` → `<BarraInBasso/>`.

```
× a 1440 c e la barra laterale con le sei voci, e la barra in basso NO
  → expected <nav …(2)>…(1)</nav> to be null
× a 390 c e la barra in basso con le quattro voci, e la barra laterale NO
  → expected <nav …(2)>…(3)</nav> to be null
× a 834 c e il rail: la barra laterale con le sei voci a sole icone, e la barra in basso NO
× le soglie sono 700 e 1024, incluse: 699 telefono, 700 rail, 1023 rail, 1024 barra piena
  → expected 'telefono' to be 'rail'
× ridimensionando la finestra la cornice cambia senza ricaricare, una soglia per volta
× a 1440 la barra in basso non viene resa nemmeno per un render; a 390 la laterale
  → expected "BarraInBasso" to not be called at all, but actually been called 1 times
× T3 · la voce attiva e una sola ... in tutte e tre le cornici
  → a 390px: expected [ 'Clienti', 'Clienti' ] to deeply equal [ 'Clienti' ]

Tests  7 failed | 10 passed (17)
```

Ripristinato: `cmp` silenzioso, hash identico.

### T3 — una sorgente sola (`cornice.test.tsx`)

Quattro test. Il primo è quello che il prompt chiedeva alla lettera: le etichette rese dalla
barra in basso (a 390) e quelle rese dal gruppo «Principale» della barra laterale (a 1440) —
**barra contro barra**, non barra contro elenco. Il secondo confronta ciascun gruppo di ciascuna
barra con `lib/navigazione.ts`. Il terzo confronta, voce per voce, **etichetta, `href` e nome
dell'icona lucide** (`lucide-users`, `lucide-activity`…) fra le due barre. Il quarto verifica che
in tutte e tre le cornici la voce attiva sia una sola, su `/clients/abc-123`.

**Rottura nella barra in basso** — una quinta voce scritta a mano (`<Link to="/extra">Extra</Link>`, riga 35):

| | sha256 di `src/components/BarraInBasso.tsx` |
|---|---|
| prima | `833aee448b6b08dd8f68aa5c0961ba5fc8c124e5920734cbcb8fd06bed502c32` |
| rotto | `5c6282d104fb0c1bcbcca223ee74af2735ace6716a4163c4368940d5bb3fd1e8` |
| dopo | `833aee448b6b08dd8f68aa5c0961ba5fc8c124e5920734cbcb8fd06bed502c32` |

```
× T2 · a 390 c e la barra in basso con le quattro voci, e la barra laterale NO
  → expected [ Array(5) ] to deeply equal [ Array(4) ]
× T3 · le etichette della barra in basso sono ESATTAMENTE quelle del gruppo principale della barra laterale
  → expected [ Array(5) ] to deeply equal [ Array(4) ]
× T3 · e le due barre leggono entrambe da lib/navigazione.ts, gruppo per gruppo
× T3 · stessa voce, stessa icona e stesso percorso nelle due barre
  → expected [ [ 'Dashboard', '/', …(1) ], …(4) ] to deeply equal [ [ 'Dashboard', '/', …(1) ], …(3) ]

Tests  4 failed | 13 passed (17)
```

**Rottura nella barra laterale** — il prompt ne chiedeva una sola, ma la direzione opposta costa
poco: una voce a mano nel gruppo principale di `BarraLaterale.tsx` (riga 38).

| | sha256 di `src/components/BarraLaterale.tsx` |
|---|---|
| prima | `f87d1210bd097bb18e2c7514fe5601b0c8e11101dc3dc0576f205245194c91dc` |
| rotto | `1747a6376279567d94066ae2e26a73aa1a2030a617ba9d3ea3ab8f089949184a` |
| dopo | `f87d1210bd097bb18e2c7514fe5601b0c8e11101dc3dc0576f205245194c91dc` |

```
× T2 · a 1440 c e la barra laterale con le sei voci, e la barra in basso NO
  → expected [ Array(7) ] to deeply equal [ Array(6) ]
× T2 · a 834 c e il rail ...
× T3 · le etichette della barra in basso sono ESATTAMENTE quelle del gruppo principale ...
  → expected [ Array(4) ] to deeply equal [ Array(5) ]
× T3 · e le due barre leggono entrambe da lib/navigazione.ts, gruppo per gruppo
× T3 · stessa voce, stessa icona e stesso percorso nelle due barre

Tests  5 failed | 12 passed (17)
```

### T4 — un solo albero: il cambio di cornice non rimonta la pagina (aggiunto dopo la revisione)

Una pagina con `useState` e un contatore di montaggi, portata a «passo 3», attraversa
390 → 834 → 1440 → 834 → 390 e deve restare a «passo 3» con **un solo montaggio**.

| | sha256 di `src/components/AppShell.tsx` |
|---|---|
| prima | `c449b02238a827aa74b966bce9cda97994806c0d1305f62c644fcd66bbd95ad7` |
| rotto | `e12dd08a0e63afcc303770b57c06d7ed9c345be6ff9c1c8eacef7cc26a80801f` |
| dopo | `c449b02238a827aa74b966bce9cda97994806c0d1305f62c644fcd66bbd95ad7` |

**Rottura:** il file «rotto» è la **prima stesura** di `AppShell` — quella a due alberi,
`<PhoneShell>` sotto i 700 e `<div>` sopra — rimessa al suo posto.

```
× lo stato della pagina sopravvive a 390 -> 834 -> 1440 -> 834 -> 390, con un solo montaggio
  → dopo 834px: expected 'passo 0' to be 'passo 3'

Tests  1 failed | 16 passed (17)
```

È esattamente lo scenario del rilievo: un telefono ruotato in orizzontale e il test ricomincia
da zero. Ripristinato: `cmp` silenzioso, hash identico.

Dopo il ripristino di tutte le rotture:

```
$ sha256sum src/lib/navigazione.ts src/components/AppShell.tsx src/components/BarraInBasso.tsx src/components/BarraLaterale.tsx
b4b60e66184c38b27b681e7cee8caa695a388d9995f23c45c3dc8594906c4fb4  src/lib/navigazione.ts
c449b02238a827aa74b966bce9cda97994806c0d1305f62c644fcd66bbd95ad7  src/components/AppShell.tsx
833aee448b6b08dd8f68aa5c0961ba5fc8c124e5920734cbcb8fd06bed502c32  src/components/BarraInBasso.tsx
f87d1210bd097bb18e2c7514fe5601b0c8e11101dc3dc0576f205245194c91dc  src/components/BarraLaterale.tsx
```

---

## Accettazione — ogni riga col suo comando e il suo output, sul codice finale

### 1 · Type-check

```
$ bunx tsc --noEmit -p tsconfig.app.json
exit=0

$ bunx tsc --noEmit -p tsconfig.app.json --listFiles | grep -c "nc-movement/src/"
167
```

**Prima: 160. Dopo: 167.** I sette in più sono esattamente i file della fetta:
`navigazione.ts`, `navigazione.test.ts`, `useCornice.ts`, `AppHeader.tsx`, `BarraInBasso.tsx`,
`BarraLaterale.tsx`, `cornice.test.tsx`.

### 2 · Test

```
$ bun run test

 ✓ src/test/example.test.ts (1 test)
 ✓ src/lib/fms.test.ts (15 tests)
 ✓ src/lib/fmsPrescription.test.ts (6 tests)
 ✓ src/lib/navigazione.test.ts (13 tests)
 ✓ src/lib/neurotypeScoring.test.ts (22 tests)
 ✓ src/lib/intake.test.ts (35 tests)
 ✓ src/test/cordone-lovable.test.ts (3 tests)
 ✓ src/lib/medicalReferral.test.ts (14 tests)
 ✓ src/components/client/schedaStati.test.tsx (11 tests)
 ✓ src/components/client/invitoIntake.test.tsx (7 tests)
 ✓ src/components/client/neurotipoCard.test.tsx (15 tests)
 ✓ src/components/cornice.test.tsx (17 tests)

 Test Files  12 passed (12)
      Tests  159 passed (159)
```

**Prima: 10 file, 129 test. Dopo: 12 file, 159 test.** +30, nessuno preesistente rotto. Il
cordone Lovable ha letto anche i sette file nuovi ed è verde.

### 3 · Lint

```
$ bun run lint
✖ 17 problems (0 errors, 17 warnings)
```

**Identico a prima.** Nessuno dei 17 è in un file nuovo.

### 4 · File vietati: nessuna riga

```
$ git diff --stat -- src/components/PhoneShell.tsx src/pages/FmsSetup.tsx \
    src/pages/FmsWizardPage.tsx src/components/fms/FmsWizard.tsx src/lib/fms.ts \
    src/lib/intake.ts src/hooks/useIntake.ts src/components/ui/ \
    .github/workflows/ci.yml supabase/ docs/design/
(nessun output)
```

`PhoneShell.tsx` non è più importato da `AppShell` (ne è copiato il telaio, con un test che
tiene le due copie uguali) e resta importato dal wizard; **non modificato**. `ui/sidebar.tsx` è
stato letto per rispondere al prompt, non toccato.

### 5 · La barra laterale di shadcn resta inutilizzata

```
$ grep -rn "ui/sidebar" src/ --include=*.tsx | grep -v "components/ui/sidebar.tsx" | wc -l
0
```

### 6 · Nessun colore a mano

```
$ grep -rnE "#[0-9a-fA-F]{6}\b" src/ --include=*.tsx --include=*.ts | grep -v "src/components/ui/" | wc -l
0
```

### 7 · Nessuna classe di palette nuova

```
$ grep -rnE "(bg|text|border)-(blue|green|orange|amber|slate|gray|zinc|red|yellow)-[0-9]00" src/ --include=*.tsx | grep -v "src/components/ui/" | wc -l
17
```

Le stesse 17 di prima, tutte in `CorrectiveLibrary.tsx`.

### E la build, che l'accettazione non chiedeva ma `COMANDI-VERI.md` sì

```
$ bun run build
✓ built in 8.33s
```

L'avviso sui chunk oltre 500 kB è preesistente.

---

## Guardata, non solo provata — due volte

La app in locale richiede un'autenticazione che non ho. Come per la card del neurotipo, ho
messo un'impalcatura **temporanea**: in `src/App.tsx` la funzione `Shell` senza `ProtectedRoute`
(e, per guardare il wizard, le due rotte FMS senza il loro guard), server di sviluppo su 8080,
browser dell'app. L'ho fatto due volte — prima e dopo le correzioni della revisione — e ho
smontato tutto entrambe le volte:

```
$ git checkout -- src/App.tsx
$ git diff --stat -- src/App.tsx
(nessuna riga)
$ grep -c ANTEPRIMA src/App.tsx
0
$ sha256sum src/App.tsx
1cb754059d187eb22ddef1561c6533ed46d84b9a1cce9d7e0a38275f408ac6ef   (= main)
```

Le pagine, senza sessione, ricevono 401 da Supabase e mostrano i loro stati vuoti («Nessun
cliente», «Nessuna organizzazione trovata», il toast «Errore nel caricamento della dashboard»):
è il contenuto di oggi così com'è, senza dati. La cornice attorno è quella che conta qui.

### Le misure, lette dal DOM e non a occhio

| larghezza | cornice | misurato |
|---|---|---|
| **1440** | barra 240 | intestazione 56×1440; nav 240; main da x=240 largo 1200; colonna **1040** a x=313, `padding 32px`, **976 utili**, `padding-bottom 96px`; separatore `margin 14px 14px`; voce attiva: fondo `rgb(251,233,233)` = `hsl(0 70% 95%)`, testo `rgb(140,23,23)` = `hsl(0 72% 32%)`, `font-weight 500`, alta 40; titolo «Scrivania» `rgb(92,102,112)` = `--sidebar-foreground`, 10px; fondo barra `hsl(210 18% 96%)`, bordo `hsl(210 14% 89%)`; **un solo `<nav>`** |
| **1280** | barra 240 | main largo 1040; colonna **1025**, **961 utili** — vedi «cose storte» |
| **900** | rail 72 | nav 72; sei link **44×44** a x=14 (centrati), `textContent` vuoto, `aria-label` e `title` = etichetta; «Scrivania» `sr-only` (1×1); contenuto `padding 20px` |
| **834** | rail 72 | nav 72; main 762; **722 utili**; nessuna barra in basso |
| **390** | telefono | intestazione 56 a y=0; riga e **main 722** a y=56 (844−56−66), il main **scorre** (951 > 722); barra in basso **66** a y=778 con quattro celle da **98**; classi dei due `div` del telaio, del `main` e della barra **identiche** a `PhoneShell` e alla vecchia `AppShell`; nessuna barra laterale |
| **660** | telefono | telaio 390×844 con `border-radius 44px` su sfondo `hsl(210 16% 91%)` (`--desk-bg`): il comportamento di `PhoneShell` da 640px, invariato |
| **699** | telefono | telaio 390 |
| **1024** (ricaricando) | barra 240 | nav 240 al primo render |

Rotte a 1440: `/clients` accende **solo** Clienti, `/library` Libreria, `/daily-prep`
Preparazione, `/team` Team; `/assessments/fms/setup` → **zero `<nav>`**, telaio 390×844 sullo
sfondo scrivania: il wizard è rimasto stretto e senza navigazione, com'era deciso.

**Tema scuro** (classe `dark` aggiunta a mano, non c'è un ThemeProvider): barra
`rgb(21,24,30)` = `hsl(220 18% 10%)`, bordo `hsl(220 14% 15%)`, voce attiva fondo
`rgb(64,28,28)` = `hsl(0 40% 18%)` e testo `rgb(240,168,168)` = `hsl(0 70% 80%)`, voci a riposo
`hsl(210 10% 60%)`. Leggibile, e sono i token `.dark` di `index.css` senza toccarli.

### La rotazione del telefono, dal vivo

Dopo la correzione dell'albero unico ho rifatto la prova che il rilievo descriveva, nel
browser e non solo in jsdom: a 390 ho **marcato il nodo `main`** con una proprietà JavaScript e
l'ho fatto scorrere di 200px; poi 844×390 (telefono in orizzontale, fascia tablet), poi 1440.

| passo | stesso nodo `main`? | `scrollTop` | cornice |
|---|---|---|---|
| 390 | (marcato) | 200 | barra in basso |
| 844×390 | **sì** | **200** | rail 72, barra in basso sparita |
| 1440 | **sì** | — | barra 240, colonna 1040 |

Lo stesso elemento del DOM, con la sua posizione di scorrimento, attraverso entrambe le soglie.
Con la prima stesura sarebbe stato un nodo nuovo ogni volta.

### Il passaggio fra le cornici, e un artefatto dello strumento che va detto

Le prime transizioni — 1440 → 1280 → 900 → 834 → 390 — hanno cambiato cornice **dal vivo**, senza
ricaricare. Poi, dopo che il pannello del browser è entrato in emulazione mobile (sotto i 768),
le transizioni successive (699 → 700 → 1023 → 1024) **non cambiavano più niente**, pur con
`innerWidth` aggiornato.

Ho verificato che non fosse il hook: `matchMedia('(min-width: 1024px)').matches` leggeva `true`
a 1024, ma un ascoltatore di controllo installato a mano su `window` per l'evento nativo
`resize` — su cui il mio codice non ha alcun controllo — **non riceveva niente** neanche lui
(`log: []` dopo quattro ridimensionamenti). Il pannello era nascosto e la pagina non produceva
fotogrammi (è lo stesso motivo per cui ogni screenshot dopo un ridimensionamento andava in
timeout al primo tentativo); gli eventi `change` delle media query vengono spediti nel ciclo di
rendering, che era fermo. Appena uno screenshot ha forzato un fotogramma, il registro ha
ricevuto **tutto** — `['resize', 1100]`, `['change1024', true, 1100]`, `['change700', true, 1100]`,
coalescenti alla larghezza finale — e la cornice è passata alla barra da 240. Ricaricando a
1024 la barra da 240 c'era al primo render.

Quindi: il primo render è giusto a qualunque larghezza (provato con ricarica e con le sonde), e
il cambio dal vivo funziona quando il browser disegna (provato dal vivo, compresa la rotazione
qui sopra, e in T2). Ciò che non ho potuto provare in questo strumento è una rotazione su un
iPad vero.

### Le cose storte, che i test non vedono

1. **A 1280 esatti la colonna utile è 961, non 976.** Su Windows la barra di scorrimento del
   `main` è classica e larga 15px; 1280 − 240 = 1040 lasciano alla colonna 1025, meno 64 di
   margini. Il disegno assume una barra di scorrimento a scomparsa (macOS/iPad). Da 1295 in su
   sono 976. Non ho nascosto la barra: sulla scrivania serve.
2. **Il contenuto di oggi è un'impaginazione da telefono stirata a 976.** Sulla dashboard i
   quattro KPI restano `grid-cols-2` (`Dashboard.tsx:186`): due carte larghe 483px con un numero
   da 30px in un angolo e tanto vuoto. Le quattro carte di avvio rapido (`:222`), uguale. Lo
   stato vuoto «Nessun cliente» è una carta larga 976 con un'icona al centro. È **storto ma
   usabile**, ed è esattamente il perimetro che il prompt ha lasciato alla fetta delle quattro
   schermate a 1280.
3. **Tre pagine hanno una barra `fixed` in basso a tutta larghezza del viewport**, non della
   colonna: `SfmaAssessment.tsx:424` e `YbtAssessment.tsx:409` (`fixed inset-x-0 bottom-0`) e
   `FcsAssessment.tsx:554` (`fixed bottom-4 left-4 right-4 max-w-screen-md mx-auto`, centrata
   sul viewport e non sulla colonna: sotto i 1248px entra nella barra laterale). Sulla scrivania
   passano sopra il fondo della barra laterale (vuoto) e, nel caso FCS, stanno disallineate di
   120px rispetto al contenuto. Il `pb-24` tiene raggiungibile il fondo del contenuto; il resto è
   della fetta di quelle pagine, con la strada già usata da `FmsAssessment.tsx:788`
   (`sticky bottom-…` dentro il main).
4. **L'intestazione ha `px-4` anche a 1440**: il logo sta a 16px dal bordo, mentre le voci della
   barra laterale iniziano a 24px (12 di padding del nav + 12 della voce). Il disegno a 1280 la
   mette a 20px. L'ho lasciata così perché il prompt dice «INVARIATA, contenuto e logo dove
   sono»: se vuoi i 20px, è una riga.
5. **`FmsAssessment.tsx:517`** ha una fascia `sticky top-14 -mx-4 px-4` che assume il `px-4` del
   main del telefono: sulla scrivania il contenitore ha `px-8`, quindi la fascia sanguina di 16px
   invece di 32 e non arriva al bordo della colonna. Non rompe niente; è nella fetta della
   scheda FMS a 1280.
6. **La dissolvenza d'ingresso del `main`** (`animate-fade-in`, che c'era già) parte una volta
   al montaggio e basta: con l'albero unico non riparte più al cambio di cornice.

---

## La revisione avversariale, e cosa ha cambiato

Prima di chiudere ho fatto rileggere la fetta da **sette revisori indipendenti**, una lente
ciascuno — conformità al disegno, correttezza React del meccanismo anti-lampo, telefono
invariato e pagine esistenti, qualità dei test, accessibilità, vincoli e accettazione misurati,
pagine di oggi dentro 976px — e ogni loro rilievo è passato da **tre smontatori** con tre
compiti diversi: i fatti nel codice, il perimetro della fetta, la riproducibilità con un
comando. Un rilievo è «confermato» se almeno due su tre non sono riusciti a smontarlo.
Sessantuno agenti, **18 rilievi: 14 confermati, 4 smontati.**

### Il rilievo che contava, e che avevo sbagliato

**Attraversando i 700px la pagina veniva rimontata.** L'hanno trovato **quattro lenti su
sette** (disegno, React, telefono, accessibilità), e tutti e dodici gli smontatori l'hanno
confermato, uno di loro con un test usa-e-getta nello scratchpad: un figlio con `useState`
portato a 3 tornava a 0 passando da 390 a 844. La prima stesura di `AppShell` aveva due alberi
— `<PhoneShell>` sotto i 700, `<div>` sopra — e il commento in testa prometteva «un tablet che
ruota non rimonta la pagina», promessa vera solo sul confine 1024. Su `main` non succedeva mai.
Caso concreto: un iPhone in verticale è 390px, ruotato è 844-932px, cioè fascia tablet; un PT a
metà di una SFMA (`step` in `useState`) o di una FCS (form) che ruota il telefono si ritrovava
al passo zero.

Corretto con l'**albero unico** (Parte 2, `AppShell`), con **T4** che lo dimostra rosso sulla
prima stesura, e con la prova dal vivo della rotazione sopra.

### Gli altri confermati, e cosa ho fatto

| gravità | lente | rilievo | cosa ho fatto |
|---|---|---|---|
| bassa | telefono | `voceAttiva` distingueva le maiuscole, `NavLink` no: su `/Clients` react-router apre Clienti e nessuna voce si accendeva | confronto in minuscolo, caso aggiunto a T1 |
| bassa | a11y | «Scrivania» a 10px in `text-muted-foreground` fa 4,44:1 sul fondo della barra, sotto AA | `text-sidebar-foreground`: 5,35:1 chiaro, 6,14:1 scuro, ed è il token che la fetta chiede |
| bassa | disegno | separatore a 8px (rail) e 12px (barra) dalle voci, il disegno ne vuole 14 (gap + margine) | `my-3.5` in entrambe; misurato `14px 14px` |
| media | test | la sonda anti-lampo provava l'hook, non `AppShell`: un lampo introdotto in `AppShell` passava | spie `vi.fn` sulle due barre, «non chiamata nemmeno una volta»; la rottura T2 ora fa cadere anche questo |
| media | test | il mock di `matchMedia` avvisava tutti gli ascoltatori a ogni resize: un hook iscritto a una sola query passava | ascoltatori per query, avviso solo se `matches` cambia, passi a soglia singola nel test |
| alta | pagine976 | SFMA e YBT hanno una barra `fixed bottom-0` a tutta larghezza del viewport; FCS un bottone `fixed` centrato sul viewport | **fuori fetta** per la posizione, ma il mio `pb-8` avrebbe reso irraggiungibile il fondo di quelle pagine: `pb-24` anche sulla scrivania. Il resto in «cose storte» |
| media | a11y | la voce attiva è marcata **dal solo colore**: fondo accent a 1,07:1 sul fondo della barra, testo che cambia quasi solo tonalità | **non corretto**: barretta e grassetto sono vietati dal prompt e dal disegno, e alzare la saturazione del token è una decisione tua. `aria-current` c'è, quindi gli screen reader lo sanno. Vedi «cosa non ho fatto» |
| media | pagine976 | dashboard `grid-cols-2` stirata a 483px per cella | fuori fetta, in «cose storte» |
| bassa | pagine976 | `FmsAssessment.tsx:517` `-mx-4 px-4` presume il `px-4` del telefono | fuori fetta, in «cose storte» |

### I quattro smontati

- «Clienti (`Users`) e Team (`UsersRound`) sul rail sono lo stesso glifo» — vero come geometria,
  ma le due icone sono **prescritte** dal prompt e dal disegno; non è una scelta della fetta.
- «I landmark si chiamano "Barra laterale" e "Barra in basso", la stessa navigazione cambia
  nome con la larghezza» — preferenza di nomenclatura, non un difetto; il rilievo stesso lo
  ammetteva.
- «Il criterio di accettazione sulla palette descrive male lo stato reale» — leggeva un
  testo del criterio che non esiste.
- «`ClientDetail.tsx`: quattro bottoni da 483px in `grid-cols-2`» — file a diff zero, stato
  intermedio dichiarato e accettato dal prompt.

---

## Stato del repo a fine fetta

```
$ git status --short
 M docs/ULTIMO-RITORNO.md
 M src/components/AppShell.tsx
?? docs/design/
?? src/components/AppHeader.tsx
?? src/components/BarraInBasso.tsx
?? src/components/BarraLaterale.tsx
?? src/components/cornice.test.tsx
?? src/hooks/useCornice.ts
?? src/lib/navigazione.test.ts
?? src/lib/navigazione.ts
```

Niente di più: nessun file di scarto, nessuna rotta di anteprima rimasta, nessun `__*`,
`docs/design/` non tracciata com'era. I test usa-e-getta degli smontatori sono nello scratchpad
della sessione, fuori dal repo.

`AppShell.tsx` è l'unico file esistente modificato: **70 righe aggiunte, 84 tolte**.

---

## Cosa non ho fatto, e perché

**Non ho messo il numero dei clienti accanto a «Clienti».** Fuori fetta di proposito, per il
motivo scritto nel prompt: un componente di impaginazione che interroga il database si porta
dietro uno stato di errore su ogni pagina. Arriva con l'elenco clienti.

**Non ho toccato le quattro schermate a 1280, il pannello del wizard, i colori della libreria e
il commento sbagliato di `ScoreSelector.tsx`.** Fuori fetta. Le cose storte che ne derivano sono
elencate sopra, con file e riga.

**Non ho cambiato come si distingue la voce attiva.** La revisione ha ragione che è solo colore,
e che il fondo accent contro il fondo della barra fa 1,07:1: chi non distingue bene i colori
vede la voce attiva solo dal testo rosso scuro contro il grigio. Le due vie che restano sono
entrambe decisioni tue, non mie: un `--sidebar-accent` più saturo (es. `0 70% 88%`), che cambia
un token usato d'ora in poi ovunque, oppure un segno non cromatico che il disegno ha escluso.
`aria-current="page"` c'è in tutte le cornici, quindi la tastiera e gli screen reader lo sanno.

**Non ho spostato le barre `fixed` di SFMA, YBT e FCS.** Sono in tre pagine fuori fetta, e la
strada è già nel repo (`FmsAssessment.tsx:788`, `sticky` dentro il main). Ho messo il `pb-24`
perché il fondo del contenuto resti raggiungibile.

**Non ho usato `ui/sidebar.tsx` e non l'ho cancellato.** Non usarlo: per i tre motivi tecnici
del prompt, verificati riga per riga (15, 155, 6). Non cancellarlo: `src/components/ui/` è
vietata. Resta un file da 23 KB che nessuno importa; se un giorno si vorrà togliere, si toglie
insieme a `use-mobile.tsx`, che esiste solo per lui.

**Non ho usato `use-mobile.tsx` e non l'ho corretto.** Lampeggia per costruzione (Parte 1) e ha
la soglia sbagliata. Correggerlo avrebbe significato toccare l'unico posto che lo usa, che è
vietato.

**Non ho nascosto la barra di scorrimento sulla scrivania.** È la scelta che fa perdere 15px a
1280 su Windows, e la rifarei: una pagina da scrivania senza barra di scorrimento visibile è un
errore più grande di una colonna larga 961.

**Non ho cambiato il `px-4` dell'intestazione.** «Invariata» voleva dire invariata.

**Non ho corretto il commento in testa a `PhoneShell.tsx`**, che dice «desktop (viewport ≥
430px)» mentre il codice usa `sm:`, cioè 640px (il prompt lo dice giusto). Il file è vietato.
Lo segnalo perché è il tipo di commento che fa perdere un'ora a chi legge.

**Non ho reso persistente la cornice** (né cookie né localStorage): la larghezza della finestra
è l'unica verità, e non ha bisogno di essere ricordata.

**Non ho acceso il tema scuro né aggiunto un `ThemeProvider`.** L'ho solo simulato aggiungendo
la classe `dark` a mano, per guardare cosa succederà.

**Non ho provato su un iPad vero né su Safari.** Solo il browser dell'app (Chromium) con
emulazione delle larghezze, con il limite descritto sopra.

**Non ho fatto merge, non ho fatto deploy e non ho spinto il ramo**, come chiesto. Il ramo
`claude/cornice-scrivania` è committato in locale e pronto per una PR.
