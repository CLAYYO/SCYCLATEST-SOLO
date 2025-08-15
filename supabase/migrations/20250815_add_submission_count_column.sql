-- Add submission_count column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;

-- Update submission counts for existing forms
DO $$
DECLARE
  form_record RECORD;
  submission_count_var INTEGER;
BEGIN
  FOR form_record IN SELECT id FROM forms LOOP
    SELECT COUNT(*) INTO submission_count_var FROM form_submissions WHERE form_id = form_record.id;
    UPDATE forms SET submission_count = submission_count_var WHERE id = form_record.id;
  END LOOP;
END;
$$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);