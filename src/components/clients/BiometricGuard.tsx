import { useEffect, useState } from 'react';
import { Ruler, Scale, Footprints } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface BiometricFields {
  height_cm: number | null;
  weight_kg: number | null;
  /** Stored on the latest FCS row (clients table has no foot_length). */
  foot_length_cm?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  initial: BiometricFields;
  /** Called when biometrics are saved. Both numbers are guaranteed non-null. */
  onComplete: (next: { height_cm: number; weight_kg: number; foot_length_cm: number }) => void;
}

/**
 * Pre-flight biometric form for FCS. Required fields: height, weight, foot length.
 * Persists height/weight to `clients` and returns foot_length to the caller so
 * it can pre-fill the FCS form (foot_length lives on fcs_assessments, not clients).
 */
export default function BiometricGuard({ open, onOpenChange, clientId, initial, onComplete }: Props) {
  const [h, setH] = useState(initial.height_cm != null ? String(initial.height_cm) : '');
  const [w, setW] = useState(initial.weight_kg != null ? String(initial.weight_kg) : '');
  const [f, setF] = useState(initial.foot_length_cm != null ? String(initial.foot_length_cm) : '');
  const [busy, setBusy] = useState(false);

  // Re-sync local fields when the dialog opens with fresh `initial` values.
  useEffect(() => {
    if (!open) return;
    setH(initial.height_cm != null ? String(initial.height_cm) : '');
    setW(initial.weight_kg != null ? String(initial.weight_kg) : '');
    setF(initial.foot_length_cm != null ? String(initial.foot_length_cm) : '');
  }, [open, initial.height_cm, initial.weight_kg, initial.foot_length_cm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hN = Number(h), wN = Number(w), fN = Number(f);
    if (!hN || !wN || !fN) { toast.error('Compila tutti i campi'); return; }
    setBusy(true);
    const { error } = await supabase
      .from('clients')
      .update({ height_cm: hN, weight_kg: wN })
      .eq('id', clientId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Biometria aggiornata');
    onComplete({ height_cm: hN, weight_kg: wN, foot_length_cm: fN });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiorna biometria</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Per calcolare correttamente i target FCS servono altezza, peso e lunghezza del piede.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bg-h" className="flex items-center gap-1.5"><Ruler className="w-4 h-4" /> Altezza (cm)</Label>
            <Input id="bg-h" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bg-w" className="flex items-center gap-1.5"><Scale className="w-4 h-4" /> Peso (kg)</Label>
            <Input id="bg-w" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bg-f" className="flex items-center gap-1.5"><Footprints className="w-4 h-4" /> Piede (cm)</Label>
            <Input id="bg-f" inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl">
            {busy ? 'Salvataggio…' : 'Continua con FCS'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
