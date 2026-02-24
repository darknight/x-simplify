import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'X-Simplify',
    description: 'Simplify X.com by hiding distracting UI elements with pure CSS',
    version: '0.2.0',
    permissions: ['storage'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*'],
    icons: {
      16: '/icon-16.png',
      48: '/icon-48.png',
      96: '/icon-96.png',
      128: '/icon-128.png',
    },
  },
  runner: {
    startUrls: ['https://x.com/home'],
  },
});
