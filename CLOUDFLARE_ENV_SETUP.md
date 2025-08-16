# Cloudflare Pages Environment Variables Setup

## Issue
The ACF People Management API is returning 500/403 errors in production because environment variables are not configured in Cloudflare Pages.

## Required Environment Variables
You need to add these environment variables in the Cloudflare Pages dashboard:

1. **PUBLIC_SUPABASE_URL**
   - Value: `https://kvqnjroenyqdrxmvzirj.supabase.co`

2. **PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cW5qcm9lbnlxZHJ4bXZ6aXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM0MTMsImV4cCI6MjA3MDc0OTQxM30.AIvynZargdB99zfyHJRrAzUX_Fl0e3r7kzsAlYPUxpE`

## How to Add Environment Variables

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **scyclatest-solo**
3. Go to **Settings** → **Environment variables**
4. Click **Add variable** for each environment variable
5. Set the **Variable name** and **Value**
6. Make sure to set them for **Production** environment
7. Click **Save**

## After Adding Variables

1. Trigger a new deployment by pushing a commit or manually redeploying
2. The API endpoints should work correctly
3. Test the ACF People Management system

## Current Status
- ❌ Environment variables not configured in Cloudflare Pages
- ❌ API routes returning 403/500 errors
- ❌ Supabase client falling back to mock client

## Next Steps
1. Configure environment variables in Cloudflare Pages dashboard
2. Redeploy the application
3. Test the ACF People Management functionality