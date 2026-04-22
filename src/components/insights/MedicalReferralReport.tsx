import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { calcAge } from '@/lib/insights';
import { buildReferralData } from '@/lib/medicalReferral';
import type { FmsScores } from '@/lib/fms';
import type { SfmaFormValues } from '@/lib/sfma';

interface ClientLite {
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  primary_sport: string | null;
}

interface PractitionerLite {
  display_name?: string | null;
  professional_title?: string | null;
}

interface FmsRow extends Partial<FmsScores> {
  assessed_at?: string;
}
interface YbtRow {
  assessed_at?: string;
  anterior_left_cm: number | null;
  anterior_right_cm: number | null;
}
interface SfmaRow extends Partial<SfmaFormValues> {
  assessed_at?: string;
  breakout_results?: unknown;
}

interface Props {
  open: boolean;
  onClose: () => void;
  client: ClientLite;
  practitioner?: PractitionerLite | null;
  fms: FmsRow | null;
  ybt: YbtRow | null;
  sfma: SfmaRow | null;
  /** Auto-trigger window.print() once the dialog is open. */
  autoPrint?: boolean;
}

export default function MedicalReferralReport({
  open, onClose, client, practitioner, fms, ybt, sfma, autoPrint,
}: Props) {
  const data = buildReferralData(fms, ybt, sfma);
  const age = calcAge(client.date_of_birth);
  const today = new Date().toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const lastEval = data.lastAssessedAt
    ? new Date(data.lastAssessedAt).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  useEffect(() => {
    if (open && autoPrint) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [open, autoPrint]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden print:!max-w-none print:!p-0 print:!shadow-none print:!border-0 print:!rounded-none">
        {/* Toolbar (hidden on print) */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-card print:hidden">
          <div className="text-sm font-medium">Referto per Rinvio Medico</div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()} className="tap-target">
              <Printer className="w-4 h-4 mr-1.5" /> Stampa / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="tap-target">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable area */}
        <article
          id="medical-referral-print"
          className="bg-white text-black p-8 sm:p-10 max-h-[80vh] overflow-y-auto print:overflow-visible print:max-h-none print:p-12"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {/* Header */}
          <header className="border-b-2 border-black pb-4 mb-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight uppercase">
                  Referto Funzionale
                </h1>
                <p className="text-xs uppercase tracking-widest text-neutral-600 mt-1">
                  Rinvio per valutazione medica
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold uppercase tracking-wide">
                  {practitioner?.display_name || 'Studio Funzionale'}
                </div>
                {practitioner?.professional_title && (
                  <div className="text-neutral-600">{practitioner.professional_title}</div>
                )}
                <div className="text-neutral-600 mt-1">Data referto: {today}</div>
              </div>
            </div>
          </header>

          {/* Client block */}
          <section className="mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Paziente" value={client.full_name} />
            <Field label="Data ultima valutazione" value={lastEval} />
            <Field label="Età" value={age != null ? `${age} anni` : '—'} />
            <Field label="Sesso" value={genderIt(client.gender)} />
            <Field label="Sport principale" value={client.primary_sport || '—'} />
            <Field label="Data del referto" value={today} />
          </section>

          {/* Findings */}
          <section className="space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-400 pb-1">
              Reperti Clinici
            </h2>

            {!data.hasFindings && (
              <p className="text-sm italic text-neutral-700">
                Nessun reperto critico rilevato nelle valutazioni più recenti. Il presente
                documento attesta l'assenza di segnali di allarme funzionali al momento dell'esame.
              </p>
            )}

            {data.fms.length > 0 && (
              <FindingsBlock title="FMS — Pattern Dolorosi (Punteggio 0)">
                {data.fms.map((f, i) => (
                  <li key={i}>{f.description}</li>
                ))}
              </FindingsBlock>
            )}

            {data.clearing.length > 0 && (
              <FindingsBlock title="Test di Esclusione Positivi">
                {data.clearing.map((c, i) => (
                  <li key={i}>{c.description}</li>
                ))}
              </FindingsBlock>
            )}

            {data.sfma.length > 0 && (
              <FindingsBlock title="SFMA Top-Tier — Pattern Dolorosi">
                {data.sfma.map((s, i) => (
                  <li key={i}>{s.description}</li>
                ))}
              </FindingsBlock>
            )}

            {data.breakouts.length > 0 && (
              <FindingsBlock title="SFMA Breakout — Diagnosi Funzionali">
                {data.breakouts.map((b, i) => (
                  <li key={i}>
                    <span className="font-semibold">{b.full} ({b.diagnosis})</span>
                    {' '}— {b.pattern}
                    {b.qualifier && <span className="text-neutral-700"> · {b.qualifier}</span>}
                    {b.detail && <div className="text-neutral-700 mt-0.5">{b.detail}</div>}
                  </li>
                ))}
              </FindingsBlock>
            )}

            {data.ybt.length > 0 && (
              <FindingsBlock title="Y-Balance Test — Asimmetrie Critiche">
                {data.ybt.map((y, i) => (
                  <li key={i}>{y.description}</li>
                ))}
              </FindingsBlock>
            )}
          </section>

          {/* Recommendation */}
          <section className="mt-8 text-sm leading-relaxed">
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-400 pb-1 mb-3">
              Raccomandazione
            </h2>
            <p>
              Sulla base dei reperti sopra elencati, si richiede{' '}
              <strong>valutazione medica specialistica</strong> a scopo di inquadramento
              diagnostico e indicazioni terapeutiche, prima di proseguire con la
              programmazione di carichi di allenamento o test di capacità avanzati.
              Il sottoscritto resta a disposizione per ulteriori chiarimenti e per
              l'integrazione del piano riabilitativo con il percorso clinico.
            </p>
          </section>

          {/* Signature */}
          <footer className="mt-12 pt-6 grid grid-cols-2 gap-12 text-sm">
            <div>
              <div className="border-t border-black pt-1 text-xs uppercase tracking-widest text-neutral-600">
                Luogo e data
              </div>
              <div className="mt-1">________________________, {today}</div>
            </div>
            <div>
              <div className="border-t border-black pt-1 text-xs uppercase tracking-widest text-neutral-600">
                Firma del professionista
              </div>
              <div className="mt-6 italic text-neutral-700">
                {practitioner?.display_name || '_________________________________'}
              </div>
            </div>
          </footer>
        </article>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-600">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function FindingsBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-1.5">{title}</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm">{children}</ul>
    </div>
  );
}

function genderIt(g: string | null): string {
  if (g === 'male') return 'Maschile';
  if (g === 'female') return 'Femminile';
  if (g === 'other') return 'Altro';
  return '—';
}
