import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ClientForm, { type ClientFormValues } from './ClientForm';

interface InitialClient {
  id: string;
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  primary_sport: string | null;
  competition_level: string | null;
}

export default function EditClientDialog({
  client, onSaved,
}: { client: InitialClient; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const initial: Partial<ClientFormValues> = {
    full_name: client.full_name ?? '',
    email: client.email ?? '',
    date_of_birth: client.date_of_birth ?? '',
    gender: (client.gender as ClientFormValues['gender']) ?? '',
    height_cm: client.height_cm != null ? String(client.height_cm) : '',
    weight_kg: client.weight_kg != null ? String(client.weight_kg) : '',
    primary_sport: client.primary_sport ?? '',
    competition_level: (client.competition_level as ClientFormValues['competition_level']) ?? '',
  };

  const submit = async (v: ClientFormValues) => {
    setBusy(true);
    const { error } = await supabase
      .from('clients')
      .update({
        full_name: v.full_name.trim(),
        email: v.email.trim() || null,
        date_of_birth: v.date_of_birth || null,
        gender: v.gender || null,
        height_cm: v.height_cm ? Number(v.height_cm) : null,
        weight_kg: v.weight_kg ? Number(v.weight_kg) : null,
        primary_sport: v.primary_sport.trim() || null,
        competition_level: v.competition_level || null,
      })
      .eq('id', client.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Cliente aggiornato');
    setOpen(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Pencil className="w-4 h-4 mr-1.5" /> Modifica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifica cliente</DialogTitle></DialogHeader>
        {/* Re-mount the form on each open so it picks up the latest `client` snapshot. */}
        <ClientForm key={open ? 'open' : 'closed'} initial={initial} onSubmit={submit} submitting={busy} submitLabel="Salva modifiche" />
      </DialogContent>
    </Dialog>
  );
}
