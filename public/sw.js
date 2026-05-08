const CACHE = 'epona-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', (e) => {
  // Deixa requisições ao Supabase sempre ir para a rede
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
