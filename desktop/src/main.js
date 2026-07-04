const {
  app,
  BrowserWindow,
  shell,
  session,
  Menu,
} = require("electron");
const path = require("path");

// The published web app the desktop shell loads. Override at build/run time with
// the MYDRAFT_APP_URL env var (e.g. to point at a staging deployment).
const APP_URL = process.env.MYDRAFT_APP_URL || "https://mydraft.io";
const APP_ORIGIN = new URL(APP_URL).origin;

// Hosts we allow to render *inside* the app window. Everything else (OAuth
// consent screens, Stripe, external help/marketing links) is pushed to the
// user's system browser so providers like Google accept the flow and don't
// reject it as an embedded webview.
const INTERNAL_HOST_SUFFIXES = [
  new URL(APP_URL).hostname,
  ".replit.app",
  ".replit.dev",
];

function isInternalUrl(target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return INTERNAL_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith(".") ? host.endsWith(suffix) : host === suffix,
  );
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 600,
    title: "MyDraft",
    backgroundColor: "#0b0b0d",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Persist session cookies between launches so login survives restarts.
      partition: "persist:mydraft",
    },
  });

  // Open target=_blank / window.open calls: keep MyDraft/OAuth-capable hosts in
  // a real popup window (Google/Microsoft need a genuine browser window, not the
  // main SPA frame), send everything else to the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            partition: "persist:mydraft",
          },
        },
      };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Top-level navigations to non-MyDraft hosts open externally so the app frame
  // always stays on MyDraft.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// A single instance only; focus the existing window if a second launch happens.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Minimal native menu (keeps standard shortcuts like copy/paste/quit).
    if (process.platform === "darwin") {
      Menu.setApplicationMenu(Menu.buildFromTemplate(buildMacMenu()));
    } else {
      Menu.setApplicationMenu(null);
    }

    // Present a normal desktop-browser User-Agent (strip Electron/app tokens) so
    // Google/Microsoft OAuth don't flag the request as an embedded webview.
    const ua = session
      .fromPartition("persist:mydraft")
      .getUserAgent()
      .replace(/ Electron\/[\d.]+/g, "")
      .replace(/ mydraft-desktop\/[\d.]+/gi, "")
      .replace(/ MyDraft\/[\d.]+/gi, "");
    session.fromPartition("persist:mydraft").setUserAgent(ua);

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

function buildMacMenu() {
  return [
    {
      label: "MyDraft",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];
}

module.exports = { isInternalUrl, APP_ORIGIN };
