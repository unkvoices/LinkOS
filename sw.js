const CACHE_NAME = 'linkos-v4';
const assets = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'footer.css',
    'screen.css',
    'manifest.json',
    'assets/logo_9.png',
    'assets/Ativo 1logo.svg',
    'assets/Ativo 1logo.png',
    'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js',
    'offline.html'
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