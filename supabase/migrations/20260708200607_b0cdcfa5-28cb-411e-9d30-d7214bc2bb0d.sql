
GRANT EXECUTE ON FUNCTION public.has_org_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_role(uuid, uuid, public.org_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
