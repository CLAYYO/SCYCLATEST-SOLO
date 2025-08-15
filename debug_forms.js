import { supabase } from './src/lib/supabase.js';

async function debugForms() {
  console.log('=== Debugging Forms Administration ===\n');
  
  // Check forms table
  const { data: forms, error: formsError } = await supabase
    .from('forms')
    .select('*');
  
  if (formsError) {
    console.error('Error fetching forms:', formsError);
    return;
  }
  
  console.log('Forms in database:', forms.length);
  forms.forEach(form => {
    console.log(`- ${form.title} (ID: ${form.id}, Status: ${form.status})`);
  });
  
  // Check form submissions with form_id analysis
  const { data: submissions, error: submissionsError } = await supabase
    .from('form_submissions')
    .select('id, form_id, serial_number, created_at');
  
  if (submissionsError) {
    console.error('Error fetching submissions:', submissionsError);
    return;
  }
  
  console.log('\nTotal submissions:', submissions.length);
  
  // Group by form_id
  const groupedByFormId = submissions.reduce((acc, sub) => {
    const formId = sub.form_id || 'NULL';
    if (!acc[formId]) acc[formId] = [];
    acc[formId].push(sub);
    return acc;
  }, {});
  
  console.log('\nSubmissions grouped by form_id:');
  Object.entries(groupedByFormId).forEach(([formId, subs]) => {
    console.log(`- form_id: ${formId} -> ${subs.length} submissions`);
  });
  
  // Check if any submissions have NULL form_id
  const nullFormIdCount = submissions.filter(s => !s.form_id).length;
  console.log(`\nSubmissions with NULL form_id: ${nullFormIdCount}`);
  
  // Check specific form linking
  if (forms.length > 0) {
    const contactForm = forms.find(f => f.title.includes('Contact'));
    if (contactForm) {
      const { count } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', contactForm.id);
      
      console.log(`\nContact Form SCYC (${contactForm.id}) has ${count} linked submissions`);
    }
  }
}

debugForms().catch(console.error);