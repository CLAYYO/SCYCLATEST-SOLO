-- Create ACF Local Accommodations table
CREATE TABLE IF NOT EXISTS acf_local_accommodations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL, -- Business name from WordPress title
    content TEXT, -- WordPress editor content
    business_name TEXT, -- ACF field for business name
    address TEXT, -- ACF field for address
    phone TEXT, -- ACF field for phone number
    website TEXT, -- ACF field for website URL
    blurb TEXT, -- ACF field for description
    category TEXT, -- ACF field for accommodation category
    
    -- Image field
    image_url TEXT,
    image_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE acf_local_accommodations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON acf_local_accommodations
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON acf_local_accommodations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" ON acf_local_accommodations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete" ON acf_local_accommodations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON acf_local_accommodations TO anon;
GRANT ALL PRIVILEGES ON acf_local_accommodations TO authenticated;

-- Create updated_at trigger
CREATE TRIGGER update_acf_local_accommodations_updated_at
    BEFORE UPDATE ON acf_local_accommodations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();