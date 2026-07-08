
-- Revoke public execute on new SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_org_access(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_role(UUID, UUID, public.org_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_organization() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_org_access(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_role(UUID, UUID, public.org_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO authenticated, service_role;

-- Helper: current user's first (primary) organization
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated, service_role;

-- Set as default on data tables so client inserts without organization_id succeed
ALTER TABLE public.clients          ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.fms_assessments  ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.sfma_assessments ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.ybt_assessments  ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.fcs_assessments  ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.sessions         ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
