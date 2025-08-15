#!/usr/bin/env node

/**
 * Import Form Submissions from Exports Script
 * Imports submission data from individual JSON files in /forms/Exports/ into Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3MzQxMywiZXhwIjoyMDcwNzQ5NDEzfQ.zlDEyT3yCo6zKqu8eRd1a-Je-YxJgHRstzxcXdca02Q';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Form ID mapping based on FluentForm IDs to our database slugs
const FORM_ID_MAPPING = {
  '1': 'contact-form-scyc',
  '6': 'abersoch-keelboat-week-entry',
  '7': 'membership-application-form',
  '8': 'members-boat-details-form',
  '9': 'rya-booking-form-shore-based',
  '10': 'open-event-enquiry-form',
  '11': 'august-dinghy-coaching-entry-form-2024',
  '12': 'abersoch-mirror-week-entry-form',
  '13': 'abersoch-dinghy-week-step-form-22-2025-year',
  '14': '76th-edinburgh-cup',
  '20': 'abersoch-keelboat-week-entry-20'
};

// Function to create slug from filename
function createSlugFromFilename(filename) {
  return filename
    .replace('.json', '')
    .replace(/-2025-08-15$/, '') // Remove date suffix
    .toLowerCase();
}

// Function to get form ID from database by slug
async function getFormIdBySlug(slug) {
  const { data: form, error } = await supabase
    .from('forms')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (error || !form) {
    console.warn(`⚠️ Form not found for slug: ${slug}`);
    return null;
  }
  
  return form.id;
}

// Function to import submissions from a single JSON file
async function importSubmissionsFromFile(filePath, filename) {
  try {
    console.log(`\n📄 Processing file: ${filename}`);
    
    // Read and parse JSON file
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      console.log(`  ⚠️ No submissions found in ${filename}`);
      return { imported: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`  📊 Found ${jsonData.length} submissions`);
    
    // Determine form slug from filename
    const slug = createSlugFromFilename(filename);
    console.log(`  🔍 Looking for form with slug: ${slug}`);
    
    // Get form ID from database
    const formId = await getFormIdBySlug(slug);
    
    if (!formId) {
      console.log(`  ❌ Skipping ${filename} - form not found in database`);
      return { imported: 0, skipped: jsonData.length, errors: 0 };
    }
    
    console.log(`  ✅ Found form ID: ${formId}`);
    
    // Process submissions
    const submissions = [];
    let errors = 0;
    
    for (const submission of jsonData) {
      try {
        // Extract metadata
        const metadata = {
          browser: submission.browser,
          device: submission.device,
          ip: submission.ip,
          city: submission.city,
          country: submission.country,
          payment_status: submission.payment_status,
          payment_method: submission.payment_method,
          payment_type: submission.payment_type,
          currency: submission.currency,
          payment_total: submission.payment_total,
          total_paid: submission.total_paid
        };
        
        // Clean up the response data (remove WordPress-specific fields)
        const cleanedResponse = { ...submission.response };
        delete cleanedResponse.__fluent_form_embded_post_id;
        delete cleanedResponse._fluentform_1_fluentformnonce;
        delete cleanedResponse._fluentform_6_fluentformnonce;
        delete cleanedResponse._fluentform_7_fluentformnonce;
        delete cleanedResponse._fluentform_8_fluentformnonce;
        delete cleanedResponse._fluentform_9_fluentformnonce;
        delete cleanedResponse._fluentform_10_fluentformnonce;
        delete cleanedResponse._fluentform_11_fluentformnonce;
        delete cleanedResponse._fluentform_12_fluentformnonce;
        delete cleanedResponse._fluentform_13_fluentformnonce;
        delete cleanedResponse._fluentform_14_fluentformnonce;
        delete cleanedResponse._fluentform_20_fluentformnonce;
        delete cleanedResponse._wp_http_referer;
        
        // Create the submission object
        const submissionData = {
          form_id: formId,
          legacy_id: submission.id,
          serial_number: submission.serial_number,
          data: cleanedResponse,
          user_inputs: submission.user_inputs,
          metadata: metadata,
          source_url: submission.source_url,
          user_id: null, // Set to null for all legacy submissions since WordPress user IDs are not UUIDs
          status: submission.status,
          is_favourite: submission.is_favourite === '1',
          created_at: submission.created_at,
          updated_at: submission.updated_at
        };
        
        submissions.push(submissionData);
      } catch (err) {
        console.error(`    ❌ Error processing submission ${submission.id}:`, err.message);
        errors++;
      }
    }
    
    if (submissions.length === 0) {
      console.log(`  ⚠️ No valid submissions to import from ${filename}`);
      return { imported: 0, skipped: jsonData.length, errors };
    }
    
    // Insert submissions in batches
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('form_submissions')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error(`    ❌ Error inserting batch:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`    ✅ Imported ${imported}/${submissions.length} submissions`);
      }
    }
    
    // Update form submission count
    if (imported > 0) {
      await updateFormSubmissionCount(formId);
    }
    
    return { imported, skipped: 0, errors };
    
  } catch (error) {
    console.error(`  💥 Error processing ${filename}:`, error.message);
    return { imported: 0, skipped: 0, errors: 1 };
  }
}

// Function to update form submission count
async function updateFormSubmissionCount(formId) {
  try {
    // Count actual submissions
    const { count, error: countError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);
    
    if (countError) {
      console.warn(`    ⚠️ Error counting submissions for form ${formId}:`, countError.message);
      return;
    }
    
    // Update form submission count
    const { error: updateError } = await supabase
      .from('forms')
      .update({ submission_count: count })
      .eq('id', formId);
    
    if (updateError) {
      console.warn(`    ⚠️ Error updating submission count for form ${formId}:`, updateError.message);
    } else {
      console.log(`    📊 Updated form submission count to ${count}`);
    }
  } catch (error) {
    console.warn(`    ⚠️ Error updating submission count:`, error.message);
  }
}

// Main import function
async function importAllExportSubmissions() {
  try {
    console.log('🚀 Starting import of submissions from Exports folder...');
    
    const exportsDir = path.join(__dirname, '..', 'forms', 'Exports');
    
    if (!fs.existsSync(exportsDir)) {
      throw new Error(`Exports directory not found: ${exportsDir}`);
    }
    
    // Get all JSON files in the Exports directory
    const files = fs.readdirSync(exportsDir)
      .filter(file => file.endsWith('.json'))
      .sort();
    
    if (files.length === 0) {
      console.log('⚠️ No JSON files found in Exports directory');
      return;
    }
    
    console.log(`📁 Found ${files.length} JSON files to process`);
    
    // Process each file
    const results = {
      totalFiles: files.length,
      processedFiles: 0,
      totalImported: 0,
      totalSkipped: 0,
      totalErrors: 0
    };
    
    for (const filename of files) {
      const filePath = path.join(exportsDir, filename);
      const result = await importSubmissionsFromFile(filePath, filename);
      
      results.processedFiles++;
      results.totalImported += result.imported;
      results.totalSkipped += result.skipped;
      results.totalErrors += result.errors;
    }
    
    // Final summary
    console.log('\n🎉 Import completed!');
    console.log(`📊 Summary:`);
    console.log(`  Files processed: ${results.processedFiles}/${results.totalFiles}`);
    console.log(`  Submissions imported: ${results.totalImported}`);
    console.log(`  Submissions skipped: ${results.totalSkipped}`);
    console.log(`  Errors: ${results.totalErrors}`);
    
    if (results.totalErrors > 0) {
      console.log('⚠️ Some errors occurred during import. Check the logs above for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importAllExportSubmissions();