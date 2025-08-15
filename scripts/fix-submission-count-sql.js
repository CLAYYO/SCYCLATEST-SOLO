import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

async function fixSubmissionCount() {
  try {
    console.log('Adding submission_count column to forms table...');
    
    // Step 1: Add the column if it doesn't exist
    const { error: addColumnError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;'
    });
    
    if (addColumnError) {
      console.error('Error adding column:', addColumnError);
      console.log('\nPlease run this SQL in your Supabase dashboard:');
      console.log('ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;');
      return;
    }
    
    console.log('Column added successfully or already exists.');
    
    // Step 2: Update submission counts for all forms
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
    
    // Step 3: Create index for faster queries
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);'
    });
    
    if (indexError) {
      console.error('Error creating index:', indexError);
    } else {
      console.log('\nIndex created successfully or already exists.');
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixSubmissionCount();