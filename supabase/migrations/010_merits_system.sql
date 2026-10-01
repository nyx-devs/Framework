-- =============================================================================
-- Merits system — central record shared by Roblox, website, Discord
-- =============================================================================

-- Permissions
INSERT INTO public.permissions (key, description, category) VALUES
  ('merits.view_own', 'View own merit total and history', 'merits'),
  ('merits.view', 'View any student merit records', 'merits'),
  ('merits.award', 'Award merits to students', 'merits'),
  ('merits.remove', 'Reverse or remove merits', 'merits'),
  ('merits.manage', 'Configure merit settings and audit', 'merits')
ON CONFLICT (key) DO NOTHING;

-- Grant to typical ranks (by role key where present)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('teacher', 'staff', 'middle_leader', 'slt', 'headteacher', 'admin')
  AND p.key IN ('merits.view_own', 'merits.view', 'merits.award')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('slt', 'headteacher', 'admin')
  AND p.key IN ('merits.remove', 'merits.manage')
ON CONFLICT DO NOTHING;

-- Also grant award to any role that already has applications.review
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p.id
FROM public.role_permissions rp
JOIN public.permissions existing ON existing.id = rp.permission_id AND existing.key = 'applications.review'
CROSS JOIN public.permissions p
WHERE p.key IN ('merits.view', 'merits.award')
ON CONFLICT DO NOTHING;

-- Merits ledger (history is source of truth; total is derived)
CREATE TABLE IF NOT EXISTS public.merits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_roblox_id BIGINT NOT NULL,
  student_roblox_username TEXT,
  student_discord_id TEXT,
  amount            INT NOT NULL CHECK (amount <> 0 AND amount BETWEEN -50 AND 50),
  reason            TEXT NOT NULL,
  awarded_by_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  awarded_by_roblox_id BIGINT,
  awarded_by_name   TEXT,
  awarded_by_rank   TEXT,
  source            TEXT NOT NULL DEFAULT 'website'
                    CHECK (source IN ('roblox', 'discord', 'website', 'system')),
  server_id         TEXT,
  session_id        TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'reversed', 'void')),
  reversed_by_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reversed_at       TIMESTAMPTZ,
  reverse_reason    TEXT,
  idempotency_key   TEXT UNIQUE,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merits_student ON public.merits(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merits_roblox ON public.merits(student_roblox_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merits_status ON public.merits(status);
CREATE INDEX IF NOT EXISTS idx_merits_created ON public.merits(created_at DESC);

-- Cached totals for fast reads (updated by triggers / application)
CREATE TABLE IF NOT EXISTS public.merit_totals (
  student_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_roblox_id BIGINT UNIQUE,
  total             INT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.refresh_merit_total_for_student(p_student_id UUID, p_roblox_id BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t INT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO t
  FROM public.merits
  WHERE status = 'active'
    AND (
      (p_student_id IS NOT NULL AND student_id = p_student_id)
      OR (p_roblox_id IS NOT NULL AND student_roblox_id = p_roblox_id)
    );

  IF p_student_id IS NOT NULL THEN
    INSERT INTO public.merit_totals (student_id, student_roblox_id, total, updated_at)
    VALUES (p_student_id, p_roblox_id, t, NOW())
    ON CONFLICT (student_id) DO UPDATE
    SET total = EXCLUDED.total,
        student_roblox_id = COALESCE(EXCLUDED.student_roblox_id, public.merit_totals.student_roblox_id),
        updated_at = NOW();
  ELSIF p_roblox_id IS NOT NULL THEN
    -- Orphan Roblox-only total: store against a synthetic approach via unique roblox
    INSERT INTO public.merit_totals (student_id, student_roblox_id, total, updated_at)
    SELECT id, p_roblox_id, t, NOW()
    FROM public.profiles
    WHERE roblox_user_id = p_roblox_id
    LIMIT 1
    ON CONFLICT (student_id) DO UPDATE
    SET total = EXCLUDED.total, updated_at = NOW();
  END IF;

  RETURN t;
END;
$$;

-- Discord channel purpose
INSERT INTO public.discord_channels (purpose, channel_id, channel_name, is_active)
SELECT 'merits', '', 'merits', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.discord_channels WHERE purpose = 'merits'
);

-- Settings
INSERT INTO public.site_settings (key, value)
SELECT 'merits', jsonb_build_object(
    'max_amount', 5,
    'min_amount', 1,
    'enabled', true,
    'allowed_reasons', jsonb_build_array(
      'Excellent participation',
      'Outstanding work',
      'Helping another student',
      'Positive behaviour',
      'Leadership',
      'Improvement',
      'Other'
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'merits');

ALTER TABLE public.merits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merit_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own merits" ON public.merits;
CREATE POLICY "Users read own merits" ON public.merits
  FOR SELECT USING (
    student_id = auth.uid()
    OR public.is_staff()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Staff insert merits" ON public.merits;
CREATE POLICY "Staff insert merits" ON public.merits
  FOR INSERT WITH CHECK (public.is_staff() OR public.is_admin());

DROP POLICY IF EXISTS "Staff update merits" ON public.merits;
CREATE POLICY "Staff update merits" ON public.merits
  FOR UPDATE USING (public.is_staff() OR public.is_admin());

DROP POLICY IF EXISTS "Users read own merit totals" ON public.merit_totals;
CREATE POLICY "Users read own merit totals" ON public.merit_totals
  FOR SELECT USING (
    student_id = auth.uid()
    OR public.is_staff()
    OR public.is_admin()
  );

-- Rate-limit helper table for Roblox API
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket          TEXT PRIMARY KEY,
  window_start    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count       INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.merits IS 'School merit ledger — source of truth for Roblox, website and Discord';
