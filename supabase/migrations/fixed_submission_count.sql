-- IMPORTANT: This is the fixed SQL to add the submission_count column
-- Run this in the Supabase SQL Editor

-- Step 1: Add submission_count column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;

-- Step 2: Update submission counts for existing forms
-- This uses a different variable name to avoid the ambiguous column reference error
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

-- Step 3: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);