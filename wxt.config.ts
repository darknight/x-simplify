import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'X-Simplify',
    description: 'Simplify X.com by hiding distracting UI elements with pure CSS',
    version: '0.2.0',
    permissions: ['storage'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*'],
  },
  runner: {
    startUrls: ['https://x.com/home'],
  },
});
