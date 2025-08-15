import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3MzQxMywiZXhwIjoyMDcwNzQ5NDEzfQ.zlDEyT3yCo6zKqu8eRd1a-Je-YxJgHRstzxcXdca02Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubmissionDistribution() {
  try {
    console.log('Checking submission distribution across forms...');
    
    // Get all forms
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title, submission_count')
      .order('title');
    
    if (formsError) {
      console.error('Error fetching forms:', formsError);
      return;
    }
    
    // Get all submissions grouped by form_id
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('form_id');
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return;
    }
    
    // Count submissions per form
    const submissionCounts = {};
    submissions.forEach(s => {
      submissionCounts[s.form_id] = (submissionCounts[s.form_id] || 0) + 1;
    });
    
    console.log('\nForms with submission counts:');
    console.log('=====================================');
    
    let totalStoredCount = 0;
    let totalActualCount = 0;
    
    forms.forEach(form => {
      const actualCount = submissionCounts[form.id] || 0;
      const storedCount = form.submission_count || 0;
      
      totalStoredCount += storedCount;
      totalActualCount += actualCount;
      
      const status = actualCount > 0 ? '✅' : '❌';
      console.log(`${status} ${form.title}:`);
      console.log(`   Stored count: ${storedCount}`);
      console.log(`   Actual count: ${actualCount}`);
      console.log('');
    });
    
    console.log('Summary:');
    console.log(`Total forms: ${forms.length}`);
    console.log(`Total stored submission count: ${totalStoredCount}`);
    console.log(`Total actual submissions: ${totalActualCount}`);
    console.log(`Forms with submissions: ${forms.filter(f => (submissionCounts[f.id] || 0) > 0).length}`);
    console.log(`Forms without submissions: ${forms.filter(f => (submissionCounts[f.id] || 0) === 0).length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSubmissionDistribution();