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
  event.waitUntil(
    // Drop caches left behind by earlier worker versions. Those stale entries
    // are what kept serving an old build (and its blank sections) after a
    // deploy; this worker never creates caches of its own.
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle every request normally, no caching.
});
