import { clsx, type ClassValue } from 'clsx';
import { format, parseISO, isValid } from 'date-fns';

// Utility function for combining class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Date formatting utilities
export const formatDate = (date: string | Date, formatString: string = 'dd/MM/yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, formatString);
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
};

// String utilities
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Racing utilities
export const formatRaceStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'finished': 'Finished',
    'dnf': 'DNF',
    'dns': 'DNS',
    'dnc': 'DNC',
    'dsq': 'DSQ',
    'ret': 'RET'
  };
  return statusMap[status.toLowerCase()] || status;
};

export const getRankClass = (position: number): string => {
  if (position === 1) return 'rank1';
  if (position === 2) return 'rank2';
  if (position === 3) return 'rank3';
  return '';
};

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// API utilities
export const handleApiError = (error: any): string => {
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

export const createApiResponse = <T>(data: T, error?: string) => {
  return {
    data: error ? null : data,
    error: error || null,
    success: !error
  };
};

// Local storage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage errors silently
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Handle storage errors silently
    }
  }
};

// Constants
export const MEMBERSHIP_TYPES = {
  full: 'Full Member',
  associate: 'Associate Member',
  junior: 'Junior Member',
  honorary: 'Honorary Member'
} as const;

export const EVENT_TYPES = {
  racing: 'Racing',
  social: 'Social',
  training: 'Training',
  meeting: 'Meeting',
  maintenance: 'Maintenance'
} as const;

export const NEWS_CATEGORIES = {
  general: 'General',
  racing: 'Racing',
  social: 'Social',
  maintenance: 'Maintenance',
  safety: 'Safety'
} as const;

export const DOCUMENT_CATEGORIES = {
  sailing_instructions: 'Sailing Instructions',
  notices: 'Notices',
  forms: 'Forms',
  minutes: 'Minutes',
  policies: 'Policies',
  other: 'Other'
} as const;