// Login por celular (código no WhatsApp) com sessão no servidor (Supabase).
// Durante o piloto: só entra quem o administrador cadastrou; o plano vem do servidor; marca d'água com o nome; sem compartilhar.
import { sessao, salvarSessao, emProducao } from '/esboco-dados.js';

// Login de verdade no app oficial; na pré-visualização só com ?real=1 (senão fica o código de mentira 123456 do esboço).
export const loginReal = () => emProducao() || /[?&]real=1/.test(location.search);

const API = 'https://lvugmecpbitcmetfxkcs.supabase.co/functions/v1/acesso';
const CHAVE = 'ab-auth';
const SEM_REDE = { ok: false, status: 0, mensagem: 'Sem conexão agora. Tente de novo.' };

const lerT = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; } };
const gravarT = (t) => { try { if (t) localStorage.setItem(CHAVE, JSON.stringify(t)); else localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } };

async function chamar(acao, corpo = {}, token) {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ acao, ...corpo })
    });
    const j = await r.json().catch(() => ({ ok: false, mensagem: 'Resposta inesperada. Tente de novo.' }));
    return { ...j, status: r.status };
  } catch (e) { return SEM_REDE; }
}

function guardarSessao(s) { gravarT({ access_token: s.access_token, refresh_token: s.refresh_token, expira: s.expira }); }

// A conta do servidor vira a "sessão" que o resto do app já entende (assinante(), plano, nome…).
function aplicarConta(c) {
  const ate = c.expira_em ? String(c.expira_em).slice(0, 10) : null;
  salvarSessao({
    ...(sessao() || {}),
    nome: c.nome, celular: '•••• ' + c.final, status: 'cortesia', plano: c.plano, papel: c.papel,
    periodo: 'mensal', forma: 'convite', remoto: true, teste: false, testeAte: ate,
    vence: ate ? new Date(c.expira_em).toLocaleDateString('pt-BR') : 'sem prazo'
  });
}

export const pedirCodigo = (celular) => chamar('pedir', { celular });

export async function verificarCodigo(celular, codigo) {
  const r = await chamar('verificar', { celular, codigo });
  if (r.ok && r.sessao) { guardarSessao(r.sessao); aplicarConta(r.conta); atualizarMarca(); }
  return r;
}

export function sairRemoto() {
  const t = lerT();
  if (t) chamar('sair', {}, t.access_token);
  gravarT(null);
  document.getElementById('ab-marca')?.remove(); // a sessão local é apagada logo depois pelo chamador
}

// Token válido para chamadas ao servidor (renova quando falta pouco).
async function tokenValido() {
  const t = lerT();
  if (!t) return null;
  if (t.expira && t.expira - 90 > Date.now() / 1000) return t.access_token;
  const r = await chamar('renovar', { refresh_token: t.refresh_token });
  if (r.ok && r.sessao) { guardarSessao(r.sessao); aplicarConta(r.conta); return r.sessao.access_token; }
  if (r.status === 401 || r.status === 403) encerrar(r.mensagem);
  return null;
}

export async function chamarAdmin(acao, corpo = {}) {
  const tk = await tokenValido();
  if (!tk) return { ok: false, status: 401, mensagem: 'Sessão vencida. Entre de novo.' };
  return chamar(acao, corpo, tk);
}

let aviso = '';
function encerrar(msg) {
  gravarT(null);
  if (sessao()?.remoto) salvarSessao(null);
  aviso = msg || 'Seu acesso foi encerrado.';
  atualizarMarca();
}

// ---------- marca d'água e bloqueio de compartilhar (só para convidados do piloto) ----------
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function estilo() {
  if (document.getElementById('ab-auth-css')) return;
  const st = document.createElement('style');
  st.id = 'ab-auth-css';
  st.textContent = `#ab-marca{position:fixed;inset:0;z-index:2147483000;pointer-events:none;user-select:none}
  #ab-marca .logo{position:absolute;inset:0;background:url(/img/logo.png) center 46% / min(62vmin,420px) no-repeat;opacity:.045}
  #ab-marca .txt{position:absolute;inset:0}
  .ab-aviso{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);max-width:min(92vw,420px);background:#1B1B17;color:#fff;padding:12px 16px;border-radius:12px;font-size:14px;line-height:1.4;z-index:2147483100;box-shadow:0 6px 24px rgba(0,0,0,.25);text-align:center}`;
  document.head.appendChild(st);
}
export function atualizarMarca() {
  const s = sessao(), el0 = document.getElementById('ab-marca');
  if (!s || !s.remoto) { el0?.remove(); return; }
  estilo();
  const rotulo = `${s.nome} · ${s.celular}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190"><text x="20" y="120" transform="rotate(-24 150 95)" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#3C2808" fill-opacity=".085">${esc(rotulo)}</text></svg>`;
  const el = el0 || Object.assign(document.createElement('div'), { id: 'ab-marca', innerHTML: '<div class="logo"></div><div class="txt"></div>' });
  el.querySelector('.txt').style.background = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 0 0 / 300px 190px repeat`;
  el.setAttribute('aria-hidden', 'true');
  if (!el0) document.body.appendChild(el);
}
function toast(txt) {
  estilo();
  document.querySelector('.ab-aviso')?.remove();
  const d = Object.assign(document.createElement('div'), { className: 'ab-aviso', textContent: txt, role: 'status' });
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 4200);
}
const bloqueado = () => { const s = sessao(); return !!(s && s.remoto && s.papel !== 'admin'); };

let ultima = 0;
export async function iniciarAuth(render) {
  estilo();
  // Capturar antes dos outros: compartilhar, exportar e PDF ficam desligados no piloto.
  document.addEventListener('click', (e) => {
    if (!bloqueado()) return;
    if (e.target.closest('[data-compartilhar],[data-exp],[data-pdf]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('Durante o piloto o conteúdo não pode ser compartilhado nem baixado.');
    }
  }, true);

  const validar = async () => {
    ultima = Date.now();
    const antes = JSON.stringify(sessao());
    const t = lerT(), s = sessao();
    if (!t) { if (s?.remoto) encerrar('Entre de novo para continuar.'); }
    else {
      const tk = await tokenValido();
      if (tk) {
        const r = await chamar('conta', {}, tk);
        if (r.ok) aplicarConta(r.conta);
        else if (r.status === 401 || r.status === 403) encerrar(r.mensagem);
      }
    }
    atualizarMarca();
    if (aviso) { toast(aviso); aviso = ''; }
    if (JSON.stringify(sessao()) !== antes) render(false);
  };
  atualizarMarca();
  await validar();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - ultima > 15 * 60e3) validar(); });
}
