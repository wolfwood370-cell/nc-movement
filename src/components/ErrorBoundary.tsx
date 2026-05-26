import { Component, ReactNode } from 'react';
import { AlertTriangle, Check, ClipboardCopy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureBug, formatBugForClaude, type BugReport } from '@/lib/bugReporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  report: BugReport | null;
  copied: boolean;
}

/**
 * App-level error boundary. Catches render errors anywhere in the React tree
 * and shows a graceful fallback instead of a blank white page. On catch it
 * also saves a structured BugReport (localStorage + Supabase best-effort)
 * and offers a "Copia segnalazione" button so the user can paste a clean
 * Markdown report into the Claude chat for a surgical fix.
 *
 * NOTE: It does NOT catch errors in:
 *  - event handlers (handled by global window.error listener — see bugReporter.installGlobalBugListeners)
 *  - async code (handled by global unhandledrejection listener — same)
 *  - SSR (we are SPA-only)
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, report: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
    void captureBug(error, {
      source: 'error_boundary',
      extra: { componentStack: info.componentStack },
    }).then(report => this.setState({ report }));
  }

  reset = () => {
    this.setState({ hasError: false, error: null, report: null, copied: false });
  };

  reload = () => {
    window.location.reload();
  };

  copyReport = async () => {
    if (!this.state.report) return;
    const md = formatBugForClaude(this.state.report);
    try {
      await navigator.clipboard.writeText(md);
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Fallback for browsers that block clipboard API: select-text in a textarea.
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); this.setState({ copied: true }); } catch { /* ignore */ }
      document.body.removeChild(ta);
      window.setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md w-full surface-card p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 grid place-items-center">
            <AlertTriangle className="w-7 h-7 text-destructive" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">
              Qualcosa è andato storto
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              L'applicazione ha incontrato un errore inaspettato. I tuoi dati sono al sicuro.
            </p>
          </div>

          {this.state.error?.message && (
            <pre className="text-[11px] text-left bg-muted/40 rounded-lg p-3 overflow-x-auto text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={this.copyReport}
              disabled={!this.state.report}
              variant="outline"
              className="w-full h-11 rounded-xl"
            >
              {this.state.copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  Copiato — incollalo nella chat di Claude
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-4 h-4 mr-2" />
                  Copia segnalazione per Claude
                </>
              )}
            </Button>
            <Button onClick={this.reload} className="w-full h-11 rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Ricarica la pagina
            </Button>
            <Button onClick={this.reset} variant="ghost" className="w-full">
              Riprova senza ricaricare
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Una copia della segnalazione è stata salvata in <code>/admin/bugs</code>.
          </p>
        </div>
      </div>
    );
  }
}
