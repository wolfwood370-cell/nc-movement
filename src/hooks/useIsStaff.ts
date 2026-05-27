import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/** Server-checked role guard. Returns true if current user has admin/coach role. */
export function useIsStaff() {
  const { user, loading: authLoading } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsStaff(false); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'coach']);
      if (!cancelled) {
        setIsStaff((data?.length ?? 0) > 0);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isStaff, loading };
}
