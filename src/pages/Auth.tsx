import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [displayName, setDisplayName] = useState('');
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

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    setSubmitting(false);
    if (error) {
      if (error.message.toLowerCase().includes('registered')) {
        toast.error('Email già registrata. Accedi o recupera la password.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success('Registrazione completata! Controlla la tua email per confermare l\'account.');
    setMode('signin');
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
            <p className="text-sm text-muted-foreground mt-1">Practitioner Studio</p>
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
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Accedi</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
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
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="surface-card p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-up">Nome</Label>
                  <Input id="name-up" type="text" autoComplete="name"
                    placeholder="Es. Mario Rossi"
                    value={displayName} onChange={e => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-up">Password</Label>
                  <Input id="pw-up" type="password" autoComplete="new-password" required minLength={8}
                    value={password} onChange={e => setPassword(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Minimo 8 caratteri.</p>
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl tap-target">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {submitting ? 'Registrazione…' : 'Crea account'}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  Riceverai un'email di conferma per attivare l'account.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
