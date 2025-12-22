import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

const vercelAnalyticsId =
  process.env.VERCEL_ANALYTICS_ID ?? process.env.PUBLIC_VERCEL_ANALYTICS_ID;

export default defineConfig({
  output: 'hybrid',
  adapter: vercel({
    webAnalytics: { enabled: Boolean(vercelAnalyticsId) },
    speedInsights: { enabled: Boolean(vercelAnalyticsId) },
    imageService: true,
    devImageService: 'sharp',
    functionPerRoute: false,
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    ssr: {
      noExternal: ['@astrojs/react']
    },
    build: {
      rollupOptions: {
        external: []
      }
    }
  }
});
