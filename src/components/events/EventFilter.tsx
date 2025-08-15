import React, { useState } from 'react';
import { Filter, Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';

interface EventFilterProps {
  onFilterChange: (filters: EventFilters) => void;
  eventCounts: {
    all: number;
    racing: number;
    social: number;
    training: number;
    meeting: number;
    maintenance: number;
  };
}

export interface EventFilters {
  type: string;
  dateRange: string;
  location: string;
  membersOnly: boolean;
  hasRegistration: boolean;
  priceRange: string;
  searchTerm: string;
}

const EventFilter: React.FC<EventFilterProps> = ({ onFilterChange, eventCounts }) => {
  const [filters, setFilters] = useState<EventFilters>({
    type: 'all',
    dateRange: 'all',
    location: 'all',
    membersOnly: false,
    hasRegistration: false,
    priceRange: 'all',
    searchTerm: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof EventFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: EventFilters = {
      type: 'all',
      dateRange: 'all',
      location: 'all',
      membersOnly: false,
      hasRegistration: false,
      priceRange: 'all',
      searchTerm: ''
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const eventTypes = [
    { value: 'all', label: 'All Events', count: eventCounts.all },
    { value: 'racing', label: 'Racing', count: eventCounts.racing },
    { value: 'social', label: 'Social', count: eventCounts.social },
    { value: 'training', label: 'Training', count: eventCounts.training },
    { value: 'meeting', label: 'Meetings', count: eventCounts.meeting },
    { value: 'maintenance', label: 'Maintenance', count: eventCounts.maintenance }
  ];

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'Next 3 Months' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'Cardigan Bay', label: 'Cardigan Bay' },
    { value: 'SCYC Marina', label: 'SCYC Marina' },
    { value: 'The Cove Restaurant', label: 'The Cove Restaurant' },
    { value: 'Club Terrace', label: 'Club Terrace' },
    { value: 'Clubhouse', label: 'Clubhouse' }
  ];

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free Events' },
    { value: 'under25', label: 'Under £25' },
    { value: '25to50', label: '£25 - £50' },
    { value: 'over50', label: 'Over £50' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search events..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Event Type Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Event Type</h3>
        <div className="flex flex-wrap gap-2">
          {eventTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateFilter('type', type.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.type === type.value
                  ? 'bg-navy-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
              {type.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  filters.type === type.value
                    ? 'bg-navy-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {type.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-navy-700 hover:text-navy-900 font-medium"
        >
          <Filter className="w-4 h-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-6 pt-4 border-t border-gray-200">
          {/* Date Range */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-900 mb-2">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => updateFilter('dateRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-900 mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </label>
            <select
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              {locations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-900 mb-2">
              <DollarSign className="w-4 h-4 mr-2" />
              Price Range
            </label>
            <select
              value={filters.priceRange}
              onChange={(e) => updateFilter('priceRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              {priceRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.membersOnly}
                onChange={(e) => updateFilter('membersOnly', e.target.checked)}
                className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Members Only Events</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasRegistration}
                onChange={(e) => updateFilter('hasRegistration', e.target.checked)}
                className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Registration Required</span>
            </label>
          </div>

          {/* Clear Filters */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventFilter;