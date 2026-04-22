import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  clientName: string;
  /** When true, the dialog navigates back to /clients after deletion. */
  navigateAfter?: boolean;
  onDeleted?: () => void;
}

export default function DeleteClientDialog({ clientId, clientName, navigateAfter, onDeleted }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Cliente eliminato');
    setOpen(false);
    if (navigateAfter) navigate('/clients', { replace: true });
    onDeleted?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4 mr-1.5" /> Elimina
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {clientName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tutte le valutazioni FMS, FCS, SFMA e YBT del cliente verranno cancellate definitivamente.
            L'operazione è irreversibile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); void remove(); }}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? 'Eliminazione…' : 'Elimina cliente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
