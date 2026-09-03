import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, ArrowRight, Lock, Mail, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type AuthView = 'login' | 'recovery';

/* ---------- Aurora background ---------- */
const AuroraBackground = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }}
    />
    <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-primary/30 blur-[120px]" />
    <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[120px]" />
    <div className="absolute bottom-[-180px] left-1/4 h-[460px] w-[460px] rounded-full bg-accent/40 blur-[110px]" />
    <div className="absolute top-10 left-1/2 h-[360px] w-[360px] rounded-full bg-primary/15 blur-[100px]" />
    <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/20 to-background/60" />
  </div>
);

const FieldInput = ({
  icon: Icon,
  ...props
}: React.ComponentProps<'input'> & { icon: typeof Mail }) => (
  <div className="relative group">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
    <Input
      {...props}
      className="pl-10 h-11 bg-background/40 border-border/60 backdrop-blur-md transition-all duration-300 hover:border-primary/30 focus:ring-2 focus:ring-primary/50 focus:border-primary/40"
    />
  </div>
);

const SubmitButton = ({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) => (
  <Button
    type="submit"
    disabled={loading}
    className="w-full h-11 group relative overflow-hidden bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:shadow-elevated active:scale-[0.98]"
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Attendere...
      </span>
    ) : (
      children
    )}
  </Button>
);

export default function Auth() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Accedi · NC Movement';
  }, []);

  // If arriving with ?invite=<token>, redeem it once a session exists.
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { token: inviteToken },
      });
      if (error || (data && (data as { error?: string }).error)) {
        const msg = (data as { error?: string } | null)?.error ?? error?.message ?? 'Impossibile accettare l\'invito.';
        toast.error(msg);
      } else {
        toast.success('Invito accettato.');
      }
      // Strip the token from the URL either way so it isn't retried.
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Credenziali non valide.');
    } else {
      toast.success('Bentornato!');
    }
    setIsSubmitting(false);
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Email di recupero inviata. Controlla la tua casella.');
      setView('login');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <AuroraBackground />

      <div className="relative z-10 min-h-screen flex">
        {/* Left brand panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-elevated glow-primary">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">NC Movement</h1>
              <p className="text-xs text-muted-foreground">Practitioner Studio</p>
            </div>
          </div>

          <div className="space-y-7 max-w-lg animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 backdrop-blur-md px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Valutazioni funzionali del movimento
            </div>
            <h2 className="text-5xl font-bold leading-[1.05] tracking-tight text-foreground">
              Trasforma ogni screening in un{' '}
              <span className="text-primary">protocollo correttivo preciso.</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              FMS, SFMA, YBT e FCS in un'unica piattaforma costruita per professionisti del movimento.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">© 2026 NC Training Systems. Tutti i diritti riservati.</p>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-elevated glow-primary">
                <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <h1 className="text-lg font-bold text-foreground">NC Movement</h1>
            </div>

            <div className="relative rounded-3xl bg-background/60 backdrop-blur-xl border border-border/60 shadow-2xl p-7 sm:p-8">
              {view === 'recovery' ? (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-semibold tracking-tight">Reimposta Password</h2>
                    <p className="text-sm text-muted-foreground">
                      Inserisci la tua email per ricevere un link di reset.
                    </p>
                  </div>
                  <form onSubmit={handleRecovery} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recovery-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email
                      </Label>
                      <FieldInput
                        icon={Mail}
                        id="recovery-email"
                        type="email"
                        placeholder="tu@esempio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <SubmitButton loading={isSubmitting}>
                      <span className="flex items-center gap-2">
                        Invia Link di Reset
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </SubmitButton>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground hover:text-foreground"
                      onClick={() => setView('login')}
                    >
                      Torna al Login
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-semibold tracking-tight">Bentornato</h2>
                    <p className="text-sm text-muted-foreground">
                      Accesso riservato. Inserisci le tue credenziali.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email
                      </Label>
                      <FieldInput
                        icon={Mail}
                        id="login-email"
                        type="email"
                        placeholder="tu@esempio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setView('recovery')}
                          className="text-xs text-primary hover:underline"
                        >
                          Password dimenticata?
                        </button>
                      </div>
                      <FieldInput
                        icon={Lock}
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <SubmitButton loading={isSubmitting}>
                      <span className="flex items-center gap-2">
                        Accedi
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </SubmitButton>
                  </form>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Accesso riservato al titolare. Le registrazioni sono disabilitate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
