-- Daily school sessions: every day 19:15–20:40 GMT (7:15 pm – 8:40 pm GMT)
-- Generates the next 30 days. Re-run safe for days that already exist.

DO $$
DECLARE
  d date := (CURRENT_TIMESTAMP AT TIME ZONE 'GMT')::date;
  i int;
  start_ts timestamptz;
  end_ts timestamptz;
BEGIN
  FOR i IN 0..29 LOOP
    start_ts := ((d + i)::text || ' 19:15:00')::timestamp AT TIME ZONE 'GMT';
    end_ts   := ((d + i)::text || ' 20:40:00')::timestamp AT TIME ZONE 'GMT';

    IF NOT EXISTS (
      SELECT 1 FROM public.school_sessions s
      WHERE s.starts_at = start_ts
        AND s.status IN ('scheduled', 'live')
    ) THEN
      INSERT INTO public.school_sessions (
        title, subject, description, starts_at, ends_at, status
      ) VALUES (
        'Daily school session',
        'General',
        'Ro-School is in session every day from 7:15 pm to 8:40 pm GMT.',
        start_ts,
        end_ts,
        'scheduled'
      );
    END IF;
  END LOOP;
END $$;
