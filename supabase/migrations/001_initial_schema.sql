-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    membership_type VARCHAR(20) CHECK (membership_type IN ('full', 'associate', 'junior', 'honorary')) NOT NULL,
    membership_number VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    emergency_contact TEXT,
    sailing_experience TEXT,
    boat_ownership BOOLEAN DEFAULT false,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    joined_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create boats table
CREATE TABLE boats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES members(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sail_number VARCHAR(50) NOT NULL,
    boat_class VARCHAR(100) NOT NULL,
    length DECIMAL(5,2),
    beam DECIMAL(5,2),
    draft DECIMAL(5,2),
    year_built INTEGER,
    designer VARCHAR(100),
    builder VARCHAR(100),
    hull_material VARCHAR(50),
    engine_type VARCHAR(100),
    berth_location VARCHAR(100),
    insurance_expiry DATE,
    safety_certificate_expiry DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create races table
CREATE TABLE races (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID,
    name VARCHAR(200) NOT NULL,
    race_date DATE NOT NULL,
    start_time TIME,
    boat_class VARCHAR(100) NOT NULL,
    division VARCHAR(50),
    venue VARCHAR(200),
    course_description TEXT,
    wind_conditions VARCHAR(200),
    weather_conditions VARCHAR(200),
    race_officer VARCHAR(100),
    results_published BOOLEAN DEFAULT false,
    results_provisional BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create race_results table
CREATE TABLE race_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_id UUID REFERENCES races(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
    sailor_name VARCHAR(200) NOT NULL,
    sail_number VARCHAR(50) NOT NULL,
    division VARCHAR(50),
    age_group VARCHAR(50),
    finish_position INTEGER,
    points DECIMAL(5,2),
    status VARCHAR(20) CHECK (status IN ('finished', 'dnf', 'dns', 'dnc', 'dsq', 'ret')) NOT NULL,
    elapsed_time INTERVAL,
    corrected_time INTERVAL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) CHECK (event_type IN ('racing', 'social', 'training', 'meeting', 'maintenance')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    location VARCHAR(200),
    organizer VARCHAR(100),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    booking_required BOOLEAN DEFAULT false,
    booking_deadline TIMESTAMP WITH TIME ZONE,
    cost DECIMAL(8,2),
    is_members_only BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    featured_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create news table
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author_id UUID REFERENCES members(id) ON DELETE SET NULL,
    category VARCHAR(20) CHECK (category IN ('general', 'racing', 'social', 'maintenance', 'safety')) NOT NULL,
    featured_image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    category VARCHAR(30) CHECK (category IN ('sailing_instructions', 'notices', 'forms', 'minutes', 'policies', 'other')) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menus table (for The Cove restaurant)
CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(20) CHECK (category IN ('starter', 'main', 'dessert', 'drink', 'special')) NOT NULL,
    price DECIMAL(6,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    dietary_info VARCHAR(200),
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_membership_number ON members(membership_number);
CREATE INDEX idx_boats_owner_id ON boats(owner_id);
CREATE INDEX idx_boats_sail_number ON boats(sail_number);
CREATE INDEX idx_races_date ON races(race_date);
CREATE INDEX idx_races_class ON races(boat_class);
CREATE INDEX idx_race_results_race_id ON race_results(race_id);
CREATE INDEX idx_race_results_boat_id ON race_results(boat_id);
CREATE INDEX idx_events_date ON events(start_date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_published ON news(is_published, published_at);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_public ON documents(is_public);
CREATE INDEX idx_menus_category ON menus(category, display_order);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- RLS Policies for members table
CREATE POLICY "Members can view all members" ON members
    FOR SELECT USING (true);

CREATE POLICY "Members can update their own profile" ON members
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage all members" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for boats table
CREATE POLICY "Anyone can view boats" ON boats
    FOR SELECT USING (true);

CREATE POLICY "Boat owners can manage their boats" ON boats
    FOR ALL USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Admins can manage all boats" ON boats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for races table
CREATE POLICY "Anyone can view published races" ON races
    FOR SELECT USING (results_published = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage races" ON races
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for race_results table
CREATE POLICY "Anyone can view race results" ON race_results
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage race results" ON race_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for events table
CREATE POLICY "Anyone can view published events" ON events
    FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage events" ON events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for news table
CREATE POLICY "Anyone can view published news" ON news
    FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

CREATE POLICY "Authors can manage their news" ON news
    FOR ALL USING (auth.uid()::text = author_id::text);

CREATE POLICY "Admins can manage all news" ON news
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for documents table
CREATE POLICY "Anyone can view public documents" ON documents
    FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

CREATE POLICY "Uploaders can manage their documents" ON documents
    FOR ALL USING (auth.uid()::text = uploaded_by::text);

CREATE POLICY "Admins can manage all documents" ON documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- RLS Policies for menus table
CREATE POLICY "Anyone can view available menu items" ON menus
    FOR SELECT USING (is_available = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage menu items" ON menus
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id::text = auth.uid()::text 
            AND membership_type = 'full'
        )
    );

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_race_results_updated_at BEFORE UPDATE ON race_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();