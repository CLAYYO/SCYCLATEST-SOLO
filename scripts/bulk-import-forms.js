import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// FluentForm field type mappings
const FIELD_TYPE_MAPPINGS = {
  'input_name': 'name',
  'input_email': 'email', 
  'input_text': 'text',
  'textarea': 'textarea',
  'select': 'select',
  'input_radio': 'radio',
  'input_checkbox': 'checkbox',
  'input_url': 'url',
  'input_number': 'number',
  'input_date': 'date',
  'input_file': 'file',
  'input_hidden': 'hidden',
  'custom_html': 'html',
  'container': 'container',
  'section_break': 'section'
};

// Helper function to create a slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); // Limit length to avoid issues
}

// Function to extract fields from FluentForm structure
function extractFields(fields, parentKey = '') {
  const extractedFields = [];
  
  for (const [key, field] of Object.entries(fields)) {
    const fieldKey = parentKey ? `${parentKey}_${key}` : key;
    
    // Handle container fields (nested structures)
    if (field.element === 'container' && field.columns) {
      for (const [colKey, column] of Object.entries(field.columns)) {
        if (column.fields) {
          const nestedFields = extractFields(column.fields, fieldKey);
          extractedFields.push(...nestedFields);
        }
      }
      continue;
    }
    
    // Map FluentForm field type to our field type
    const fieldType = FIELD_TYPE_MAPPINGS[field.element] || 'text';
    
    // Extract field configuration
    const fieldConfig = {
      name: fieldKey,
      type: fieldType,
      label: field.settings?.label || field.attributes?.placeholder || fieldKey,
      placeholder: field.attributes?.placeholder || '',
      required: field.settings?.validation_rules?.required?.value === true,
      options: [],
      validation: {},
      order_index: extractedFields.length
    };
    
    // Handle select/radio/checkbox options
    if (field.settings?.advanced_options) {
      fieldConfig.options = Object.entries(field.settings.advanced_options).map(([value, label]) => ({
        value,
        label: typeof label === 'object' ? label.label || value : label
      }));
    }
    
    // Handle validation rules
    if (field.settings?.validation_rules) {
      const rules = field.settings.validation_rules;
      if (rules.email) fieldConfig.validation.email = true;
      if (rules.numeric) fieldConfig.validation.numeric = true;
      if (rules.min && rules.min.value) fieldConfig.validation.min_length = parseInt(rules.min.value);
      if (rules.max && rules.max.value) fieldConfig.validation.max_length = parseInt(rules.max.value);
    }
    
    // Skip certain field types that don't need to be stored
    if (!['custom_html', 'section_break'].includes(field.element)) {
      extractedFields.push(fieldConfig);
    }
  }
  
  return extractedFields;
}

// Function to import a single form
async function importForm(formData) {
  try {
    // Handle direct form object (not nested under 'form' property)
    const form = formData.form || formData;
    const formTitle = form.title || 'Untitled Form';
    
    console.log(`Processing form: ${formTitle}`);
    
    // Generate slug from title
    const slug = createSlug(formTitle);
    
    // Check if form already exists by slug
    const { data: existingForm } = await supabase
      .from('forms')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (existingForm) {
      console.log(`  ⚠️  Form "${formTitle}" already exists (slug: ${slug}), skipping...`);
      return { success: false, reason: 'already_exists', title: formTitle };
    }
    
    // Extract fields from FluentForm structure
    const fields = extractFields(form.form_fields || form.fields || {});
    
    if (fields.length === 0) {
      console.log(`  ⚠️  No valid fields found in form "${formTitle}", skipping...`);
      return { success: false, reason: 'no_fields', title: formTitle };
    }
    
    // Create form in database
    const { data: newForm, error: formError } = await supabase
      .from('forms')
      .insert({
        title: formTitle,
        slug: slug,
        description: form.settings?.form_title || form.settings?.description || '',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submission_count: 0
      })
      .select()
      .single();
    
    if (formError) {
      console.error(`  ❌ Error creating form "${formTitle}":`, formError.message);
      return { success: false, reason: 'database_error', title: formTitle, error: formError.message };
    }
    
    // Fields are stored as JSONB in the forms table, so they're already included
    
    console.log(`  ✅ Successfully imported "${formTitle}" with ${fields.length} fields`);
    return { success: true, title: formTitle, fieldsCount: fields.length, formId: newForm.id };
    
  } catch (error) {
    console.error(`  ❌ Unexpected error:`, error.message);
    return { success: false, reason: 'unexpected_error', title: 'Unknown', error: error.message };
  }
}

// Main bulk import function
async function bulkImportForms() {
  console.log('🚀 Starting bulk import of FluentForm JSON files...');
  
  const formsDir = path.join(__dirname, '..', 'forms');
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  try {
    // Read all JSON files from forms directory
    const files = fs.readdirSync(formsDir)
      .filter(file => file.endsWith('.json') && file.includes('fluentform-export'))
      .sort();
    
    if (files.length === 0) {
      console.log('❌ No FluentForm export files found in forms directory');
      return results;
    }
    
    console.log(`📁 Found ${files.length} FluentForm export files`);
    results.total = files.length;
    
    // Process each file
    for (const file of files) {
      console.log(`\n📄 Processing file: ${file}`);
      
      try {
        const filePath = path.join(formsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Handle different JSON structures
        let formsToImport = [];
        
        if (Array.isArray(jsonData)) {
          formsToImport = jsonData;
        } else if (jsonData.form) {
          formsToImport = [jsonData];
        } else if (jsonData.forms) {
          formsToImport = jsonData.forms;
        } else {
          console.log(`  ⚠️  Unknown JSON structure in ${file}, skipping...`);
          results.failed++;
          results.details.push({ file, success: false, reason: 'invalid_structure' });
          continue;
        }
        
        // Import each form in the file
        for (const formData of formsToImport) {
          const result = await importForm(formData);
          result.file = file;
          results.details.push(result);
          
          if (result.success) {
            results.successful++;
          } else if (result.reason === 'already_exists') {
            results.skipped++;
          } else {
            results.failed++;
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing file ${file}:`, error.message);
        results.failed++;
        results.details.push({ file, success: false, reason: 'file_error', error: error.message });
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error during bulk import:', error.message);
    results.details.push({ success: false, reason: 'fatal_error', error: error.message });
  }
  
  // Print summary
  console.log('\n📊 IMPORT SUMMARY');
  console.log('==================');
  console.log(`Total files processed: ${results.total}`);
  console.log(`✅ Successful imports: ${results.successful}`);
  console.log(`⚠️  Skipped (already exist): ${results.skipped}`);
  console.log(`❌ Failed imports: ${results.failed}`);
  
  if (results.details.length > 0) {
    console.log('\n📋 DETAILED RESULTS');
    console.log('===================');
    results.details.forEach(detail => {
      const status = detail.success ? '✅' : (detail.reason === 'already_exists' ? '⚠️ ' : '❌');
      console.log(`${status} ${detail.title || 'Unknown'} (${detail.file || 'N/A'})`);
      if (detail.error) {
        console.log(`    Error: ${detail.error}`);
      }
    });
  }
  
  return results;
}

// Run the bulk import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bulkImportForms()
    .then(results => {
      console.log('\n🎉 Bulk import completed!');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { bulkImportForms };