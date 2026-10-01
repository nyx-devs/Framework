-- Secure Roblox linking:
-- 1) Users cannot set roblox_user_id / rank / role via client UPDATE
-- 2) Link verification codes table
-- 3) Service role / SECURITY DEFINER functions own the link

-- Verification codes for ownership proof (code in Roblox profile About)
CREATE TABLE IF NOT EXISTS public.roblox_link_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  roblox_user_id BIGINT NOT NULL,
  roblox_username TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_roblox_link_codes_code ON public.roblox_link_codes(code);

ALTER TABLE public.roblox_link_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_link_codes_select" ON public.roblox_link_codes;
CREATE POLICY "own_link_codes_select" ON public.roblox_link_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only server (service role) inserts/updates codes; no client insert policy

-- Protect sensitive profile columns from client self-update
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role (PostgREST) and superusers to change anything
  IF coalesce(auth.role(), '') = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Authenticated users cannot change identity / rank / role fields
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    NEW.roblox_user_id := OLD.roblox_user_id;
    NEW.roblox_username := OLD.roblox_username;
    NEW.roblox_group_id := OLD.roblox_group_id;
    NEW.roblox_rank_id := OLD.roblox_rank_id;
    NEW.roblox_rank_name := OLD.roblox_rank_name;
    NEW.roblox_group_member := OLD.roblox_group_member;
    NEW.roblox_rank_checked_at := OLD.roblox_rank_checked_at;
    NEW.role := OLD.role;
    IF OLD.member_code IS NOT NULL THEN
      NEW.member_code := OLD.member_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

COMMENT ON FUNCTION public.protect_profile_sensitive_columns() IS
  'Blocks client self-update of roblox_*, role, member_code. Service role can still update.';

-- Narrow client UPDATE policy (display fields only still enforced by trigger)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
