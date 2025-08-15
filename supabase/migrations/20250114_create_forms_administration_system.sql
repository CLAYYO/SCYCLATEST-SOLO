-- Forms Administration System Database Schema
-- Created: 2025-01-14
-- Purpose: Complete forms management system for SCYC website

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Forms table - stores form definitions
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Form submissions table - stores all form submissions
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    legacy_id INTEGER, -- For imported data from old system
    serial_number VARCHAR(50),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_inputs JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb, -- browser, device, IP, etc.
    source_url TEXT,
    user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    is_favourite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Form templates table - reusable form templates
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Form notifications table - email notification settings
CREATE TABLE form_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('submission', 'admin_alert', 'auto_reply')),
    recipients TEXT[] NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    template_variables JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Form analytics table - track form performance
CREATE TABLE form_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    submissions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, date)
);

-- 6. Form exports table - track export history
CREATE TABLE form_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    export_type VARCHAR(20) CHECK (export_type IN ('csv', 'excel', 'json')),
    filters JSONB DEFAULT '{}'::jsonb,
    file_path TEXT,
    exported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_forms_slug ON forms(slug);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX idx_form_submissions_legacy_id ON form_submissions(legacy_id);
CREATE INDEX idx_form_notifications_form_id ON form_notifications(form_id);
CREATE INDEX idx_form_analytics_form_id_date ON form_analytics(form_id, date);
CREATE INDEX idx_form_exports_form_id ON form_exports(form_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_notifications_updated_at BEFORE UPDATE ON form_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms table
CREATE POLICY "Public can view active forms" ON forms
    FOR SELECT USING (status = 'active');

CREATE POLICY "Authenticated users can manage forms" ON forms
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for form_submissions table
CREATE POLICY "Anyone can insert form submissions" ON form_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view all submissions" ON form_submissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update submissions" ON form_submissions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for form_templates table
CREATE POLICY "Public can view public templates" ON form_templates
    FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage templates" ON form_templates
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for form_notifications table
CREATE POLICY "Authenticated users can manage notifications" ON form_notifications
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for form_analytics table
CREATE POLICY "Authenticated users can view analytics" ON form_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert analytics" ON form_analytics
    FOR INSERT WITH CHECK (true);

-- RLS Policies for form_exports table
CREATE POLICY "Authenticated users can manage exports" ON form_exports
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON forms TO anon;
GRANT INSERT ON form_submissions TO anon;
GRANT SELECT ON form_templates TO anon;

GRANT ALL PRIVILEGES ON forms TO authenticated;
GRANT ALL PRIVILEGES ON form_submissions TO authenticated;
GRANT ALL PRIVILEGES ON form_templates TO authenticated;
GRANT ALL PRIVILEGES ON form_notifications TO authenticated;
GRANT ALL PRIVILEGES ON form_analytics TO authenticated;
GRANT ALL PRIVILEGES ON form_exports TO authenticated;

-- Insert default contact form based on the imported data structure
INSERT INTO forms (title, description, slug, fields, settings) VALUES (
    'Contact Form SCYC',
    'Main contact form for South Caernarvonshire Yacht Club',
    'contact-form-scyc',
    '[
        {
            "id": "names",
            "type": "name",
            "label": "Name",
            "required": true,
            "fields": {
                "first_name": {"label": "First Name", "required": true},
                "last_name": {"label": "Last Name", "required": true}
            }
        },
        {
            "id": "email",
            "type": "email",
            "label": "Email Address",
            "required": true,
            "validation": {"type": "email"}
        },
        {
            "id": "subject",
            "type": "text",
            "label": "Subject",
            "required": true
        },
        {
            "id": "message",
            "type": "textarea",
            "label": "Message",
            "required": true,
            "rows": 5
        },
        {
            "id": "recaptcha",
            "type": "recaptcha",
            "label": "reCAPTCHA",
            "required": true
        }
    ]'::jsonb,
    '{
        "confirmation_message": "Thank you for your message. We will get back to you soon.",
        "email_notifications": {
            "enabled": true,
            "to": "info@scyc.co.uk",
            "reply_to": "{inputs.email}",
            "subject": "New Contact Form Submission: {inputs.subject}"
        },
        "custom_css": ".fluentform * { box-sizing: border-box; } .fluentform .ff-el-group { margin-bottom: 20px; }",
        "recaptcha": {
            "enabled": true,
            "site_key": ""
        }
    }'::jsonb
);

-- Create notification settings for the contact form
INSERT INTO form_notifications (form_id, type, recipients, subject, message, is_active)
SELECT 
    id,
    'submission',
    ARRAY['info@scyc.co.uk'],
    'New Contact Form Submission: {subject}',
    'A new contact form submission has been received:\n\nName: {names}\nEmail: {email}\nSubject: {subject}\nMessage: {message}\n\nSubmitted at: {created_at}',
    true
FROM forms WHERE slug = 'contact-form-scyc';

COMMIT;