import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    })
  ],
  output: 'static',
  site: 'https://scyc.org.uk',
  build: {
    assets: 'assets'
  },
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  }
});