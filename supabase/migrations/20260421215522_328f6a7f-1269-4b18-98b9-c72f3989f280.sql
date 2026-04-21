-- Restrict all RLS policies to the 'authenticated' role only
-- profiles
DROP POLICY IF EXISTS "Profiles selectable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insertable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by owner" ON public.profiles;
CREATE POLICY "Profiles selectable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- clients
DROP POLICY IF EXISTS "Clients selectable by owner" ON public.clients;
DROP POLICY IF EXISTS "Clients insertable by owner" ON public.clients;
DROP POLICY IF EXISTS "Clients updatable by owner" ON public.clients;
DROP POLICY IF EXISTS "Clients deletable by owner" ON public.clients;
CREATE POLICY "Clients selectable by owner" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "Clients insertable by owner" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "Clients updatable by owner" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "Clients deletable by owner" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = practitioner_id);

-- fms_assessments
DROP POLICY IF EXISTS "FMS selectable by owner" ON public.fms_assessments;
DROP POLICY IF EXISTS "FMS insertable by owner" ON public.fms_assessments;
DROP POLICY IF EXISTS "FMS updatable by owner" ON public.fms_assessments;
DROP POLICY IF EXISTS "FMS deletable by owner" ON public.fms_assessments;
CREATE POLICY "FMS selectable by owner" ON public.fms_assessments FOR SELECT TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "FMS insertable by owner" ON public.fms_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "FMS updatable by owner" ON public.fms_assessments FOR UPDATE TO authenticated USING (auth.uid() = practitioner_id);
CREATE POLICY "FMS deletable by owner" ON public.fms_assessments FOR DELETE TO authenticated USING (auth.uid() = practitioner_id);

-- Add missing foreign keys for join queries (Dashboard select uses clients(full_name))
ALTER TABLE public.fms_assessments
  DROP CONSTRAINT IF EXISTS fms_assessments_client_id_fkey,
  ADD CONSTRAINT fms_assessments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.fms_assessments
  DROP CONSTRAINT IF EXISTS fms_assessments_practitioner_id_fkey,
  ADD CONSTRAINT fms_assessments_practitioner_id_fkey
    FOREIGN KEY (practitioner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_practitioner_id_fkey,
  ADD CONSTRAINT clients_practitioner_id_fkey
    FOREIGN KEY (practitioner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;