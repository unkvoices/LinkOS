/* Nome do Cache e Ativos para armazenamento offline */
const CACHE_NAME = 'linkos-pwa-v5';
const assets = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'footer.css',
    'screen.css',
    'manifest.json',
    'assets/Ativo%201logo.png',
    'assets/icon32.png',
    'assets/icon144.png',
    'assets/icon180.png',
    'assets/icon192.png',
    'assets/icon512.png',
    'offline.html',
    'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

/* Evento de Instalação: Salva arquivos no cache */
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Fazemos o cache individualmente para evitar que um erro em um único arquivo
            // (como um 404) impeça a instalação de todo o Service Worker.
            return Promise.all(
                assets.map(asset => {
                    return cache.add(asset).catch(err =>
                        console.warn(`SW: Falha ao carregar para cache: ${asset}`, err)
                    );
                })
            );
        })
    );
});

/* Evento de Ativação: Limpa versões antigas do cache */
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

/* Evento de Fetch: Estratégia de Cache First (Cache primeiro, depois rede) */
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request).catch(() => {
                if (e.request.mode === 'navigate') return caches.match('offline.html');
            });
        })
    );
});