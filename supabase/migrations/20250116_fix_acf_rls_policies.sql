-- Fix RLS policies for ACF tables to allow service role access
-- This ensures that admin operations using supabaseServer can bypass RLS policies

-- ACF People table policies
CREATE POLICY "Service role can manage all acf_people" ON acf_people
    FOR ALL USING (auth.role() = 'service_role');

-- ACF Events table policies
CREATE POLICY "Service role can manage all acf_events" ON acf_events
    FOR ALL USING (auth.role() = 'service_role');

-- ACF Classes table policies
CREATE POLICY "Service role can manage all acf_classes" ON acf_classes
    FOR ALL USING (auth.role() = 'service_role');

-- ACF Friends table policies
CREATE POLICY "Service role can manage all acf_friends" ON acf_friends
    FOR ALL USING (auth.role() = 'service_role');

-- ACF Local Accommodations table policies
CREATE POLICY "Service role can manage all acf_local_accommodations" ON acf_local_accommodations
    FOR ALL USING (auth.role() = 'service_role');

-- ACF Opening Times table policies
CREATE POLICY "Service role can manage all acf_opening_times" ON acf_opening_times
    FOR ALL USING (auth.role() = 'service_role');

-- ACF Rules Documents table policies
CREATE POLICY "Service role can manage all acf_rules_documents" ON acf_rules_documents
    FOR ALL USING (auth.role() = 'service_role');

-- Ensure proper permissions are granted to service role for ACF tables
GRANT ALL PRIVILEGES ON acf_people TO service_role;
GRANT ALL PRIVILEGES ON acf_events TO service_role;
GRANT ALL PRIVILEGES ON acf_classes TO service_role;
GRANT ALL PRIVILEGES ON acf_friends TO service_role;
GRANT ALL PRIVILEGES ON acf_local_accommodations TO service_role;
GRANT ALL PRIVILEGES ON acf_opening_times TO service_role;
GRANT ALL PRIVILEGES ON acf_rules_documents TO service_role;