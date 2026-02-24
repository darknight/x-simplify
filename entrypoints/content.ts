import '../assets/simplify.css';

const STORAGE_KEY = 'xs-enabled';
const CLASS_NAME = 'xs-enabled';
const NAV_EXPANDED_CLASS = 'xs-nav-expanded';

const THEME_STORAGE_KEY = 'xs-theme';
const THEME_CLASS_PREFIX = 'xs-theme-';

const CHEVRON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_start',

  main() {
    // Restore enabled state from sessionStorage cache (prevents FOUC)
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached === 'true') {
      document.documentElement.classList.add(CLASS_NAME);
    }

    // Restore theme from sessionStorage cache (prevents FOUC)
    const cachedTheme = sessionStorage.getItem(THEME_STORAGE_KEY);
    if (cachedTheme && cachedTheme !== 'default') {
      document.documentElement.classList.add(THEME_CLASS_PREFIX + cachedTheme);
    }

    // Read persisted state and reconcile with cache
    storage.getItem<boolean>('local:enabled').then((enabled) => {
      const value = enabled ?? true;
      applyState(value);
      if (enabled === null) {
        storage.setItem('local:enabled', true);
      }
    });

    // Read persisted theme and reconcile
    storage.getItem<string>('local:theme').then((theme) => {
      applyTheme(theme ?? 'default');
    });

    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE') {
        applyState(message.enabled);
      } else if (message.type === 'SET_THEME') {
        applyTheme(message.theme);
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

function applyTheme(theme: string) {
  // Remove all existing theme classes
  const classes = document.documentElement.classList;
  const toRemove: string[] = [];
  classes.forEach((c) => {
    if (c.startsWith(THEME_CLASS_PREFIX)) toRemove.push(c);
  });
  toRemove.forEach((c) => classes.remove(c));

  // Add new theme class (unless default)
  if (theme !== 'default') {
    classes.add(THEME_CLASS_PREFIX + theme);
  }

  sessionStorage.setItem(THEME_STORAGE_KEY, theme);
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
