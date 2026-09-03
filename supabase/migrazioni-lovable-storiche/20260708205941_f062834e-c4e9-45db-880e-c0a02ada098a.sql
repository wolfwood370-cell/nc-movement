
-- 1. Private schema for authorization helpers
CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO authenticated, service_role;

-- 2. Recreate helpers in app schema
CREATE OR REPLACE FUNCTION app.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION app.has_org_access(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id) $$;

CREATE OR REPLACE FUNCTION app.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND role IN ('owner','admin')) $$;

CREATE OR REPLACE FUNCTION app.is_org_role(_user_id uuid, _org_id uuid, _role public.org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION app.current_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1 $$;

REVOKE ALL ON FUNCTION app.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.has_org_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_org_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_org_role(uuid, uuid, public.org_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.current_user_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.has_org_access(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_org_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_org_role(uuid, uuid, public.org_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.current_user_org_id() TO authenticated, service_role;

-- 3. Recreate all policies to reference app.* helpers
-- user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL
  USING (app.has_role(auth.uid(),'admin'))
  WITH CHECK (app.has_role(auth.uid(),'admin'));

-- fms_screenings
DROP POLICY IF EXISTS "Staff view all screenings" ON public.fms_screenings;
CREATE POLICY "Staff view all screenings" ON public.fms_screenings FOR SELECT
  USING (app.has_role(auth.uid(),'admin') OR app.has_role(auth.uid(),'coach'));
DROP POLICY IF EXISTS "Staff delete all screenings" ON public.fms_screenings;
CREATE POLICY "Staff delete all screenings" ON public.fms_screenings FOR DELETE
  USING (app.has_role(auth.uid(),'admin') OR app.has_role(auth.uid(),'coach'));

-- bug_reports
DROP POLICY IF EXISTS bug_reports_select_staff ON public.bug_reports;
CREATE POLICY bug_reports_select_staff ON public.bug_reports FOR SELECT
  USING (app.has_role(auth.uid(),'admin') OR app.has_role(auth.uid(),'coach'));
DROP POLICY IF EXISTS bug_reports_update_staff ON public.bug_reports;
CREATE POLICY bug_reports_update_staff ON public.bug_reports FOR UPDATE
  USING (app.has_role(auth.uid(),'admin') OR app.has_role(auth.uid(),'coach'))
  WITH CHECK (app.has_role(auth.uid(),'admin') OR app.has_role(auth.uid(),'coach'));
DROP POLICY IF EXISTS bug_reports_delete_staff ON public.bug_reports;
CREATE POLICY bug_reports_delete_staff ON public.bug_reports FOR DELETE
  USING (app.has_role(auth.uid(),'admin') OR app.has_role(auth.uid(),'coach'));

-- organizations
DROP POLICY IF EXISTS org_select_members ON public.organizations;
CREATE POLICY org_select_members ON public.organizations FOR SELECT
  USING (app.has_org_access(auth.uid(), id));
DROP POLICY IF EXISTS org_update_admins ON public.organizations;
CREATE POLICY org_update_admins ON public.organizations FOR UPDATE
  USING (app.is_org_admin(auth.uid(), id))
  WITH CHECK (app.is_org_admin(auth.uid(), id));
DROP POLICY IF EXISTS org_delete_owners ON public.organizations;
CREATE POLICY org_delete_owners ON public.organizations FOR DELETE
  USING (app.is_org_role(auth.uid(), id, 'owner'::public.org_role));

-- organization_members
DROP POLICY IF EXISTS org_members_select_same_org ON public.organization_members;
CREATE POLICY org_members_select_same_org ON public.organization_members FOR SELECT
  USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS org_members_update_admin ON public.organization_members;
CREATE POLICY org_members_update_admin ON public.organization_members FOR UPDATE
  USING (app.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (app.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS org_members_delete_admin_or_self ON public.organization_members;
CREATE POLICY org_members_delete_admin_or_self ON public.organization_members FOR DELETE
  USING (app.is_org_admin(auth.uid(), organization_id) OR auth.uid() = user_id);
DROP POLICY IF EXISTS org_members_insert_admin_only ON public.organization_members;
CREATE POLICY org_members_insert_admin_only ON public.organization_members FOR INSERT
  WITH CHECK (app.is_org_admin(auth.uid(), organization_id));

-- organization_invitations
DROP POLICY IF EXISTS org_inv_select_admin ON public.organization_invitations;
CREATE POLICY org_inv_select_admin ON public.organization_invitations FOR SELECT
  USING (app.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS org_inv_insert_admin ON public.organization_invitations;
CREATE POLICY org_inv_insert_admin ON public.organization_invitations FOR INSERT
  WITH CHECK (app.is_org_admin(auth.uid(), organization_id) AND auth.uid() = invited_by);
DROP POLICY IF EXISTS org_inv_delete_admin ON public.organization_invitations;
CREATE POLICY org_inv_delete_admin ON public.organization_invitations FOR DELETE
  USING (app.is_org_admin(auth.uid(), organization_id));

-- clients
DROP POLICY IF EXISTS clients_select_org ON public.clients;
CREATE POLICY clients_select_org ON public.clients FOR SELECT
  USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS clients_insert_org ON public.clients;
CREATE POLICY clients_insert_org ON public.clients FOR INSERT
  WITH CHECK (app.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
DROP POLICY IF EXISTS clients_update_org ON public.clients;
CREATE POLICY clients_update_org ON public.clients FOR UPDATE
  USING (app.has_org_access(auth.uid(), organization_id))
  WITH CHECK (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS clients_delete_org ON public.clients;
CREATE POLICY clients_delete_org ON public.clients FOR DELETE
  USING (app.is_org_admin(auth.uid(), organization_id));

-- fms_assessments
DROP POLICY IF EXISTS fms_select_org ON public.fms_assessments;
CREATE POLICY fms_select_org ON public.fms_assessments FOR SELECT USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS fms_insert_org ON public.fms_assessments;
CREATE POLICY fms_insert_org ON public.fms_assessments FOR INSERT WITH CHECK (app.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
DROP POLICY IF EXISTS fms_update_org ON public.fms_assessments;
CREATE POLICY fms_update_org ON public.fms_assessments FOR UPDATE USING (app.has_org_access(auth.uid(), organization_id)) WITH CHECK (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS fms_delete_org ON public.fms_assessments;
CREATE POLICY fms_delete_org ON public.fms_assessments FOR DELETE USING (app.is_org_admin(auth.uid(), organization_id));

-- sfma_assessments
DROP POLICY IF EXISTS sfma_select_org ON public.sfma_assessments;
CREATE POLICY sfma_select_org ON public.sfma_assessments FOR SELECT USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS sfma_insert_org ON public.sfma_assessments;
CREATE POLICY sfma_insert_org ON public.sfma_assessments FOR INSERT WITH CHECK (app.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
DROP POLICY IF EXISTS sfma_update_org ON public.sfma_assessments;
CREATE POLICY sfma_update_org ON public.sfma_assessments FOR UPDATE USING (app.has_org_access(auth.uid(), organization_id)) WITH CHECK (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS sfma_delete_org ON public.sfma_assessments;
CREATE POLICY sfma_delete_org ON public.sfma_assessments FOR DELETE USING (app.is_org_admin(auth.uid(), organization_id));

-- ybt_assessments
DROP POLICY IF EXISTS ybt_select_org ON public.ybt_assessments;
CREATE POLICY ybt_select_org ON public.ybt_assessments FOR SELECT USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS ybt_insert_org ON public.ybt_assessments;
CREATE POLICY ybt_insert_org ON public.ybt_assessments FOR INSERT WITH CHECK (app.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
DROP POLICY IF EXISTS ybt_update_org ON public.ybt_assessments;
CREATE POLICY ybt_update_org ON public.ybt_assessments FOR UPDATE USING (app.has_org_access(auth.uid(), organization_id)) WITH CHECK (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS ybt_delete_org ON public.ybt_assessments;
CREATE POLICY ybt_delete_org ON public.ybt_assessments FOR DELETE USING (app.is_org_admin(auth.uid(), organization_id));

-- fcs_assessments
DROP POLICY IF EXISTS fcs_select_org ON public.fcs_assessments;
CREATE POLICY fcs_select_org ON public.fcs_assessments FOR SELECT USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS fcs_insert_org ON public.fcs_assessments;
CREATE POLICY fcs_insert_org ON public.fcs_assessments FOR INSERT WITH CHECK (app.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
DROP POLICY IF EXISTS fcs_update_org ON public.fcs_assessments;
CREATE POLICY fcs_update_org ON public.fcs_assessments FOR UPDATE USING (app.has_org_access(auth.uid(), organization_id)) WITH CHECK (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS fcs_delete_org ON public.fcs_assessments;
CREATE POLICY fcs_delete_org ON public.fcs_assessments FOR DELETE USING (app.is_org_admin(auth.uid(), organization_id));

-- sessions
DROP POLICY IF EXISTS sessions_select_org ON public.sessions;
CREATE POLICY sessions_select_org ON public.sessions FOR SELECT USING (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS sessions_insert_org ON public.sessions;
CREATE POLICY sessions_insert_org ON public.sessions FOR INSERT WITH CHECK (app.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
DROP POLICY IF EXISTS sessions_update_org ON public.sessions;
CREATE POLICY sessions_update_org ON public.sessions FOR UPDATE USING (app.has_org_access(auth.uid(), organization_id)) WITH CHECK (app.has_org_access(auth.uid(), organization_id));
DROP POLICY IF EXISTS sessions_delete_org ON public.sessions;
CREATE POLICY sessions_delete_org ON public.sessions FOR DELETE USING (app.is_org_admin(auth.uid(), organization_id));

-- 4. Update table defaults to use app.current_user_org_id
ALTER TABLE public.clients          ALTER COLUMN organization_id SET DEFAULT app.current_user_org_id();
ALTER TABLE public.fms_assessments  ALTER COLUMN organization_id SET DEFAULT app.current_user_org_id();
ALTER TABLE public.sfma_assessments ALTER COLUMN organization_id SET DEFAULT app.current_user_org_id();
ALTER TABLE public.ybt_assessments  ALTER COLUMN organization_id SET DEFAULT app.current_user_org_id();
ALTER TABLE public.fcs_assessments  ALTER COLUMN organization_id SET DEFAULT app.current_user_org_id();
ALTER TABLE public.sessions         ALTER COLUMN organization_id SET DEFAULT app.current_user_org_id();

-- 5. Drop old public helpers (no longer referenced)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_org_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_org_role(uuid, uuid, public.org_role);
DROP FUNCTION IF EXISTS public.current_user_org_id();

-- 6. Drop public accept_organization_invitation RPC (moved to edge function)
DROP FUNCTION IF EXISTS public.accept_organization_invitation(uuid);
