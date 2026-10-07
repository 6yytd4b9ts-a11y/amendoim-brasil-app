// Service worker: app abre rápido, funciona com sinal fraco no campo e recebe os alertas no celular.
// Sempre tenta a versão mais nova na rede; se estiver sem sinal, usa a cópia guardada.
const VERSAO = 'ab-v7';
const APP = ['/', '/index.html', '/styles.css', '/app.js', '/clima.js', '/ferramentas.js', '/painel.js', '/alertas.js', '/balcao.js', '/extra.css', '/manifest.webmanifest', '/img/logo.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSAO).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});

// Alertas: preço-alvo, mudança do IEA, chuva forte, boletim e balcão.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { d = { corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Amendoim Brasil', {
    body: d.corpo || '',
    icon: '/icons/icon-512.png',
    badge: '/icons/badge.png',
    tag: d.tag || 'geral',
    renotify: true,
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    const aberta = lista.find((c) => new URL(c.url).origin === self.location.origin);
    if (aberta) return aberta.navigate(alvo).then((c) => (c || aberta).focus()).catch(() => aberta.focus());
    return self.clients.openWindow(alvo);
  }));
});
