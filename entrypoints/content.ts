import '../assets/simplify.css';

const STORAGE_KEY = 'xs-enabled';
const VIDEOS_STORAGE_KEY = 'xs-collapse-videos';
const CLASS_NAME = 'xs-enabled';
const NAV_EXPANDED_CLASS = 'xs-nav-expanded';
const COLLAPSE_VIDEOS_CLASS = 'xs-collapse-videos';

const CHEVRON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const VIDEO_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_start',

  main() {
    // Restore state from sessionStorage cache (prevents FOUC)
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached === 'true') {
      document.documentElement.classList.add(CLASS_NAME);
    }
    if (sessionStorage.getItem(VIDEOS_STORAGE_KEY) !== 'false') {
      document.documentElement.classList.add(COLLAPSE_VIDEOS_CLASS);
    }

    // Read persisted state and reconcile with cache
    storage.getItem<boolean>('local:enabled').then((enabled) => {
      const value = enabled ?? true;
      applyState(value);
      if (enabled === null) {
        storage.setItem('local:enabled', true);
      }
    });
    storage.getItem<boolean>('local:collapseVideos').then((collapse) => {
      const value = collapse ?? true;
      applyVideoState(value);
      if (collapse === null) {
        storage.setItem('local:collapseVideos', true);
      }
    });

    // Listen for messages from background script
    browser.runtime.onMessage.addListener((rawMessage: unknown) => {
      const message = rawMessage as { type: string; enabled: boolean };
      if (message.type === 'TOGGLE') {
        applyState(message.enabled);
      }
      if (message.type === 'TOGGLE_VIDEOS') {
        applyVideoState(message.enabled);
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

    watchVideoTweets();
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

function applyVideoState(collapse: boolean) {
  if (collapse) {
    document.documentElement.classList.add(COLLAPSE_VIDEOS_CLASS);
  } else {
    document.documentElement.classList.remove(COLLAPSE_VIDEOS_CLASS);
  }
  sessionStorage.setItem(VIDEOS_STORAGE_KEY, String(collapse));
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

/* ============================================================
 * VIDEO TWEET COLLAPSE
 *   Timeline tweets containing a video player get their media
 *   collapsed behind a "Video" placeholder. Clicking the
 *   placeholder reveals the video. Visuals are CSS-gated under
 *   html.xs-enabled.xs-collapse-videos so toggles stay instant.
 * ============================================================ */

function watchVideoTweets() {
  // Tweet IDs the user manually expanded — survives X's DOM recycling
  const expandedTweets = new Set<string>();
  let scheduled = false;

  const scan = () => {
    scheduled = false;
    const articles = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]');
    for (const article of articles) {
      processTweet(article, expandedTweets);
    }
  };

  // setTimeout, not requestAnimationFrame: rAF is paused while the tab is
  // backgrounded or the window is occluded, which would leave videos
  // un-collapsed until the tab is next focused.
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(scan, 100);
  };

  const start = () => {
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  };

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
}

function processTweet(article: HTMLElement, expandedTweets: Set<string>) {
  const tweetId = getTweetId(article);

  // Ads / "boosted" tweets have no /status/ permalink, so getTweetId returns
  // null. Fall back to a sentinel string so id-less tweets still get a stable
  // processed-marker: without one the guards below never fire, and since each
  // placeholder insertion is a DOM mutation the observer re-scans on, the
  // placeholder duplicates without bound as you scroll.
  const marker = tweetId ?? '';

  // X recycles article nodes while scrolling — clean stale markup when a
  // processed node now renders a different tweet, otherwise skip nodes we've
  // already collapsed (idempotent across the observer's repeated scans).
  const marked = article.dataset.xsVideoId;
  if (marked !== undefined && marked !== marker) {
    cleanupTweet(article);
  } else if (marked === marker && article.querySelector('.xs-video-placeholder')) {
    return;
  }

  // The focal tweet on a detail page is what the user came to see
  if (isFocalTweet(article)) return;

  const component = article.querySelector('[data-testid="videoComponent"]');
  if (!component || isGif(component)) return;

  const target = findCollapseTarget(component, article);
  if (!target) return;

  // The bar is a persistent toggle: it stays above the media in both states
  // so an expanded video can be collapsed again. Restore the last state the
  // user chose for this tweet (survives X's DOM recycling on scroll).
  const placeholder = document.createElement('button');
  placeholder.type = 'button';
  placeholder.className = 'xs-video-placeholder';
  placeholder.innerHTML = `${VIDEO_SVG}<span class="xs-video-tag">Video</span><span class="xs-video-hint"></span>`;
  const hint = placeholder.querySelector<HTMLElement>('.xs-video-hint')!;

  const render = (expanded: boolean) => {
    target.classList.toggle('xs-video-collapse', !expanded);
    placeholder.classList.toggle('xs-expanded', expanded);
    hint.textContent = expanded ? 'Click to collapse' : 'Click to expand';
  };
  render(!!tweetId && expandedTweets.has(tweetId));

  placeholder.addEventListener('click', (e) => {
    // Article itself navigates on click — keep the toggle local
    e.preventDefault();
    e.stopPropagation();
    const expanded = target.classList.contains('xs-video-collapse');
    render(expanded);
    if (tweetId) {
      if (expanded) expandedTweets.add(tweetId);
      else expandedTweets.delete(tweetId);
    }
  });
  target.before(placeholder);

  article.dataset.xsVideoId = marker;
}

function cleanupTweet(article: HTMLElement) {
  article.querySelectorAll('.xs-video-placeholder').forEach((el) => el.remove());
  article.querySelectorAll('.xs-video-collapse').forEach((el) => el.classList.remove('xs-video-collapse'));
  delete article.dataset.xsVideoId;
}

function getTweetId(article: HTMLElement): string | null {
  const link = article.querySelector<HTMLAnchorElement>('a[href*="/status/"]:has(time)');
  const match = link?.href.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

/** The focal tweet on /status/ pages has tabindex="-1"; timeline tweets have "0". */
function isFocalTweet(article: HTMLElement): boolean {
  return article.getAttribute('tabindex') === '-1';
}

/** GIFs autoplay too but are short and silent — leave them alone. */
function isGif(component: Element): boolean {
  const video = component.querySelector('video');
  if (video?.getAttribute('poster')?.includes('tweet_video_thumb')) return true;
  // Fallback: the "GIF" badge overlay
  for (const el of component.querySelectorAll('span, div')) {
    if (el.childElementCount === 0 && el.textContent?.trim() === 'GIF') return true;
  }
  return false;
}

/**
 * The video sits inside a `tweetPhoto` media block whose aspect ratio is
 * reserved by a padding-based spacer sibling. Hiding an inner wrapper leaves
 * that spacer holding an empty box, so collapse the whole media block.
 * Falls back to climbing single-child wrappers if the testid is ever absent.
 */
function findCollapseTarget(component: Element, article: Element): HTMLElement | null {
  const photo = component.closest<HTMLElement>('[data-testid="tweetPhoto"]');
  if (photo && article.contains(photo)) return photo;

  let el = component as HTMLElement;
  while (
    el.parentElement &&
    el.parentElement !== article &&
    el.parentElement.childElementCount === 1
  ) {
    el = el.parentElement;
  }
  return el;
}
