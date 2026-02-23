export default defineBackground(() => {
  // Toggle enabled state when toolbar icon is clicked
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !(tab.url?.includes('x.com') || tab.url?.includes('twitter.com'))) {
      return;
    }

    const current = await storage.getItem<boolean>('local:enabled');
    const next = !(current ?? true);
    await storage.setItem('local:enabled', next);

    await browser.tabs.sendMessage(tab.id, { type: 'TOGGLE', enabled: next });
  });
});
