-- =============================================================================
-- Unique 6-digit member codes for every Ro-School account
-- Run this entire script in Supabase → SQL Editor → Run
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_member_code
  ON public.profiles (member_code)
  WHERE member_code IS NOT NULL;

COMMENT ON COLUMN public.profiles.member_code IS
  'Permanent unique 6-digit account code (100000–999999)';

CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    candidate := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE member_code = candidate
    );
    attempts := attempts + 1;
    IF attempts > 200 THEN
      RAISE EXCEPTION 'Could not generate unique member_code';
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Assign code to a specific user; returns the code
CREATE OR REPLACE FUNCTION public.ensure_member_code_for(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing TEXT;
  generated TEXT;
BEGIN
  SELECT member_code INTO existing
  FROM public.profiles
  WHERE id = p_user_id;

  IF existing IS NOT NULL AND existing <> '' THEN
    RETURN existing;
  END IF;

  generated := public.generate_member_code();

  UPDATE public.profiles
  SET member_code = generated
  WHERE id = p_user_id
    AND (member_code IS NULL OR member_code = '');

  SELECT member_code INTO existing
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_member_code_for(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_member_code_for(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_member_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_member_code() TO service_role;

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    NEW.member_code := public.generate_member_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_member_code ON public.profiles;
CREATE TRIGGER profiles_assign_member_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_member_code();

-- Backfill EVERY existing account now
UPDATE public.profiles
SET member_code = public.generate_member_code()
WHERE member_code IS NULL OR member_code = '';

-- Verify
-- SELECT id, full_name, member_code FROM public.profiles LIMIT 20;
