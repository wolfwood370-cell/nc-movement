import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, Users, LayoutDashboard, LogOut, Library } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logoUrl from '@/assets/logo.png';

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clienti', icon: Users, end: false },
  { to: '/assessments', label: 'Test', icon: Activity, end: false },
  { to: '/library', label: 'Libreria', icon: Library, end: false },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const onSignOut = async () => {
    await signOut();
    toast.success('Disconnesso');
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 glass-card border-b border-border rounded-none">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <img
              src={logoUrl}
              alt="NC Movement logo"
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl shadow-elevated object-cover"
            />
            <div className="text-left leading-tight">
              <div className="font-display font-bold text-sm text-primary">NC Personal Trainer</div>
            </div>
          </button>
          <button onClick={onSignOut}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg tap-target"
            aria-label="Esci">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-4 pb-28 animate-fade-in">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 glass-card border-t border-border rounded-none pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors tap-target ${
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
    </div>
  );
}
