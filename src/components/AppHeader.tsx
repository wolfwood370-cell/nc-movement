import { useNavigate } from 'react-router-dom';
import { Bug, LogOut, Users2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsStaff } from '@/hooks/useIsStaff';
import { toast } from 'sonner';
import logoUrl from '@/assets/nc-movement-logo.png';

/**
 * L'intestazione da 56px: logo a sinistra; team, segnalazioni bug (solo staff) ed esci
 * a destra. Sono azioni sull'account, non navigazione, e stanno qui in entrambe le
 * cornici (telefono e scrivania) senza essere ricopiate. Estratta da AppShell.tsx
 * senza cambiare una classe.
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isStaff } = useIsStaff();

  const onSignOut = async () => {
    await signOut();
    toast.success('Disconnesso');
    navigate('/auth', { replace: true });
  };

  return (
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
  );
}
