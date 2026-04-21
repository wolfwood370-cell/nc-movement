import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Client { id: string; full_name: string; date_of_birth: string | null; sex: string | null; created_at: string }

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from('clients').insert({ full_name: newName.trim(), practitioner_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Client added');
    setNewName(''); setOpen(false); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} on roster</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-1" />New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a client</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Label htmlFor="n">Full name</Label>
              <Input id="n" autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()} />
            </div>
            <DialogFooter><Button onClick={create} className="w-full tap-target">Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">Loading…</div>
      ) : clients.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No clients yet</p>
        </div>
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {clients.map(c => (
            <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between p-4 hover:bg-accent/40 tap-target">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-bold shrink-0">
                  {c.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground">Added {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
