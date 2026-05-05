const CACHE_NAME = 'linkos-pwa-v1';
const assets = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './footer.css',
    './screen.css',
    './manifest.json',
    './assets/icon-144.png',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './offline.html',
    'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request).catch(() => {
                if (e.request.mode === 'navigate') return caches.match('offline.html');
            });
        })
    );
});