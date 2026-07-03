# X-Simplify

A WXT (Manifest V3) Chrome extension that declutters X.com with pure CSS,
gated behind `html.xs-enabled` classes so toggles are instant. Content script:
`entrypoints/content.ts`; styles: `assets/simplify.css`; popup: `entrypoints/popup.html` + `lib/popup.ts`; settings broadcast: `entrypoints/background.ts`.

- Build: `bun run build` → `.output/chrome-mv3`
- Package: `npx wxt zip` → `.output/x-simplify-<version>-chrome.zip`
- Type-check: `./node_modules/.bin/tsc --noEmit` (Vite build does NOT type-check)

## Local testing in a real browser

Testing the extension on x.com requires driving a **real, logged-in Google
Chrome**. Do NOT use agent-browser's / Playwright's default bundled Chromium —
x.com's bot detection blocks login on it ("We've temporarily limited your
login"). The working recipe, and why each flag is needed:

1. **Build** the extension: `bun run build`.

2. **Launch real Chrome as a plain background process** (NOT via agent-browser's
   launcher — the automation flag it sets makes Chrome silently ignore extension
   loading):
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9333 \
     --user-data-dir="$PWD/.chrome-debug" \
     --enable-unsafe-extension-debugging \
     --no-first-run --no-default-browser-check \
     about:blank >/dev/null 2>&1 &
   ```
   - `--user-data-dir` (a dedicated dir) is **required**: Chrome 136+ refuses CDP
     remote debugging on the default profile. `.chrome-debug/` is gitignored and
     persists the X login across runs (log in once).
   - Use port **9333**, not 9222 — 9222 is often already taken by another Chrome.
   - `--enable-unsafe-extension-debugging` enables the CDP `Extensions.loadUnpacked`
     method used below.

3. **Load the unpacked extension via CDP.** `--load-extension` does NOT work:
   branded Chrome 142+ removed it (and the `--disable-features=DisableLoadExtensionCommandLineSwitch`
   workaround). Send `Extensions.loadUnpacked` over the browser WebSocket instead:
   ```bash
   WS=$(curl -s http://127.0.0.1:9333/json/version \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['webSocketDebuggerUrl'])")
   # Minimal client: open WS, send {id:1,method:'Extensions.loadUnpacked',
   #   params:{path:'<abs path to .output/chrome-mv3>'}}, read the {result:{id}} reply.
   ```
   The reply gives the extension id. It may load **disabled** — enable it: on a
   `chrome://extensions` tab run `chrome.management.setEnabled('<id>', true)`.

4. **Drive it**: `agent-browser connect 9333`, then navigate/snapshot/eval as usual.
   For video tweets to test against, a video-heavy profile (e.g. `https://x.com/SpaceX`)
   is more reliable than search (`filter:videos` search often rate-limits a fresh session).

### Gotchas

- **Stale content-script cache after rebuild.** Chrome caches the compiled
  content script per extension id; reloading the *same path* often keeps running
  the OLD JS even though CSS updates. To force a clean load, copy the build to a
  **fresh directory** (new path → new id → no cache) and `loadUnpacked` that, or
  fully remove + re-add the extension.
- **Never schedule DOM work with `requestAnimationFrame` in the content script.**
  rAF is paused while the window is occluded/backgrounded (which it is during this
  kind of testing), so rAF-scheduled scans never fire. Use `setTimeout` instead —
  this also matters for real users who open X in a background tab.
