const CACHE = 'opencv-cache-v2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        'https://docs.opencv.org/4.10.0/opencv.js',
        'https://docs.opencv.org/4.10.0/opencv_js.wasm'
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('opencv')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
