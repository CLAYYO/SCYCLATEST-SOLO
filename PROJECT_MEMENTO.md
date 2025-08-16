## Project Context

This project is a web application for the South Caernarvonshire Yacht Club (SCYC) that includes various features such as forms administration, event management, and content management.

## Authentication System

The application uses Supabase for authentication and database management. Authentication is implemented through Supabase client initialization in `src/lib/supabase.ts` with helper functions for `signIn`, `signUp`, `signOut`, `getCurrentUser`, and `getCurrentSession`.

## Environment Variables Configuration

The application requires the following Supabase environment variables to function properly:
- `PUBLIC_SUPABASE_URL`: The URL of the Supabase project (Value: `https://kvqnjroenyqdrxmvzirj.supabase.co`)
- `PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for the Supabase project

These variables are currently configured in the local `.env` file for development but need to be properly set up in the Cloudflare Pages dashboard for production deployment. The screenshot shows that these variables are currently set as encrypted secrets in the Cloudflare Pages dashboard but may not be properly configured for the production environment.

### Current Issues

- **Cloudflare Environment Variables**: The Supabase environment variables (`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`) appear to be set in the Cloudflare Pages dashboard as encrypted secrets, but they may not be properly configured for the production environment, leading to authentication failures and 403/500 errors in production. When these variables are missing or incorrect, the application falls back to using a mock Supabase client, which cannot perform real database operations.
- **Admin Authentication**: Admin pages like `src/pages/admin/events.astro` and `src/pages/racing/admin.astro` have TODO comments indicating that authentication checks need to be implemented.

### Row Level Security (RLS)

Supabase migrations define Row Level Security (RLS) policies requiring `authenticated` roles for managing data in several tables, including:
- Forms administration tables
- ACF events tables
- ACF people tables
- ACF local accommodations tables

## Troubleshooting

### Common Issues

1. **"Error saving person: Internal server error"**
   - Caused by missing or incorrect Supabase environment variables
   - Application falls back to mock Supabase client which cannot perform real operations
   - Solution: Configure `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in Cloudflare Pages dashboard

2. **"403 Forbidden" Error**
   - May be due to authentication issues
   - Solutions:
     - Ensure you're logged in with an account that has admin privileges
     - Check that Supabase Row Level Security (RLS) policies are correctly configured
     - Verify that authentication tokens are valid and not expired

3. **Build Errors**
   - Check for correct formatting in wrangler.toml
   - Avoid mixing environment variable configurations between dashboard and wrangler.toml

4. **Local Development Issues**
   - Ensure `.env` file has correct Supabase credentials
   - Run `npm run dev` to start the development server
   - Check console for Supabase connection error messages

## API Structure

The project uses Astro's API routes with the Cloudflare adapter in 'advanced' mode:

- API routes are defined in `src/pages/api/` directory
- The project is configured with `output: 'server'` in `astro.config.mjs`
- API endpoints are defined as TypeScript files with exported request handler functions
- Example: `export const get: APIRoute = async () => { ... }`

### Environment Variable Access

- Environment variables are accessed via `import.meta.env.VARIABLE_NAME`
- Supabase environment variables are prefixed with `PUBLIC_`
- The `/api/env-check.ts` endpoint provides a way to verify environment variable configuration

### Environment Testing Tools

The following tools have been created to help test environment variable configuration:

1. **API Endpoint**: `/api/test-env` - A simplified version of the env-check endpoint
2. **React Component**: `EnvChecker.tsx` - A client-side component that checks environment variables
3. **Test Page**: `/admin/env-test` - A page that uses the EnvChecker component to display environment variable status

## Next Steps

1. Verify that the Supabase environment variables in the Cloudflare Pages dashboard are correctly configured for the production environment as described in `CLOUDFLARE_ENV_SETUP.md`
2. Ensure the variables are set as secrets (encrypted) and are applied to the production environment
3. Trigger a new deployment by pushing a commit or manually redeploying
4. Use the new environment checker tools to verify variables are accessible:
   - Visit `/admin/env-test` in the browser to check client-side environment variable access
   - Use the `/api/test-env` endpoint to verify server-side environment variable access
5. Implement authentication checks on admin pages
6. Test ACF people management functionality after environment variables are configured
7. Monitor for 403/500 errors and verify that the application is no longer falling back to the mock Supabase client