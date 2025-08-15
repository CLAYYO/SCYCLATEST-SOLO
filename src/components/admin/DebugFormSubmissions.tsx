import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with conditional creation for static builds
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase admin environment variables - using mock client for static build');
  
  // Create a mock admin client that provides basic structure for static builds
  supabase = {
    from: () => {
      const mockQuery = {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => mockQuery,
        eq: () => mockQuery,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        then: (resolve: (value: { data: any[], error: null }) => void) => resolve({ data: [], error: null })
      };
      return mockQuery;
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default function DebugFormSubmissions() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSubmissions() {
      try {
        setLoading(true);
        
        // Get Contact Form SCYC
        const { data: forms, error: formsError } = await supabase
          .from('forms')
          .select('id, title')
          .eq('title', 'Contact Form SCYC');
        
        if (formsError) {
          throw formsError;
        }
        
        if (!forms || forms.length === 0) {
          setDebugInfo({ error: 'Contact Form SCYC not found' });
          return;
        }
        
        const formId = forms[0].id;
        
        // Count submissions for this form
        const { data: submissions, error: submissionsError } = await supabase
          .from('form_submissions')
          .select('id')
          .eq('form_id', formId);
        
        if (submissionsError) {
          throw submissionsError;
        }
        
        // Check for submissions with NULL form_id
        const { data: nullSubmissions, error: nullError } = await supabase
          .from('form_submissions')
          .select('id')
          .is('form_id', null);
        
        if (nullError) {
          throw nullError;
        }
        
        setDebugInfo({
          contactForm: forms[0],
          submissionsCount: submissions?.length || 0,
          nullSubmissionsCount: nullSubmissions?.length || 0
        });
      } catch (e: any) {
        console.error('Debug error:', e);
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    checkSubmissions();
  }, []);

  if (loading) {
    return <div className="p-4 bg-gray-100 rounded-lg">Loading debug info...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded-lg">Error: {error}</div>;
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
      <pre className="bg-white p-3 rounded overflow-auto text-sm">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}