// Medição anônima do app: só conta eventos (aberturas, abas, cliques, patrocínios).
// Não guarda nome, telefone, IP nem identificador do aparelho. Os eventos vão em lotes para /api/evento.
import { municipioSalvo } from '/clima.js';

const MEDIR = location.hostname === 'amendoim-brasil.netlify.app';
const NOME = /^[a-z0-9-]{1,60}$/;
const fila = [];
let timer = null;

export const slug = (s, max = 24) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');

function enviar() {
  clearTimeout(timer); timer = null;
  while (fila.length) {
    const corpo = JSON.stringify({ ev: fila.splice(0, 40) });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/evento', corpo))) fetch('/api/evento', { method: 'POST', body: corpo, keepalive: true }).catch(() => {});
    } catch (e) { /* medição nunca atrapalha o app */ }
  }
}

export function evento(nome) {
  if (!MEDIR || !NOME.test(nome)) return;
  fila.push(nome);
  if (fila.length >= 30) enviar();
  else if (!timer) timer = setTimeout(enviar, 4000);
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(); });
addEventListener('pagehide', enviar);

// Uma vez por período por aparelho (guardado só neste aparelho).
function umaVez(chave, valor, nome) {
  try {
    if (localStorage.getItem(chave) === valor) return false;
    localStorage.setItem(chave, valor);
  } catch (e) { return false; }
  if (nome) evento(nome);
  return true;
}

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
function semanaISO(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  const dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia + 3);
  const ano = d.getUTCFullYear(), jan4 = new Date(Date.UTC(ano, 0, 4));
  const sem = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${ano}-s${sem}`;
}

export function eventoAbertura() {
  evento('abriu');
  const h = hoje();
  let ultimo = null;
  try { ultimo = localStorage.getItem('ab-dia'); } catch (e) { /* sem armazenamento */ }
  if (umaVez('ab-dia', h, 'aparelho-dia')) {
    evento(ultimo ? 'voltou' : 'aparelho-novo');
    const ua = navigator.userAgent;
    evento('disp-' + (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iphone' : /Android/.test(ua) ? 'android' : 'computador'));
    evento('modo-' + (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ? 'app' : 'navegador'));
  }
  umaVez('ab-semana', semanaISO(h), 'aparelho-semana');
  umaVez('ab-mes', h.slice(0, 7), 'aparelho-mes');
  registrarRegiao();
}

// Região do público (município da lavoura escolhido ou o mais perto do GPS), uma vez por dia.
export function registrarRegiao() {
  const m = municipioSalvo();
  if (!m) return;
  const nome = m.gps ? (m.perto || '') : `${m.nome}/${m.uf}`;
  if (nome) umaVez('ab-reg-dia', hoje(), 'reg-' + slug(nome, 30));
}

// Impressão de patrocínio: conta quando a marca aparece de verdade na tela (metade visível), uma vez por tela aberta.
let vistos = new Set();
let obs = null;
export function observarPatrocinios(raiz, novaTela) {
  if (!MEDIR || !('IntersectionObserver' in window)) return;
  if (novaTela) vistos = new Set();
  if (!obs) {
    obs = new IntersectionObserver((itens) => itens.forEach((it) => {
      if (!it.isIntersecting) return;
      const el = it.target, chave = `${el.dataset.patro}-${el.dataset.local}`;
      obs.unobserve(el);
      if (vistos.has(chave)) return;
      vistos.add(chave);
      evento(`patro-ver-${chave}`);
    }), { threshold: 0.5 });
  }
  raiz.querySelectorAll('[data-patro]').forEach((el) => obs.observe(el));
}
