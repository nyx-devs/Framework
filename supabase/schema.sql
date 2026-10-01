-- =============================================================================
-- Ro-School – Recruitment & Applications Schema
-- PostgreSQL / Supabase
-- =============================================================================
-- Run this in the Supabase SQL Editor (or via psql).
-- Safe to re-run: uses IF NOT EXISTS where practical.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('applicant', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'shortlisted',
    'interview',
    'offered',
    'accepted',
    'rejected',
    'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_type AS ENUM ('permanent', 'fixed_term', 'temporary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.vacancy_category AS ENUM ('teaching', 'support', 'leadership', 'pastoral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_status AS ENUM (
    'proposed',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  phone           TEXT,
  role            public.user_role NOT NULL DEFAULT 'applicant',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'applicant'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Departments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Positions (vacancies)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.positions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  department_id      UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  category           public.vacancy_category NOT NULL,
  contract_type      public.contract_type NOT NULL DEFAULT 'permanent',
  hours              TEXT NOT NULL DEFAULT 'Full time',
  salary             TEXT,
  short_description  TEXT NOT NULL,
  requirements       TEXT[] NOT NULL DEFAULT '{}',
  responsibilities   TEXT[] NOT NULL DEFAULT '{}',
  closing_date       DATE,
  published          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_published ON public.positions(published);
CREATE INDEX IF NOT EXISTS idx_positions_category ON public.positions(category);
CREATE INDEX IF NOT EXISTS idx_positions_closing ON public.positions(closing_date);

DROP TRIGGER IF EXISTS positions_updated_at ON public.positions;
CREATE TRIGGER positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Application questions (per position or global)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id   UUID REFERENCES public.positions(id) ON DELETE CASCADE,
  -- NULL position_id = global question shown on all applications
  prompt        TEXT NOT NULL,
  help_text     TEXT,
  is_required   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_position ON public.questions(position_id);

-- -----------------------------------------------------------------------------
-- Applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id     UUID NOT NULL REFERENCES public.positions(id) ON DELETE RESTRICT,
  applicant_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          public.application_status NOT NULL DEFAULT 'draft',
  cover_letter    TEXT,
  submitted_at    TIMESTAMPTZ,
  assigned_to     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_position ON public.applications(position_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_assigned ON public.applications(assigned_to);

DROP TRIGGER IF EXISTS applications_updated_at ON public.applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Answers to application questions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  body            TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, question_id)
);

DROP TRIGGER IF EXISTS answers_updated_at ON public.answers;
CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Internal notes (staff only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_internal     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_application ON public.notes(application_id);

-- -----------------------------------------------------------------------------
-- Messages (applicant ↔ staff)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_application ON public.messages(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- -----------------------------------------------------------------------------
-- Timeline events (status changes, key actions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  summary         TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_application ON public.timeline_events(application_id);

-- -----------------------------------------------------------------------------
-- Interviews
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ,
  location        TEXT,
  format          TEXT, -- e.g. 'in_person', 'video', 'panel'
  status          public.interview_status NOT NULL DEFAULT 'proposed',
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application ON public.interviews(application_id);

DROP TRIGGER IF EXISTS interviews_updated_at ON public.interviews;
CREATE TRIGGER interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- Audit logs (important admin actions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB NOT NULL DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: is staff or admin
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Staff can update profiles" ON public.profiles;
CREATE POLICY "Staff can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_staff());

-- Departments: public read published structure; staff manage
DROP POLICY IF EXISTS "Anyone can read departments" ON public.departments;
CREATE POLICY "Anyone can read departments"
  ON public.departments FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Staff manage departments" ON public.departments;
CREATE POLICY "Staff manage departments"
  ON public.departments FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Positions: public can read published; staff full access
DROP POLICY IF EXISTS "Anyone can read published positions" ON public.positions;
CREATE POLICY "Anyone can read published positions"
  ON public.positions FOR SELECT
  USING (published = TRUE OR public.is_staff());

DROP POLICY IF EXISTS "Staff manage positions" ON public.positions;
CREATE POLICY "Staff manage positions"
  ON public.positions FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Questions
DROP POLICY IF EXISTS "Anyone can read questions for published roles" ON public.questions;
CREATE POLICY "Anyone can read questions for published roles"
  ON public.questions FOR SELECT
  USING (
    position_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.positions p
      WHERE p.id = questions.position_id AND (p.published = TRUE OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "Staff manage questions" ON public.questions;
CREATE POLICY "Staff manage questions"
  ON public.questions FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Applications: applicants own rows; staff all
DROP POLICY IF EXISTS "Applicants manage own applications" ON public.applications;
CREATE POLICY "Applicants manage own applications"
  ON public.applications FOR ALL
  USING (applicant_id = auth.uid())
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all applications" ON public.applications;
CREATE POLICY "Staff view all applications"
  ON public.applications FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff update applications" ON public.applications;
CREATE POLICY "Staff update applications"
  ON public.applications FOR UPDATE
  USING (public.is_staff());

-- Answers
DROP POLICY IF EXISTS "Applicants manage own answers" ON public.answers;
CREATE POLICY "Applicants manage own answers"
  ON public.answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = answers.application_id AND a.applicant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = answers.application_id AND a.applicant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff view answers" ON public.answers;
CREATE POLICY "Staff view answers"
  ON public.answers FOR SELECT
  USING (public.is_staff());

-- Notes: staff only
DROP POLICY IF EXISTS "Staff manage notes" ON public.notes;
CREATE POLICY "Staff manage notes"
  ON public.notes FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Messages: participants + staff
DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
CREATE POLICY "Participants read messages"
  ON public.messages FOR SELECT
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = messages.application_id AND a.applicant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_staff()
      OR EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = messages.application_id AND a.applicant_id = auth.uid()
      )
    )
  );

-- Timeline
DROP POLICY IF EXISTS "Applicants read own timeline" ON public.timeline_events;
CREATE POLICY "Applicants read own timeline"
  ON public.timeline_events FOR SELECT
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = timeline_events.application_id AND a.applicant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff insert timeline" ON public.timeline_events;
CREATE POLICY "Staff insert timeline"
  ON public.timeline_events FOR INSERT
  WITH CHECK (public.is_staff());

-- Interviews
DROP POLICY IF EXISTS "Applicants read own interviews" ON public.interviews;
CREATE POLICY "Applicants read own interviews"
  ON public.interviews FOR SELECT
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = interviews.application_id AND a.applicant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff manage interviews" ON public.interviews;
CREATE POLICY "Staff manage interviews"
  ON public.interviews FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Notifications
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Audit logs: staff read; system inserts via service role
DROP POLICY IF EXISTS "Staff read audit logs" ON public.audit_logs;
CREATE POLICY "Staff read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_staff());

-- =============================================================================
-- Seed data (demo departments & sample positions)
-- =============================================================================

INSERT INTO public.departments (name, slug, description)
VALUES
  ('Mathematics', 'mathematics', 'Mathematics department'),
  ('Science', 'science', 'Science faculty'),
  ('English', 'english', 'English department'),
  ('Inclusion', 'inclusion', 'SEND and inclusion'),
  ('Pastoral', 'pastoral', 'Pastoral care and behaviour support')
ON CONFLICT (slug) DO NOTHING;

-- Sample published vacancies (IDs stable for demo)
INSERT INTO public.positions (
  id, slug, title, department_id, category, contract_type, hours, salary,
  short_description, requirements, responsibilities, closing_date, published
)
SELECT
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'maths-teacher-2026',
  'Teacher of Mathematics',
  d.id,
  'teaching',
  'permanent',
  'Full time',
  'MPS / UPS',
  'We are seeking an enthusiastic Teacher of Mathematics to join our successful and supportive department.',
  ARRAY['QTS or equivalent', 'Strong subject knowledge in Mathematics', 'Ability to teach up to GCSE'],
  ARRAY['Plan and deliver high-quality lessons across KS3 and KS4', 'Assess and report on student progress'],
  '2026-10-15'::date,
  TRUE
FROM public.departments d WHERE d.slug = 'mathematics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.positions (
  id, slug, title, department_id, category, contract_type, hours, salary,
  short_description, requirements, responsibilities, closing_date, published
)
SELECT
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'science-teacher-2026',
  'Teacher of Science',
  d.id,
  'teaching',
  'permanent',
  'Full time',
  'MPS / UPS',
  'Join our Science faculty. Experience of teaching Biology, Chemistry or Physics to GCSE is desirable.',
  ARRAY['QTS or equivalent', 'Degree in a science-related subject'],
  ARRAY['Deliver engaging science lessons', 'Manage practical work safely'],
  '2026-10-20'::date,
  TRUE
FROM public.departments d WHERE d.slug = 'science'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.positions (
  id, slug, title, department_id, category, contract_type, hours, salary,
  short_description, requirements, responsibilities, closing_date, published
)
SELECT
  'a1000000-0000-4000-8000-000000000003'::uuid,
  'ta-sen-2026',
  'Teaching Assistant (SEN support)',
  d.id,
  'support',
  'permanent',
  'Term time only, 32.5 hours per week',
  'Grade 4',
  'Support students with special educational needs in class and through targeted interventions.',
  ARRAY['Experience working with young people', 'Understanding of SEND'],
  ARRAY['Support students in lessons', 'Deliver small-group interventions'],
  '2026-10-10'::date,
  TRUE
FROM public.departments d WHERE d.slug = 'inclusion'
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Done
-- =============================================================================
-- After running:
-- 1. Authentication → Providers → Email → Confirm email ON
-- 2. Authentication → URL configuration → add redirect URLs
-- 3. Promote staff: UPDATE profiles SET role = 'staff' WHERE email = '...';
-- =============================================================================
