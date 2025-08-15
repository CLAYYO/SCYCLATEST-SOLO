// Script to verify form submission counts
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFormCounts() {
  try {
    console.log('Verifying form submission counts...');
    
    // Check if submission_count column exists
    const { data: columnExists, error: columnError } = await supabase
      .from('forms')
      .select('submission_count')
      .limit(1);
    
    const hasSubmissionCountColumn = !columnError;
    console.log(`submission_count column exists: ${hasSubmissionCountColumn}`);
    
    // Get all forms
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('*');
    
    if (formsError) {
      throw formsError;
    }
    
    console.log(`Found ${forms.length} forms`);
    
    // Get all form submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('id, form_id');
    
    if (submissionsError) {
      throw submissionsError;
    }
    
    console.log(`Found ${submissions.length} form submissions`);
    
    // Count submissions for each form
    const submissionCounts = {};
    submissions.forEach(submission => {
      if (submission.form_id) {
        submissionCounts[submission.form_id] = (submissionCounts[submission.form_id] || 0) + 1;
      }
    });
    
    // Verify counts for each form
    forms.forEach(form => {
      const actualCount = submissionCounts[form.id] || 0;
      const storedCount = form.submission_count !== undefined ? form.submission_count : 'N/A';
      
      console.log(`Form: ${form.title}`);
      console.log(`  ID: ${form.id}`);
      console.log(`  Stored count: ${storedCount}`);
      console.log(`  Actual count: ${actualCount}`);
      
      if (storedCount !== 'N/A' && storedCount !== actualCount) {
        console.log(`  MISMATCH: Stored count (${storedCount}) does not match actual count (${actualCount})`);
      }
      console.log('---');
    });
    
    // Check for Contact Form SCYC specifically
    const contactForm = forms.find(form => form.title === 'Contact Form SCYC');
    if (contactForm) {
      const contactFormId = contactForm.id;
      const contactFormSubmissions = submissions.filter(s => s.form_id === contactFormId);
      
      console.log('\nContact Form SCYC Details:');
      console.log(`  ID: ${contactFormId}`);
      console.log(`  Submission count in DB: ${contactForm.submission_count !== undefined ? contactForm.submission_count : 'N/A'}`);
      console.log(`  Actual submissions: ${contactFormSubmissions.length}`);
      
      // List the first 5 submission IDs for verification
      if (contactFormSubmissions.length > 0) {
        console.log('  Sample submission IDs:');
        contactFormSubmissions.slice(0, 5).forEach(s => {
          console.log(`    - ${s.id}`);
        });
      }
    } else {
      console.log('\nContact Form SCYC not found!');
    }
    
  } catch (error) {
    console.error('Error verifying form counts:', error);
  }
}

verifyFormCounts();