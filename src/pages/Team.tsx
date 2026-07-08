import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization, type OrgRole } from '@/hooks/useCurrentOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, UserPlus, Copy } from 'lucide-react';

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  display_name: string | null;
}

interface InviteRow {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  accepted_at: string | null;
  created_at: string;
}

export default function Team() {
  const { data: org, isLoading: orgLoading } = useCurrentOrganization();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');

  const canAdmin = org?.role === 'owner' || org?.role === 'admin';

  const membersQuery = useQuery({
    queryKey: ['org-members', org?.id],
    enabled: !!org?.id,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, created_at')
        .eq('organization_id', org!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = (data ?? []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]));
      return (data ?? []).map(m => ({ ...m, display_name: nameMap.get(m.user_id) ?? null })) as MemberRow[];
    },
  });

  const invitesQuery = useQuery({
    queryKey: ['org-invites', org?.id],
    enabled: !!org?.id && canAdmin,
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('id, email, role, token, accepted_at, created_at')
        .eq('organization_id', org!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error('No organization');
      if (!inviteEmail.trim()) throw new Error('Email required');
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('organization_invitations').insert({
        organization_id: org.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invito creato');
      setInviteEmail('');
      qc.invalidateQueries({ queryKey: ['org-invites', org?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Membro rimosso');
      qc.invalidateQueries({ queryKey: ['org-members', org?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organization_invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invito revocato');
      qc.invalidateQueries({ queryKey: ['org-invites', org?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiato');
  };

  if (orgLoading) return <div className="p-4">Caricamento…</div>;
  if (!org) return <div className="p-4">Nessuna organizzazione trovata.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">{org.name}</h1>
        <p className="text-sm text-muted-foreground">
          Piano: <Badge variant="secondary">{org.plan}</Badge> · Tuo ruolo: <Badge>{org.role}</Badge>
        </p>
      </div>

      {canAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invita un membro</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="email@studio.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as OrgRole)}>
                <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => invite.mutate()} disabled={invite.isPending}>
                <UserPlus className="w-4 h-4 mr-1" /> Invita
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Membri</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {membersQuery.data?.map(m => (
            <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <div className="font-medium">{m.display_name ?? m.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">
                  Dal {new Date(m.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'owner' ? 'default' : 'outline'}>{m.role}</Badge>
                {canAdmin && m.role !== 'owner' && (
                  <Button size="icon" variant="ghost" onClick={() => removeMember.mutate(m.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canAdmin && invitesQuery.data && invitesQuery.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Inviti pendenti</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invitesQuery.data.map(inv => (
              <div key={inv.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium text-sm">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.accepted_at ? 'Accettato' : 'In attesa'} · {inv.role}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => copyInviteLink(inv.token)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => revokeInvite.mutate(inv.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
