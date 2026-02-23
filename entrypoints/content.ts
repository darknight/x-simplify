import '../assets/simplify.css';

const STORAGE_KEY = 'xs-enabled';
const CLASS_NAME = 'xs-enabled';

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_start',

  main() {
    // Use sessionStorage as a fast synchronous cache to avoid FOUC.
    // On first load we fall back to chrome.storage.local (async).
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached === 'true') {
      document.documentElement.classList.add(CLASS_NAME);
    }

    // Read persisted state and reconcile with cache
    storage.getItem<boolean>('local:enabled').then((enabled) => {
      // Default to enabled on first install
      const value = enabled ?? true;
      applyState(value);
      if (enabled === null) {
        storage.setItem('local:enabled', true);
      }
    });

    // Listen for toggle messages from background script
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE') {
        applyState(message.enabled);
      }
    });
  },
});

function applyState(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add(CLASS_NAME);
  } else {
    document.documentElement.classList.remove(CLASS_NAME);
  }
  sessionStorage.setItem(STORAGE_KEY, String(enabled));
}
