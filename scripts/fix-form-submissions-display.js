/**
 * Fix Form Submissions Display Script
 * 
 * This script addresses issues with displaying imported form submissions from Fluent Forms
 * by ensuring proper linking between submissions and forms, and updating submission counts.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with hardcoded credentials
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixFormSubmissionsDisplay() {
  try {
    console.log('🔍 Starting form submissions display fix...');
    
    // Step 1: Find the Contact Form SCYC
    console.log('Step 1: Finding Contact Form SCYC...');
    const { data: contactForm, error: contactFormError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('title', 'Contact Form SCYC')
      .maybeSingle();
    
    if (contactFormError) {
      console.error('❌ Error finding Contact Form SCYC:', contactFormError);
      throw contactFormError;
    }
    
    let contactFormId;
    if (!contactForm) {
      console.log('⚠️ Contact Form SCYC not found, creating it...');
      
      const { data: newForm, error: createError } = await supabase
        .from('forms')
        .insert({
          title: 'Contact Form SCYC',
          description: 'Default contact form for SCYC website',
          status: 'active',
          slug: 'contact-form-scyc'
        })
        .select();
      
      if (createError) {
        console.error('❌ Error creating Contact Form SCYC:', createError);
        throw createError;
      }
      
      console.log('✅ Created Contact Form SCYC:', newForm[0]);
      contactFormId = newForm[0].id;
    } else {
      console.log('✅ Found Contact Form SCYC:', contactForm);
      contactFormId = contactForm.id;
    }
    
    // Step 2: Count submissions for Contact Form SCYC
    console.log('Step 2: Counting submissions for Contact Form SCYC...');
    const { count: submissionCount, error: countError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', contactFormId);
    
    if (countError) {
      console.error('❌ Error counting submissions:', countError);
      throw countError;
    }
    
    console.log(`✅ Found ${submissionCount} submissions for Contact Form SCYC`);
    
    // Step 3: Update the submission_count in the forms table
    console.log('Step 3: Updating submission_count in forms table...');
    
    // First check if submission_count column exists
    const { data: columnCheck, error: columnCheckError } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'forms', 
        column_name: 'submission_count' 
      });
    
    if (columnCheckError) {
      console.error('❌ Error checking for submission_count column:', columnCheckError);
      console.log('⚠️ Will attempt to update anyway...');
    }
    
    // If column doesn't exist, we'll need to add it
    if (columnCheck === false) {
      console.log('⚠️ submission_count column does not exist, adding it...');
      
      // This requires admin privileges, so we'll provide instructions
      console.log('⚠️ Please run the following SQL in your Supabase dashboard:');
      console.log('ALTER TABLE forms ADD COLUMN submission_count INTEGER DEFAULT 0;');
    }
    
    // Try to update the submission_count
    const { error: updateError } = await supabase
      .from('forms')
      .update({ submission_count: submissionCount })
      .eq('id', contactFormId);
    
    if (updateError) {
      console.error('❌ Error updating submission_count:', updateError);
      console.log('⚠️ The submission_count column might not exist in the forms table.');
      console.log('⚠️ The UI will calculate counts from the submissions table instead.');
    } else {
      console.log(`✅ Updated submission_count to ${submissionCount} for Contact Form SCYC`);
    }
    
    // Step 4: Check for submissions with NULL form_id
    console.log('Step 4: Checking for submissions with NULL form_id...');
    const { data: nullSubmissions, error: nullCountError } = await supabase
      .from('form_submissions')
      .select('id', { count: 'exact' })
      .is('form_id', null);
    
    if (nullCountError) {
      console.error('❌ Error counting NULL form_id submissions:', nullCountError);
    } else {
      console.log(`✅ Found ${nullSubmissions?.length || 0} submissions with NULL form_id`);
      
      if (nullSubmissions && nullSubmissions.length > 0) {
        console.log('Step 4a: Fixing submissions with NULL form_id...');
        
        const { error: updateNullError } = await supabase
          .from('form_submissions')
          .update({ form_id: contactFormId })
          .is('form_id', null);
        
        if (updateNullError) {
          console.error('❌ Error updating NULL form_id submissions:', updateNullError);
        } else {
          console.log(`✅ Updated ${nullSubmissions.length} submissions with NULL form_id`);
        }
      }
    }
    
    // Step 5: Verify the fix worked
    console.log('Step 5: Verifying fix...');
    const { data: verifyForm, error: verifyError } = await supabase
      .from('forms')
      .select('id, title, submission_count')
      .eq('id', contactFormId)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying fix:', verifyError);
    } else {
      console.log('✅ Verification result:', verifyForm);
      
      // Count submissions again to double-check
      const { count: verifyCount, error: verifyCountError } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', contactFormId);
      
      if (verifyCountError) {
        console.error('❌ Error verifying submission count:', verifyCountError);
      } else {
        console.log(`✅ Verified submission count: ${verifyCount}`);
        
        if (verifyForm.submission_count !== verifyCount) {
          console.log('⚠️ Submission count mismatch:');
          console.log(`   - forms.submission_count: ${verifyForm.submission_count || 0}`);
          console.log(`   - Actual submissions: ${verifyCount}`);
          console.log('⚠️ The UI will calculate counts from the submissions table.');
        } else {
          console.log('✅ Submission counts match! Fix successful.');
        }
      }
    }
    
    console.log('🎉 Form submissions display fix completed!');
    
  } catch (error) {
    console.error('💥 Fix failed:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixFormSubmissionsDisplay();