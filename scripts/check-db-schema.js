/**
 * Check Database Schema Script
 * 
 * This script checks if the necessary columns exist in the database schema
 * and provides SQL commands to add them if they don't.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if the submission_count column exists in the forms table
    const { data, error } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'forms', 
        column_name: 'submission_count' 
      });
    
    if (error) {
      // The RPC function might not exist, so we'll provide the SQL to create it
      console.error('❌ Error checking column existence:', error);
      console.log('\n⚠️ The check_column_exists function might not exist. Create it with this SQL:');
      console.log(`
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM information_schema.columns
  WHERE table_name = $1
  AND column_name = $2;
  
  RETURN exists;
END;
$$ LANGUAGE plpgsql;
`);
      
      // Provide alternative check using information_schema
      console.log('\n⚠️ Alternatively, run this SQL query to check if the column exists:');
      console.log(`
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'forms'
  AND column_name = 'submission_count'
);
`);
    } else {
      if (data === true) {
        console.log('✅ The submission_count column exists in the forms table.');
      } else {
        console.log('⚠️ The submission_count column does NOT exist in the forms table.');
        console.log('\n⚠️ Run this SQL to add the column:');
        console.log('ALTER TABLE forms ADD COLUMN submission_count INTEGER DEFAULT 0;');
      }
    }
    
    // Check if the form_id column exists in the form_submissions table
    const { data: formIdExists, error: formIdError } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'form_submissions', 
        column_name: 'form_id' 
      });
    
    if (formIdError) {
      console.error('❌ Error checking form_id column:', formIdError);
    } else {
      if (formIdExists === true) {
        console.log('✅ The form_id column exists in the form_submissions table.');
      } else {
        console.log('⚠️ The form_id column does NOT exist in the form_submissions table.');
        console.log('\n⚠️ Run this SQL to add the column:');
        console.log('ALTER TABLE form_submissions ADD COLUMN form_id UUID REFERENCES forms(id);');
      }
    }
    
    // Check if the forms table exists
    const { data: formsExists, error: formsError } = await supabase
      .from('forms')
      .select('id')
      .limit(1);
    
    if (formsError && formsError.code === 'PGRST109') {
      console.log('⚠️ The forms table does NOT exist.');
      console.log('\n⚠️ Run this SQL to create the table:');
      console.log(`
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  submission_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`);
    } else if (formsError) {
      console.error('❌ Error checking forms table:', formsError);
    } else {
      console.log('✅ The forms table exists.');
    }
    
    // Check if the form_submissions table exists
    const { data: submissionsExists, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('id')
      .limit(1);
    
    if (submissionsError && submissionsError.code === 'PGRST109') {
      console.log('⚠️ The form_submissions table does NOT exist.');
      console.log('\n⚠️ Run this SQL to create the table:');
      console.log(`
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id),
  serial_number TEXT,
  data JSONB,
  user_inputs JSONB,
  metadata JSONB,
  source_url TEXT,
  status TEXT DEFAULT 'unread',
  is_favourite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`);
    } else if (submissionsError) {
      console.error('❌ Error checking form_submissions table:', submissionsError);
    } else {
      console.log('✅ The form_submissions table exists.');
    }
    
    console.log('\n🎉 Database schema check completed!');
    
  } catch (error) {
    console.error('💥 Schema check failed:', error.message);
    process.exit(1);
  }
}

// Run the schema check
checkDatabaseSchema();