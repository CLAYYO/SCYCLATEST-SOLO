import React, { useState, useEffect } from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Use hardcoded credentials for admin operations
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExportFormsJSONProps {
  onClose: () => void;
}

interface Form {
  id: string;
  title: string;
  description?: string;
  fields: any[];
  settings: any;
  created_at: string;
  updated_at: string;
  submission_count: number;
}

interface FormSubmission {
  id: string;
  form_id: string;
  data: any;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

const ExportFormsJSON: React.FC<ExportFormsJSONProps> = ({ onClose }) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'forms' | 'submissions' | 'both'>('both');
  const [selectedFormId, setSelectedFormId] = useState<string>('');

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('Failed to fetch forms');
    }
  };

  const fetchSubmissions = async (formId?: string) => {
    try {
      let query = supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (formId) {
        query = query.eq('form_id', formId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching submissions:', err);
      throw err;
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let exportData: any = {};

      if (exportType === 'forms' || exportType === 'both') {
        const formsToExport = selectedFormId 
          ? forms.filter(form => form.id === selectedFormId)
          : forms;
        exportData.forms = formsToExport;
      }

      if (exportType === 'submissions' || exportType === 'both') {
        const submissionsData = await fetchSubmissions(selectedFormId || undefined);
        exportData.submissions = submissionsData;
      }

      // Add metadata
      exportData.metadata = {
        exported_at: new Date().toISOString(),
        export_type: exportType,
        total_forms: exportData.forms?.length || 0,
        total_submissions: exportData.submissions?.length || 0,
        selected_form_id: selectedFormId || null
      };

      // Create and download JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = selectedFormId 
        ? `scyc-form-${selectedFormId}-${timestamp}.json`
        : `scyc-forms-export-${timestamp}.json`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(`Successfully exported ${exportData.metadata.total_forms} forms and ${exportData.metadata.total_submissions} submissions`);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Export Forms Data</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Type
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as 'forms' | 'submissions' | 'both')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Forms and Submissions</option>
                <option value="forms">Forms Only</option>
                <option value="submissions">Submissions Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Form (Optional)
              </label>
              <select
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Forms</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title} ({form.submission_count} submissions)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Export Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Export type: {exportType}</p>
              <p>• Forms available: {forms.length}</p>
              {selectedFormId && (
                <p>• Selected form: {forms.find(f => f.id === selectedFormId)?.title}</p>
              )}
              <p>• Format: JSON</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export JSON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportFormsJSON;