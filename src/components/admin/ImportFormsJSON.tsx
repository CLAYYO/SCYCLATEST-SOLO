import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

// Initialize Supabase client with hardcoded credentials for admin operations
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

interface ImportForm {
  title: string;
  description: string;
  slug: string;
  status: 'active' | 'inactive' | 'draft';
  fields: FormField[];
}

interface ImportFormsJSONProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportFormsJSON: React.FC<ImportFormsJSONProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: string[];
    errors: string[];
  } | null>(null);
  const [previewForms, setPreviewForms] = useState<ImportForm[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      setImportResults(null);
      setShowPreview(false);
      setPreviewForms([]);
    } else {
      alert('Please select a valid JSON file.');
    }
  };

  const previewImport = async () => {
    if (!selectedFile) return;

    try {
      const fileContent = await selectedFile.text();
      const jsonData = JSON.parse(fileContent);
      
      // Validate JSON structure
      let formsToImport: ImportForm[] = [];
      
      if (Array.isArray(jsonData)) {
        formsToImport = jsonData;
      } else if (jsonData.forms && Array.isArray(jsonData.forms)) {
        formsToImport = jsonData.forms;
      } else if (jsonData.title && jsonData.fields) {
        // Single form
        formsToImport = [jsonData];
      } else {
        throw new Error('Invalid JSON structure. Expected array of forms or single form object.');
      }

      // Validate each form
      const validatedForms = formsToImport.map((form, index) => {
        if (!form.title || !form.fields || !Array.isArray(form.fields)) {
          throw new Error(`Form at index ${index} is missing required fields (title, fields).`);
        }
        
        return {
          title: form.title,
          description: form.description || '',
          slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          status: form.status || 'draft' as const,
          fields: form.fields.map((field, fieldIndex) => {
            if (!field.type || !field.label || !field.name) {
              throw new Error(`Field at index ${fieldIndex} in form "${form.title}" is missing required properties.`);
            }
            return {
              id: field.id || `field_${fieldIndex}`,
              type: field.type,
              label: field.label,
              name: field.name,
              required: field.required || false,
              placeholder: field.placeholder || '',
              options: field.options || [],
              validation: field.validation || {}
            };
          })
        };
      });

      setPreviewForms(validatedForms);
      setShowPreview(true);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert(`Error parsing JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const importForms = async () => {
    if (!previewForms.length) return;

    setImporting(true);
    const results = { success: [], errors: [] } as { success: string[]; errors: string[] };

    try {
      for (const form of previewForms) {
        try {
          // Check if form with same slug already exists
          const { data: existingForm } = await supabase
            .from('forms')
            .select('id')
            .eq('slug', form.slug)
            .maybeSingle();

          if (existingForm) {
            results.errors.push(`Form "${form.title}" already exists (slug: ${form.slug})`);
            continue;
          }

          // Insert the form
          const { data: newForm, error: formError } = await supabase
            .from('forms')
            .insert({
              title: form.title,
              description: form.description,
              slug: form.slug,
              status: form.status
            })
            .select()
            .single();

          if (formError) {
            results.errors.push(`Failed to create form "${form.title}": ${formError.message}`);
            continue;
          }

          // Insert form fields
          if (form.fields.length > 0) {
            const fieldsToInsert = form.fields.map((field, index) => ({
              form_id: newForm.id,
              field_type: field.type,
              field_label: field.label,
              field_name: field.name,
              is_required: field.required,
              placeholder: field.placeholder,
              field_options: field.options.length > 0 ? JSON.stringify(field.options) : null,
              validation_rules: Object.keys(field.validation).length > 0 ? JSON.stringify(field.validation) : null,
              sort_order: index
            }));

            const { error: fieldsError } = await supabase
              .from('form_fields')
              .insert(fieldsToInsert);

            if (fieldsError) {
              results.errors.push(`Failed to create fields for form "${form.title}": ${fieldsError.message}`);
              // Delete the form since fields failed
              await supabase.from('forms').delete().eq('id', newForm.id);
              continue;
            }
          }

          results.success.push(`Successfully imported form "${form.title}"`);
        } catch (error) {
          results.errors.push(`Error importing form "${form.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      results.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setImportResults(results);
    setImporting(false);
    
    if (results.success.length > 0) {
      onImportComplete();
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportResults(null);
    setPreviewForms([]);
    setShowPreview(false);
    const fileInput = document.getElementById('json-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import Forms from JSON</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!showPreview && !importResults && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select JSON File</h3>
                <p className="text-gray-600 mb-4">
                  Choose a JSON file containing form definitions to import.
                </p>
                <input
                  id="json-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="json-file-input"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </label>
              </div>

              {selectedFile && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={previewImport}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Preview Import
                    </button>
                    <button
                      onClick={resetImport}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">JSON Format</h4>
                <p className="text-sm text-blue-800 mb-3">
                  The JSON file should contain either:
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>An array of form objects</li>
                  <li>An object with a "forms" property containing an array</li>
                  <li>A single form object</li>
                </ul>
              </div>
            </div>
          )}

          {showPreview && !importResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Preview: {previewForms.length} form(s) to import
                </h3>
                <div className="space-x-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Back
                  </button>
                  <button
                    onClick={importForms}
                    disabled={importing}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Import Forms'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {previewForms.map((form, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{form.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        form.status === 'active' ? 'bg-green-100 text-green-800' :
                        form.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {form.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                    <p className="text-xs text-gray-500 mb-3">Slug: {form.slug}</p>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">
                        Fields ({form.fields.length}):
                      </span>
                      <div className="mt-2 space-y-1">
                        {form.fields.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="flex items-center space-x-2 text-xs text-gray-600">
                            <span className="bg-gray-100 px-2 py-1 rounded">{field.type}</span>
                            <span>{field.label}</span>
                            {field.required && <span className="text-red-500">*</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResults && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Import Results</h3>
              
              {importResults.success.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-900">
                      Successfully Imported ({importResults.success.length})
                    </h4>
                  </div>
                  <ul className="text-sm text-green-800 space-y-1">
                    {importResults.success.map((message, index) => (
                      <li key={index}>• {message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="font-medium text-red-900">
                      Errors ({importResults.errors.length})
                    </h4>
                  </div>
                  <ul className="text-sm text-red-800 space-y-1">
                    {importResults.errors.map((message, index) => (
                      <li key={index}>• {message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Import More Forms
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportFormsJSON;