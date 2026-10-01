-- =============================================================================
-- OPTIONAL security fix. Not part of the normal migration sequence: read this,
-- then run it yourself on a Supabase dev branch first.
--
-- PROBLEM
--   schema.sql creates the policy "Applicants manage own applications" as
--   FOR ALL. Because the browser holds the public (anon) key plus the user's
--   login, a signed-in applicant could run, from the browser console:
--       supabase.from('applications').update({ status: 'accepted' }).eq('id', ...)
--   and accept their own application (or change assigned_to, position_id, etc).
--
-- WHAT THIS DOES
--   Keeps the policy, but adds a trigger so that a NON-staff user can only:
--     * submit their own draft            (draft -> submitted)
--     * withdraw their own application    (any open status -> withdrawn)
--     * edit the cover letter while it is still a draft
--   Staff and admins are unaffected. Back-end/SQL-editor changes (no signed-in
--   user) are unaffected.
--
--   It is written to match how the website's existing submit/withdraw code
--   already updates the row, so no application code has to change.
--
-- NOT TESTED: no Postgres was available where this was written. Test:
--   1) applicant can save a draft, submit it, and withdraw it (should work)
--   2) applicant running update({status:'accepted'}) gets an error
--   3) staff can still change status from the staff portal
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_application_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_staff() THEN
    RETURN NEW;
  END IF;

  IF NEW.applicant_id   IS DISTINCT FROM OLD.applicant_id
     OR NEW.position_id    IS DISTINCT FROM OLD.position_id
     OR NEW.assigned_to    IS DISTINCT FROM OLD.assigned_to
     OR NEW.assigned_at    IS DISTINCT FROM OLD.assigned_at
     OR NEW.reference_code IS DISTINCT FROM OLD.reference_code THEN
    RAISE EXCEPTION 'You cannot change these fields on an application';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'submitted')
      OR (OLD.status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'interview', 'offered')
          AND NEW.status = 'withdrawn')
    ) THEN
      RAISE EXCEPTION 'Only the recruitment team can change an application status';
    END IF;
  ELSIF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'You cannot change these fields on an application';
  END IF;

  IF OLD.status <> 'draft' AND NEW.cover_letter IS DISTINCT FROM OLD.cover_letter THEN
    RAISE EXCEPTION 'A submitted application can no longer be edited';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_guard_update ON public.applications;
CREATE TRIGGER applications_guard_update
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_update();
