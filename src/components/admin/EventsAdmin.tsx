import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, Eye, Users, MapPin, Clock, DollarSign, Filter, Search, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EventForm from './EventForm';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: 'racing' | 'social' | 'training' | 'meeting' | 'maintenance';
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  organizer: string | null;
  max_participants: number | null;
  current_participants: number;
  registration_required: boolean;
  registration_deadline: string | null;
  entry_fee: number;
  is_members_only: boolean;
  contact_email: string | null;
  status: 'draft' | 'published' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface EventRegistration {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_member: boolean;
  member_number: string | null;
  registration_date: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

const EventsAdmin: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Sample data for demonstration
  const sampleEvents: Event[] = [
    {
      id: '1',
      title: 'Spring Racing Series',
      description: 'Opening races of the 2024 season with multiple classes competing in Cardigan Bay.',
      event_type: 'racing',
      start_date: '2024-04-15',
      end_date: '2024-04-15',
      start_time: '10:00',
      end_time: '16:00',
      location: 'Cardigan Bay',
      organizer: 'Racing Committee',
      max_participants: 50,
      current_participants: 23,
      registration_required: true,
      registration_deadline: '2024-04-10T23:59:59Z',
      entry_fee: 25.00,
      is_members_only: false,
      contact_email: 'racing@scyc.co.uk',
      status: 'published',
      created_at: '2024-03-01T10:00:00Z',
      updated_at: '2024-03-15T14:30:00Z'
    },
    {
      id: '2',
      title: 'The Cove Wine Tasting',
      description: 'An evening of fine wines and local cuisine at The Cove restaurant.',
      event_type: 'social',
      start_date: '2024-04-20',
      end_date: null,
      start_time: '19:00',
      end_time: '22:00',
      location: 'The Cove Restaurant',
      organizer: 'Social Committee',
      max_participants: 30,
      current_participants: 18,
      registration_required: true,
      registration_deadline: '2024-04-18T17:00:00Z',
      entry_fee: 45.00,
      is_members_only: true,
      contact_email: 'social@scyc.co.uk',
      status: 'published',
      created_at: '2024-03-05T09:00:00Z',
      updated_at: '2024-03-20T11:15:00Z'
    },
    {
      id: '3',
      title: 'RYA Powerboat Level 2',
      description: 'Two-day RYA Powerboat Level 2 course covering boat handling and safety.',
      event_type: 'training',
      start_date: '2024-05-01',
      end_date: '2024-05-02',
      start_time: '09:00',
      end_time: '17:00',
      location: 'SCYC Marina',
      organizer: 'Training Team',
      max_participants: 8,
      current_participants: 6,
      registration_required: true,
      registration_deadline: '2024-04-25T17:00:00Z',
      entry_fee: 280.00,
      is_members_only: false,
      contact_email: 'training@scyc.co.uk',
      status: 'published',
      created_at: '2024-02-15T14:00:00Z',
      updated_at: '2024-03-10T16:45:00Z'
    }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        // Use sample data if database fetch fails
        setEvents(sampleEvents);
      } else {
        setEvents(data || sampleEvents);
      }
    } catch (error) {
      console.error('Error:', error);
      setEvents(sampleEvents);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

      if (error) {
        console.error('Error fetching registrations:', error);
        setRegistrations([]);
      } else {
        setRegistrations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setRegistrations([]);
    }
  };

  const handleViewRegistrations = (event: Event) => {
    setSelectedEvent(event);
    setShowRegistrations(true);
    fetchRegistrations(event.id);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleSaveEvent = (eventData: Event) => {
    if (selectedEvent?.id) {
      // Update existing event in the list
      setEvents(events.map(e => e.id === selectedEvent.id ? { ...eventData, id: selectedEvent.id } : e));
    } else {
      // Add new event to the list
      const newEvent = {
        ...eventData,
        id: crypto.randomUUID(),
        current_participants: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setEvents([...events, newEvent]);
    }
    setShowEventForm(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      } else {
        setEvents(events.filter(e => e.id !== eventId));
        alert('Event deleted successfully.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || event.event_type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const eventTypeLabels = {
    racing: 'Racing',
    social: 'Social',
    training: 'Training',
    meeting: 'Meeting',
    maintenance: 'Maintenance'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const typeColors = {
    racing: 'bg-blue-100 text-blue-800',
    social: 'bg-purple-100 text-purple-800',
    training: 'bg-orange-100 text-orange-800',
    meeting: 'bg-gray-100 text-gray-800',
    maintenance: 'bg-yellow-100 text-yellow-800'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-navy-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'published').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.reduce((sum, e) => sum + e.current_participants, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            
            {/* Filters */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
            >
              <option value="all">All Types</option>
              <option value="racing">Racing</option>
              <option value="social">Social</option>
              <option value="training">Training</option>
              <option value="meeting">Meeting</option>
              <option value="maintenance">Maintenance</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <button
            onClick={handleCreateEvent}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-700 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">
                        {event.location && (
                          <span className="inline-flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      typeColors[event.event_type]
                    }`}>
                      {eventTypeLabels[event.event_type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{new Date(event.start_date).toLocaleDateString()}</div>
                    {event.start_time && (
                      <div className="text-gray-500">{event.start_time}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {event.registration_required ? (
                      <div>
                        <span className="font-medium">{event.current_participants}</span>
                        {event.max_participants && (
                          <span className="text-gray-500">/{event.max_participants}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No registration</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      statusColors[event.status]
                    }`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(`/events/${event.id}`, '_blank')}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Event"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {event.registration_required && (
                        <button
                          onClick={() => handleViewRegistrations(event)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="View Registrations"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Edit Event"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating your first event.'}
            </p>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <EventForm
          event={selectedEvent}
          onSave={handleSaveEvent}
          onCancel={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Registrations Modal */}
      {showRegistrations && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Registrations for {selectedEvent.title}
                </h3>
                <button
                  onClick={() => setShowRegistrations(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {selectedEvent.current_participants} registrations
                  {selectedEvent.max_participants && ` of ${selectedEvent.max_participants} maximum`}
                </p>
              </div>
              
              {registrations.length > 0 ? (
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
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {registrations.map((registration) => (
                        <tr key={registration.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {registration.first_name} {registration.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {registration.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {registration.is_member ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(registration.registration_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              registration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No registrations yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Registrations will appear here once people start signing up.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowRegistrations(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsAdmin;