import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixFormCounts() {
  try {
    console.log('Starting form counts fix...');
    
    // Get the Contact Form SCYC ID
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('title', 'Contact Form SCYC')
      .limit(1);
    
    if (formsError) {
      throw formsError;
    }
    
    if (!forms || forms.length === 0) {
      console.log('Contact Form SCYC not found');
      return;
    }
    
    const contactFormId = forms[0].id;
    console.log('Found Contact Form SCYC with ID:', contactFormId);
    
    // Count submissions for this form
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('form_id', contactFormId);
    
    if (submissionsError) {
      throw submissionsError;
    }
    
    console.log(`Found ${submissions?.length || 0} submissions for Contact Form SCYC`);
    
    // Update the form with the submission count
    const { data: updateData, error: updateError } = await supabase
      .from('forms')
      .update({ submission_count: submissions?.length || 0 })
      .eq('id', contactFormId)
      .select();
    
    if (updateError) {
      // If the column doesn't exist, we'll get an error
      console.log('Error updating form submission count:', updateError.message);
      console.log('This is expected if the submission_count column does not exist in the forms table');
    } else {
      console.log('Updated form submission count successfully');
    }
    
    // Check for any submissions with NULL form_id
    const { data: nullSubmissions, error: nullError } = await supabase
      .from('form_submissions')
      .select('id')
      .is('form_id', null);
    
    if (nullError) {
      throw nullError;
    }
    
    console.log(`Found ${nullSubmissions?.length || 0} submissions with NULL form_id`);
    
    if (nullSubmissions && nullSubmissions.length > 0) {
      // Update submissions to link with the contact form
      const { data: updateNullData, error: updateNullError } = await supabase
        .from('form_submissions')
        .update({ form_id: contactFormId })
        .is('form_id', null);
      
      if (updateNullError) {
        throw updateNullError;
      }
      
      console.log(`Successfully linked ${nullSubmissions.length} submissions to Contact Form SCYC`);
    }
    
    console.log('Form counts fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing form counts:', error);
  }
}

fixFormCounts();