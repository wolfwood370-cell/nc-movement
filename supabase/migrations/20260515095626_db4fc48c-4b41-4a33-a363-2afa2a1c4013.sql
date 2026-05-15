CREATE OR REPLACE FUNCTION public.enforce_allowed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) <> 'nctrainingsystems@gmail.com' THEN
    RAISE EXCEPTION 'Email non autorizzata ad accedere a questa piattaforma.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_allowed_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_allowed_email_trigger ON auth.users;
CREATE TRIGGER enforce_allowed_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_allowed_email();

-- Remove any existing accounts that don't match the allowlist
DELETE FROM auth.users WHERE lower(email) <> 'nctrainingsystems@gmail.com';