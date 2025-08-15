// Script to check Supabase API directly
import fetch from 'node-fetch';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://kvqnjroenyqdrxmvzirj.supabase.co';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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