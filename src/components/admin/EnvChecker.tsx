import React, { useEffect, useState } from 'react';

interface EnvStatus {
  configured: boolean;
  value: string;
}

interface EnvCheckResponse {
  status: string;
  timestamp: string;
  environment: string;
  variables: {
    PUBLIC_SUPABASE_URL: EnvStatus;
    PUBLIC_SUPABASE_ANON_KEY: EnvStatus;
  };
  message: string;
}

export default function EnvChecker() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envData, setEnvData] = useState<EnvCheckResponse | null>(null);

  useEffect(() => {
    async function checkEnv() {
      try {
        // Direct client-side check
        const clientCheck = {
          PUBLIC_SUPABASE_URL: {
            configured: !!import.meta.env.PUBLIC_SUPABASE_URL,
            value: import.meta.env.PUBLIC_SUPABASE_URL 
              ? `${import.meta.env.PUBLIC_SUPABASE_URL.substring(0, 8)}...` 
              : 'Not configured'
          },
          PUBLIC_SUPABASE_ANON_KEY: {
            configured: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
            value: import.meta.env.PUBLIC_SUPABASE_ANON_KEY 
              ? 'Configured (hidden for security)' 
              : 'Not configured'
          }
        };

        setEnvData({
          status: 'Client-Side Environment Check',
          timestamp: new Date().toISOString(),
          environment: import.meta.env.MODE,
          variables: clientCheck,
          message: (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) 
            ? 'Warning: Some Supabase environment variables are missing. This will cause API errors.' 
            : 'All required Supabase environment variables are configured.'
        });
        setLoading(false);
      } catch (err) {
        setError('Error checking environment variables');
        setLoading(false);
        console.error('Environment check error:', err);
      }
    }

    checkEnv();
  }, []);

  if (loading) {
    return <div className="p-4 bg-gray-100 rounded-lg">Loading environment status...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">{envData?.status}</h2>
      <p className="mb-2"><span className="font-semibold">Environment:</span> {envData?.environment}</p>
      <p className="mb-2"><span className="font-semibold">Timestamp:</span> {envData?.timestamp}</p>
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Environment Variables:</h3>
        <div className="space-y-2">
          {envData?.variables && Object.entries(envData.variables).map(([key, status]) => (
            <div key={key} className={`p-3 rounded-md ${status.configured ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="font-mono">{key}</p>
              <p className={`text-sm ${status.configured ? 'text-green-600' : 'text-red-600'}`}>
                {status.configured ? '✓ Configured' : '✗ Not Configured'} - {status.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-6 p-4 rounded-md ${envData?.message.includes('Warning') ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
        {envData?.message}
      </div>
    </div>
  );
}