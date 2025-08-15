import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type { FluentFormExport, BulkImportResults, ImportResult } from '../../types/fluentform';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// FluentForm field type mappings
const FIELD_TYPE_MAPPING: Record<string, string> = {
  'input_name': 'name',
  'input_email': 'email',
  'input_text': 'text',
  'textarea': 'textarea',
  'select': 'select',
  'input_radio': 'radio',
  'input_checkbox': 'checkbox',
  'input_number': 'number',
  'input_url': 'url',
  'input_date': 'date',
  'input_file': 'file',
  'input_hidden': 'hidden',
  'custom_html': 'html',
  'section_break': 'section',
  'container': 'container',
  'input_phone': 'phone',
  'address': 'address'
};

function extractFieldsFromFluentForm(fluentForm: any): any[] {
  const fields: any[] = [];
  
  function processField(field: any, parentPath = '') {
    if (!field || typeof field !== 'object') return;
    
    const fieldType = field.element || field.type;
    if (!fieldType) return;
    
    // Handle container fields (which contain other fields)
    if (fieldType === 'container' && field.columns) {
      for (const column of field.columns) {
        if (column.fields) {
          for (const subField of column.fields) {
            processField(subField, parentPath);
          }
        }
      }
      return;
    }
    
    // Skip section breaks and custom HTML
    if (fieldType === 'section_break' || fieldType === 'custom_html') {
      return;
    }
    
    const mappedType = FIELD_TYPE_MAPPING[fieldType] || 'text';
    const fieldName = field.attributes?.name || field.name || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const label = field.settings?.label || field.label || fieldName;
    
    const formField = {
      name: fieldName,
      type: mappedType,
      label: label,
      required: field.settings?.validation_rules?.required?.value === true || false,
      placeholder: field.settings?.placeholder || '',
      options: [],
      validation: {},
      order_index: fields.length
    };
    
    // Handle select/radio/checkbox options
    if ((fieldType === 'select' || fieldType === 'input_radio' || fieldType === 'input_checkbox') && field.settings?.advanced_options) {
      formField.options = Object.entries(field.settings.advanced_options).map(([value, label]) => ({
        value,
        label: String(label)
      }));
    }
    
    // Handle validation rules
    if (field.settings?.validation_rules) {
      const rules = field.settings.validation_rules;
      if (rules.email) formField.validation.email = true;
      if (rules.numeric) formField.validation.numeric = true;
      if (rules.min && rules.min.value) formField.validation.min_length = parseInt(rules.min.value);
      if (rules.max && rules.max.value) formField.validation.max_length = parseInt(rules.max.value);
    }
    
    fields.push(formField);
  }
  
  // Process all fields in the form
  if (fluentForm.fields) {
    for (const field of Object.values(fluentForm.fields)) {
      processField(field);
    }
  }
  
  return fields;
}

async function importSingleForm(fluentForm: any): Promise<ImportResult> {
  try {
    const title = fluentForm.title || 'Untitled Form';
    
    // Check if form already exists
    const { data: existingForm } = await supabase
      .from('forms')
      .select('id')
      .eq('title', title)
      .maybeSingle();
    
    if (existingForm) {
      return {
        success: false,
        title,
        reason: 'already_exists'
      };
    }
    
    // Create the form
    const formData = {
      title,
      description: fluentForm.settings?.form_title || fluentForm.settings?.description || '',
      status: fluentForm.status === 'published' ? 'active' : 'draft',
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    };
    
    const { data: newForm, error: formError } = await supabase
      .from('forms')
      .insert(formData)
      .select()
      .single();
    
    if (formError || !newForm) {
      return {
        success: false,
        title,
        error: formError?.message || 'Failed to create form'
      };
    }
    
    // Extract and create fields
    const fields = extractFieldsFromFluentForm(fluentForm);
    
    if (fields.length > 0) {
      const fieldsWithFormId = fields.map(field => ({
        ...field,
        form_id: newForm.id
      }));
      
      const { error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fieldsWithFormId);
      
      if (fieldsError) {
        // If fields creation fails, we should still consider the form imported
        console.error('Error creating fields:', fieldsError);
      }
    }
    
    return {
      success: true,
      title,
      fieldsCount: fields.length
    };
    
  } catch (error) {
    return {
      success: false,
      title: fluentForm.title || 'Unknown Form',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get all FluentForm JSON files
          const formsDir = path.join(process.cwd(), 'forms');
          
          if (!fs.existsSync(formsDir)) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'error',
              error: 'Forms directory not found'
            }) + '\n'));
            controller.close();
            return;
          }
          
          const files = fs.readdirSync(formsDir)
            .filter(file => file.startsWith('fluentform-export-') && file.endsWith('.json'))
            .sort();
          
          if (files.length === 0) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'error',
              error: 'No FluentForm export files found'
            }) + '\n'));
            controller.close();
            return;
          }
          
          const results: BulkImportResults = {
            total: files.length,
            successful: 0,
            skipped: 0,
            failed: 0,
            details: []
          };
          
          // Process each file
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = Math.round(((i + 1) / files.length) * 100);
            
            // Send progress update
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'progress',
              progress,
              currentFile: file
            }) + '\n'));
            
            try {
              const filePath = path.join(formsDir, file);
              const fileContent = fs.readFileSync(filePath, 'utf-8');
              const fluentFormData: FluentFormExport = JSON.parse(fileContent);
              
              // Handle both single form and array of forms
              const forms = Array.isArray(fluentFormData) ? fluentFormData : [fluentFormData];
              
              for (const form of forms) {
                const result = await importSingleForm(form);
                result.file = file;
                
                if (result.success) {
                  results.successful++;
                } else if (result.reason === 'already_exists') {
                  results.skipped++;
                } else {
                  results.failed++;
                }
                
                results.details.push(result);
              }
              
            } catch (error) {
              results.failed++;
              results.details.push({
                success: false,
                title: 'Unknown',
                file,
                error: error instanceof Error ? error.message : 'Failed to parse JSON'
              });
            }
          }
          
          // Send completion
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete',
            results
          }) + '\n'));
          
          controller.close();
          
        } catch (error) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }) + '\n'));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};