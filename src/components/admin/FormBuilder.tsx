import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  X,
  Type,
  Mail,
  Hash,
  Calendar,
  CheckSquare,
  Circle,
  List,
  Upload,
  Phone,
  Globe,
  FileText,
  User,
  MapPin,
  Clock
} from 'lucide-react';

// Initialize Supabase client with hardcoded credentials for admin operations
const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3MzQxMywiZXhwIjoyMDcwNzQ5NDEzfQ.zlDEyT3yCo6zKqu8eRd1a-Je-YxJgHRstzxcXdca02Q';
const supabase = createClient(supabaseUrl, supabaseKey);

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  settings?: Record<string, any>;
}

interface Form {
  id?: string;
  title: string;
  description: string;
  slug: string;
  fields: FormField[];
  settings: Record<string, any>;
  status: 'active' | 'inactive' | 'draft';
}

interface FormBuilderProps {
  form?: Form;
  onSave: (form: Form) => void;
  onCancel: () => void;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'tel', label: 'Phone', icon: Phone },
  { type: 'url', label: 'URL', icon: Globe },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'time', label: 'Time', icon: Clock },
  { type: 'textarea', label: 'Textarea', icon: FileText },
  { type: 'select', label: 'Select Dropdown', icon: List },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Button', icon: Circle },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'name', label: 'Name Field', icon: User },
  { type: 'address', label: 'Address', icon: MapPin }
];

const FormBuilder: React.FC<FormBuilderProps> = ({ form, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Form>({
    title: form?.title || 'New Form',
    description: form?.description || '',
    slug: form?.slug || '',
    fields: form?.fields || [],
    settings: form?.settings || {},
    status: form?.status || 'draft',
    ...(form?.id && { id: form.id })
  });
  
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedField, setDraggedField] = useState<FormField | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const dragCounter = useRef(0);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Handle form title change
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  // Add new field
  const addField = (fieldType: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: fieldType,
      label: `${FIELD_TYPES.find(t => t.type === fieldType)?.label || fieldType} Field`,
      required: false,
      ...(fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox' ? {
        options: ['Option 1', 'Option 2']
      } : {}),
      ...(fieldType === 'name' ? {
        settings: {
          fields: {
            first_name: { label: 'First Name', required: true },
            last_name: { label: 'Last Name', required: true }
          }
        }
      } : {}),
      ...(fieldType === 'address' ? {
        settings: {
          fields: {
            street: { label: 'Street Address', required: true },
            city: { label: 'City', required: true },
            state: { label: 'State/Province', required: false },
            postal_code: { label: 'Postal Code', required: true },
            country: { label: 'Country', required: true }
          }
        }
      } : {})
    };
    
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    
    setSelectedField(newField);
  };

  // Remove field
  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
    
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  // Update field
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    }));
    
    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, field: FormField) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverIndex(null);
    
    if (!draggedField) return;
    
    const currentIndex = formData.fields.findIndex(f => f.id === draggedField.id);
    if (currentIndex === -1) return;
    
    const newFields = [...formData.fields];
    const [removed] = newFields.splice(currentIndex, 1);
    newFields.splice(dropIndex, 0, removed);
    
    setFormData(prev => ({ ...prev, fields: newFields }));
    setDraggedField(null);
  };

  // Save form
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a form title');
      return;
    }
    
    setSaving(true);
    
    try {
      const formToSave = {
        ...formData,
        slug: formData.slug || generateSlug(formData.title),
        updated_at: new Date().toISOString()
      };
      
      if (formData.id) {
        // Update existing form
        const { error } = await supabase
          .from('forms')
          .update({
            title: formToSave.title,
            description: formToSave.description,
            slug: formToSave.slug,
            fields: formToSave.fields,
            settings: formToSave.settings,
            status: formToSave.status,
            updated_at: formToSave.updated_at
          })
          .eq('id', formData.id);
        
        if (error) throw error;
      } else {
        // Create new form
        const { data, error } = await supabase
          .from('forms')
          .insert({
            title: formToSave.title,
            description: formToSave.description,
            slug: formToSave.slug,
            fields: formToSave.fields,
            settings: formToSave.settings,
            status: formToSave.status
          })
          .select()
          .single();
        
        if (error) throw error;
        formToSave.id = data.id;
      }
      
      onSave(formToSave);
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Error saving form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render field preview
  const renderFieldPreview = (field: FormField) => {
    const commonProps = {
      className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
      placeholder: field.placeholder,
      required: field.required
    };

    switch (field.type) {
      case 'textarea':
        return <textarea {...commonProps} rows={4} />;
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Choose an option</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center space-x-2">
                <input type="radio" name={field.id} className="rounded-full" />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'name':
        return (
          <div className="grid grid-cols-2 gap-4">
            <input {...commonProps} placeholder="First Name" />
            <input {...commonProps} placeholder="Last Name" />
          </div>
        );
      
      case 'address':
        return (
          <div className="space-y-3">
            <input {...commonProps} placeholder="Street Address" />
            <div className="grid grid-cols-2 gap-4">
              <input {...commonProps} placeholder="City" />
              <input {...commonProps} placeholder="State/Province" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input {...commonProps} placeholder="Postal Code" />
              <input {...commonProps} placeholder="Country" />
            </div>
          </div>
        );
      
      case 'file':
        return <input type="file" className="w-full" />;
      
      default:
        return <input {...commonProps} type={field.type} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Field Types */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Field Types</h3>
        <div className="space-y-2">
          {FIELD_TYPES.map((fieldType) => {
            const Icon = fieldType.icon;
            return (
              <button
                key={fieldType.type}
                onClick={() => addField(fieldType.type)}
                className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
              >
                <Icon className="h-5 w-5 text-gray-600" />
                <span className="text-sm">{fieldType.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Form Builder */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold">
                {formData.id ? 'Edit Form' : 'Create New Form'}
              </h2>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Form'}</span>
              </button>
            </div>
          </div>

          {/* Form Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Form Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter form title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="form-slug"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter form description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Form Fields</h3>
              <span className="text-sm text-gray-500">
                {formData.fields.length} field{formData.fields.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {formData.fields.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No fields added yet</p>
                <p className="text-sm">Click on a field type from the sidebar to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, field)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
                      relative p-4 border rounded-lg cursor-move transition-all
                      ${selectedField?.id === field.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${dragOverIndex === index ? 'border-blue-400 bg-blue-50' : ''}
                    `}
                    onClick={() => setSelectedField(field)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium">{field.label}</h4>
                          <p className="text-sm text-gray-500 capitalize">{field.type}</p>
                        </div>
                        {field.required && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {showPreview && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldPreview(field)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Field Properties */}
        {selectedField && (
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Field Properties</h3>
              <button
                onClick={() => setSelectedField(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Label
                </label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={selectedField.placeholder || ''}
                  onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Required Field</span>
                </label>
              </div>
              
              {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {selectedField.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(selectedField.options || [])];
                            newOptions[index] = e.target.value;
                            updateField(selectedField.id, { options: newOptions });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            const newOptions = selectedField.options?.filter((_, i) => i !== index) || [];
                            updateField(selectedField.id, { options: newOptions });
                          }}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                        updateField(selectedField.id, { options: newOptions });
                      }}
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Option</span>
                    </button>
                  </div>
                </div>
              )}
              
              {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Length
                    </label>
                    <input
                      type="number"
                      value={selectedField.validation?.minLength || ''}
                      onChange={(e) => updateField(selectedField.id, {
                        validation: {
                          ...selectedField.validation,
                          minLength: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Length
                    </label>
                    <input
                      type="number"
                      value={selectedField.validation?.maxLength || ''}
                      onChange={(e) => updateField(selectedField.id, {
                        validation: {
                          ...selectedField.validation,
                          maxLength: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              
              {selectedField.type === 'number' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Value
                    </label>
                    <input
                      type="number"
                      value={selectedField.validation?.min || ''}
                      onChange={(e) => updateField(selectedField.id, {
                        validation: {
                          ...selectedField.validation,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Value
                    </label>
                    <input
                      type="number"
                      value={selectedField.validation?.max || ''}
                      onChange={(e) => updateField(selectedField.id, {
                        validation: {
                          ...selectedField.validation,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilder;