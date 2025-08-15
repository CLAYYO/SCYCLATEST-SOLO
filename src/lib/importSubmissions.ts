/**
 * Form Submissions Import Utility
 * 
 * This script provides functions for importing form submissions from Fluent Forms JSON exports
 * It can be used both from the UI and from the command line
 */

import { supabase } from './supabase';

/**
 * Import form submissions from a JSON file
 * @param submissionsData Array of submission data
 * @param formMapping Mapping of Fluent Form IDs to our form IDs
 * @returns Object with import results
 */
export async function importFormSubmissions(submissionsData: any[], formMapping: Record<string, string> = {}) {
  if (!Array.isArray(submissionsData) || submissionsData.length === 0) {
    throw new Error('Invalid submissions data format');
  }

  const results = {
    total: submissionsData.length,
    imported: 0,
    errors: 0,
    skipped: 0,
    formStats: {} as Record<string, { count: number, name: string }>
  };

  try {
    // Process submissions in batches
    const batchSize = 50;
    const submissions = [];
    
    // Process each submission
    for (const submission of submissionsData) {
      try {
        // Get the form ID from the mapping
        let formId = formMapping[submission.form_id] || null;
        
        if (!formId) {
          // If no mapping exists, try to find the Contact Form SCYC
          const { data: contactForm, error: contactFormError } = await supabase
            .from('forms')
            .select('id, title')
            .eq('title', 'Contact Form SCYC')
            .maybeSingle();
          
          if (contactFormError || !contactForm) {
            throw new Error('No form mapping found and Contact Form SCYC not available');
          }
          
          formId = contactForm.id;
          
          // Track stats for this form
          if (!results.formStats[formId]) {
            results.formStats[formId] = {
              count: 0,
              name: contactForm.title
            };
          }
        } else {
          // Get form name for stats
          if (!results.formStats[formId]) {
            const { data: formData } = await supabase
              .from('forms')
              .select('title')
              .eq('id', formId)
              .maybeSingle();
              
            results.formStats[formId] = {
              count: 0,
              name: formData?.title || 'Unknown Form'
            };
          }
        }
        
        // Track form statistics during import
        results.formStats[formId].count++;
        
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
          serial_number: submission.serial_number || `LEGACY-${submission.id}`,
          data: cleanedResponse,
          user_inputs: submission.user_inputs || {},
          metadata: metadata,
          source_url: submission.source_url || '',
          user_id: (submission.user_id === '0' || submission.user_id === '1') ? null : submission.user_id,
          status: submission.status || 'unread',
          is_favourite: submission.is_favourite === '1',
          created_at: submission.created_at || new Date().toISOString(),
          updated_at: submission.updated_at || new Date().toISOString()
        };
        
        submissions.push(submissionData);
        
      } catch (submissionError) {
        console.error('Error processing submission:', submissionError);
        results.errors++;
      }
    }
    
    // Insert submissions in batches
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
    
    // Update form submission counts
    await updateFormSubmissionCounts(results.formStats);
    
    // Update form analytics
    await updateFormAnalytics(formMapping, submissions);
    
    return results;
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

/**
 * Update form submission counts in the forms table
 * @param formStats Object containing form stats from import
 */
async function updateFormSubmissionCounts(formStats: Record<string, { count: number, name: string }>) {
  try {
    console.log('Updating form submission counts...');
    
    for (const [formId, stats] of Object.entries(formStats)) {
      // Get current count
      const { data: currentForm, error: getError } = await supabase
        .from('forms')
        .select('submission_count')
        .eq('id', formId)
        .single();
      
      if (getError) {
        console.warn(`Error getting current submission count for form ${formId}:`, getError);
        continue;
      }
      
      // Calculate new count
      const currentCount = currentForm.submission_count || 0;
      const newCount = currentCount + stats.count;
      
      console.log(`Updating form ${stats.name} (${formId}) submission count from ${currentCount} to ${newCount}`);
      
      // Update the count
      const { error: updateError } = await supabase
        .from('forms')
        .update({ submission_count: newCount })
        .eq('id', formId);
      
      if (updateError) {
        console.warn(`Error updating submission count for form ${formId}:`, updateError);
      }
    }
  } catch (error) {
    console.warn('Error updating form submission counts:', error);
  }
}

/**
 * Update form analytics based on imported submissions
 * @param formMapping Mapping of Fluent Form IDs to our form IDs
 * @param submissions Array of processed submissions
 */
async function updateFormAnalytics(formMapping: Record<string, string>, submissions: any[]) {
  try {
    // Group submissions by form and date
    const analyticsByFormAndDate: Record<string, Record<string, number>> = {};
    
    submissions.forEach(submission => {
      const formId = submission.form_id;
      const date = submission.created_at.split('T')[0]; // Extract date part
      
      if (!analyticsByFormAndDate[formId]) {
        analyticsByFormAndDate[formId] = {};
      }
      
      if (!analyticsByFormAndDate[formId][date]) {
        analyticsByFormAndDate[formId][date] = 0;
      }
      
      analyticsByFormAndDate[formId][date]++;
    });
    
    // Insert analytics data
    const analyticsData = [];
    
    for (const [formId, dateData] of Object.entries(analyticsByFormAndDate)) {
      for (const [date, count] of Object.entries(dateData)) {
        // Check if analytics already exist for this form and date
        const { data: existingAnalytics, error: checkError } = await supabase
          .from('form_analytics')
          .select('id, submissions')
          .eq('form_id', formId)
          .eq('date', date)
          .maybeSingle();
        
        if (checkError) {
          console.warn('Error checking existing analytics:', checkError);
          continue;
        }
        
        if (existingAnalytics) {
          // Update existing analytics
          const { error: updateError } = await supabase
            .from('form_analytics')
            .update({
              submissions: existingAnalytics.submissions + count,
              views: (existingAnalytics.submissions + count) * 2, // Estimate views as 2x submissions
              conversion_rate: 50.00, // Estimate 50% conversion rate
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAnalytics.id);
          
          if (updateError) {
            console.warn('Error updating analytics:', updateError);
          }
        } else {
          // Create new analytics
          analyticsData.push({
            form_id: formId,
            date: date,
            views: count * 2, // Estimate views as 2x submissions
            submissions: count,
            conversion_rate: 50.00 // Estimate 50% conversion rate
          });
        }
      }
    }
    
    if (analyticsData.length > 0) {
      const { error } = await supabase
        .from('form_analytics')
        .insert(analyticsData);
      
      if (error) {
        console.warn('Analytics insert failed:', error.message);
      }
    }
    
  } catch (error) {
    console.warn('Analytics update failed:', error);
  }
}

/**
 * Command-line interface for importing submissions
 * This function is used when running the script directly from the command line
 */
export async function importSubmissionsFromFile(filePath: string) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const submissionsData = JSON.parse(fileContent);
    
    console.log(`Found ${submissionsData.length} submissions in file`);
    
    // Create form mapping
    const formMapping: Record<string, string> = {};
    
    // Get all forms
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .select('id, title, description')
      .order('created_at', { ascending: false });
    
    if (formError) {
      console.error('Error fetching forms for mapping:', formError);
    } else {
      // Create mapping based on form descriptions
      formData?.forEach(form => {
        // Check if description contains a Fluent Form ID
        const match = form.description?.match(/Imported from Fluent Forms \(ID: (\d+)\)/);
        if (match && match[1]) {
          const fluentId = match[1];
          formMapping[fluentId] = form.id;
          console.log(`Mapped Fluent Form ID ${fluentId} to form ${form.title} (${form.id})`);
        }
      });
    }
    
    // Import submissions
    const results = await importFormSubmissions(submissionsData, formMapping);
    
    console.log('Import completed successfully!');
    console.log(`Imported ${results.imported} submissions`);
    console.log(`Errors: ${results.errors}`);
    
    // Print form stats
    console.log('\nSubmissions by form:');
    for (const [formId, stats] of Object.entries(results.formStats)) {
      console.log(`- ${stats.name}: ${stats.count} submissions`);
    }
    
    return results;
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// If this script is run directly from the command line
if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node importSubmissions.js <file-path>');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  importSubmissionsFromFile(filePath)
    .then(() => {
      console.log('Import completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}