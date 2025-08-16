# Troubleshooting Guide

## Supabase Connection Issues

### "Error saving person: Internal server error"

If you encounter this error when trying to add or edit people in the ACF People Management section, it's likely due to missing or incorrect Supabase environment variables.

#### Diagnosis

1. The error occurs because the application is using a mock Supabase client instead of connecting to your actual Supabase instance.
2. This happens when `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` environment variables are not properly configured.

#### Solution

1. **Check Environment Variables in Cloudflare Dashboard**:
   - Go to the Cloudflare Pages dashboard
   - Select your project (scyclatest-solo)
   - Navigate to Settings > Environment variables
   - Verify that `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set correctly
   - Make sure they are added as **Secrets** (encrypted)

2. **Alternative: Configure in wrangler.toml**:
   - Open `wrangler.toml` in your project
   - Uncomment and update the Supabase variables in the `[vars]` section
   - Deploy your site

3. **Verify Configuration**:
   - After updating the environment variables, redeploy your site
   - Try adding a person again to see if the issue is resolved

### "403 Forbidden" Error

If you encounter a 403 Forbidden error when trying to access the API endpoints, it might be due to authentication issues.

#### Solution

1. Make sure you're logged in with an account that has admin privileges
2. Check that your Supabase Row Level Security (RLS) policies are correctly configured
3. Verify that your authentication tokens are valid and not expired

## Other Common Issues

### Build Errors

If you encounter build errors after updating environment variables:

1. Make sure your wrangler.toml file is correctly formatted
2. Check that you're not mixing environment variable configurations between the dashboard and wrangler.toml
3. Try removing environment variables from one source if you've configured them in another

### Local Development Issues

For local development:

1. Ensure you have a `.env` file with the correct Supabase credentials
2. Run `npm run dev` to start the development server
3. Check the console for any error messages related to Supabase connection

## Getting Help

If you continue to experience issues:

1. Check the Supabase documentation: https://supabase.com/docs
2. Review the Cloudflare Pages documentation: https://developers.cloudflare.com/pages/
3. Contact the development team for further assistance