const { contextBridge } = require("electron");

// A small, safe bridge the web app can feature-detect to know it is running
// inside the desktop shell (e.g. to hide the "Download for Desktop" prompt).
contextBridge.exposeInMainWorld("mydraftDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || "1.0.0",
});
