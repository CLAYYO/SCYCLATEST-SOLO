-- Create ACF Classes table
CREATE TABLE IF NOT EXISTS acf_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL, -- Class name from WordPress title
    content TEXT, -- WordPress editor content
    class_name TEXT, -- ACF field for class name
    
    -- Image field
    class_image_url TEXT,
    class_image_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create ACF Friends table
CREATE TABLE IF NOT EXISTS acf_friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL, -- Friend name from WordPress title
    content TEXT, -- WordPress editor content
    url TEXT, -- ACF field for friend's website URL
    
    -- Image field
    image_url TEXT,
    image_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create ACF Rules/Info Documents table
CREATE TABLE IF NOT EXISTS acf_rules_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL, -- Document title from WordPress title
    content TEXT, -- WordPress editor content
    
    -- Document file fields
    articles_of_association_url TEXT,
    articles_of_association_filename TEXT,
    club_rules_url TEXT,
    club_rules_filename TEXT,
    sailing_programme_url TEXT,
    sailing_programme_filename TEXT,
    class_2_programme_url TEXT,
    class_2_programme_filename TEXT,
    sailing_instructions_booklet_url TEXT,
    sailing_instructions_booklet_filename TEXT,
    blue_book_url TEXT,
    blue_book_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create ACF Opening Times table
CREATE TABLE IF NOT EXISTS acf_opening_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL, -- Title from WordPress
    content TEXT, -- WordPress editor content
    
    -- WYSIWYG fields
    bar_opening_times TEXT, -- WYSIWYG content
    office_opening_times TEXT, -- WYSIWYG content
    
    -- Image fields
    bar_image_url TEXT,
    bar_image_filename TEXT,
    office_image_url TEXT,
    office_image_filename TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for all tables
ALTER TABLE acf_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE acf_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE acf_rules_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE acf_opening_times ENABLE ROW LEVEL SECURITY;

-- Create policies for acf_classes
CREATE POLICY "Allow public read access" ON acf_classes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON acf_classes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON acf_classes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON acf_classes FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for acf_friends
CREATE POLICY "Allow public read access" ON acf_friends FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON acf_friends FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON acf_friends FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON acf_friends FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for acf_rules_documents
CREATE POLICY "Allow public read access" ON acf_rules_documents FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON acf_rules_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON acf_rules_documents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON acf_rules_documents FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for acf_opening_times
CREATE POLICY "Allow public read access" ON acf_opening_times FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON acf_opening_times FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON acf_opening_times FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON acf_opening_times FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON acf_classes TO anon;
GRANT ALL PRIVILEGES ON acf_classes TO authenticated;
GRANT SELECT ON acf_friends TO anon;
GRANT ALL PRIVILEGES ON acf_friends TO authenticated;
GRANT SELECT ON acf_rules_documents TO anon;
GRANT ALL PRIVILEGES ON acf_rules_documents TO authenticated;
GRANT SELECT ON acf_opening_times TO anon;
GRANT ALL PRIVILEGES ON acf_opening_times TO authenticated;

-- Create updated_at triggers
CREATE TRIGGER update_acf_classes_updated_at
    BEFORE UPDATE ON acf_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acf_friends_updated_at
    BEFORE UPDATE ON acf_friends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acf_rules_documents_updated_at
    BEFORE UPDATE ON acf_rules_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acf_opening_times_updated_at
    BEFORE UPDATE ON acf_opening_times
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();