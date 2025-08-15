// Script to check Supabase API directly
import fetch from 'node-fetch';

const supabaseUrl = 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM0MTMsImV4cCI6MjA3MDc0OTQxM30.Yd_HbAmGRxKGXEMzLSFwt-OGjZEgMOlLRnZ9NWEpbIQ';

async function checkSupabaseAPI() {
  try {
    console.log('Checking Supabase API directly...');
    
    // Try to fetch forms table
    const response = await fetch(`${supabaseUrl}/rest/v1/forms?select=*&limit=5`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Forms data:', data);
    
  } catch (error) {
    console.error('Error checking Supabase API:', error);
  }
}

checkSupabaseAPI();