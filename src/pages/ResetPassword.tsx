import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash automatically and emits PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    // Also handle case where the session is already established when the page loads.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('La password deve essere di almeno 8 caratteri.'); return; }
    if (password !== confirm) { toast.error('Le password non coincidono.'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password aggiornata. Effettua il login.');
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-elevated glow-primary">
            <Activity className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-primary">Reimposta password</h1>
            <p className="text-sm text-muted-foreground mt-1">Scegli una nuova password sicura</p>
          </div>
        </div>

        <form onSubmit={submit} className="surface-card p-6 space-y-4">
          {!ready && (
            <p className="text-xs text-muted-foreground">
              Apri questa pagina dal link che hai ricevuto via email per continuare.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="pw">Nuova password</Label>
            <Input id="pw" type="password" autoComplete="new-password" required minLength={8}
              value={password} onChange={e => setPassword(e.target.value)} disabled={!ready} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Conferma password</Label>
            <Input id="pw2" type="password" autoComplete="new-password" required minLength={8}
              value={confirm} onChange={e => setConfirm(e.target.value)} disabled={!ready} />
          </div>
          <Button type="submit" disabled={submitting || !ready} className="w-full h-12 rounded-xl tap-target">
            <KeyRound className="w-4 h-4 mr-2" />
            {submitting ? 'Aggiornamento…' : 'Aggiorna password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
