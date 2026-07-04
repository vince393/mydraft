# MyDraft Desktop (Electron)

A thin Electron shell that loads the live, published MyDraft web app
(`https://mydraft.io`) in a standalone desktop window. All accounts,
session-cookie login, Google/Microsoft OAuth, email sync, Stripe billing and AI
features come from the hosted backend — nothing is re-bundled offline. This means
the desktop app **requires an internet connection and a working deployment**.

This project is fully self-contained in the `desktop/` folder and does not touch
the root web app's `package.json`, Vite build, or deploy.

## Layout

```
desktop/
  package.json          # Electron + electron-builder deps (separate from root)
  electron-builder.yml  # installer config for win / mac / linux
  src/main.js           # main process: window, auth, external-link routing
  src/preload.js        # exposes window.mydraftDesktop feature flag
  build/icon.png        # 512x512 app icon
```

## Develop / run locally

```bash
cd desktop
npm install
npm start                    # opens the app pointed at https://mydraft.io
MYDRAFT_APP_URL=https://your-staging-url npm start   # point at another deploy
```

## Build installers

```bash
cd desktop
npm install
npm run dist:win     # -> dist/*.exe   (NSIS installer)
npm run dist:linux   # -> dist/*.AppImage
npm run dist:mac     # -> dist/*.dmg   (must run on macOS)
```

- **Windows (`.exe`)** and **Linux (`.AppImage`)** can be built from Linux/CI.
- **macOS (`.dmg`)** must be built on a Mac (or macOS CI runner) — cross-building
  a `.dmg` from Linux is not supported by electron-builder.

## Auth & external links

- Session cookies persist between launches via a `persist:mydraft` partition, so
  users stay logged in.
- The main window only keeps MyDraft hosts loaded. OAuth consent (Google/
  Microsoft), Stripe, and any other external links open in the system browser or
  a proper popup window, never a bare embedded frame that Google would reject.
- The Electron/app tokens are stripped from the User-Agent so OAuth providers see
  a normal desktop browser.

## Code signing (out of scope for v1)

No paid certificates are configured, so installs show an "unknown developer" /
SmartScreen / Gatekeeper warning. To remove them later:

- **Windows:** add an EV/OV code-signing cert (`CSC_LINK` / `CSC_KEY_PASSWORD`).
- **macOS:** add an Apple Developer ID cert + notarization
  (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) and enable
  notarization in the mac build.

## Auto-update (future)

`electron-builder.yml` already sets `publish.provider: github`, so installers
uploaded to GitHub Releases are a stable host to later wire `electron-updater`
against. Not enabled in v1.

## Releasing via CI

`.github/workflows/desktop-build.yml` builds all three targets on their native
OS runners and uploads the installers to a GitHub Release when a `desktop-v*` tag
is pushed.
