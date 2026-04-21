import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split('@')[0] },
          },
        });
        if (error) throw error;
        toast.success('Account creato. Sei dentro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Bentornato.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Autenticazione fallita');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-elevated glow-primary">
            <Activity className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl text-gradient-primary">NC Movement</h1>
            <p className="text-sm text-muted-foreground mt-1">Studio di valutazione per clinici e coach.</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-5 shadow-card">
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                  mode === m ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground'
                }`}
              >
                {m === 'signin' ? 'Accedi' : 'Crea account'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome visualizzato</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Dott. Rossi" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full tap-target" disabled={busy}>
              {busy ? 'Attendere…' : mode === 'signin' ? 'Accedi' : 'Crea account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Per professionisti del fitness e clinici.
        </p>
      </div>
    </div>
  );
}
