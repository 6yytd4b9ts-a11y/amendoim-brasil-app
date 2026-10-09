// Manifesto do app com o passe da tela inicial (iPhone).
// No iPhone, o app aberto pelo ícone da Tela de Início não enxerga o login feito no Safari. Quem já entrou no Safari
// recebe um passe de uso único; o app aponta o manifesto para cá e o ícone criado abre com ?entrar=<passe>,
// que o app troca por uma sessão na primeira abertura. Sem passe válido, é o manifesto normal.
// cópia do public/manifest.webmanifest (mantenha os dois iguais)
const base = {
  "name": "Amendoim Brasil",
  "short_name": "Amendoim Brasil",
  "description": "Mercado, clima e ferramentas para quem produz e negocia amendoim.",
  "lang": "pt-BR",
  "start_url": "/#/inicio",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F6F4EE",
  "theme_color": "#007731",
  "icons": [
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/.netlify/images?url=/icons/icon-maskable-512.png&w=192&h=192&fm=png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
};

export default async (req) => {
  const t = new URL(req.url).searchParams.get('t') || '';
  const ok = /^[A-Za-z0-9_-]{20,80}$/.test(t);
  const m = { ...base, id: '/', start_url: ok ? `/?entrar=${t}#/inicio` : base.start_url };
  return new Response(JSON.stringify(m), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/manifesto' };
