import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables from .env file
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const execPromise = promisify(exec);

async function addSubmissionCountColumn() {
  try {
    console.log('Adding submission_count column to forms table...');
    
    // First check if the column already exists
    const { data: columnCheck, error: checkError } = await supabase
      .from('forms')
      .select('submission_count')
      .limit(1);
    
    if (!checkError) {
      console.log('The submission_count column already exists!');
    } else {
      console.log('The submission_count column does not exist. Adding it now...');
      
      // Try using Supabase CLI if available
      try {
        console.log('Attempting to use Supabase CLI to execute SQL...');
        const sql = 'ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;';
        const { stdout, stderr } = await execPromise(`echo "${sql}" | npx supabase db execute`);
        
        if (stderr) {
          console.error('Error with Supabase CLI:', stderr);
        } else {
          console.log('Successfully executed SQL with Supabase CLI:', stdout);
        }
      } catch (cliError) {
        console.error('Error using Supabase CLI:', cliError.message);
        
        // Provide instructions for manual execution
        console.log('\nPlease run this SQL in your Supabase dashboard:');
        console.log('ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;');
        console.log('\nAfter adding the column, run this script again to update the submission counts.');
        return;
      }
    }
    
    console.log('Proceeding with updating submission counts...');
    
    // Now update the submission counts for all forms
    console.log('\nUpdating submission counts for all forms...');
    
    // Get all forms
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title');
    
    if (formsError) {
      console.error('Error getting forms:', formsError);
      return;
    }
    
    // Update submission count for each form
    for (const form of forms) {
      // Count submissions for this form
      const { data: submissions, error: countError } = await supabase
        .from('form_submissions')
        .select('id', { count: 'exact' })
        .eq('form_id', form.id);
      
      if (countError) {
        console.error(`Error counting submissions for form ${form.title}:`, countError);
        continue;
      }
      
      const count = submissions?.length || 0;
      console.log(`Form "${form.title}" has ${count} submissions`);
      
      // Update the form's submission_count
      const { error: updateError } = await supabase
        .from('forms')
        .update({ submission_count: count })
        .eq('id', form.id);
      
      if (updateError) {
        console.error(`Error updating submission count for form ${form.title}:`, updateError);
      } else {
        console.log(`Updated submission count for "${form.title}" to ${count}`);
      }
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  }
}

addSubmissionCountColumn();
