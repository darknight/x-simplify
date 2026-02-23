import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'X-Simplify',
    description: 'Simplify X.com by hiding distracting UI elements with pure CSS',
    version: '0.1.0',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*'],
  },
  runner: {
    startUrls: ['https://x.com/home'],
  },
});
