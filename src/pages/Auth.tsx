import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Mode = 'signin' | 'forgot';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
  </svg>
);

export default function Auth() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        toast.error('Credenziali non valide. Verifica email e password.');
      } else if (error.message.toLowerCase().includes('confirm')) {
        toast.error('Email non confermata. Controlla la tua casella di posta.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    navigate('/', { replace: true });
  };

  const forgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Email di recupero inviata. Controlla la tua casella di posta.');
    setMode('signin');
  };

  if (loading || session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-elevated glow-primary">
            <Activity className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-primary">NC Movement</h1>
            <p className="text-sm text-muted-foreground mt-1">Practitioner Studio · Accesso riservato</p>
          </div>
        </div>

        {mode === 'forgot' ? (
          <form onSubmit={forgot} className="surface-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMode('signin')}
                className="text-muted-foreground hover:text-foreground" aria-label="Indietro">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="font-display font-semibold">Recupera password</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Inserisci la tua email: ti invieremo un link per reimpostare la password.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email-forgot">Email</Label>
              <Input id="email-forgot" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl tap-target">
              <KeyRound className="w-4 h-4 mr-2" />
              {submitting ? 'Invio…' : 'Invia link di recupero'}
            </Button>
          </form>
        ) : (
          <form onSubmit={signIn} className="surface-card p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-in">Email</Label>
              <Input id="email-in" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-in">Password</Label>
              <Input id="pw-in" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl tap-target">
              <LogIn className="w-4 h-4 mr-2" />
              {submitting ? 'Accesso…' : 'Accedi'}
            </Button>
            <button type="button" onClick={() => setMode('forgot')}
              className="block w-full text-xs text-primary hover:underline text-center pt-1">
              Password dimenticata?
            </button>
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Le registrazioni sono disabilitate. Accesso riservato al titolare.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
