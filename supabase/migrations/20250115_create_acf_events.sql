-- Create ACF Events table
CREATE TABLE IF NOT EXISTS acf_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT, -- WordPress editor content
    event_start_date DATE,
    event_end_date DATE,
    event_category TEXT CHECK (event_category IN ('Mirrors', 'Class 12', 'Mixed Keelboats', 'SCYC Racing', 'Open Event')),
    venue TEXT,
    organiser TEXT,
    entry_form_details TEXT,
    event_noticeboard TEXT, -- WYSIWYG content
    date_for_supaboxes TEXT,
    
    -- File fields
    notice_of_race_url TEXT,
    notice_of_race_filename TEXT,
    dinghy_launching_guide_url TEXT,
    dinghy_launching_guide_filename TEXT,
    event_beach_info_url TEXT,
    event_beach_info_filename TEXT,
    sailing_instructions_url TEXT,
    sailing_instructions_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE acf_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON acf_events
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON acf_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" ON acf_events
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete" ON acf_events
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON acf_events TO anon;
GRANT ALL PRIVILEGES ON acf_events TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_acf_events_updated_at
    BEFORE UPDATE ON acf_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();