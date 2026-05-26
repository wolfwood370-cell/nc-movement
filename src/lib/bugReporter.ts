// =============================================================================
// Bug Reporter — in-app crash capture
// =============================================================================
//
// Hooks called by the ErrorBoundary and the global window listeners. Every
// error is recorded to TWO sinks:
//
//   1. localStorage  — always works, even offline / table missing. Capped
//                      at LOCAL_MAX rows (oldest dropped).
//   2. Supabase      — best-effort insert into `bug_reports`. Failures are
//                      swallowed silently so the boundary itself never throws.
//
// The admin page reads from the Supabase sink. The Markdown formatter is what
// the user copies into the Claude chat to ask for a surgical fix.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';

// `bug_reports` is added by migration 20260527120000. Until Lovable
// regenerates `supabase/types.ts`, we use a loose cast to avoid a TS error
// on the unknown table name. Remove once the table is in the typed schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type BugStatus = 'new' | 'reported' | 'fixed';

export interface BugReport {
  /** Set only after a successful Supabase insert. */
  id?: string;
  /** ISO timestamp. Set client-side for localStorage, server-side on insert. */
  created_at?: string;
  error_message: string;
  error_name: string | null;
  error_stack: string | null;
  url_path: string | null;
  user_agent: string | null;
  user_note: string | null;
  status: BugStatus;
  meta: Record<string, unknown>;
}

export interface CaptureContext {
  /** Where the capture happened: 'error_boundary', 'window.error', 'unhandledrejection', ... */
  source: string;
  /** Optional free-form extra context (e.g. componentStack, action name). */
  extra?: Record<string, unknown>;
}

const LOCAL_KEY = 'nc-bug-reports';
const LOCAL_MAX = 20;

/** Capture an error to localStorage (always) and Supabase (best-effort). */
export async function captureBug(
  error: Error | unknown,
  context: CaptureContext = { source: 'unknown' },
): Promise<BugReport> {
  const err = error instanceof Error ? error : new Error(safeStringify(error));
  const report: BugReport = {
    error_message: err.message || 'Unknown error',
    error_name:    err.name || null,
    error_stack:   err.stack ?? null,
    url_path:      readUrlPath(),
    user_agent:    typeof navigator !== 'undefined' ? navigator.userAgent : null,
    user_note:     null,
    status:        'new',
    meta:          { source: context.source, ...(context.extra ?? {}) },
    created_at:    new Date().toISOString(),
  };

  saveToLocal(report);

  // Best-effort persistence. Swallow ANY error — the boundary must not throw.
  try {
    const { data, error: insertErr } = await sb
      .from('bug_reports')
      .insert({
        error_message: report.error_message,
        error_name:    report.error_name,
        error_stack:   report.error_stack,
        url_path:      report.url_path,
        user_agent:    report.user_agent,
        user_note:     report.user_note,
        status:        report.status,
        meta:          report.meta,
      })
      .select()
      .single();
    if (!insertErr && data) {
      report.id = (data as { id: string }).id;
      report.created_at = (data as { created_at: string }).created_at;
    }
  } catch {
    // Silent — localStorage is the safety net.
  }

  return report;
}

// -----------------------------------------------------------------------------
// localStorage sink
// -----------------------------------------------------------------------------

function saveToLocal(report: BugReport): void {
  try {
    const existing = readLocalReports();
    const next = [report, ...existing].slice(0, LOCAL_MAX);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be full or unavailable (private mode); ignore.
  }
}

export function readLocalReports(): BugReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BugReport[]) : [];
  } catch {
    return [];
  }
}

export function clearLocalReports(): void {
  try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
}

// -----------------------------------------------------------------------------
// Markdown formatter — what the user copies into the Claude chat
// -----------------------------------------------------------------------------

export function formatBugForClaude(report: BugReport): string {
  const lines: string[] = [];
  lines.push('## Segnalazione Bug — NC Movement');
  lines.push('');
  lines.push(`- **Quando:** ${report.created_at ?? 'n/d'}`);
  lines.push(`- **Pagina:** ${report.url_path ?? 'n/d'}`);
  lines.push(`- **Errore:** \`${report.error_message}\``);
  if (report.error_name) lines.push(`- **Tipo:** ${report.error_name}`);
  if (report.meta && Object.keys(report.meta).length > 0) {
    lines.push(`- **Contesto:** ${JSON.stringify(report.meta)}`);
  }
  if (report.user_note) lines.push(`- **Note utente:** ${report.user_note}`);
  lines.push('');
  if (report.error_stack) {
    lines.push('### Stack trace');
    lines.push('```');
    lines.push(report.error_stack);
    lines.push('```');
    lines.push('');
  }
  lines.push(`_User-Agent: ${report.user_agent ?? 'n/d'}_`);
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Global window listeners — wire once at app boot
// -----------------------------------------------------------------------------

/**
 * Install window-level listeners for non-React errors:
 *   - `error` event for synchronous runtime errors
 *   - `unhandledrejection` for Promise rejections
 *
 * Idempotent: a guard prevents double registration during HMR.
 */
export function installGlobalBugListeners(): void {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.__ncBugListenersInstalled) return;
  w.__ncBugListenersInstalled = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    void captureBug(event.error ?? new Error(event.message), {
      source: 'window.error',
      extra: {
        filename: event.filename,
        lineno:   event.lineno,
        colno:    event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    void captureBug(event.reason, { source: 'unhandledrejection' });
  });
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function readUrlPath(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.pathname + window.location.search;
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}
