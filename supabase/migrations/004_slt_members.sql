-- Senior Leadership Team members (optional DB source of truth)
-- Until admin UI is wired, public site can keep using src/lib/content/slt.ts

CREATE TABLE IF NOT EXISTS public.slt_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  roblox_username  TEXT,
  roblox_user_id   BIGINT,
  role             TEXT NOT NULL,
  profile_image    TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  department_id    UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  sort_order       INT NOT NULL DEFAULT 0,
  published        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slt_members_published ON public.slt_members(published);
CREATE INDEX IF NOT EXISTS idx_slt_members_sort ON public.slt_members(sort_order);

DROP TRIGGER IF EXISTS slt_members_updated_at ON public.slt_members;
CREATE TRIGGER slt_members_updated_at
  BEFORE UPDATE ON public.slt_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Optional Roblox link columns on profiles (for future account linking)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roblox_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS roblox_username TEXT,
  ADD COLUMN IF NOT EXISTS roblox_display_name TEXT,
  ADD COLUMN IF NOT EXISTS roblox_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_roblox_user_id
  ON public.profiles(roblox_user_id)
  WHERE roblox_user_id IS NOT NULL;
