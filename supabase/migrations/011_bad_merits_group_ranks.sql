-- Bad merits + Roblox group rank cache on profiles

ALTER TABLE public.merits
  ADD COLUMN IF NOT EXISTS merit_kind TEXT NOT NULL DEFAULT 'positive'
    CHECK (merit_kind IN ('positive', 'bad'));

CREATE INDEX IF NOT EXISTS idx_merits_kind ON public.merits(merit_kind);

ALTER TABLE public.merit_totals
  ADD COLUMN IF NOT EXISTS positive_total INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bad_total INT NOT NULL DEFAULT 0;

-- Net total stays in `total` (sum of active amounts)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roblox_group_id BIGINT,
  ADD COLUMN IF NOT EXISTS roblox_rank_id INT,
  ADD COLUMN IF NOT EXISTS roblox_rank_name TEXT,
  ADD COLUMN IF NOT EXISTS roblox_group_member BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS roblox_rank_checked_at TIMESTAMPTZ;

INSERT INTO public.permissions (key, description, category) VALUES
  ('merits.award_bad', 'Issue bad merits (negative recognition)', 'merits')
ON CONFLICT (key) DO NOTHING;

-- Staff ranks that already have merits.award also get award_bad where present
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p_bad.id
FROM public.role_permissions rp
JOIN public.permissions p_award ON p_award.id = rp.permission_id AND p_award.key = 'merits.award'
CROSS JOIN public.permissions p_bad
WHERE p_bad.key = 'merits.award_bad'
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN public.merits.merit_kind IS 'positive = good merit; bad = behavioural demerit (negative amount)';
COMMENT ON COLUMN public.profiles.roblox_rank_id IS 'Cached Ro-School Roblox group rank ID — refresh from API, never user-submitted';
