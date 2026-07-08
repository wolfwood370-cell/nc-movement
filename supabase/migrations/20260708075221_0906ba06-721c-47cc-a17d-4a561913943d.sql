
-- ============================================================
-- FASE 1: MULTI-TENANCY FOUNDATION
-- ============================================================

-- 1. Enum for org member roles
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

-- 2. organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. organization_invitations table
CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY DEFINER helpers
CREATE OR REPLACE FUNCTION public.has_org_access(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_role(_user_id UUID, _org_id UUID, _role public.org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
  )
$$;

-- 6. RLS policies for organizations
CREATE POLICY "org_select_members" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.has_org_access(auth.uid(), id));

CREATE POLICY "org_insert_authenticated" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "org_update_admins" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id))
  WITH CHECK (public.is_org_admin(auth.uid(), id));

CREATE POLICY "org_delete_owners" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_org_role(auth.uid(), id, 'owner'));

-- 7. RLS policies for organization_members
CREATE POLICY "org_members_select_same_org" ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.has_org_access(auth.uid(), organization_id));

CREATE POLICY "org_members_insert_admin" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Owner bootstrap allowed via trigger; from client only admins can add members
    public.is_org_admin(auth.uid(), organization_id)
    OR auth.uid() = user_id -- self-join via accepted invite (checked at invite acceptance)
  );

CREATE POLICY "org_members_update_admin" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "org_members_delete_admin_or_self" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR auth.uid() = user_id
  );

-- 8. RLS policies for organization_invitations
CREATE POLICY "org_inv_select_admin" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "org_inv_insert_admin" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    AND auth.uid() = invited_by
  );

CREATE POLICY "org_inv_delete_admin" ON public.organization_invitations
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- 9. Updated-at triggers
CREATE TRIGGER trg_org_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Add organization_id to existing data tables
ALTER TABLE public.clients            ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.fms_assessments    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sfma_assessments   ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ybt_assessments    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.fcs_assessments    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sessions           ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 11. Backfill: create a Personal Workspace for each existing practitioner with data
DO $$
DECLARE
  r RECORD;
  v_org_id UUID;
  v_display TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT practitioner_id AS uid FROM public.clients
    UNION
    SELECT DISTINCT practitioner_id FROM public.fms_assessments
    UNION
    SELECT DISTINCT practitioner_id FROM public.sfma_assessments
    UNION
    SELECT DISTINCT practitioner_id FROM public.ybt_assessments
    UNION
    SELECT DISTINCT practitioner_id FROM public.fcs_assessments
    UNION
    SELECT DISTINCT practitioner_id FROM public.sessions
  LOOP
    IF r.uid IS NULL THEN CONTINUE; END IF;

    SELECT COALESCE(display_name, 'Personal') INTO v_display
      FROM public.profiles WHERE id = r.uid;

    INSERT INTO public.organizations (name, plan, created_by)
    VALUES (COALESCE(v_display, 'Personal') || ' Workspace', 'free', r.uid)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, r.uid, 'owner')
    ON CONFLICT DO NOTHING;

    UPDATE public.clients          SET organization_id = v_org_id WHERE practitioner_id = r.uid AND organization_id IS NULL;
    UPDATE public.fms_assessments  SET organization_id = v_org_id WHERE practitioner_id = r.uid AND organization_id IS NULL;
    UPDATE public.sfma_assessments SET organization_id = v_org_id WHERE practitioner_id = r.uid AND organization_id IS NULL;
    UPDATE public.ybt_assessments  SET organization_id = v_org_id WHERE practitioner_id = r.uid AND organization_id IS NULL;
    UPDATE public.fcs_assessments  SET organization_id = v_org_id WHERE practitioner_id = r.uid AND organization_id IS NULL;
    UPDATE public.sessions         SET organization_id = v_org_id WHERE practitioner_id = r.uid AND organization_id IS NULL;
  END LOOP;
END $$;

-- 12. NOT NULL enforcement
ALTER TABLE public.clients          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.fms_assessments  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.sfma_assessments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ybt_assessments  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.fcs_assessments  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.sessions         ALTER COLUMN organization_id SET NOT NULL;

-- 13. Indexes
CREATE INDEX idx_clients_org         ON public.clients(organization_id);
CREATE INDEX idx_fms_org             ON public.fms_assessments(organization_id);
CREATE INDEX idx_sfma_org            ON public.sfma_assessments(organization_id);
CREATE INDEX idx_ybt_org             ON public.ybt_assessments(organization_id);
CREATE INDEX idx_fcs_org             ON public.fcs_assessments(organization_id);
CREATE INDEX idx_sessions_org        ON public.sessions(organization_id);

-- 14. Additive RLS: allow org members access alongside practitioner_id ownership
CREATE POLICY "clients_select_org" ON public.clients
  FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "clients_insert_org" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
CREATE POLICY "clients_update_org" ON public.clients
  FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organization_id))
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "clients_delete_org" ON public.clients
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "fms_select_org" ON public.fms_assessments
  FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "fms_insert_org" ON public.fms_assessments
  FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
CREATE POLICY "fms_update_org" ON public.fms_assessments
  FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organization_id))
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "fms_delete_org" ON public.fms_assessments
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "sfma_select_org" ON public.sfma_assessments
  FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "sfma_insert_org" ON public.sfma_assessments
  FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
CREATE POLICY "sfma_update_org" ON public.sfma_assessments
  FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organization_id))
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "sfma_delete_org" ON public.sfma_assessments
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "ybt_select_org" ON public.ybt_assessments
  FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "ybt_insert_org" ON public.ybt_assessments
  FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
CREATE POLICY "ybt_update_org" ON public.ybt_assessments
  FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organization_id))
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "ybt_delete_org" ON public.ybt_assessments
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "fcs_select_org" ON public.fcs_assessments
  FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "fcs_insert_org" ON public.fcs_assessments
  FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
CREATE POLICY "fcs_update_org" ON public.fcs_assessments
  FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organization_id))
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "fcs_delete_org" ON public.fcs_assessments
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "sessions_select_org" ON public.sessions
  FOR SELECT TO authenticated USING (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "sessions_insert_org" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (public.has_org_access(auth.uid(), organization_id) AND auth.uid() = practitioner_id);
CREATE POLICY "sessions_update_org" ON public.sessions
  FOR UPDATE TO authenticated USING (public.has_org_access(auth.uid(), organization_id))
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));
CREATE POLICY "sessions_delete_org" ON public.sessions
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));

-- 15. Auto-create Personal Workspace on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_display TEXT;
BEGIN
  v_display := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.organizations (name, plan, created_by)
  VALUES (COALESCE(v_display, 'Personal') || ' Workspace', 'free', NEW.id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_organization();
