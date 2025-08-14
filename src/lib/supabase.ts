import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Handle missing environment variables gracefully during static build
let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase client environment variables - using mock client for static build');
  
  // Create a mock client that provides basic structure for static builds
  supabase = {
    auth: {
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: new Error('Supabase not configured') }),
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') }),
      getSession: () => Promise.resolve({ data: { session: null }, error: new Error('Supabase not configured') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => {
      const mockQuery = {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => mockQuery,
        eq: () => mockQuery,
        neq: () => mockQuery,
        gt: () => mockQuery,
        gte: () => mockQuery,
        lt: () => mockQuery,
        lte: () => mockQuery,
        like: () => mockQuery,
        ilike: () => mockQuery,
        is: () => mockQuery,
        in: () => mockQuery,
        contains: () => mockQuery,
        containedBy: () => mockQuery,
        rangeGt: () => mockQuery,
        rangeGte: () => mockQuery,
        rangeLt: () => mockQuery,
        rangeLte: () => mockQuery,
        rangeAdjacent: () => mockQuery,
        overlaps: () => mockQuery,
        textSearch: () => mockQuery,
        match: () => mockQuery,
        not: () => mockQuery,
        or: () => mockQuery,
        filter: () => mockQuery,
        order: () => mockQuery,
        limit: () => mockQuery,
        range: () => mockQuery,
        abortSignal: () => mockQuery,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        csv: () => Promise.resolve({ data: '', error: null }),
        geojson: () => Promise.resolve({ data: null, error: null }),
        explain: () => Promise.resolve({ data: null, error: null }),
        rollback: () => Promise.resolve({ data: null, error: null }),
        returns: () => mockQuery,
        update: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        then: (resolve: (value: { data: any[], error: null }) => void) => resolve({ data: [], error: null })
      };
      return mockQuery;
    }
  };
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export { supabase };

// Helper functions for common operations
export const auth = supabase.auth;

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};