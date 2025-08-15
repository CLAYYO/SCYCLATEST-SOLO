-- Create ACF People table
CREATE TABLE IF NOT EXISTS acf_people (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL, -- Person's name from WordPress title
    content TEXT, -- WordPress editor content
    persons_name TEXT, -- ACF field for person's name
    where_do_they_work TEXT, -- ACF field for workplace
    position TEXT, -- ACF field for position/role
    
    -- Image field
    persons_image_url TEXT,
    persons_image_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE acf_people ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON acf_people
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON acf_people
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" ON acf_people
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete" ON acf_people
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON acf_people TO anon;
GRANT ALL PRIVILEGES ON acf_people TO authenticated;

-- Create updated_at trigger
CREATE TRIGGER update_acf_people_updated_at
    BEFORE UPDATE ON acf_people
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();