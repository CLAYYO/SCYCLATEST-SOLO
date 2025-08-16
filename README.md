# SCYC Website

This is the website for the South Coast Yacht Club built with Astro.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [Astro documentation](https://docs.astro.build) or jump into the [Astro Discord server](https://astro.build/chat).

## 🔑 Environment Variables

### Supabase Configuration

This project requires Supabase for database functionality. You need to configure the following environment variables:

- `PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Setting up Environment Variables

#### For Local Development

Create a `.env` file in the root directory with the following content:

```
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### For Cloudflare Pages Deployment

You have two options to configure environment variables for production:

1. **Using Cloudflare Dashboard (Recommended for sensitive data)**:
   - Go to the Cloudflare Pages dashboard
   - Select your project
   - Navigate to Settings > Environment variables
   - Add the variables as **Secrets** (encrypted)
   - Deploy your site

2. **Using wrangler.toml**:
   - Open `wrangler.toml`
   - Uncomment and update the variables in the `[vars]` section
   - Note: This method stores values in plain text in your repository

If you encounter "Internal server error" when saving data, it's likely due to missing or incorrect Supabase environment variables.
