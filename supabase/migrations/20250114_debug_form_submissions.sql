-- Debug and fix form submissions linking issue

-- First, let's check the current state of forms and submissions
SELECT 'Forms table:' as info;
SELECT id, title, slug, status FROM forms;

SELECT 'Form submissions summary:' as info;
SELECT 
  COUNT(*) as total_submissions,
  COUNT(form_id) as submissions_with_form_id,
  form_id,
  CASE 
    WHEN form_id IS NULL THEN 'NULL form_id'
    ELSE 'Has form_id'
  END as form_id_status
FROM form_submissions 
GROUP BY form_id;

-- Check if we have submissions with NULL form_id
SELECT 'Submissions with NULL form_id:' as info;
SELECT COUNT(*) as null_form_id_count
FROM form_submissions 
WHERE form_id IS NULL;

-- Get the form ID that should be linked to contact form submissions
SELECT 'Contact Form SCYC ID:' as info;
SELECT id, title, slug 
FROM forms 
WHERE title = 'Contact Form SCYC' OR slug = 'contact-form-scyc';

-- Update all submissions with NULL form_id to link to the Contact Form SCYC
UPDATE form_submissions 
SET form_id = (
  SELECT id 
  FROM forms 
  WHERE title = 'Contact Form SCYC' OR slug = 'contact-form-scyc'
  LIMIT 1
)
WHERE form_id IS NULL;

-- Verify the update
SELECT 'After update - Form submissions summary:' as info;
SELECT 
  COUNT(*) as total_submissions,
  COUNT(form_id) as submissions_with_form_id,
  form_id
FROM form_submissions 
GROUP BY form_id;