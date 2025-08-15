-- Fix form submissions linking

-- First, check if we have any form with 'Contact Form SCYC' title
DO $$
DECLARE
  contact_form_id UUID;
  submission_count INT;
BEGIN
  -- Get the Contact Form SCYC ID
  SELECT id INTO contact_form_id FROM forms WHERE title = 'Contact Form SCYC' LIMIT 1;
  
  -- Count submissions with NULL form_id
  SELECT COUNT(*) INTO submission_count FROM form_submissions WHERE form_id IS NULL;
  
  RAISE NOTICE 'Contact Form ID: %', contact_form_id;
  RAISE NOTICE 'Submissions with NULL form_id: %', submission_count;
  
  -- If we have a contact form and submissions with NULL form_id, link them
  IF contact_form_id IS NOT NULL AND submission_count > 0 THEN
    UPDATE form_submissions
    SET form_id = contact_form_id
    WHERE form_id IS NULL;
    
    RAISE NOTICE 'Updated % submissions to link with Contact Form SCYC', submission_count;
  ELSE
    RAISE NOTICE 'No updates needed or contact form not found';
  END IF;
END;
$$;