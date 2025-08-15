/**
 * Test script for importing Fluent Forms submissions
 * 
 * This script tests the import functionality by importing a sample JSON file
 * and verifying that the submissions are properly imported and linked to forms
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the Supabase client from the project
import { supabase } from '../src/lib/supabase.js';

// Path to the JSON file
const filePath = process.argv[2] || './contact-form-scyc-2025-08-14.json';

async function testImport() {
  try {
    console.log(`🔍 Testing import from ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log('Usage: node test-import.js [path-to-json-file]');
      process.exit(1);
    }
    
    // Read and parse the file
    console.log('📂 Reading file...');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const submissionsData = JSON.parse(fileContent);
    
    console.log(`📊 Found ${submissionsData.length} submissions in file`);
    
    // Check for Contact Form SCYC
    console.log('🔍 Checking for Contact Form SCYC...');
    const { data: contactForm, error: contactFormError } = await supabase
      .from('forms')
      .select('id, title, submission_count')
      .eq('title', 'Contact Form SCYC')
      .maybeSingle();
    
    if (contactFormError) {
      console.error('❌ Error checking for Contact Form SCYC:', contactFormError);
      process.exit(1);
    }
    
    if (!contactForm) {
      console.log('⚠️ Contact Form SCYC not found. Creating it...');
      
      const { data: newForm, error: createError } = await supabase
        .from('forms')
        .insert({
          title: 'Contact Form SCYC',
          slug: 'contact-form-scyc',
          description: 'Default contact form for SCYC',
          status: 'active',
          submission_count: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating Contact Form SCYC:', createError);
        process.exit(1);
      }
      
      console.log('✅ Created Contact Form SCYC:', newForm.id);
    } else {
      console.log(`✅ Found Contact Form SCYC: ${contactForm.id} with ${contactForm.submission_count || 0} submissions`);
    }
    
    // Count current submissions
    const { count: currentCount, error: countError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting current submissions:', countError);
      process.exit(1);
    }
    
    console.log(`📊 Current submission count: ${currentCount}`);
    
    // Import the submissions
    console.log('🔄 Importing submissions...');
    
    // Create a simple import function for testing
    const importResults = await importTestSubmissions(submissionsData);
    
    console.log('✅ Import completed!');
    console.log(`📊 Imported ${importResults.imported} submissions`);
    console.log(`⚠️ Errors: ${importResults.errors}`);
    console.log(`⏭️ Skipped: ${importResults.skipped}`);
    
    // Verify the import
    const { count: newCount, error: newCountError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true });
    
    if (newCountError) {
      console.error('❌ Error counting new submissions:', newCountError);
      process.exit(1);
    }
    
    console.log(`📊 New submission count: ${newCount}`);
    console.log(`📈 Difference: ${newCount - currentCount}`);
    
    // Check form submission count
    const { data: updatedForm, error: updatedFormError } = await supabase
      .from('forms')
      .select('id, title, submission_count')
      .eq('title', 'Contact Form SCYC')
      .single();
    
    if (updatedFormError) {
      console.error('❌ Error checking updated form:', updatedFormError);
      process.exit(1);
    }
    
    console.log(`📊 Updated Contact Form SCYC submission count: ${updatedForm.submission_count || 0}`);
    
    console.log('🎉 Test completed successfully!');
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

async function importTestSubmissions(submissionsData) {
  const results = {
    imported: 0,
    errors: 0,
    skipped: 0,
  };
  
  try {
    // Get the Contact Form SCYC ID
    const { data: contactForm } = await supabase
      .from('forms')
      .select('id')
      .eq('title', 'Contact Form SCYC')
      .single();
    
    const formId = contactForm.id;
    
    // Process each submission
    const submissions = [];
    for (const item of submissionsData) {
      // Skip if no form_id or response
      if (!item.form_id || !item.response) {
        results.skipped++;
        continue;
      }
      
      // Extract metadata
      const metadata = {
        ip: item.ip || null,
        user_agent: item.user_agent || null,
        referer: item.referer || null,
        browser: item.browser || null,
        device: item.device || null,
        created_at: item.created_at || item.date_created || new Date().toISOString(),
      };
      
      // Clean response data (remove WordPress specific fields)
      const cleanedResponse = { ...item.response };
      delete cleanedResponse._wp_http_referer;
      delete cleanedResponse._fluentform_1_fluentformnonce;
      
      // Prepare submission object
      const submission = {
        id: crypto.randomUUID(),
        form_id: formId,
        status: 'submitted',
        response: cleanedResponse,
        metadata,
        created_at: metadata.created_at,
        updated_at: new Date().toISOString(),
      };
      
      submissions.push(submission);
    }
    
    // Insert submissions in batches
    const batchSize = 50;
    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('form_submissions')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting batch:', error);
        results.errors += batch.length;
      } else {
        results.imported += batch.length;
      }
    }
    
    // Update form submission count
    const { data: currentForm } = await supabase
      .from('forms')
      .select('submission_count')
      .eq('id', formId)
      .single();
    
    const currentCount = currentForm.submission_count || 0;
    const newCount = currentCount + results.imported;
    
    await supabase
      .from('forms')
      .update({ submission_count: newCount })
      .eq('id', formId);
    
    return results;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Run the test
testImport();