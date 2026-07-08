import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoFms from '@/assets/logo-fms.webp';
import logoSfma from '@/assets/logo-sfma.webp';
import logoFcs from '@/assets/logo-fcs.webp';
import logoYbt from '@/assets/logo-ybt.webp';

interface TestItem {
  key: string;
  label: string;
  desc: string;
  logo: string;
  primary: boolean;
}

const tests: TestItem[] = [
  { key: 'fms',  label: 'FMS',  desc: 'Functional Movement Screen · 7 pattern',       logo: logoFms,  primary: true  },
  { key: 'sfma', label: 'SFMA', desc: 'Selective Functional Movement · in profilo',   logo: logoSfma, primary: false },
  { key: 'ybt',  label: 'YBT',  desc: 'Y-Balance Test · in profilo',                  logo: logoYbt,  primary: false },
  { key: 'fcs',  label: 'FCS',  desc: 'Fundamental Capacity Screen · in profilo',     logo: logoFcs,  primary: false },
];

/**
 * Test picker (route /assessments): FMS in evidenza (bordo/glow rosso + pill "Avvia"),
 * gli altri come card informative con chevron. Tutti puntano a /clients per la selezione
 * del cliente da cui partire (o alla scheda cliente per SFMA/YBT/FCS che vivono nel profilo).
 */
export default function Assessments() {
  return (
    <div className="space-y-4">
      <header className="pt-1">
        <h1 className="font-display font-bold text-[26px] leading-none tracking-tight">Valutazioni</h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">Scegli un test e parti dal profilo cliente.</p>
      </header>

      <div className="space-y-2.5">
        {tests.map(t => (
          <Link
            key={t.key}
            to={t.key === 'fms' ? '/assessments/fms/setup' : '/clients'}
            className={
              t.primary
                ? 'bg-card rounded-card border-2 border-primary shadow-cta card-interactive flex items-center gap-3 p-3.5'
                : 'surface-card card-interactive flex items-center gap-3 p-3.5'
            }
          >
            <img src={t.logo} alt="" className="w-11 h-11 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[15px] leading-tight">{t.label}</div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.desc}</div>
            </div>
            {t.primary ? (
              <Button
                size="sm"
                className="rounded-full h-8 px-3.5 text-[12px] shadow-cta shrink-0 pointer-events-none"
              >
                Avvia
              </Button>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
