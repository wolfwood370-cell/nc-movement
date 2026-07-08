import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, Bug, Users, LayoutDashboard, LogOut, Library, Users2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsStaff } from '@/hooks/useIsStaff';
import { toast } from 'sonner';
import logoUrl from '@/assets/nc-movement-logo.png';
import PhoneShell from '@/components/PhoneShell';

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clienti', icon: Users, end: false },
  { to: '/assessments', label: 'Test', icon: Activity, end: false },
  { to: '/library', label: 'Libreria', icon: Library, end: false },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isStaff } = useIsStaff();

  const onSignOut = async () => {
    await signOut();
    toast.success('Disconnesso');
    navigate('/auth', { replace: true });
  };

  return (
    <PhoneShell>
      {/* Header 56px */}
      <header className="h-14 shrink-0 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="h-full px-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-white border border-border">
              <img
                src={logoUrl}
                alt="NC Movement logo"
                width={36}
                height={36}
                className="w-full h-full object-cover object-center scale-[1.2]"
              />
            </div>
            <div className="text-left leading-tight">
              <div className="font-display font-bold text-sm text-primary tracking-tight">NC MOVEMENT</div>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/team')}
              className="text-muted-foreground hover:text-foreground p-2 rounded-lg transition-colors"
              aria-label="Team">
              <Users2 className="w-4 h-4" />
            </button>
            {isStaff && (
              <button onClick={() => navigate('/admin/bugs')}
                className="text-muted-foreground hover:text-foreground p-2 rounded-lg transition-colors"
                aria-label="Segnalazioni Bug">
                <Bug className="w-4 h-4" />
              </button>
            )}
            <button onClick={onSignOut}
              className="text-muted-foreground hover:text-foreground p-2 rounded-lg transition-colors"
              aria-label="Esci">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 animate-fade-in scrollbar-none">
        {children}
      </main>

      {/* BottomNav 66px */}
      <nav className="h-[66px] shrink-0 border-t border-border bg-card/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-full">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-[color,opacity] active:opacity-50 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <t.icon className="w-5 h-5" strokeWidth={2.25} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </PhoneShell>
  );
}
