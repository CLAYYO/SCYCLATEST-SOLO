import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with hardcoded credentials for admin operations
const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3MzQxMywiZXhwIjoyMDcwNzQ5NDEzfQ.zlDEyT3yCo6zKqu8eRd1a-Je-YxJgHRstzxcXdca02Q';
const supabase = createClient(supabaseUrl, supabaseKey);

// Import the original supabase client for non-admin operations
import { supabase as supabaseClient } from '../../lib/supabase';
import { 
  FileText, 
  BarChart3, 
  Settings, 
  Download, 
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Filter,
  Calendar,
  Users,
  Mail,
  Upload
} from 'lucide-react';
import ImportFluent from '../ImportFluent';
import ImportSubmissions from '../ImportSubmissions';
import DebugFormSubmissions from './DebugFormSubmissions';
import FormBuilder from './FormBuilder';
import ImportFormsJSON from './ImportFormsJSON';
import ExportFormsJSON from './ExportFormsJSON';
import BulkImportForms from './BulkImportForms';

interface Form {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
  submission_count?: number; // Make optional since the column might not exist
  calculated_count?: number; // For tracking counts calculated from submissions
}

interface FormSubmission {
  id: string;
  form_id: string;
  serial_number: string;
  data: Record<string, any>;
  user_inputs: Record<string, any>;
  metadata: Record<string, any>;
  source_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type TabType = 'dashboard' | 'forms' | 'submissions' | 'analytics' | 'exports' | 'builder';

const FormsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedFormForBuilder, setSelectedFormForBuilder] = useState<Form | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportSubmissionsModal, setShowImportSubmissionsModal] = useState(false);
  const [showImportJSONModal, setShowImportJSONModal] = useState(false);
  const [showExportJSONModal, setShowExportJSONModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState<{
    isRunning: boolean;
    progress: number;
    currentFile: string;
    results?: any;
  }>({ isRunning: false, progress: 0, currentFile: '' });
  const [formMapping, setFormMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    
    // Fix any unlinked submissions on component mount
    fixUnlinkedSubmissions();
    
    // Create form mapping for imports
    createFormMapping();
    
    // Client-side debug log
    console.log('FormsAdmin component mounted');
  }, []);
  
  // Function to fix submissions that don't have a form_id
  const fixUnlinkedSubmissions = async () => {
    try {
      console.log('Running fixUnlinkedSubmissions...');
      
      // First, check if we have a Contact Form SCYC
      let contactFormId = null;
      
      // Just select the id without submission_count to avoid column errors
      const { data: contactForm, error: contactFormError } = await supabase
        .from('forms')
        .select('id')
        .eq('title', 'Contact Form SCYC')
        .maybeSingle();
      
      if (contactFormError) {
        console.error('Error finding Contact Form SCYC:', contactFormError);
        return;
      }
      
      // Create the Contact Form SCYC if it doesn't exist
      if (!contactForm) {
        console.log('Contact Form SCYC not found, creating it...');
        
        const { data: newForm, error: createError } = await supabase
          .from('forms')
          .insert({
            title: 'Contact Form SCYC',
            description: 'Default contact form for SCYC website',
            status: 'active',
            slug: 'contact-form-scyc'
          })
          .select();
        
        if (createError) {
          console.error('Error creating Contact Form SCYC:', createError);
          return;
        }
        
        if (!newForm || newForm.length === 0) {
          console.error('Failed to create Contact Form SCYC');
          return;
        }
        
        console.log('Created Contact Form SCYC:', newForm[0]);
        contactFormId = newForm[0].id;
      } else {
        console.log('Found existing Contact Form SCYC:', contactForm.id);
        contactFormId = contactForm.id;
      }
      
      if (!contactFormId) {
        console.error('No Contact Form ID available');
        return;
      }
      
      // Update submissions with NULL form_id
      console.log('Fixing submissions with NULL form_id...');
      const { data: nullSubmissions, error: nullCountError } = await supabase
        .from('form_submissions')
        .select('id', { count: 'exact' })
        .is('form_id', null);
      
      if (nullCountError) {
        console.error('Error counting NULL form_id submissions:', nullCountError);
      } else {
        console.log(`Found ${nullSubmissions?.length || 0} submissions with NULL form_id`);
        
        if (nullSubmissions && nullSubmissions.length > 0) {
          const { error: updateNullError } = await supabase
            .from('form_submissions')
            .update({ form_id: contactFormId })
            .is('form_id', null);
          
          if (updateNullError) {
            console.error('Error updating NULL form_id submissions:', updateNullError);
          } else {
            console.log(`Updated ${nullSubmissions.length} submissions with NULL form_id`);
          }
        }
      }
      
      // Get all valid form IDs
      const { data: allForms, error: formsError } = await supabase
        .from('forms')
        .select('id');
      
      if (formsError) {
        console.error('Error getting all form IDs:', formsError);
        return;
      }
      
      const validFormIds = new Set(allForms.map((form: { id: string }) => form.id));
      
      // Check for submissions with invalid form_id (form doesn't exist)
      console.log('Checking for submissions with invalid form_id...');
      const { data: allSubmissions, error: allSubError } = await supabase
        .from('form_submissions')
        .select('id, form_id')
        .not('form_id', 'is', null);
      
      if (allSubError) {
        console.error('Error getting all submissions:', allSubError);
        return;
      }
      
      // Find submissions with invalid form_id
      const submissionsToFix = allSubmissions.filter(
        (submission: { id: string; form_id: string }) => !validFormIds.has(submission.form_id)
      );
      
      if (submissionsToFix.length > 0) {
        console.log(`Found ${submissionsToFix.length} submissions with invalid form_id`);
        
        // Update these submissions to use the Contact Form SCYC
        const { error: fixError } = await supabase
          .from('form_submissions')
          .update({ form_id: contactFormId })
          .in('id', submissionsToFix.map((s: { id: string }) => s.id));
        
        if (fixError) {
          console.error('Error fixing submissions with invalid form_id:', fixError);
        } else {
          console.log(`Fixed ${submissionsToFix.length} submissions with invalid form_id`);
        }
      } else {
        console.log('No submissions with invalid form_id found');
      }
      
      console.log('fixUnlinkedSubmissions completed successfully');
    } catch (error) {
      console.error('Error in fixUnlinkedSubmissions:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fix any unlinked submissions first
      await fixUnlinkedSubmissions();
      
      // Load forms with a retry mechanism
      let formsData = [];
      let formsError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          formsData = data;
          break;
        } else {
          formsError = error;
          console.error(`Attempt ${attempt}: Error loading forms:`, error);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
        }
      }
      
      if (formsError && !formsData.length) {
        console.error('Failed to load forms after multiple attempts:', formsError);
        throw formsError;
      }
      
      console.log('Forms loaded:', formsData?.length || 0);
      
      // Load submissions with form titles (left join to include submissions without form_id)
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('form_submissions')
        .select(`
          *,
          forms(title, slug)
        `)
        .order('created_at', { ascending: false });
      
      if (submissionsError) throw submissionsError;
      
      console.log('Total submissions loaded:', submissionsData?.length || 0);
      
      // Count submissions for each form directly from the loaded submissions data
      const submissionCounts: Record<string, number> = {};
      (submissionsData || []).forEach((submission: { form_id: string }) => {
        if (submission.form_id) {
          submissionCounts[submission.form_id] = (submissionCounts[submission.form_id] || 0) + 1;
        }
      });
      
      // Log all submission counts for debugging
      console.log('Submission counts by form ID:', submissionCounts);
      
      // Ensure all forms have a submission count, even if zero
      (formsData || []).forEach((form: Form) => {
        if (!(form.id in submissionCounts)) {
          submissionCounts[form.id] = 0;
        }
      });
      
      // Try to update submission_count in database for each form if it differs
      // Only attempt this if the column exists
      try {
        for (const [formId, count] of Object.entries(submissionCounts)) {
          const form = formsData.find((f: Form) => f.id === formId);
          if (form && form.submission_count !== count) {
            console.log(`Attempting to update submission_count for ${form.title} from ${form.submission_count} to ${count}`);
            try {
              const { error: updateError } = await supabase
                .from('forms')
                .update({ submission_count: count })
                .eq('id', formId);
              
              if (updateError) {
                // If we get a column doesn't exist error, log it but don't treat as critical
                if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
                  console.log('Note: submission_count column does not exist in the database. Using calculated counts instead.');
                  // Break out of the loop since we know the column doesn't exist
                  break;
                } else {
                  console.warn(`Warning: Could not update submission_count for form ${formId}:`, updateError);
                }
              }
            } catch (updateErr) {
              console.warn(`Error updating submission_count for form ${formId}:`, updateErr);
              // If we catch an error related to the column not existing, break out of the loop
              if (String(updateErr).includes('column') && String(updateErr).includes('does not exist')) {
                console.log('Note: submission_count column does not exist in the database. Using calculated counts instead.');
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error while updating submission counts:', err);
      }
      
      // Add counts to forms
      const formsWithCounts = (formsData || []).map((form: Form) => {
        const count = submissionCounts[form.id] || 0;
        console.log(`Form ${form.title} (${form.id}) has ${count} submissions`);
        
        // Special debug for Contact Form SCYC
      if (form.title === 'Contact Form SCYC') {
        console.log('IMPORTANT: Contact Form SCYC submissions count:', count);
        console.log('IMPORTANT: Submissions data length:', submissionsData?.length || 0);
        
        // Count manually for verification
        const manualCount = (submissionsData || []).filter((s: { form_id: string }) => s.form_id === form.id).length;
        console.log('IMPORTANT: Manual count for Contact Form SCYC:', manualCount);
      }
        
        return {
          ...form,
          calculated_count: count, // Always store the calculated count
          submission_count: form.submission_count !== undefined ? form.submission_count : count // Use existing if available, otherwise use calculated
        };
      });
      
      // If we have no forms, create a default one
      if (formsWithCounts.length === 0) {
        console.log('No forms found, creating a default form');
        
        const { data: newFormData, error: createError } = await supabase
          .from('forms')
          .insert({
            title: 'Contact Form SCYC',
            description: 'Default contact form',
            status: 'active',
            slug: 'contact-form-scyc'
          })
          .select();
        
        if (createError) {
          console.error('Error creating default form:', createError);
        } else if (newFormData && newFormData.length > 0) {
          console.log('Default form created:', newFormData[0]);
          formsWithCounts.push({
            ...newFormData[0],
            submission_count: 0
          });
        }
      }
      
      setForms(formsWithCounts);
      setSubmissions(submissionsData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportSubmissions = async (format: 'csv' | 'excel' | 'json') => {
    try {
      let filteredSubmissions = submissions;
      
      if (selectedForm !== 'all') {
        filteredSubmissions = submissions.filter((s: any) => s.form_id === selectedForm);
      }
      
      if (searchTerm) {
        filteredSubmissions = filteredSubmissions.filter((s: any) => 
          JSON.stringify(s.data).toLowerCase().includes(searchTerm.toLowerCase()) ||
          JSON.stringify(s.user_inputs).toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (format === 'json') {
        const dataStr = JSON.stringify(filteredSubmissions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `form-submissions-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Convert to CSV
        const headers = ['ID', 'Form', 'Serial', 'Name', 'Email', 'Subject', 'Message', 'Status', 'Created'];
        const csvData = filteredSubmissions.map(s => [
          s.id,
          (s as any).forms?.title || 'Unknown',
          s.serial_number,
          `${s.data?.names_first_name || ''} ${s.data?.names_last_name || ''}`.trim(),
          s.data?.email || '',
          s.data?.subject || '',
          s.data?.message || '',
          s.status,
          new Date(s.created_at).toLocaleDateString()
        ]);
        
        const csvContent = [headers, ...csvData]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `form-submissions-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleEditForm = (form: Form) => {
    console.log('Editing form:', form);
    setEditingForm(form);
    setShowEditModal(true);
  };

  const handleSaveForm = async (formData: Partial<Form>) => {
    if (!editingForm) {
      console.error('No form is being edited');
      return;
    }
    
    // Validation
    if (!formData.title || formData.title.trim().length === 0) {
      alert('Form title is required');
      return;
    }
    
    if (formData.title.trim().length > 255) {
      alert('Form title must be less than 255 characters');
      return;
    }
    
    if (formData.description && formData.description.length > 1000) {
      alert('Form description must be less than 1000 characters');
      return;
    }
    
    if (!['active', 'inactive', 'draft'].includes(formData.status || '')) {
      alert('Invalid form status');
      return;
    }
    
    try {
      console.log('Saving form:', formData);
      
      // First check if the form exists
      const { data: existingForm, error: checkError } = await supabase
        .from('forms')
        .select('id')
        .eq('id', editingForm.id)
        .single();
      
      if (checkError) {
        console.error('Error checking form existence:', checkError);
        
        // If the form doesn't exist, create it
        if (checkError.code === 'PGRST116') {
          console.log('Form not found, creating new form');
          
          const { error: createError } = await supabase
            .from('forms')
            .insert({
              title: formData.title,
              description: formData.description,
              status: formData.status,
              slug: formData.title?.toLowerCase().replace(/\s+/g, '-') || 'form-' + Date.now()
            });
          
          if (createError) {
            console.error('Error creating form:', createError);
            throw createError;
          }
        } else {
          throw checkError;
        }
      } else {
        // Update the existing form
        const { error } = await supabase
          .from('forms')
          .update(formData)
          .eq('id', editingForm.id);
        
        if (error) {
          console.error('Supabase error saving form:', error);
          throw error;
        }
      }
      
      console.log('Form saved successfully');
      // Close the modal first to improve UI responsiveness
      setShowEditModal(false);
      setEditingForm(null);
      
      // Then reload data to reflect changes
      await loadData();
    } catch (error) {
      console.error('Error updating form:', error);
      alert('Failed to update form. Please try again.');
    }
  };

  const filteredSubmissions = submissions.filter((submission: any) => {
    const matchesSearch = searchTerm === '' || 
      JSON.stringify(submission.data).toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(submission.user_inputs).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesForm = selectedForm === 'all' || submission.form_id === selectedForm;
    
    return matchesSearch && matchesForm;
  });

  /**
   * Create a mapping of Fluent Form IDs to our form IDs
   * This is used for importing submissions
   */
  const createFormMapping = async () => {
    try {
      // Get all forms
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('id, title, description')
        .order('created_at', { ascending: false });
      
      if (formError) {
        console.error('Error fetching forms for mapping:', formError);
        return;
      }
      
      // Create mapping based on form descriptions
      // We store the Fluent Form ID in the description when importing forms
      const mapping: Record<string, string> = {};
      
      formData?.forEach((form: { id: string; title: string; description?: string }) => {
        // Check if description contains a Fluent Form ID
        const match = form.description?.match(/Imported from Fluent Forms \(ID: (\d+)\)/);
        if (match && match[1]) {
          const fluentId = match[1];
          mapping[fluentId] = form.id;
        }
      });
      
      setFormMapping(mapping);
    } catch (error) {
      console.error('Error creating form mapping:', error);
    }
  };
  
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Forms</p>
              <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
            </div>
            <Mail className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Forms</p>
              <p className="text-2xl font-bold text-gray-900">{forms.filter(f => f.status === 'active').length}</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {submissions.filter(s => 
                  new Date(s.created_at).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Forms</h3>
          <div className="space-y-3">
            {forms.slice(0, 5).map((form: Form) => (
              <div key={form.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{form.title}</p>
                  <p className="text-sm text-gray-600">{form.calculated_count || form.submission_count || 0} submissions</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  form.status === 'active' ? 'bg-green-100 text-green-800' :
                  form.status === 'inactive' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {form.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
          <div className="space-y-3">
            {submissions.slice(0, 5).map((submission: any) => (
              <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {submission.data?.names_first_name} {submission.data?.names_last_name}
                  </p>
                  <p className="text-sm text-gray-600">{submission.data?.email}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForms = () => (
    <div className="space-y-6">
      {/* Debug component */}
      <DebugFormSubmissions />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Forms Management</h2>
          <p className="text-gray-600">Create, edit, and manage your forms</p>
        </div>
        <div className="flex gap-2">
          <div className="relative inline-block">
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Import Fluent Forms
                </button>
                <button
                  onClick={() => setShowImportJSONModal(true)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Import JSON Forms
                </button>
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Bulk Import FluentForms
                </button>
                <button
                  onClick={() => setShowImportSubmissionsModal(true)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Import Submissions
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedFormForBuilder(null);
              setActiveTab('builder');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Form
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form: Form) => (
          <div key={form.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {form.calculated_count || form.submission_count || 0} submissions
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      form.status === 'active' ? 'bg-green-100 text-green-800' :
                      form.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {form.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Created {new Date(form.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Form"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleEditForm(form)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Edit Form Details"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedFormForBuilder(form);
                      setActiveTab('builder');
                    }}
                    className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit Form Structure"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button 
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Form"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {forms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Forms Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first form</p>
            <button 
              onClick={() => {
                setSelectedFormForBuilder(null);
                setActiveTab('builder');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Create Your First Form
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSubmissions = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <select
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Forms</option>
          {forms.map((form: Form) => (
            <option key={form.id} value={form.id}>{form.title}</option>
          ))}
        </select>
        
        <div className="flex gap-2">
          <div className="relative inline-block">
            <button
              onClick={() => exportSubmissions('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => exportSubmissions('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => exportSubmissions('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowImportSubmissionsModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission: any) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.data?.names_first_name} {submission.data?.names_last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{submission.data?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {submission.data?.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      submission.status === 'read' ? 'bg-green-100 text-green-800' :
                      submission.status === 'unread' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {submission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading forms administration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Form Edit Modal */}
      {showEditModal && editingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Form</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editingForm.title} 
                  onChange={(e) => setEditingForm({...editingForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={editingForm.description} 
                  onChange={(e) => setEditingForm({...editingForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={editingForm.status} 
                  onChange={(e) => setEditingForm({...editingForm, status: e.target.value as 'active' | 'inactive' | 'draft'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSaveForm({
                  title: editingForm.title,
                  description: editingForm.description,
                  status: editingForm.status
                })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Forms Modal */}
      {showImportModal && (
        <ImportFluent 
          onClose={() => setShowImportModal(false)}
          onSuccess={(results) => {
            setShowImportModal(false);
            loadData();
            createFormMapping();
            alert(`Import complete! ${results.imported} forms imported, ${results.updated} forms updated.`);
          }}
        />
      )}
      
      {/* Import JSON Forms Modal */}
      {showImportJSONModal && (
        <ImportFormsJSON 
          onClose={() => setShowImportJSONModal(false)}
          onSuccess={(results) => {
            setShowImportJSONModal(false);
            loadData();
            alert(`Import complete! ${results.imported} forms imported successfully.`);
          }}
        />
      )}
      
      {/* Export JSON Forms Modal */}
      {showExportJSONModal && (
        <ExportFormsJSON
          onClose={() => setShowExportJSONModal(false)}
        />
      )}
      
      {/* Bulk Import Forms Modal */}
      {showBulkImportModal && (
        <BulkImportForms
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={(results) => {
            setShowBulkImportModal(false);
            loadData();
            createFormMapping();
            alert(`Bulk import complete! ${results.successful} forms imported, ${results.skipped} skipped, ${results.failed} failed.`);
          }}
        />
      )}
      
      {/* Import Submissions Modal */}
      {showImportSubmissionsModal && (
        <ImportSubmissions
          onClose={() => setShowImportSubmissionsModal(false)}
          onSuccess={(results) => {
            setShowImportSubmissionsModal(false);
            // Force a complete reload of data to ensure counts are updated
            fixUnlinkedSubmissions().then(() => {
              loadData().then(() => {
                console.log('Data reloaded after import');
                // Show detailed import results
                let message = `Import complete! ${results.imported} submissions imported.`;
                if (results.formStats) {
                  message += '\n\nSubmissions by form:';
                  for (const [formId, stats] of Object.entries(results.formStats)) {
                    message += `\n- ${(stats as any).name}: ${(stats as any).count} submissions`;
                  }
                }
                alert(message);
              });
            });
          }}
          formMapping={formMapping}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Forms Administration</h1>
              <p className="text-gray-600">Manage forms and submissions for SCYC</p>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => {
                      const newForm = {
                        title: 'New Form',
                        description: 'Form description',
                        status: 'draft' as const,
                        slug: 'new-form-' + Date.now()
                      };
                      
                      supabase
                        .from('forms')
                        .insert(newForm)
                        .select()
                        .then(({ data, error }: { data: any, error: any }) => {
                          if (error) {
                            console.error('Error creating form:', error);
                            return;
                          }
                          
                          if (data && data[0]) {
                            setEditingForm(data[0] as Form);
                            setShowEditModal(true);
                          }
                          
                          loadData();
                        });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Form
                  </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'forms', label: 'Forms', icon: FileText },
              { id: 'builder', label: 'Form Builder', icon: Plus },
              { id: 'submissions', label: 'Submissions', icon: Mail },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'exports', label: 'Exports', icon: Download }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'submissions' && renderSubmissions()}
        {activeTab === 'forms' && renderForms()}
        {activeTab === 'builder' && (
          <FormBuilder 
            existingForm={selectedFormForBuilder}
            onSave={(formData) => {
              console.log('Form saved:', formData);
              setSelectedFormForBuilder(null);
              loadData(); // Reload forms list
            }}
            onCancel={() => {
              setSelectedFormForBuilder(null);
              setActiveTab('forms');
            }}
          />
        )}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Analytics and reporting features coming soon...</p>
          </div>
        )}
        {activeTab === 'exports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Export Center</h2>
                <p className="text-gray-600">Export your forms and data</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Export Forms</h3>
                    <p className="text-sm text-gray-600">Export forms to JSON format</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Export your forms to a JSON file that can be imported into other SCYC installations.
                </p>
                <button
                  onClick={() => setShowExportJSONModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Forms
                </button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Download className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Export Submissions</h3>
                    <p className="text-sm text-gray-600">Export submission data</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Export form submissions to CSV or JSON format for analysis and reporting.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportSubmissions('csv')}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => exportSubmissions('json')}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    JSON
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Download className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Backup Data</h3>
                    <p className="text-sm text-gray-600">Complete system backup</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Create a complete backup of all forms and submissions for disaster recovery.
                </p>
                <button
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                  disabled
                >
                  <Download className="h-4 w-4" />
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormsAdmin;