-- =============================================================================
-- Migration 002: Staff RBAC, Discord integration, expanded recruitment
-- Additive only – does not drop existing tables or data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permissions catalogue
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.permissions (key, description, category) VALUES
  ('applications.view', 'View applications', 'applications'),
  ('applications.review', 'Review applications', 'applications'),
  ('applications.assign', 'Assign applications to staff', 'applications'),
  ('applications.message', 'Message applicants', 'applications'),
  ('applications.interview', 'Schedule and manage interviews', 'applications'),
  ('applications.accept', 'Accept applications', 'applications'),
  ('applications.reject', 'Reject applications', 'applications'),
  ('staff.view', 'View staff list', 'staff'),
  ('staff.create', 'Create staff accounts', 'staff'),
  ('staff.edit', 'Edit staff profiles and roles', 'staff'),
  ('staff.disable', 'Disable/re-enable staff', 'staff'),
  ('positions.view', 'View vacancies', 'positions'),
  ('positions.create', 'Create vacancies', 'positions'),
  ('positions.edit', 'Edit vacancies', 'positions'),
  ('positions.delete', 'Delete/unpublish vacancies', 'positions'),
  ('departments.view', 'View departments', 'departments'),
  ('departments.manage', 'Manage departments', 'departments'),
  ('audit.view', 'View audit logs', 'audit'),
  ('discord.manage', 'Manage Discord integration', 'discord'),
  ('settings.manage', 'Manage system settings', 'settings'),
  ('notifications.view', 'View staff notifications', 'notifications')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.roles (key, name, description, is_system, sort_order) VALUES
  ('applicant', 'Applicant', 'Job applicant – no staff access', TRUE, 0),
  ('staff', 'Staff', 'Standard staff member', TRUE, 10),
  ('senior_staff', 'Senior Staff', 'Senior staff with broader access', TRUE, 20),
  ('headteacher', 'Headteacher', 'Headteacher – near-full access', TRUE, 30),
  ('administrator', 'Administrator', 'Full system administrator', TRUE, 40)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Map permissions to roles (idempotent via NOT EXISTS)
DO $$
DECLARE
  r_staff UUID; r_senior UUID; r_head UUID; r_admin UUID;
BEGIN
  SELECT id INTO r_staff FROM public.roles WHERE key = 'staff';
  SELECT id INTO r_senior FROM public.roles WHERE key = 'senior_staff';
  SELECT id INTO r_head FROM public.roles WHERE key = 'headteacher';
  SELECT id INTO r_admin FROM public.roles WHERE key = 'administrator';

  -- Staff: view applications, message, interview, view positions/departments
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_staff, p.id FROM public.permissions p
  WHERE p.key IN (
    'applications.view', 'applications.review', 'applications.message',
    'applications.interview', 'positions.view', 'departments.view', 'notifications.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r_staff AND rp.permission_id = p.id
  );

  -- Senior staff: + assign, accept, reject, staff view, positions edit
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_senior, p.id FROM public.permissions p
  WHERE p.key IN (
    'applications.view', 'applications.review', 'applications.assign',
    'applications.message', 'applications.interview', 'applications.accept', 'applications.reject',
    'staff.view', 'positions.view', 'positions.create', 'positions.edit',
    'departments.view', 'notifications.view', 'audit.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r_senior AND rp.permission_id = p.id
  );

  -- Headteacher: almost everything except pure admin discord/settings if desired – give broad access
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_head, p.id FROM public.permissions p
  WHERE p.key NOT IN ('discord.manage') -- head can still manage settings
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r_head AND rp.permission_id = p.id
  );

  -- Administrator: all
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_admin, p.id FROM public.permissions p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r_admin AND rp.permission_id = p.id
  );
END $$;

-- -----------------------------------------------------------------------------
-- Staff profiles (extends profiles for staff-specific fields)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_code      TEXT UNIQUE,
  display_name    TEXT NOT NULL,
  job_title       TEXT,
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role_id         UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  date_joined     DATE,
  last_login_at   TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON public.staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_dept ON public.staff_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles(is_active);

DROP TRIGGER IF EXISTS staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Align profiles.role enum usage with roles table key (keep profiles.role for quick checks)
-- Add staff_role_key optional column if needed – we use staff_profiles.role_id as source of truth for staff

-- -----------------------------------------------------------------------------
-- Discord connections (OAuth-verified only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_user_id   TEXT NOT NULL UNIQUE,
  discord_username  TEXT NOT NULL,
  discord_global_name TEXT,
  discord_avatar    TEXT,
  access_token_enc  TEXT, -- optional encrypted; prefer not storing long-term
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discord_user_id ON public.discord_connections(discord_user_id);

DROP TRIGGER IF EXISTS discord_connections_updated_at ON public.discord_connections;
CREATE TRIGGER discord_connections_updated_at
  BEFORE UPDATE ON public.discord_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Discord role mappings (Ro-School role → Discord role ID)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_role_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id         UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  discord_role_id TEXT NOT NULL,
  discord_role_name TEXT,
  sync_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id)
);

-- -----------------------------------------------------------------------------
-- Discord channels (per department / purpose)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discord_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose         TEXT NOT NULL, -- e.g. 'recruitment', 'interviews', 'staff', 'department'
  department_id   UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  channel_id      TEXT NOT NULL,
  channel_name    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purpose, department_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_channels_purpose ON public.discord_channels(purpose);

-- -----------------------------------------------------------------------------
-- System settings (key-value, non-secret config)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.system_settings (key, value) VALUES
  ('discord', '{"guild_id": null, "notifications_enabled": false}'::jsonb),
  ('school', '{"name": "Ro-School", "email": "office@Ro-School.sch.uk"}'::jsonb),
  ('applications', '{"reference_prefix": "BB"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Application reference numbers
-- -----------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS reference_code TEXT UNIQUE;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE SEQUENCE IF NOT EXISTS public.application_ref_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_application_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_code IS NULL THEN
    NEW.reference_code := 'BB-' || nextval('public.application_ref_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_ref_code ON public.applications;
CREATE TRIGGER applications_ref_code
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.generate_application_ref();

-- -----------------------------------------------------------------------------
-- Staff notifications (in-app)
-- -----------------------------------------------------------------------------
-- notifications table already exists; ensure staff can use it
-- Add type column if missing
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- Expand interviews
-- -----------------------------------------------------------------------------
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS interviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 45;

-- -----------------------------------------------------------------------------
-- RLS for new tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Permissions & roles: authenticated can read; admin manage
DROP POLICY IF EXISTS "Auth read permissions" ON public.permissions;
CREATE POLICY "Auth read permissions" ON public.permissions FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Auth read roles" ON public.roles;
CREATE POLICY "Auth read roles" ON public.roles FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Auth read role_permissions" ON public.role_permissions;
CREATE POLICY "Auth read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Admin manage permissions" ON public.permissions;
CREATE POLICY "Admin manage permissions" ON public.permissions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage roles" ON public.roles;
CREATE POLICY "Admin manage roles" ON public.roles FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admin manage role_permissions" ON public.role_permissions FOR ALL USING (public.is_admin());

-- Staff profiles
DROP POLICY IF EXISTS "Staff view staff profiles" ON public.staff_profiles;
CREATE POLICY "Staff view staff profiles" ON public.staff_profiles
  FOR SELECT USING (public.is_staff() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manage staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin manage staff profiles" ON public.staff_profiles
  FOR ALL USING (public.is_admin() OR public.is_staff());

-- Discord connections: own + staff view
DROP POLICY IF EXISTS "Users manage own discord" ON public.discord_connections;
CREATE POLICY "Users manage own discord" ON public.discord_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view discord connections" ON public.discord_connections;
CREATE POLICY "Staff view discord connections" ON public.discord_connections
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin delete discord" ON public.discord_connections;
CREATE POLICY "Admin delete discord" ON public.discord_connections
  FOR DELETE USING (public.is_admin() OR user_id = auth.uid());

-- Discord config: staff read, admin write
DROP POLICY IF EXISTS "Staff read discord mappings" ON public.discord_role_mappings;
CREATE POLICY "Staff read discord mappings" ON public.discord_role_mappings FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin manage discord mappings" ON public.discord_role_mappings;
CREATE POLICY "Admin manage discord mappings" ON public.discord_role_mappings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Staff read discord channels" ON public.discord_channels;
CREATE POLICY "Staff read discord channels" ON public.discord_channels FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin manage discord channels" ON public.discord_channels;
CREATE POLICY "Admin manage discord channels" ON public.discord_channels FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Staff read settings" ON public.system_settings;
CREATE POLICY "Staff read settings" ON public.system_settings FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admin manage settings" ON public.system_settings;
CREATE POLICY "Admin manage settings" ON public.system_settings FOR ALL USING (public.is_admin());

-- Update is_staff to also check staff_profiles
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('staff', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perm_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.role_permissions rp ON rp.role_id = sp.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE sp.user_id = auth.uid()
      AND sp.is_active = TRUE
      AND p.key = perm_key
  )
  OR public.is_admin();
$$;

-- Seed extra departments
INSERT INTO public.departments (name, slug, description) VALUES
  ('Humanities', 'humanities', 'History, Geography and related subjects'),
  ('Senior Leadership', 'senior-leadership', 'Senior leadership team'),
  ('Administration', 'administration', 'School administration and support')
ON CONFLICT (slug) DO NOTHING;

