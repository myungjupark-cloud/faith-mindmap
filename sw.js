var CACHE = "faith-mindmap-v54";

function isShellPath(pathname) {
  if (!pathname || pathname === "/") return true;
  if (pathname === "/index.html") return true;
  return /\.(html|js|css)$/i.test(pathname);
}

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;
  if (url.pathname.indexOf("/api/") >= 0) return;

  if (isShellPath(url.pathname)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  if (url.pathname.indexOf("/data/") >= 0) {
    e.respondWith(networkFirst(e.request, true));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});

function networkFirst(request, cacheData) {
  return fetch(request).then(function (res) {
    if (res && res.ok && (cacheData || isShellPath(new URL(request.url).pathname))) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) {
        cache.put(request, copy);
      });
    }
    return res;
  }).catch(function () {
    return caches.match(request);
  });
}

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
