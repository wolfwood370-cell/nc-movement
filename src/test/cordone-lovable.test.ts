import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Cancello derivato dello stacco: va rosso se Lovable rientra dalla finestra.
 *
 * Non verifica un comportamento dell'app ma una proprieta' del repo, quindi
 * legge i sorgenti dal disco invece di importarli. Il costo di questo test e'
 * un readFileSync per file; il costo di non averlo e' accorgersi fra sei mesi
 * che una dipendenza rimessa "solo per provare" e' tornata in produzione.
 */

const ROOT = process.cwd();
const CORDONE = /lovable/i;

/** Questo file nomina Lovable per mestiere: se si leggesse, sarebbe rosso per sempre. */
const SELF = relative(ROOT, fileURLToPath(import.meta.url));

function fileSotto(dir: string, out: string[] = []): string[] {
  for (const voce of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, voce);
    if (statSync(join(ROOT, rel)).isDirectory()) fileSotto(rel, out);
    else out.push(rel);
  }
  return out;
}

describe('cordone Lovable', () => {
  it('package.json, vite.config.ts e src/ non lo nominano piu', () => {
    const daLeggere = ['package.json', 'vite.config.ts', ...fileSotto('src')]
      .filter((f) => f !== SELF);
    const colpevoli = daLeggere.filter((f) => CORDONE.test(readFileSync(join(ROOT, f), 'utf8')));
    expect(colpevoli).toEqual([]);
  });

  it('il client Supabase punta allo schema movement', () => {
    const client = readFileSync(join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
    expect(client).toContain("schema: 'movement'");
  });

  it('supabase/migrations non esiste piu', () => {
    expect(existsSync(join(ROOT, 'supabase', 'migrations'))).toBe(false);
  });
});
