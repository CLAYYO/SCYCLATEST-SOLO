#!/usr/bin/env node

/**
 * Import Contact Form Submissions Script
 * Imports data from contact-form-scyc-2025-08-14.json into Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importContactFormSubmissions() {
  try {
    console.log('🚀 Starting contact form submissions import...');
    
    // Read the JSON file
    const jsonFilePath = path.join(__dirname, '..', 'forms', 'contact-form-scyc-2025-08-14.json');
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON file not found: ${jsonFilePath}`);
    }
    
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`📄 Found ${jsonData.length} submissions to import`);
    
    // Get the contact form ID
    const { data: forms, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('slug', 'contact-form-scyc')
      .single();
    
    if (formError || !forms) {
      throw new Error('Contact form not found in database');
    }
    
    const formId = forms.id;
    console.log(`📋 Using form ID: ${formId}`);
    
    // Process and import submissions
    const submissions = [];
    
    for (const submission of jsonData) {
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
        user_id: (submission.user_id === '0' || submission.user_id === '1') ? null : submission.user_id,
        status: submission.status,
        is_favourite: submission.is_favourite === '1',
        created_at: submission.created_at,
        updated_at: submission.updated_at
      };
      
      submissions.push(submissionData);
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
        console.error('❌ Error inserting batch:', error);
        throw error;
      }
      
      imported += batch.length;
      console.log(`✅ Imported ${imported}/${submissions.length} submissions`);
    }
    
    console.log('🎉 Import completed successfully!');
    console.log(`📊 Total submissions imported: ${imported}`);
    
    // Update form analytics
    await updateFormAnalytics(formId, submissions);
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

async function updateFormAnalytics(formId, submissions) {
  try {
    console.log('📈 Updating form analytics...');
    
    // Group submissions by date
    const submissionsByDate = {};
    
    submissions.forEach(submission => {
      const date = submission.created_at.split(' ')[0]; // Extract date part
      if (!submissionsByDate[date]) {
        submissionsByDate[date] = 0;
      }
      submissionsByDate[date]++;
    });
    
    // Insert analytics data
    const analyticsData = Object.entries(submissionsByDate).map(([date, count]) => ({
      form_id: formId,
      date: date,
      views: count * 2, // Estimate views as 2x submissions
      submissions: count,
      conversion_rate: 50.00 // Estimate 50% conversion rate
    }));
    
    const { error } = await supabase
      .from('form_analytics')
      .insert(analyticsData);
    
    if (error) {
      console.warn('⚠️ Analytics update failed:', error.message);
    } else {
      console.log(`📊 Analytics updated for ${analyticsData.length} dates`);
    }
    
  } catch (error) {
    console.warn('⚠️ Analytics update failed:', error.message);
  }
}

// Run the import
importContactFormSubmissions();