// Change this number to force a new service worker install
// and app update
const SERVICE_WORKER_VERSION = 130

// Cache the app main files
const filesToCache = [
    'style.css',
    'bundle.js',
    'index.html',
    "assets/it_dgc_certificates.json",
    "assets/it_dgc_public_keys.json",
    "assets/icons/icon-128x128.png",
    "assets/icons/icon-152x152.png",
    "assets/icons/icon-384x384.png",
    "assets/icons/icon-512x512.png",
    "assets/icons/icon-96x96.png",
    "assets/icons/icon-144x144.png",
    "assets/icons/icon-192x192.png",
    "assets/icons/icon-48x48.png",
    "assets/icons/icon-72x72.png",
    "qr-scanner-worker.min.js",
    "qr-scanner-worker.min.js.map",
  ];
  
const staticCacheName = `app-cache-v${SERVICE_WORKER_VERSION}`;
  

self.addEventListener('install', event => {
    console.log('Attempting to install service worker and cache static assets');
    event.waitUntil(
        caches.open(staticCacheName)
        .then(cache => {
          return cache.addAll(filesToCache);
        })
    );
});

// Delete the old app cached files
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (cacheName) {
            // Return true if you want to remove this cache,
            // but remember that caches are shared across
            // the whole origin
            if (cacheName !== staticCacheName) {
              //console.warn(`${cacheName} will be purged from Cache Storage`);
              return true;
            }
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          }),
      );
    }),
  );
});



// Cache the valueset .json files
self.addEventListener('fetch', event => {
    //console.log('Fetch event for ', event.request.url);
    event.respondWith(
        caches.match(event.request)
        .then(response => {
        if (response) {
            //console.log('Found ', event.request.url, ' in cache');
            return response;
        }

        //console.log('Network request for ', event.request.url);
        return fetch(event.request)
          .then(response => {
              return caches.open(staticCacheName).then(cache => {
                cache.put(event.request.url, response.clone());
                return response;
              });
            });

          }).catch(error => {

          // TODO 6 - Respond with custom offline page

          })
    );
});


// Wait for user prompt before force replacing an existing service worker
// as explained by: https://whatwebcando.today/articles/handling-service-worker-updates/
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});