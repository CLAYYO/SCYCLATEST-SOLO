import type { APIRoute } from 'astro';

// This endpoint allows checking if environment variables are properly configured
// IMPORTANT: This should be disabled or protected in production
export const get: APIRoute = async () => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  
  // Check if environment variables are set
  const envStatus = {
    PUBLIC_SUPABASE_URL: {
      configured: !!supabaseUrl,
      // Don't show the full URL for security reasons
      value: supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : 'Not configured'
    },
    PUBLIC_SUPABASE_ANON_KEY: {
      configured: !!supabaseAnonKey,
      // Don't show the key for security reasons
      value: supabaseAnonKey ? 'Configured (hidden for security)' : 'Not configured'
    }
  };

  return new Response(JSON.stringify({
    status: 'Environment Variable Check',
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
    variables: envStatus,
    message: (!supabaseUrl || !supabaseAnonKey) 
      ? 'Warning: Some Supabase environment variables are missing. This will cause API errors.' 
      : 'All required Supabase environment variables are configured.'
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};