// Simple script to check forms table
import { createClient } from '@supabase/supabase-js';

// Use hardcoded credentials from DebugFormSubmissions.tsx
const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM0MTMsImV4cCI6MjA3MDc0OTQxM30.Yd_HbAmGRxKGXEMzLSFwt-OGjZEgMOlLRnZ9NWEpbIQ';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key:', supabaseAnonKey.substring(0, 10) + '...');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkForms() {
  console.log('Checking forms table...');
  
  try {
    // Check if forms table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      return;
    }
    
    console.log('Tables in public schema:', tables.map(t => t.table_name));
    
    // Check forms table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'forms');
    
    if (columnsError) {
      console.error('Error checking forms columns:', columnsError);
      return;
    }
    
    console.log('Forms table columns:', columns);
    
    // Get all forms
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('*');
    
    if (formsError) {
      console.error('Error fetching forms:', formsError);
      return;
    }
    
    console.log('Forms count:', forms?.length || 0);
    console.log('Forms data:', forms);
    
    // Check form_submissions table
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('id, form_id')
      .limit(5);
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return;
    }
    
    console.log('Sample submissions:', submissions);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkForms();