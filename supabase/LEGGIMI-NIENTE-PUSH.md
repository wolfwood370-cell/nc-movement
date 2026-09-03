# Queste migrazioni non si spingono

`migrazioni-lovable-storiche/` sono le 45 migrazioni scritte quando NC Movement
viveva nel progetto Supabase di Lovable. **Non lanciare `supabase db push`.**

1. Creano tabelle in `public` (`public.clients`, `public.sessions`, …), ma il
   database di NC Movement ora vive nello schema **`movement`**.
2. Il progetto puntato da `config.toml` (`srrmauojpficdswmtjya`, NC-TOOLS) e'
   **condiviso con NC Questionario**: un push riverserebbe NC Movement dentro
   lo schema `public` di un progetto di qualcun altro.
3. Su NC-TOOLS non sono mai state applicate. Lo schema `movement` e' stato
   migrato e verificato a parte; `public.clients` li' non esiste.

Restano nel repo perche' sono la storia dello schema, non perche' siano
eseguibili. Riallinearle a `movement` e' un lavoro a se': finche' non e'
fatto, si leggono e basta.
