// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),

  integrations: [
    react(),
  ],

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
    resolve: {
      // https://github.com/facebook/react/issues/31827
      alias: import.meta.env.PROD ? {
        'react-dom/server': 'react-dom/server.edge'
      } : undefined
    }
  },
});