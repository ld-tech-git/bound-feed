const CACHE = 'opencv-cache-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.add('https://docs.opencv.org/4.10.0/opencv.js')
    )
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('opencv.js')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
