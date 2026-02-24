import '../assets/simplify.css';

const STORAGE_KEY = 'xs-enabled';
const CLASS_NAME = 'xs-enabled';
const NAV_EXPANDED_CLASS = 'xs-nav-expanded';

const CHEVRON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

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

    // Inject toggle button into nav
    waitForNav((nav) => {
      const btn = document.createElement('button');
      btn.className = 'xs-toggle';
      btn.setAttribute('aria-label', 'Toggle navigation');
      btn.innerHTML = CHEVRON_SVG;
      nav.prepend(btn);

      btn.addEventListener('click', () => {
        document.documentElement.classList.toggle(NAV_EXPANDED_CLASS);
      });
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

/** Wait for nav[aria-label="Primary"] to appear (X.com is a SPA). */
function waitForNav(callback: (nav: HTMLElement) => void) {
  const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary"]');
  if (nav) {
    callback(nav);
    return;
  }

  const observer = new MutationObserver(() => {
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary"]');
    if (nav) {
      observer.disconnect();
      callback(nav);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
