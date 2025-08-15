import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';
import { messageChannelPolyfill } from './vite-plugins/message-channel-polyfill.js';
// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    })
  ],
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced'
  }),
  site: 'https://scyclatest-solo.pages.dev/',
  // Force deployment refresh - updated
  build: {
    assets: 'assets'
  },
  vite: {
    plugins: [messageChannelPolyfill()],
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