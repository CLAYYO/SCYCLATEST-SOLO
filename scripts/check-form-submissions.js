import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to check if a column exists in a table
async function checkColumnExists(tableName, columnName) {
  try {
    const { data, error } = await supabase.rpc('check_column_exists', { 
      table_name: tableName, 
      column_name: columnName 
    });
    
    if (error) {
      // If the RPC function doesn't exist, use a direct query
      const { data: result, error: queryError } = await supabase.from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('column_name', columnName);
      
      if (queryError) {
        console.error('Error checking column existence:', queryError);
        return false;
      }
      
      return result && result.length > 0;
    }
    
    return data;
  } catch (err) {
    console.error('Error checking column existence:', err);
    return false;
  }
}

async function checkFormSubmissions() {
  try {
    console.log('Checking form submissions...');
    
    // Check if submission_count column exists
    const submissionCountExists = await checkColumnExists('forms', 'submission_count');
    console.log(`submission_count column exists: ${submissionCountExists}`);
    
    if (!submissionCountExists) {
      console.log('\nThe submission_count column does not exist in the forms table.');
      console.log('Adding the column with this SQL:');
      console.log('ALTER TABLE forms ADD COLUMN submission_count INTEGER DEFAULT 0;');
      
      // Try to add the column
      try {
        const { error } = await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;'
        });
        
        if (error) {
          console.log('\nCould not automatically add the column. Please run the SQL manually.');
          console.log('Error:', error.message);
        } else {
          console.log('\nSuccessfully added submission_count column to forms table.');
        }
      } catch (err) {
        console.log('\nCould not automatically add the column. Please run the SQL manually.');
        console.log('Error:', err.message);
      }
    }
    
    // Get all forms (with or without submission_count)
    let formsQuery = supabase.from('forms').select('id, title');
    if (submissionCountExists) {
      formsQuery = supabase.from('forms').select('id, title, submission_count');
    }
    
    const { data: forms, error: formsError } = await formsQuery;
    
    if (formsError) {
      throw formsError;
    }
    
    console.log('Forms in database:', forms.length);
    console.log('Forms with submission counts:');
    forms.forEach(form => {
      const count = form.submission_count !== undefined ? form.submission_count : 'N/A';
      console.log(`- ${form.title}: ${count} submissions (ID: ${form.id})`);
    });
    
    // Get all submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('id, form_id, created_at');
    
    if (submissionsError) {
      throw submissionsError;
    }
    
    console.log('\nTotal submissions in database:', submissions.length);
    
    // Count submissions by form
    const submissionsByForm = {};
    submissions.forEach(submission => {
      const formId = submission.form_id || 'null';
      submissionsByForm[formId] = (submissionsByForm[formId] || 0) + 1;
    });
    
    console.log('\nSubmissions count by form ID:');
    for (const [formId, count] of Object.entries(submissionsByForm)) {
      const form = forms.find(f => f.id === formId);
      const formName = form ? form.title : 'Unknown Form';
      console.log(`- ${formName} (${formId}): ${count} submissions`);
      
      // Check if the count matches the form's submission_count (if the column exists)
      if (form && form.submission_count !== undefined && form.submission_count !== count) {
        console.log(`  WARNING: Mismatch between actual count (${count}) and stored submission_count (${form.submission_count})`);
      }
    }
    
    // Check for submissions with null form_id
    const nullFormSubmissions = submissions.filter(s => s.form_id === null);
    if (nullFormSubmissions.length > 0) {
      console.log(`\nFound ${nullFormSubmissions.length} submissions with NULL form_id`);
    }
    
    // Check for Contact Form SCYC specifically
    const contactForm = forms.find(f => f.title === 'Contact Form SCYC');
    if (contactForm) {
      const contactFormSubmissions = submissions.filter(s => s.form_id === contactForm.id);
      console.log(`\nContact Form SCYC (${contactForm.id}):`);
      console.log(`- Actual submissions: ${contactFormSubmissions.length}`);
      
      if (contactForm.submission_count !== undefined) {
        console.log(`- Stored submission_count: ${contactForm.submission_count}`);
        
        if (contactFormSubmissions.length !== contactForm.submission_count) {
          console.log('- FIXING submission count mismatch...');
          
          try {
            const { error: updateError } = await supabase
              .from('forms')
              .update({ submission_count: contactFormSubmissions.length })
              .eq('id', contactForm.id);
            
            if (updateError) {
              console.error('  Error updating submission count:', updateError);
            } else {
              console.log(`  Updated submission_count to ${contactFormSubmissions.length}`);
            }
          } catch (err) {
            if (err.message && err.message.includes('does not exist')) {
              console.log('  Cannot update submission_count as the column does not exist yet.');
            } else {
              console.error('  Error updating submission count:', err);
            }
          }
        }
      } else {
        console.log('- Cannot check stored submission_count as the column does not exist yet.');
      }
    } else {
      console.log('\nContact Form SCYC not found in the database');
    }
    
  } catch (error) {
    console.error('Error checking form submissions:', error);
  }
}

checkFormSubmissions();