import { useState, type MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type AssessmentTable = 'fms_assessments' | 'fcs_assessments' | 'sfma_assessments' | 'ybt_assessments';

interface Props {
  table: AssessmentTable;
  id: string;
  label?: string;
  onDeleted?: () => void;
}

const TABLE_LABEL: Record<AssessmentTable, string> = {
  fms_assessments: 'FMS',
  fcs_assessments: 'FCS',
  sfma_assessments: 'SFMA',
  ybt_assessments: 'YBT',
};

/** Compact icon-only delete control safe to render inside <Link> rows.
 *  Stops the parent click and opens an AlertDialog for confirmation. */
export default function DeleteAssessmentButton({ table, id, label, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const stop = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq('id', id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${TABLE_LABEL[table]} eliminata`);
    setOpen(false);
    onDeleted?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          // Let Radix toggle `open` via the trigger; we only stop the click
          // from bubbling to the parent <Link>.
          onClick={stop}
          aria-label="Elimina valutazione"
          className="tap-target h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare la valutazione {TABLE_LABEL[table]}?</AlertDialogTitle>
          <AlertDialogDescription>
            {label ? `${label} · ` : ''}L'operazione è irreversibile e i dati storici non saranno più recuperabili.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { stop(e); void remove(); }}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? 'Eliminazione…' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
