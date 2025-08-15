-- Create the Contact Form SCYC record in the forms table
-- This links to the existing 509 imported contact form submissions

INSERT INTO forms (
  id,
  title,
  description,
  slug,
  fields,
  settings,
  status,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Contact Form SCYC',
  'Main contact form for South Caernarvonshire Yacht Club website',
  'contact-form-scyc',
  '[
    {
      "id": "names",
      "type": "name",
      "label": "Name",
      "required": true,
      "fields": {
        "first_name": {
          "label": "First Name",
          "placeholder": "Enter your first name"
        },
        "last_name": {
          "label": "Last Name",
          "placeholder": "Enter your last name"
        }
      }
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "placeholder": "Enter your email address",
      "required": true
    },
    {
      "id": "subject",
      "type": "text",
      "label": "Subject",
      "placeholder": "Enter the subject of your message",
      "required": true
    },
    {
      "id": "message",
      "type": "textarea",
      "label": "Message",
      "placeholder": "Enter your message",
      "required": true,
      "rows": 5
    },
    {
      "id": "g-recaptcha-response",
      "type": "recaptcha",
      "label": "reCAPTCHA",
      "required": true
    }
  ]'::jsonb,
  '{
    "recaptcha": {
      "enabled": true,
      "site_key": "6LfKURIqAAAAADvlHstLpOR_2nhQvYhXrhJuVbOD"
    },
    "notifications": {
      "enabled": true,
      "email": "info@scyc.co.uk"
    },
    "redirect_url": "/events/get-in-touch/",
    "success_message": "Thank you for your message. We will get back to you soon."
  }'::jsonb,
  'active',
  '2024-01-01 00:00:00',
  '2024-01-01 00:00:00'
);

-- Update all existing form submissions to link to this form
UPDATE form_submissions 
SET form_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE form_id IS NULL;

-- Grant permissions
GRANT SELECT ON forms TO anon;
GRANT ALL PRIVILEGES ON forms TO authenticated;