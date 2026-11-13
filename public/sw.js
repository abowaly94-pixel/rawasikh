// Minimal service worker — exists only to satisfy the browser's PWA
// "installable" criteria so the install prompt / "Add to Home Screen" flow
// works. It intentionally does NOT cache anything: this site just fixed a
// bug where stale cached assets caused a blank page after deploys, so this
// worker must never intercept or cache requests. Every fetch simply falls
// through to the network untouched.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle every request normally, no caching.
});
