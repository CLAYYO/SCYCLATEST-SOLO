import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, DollarSign, Mail, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Event {
  id?: string;
  title: string;
  description: string;
  event_type: 'racing' | 'social' | 'training' | 'meeting' | 'maintenance';
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  organizer: string;
  max_participants: number | null;
  registration_required: boolean;
  registration_deadline: string;
  entry_fee: number;
  is_members_only: boolean;
  contact_email: string;
  status: 'draft' | 'published' | 'cancelled';
}

interface EventFormProps {
  event?: Event | null;
  onSave: (event: Event) => void;
  onCancel: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Event>({
    title: '',
    description: '',
    event_type: 'social',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    organizer: '',
    max_participants: null,
    registration_required: false,
    registration_deadline: '',
    entry_fee: 0,
    is_members_only: false,
    contact_email: '',
    status: 'draft'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        end_date: event.end_date || event.start_date,
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        location: event.location || '',
        organizer: event.organizer || '',
        registration_deadline: event.registration_deadline || '',
        contact_email: event.contact_email || ''
      });
    }
  }, [event]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.organizer.trim()) {
      newErrors.organizer = 'Organizer is required';
    }

    if (formData.registration_required) {
      if (!formData.registration_deadline) {
        newErrors.registration_deadline = 'Registration deadline is required when registration is enabled';
      } else {
        const deadline = new Date(formData.registration_deadline);
        const startDate = new Date(formData.start_date);
        if (deadline >= startDate) {
          newErrors.registration_deadline = 'Registration deadline must be before the event start date';
        }
      }

      if (!formData.contact_email.trim()) {
        newErrors.contact_email = 'Contact email is required when registration is enabled';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
        newErrors.contact_email = 'Please enter a valid email address';
      }
    }

    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        newErrors.end_date = 'End date cannot be before start date';
      }
    }

    if (formData.start_time && formData.end_time && formData.start_date === formData.end_date) {
      if (formData.end_time <= formData.start_time) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    if (formData.entry_fee < 0) {
      newErrors.entry_fee = 'Entry fee cannot be negative';
    }

    if (formData.max_participants !== null && formData.max_participants < 1) {
      newErrors.max_participants = 'Maximum participants must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const eventData = {
        ...formData,
        end_date: formData.end_date || formData.start_date,
        current_participants: event?.id ? undefined : 0, // Only set for new events
        updated_at: new Date().toISOString()
      };

      if (event?.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) {
          console.error('Error updating event:', error);
          alert('Failed to update event. Please try again.');
          return;
        }
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert([{
            ...eventData,
            id: crypto.randomUUID(),
            current_participants: 0,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          console.error('Error creating event:', error);
          alert('Failed to create event. Please try again.');
          return;
        }
      }

      onSave(formData);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const eventTypeOptions = [
    { value: 'racing', label: 'Racing' },
    { value: 'social', label: 'Social' },
    { value: 'training', label: 'Training' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'maintenance', label: 'Maintenance' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {event?.id ? 'Edit Event' : 'Create New Event'}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                        errors.title ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter event title"
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                        errors.description ? 'border-red-300' : ''
                      }`}
                      placeholder="Describe the event"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">
                        Event Type *
                      </label>
                      <select
                        id="event_type"
                        value={formData.event_type}
                        onChange={(e) => handleInputChange('event_type', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500"
                      >
                        {eventTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status *
                      </label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date and Time */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date & Time
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                          errors.start_date ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
                    </div>

                    <div>
                      <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                          errors.end_date ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                        Start Time
                      </label>
                      <input
                        type="time"
                        id="start_time"
                        value={formData.start_time}
                        onChange={(e) => handleInputChange('start_time', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                        End Time
                      </label>
                      <input
                        type="time"
                        id="end_time"
                        value={formData.end_time}
                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                          errors.end_time ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.end_time && <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Location and Organizer */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Location & Organizer
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location *
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                        errors.location ? 'border-red-300' : ''
                      }`}
                      placeholder="Event location"
                    />
                    {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                  </div>

                  <div>
                    <label htmlFor="organizer" className="block text-sm font-medium text-gray-700">
                      Organizer *
                    </label>
                    <input
                      type="text"
                      id="organizer"
                      value={formData.organizer}
                      onChange={(e) => handleInputChange('organizer', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                        errors.organizer ? 'border-red-300' : ''
                      }`}
                      placeholder="Event organizer"
                    />
                    {errors.organizer && <p className="mt-1 text-sm text-red-600">{errors.organizer}</p>}
                  </div>
                </div>
              </div>

              {/* Registration Settings */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Registration Settings
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="registration_required"
                      checked={formData.registration_required}
                      onChange={(e) => handleInputChange('registration_required', e.target.checked)}
                      className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                    />
                    <label htmlFor="registration_required" className="ml-2 block text-sm text-gray-900">
                      Registration Required
                    </label>
                  </div>

                  {formData.registration_required && (
                    <>
                      <div>
                        <label htmlFor="registration_deadline" className="block text-sm font-medium text-gray-700">
                          Registration Deadline *
                        </label>
                        <input
                          type="datetime-local"
                          id="registration_deadline"
                          value={formData.registration_deadline}
                          onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                            errors.registration_deadline ? 'border-red-300' : ''
                          }`}
                        />
                        {errors.registration_deadline && <p className="mt-1 text-sm text-red-600">{errors.registration_deadline}</p>}
                      </div>

                      <div>
                        <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                          Contact Email *
                        </label>
                        <input
                          type="email"
                          id="contact_email"
                          value={formData.contact_email}
                          onChange={(e) => handleInputChange('contact_email', e.target.value)}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                            errors.contact_email ? 'border-red-300' : ''
                          }`}
                          placeholder="contact@scyc.co.uk"
                        />
                        {errors.contact_email && <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>}
                      </div>

                      <div>
                        <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700">
                          Maximum Participants
                        </label>
                        <input
                          type="number"
                          id="max_participants"
                          value={formData.max_participants || ''}
                          onChange={(e) => handleInputChange('max_participants', e.target.value ? parseInt(e.target.value) : null)}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                            errors.max_participants ? 'border-red-300' : ''
                          }`}
                          placeholder="Leave empty for unlimited"
                          min="1"
                        />
                        {errors.max_participants && <p className="mt-1 text-sm text-red-600">{errors.max_participants}</p>}
                      </div>
                    </>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_members_only"
                      checked={formData.is_members_only}
                      onChange={(e) => handleInputChange('is_members_only', e.target.checked)}
                      className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_members_only" className="ml-2 block text-sm text-gray-900">
                      Members Only Event
                    </label>
                  </div>
                </div>
              </div>

              {/* Entry Fee */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Entry Fee
                </h4>
                
                <div>
                  <label htmlFor="entry_fee" className="block text-sm font-medium text-gray-700">
                    Entry Fee (£)
                  </label>
                  <input
                    type="number"
                    id="entry_fee"
                    value={formData.entry_fee}
                    onChange={(e) => handleInputChange('entry_fee', parseFloat(e.target.value) || 0)}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 ${
                      errors.entry_fee ? 'border-red-300' : ''
                    }`}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  {errors.entry_fee && <p className="mt-1 text-sm text-red-600">{errors.entry_fee}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-700 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {event?.id ? 'Update Event' : 'Create Event'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;