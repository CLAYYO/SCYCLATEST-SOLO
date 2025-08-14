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
  site: 'https://scyclatest-solo.pages.dev/',
  // Force deployment refresh
  build: {
    assets: 'assets'
  },
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom']
    },
    ssr: {
      external: [
        'path',
        'fs',
        'vm',
        'events',
        'url',
        'util',
        'http',
        'https',
        'assert',
        'string_decoder',
        'child_process',
        'os',
        'buffer',
        'crypto',
        'net',
        'tls',
        'stream',
        'zlib'
      ]
    }
  }
});