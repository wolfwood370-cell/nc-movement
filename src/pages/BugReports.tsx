import { useEffect, useState } from 'react';
import { AlertTriangle, Bug, Check, ClipboardCopy, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// `bug_reports` is added by migration 20260527120000. Until Lovable
// regenerates `supabase/types.ts`, we use a loose cast to avoid a TS error
// on the unknown table name. Remove once the table is in the typed schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;
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
import { formatBugForClaude, type BugReport, type BugStatus } from '@/lib/bugReporter';

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error(`Errore nel caricare le segnalazioni: ${error.message}`);
      return;
    }
    setReports((data ?? []) as BugReport[]);
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
    const { error } = await sb.from('bug_reports').update({ status }).eq('id', id);
    if (error) {
      toast.error(`Aggiornamento fallito: ${error.message}`);
      return;
    }
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
    toast.success(`Marcato come "${STATUS_LABEL[status]}"`);
  };

  const deleteReport = async (id: string) => {
    if (!window.confirm('Eliminare definitivamente questa segnalazione?')) return;
    const { error } = await sb.from('bug_reports').delete().eq('id', id);
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

      {loading && reports.length === 0 ? (
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
