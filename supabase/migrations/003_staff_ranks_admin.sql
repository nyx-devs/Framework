-- Migration 003: Staff ranks hierarchy + admin.access permission
-- Additive only

CREATE TABLE IF NOT EXISTS public.staff_ranks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Teaching',
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS staff_ranks_updated_at ON public.staff_ranks;
CREATE TRIGGER staff_ranks_updated_at
  BEFORE UPDATE ON public.staff_ranks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.staff_ranks (key, name, category, sort_order) VALUES
  ('headteacher', 'Headteacher', 'Senior Leadership', 10),
  ('deputy_headteacher', 'Deputy Headteacher', 'Senior Leadership', 20),
  ('assistant_headteacher', 'Assistant Headteacher', 'Senior Leadership', 30),
  ('head_of_department', 'Head of Department', 'Leadership', 40),
  ('deputy_head_of_department', 'Deputy Head of Department', 'Leadership', 50),
  ('head_of_year', 'Head of Year', 'Leadership', 60),
  ('lead_teacher', 'Lead Teacher', 'Teaching', 70),
  ('teacher', 'Teacher', 'Teaching', 80),
  ('ect', 'Early Career Teacher', 'Teaching', 90),
  ('pastoral_lead', 'Pastoral Lead', 'Support', 100),
  ('teaching_assistant', 'Teaching Assistant', 'Support', 110),
  ('student_support', 'Student Support', 'Support', 120),
  ('administrative_staff', 'Administrative Staff', 'Support', 130),
  ('recruitment_officer', 'Recruitment Officer', 'Support', 140)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS rank_id UUID REFERENCES public.staff_ranks(id) ON DELETE SET NULL;

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_profiles_rank ON public.staff_profiles(rank_id);

-- Link ranks to roles optionally via rank_role_defaults
CREATE TABLE IF NOT EXISTS public.rank_default_permissions (
  rank_id       UUID NOT NULL REFERENCES public.staff_ranks(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (rank_id, permission_id)
);

INSERT INTO public.permissions (key, description, category) VALUES
  ('admin.access', 'Access the Ro-School Admin Panel', 'admin')
ON CONFLICT (key) DO NOTHING;

-- Grant admin.access to administrator role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'administrator' AND p.key = 'admin.access'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'headteacher' AND p.key = 'admin.access'
ON CONFLICT DO NOTHING;

ALTER TABLE public.staff_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_default_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read ranks" ON public.staff_ranks;
CREATE POLICY "Auth read ranks" ON public.staff_ranks FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Admin manage ranks" ON public.staff_ranks;
CREATE POLICY "Admin manage ranks" ON public.staff_ranks FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Auth read rank perms" ON public.rank_default_permissions;
CREATE POLICY "Auth read rank perms" ON public.rank_default_permissions FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Admin manage rank perms" ON public.rank_default_permissions;
CREATE POLICY "Admin manage rank perms" ON public.rank_default_permissions FOR ALL USING (public.is_admin());

-- Extra departments
INSERT INTO public.departments (name, slug, description) VALUES
  ('Modern Languages', 'modern-languages', 'Languages faculty'),
  ('Computing', 'computing', 'Computing and ICT'),
  ('PE', 'pe', 'Physical education'),
  ('Creative Arts', 'creative-arts', 'Art, drama and music')
ON CONFLICT (slug) DO NOTHING;

-- Integration events queue (email/discord workers)
CREATE TABLE IF NOT EXISTS public.integration_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending',
  attempts    INT NOT NULL DEFAULT 0,
  last_error  TEXT,
  processed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_status ON public.integration_events(status, created_at);

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read integration events" ON public.integration_events;
CREATE POLICY "Admin read integration events" ON public.integration_events
  FOR SELECT USING (public.is_admin());
