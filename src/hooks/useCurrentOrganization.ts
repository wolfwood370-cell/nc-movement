import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type OrgRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  created_by: string;
  created_at: string;
  role: OrgRole;
}

/**
 * Returns the current user's primary organization (oldest membership).
 * Used to scope UI and let admins access the Team page.
 */
export function useCurrentOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-organization', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Organization | null> => {
      const { data: membership, error: mErr } = await supabase
        .from('organization_members')
        .select('role, organization_id, created_at, organizations!inner(id, name, slug, plan, created_by, created_at)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (mErr) throw mErr;
      if (!membership) return null;

      const org = membership.organizations as unknown as {
        id: string; name: string; slug: string | null; plan: string; created_by: string; created_at: string;
      };
      return { ...org, role: membership.role as OrgRole };
    },
  });
}
