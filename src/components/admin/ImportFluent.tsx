import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImportFluentProps {
  onImportComplete: () => void;
}

interface ImportState {
  isUploading: boolean;
  file: File | null;
  error: string | null;
  success: boolean;
  importResult: any;
  parsedData: any;
}

const ImportFluent: React.FC<ImportFluentProps> = ({ onImportComplete }) => {
  const [state, setState] = useState<ImportState>({
    isUploading: false,
    file: null,
    error: null,
    success: false,
    importResult: null,
    parsedData: null,
  });

  const resetState = () => {
    setState({
      isUploading: false,
      file: null,
      error: null,
      success: false,
      importResult: null,
      parsedData: null,
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    // Check if it's a JSON file
    if (!file.name.toLowerCase().endsWith('.json')) {
      setState(prev => ({
        ...prev,
        error: 'Please upload a JSON file exported from Fluent Forms',
      }));
      return;
    }

    setState(prev => ({ ...prev, file, isUploading: true, error: null }));

    try {
      // Read the file
      const fileContent = await file.text();
      let parsedData;
      
      try {
        parsedData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error('Invalid JSON file format');
      }

      // Validate that it's a Fluent Forms export
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error('Invalid Fluent Forms export format');
      }

      // Check if it has the expected structure
      const firstForm = parsedData[0];
      if (!firstForm.title || !firstForm.form_fields) {
        throw new Error('The JSON file does not contain valid Fluent Forms data');
      }

      setState(prev => ({
        ...prev,
        parsedData,
        isUploading: false,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Failed to parse file',
      }));
    }
  };

  const cancelImport = () => {
    resetState();
  };

  const confirmImport = async () => {
    if (!state.parsedData) return;

    setState(prev => ({ ...prev, isUploading: true, error: null }));

    try {
      // Process each form in the import
      for (const fluentForm of state.parsedData) {
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
        
        if (existingForms && existingForms.length > 0) {
          // Update existing form
          const { error: updateError } = await supabase
            .from('forms')
            .update({
              fields,
              settings,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingForms[0].id);
          
          if (updateError) {
            throw new Error(`Error updating form: ${updateError.message}`);
          }
        } else {
          // Create new form
          const { error: insertError } = await supabase
            .from('forms')
            .insert({
              title: fluentForm.title,
              description: `Imported from Fluent Forms (ID: ${fluentForm.id})`,
              slug,
              fields,
              settings,
              status: 'active',
            });
          
          if (insertError) {
            throw new Error(`Error creating form: ${insertError.message}`);
          }
        }
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        success: true,
        importResult: {
          formsImported: state.parsedData.length,
        },
      }));

      // Notify parent component that import is complete
      onImportComplete();

    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Import failed',
      }));
    }
  };

  // Helper function to convert Fluent Form fields to our format
  const convertFluentFormFields = (fluentFields: any) => {
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
  };

  // Helper function to convert Fluent Form settings to our format
  const convertFluentFormSettings = (fluentForm: any) => {
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
  };

  if (state.success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Forms Imported Successfully!
        </h3>
        <p className="text-gray-600 mb-4">
          {state.importResult.formsImported} form(s) have been imported and are now available in the system.
        </p>
        <button
          onClick={resetState}
          className="bg-navy-600 text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors"
        >
          Import Another File
        </button>
      </div>
    );
  }

  if (state.parsedData) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Preview: {state.parsedData.length} Form(s) Found
          </h3>
          <div className="mt-4 space-y-2">
            {state.parsedData.map((form: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded border border-blue-100">
                <p className="font-medium">{form.title}</p>
                <p className="text-sm text-gray-600">
                  {form.form_fields?.fields?.length || 0} fields • ID: {form.id}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={cancelImport}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmImport}
            disabled={state.isUploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {state.isUploading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Import Error</h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, error: null }))}
              className="ml-auto"
            >
              <X className="h-5 w-5 text-red-400" />
            </button>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${state.file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
        `}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {state.file ? state.file.name : 'Import Forms from Fluent Forms'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {state.file
                ? `${(state.file.size / 1024).toFixed(2)} KB • ${state.file.type}`
                : 'Drag and drop your Fluent Forms JSON export file, or click to browse'}
            </p>
          </div>
          <div>
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <span>{state.file ? 'Change File' : 'Select File'}</span>
              <input
                type="file"
                className="sr-only"
                accept=".json"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              This will import forms from a Fluent Forms JSON export. The import process will:
            </p>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
              <li>Create new forms if they don't exist</li>
              <li>Update existing forms if they have the same title</li>
              <li>Convert form fields to match our system's format</li>
              <li>Import form settings and notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportFluent;