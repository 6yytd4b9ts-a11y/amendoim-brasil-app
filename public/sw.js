// Service worker: app abre rápido e funciona com sinal fraco no campo.
// Sempre tenta a versão mais nova na rede; se estiver sem sinal, usa a cópia guardada.
const VERSAO = 'ab-v4';
const APP = ['/', '/index.html', '/styles.css', '/app.js', '/clima.js', '/ferramentas.js', '/painel.js', '/extra.css', '/manifest.webmanifest', '/img/logo.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSAO).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
