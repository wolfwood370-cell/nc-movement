import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import fmsLogo from '@/assets/test-logos/fms.png';
import sfmaLogo from '@/assets/test-logos/sfma.png';
import ybtLogo from '@/assets/test-logos/ybt.png';
import fcsLogo from '@/assets/test-logos/fcs.png';

const tests = [
  { key: 'fms',  label: 'FMS — Functional Movement Screen', logo: fmsLogo,  ready: true },
  { key: 'sfma', label: 'SFMA — Selective Functional Movement Assessment', logo: sfmaLogo, ready: true },
  { key: 'fcs',  label: 'FCS — Fundamental Capacity Screen', logo: fcsLogo,  ready: true },
  { key: 'ybt',  label: 'YBT — Y-Balance Test', logo: ybtLogo,  ready: true },
];

export default function Assessments() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground tap-target">
        <ChevronLeft className="w-4 h-4" /> Indietro
      </button>
      <header>
        <h1 className="font-display font-bold text-2xl">Valutazioni</h1>
        <p className="text-sm text-muted-foreground">Scegli un test e parti dal profilo cliente.</p>
      </header>
      <div className="space-y-3">
        {tests.map(t => (
          <Link
            key={t.key}
            to={t.ready ? '/clients' : '#'}
            className={`surface-card p-4 flex items-center gap-4 tap-target ${t.ready ? 'hover:shadow-elevated' : 'opacity-60'}`}
          >
            <div className="h-11 w-24 grid place-items-center shrink-0">
              <img src={t.logo} alt={`${t.label} logo`} className="max-h-11 max-w-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold">{t.label}</div>
              <div className="text-xs text-muted-foreground">
                {t.ready ? 'Scegli un cliente per iniziare.' : 'Modulo in arrivo.'}
              </div>
            </div>
            {!t.ready && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">presto</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
