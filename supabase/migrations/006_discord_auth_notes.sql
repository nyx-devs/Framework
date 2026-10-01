-- Discord Auth via Supabase — safety constraints
DO $$ BEGIN
  ALTER TABLE public.discord_connections
    ADD CONSTRAINT discord_connections_discord_user_id_key UNIQUE (discord_user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.discord_connections
    ADD CONSTRAINT discord_connections_user_id_key UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN NULL;
END $$;

COMMENT ON TABLE public.discord_connections IS
  'OAuth-verified Discord links. discord_user_id is permanent; never grant staff/admin from Discord membership alone.';
