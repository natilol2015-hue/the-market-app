// THE MARKET — service worker
// Solo cachea el "cascarón" de la app (html, íconos, manifest) para que abra
// como app instalada y funcione un momento sin conexión. Nunca toca pedidos
// que no sean GET, ni las llamadas a la API/Auth de Supabase: esas siempre
// van directo a la red, tal cual, para no arriesgar datos.

var CACHE_NAME = 'the-market-shell-v1';
var SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL).catch(function () { /* ok si alguno falla */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // nunca intervenir escrituras (insert/update/delete/login) ni nada que no sea GET
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isAsset = /\.(png|jpg|jpeg|svg|ico|json)$/i.test(url.pathname);
  var isShell = req.mode === 'navigate' || url.pathname.endsWith('/index.html');

  // dejar pasar sin tocar todo lo demás (API REST, Auth, Realtime de Supabase)
  if (!isAsset && !isShell) return;

  event.respondWith(
    fetch(req)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        return res;
      })
      .catch(function () { return caches.match(req); })
  );
});
