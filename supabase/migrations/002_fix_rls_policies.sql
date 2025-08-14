-- Fix RLS policies to prevent infinite recursion
-- The issue is that policies are checking the members table while trying to insert into it

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all members" ON members;
DROP POLICY IF EXISTS "Admins can manage all boats" ON boats;
DROP POLICY IF EXISTS "Admins can manage races" ON races;
DROP POLICY IF EXISTS "Admins can manage race results" ON race_results;
DROP POLICY IF EXISTS "Admins can manage events" ON events;
DROP POLICY IF EXISTS "Admins can manage all news" ON news;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage menu items" ON menus;

-- Create new policies that allow service role access without circular references
-- Members table policies
CREATE POLICY "Service role can manage all members" ON members
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert members" ON members
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Boats table policies
CREATE POLICY "Service role can manage all boats" ON boats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert boats" ON boats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Races table policies
CREATE POLICY "Service role can manage all races" ON races
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert races" ON races
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Race results table policies
CREATE POLICY "Service role can manage all race results" ON race_results
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert race results" ON race_results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Events table policies
CREATE POLICY "Service role can manage all events" ON events
    FOR ALL USING (auth.role() = 'service_role');

-- News table policies
CREATE POLICY "Service role can manage all news" ON news
    FOR ALL USING (auth.role() = 'service_role');

-- Documents table policies
CREATE POLICY "Service role can manage all documents" ON documents
    FOR ALL USING (auth.role() = 'service_role');

-- Menus table policies
CREATE POLICY "Service role can manage all menus" ON menus
    FOR ALL USING (auth.role() = 'service_role');

-- Ensure proper permissions are granted
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;