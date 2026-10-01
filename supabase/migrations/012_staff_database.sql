-- Staff database (HT+ only). Filled after a staff application is accepted.

CREATE TABLE IF NOT EXISTS public.staff_database_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  discord_username text NOT NULL,
  roblox_username text NOT NULL,
  rank_label text NOT NULL,
  subroles text[] NOT NULL DEFAULT '{}',
  date_accepted date NOT NULL DEFAULT (CURRENT_DATE),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_database_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.staff_database_entries(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_db_entries_discord_idx ON public.staff_database_entries (discord_username);
CREATE INDEX IF NOT EXISTS staff_db_entries_roblox_idx ON public.staff_database_entries (roblox_username);
CREATE INDEX IF NOT EXISTS staff_db_entries_rank_idx ON public.staff_database_entries (rank_label);
CREATE INDEX IF NOT EXISTS staff_db_history_entry_idx ON public.staff_database_history (entry_id);

ALTER TABLE public.staff_database_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_database_history ENABLE ROW LEVEL SECURITY;

-- No direct client policies: access only via service role in server actions
-- (HT+ checked in application code). Authenticated users cannot SELECT.

DROP POLICY IF EXISTS staff_db_entries_deny_all ON public.staff_database_entries;
CREATE POLICY staff_db_entries_deny_all ON public.staff_database_entries
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS staff_db_history_deny_all ON public.staff_database_history;
CREATE POLICY staff_db_history_deny_all ON public.staff_database_history
  FOR ALL USING (false) WITH CHECK (false);

-- Optional: store Roblox role unique id on profiles for HT+ checks
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roblox_role_id bigint;

COMMENT ON TABLE public.staff_database_entries IS
  'Private staff roster; server actions only; HT+ Roblox rank required.';
