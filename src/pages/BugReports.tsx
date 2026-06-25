import { useEffect, useState } from 'react';
import { AlertTriangle, Bug, Check, ClipboardCopy, Database, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatBugForClaude,
  readLocalReports,
  type BugReport,
  type BugStatus,
} from '@/lib/bugReporter';

/** Detect Postgres "table not found" errors raised by PostgREST. */
function isTableMissingError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('could not find the table')
      || msg.includes('relation "public.bug_reports" does not exist')
      || err.code === '42P01';
}

/** Migration SQL — kept inline so the user can paste it into Lovable's SQL
 *  Editor as a manual fallback when the auto-migration hasn't run yet. */
const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  error_message   text NOT NULL,
  error_name      text,
  error_stack     text,
  url_path        text,
  user_agent      text,
  user_note       text,
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'reported', 'fixed')),
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at
  ON public.bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status
  ON public.bug_reports (status);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_authenticated"
  ON public.bug_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bug_reports_select_authenticated"
  ON public.bug_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "bug_reports_update_authenticated"
  ON public.bug_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bug_reports_delete_authenticated"
  ON public.bug_reports FOR DELETE TO authenticated USING (true);`;

type StatusFilter = 'all' | BugStatus;

const STATUS_LABEL: Record<BugStatus, string> = {
  new:      'Nuovo',
  reported: 'Segnalato',
  fixed:    'Sistemato',
};

const STATUS_BADGE_CLASS: Record<BugStatus, string> = {
  new:      'bg-pain text-destructive-foreground',
  reported: 'bg-warning text-warning-foreground',
  fixed:    'bg-functional text-success-foreground',
};

export default function BugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [localReports, setLocalReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    // localStorage always works — load it first so we have *something* to show.
    setLocalReports(readLocalReports());

    // Route through edge function: server-side staff role check + service-role
    // data access. The UI guard alone is bypassable; this is the real gate.
    const { data: res, error } = await supabase.functions.invoke('admin-bug-reports', {
      body: { type: 'list' },
    });
    setLoading(false);
    if (error) {
      const msg = (error.message ?? '').toLowerCase();
      if (msg.includes('forbidden')) {
        toast.error('Accesso negato: ruolo staff richiesto.');
        setReports([]);
        return;
      }
      if (isTableMissingError(error as { message?: string; code?: string })) {
        setTableMissing(true); setReports([]); return;
      }
      toast.error(`Errore nel caricare le segnalazioni: ${error.message}`);
      return;
    }
    setTableMissing(false);
    const ALLOWED: BugStatus[] = ['new', 'reported', 'fixed'];
    const rows: BugReport[] = ((res?.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      ...(r as object),
      status: ALLOWED.includes(r.status as BugStatus) ? (r.status as BugStatus) : 'new',
      meta: (r.meta ?? {}) as Record<string, unknown>,
    }) as BugReport);
    setReports(rows);
  };

  useEffect(() => { void fetchReports(); }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const counts = {
    all:      reports.length,
    new:      reports.filter(r => r.status === 'new').length,
    reported: reports.filter(r => r.status === 'reported').length,
    fixed:    reports.filter(r => r.status === 'fixed').length,
  };

  const updateStatus = async (id: string, status: BugStatus) => {
    const { error } = await supabase.functions.invoke('admin-bug-reports', {
      body: { type: 'update', id, status },
    });
    if (error) {
      toast.error(`Aggiornamento fallito: ${error.message}`);
      return;
    }
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
    toast.success(`Marcato come "${STATUS_LABEL[status]}"`);
  };

  const deleteReport = async (id: string) => {
    if (!window.confirm('Eliminare definitivamente questa segnalazione?')) return;
    const { error } = await supabase.functions.invoke('admin-bug-reports', {
      body: { type: 'delete', id },
    });
    if (error) {
      toast.error(`Eliminazione fallita: ${error.message}`);
      return;
    }
    setReports(prev => prev.filter(r => r.id !== id));
    toast.success('Segnalazione eliminata');
  };

  const copyReport = async (report: BugReport) => {
    const md = formatBugForClaude(report);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedId(report.id ?? null);
      window.setTimeout(() => setCopiedId(null), 2500);
      toast.success('Testo copiato — incollalo nella chat di Claude');
      // Auto-mark as "reported" to nudge the workflow forward.
      if (report.id && report.status === 'new') {
        void updateStatus(report.id, 'reported');
      }
    } catch (e) {
      toast.error(`Copia fallita: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-xl">Segnalazioni Bug</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Errori catturati automaticamente dall'app. Premi <strong>Copia per Claude</strong> per
          ottenere un testo Markdown pronto da incollare nella chat.
        </p>
      </header>

      {tableMissing && (
        <Card className="surface-card border-warning/40">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm">
                  Tabella <code>bug_reports</code> non ancora presente
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Il file di migration è già nel repo (<code>supabase/migrations/20260527120000_create_bug_reports.sql</code>),
                  ma Lovable Cloud non l'ha ancora applicato. Apri la chat di Lovable e scrivi:
                  <em> "Applica la migration più recente in supabase/migrations e rigenera i tipi"</em>.
                  In alternativa, incolla l'SQL qui sotto nel SQL Editor di Lovable Cloud.
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  I report già catturati dal browser (localStorage) restano comunque visibili sotto e sono pronti da copiare.
                </p>
              </div>
            </div>
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-semibold">
                Mostra SQL della migration
              </summary>
              <div className="relative mt-2">
                <pre className="bg-muted/40 rounded-md p-3 overflow-x-auto text-[10px] leading-snug">{MIGRATION_SQL}</pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(MIGRATION_SQL).then(
                      () => toast.success('SQL copiato — incollalo nel SQL Editor di Lovable'),
                      () => toast.error('Copia fallita'),
                    );
                  }}
                  className="absolute top-2 right-2 h-7 text-[11px]"
                >
                  <ClipboardCopy className="w-3 h-3 mr-1" /> Copia SQL
                </Button>
              </div>
            </details>
            <Button size="sm" variant="outline" onClick={fetchReports} className="h-8 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Riprova caricamento
            </Button>
          </CardContent>
        </Card>
      )}

      {!tableMissing && (
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)} className="flex-1">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">Tutti · {counts.all}</TabsTrigger>
              <TabsTrigger value="new">Nuovi · {counts.new}</TabsTrigger>
              <TabsTrigger value="reported">Segnalati · {counts.reported}</TabsTrigger>
              <TabsTrigger value="fixed">Sistemati · {counts.fixed}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={fetchReports} variant="outline" size="sm" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {tableMissing && localReports.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Report salvati nel browser (localStorage) · {localReports.length}
          </p>
          <Accordion type="multiple" className="space-y-2">
            {localReports.map((r, idx) => (
              <AccordionItem
                key={`local-${idx}-${r.created_at ?? r.error_message}`}
                value={`local-${idx}`}
                className="border border-border rounded-lg surface-card overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-start gap-2 text-left w-full pr-2">
                    <Badge className="shrink-0 bg-muted text-muted-foreground">Locale</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{r.error_message}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{formatTimestamp(r.created_at)}</span>
                        {r.url_path && <span className="truncate">· {r.url_path}</span>}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  {r.error_stack && (
                    <pre className="bg-muted/40 rounded-md p-2 overflow-x-auto text-[10px]">{r.error_stack}</pre>
                  )}
                  <Button
                    size="sm"
                    onClick={() => copyReport(r)}
                    className="h-8 text-xs"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5 mr-1.5" /> Copia per Claude
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {tableMissing ? null : loading && reports.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Carico segnalazioni…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="surface-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
            Nessuna segnalazione {filter !== 'all' ? `con stato "${STATUS_LABEL[filter]}"` : ''}.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map(r => (
            <AccordionItem
              key={r.id ?? r.created_at ?? r.error_message}
              value={r.id ?? r.created_at ?? r.error_message}
              className="border border-border rounded-lg surface-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-start gap-2 text-left w-full pr-2">
                  <Badge className={`shrink-0 ${STATUS_BADGE_CLASS[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{r.error_message}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{formatTimestamp(r.created_at)}</span>
                      {r.url_path && <span className="truncate">· {r.url_path}</span>}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                {r.error_name && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Tipo: </span>
                    <code>{r.error_name}</code>
                  </div>
                )}
                {r.meta && Object.keys(r.meta).length > 0 && (
                  <pre className="text-[10px] bg-muted/40 rounded-md p-2 overflow-x-auto">
                    {JSON.stringify(r.meta, null, 2)}
                  </pre>
                )}
                {r.error_stack && (
                  <details className="text-[10px]">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Stack trace
                    </summary>
                    <pre className="bg-muted/40 rounded-md p-2 overflow-x-auto mt-1">
                      {r.error_stack}
                    </pre>
                  </details>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => copyReport(r)}
                    className="h-8 text-xs"
                  >
                    {copiedId === r.id ? (
                      <><Check className="w-3.5 h-3.5 mr-1.5" /> Copiato</>
                    ) : (
                      <><ClipboardCopy className="w-3.5 h-3.5 mr-1.5" /> Copia per Claude</>
                    )}
                  </Button>
                  {r.status !== 'reported' && r.id && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id!, 'reported')} className="h-8 text-xs">
                      Marca come segnalato
                    </Button>
                  )}
                  {r.status !== 'fixed' && r.id && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id!, 'fixed')} className="h-8 text-xs">
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Marca come sistemato
                    </Button>
                  )}
                  {r.id && (
                    <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id!)} className="h-8 text-xs text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Elimina
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return 'n/d';
  try {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
      hour:  '2-digit',
      minute:'2-digit',
    });
  } catch {
    return iso;
  }
}
