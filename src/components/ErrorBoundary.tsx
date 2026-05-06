import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-level error boundary. Catches render errors anywhere in the React tree
 * and shows a graceful fallback instead of a blank white page.
 *
 * NOTE: It does NOT catch errors in:
 *  - event handlers (use try/catch + toast there)
 *  - async code (Promise rejections)
 *  - SSR (we are SPA-only)
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production this should ship to a logger (Sentry / LogRocket).
    // For now, console + chance to wire up later.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  reload = () => {
    window.location.reload();
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
            <Button onClick={this.reload} className="w-full h-11 rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Ricarica la pagina
            </Button>
            <Button onClick={this.reset} variant="ghost" className="w-full">
              Riprova senza ricaricare
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
