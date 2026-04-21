import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ClientFormValues {
  full_name: string;
  email: string;
  date_of_birth: string;
  gender: '' | 'male' | 'female' | 'other';
  height_cm: string;
  weight_kg: string;
  primary_sport: string;
  competition_level: '' | 'recreational' | 'amateur' | 'pro';
}

export const emptyClient = (): ClientFormValues => ({
  full_name: '', email: '', date_of_birth: '', gender: '',
  height_cm: '', weight_kg: '', primary_sport: '', competition_level: '',
});

export default function ClientForm({
  initial, submitLabel = 'Salva', onSubmit, submitting,
}: {
  initial?: Partial<ClientFormValues>;
  submitLabel?: string;
  onSubmit: (v: ClientFormValues) => void | Promise<void>;
  submitting?: boolean;
}) {
  const [v, setV] = useState<ClientFormValues>({ ...emptyClient(), ...initial });
  const set = <K extends keyof ClientFormValues>(k: K, val: ClientFormValues[K]) =>
    setV(p => ({ ...p, [k]: val }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (v.full_name.trim()) onSubmit(v); }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="fn">Nome completo *</Label>
        <Input id="fn" autoFocus value={v.full_name} onChange={e => set('full_name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="em">Email</Label>
          <Input id="em" type="email" value={v.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Data di nascita</Label>
          <Input id="dob" type="date" value={v.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Genere</Label>
          <Select value={v.gender || undefined} onValueChange={(val) => set('gender', val as ClientFormValues['gender'])}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Maschio</SelectItem>
              <SelectItem value="female">Femmina</SelectItem>
              <SelectItem value="other">Altro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="h">Altezza (cm)</Label>
          <Input id="h" type="number" inputMode="decimal" step="0.1" value={v.height_cm}
            onChange={e => set('height_cm', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="w">Peso (kg)</Label>
          <Input id="w" type="number" inputMode="decimal" step="0.1" value={v.weight_kg}
            onChange={e => set('weight_kg', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="sp">Sport principale</Label>
          <Input id="sp" value={v.primary_sport} onChange={e => set('primary_sport', e.target.value)}
            placeholder="Es. Calcio" />
        </div>
        <div className="space-y-2">
          <Label>Livello</Label>
          <Select value={v.competition_level || undefined}
            onValueChange={(val) => set('competition_level', val as ClientFormValues['competition_level'])}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recreational">Amatoriale</SelectItem>
              <SelectItem value="amateur">Agonista</SelectItem>
              <SelectItem value="pro">Professionista</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={submitting || !v.full_name.trim()} className="w-full tap-target h-12 rounded-xl">
        {submitting ? 'Salvataggio…' : submitLabel}
      </Button>
    </form>
  );
}

/** Convert form values to a DB-shaped insert payload. */
export function toClientPayload(v: ClientFormValues, practitioner_id: string) {
  return {
    practitioner_id,
    full_name: v.full_name.trim(),
    email: v.email.trim() || null,
    date_of_birth: v.date_of_birth || null,
    gender: v.gender || null,
    height_cm: v.height_cm ? Number(v.height_cm) : null,
    weight_kg: v.weight_kg ? Number(v.weight_kg) : null,
    primary_sport: v.primary_sport.trim() || null,
    competition_level: v.competition_level || null,
  };
}
