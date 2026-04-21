import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Auth() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-elevated glow-primary">
            <Activity className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-gradient-primary">NC Movement</h1>
            <p className="text-sm text-muted-foreground mt-1">Practitioner Studio · Accedi al tuo spazio</p>
          </div>
        </div>

        <form onSubmit={submit} className="surface-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" autoComplete="current-password" required
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl tap-target">
            <LogIn className="w-4 h-4 mr-2" />
            {submitting ? 'Accesso…' : 'Accedi'}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Accesso riservato. La registrazione è disabilitata.
          </p>
        </form>
      </div>
    </div>
  );
}
