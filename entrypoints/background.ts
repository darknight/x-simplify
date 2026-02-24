export default defineBackground(() => {
  const X_URLS = ['*://x.com/*', '*://twitter.com/*'];

  async function broadcast(message: Record<string, unknown>) {
    const tabs = await browser.tabs.query({ url: X_URLS });
    for (const tab of tabs) {
      if (tab.id) browser.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  }

  storage.watch<boolean>('local:enabled', (newValue) => {
    broadcast({ type: 'TOGGLE', enabled: newValue ?? true });
  });

  storage.watch<string>('local:theme', (newTheme) => {
    broadcast({ type: 'SET_THEME', theme: newTheme ?? 'default' });
  });
});
