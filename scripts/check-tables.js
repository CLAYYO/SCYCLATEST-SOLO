import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using service role key for admin access
const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3MzQxMywiZXhwIjoyMDcwNzQ5NDEzfQ.zlDEyT3yCo6zKqu8eRd1a-Je-YxJgHRstzxcXdca02Q';

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  try {
    console.log('Checking database tables...');
    
    // Try to query the forms table directly
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('*');
    
    if (formsError) {
      console.error('Error fetching forms:', formsError);
      console.log('Forms table may not exist or there might be permission issues.');
      return;
    }
    
    console.log(`Found ${forms.length} forms:`);
    forms.forEach(form => {
      console.log(`- ${form.title} (${form.id})`);
    });
    
    // Check form_submissions table
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('*');
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      console.log('form_submissions table may not exist or there might be permission issues.');
      return;
    }
    
    console.log(`Found ${submissions.length} submissions`);
    
    // Check for submissions with NULL form_id
    const { data: nullFormIdSubmissions, error: nullFormIdError } = await supabase
      .from('form_submissions')
      .select('*')
      .is('form_id', null);
    
    if (nullFormIdError) {
      console.error('Error fetching submissions with NULL form_id:', nullFormIdError);
    } else {
      console.log(`Found ${nullFormIdSubmissions.length} submissions with NULL form_id`);
    }
    
    // Create a default form if none exists
    if (forms.length === 0) {
      console.log('No forms found. Attempting to create a default Contact Form SCYC...');
      
      const { data: newForm, error: createFormError } = await supabase
        .from('forms')
        .insert({
          title: 'Contact Form SCYC',
          description: 'Default contact form for SCYC website',
          slug: 'contact-form-scyc',
          fields: JSON.stringify([
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: true }
          ]),
          settings: JSON.stringify({
            submit_button_text: 'Send Message',
            success_message: 'Thank you for your message. We will get back to you soon.',
            email_notifications: true
          }),
          status: 'active'
        })
        .select();
      
      if (createFormError) {
        console.error('Error creating default form:', createFormError);
      } else {
        console.log('Created default form:', newForm);
      }
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();