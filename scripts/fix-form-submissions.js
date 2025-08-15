import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = 'https://eeqjqhqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcWpxaHFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM0MjQwMDAsImV4cCI6MjAwOTAwMDAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFormSubmissions() {
  console.log('Starting form submissions fix...');
  
  try {
    // Get the Contact Form SCYC ID
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('title', 'Contact Form SCYC')
      .limit(1);
    
    if (formsError) {
      throw formsError;
    }
    
    let contactFormId;
    
    if (!forms || forms.length === 0) {
      console.log('Contact Form SCYC not found. Creating it...');
      
      // Create the form if it doesn't exist
      const { data: newForm, error: createError } = await supabase
        .from('forms')
        .insert({
          title: 'Contact Form SCYC',
          slug: 'contact-form-scyc',
          description: 'Main contact form for South Caernarvonshire Yacht Club',
          status: 'active'
        })
        .select()
        .single();
      
      if (createError) {
        throw createError;
      }
      
      console.log('Created Contact Form SCYC with ID:', newForm.id);
      contactFormId = newForm.id;
    } else {
      console.log('Found Contact Form SCYC with ID:', forms[0].id);
      contactFormId = forms[0].id;
    }
    
    // Count submissions with NULL form_id
    const { count, error: countError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .is('form_id', null);
    
    if (countError) {
      throw countError;
    }
    
    console.log(`Found ${count} submissions with NULL form_id`);
    
    if (count > 0) {
      // Update submissions to link with the contact form
      const { data, error: updateError } = await supabase
        .from('form_submissions')
        .update({ form_id: contactFormId })
        .is('form_id', null);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`Successfully linked ${count} submissions to Contact Form SCYC`);
    }
    
    // Verify the update
    const { count: verifyCount, error: verifyError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', contactFormId);
    
    if (verifyError) {
      throw verifyError;
    }
    
    console.log(`Verification: ${verifyCount} submissions are now linked to Contact Form SCYC`);
    
  } catch (error) {
    console.error('Error fixing form submissions:', error);
  }
}

fixFormSubmissions();
