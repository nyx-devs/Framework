-- Member codes are private credentials (like a PIN).
COMMENT ON COLUMN public.profiles.member_code IS
  'PRIVATE 6-digit account code. Never expose publicly. Owner + authorised staff only.';

-- Optional: restrict selecting member_code via a view for staff tools later.
-- Application code must not select member_code in public directory queries.
