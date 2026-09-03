
-- 1. Fix privilege escalation on organization_members
DROP POLICY IF EXISTS org_members_insert_admin ON public.organization_members;
CREATE POLICY org_members_insert_admin_only ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- 2. Secure invitation acceptance flow
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.organization_invitations%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_inv FROM public.organization_invitations WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation not found' USING ERRCODE = '42704';
  END IF;

  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation already accepted' USING ERRCODE = '42501';
  END IF;

  IF lower(v_inv.email) <> lower(coalesce(v_email, '')) THEN
    RAISE EXCEPTION 'invitation email does not match signed-in user' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_inv.organization_id, auth.uid(), v_inv.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_invitations SET accepted_at = now() WHERE id = v_inv.id;

  RETURN v_inv.organization_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;

-- 3. Allow invitees to see their own pending invitation (read-only)
CREATE POLICY org_inv_select_invitee ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), '')));

-- 4. Revoke direct EXECUTE on internal SECURITY DEFINER helpers (still usable inside RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_org_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_role(uuid, uuid, public.org_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon, authenticated;
