import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Server-side Supabase client with service role key for elevated privileges
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Handle missing environment variables gracefully during static build
let supabaseServer: any;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase server environment variables - using mock client for static build');
  
  // Create a mock client that throws runtime errors for actual usage
  supabaseServer = {
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  };
} else {
  // Create server client with service role key
  supabaseServer = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export { supabaseServer };