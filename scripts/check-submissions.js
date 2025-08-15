import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubmissions() {
  try {
    // Get Contact Form SCYC
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('title', 'Contact Form SCYC');
    
    if (formsError) {
      console.error('Forms error:', formsError);
      return;
    }
    
    if (!forms || forms.length === 0) {
      console.log('Contact Form SCYC not found');
      return;
    }
    
    const formId = forms[0].id;
    console.log('Contact Form SCYC ID:', formId);
    
    // Count submissions for this form
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('form_id', formId);
    
    if (submissionsError) {
      console.error('Submissions error:', submissionsError);
      return;
    }
    
    console.log(`Submissions count for Contact Form SCYC: ${submissions ? submissions.length : 0}`);
    
    // Check for submissions with NULL form_id
    const { data: nullSubmissions, error: nullError } = await supabase
      .from('form_submissions')
      .select('id')
      .is('form_id', null);
    
    if (nullError) {
      console.error('Null submissions error:', nullError);
      return;
    }
    
    console.log(`Submissions with NULL form_id: ${nullSubmissions ? nullSubmissions.length : 0}`);
    
  } catch (e) {
    console.error('Exception:', e);
  }
}

checkSubmissions();