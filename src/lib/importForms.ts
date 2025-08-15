/**
 * Form Import Utilities
 * Functions for importing forms and submissions from Fluent Forms exports
 */

import { supabase } from './supabase';

/**
 * Import forms from Fluent Forms JSON export
 * @param fluentForms Array of Fluent Forms data
 * @returns Object with import results
 */
export async function importFluentForms(fluentForms: any[]) {
  if (!Array.isArray(fluentForms) || fluentForms.length === 0) {
    throw new Error('Invalid Fluent Forms data format');
  }

  const results = {
    imported: 0,
    updated: 0,
    errors: 0,
    forms: [] as any[]
  };

  try {
    // Process each form in the import
    for (const fluentForm of fluentForms) {
      try {
        // Convert Fluent Form fields to our format
        const fields = convertFluentFormFields(fluentForm.form_fields);
        
        // Convert Fluent Form settings to our format
        const settings = convertFluentFormSettings(fluentForm);
        
        // Generate a slug from the title
        const slug = fluentForm.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Check if form with this title already exists
        const { data: existingForms, error: checkError } = await supabase
          .from('forms')
          .select('id')
          .eq('title', fluentForm.title);
        
        if (checkError) {
          throw new Error(`Error checking for existing form: ${checkError.message}`);
        }
        
        let formId;
        
        if (existingForms && existingForms.length > 0) {
          // Update existing form
          formId = existingForms[0].id;
          
          const { error: updateError } = await supabase
            .from('forms')
            .update({
              fields,
              settings,
              updated_at: new Date().toISOString(),
            })
            .eq('id', formId);
          
          if (updateError) {
            throw new Error(`Error updating form: ${updateError.message}`);
          }
          
          results.updated++;
        } else {
          // Create new form
          const { data: newForm, error: insertError } = await supabase
            .from('forms')
            .insert({
              title: fluentForm.title,
              description: `Imported from Fluent Forms (ID: ${fluentForm.id})`,
              slug,
              fields,
              settings,
              status: 'active',
            })
            .select('id')
            .single();
          
          if (insertError) {
            throw new Error(`Error creating form: ${insertError.message}`);
          }
          
          formId = newForm.id;
          results.imported++;
        }
        
        results.forms.push({
          id: formId,
          title: fluentForm.title,
          fluent_id: fluentForm.id
        });
        
      } catch (formError) {
        console.error('Error processing form:', formError);
        results.errors++;
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Import submissions functionality has been moved to importSubmissions.ts
// This file now only handles form imports

/**
 * Note: The warning about constant assignment has been fixed in importSubmissions.ts
 * This file no longer contains the problematic code.
 */

/**
 * Helper function to convert Fluent Form fields to our format
 * @param fluentFields Fluent Form fields object
 * @returns Array of field objects in our format
 */
function convertFluentFormFields(fluentFields: any) {
  const result: any[] = [];
  
  if (!fluentFields || !fluentFields.fields) {
    return [];
  }
  
  // Process each field from the Fluent Form
  fluentFields.fields.forEach((field: any) => {
    // Skip custom HTML elements
    if (field.element === 'custom_html') {
      return;
    }
    
    // Map Fluent Form field types to our field types
    let fieldType = '';
    let fieldConfig: any = {
      id: field.attributes?.name || `field_${Date.now()}`,
      label: field.settings?.label || field.settings?.admin_field_label || 'Untitled Field',
      required: false,
    };
    
    switch (field.element) {
      case 'input_name':
        fieldType = 'name';
        fieldConfig.fields = {
          first_name: {
            label: field.fields?.first_name?.settings?.label || 'First Name',
            required: field.fields?.first_name?.settings?.validation_rules?.required?.value || false,
          },
          last_name: {
            label: field.fields?.last_name?.settings?.label || 'Last Name',
            required: field.fields?.last_name?.settings?.validation_rules?.required?.value || false,
          },
        };
        break;
        
      case 'input_email':
        fieldType = 'email';
        fieldConfig.validation = { type: 'email' };
        fieldConfig.required = field.settings?.validation_rules?.required?.value || false;
        break;
        
      case 'input_text':
        fieldType = 'text';
        fieldConfig.required = field.settings?.validation_rules?.required?.value || false;
        break;
        
      case 'textarea':
        fieldType = 'textarea';
        fieldConfig.required = field.settings?.validation_rules?.required?.value || false;
        fieldConfig.rows = field.attributes?.rows || 5;
        break;
        
      case 'recaptcha':
        fieldType = 'recaptcha';
        fieldConfig.required = true;
        break;
        
      default:
        // Skip unsupported field types
        return;
    }
    
    // Add the field to our result array
    if (fieldType) {
      result.push({
        ...fieldConfig,
        type: fieldType,
      });
    }
  });
  
  return result;
}

/**
 * Helper function to convert Fluent Form settings to our format
 * @param fluentForm Fluent Form object
 * @returns Settings object in our format
 */
function convertFluentFormSettings(fluentForm: any) {
  const settings: any = {
    confirmation_message: 'Thank you for your message. We will get back to you soon.',
    email_notifications: {
      enabled: true,
      to: 'info@scyc.co.uk',
      reply_to: '{inputs.email}',
      subject: 'New Contact Form Submission: {inputs.subject}'
    },
    recaptcha: {
      enabled: true,
      site_key: ''
    }
  };
  
  // Extract settings from form_meta if available
  if (fluentForm.form_meta && Array.isArray(fluentForm.form_meta)) {
    // Look for formSettings
    const formSettingsMeta = fluentForm.form_meta.find((meta: any) => meta.meta_key === 'formSettings');
    if (formSettingsMeta && formSettingsMeta.value) {
      try {
        const formSettings = JSON.parse(formSettingsMeta.value);
        if (formSettings.confirmation && formSettings.confirmation.messageToShow) {
          settings.confirmation_message = formSettings.confirmation.messageToShow;
        }
      } catch (e) {
        console.error('Error parsing formSettings:', e);
      }
    }
    
    // Look for notifications
    const notificationsMeta = fluentForm.form_meta.find((meta: any) => meta.meta_key === 'notifications');
    if (notificationsMeta && notificationsMeta.value) {
      try {
        const notifications = JSON.parse(notificationsMeta.value);
        if (notifications.sendTo && notifications.sendTo.email) {
          settings.email_notifications.to = notifications.sendTo.email;
        }
        if (notifications.subject) {
          settings.email_notifications.subject = notifications.subject;
        }
        if (notifications.replyTo) {
          settings.email_notifications.reply_to = notifications.replyTo;
        }
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }
    
    // Look for custom CSS
    const customCssMeta = fluentForm.form_meta.find((meta: any) => meta.meta_key === '_custom_form_css');
    if (customCssMeta && customCssMeta.value) {
      settings.custom_css = customCssMeta.value;
    }
  }
  
  return settings;
}