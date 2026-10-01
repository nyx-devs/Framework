-- =============================================================================
-- School email system: name@yourschool.example addresses + in-app mailbox
-- =============================================================================

-- School address on profile (unique, permanent once set)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_email TEXT;

-- Unique when set (multiple NULLs allowed in Postgres UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_school_email
  ON public.profiles (school_email)
  WHERE school_email IS NOT NULL;

COMMENT ON COLUMN public.profiles.school_email IS
  'In-school address local@yourschool.example used for website mail only';

-- In-app messages between users (not application-scoped)
CREATE TABLE IF NOT EXISTS public.school_mail (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_address    TEXT NOT NULL,
  to_address      TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT '(no subject)',
  body            TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  archived_by_sender BOOLEAN NOT NULL DEFAULT FALSE,
  archived_by_recipient BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_mail_to ON public.school_mail(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_mail_from ON public.school_mail(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_mail_unread ON public.school_mail(to_user_id) WHERE read_at IS NULL;

ALTER TABLE public.school_mail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own school mail" ON public.school_mail;
CREATE POLICY "Users read own school mail" ON public.school_mail
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users send school mail" ON public.school_mail;
CREATE POLICY "Users send school mail" ON public.school_mail
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Recipients update read/archive" ON public.school_mail;
CREATE POLICY "Recipients update read/archive" ON public.school_mail
  FOR UPDATE USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  )
  WITH CHECK (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- Helper: generate a unique school email from a display name
CREATE OR REPLACE FUNCTION public.generate_school_email(p_full_name TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
  discord_name TEXT;
BEGIN
  -- Prefer Discord username when linked (e.g. eqeno → eqeno@yourschool.example)
  SELECT discord_username INTO discord_name
  FROM public.discord_connections
  WHERE user_id = p_user_id
  LIMIT 1;

  base := lower(COALESCE(NULLIF(trim(discord_name), ''), NULLIF(trim(p_full_name), ''), 'member'));

  -- Single-token handle: strip to [a-z0-9._-]
  IF position(' ' in base) = 0 THEN
    base := regexp_replace(base, '[^a-z0-9._-]', '', 'g');
  ELSE
    base := regexp_replace(base, '[^a-z0-9]+', '.', 'g');
  END IF;

  base := trim(both '.' from base);
  base := trim(both '-' from base);
  base := trim(both '_' from base);
  IF base = '' OR base IS NULL THEN
    base := 'member';
  END IF;
  base := left(base, 40);

  candidate := base || '@yourschool.example';
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE school_email = candidate AND id <> p_user_id) LOOP
    n := n + 1;
    candidate := base || n::text || '@yourschool.example';
  END LOOP;
  RETURN candidate;
END;
$$;

-- Assign school_email on profile insert if missing
CREATE OR REPLACE FUNCTION public.assign_school_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_email IS NULL OR NEW.school_email = '' THEN
    NEW.school_email := public.generate_school_email(NEW.full_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_school_email ON public.profiles;
CREATE TRIGGER profiles_assign_school_email
  BEFORE INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_school_email();

-- Backfill existing profiles
UPDATE public.profiles
SET school_email = public.generate_school_email(full_name, id)
WHERE school_email IS NULL;

-- Allow authenticated users to look up school directory (name + school email only via app)
DROP POLICY IF EXISTS "Authenticated directory lookup" ON public.profiles;
CREATE POLICY "Authenticated directory lookup" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_email IS NOT NULL
  );

-- Optional: re-run to refresh addresses that are still NULL
-- UPDATE public.profiles
-- SET school_email = public.generate_school_email(full_name, id)
-- WHERE school_email IS NULL;
