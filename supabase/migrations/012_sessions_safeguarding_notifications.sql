-- Sessions, attendance, safeguarding, extra permissions
-- Non-destructive

-- Permissions
INSERT INTO public.permissions (key, description, category) VALUES
  ('sessions.view', 'View school sessions', 'sessions'),
  ('sessions.create', 'Create sessions', 'sessions'),
  ('sessions.edit', 'Edit sessions', 'sessions'),
  ('sessions.cancel', 'Cancel sessions', 'sessions'),
  ('sessions.attendance', 'Record session attendance', 'sessions'),
  ('notifications.view', 'View own notifications', 'notifications'),
  ('notifications.manage', 'Manage system notifications', 'notifications'),
  ('safeguarding.create', 'Submit a safeguarding concern', 'safeguarding'),
  ('safeguarding.view', 'View safeguarding reports', 'safeguarding'),
  ('safeguarding.manage', 'Manage safeguarding cases', 'safeguarding'),
  ('safeguarding.assign', 'Assign safeguarding cases', 'safeguarding'),
  ('safeguarding.resolve', 'Resolve/close safeguarding cases', 'safeguarding'),
  ('safeguarding.audit', 'View safeguarding audit trail', 'safeguarding')
ON CONFLICT (key) DO NOTHING;

-- School sessions (Ro-School classes/events)
CREATE TABLE IF NOT EXISTS public.school_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  subject         TEXT,
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  teacher_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teacher_name    TEXT,
  description     TEXT NOT NULL DEFAULT '',
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  year_group      TEXT,
  roblox_join_url TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_sessions_starts ON public.school_sessions(starts_at);
CREATE INDEX IF NOT EXISTS idx_school_sessions_status ON public.school_sessions(status);
CREATE INDEX IF NOT EXISTS idx_school_sessions_teacher ON public.school_sessions(teacher_id);

CREATE TABLE IF NOT EXISTS public.session_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.school_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present', 'late', 'absent', 'excused')),
  recorded_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendance_student ON public.session_attendance(student_id);

-- Safeguarding
CREATE SEQUENCE IF NOT EXISTS safeguarding_ref_seq START 1;

CREATE TABLE IF NOT EXISTS public.safeguarding_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         TEXT UNIQUE NOT NULL,
  submitted_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  concern_about     TEXT NOT NULL CHECK (concern_about IN ('myself', 'another_student', 'staff', 'other')),
  what_happened     TEXT NOT NULL,
  when_happened     TEXT,
  where_happened    TEXT CHECK (where_happened IS NULL OR where_happened IN ('roblox', 'discord', 'website', 'session', 'other')),
  others_involved   TEXT,
  immediate_danger  TEXT NOT NULL CHECK (immediate_danger IN ('yes', 'no', 'unsure')),
  additional_info   TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'under_review', 'action_required', 'resolved', 'closed')),
  assigned_to       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sg_status ON public.safeguarding_reports(status);
CREATE INDEX IF NOT EXISTS idx_sg_submitted ON public.safeguarding_reports(submitted_by);

CREATE TABLE IF NOT EXISTS public.safeguarding_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES public.safeguarding_reports(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.safeguarding_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID NOT NULL REFERENCES public.safeguarding_reports(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  previous_value TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sg_audit_report ON public.safeguarding_audit(report_id);

-- Ensure notifications table has common columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
  ELSE
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      type TEXT DEFAULT 'general',
      read_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
  END IF;
END $$;

-- RLS
ALTER TABLE public.school_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safeguarding_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safeguarding_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safeguarding_audit ENABLE ROW LEVEL SECURITY;

-- Sessions: authenticated can read scheduled/live/completed
DROP POLICY IF EXISTS "sessions_read_auth" ON public.school_sessions;
CREATE POLICY "sessions_read_auth" ON public.school_sessions
  FOR SELECT TO authenticated
  USING (status <> 'cancelled' OR created_by = auth.uid());

DROP POLICY IF EXISTS "sessions_staff_write" ON public.school_sessions;
CREATE POLICY "sessions_staff_write" ON public.school_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );

DROP POLICY IF EXISTS "attendance_own_read" ON public.session_attendance;
CREATE POLICY "attendance_own_read" ON public.session_attendance
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );

DROP POLICY IF EXISTS "attendance_staff_write" ON public.session_attendance;
CREATE POLICY "attendance_staff_write" ON public.session_attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin'))
  );

-- Safeguarding: submitters see own; only service role / explicit staff via service for manage
DROP POLICY IF EXISTS "sg_insert_own" ON public.safeguarding_reports;
CREATE POLICY "sg_insert_own" ON public.safeguarding_reports
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "sg_select_own" ON public.safeguarding_reports;
CREATE POLICY "sg_select_own" ON public.safeguarding_reports
  FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Notes/audit: admin only via RLS (staff with permission use service role in server actions)
DROP POLICY IF EXISTS "sg_notes_admin" ON public.safeguarding_notes;
CREATE POLICY "sg_notes_admin" ON public.safeguarding_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "sg_audit_admin" ON public.safeguarding_audit;
CREATE POLICY "sg_audit_admin" ON public.safeguarding_audit
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
