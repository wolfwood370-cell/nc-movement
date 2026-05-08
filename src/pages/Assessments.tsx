import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import logoFms from '@/assets/logo-fms.png';
import logoSfma from '@/assets/logo-sfma.png';
import logoFcs from '@/assets/logo-fcs.png';
import logoYbt from '@/assets/logo-ybt.png';

const tests = [
  { key: 'fms',  label: 'FMS — Functional Movement Screen', logo: logoFms, ready: true },
  { key: 'sfma', label: 'SFMA — Selective Functional Movement Assessment', logo: logoSfma, ready: true },
  { key: 'fcs',  label: 'FCS — Fundamental Capacity Screen', logo: logoFcs, ready: true },
  { key: 'ybt',  label: 'YBT — Y-Balance Test', logo: logoYbt, ready: true },
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
            <div className="w-14 h-14 rounded-xl bg-background border border-border grid place-items-center overflow-hidden shrink-0">
              <img src={t.logo} alt={`${t.key.toUpperCase()} logo`} className="w-full h-full object-contain p-1.5" />
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
