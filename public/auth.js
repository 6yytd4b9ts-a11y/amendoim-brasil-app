// Login por celular (código no WhatsApp) com sessão no servidor (Supabase) e fase de teste (piloto).
// Fase de teste LIGADA (interruptor no painel): o app inteiro fica atrás do porteiro; o plano vem do servidor;
// marca d'água leve com o nome; compartilhar/exportar desligados; uso registrado (menos o do administrador).
import { sessao, salvarSessao, emProducao } from '/esboco-dados.js';

// Login de verdade no app oficial; na pré-visualização só com ?real=1 (senão fica o código de mentira 123456 do esboço).
export const loginReal = () => emProducao() || /[?&]real=1/.test(location.search);

const API = 'https://lvugmecpbitcmetfxkcs.supabase.co/functions/v1/acesso';
const CHAVE = 'ab-auth';
const CHAVE_PILOTO = 'ab-piloto'; // última resposta do servidor: 'on' | 'off'
const SEM_REDE = { ok: false, status: 0, mensagem: 'Sem conexão agora. Tente de novo.' };

const lerT = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; } };
const gravarT = (t) => { try { if (t) localStorage.setItem(CHAVE, JSON.stringify(t)); else localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } };
const lerCache = () => { try { return localStorage.getItem(CHAVE_PILOTO); } catch (e) { return null; } };
const gravarCache = (v) => { try { localStorage.setItem(CHAVE_PILOTO, v ? 'on' : 'off'); } catch (e) { /* sem armazenamento */ } };

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
  if (typeof c.piloto === 'boolean') gravarCache(c.piloto);
  salvarSessao({
    ...(sessao() || {}),
    nome: c.nome, empresa: c.empresa || '', celular: '•••• ' + c.final, status: 'cortesia', plano: c.plano, papel: c.papel,
    periodo: 'mensal', forma: 'convite', remoto: true, teste: false, testeAte: ate, piloto: !!c.piloto, perfilOk: !!c.perfil_ok,
    vence: ate ? new Date(c.expira_em).toLocaleDateString('pt-BR') : 'sem prazo'
  });
}

export const pedirCodigo = (celular) => chamar('pedir', { celular });

export async function verificarCodigo(celular, codigo) {
  const r = await chamar('verificar', { celular, codigo });
  if (r.ok && r.sessao) { guardarSessao(r.sessao); aplicarConta(r.conta); atualizarUI(); }
  return r;
}

export function sairRemoto() {
  const t = lerT();
  if (t) chamar('sair', {}, t.access_token);
  gravarT(null);
  document.getElementById('ab-marca')?.remove(); // a sessão local é apagada logo depois pelo chamador
  document.getElementById('ab-opinar')?.remove();
  setTimeout(() => { if (piloto() && !logado()) porteiro('login'); }, 0);
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

const logado = () => !!(sessao()?.remoto && lerT());
const piloto = () => lerCache() === 'on';
// Convidado comum durante a fase de teste: marca d'água, sem compartilhar, uso registrado.
const restrito = () => { const s = sessao(); return !!(s && s.remoto && s.papel !== 'admin' && s.piloto); };

let aviso = '';
let renderApp = null;
function encerrar(msg) {
  gravarT(null);
  if (sessao()?.remoto) salvarSessao(null);
  aviso = msg || 'Seu acesso foi encerrado.';
  atualizarUI();
  if (piloto()) { pt.msg = aviso; aviso = ''; porteiro('login'); }
}

// ---------- visual ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function estilo() {
  if (document.getElementById('ab-auth-css')) return;
  const st = document.createElement('style');
  st.id = 'ab-auth-css';
  st.textContent = `
  #ab-marca{position:fixed;inset:0;z-index:2147483000;pointer-events:none;user-select:none}
  .ab-aviso{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);max-width:min(92vw,420px);background:#1B1B17;color:#fff;padding:12px 16px;border-radius:12px;font-size:14px;line-height:1.4;z-index:2147483300;box-shadow:0 6px 24px rgba(0,0,0,.25);text-align:center}
  html.ab-travado{overflow:hidden}
  #ab-porteiro{position:fixed;inset:0;z-index:2147483200;background:#F5F3EE;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:max(28px,env(safe-area-inset-top)) 20px 28px}
  .pt-caixa{width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;margin-top:6vh}
  .pt-logo{height:64px;width:auto;align-self:flex-start}
  .pt-caixa h1{margin:6px 0 0;font-size:26px;line-height:1.15;font-weight:800;color:#1B1B17}
  .pt-caixa p{margin:0;font-size:15px;line-height:1.5;color:#3E3B33}
  .pt-caixa form{display:flex;flex-direction:column;gap:10px}
  .pt-caixa label{font-size:13px;font-weight:700;color:#3E3B33}
  .pt-caixa input{height:54px;border:1.5px solid #CFC9BB;border-radius:14px;padding:0 14px;font:inherit;font-size:18px;background:#fff;color:#1B1B17;width:100%;box-sizing:border-box}
  .pt-caixa input:focus{outline:3px solid rgba(0,119,49,.28);border-color:#007731}
  .pt-caixa input.pt-cod{text-align:center;letter-spacing:.5em;font-size:26px;font-weight:800;padding-left:.5em}
  .pt-btn{height:54px;border:0;border-radius:14px;background:#007731;color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer}
  .pt-btn:disabled{opacity:.6}
  .pt-link{background:none;border:0;color:#3E3B33;font:inherit;font-size:14px;text-decoration:underline;padding:8px;cursor:pointer}
  .pt-link:disabled{opacity:.5;text-decoration:none}
  .pt-msg{min-height:20px;font-size:14px;font-weight:600;color:#B3261E;text-align:center}
  .pt-msg.pt-ok{color:#007731}
  .pt-caixa small{font-size:13px;color:#5F5B52;text-align:center}
  .pt-nota{background:#FBF1DC;border:1px solid #E8D3A0;color:#5C3A06;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.45}
  .pt-giro{width:28px;height:28px;border:3px solid #CFC9BB;border-top-color:#007731;border-radius:50%;animation:pt-g .8s linear infinite;align-self:flex-start}
  @keyframes pt-g{to{transform:rotate(360deg)}}
  #ab-opinar{position:fixed;right:14px;bottom:88px;z-index:2147482900;height:40px;padding:0 14px;border-radius:20px;border:1.5px solid #CFC9BB;background:#fff;color:#1B1B17;font:inherit;font-size:13px;font-weight:800;box-shadow:0 3px 12px rgba(0,0,0,.14);cursor:pointer}
  #ab-opiniao{position:fixed;inset:0;z-index:2147483250;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center}
  #ab-opiniao .pt-folha{width:100%;max-width:480px;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px max(18px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px}
  #ab-opiniao textarea{min-height:110px;border:1.5px solid #CFC9BB;border-radius:12px;padding:10px 12px;font:inherit;font-size:16px;resize:vertical}
  .es-btn-perfil.ab-txt{width:auto;padding:0 12px 0 8px;gap:6px;border-radius:999px}`;
  document.head.appendChild(st);
}

export function atualizarMarca() {
  const s = sessao(), el0 = document.getElementById('ab-marca');
  if (!restrito()) { el0?.remove(); return; }
  estilo();
  const rotulo = [s.nome, s.empresa].filter(Boolean).join(' · ').slice(0, 44);
  // uma marca por bloco grande: poucas repetições, legível, sem atrapalhar a leitura
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="380"><text x="260" y="200" text-anchor="middle" transform="rotate(-20 260 190)" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#2B2B26" fill-opacity=".075">${esc(rotulo)}</text></svg>`;
  const el = el0 || Object.assign(document.createElement('div'), { id: 'ab-marca' });
  el.style.background = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 0 0 / 520px 380px repeat`;
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

// ---------- botão "Opinar" (só convidados na fase de teste) ----------
function atualizarOpinar() {
  const b = document.getElementById('ab-opinar');
  if (!restrito() || document.getElementById('ab-porteiro')) { b?.remove(); return; }
  if (b) return;
  estilo();
  const x = Object.assign(document.createElement('button'), { id: 'ab-opinar', type: 'button', textContent: 'Opinar' });
  x.setAttribute('aria-label', 'Enviar uma opinião ou sugestão');
  x.addEventListener('click', abrirOpiniao);
  document.body.appendChild(x);
}
function abrirOpiniao() {
  if (document.getElementById('ab-opiniao')) return;
  const el = document.createElement('div');
  el.id = 'ab-opiniao';
  el.innerHTML = `<div class="pt-folha" role="dialog" aria-label="Sua opinião"><b style="font-size:18px">O que achou?</b>
    <span style="font-size:14px;color:#5F5B52">Conte o que ficou confuso, o que faltou ou o que você mais usou. O Helder lê tudo.</span>
    <textarea id="ab-op-txt" maxlength="1000" placeholder="Escreva aqui…"></textarea>
    <div class="pt-msg" id="ab-op-msg" role="status"></div>
    <div style="display:flex;gap:8px"><button class="pt-btn" id="ab-op-env" type="button" style="flex:1">Enviar</button><button class="pt-link" id="ab-op-x" type="button">Cancelar</button></div></div>`;
  document.body.appendChild(el);
  const fechar = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el) fechar(); });
  el.querySelector('#ab-op-x').addEventListener('click', fechar);
  el.querySelector('#ab-op-env').addEventListener('click', async () => {
    const txt = el.querySelector('#ab-op-txt').value.trim(), msg = el.querySelector('#ab-op-msg');
    if (txt.length < 2) { msg.textContent = 'Escreva a sua opinião.'; return; }
    msg.textContent = 'Enviando…'; msg.className = 'pt-msg pt-ok';
    const tk = await tokenValido();
    const r = tk ? await chamar('feedback', { texto: txt, tela: telaAtual() }, tk) : SEM_REDE;
    if (r.ok) { fechar(); toast('Obrigado! Sua opinião chegou ao Helder.'); } else { msg.className = 'pt-msg'; msg.textContent = r.mensagem || 'Não foi possível enviar agora.'; }
  });
  setTimeout(() => el.querySelector('#ab-op-txt')?.focus(), 50);
}

function atualizarUI() { atualizarMarca(); atualizarOpinar(); }

// ---------- porteiro: o app inteiro fica atrás dele na fase de teste ----------
const pt = { passo: null, cel: '', manual: false, msg: '', ok: false, t0: 0 };
const fmtCel = (v) => {
  const d = String(v).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const logo = '<img class="pt-logo" src="/img/logo.png" alt="Amendoim Brasil">';
const telasPorteiro = {
  carregando: () => `${logo}<div class="pt-giro" role="status" aria-label="Abrindo"></div>`,
  login: () => `${logo}<h1>Acesso restrito</h1>
    <p>Fase de teste do Amendoim Brasil. Entre com o celular que o Helder liberou.</p>
    <form id="pt-f-cel"><label for="pt-cel">Seu celular com WhatsApp</label>
      <input id="pt-cel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" value="${esc(pt.cel)}" required>
      <button class="pt-btn" type="submit">Receber o código</button></form>
    <div class="pt-msg ${pt.ok ? 'pt-ok' : ''}" role="status">${esc(pt.msg)}</div>
    <small>Sem acesso? Peça a liberação ao Helder.</small>`,
  codigo: () => `${logo}<h1>Digite o código</h1>
    <p>Código de 6 números para <b>${esc(pt.cel)}</b>. Vale por 10 minutos.</p>
    ${pt.manual ? '<div class="pt-nota">O Helder recebeu o seu pedido agora. Assim que ele mandar o código, digite aqui.</div>' : ''}
    <form id="pt-f-cod"><input id="pt-cod" class="pt-cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Código de 6 números" required>
      <button class="pt-btn" type="submit">Entrar</button></form>
    <div class="pt-msg ${pt.ok ? 'pt-ok' : ''}" role="status">${esc(pt.msg)}</div>
    <div style="display:flex;justify-content:center;gap:8px"><button class="pt-link" type="button" data-pt="reenviar" id="pt-reenviar">Reenviar código</button><button class="pt-link" type="button" data-pt="trocar">Usar outro número</button></div>`,
  perfil: () => `${logo}<h1>Confirme seus dados</h1>
    <p>Seu nome aparece de leve nas telas, como marca d'água. É o que protege o conteúdo desta fase de teste.</p>
    <form id="pt-f-perfil"><label for="pt-nome">Nome e sobrenome</label>
      <input id="pt-nome" autocomplete="name" maxlength="80" value="${esc(sessao()?.nome || '')}" required>
      <label for="pt-emp">Empresa <span style="font-weight:500">(opcional)</span></label>
      <input id="pt-emp" autocomplete="organization" maxlength="80" value="${esc(sessao()?.empresa || '')}">
      <button class="pt-btn" type="submit">Continuar</button></form>
    <div class="pt-msg" role="status">${esc(pt.msg)}</div>`
};
function porteiro(passo) {
  estilo();
  pt.passo = passo;
  let el = document.getElementById('ab-porteiro');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ab-porteiro';
    document.body.appendChild(el);
    document.documentElement.classList.add('ab-travado');
    ligarPorteiro(el);
  }
  el.innerHTML = `<div class="pt-caixa">${telasPorteiro[passo]()}</div>`;
  pt.msg = ''; pt.ok = false;
  document.getElementById('ab-opinar')?.remove();
  if (passo === 'codigo') { contagem(); }
  setTimeout(() => el.querySelector(passo === 'login' ? '#pt-cel' : passo === 'codigo' ? '#pt-cod' : passo === 'perfil' ? '#pt-nome' : 'button')?.focus(), 40);
}
function fecharPorteiro() {
  document.getElementById('ab-porteiro')?.remove();
  document.documentElement.classList.remove('ab-travado');
  pt.passo = null;
  atualizarUI();
}
const mensagem = (txt, ok = false) => { const m = document.querySelector('#ab-porteiro .pt-msg'); if (m) { m.textContent = txt; m.className = 'pt-msg' + (ok ? ' pt-ok' : ''); } };
function contagem() {
  const b = document.getElementById('pt-reenviar');
  if (!b) return;
  const falta = () => 30 - Math.floor((Date.now() - pt.t0) / 1000);
  const tic = () => { const x = document.getElementById('pt-reenviar'); if (!x) return; const f = falta(); x.disabled = f > 0; x.textContent = f > 0 ? `Reenviar código (${f}s)` : 'Reenviar código'; if (f > 0) setTimeout(tic, 1000); };
  tic();
}
async function pedirDoPorteiro(cel, aoErro) {
  const btn = document.querySelector('#ab-porteiro button[type=submit]');
  if (btn) btn.disabled = true;
  mensagem('Enviando…', true);
  const r = await pedirCodigo(cel);
  if (btn) btn.disabled = false;
  if (r.ok) { pt.cel = fmtCel(cel); pt.manual = !r.enviado; pt.t0 = Date.now(); porteiro('codigo'); return; }
  if (r.motivo === 'aguarde' && pt.passo === 'codigo') { mensagem(r.mensagem); return; }
  aoErro ? aoErro(r) : mensagem(r.mensagem || 'Não foi possível pedir o código agora.');
}
function concluir() {
  fecharPorteiro();
  if (renderApp) renderApp(false);
  if (!location.hash || location.hash === '#/') location.hash = '#/inicio';
}
async function verificarDoPorteiro(cod) {
  const btn = document.querySelector('#ab-porteiro button[type=submit]');
  if (btn) btn.disabled = true;
  mensagem('Conferindo…', true);
  const r = await verificarCodigo(pt.cel, cod);
  if (btn) btn.disabled = false;
  if (!r.ok) { mensagem(r.mensagem || 'Não foi possível entrar agora.'); const i = document.getElementById('pt-cod'); if (i) { i.value = ''; i.focus(); } return; }
  if (r.conta.piloto && r.conta.papel !== 'admin' && !r.conta.perfil_ok) porteiro('perfil'); else concluir();
}
function ligarPorteiro(el) {
  el.addEventListener('input', (e) => {
    if (e.target.id === 'pt-cel') e.target.value = fmtCel(e.target.value);
    if (e.target.id === 'pt-cod') {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      if (e.target.value.length === 6) verificarDoPorteiro(e.target.value); // entra sozinho ao completar
    }
  });
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = e.target.id;
    if (id === 'pt-f-cel') { const v = el.querySelector('#pt-cel').value; pt.cel = v; pedirDoPorteiro(v); }
    else if (id === 'pt-f-cod') { const v = el.querySelector('#pt-cod').value.replace(/\D/g, ''); if (v.length === 6) verificarDoPorteiro(v); else mensagem('Digite os 6 números.'); }
    else if (id === 'pt-f-perfil') {
      const nm = el.querySelector('#pt-nome').value.trim();
      if (nm.length < 3 || !nm.includes(' ')) { mensagem('Digite o nome e o sobrenome.'); return; }
      mensagem('Salvando…', true);
      const tk = await tokenValido();
      const r = tk ? await chamar('perfil', { nome: el.querySelector('#pt-nome').value, empresa: el.querySelector('#pt-emp').value }, tk) : SEM_REDE;
      if (r.ok) { aplicarConta(r.conta); concluir(); } else mensagem(r.mensagem || 'Não foi possível salvar agora.');
    }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pt]');
    if (!b) return;
    if (b.dataset.pt === 'trocar') { porteiro('login'); }
    if (b.dataset.pt === 'reenviar') pedirDoPorteiro(pt.cel.replace(/\D/g, ''), (r) => mensagem(r.mensagem));
  });
}

// ---------- uso (só convidados comuns na fase de teste) ----------
const fila = [];
let ultimoToque = Date.now();
const telaAtual = () => (location.hash.replace(/^#/, '').split('?')[0] || '/').slice(0, 100);
function reg(t, d = '') {
  if (!restrito()) return;
  fila.push({ t, d: String(d).slice(0, 120), ts: Date.now() });
  if (fila.length >= 25) enviar();
}
async function enviar() {
  if (!fila.length || !restrito()) return;
  const itens = fila.splice(0, 60);
  const tk = await tokenValido();
  if (tk) chamar('evento', { itens }, tk);
}

// ---------- início ----------
let ultima = 0;
export async function iniciarAuth(render) {
  renderApp = render;
  estilo();
  // Capturar antes dos outros: compartilhar, exportar e PDF ficam desligados para convidados na fase de teste.
  document.addEventListener('click', (e) => {
    if (restrito() && e.target.closest('[data-compartilhar],[data-exp],[data-pdf]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('Durante a fase de teste o conteúdo não pode ser compartilhado nem baixado.');
      return;
    }
    const ev = e.target.closest('[data-ev]');
    if (ev) reg('clique', ev.dataset.ev);
  }, true);
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((n) => document.addEventListener(n, () => { ultimoToque = Date.now(); }, { passive: true, capture: true }));
  window.addEventListener('hashchange', () => reg('tela', telaAtual()));
  setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - ultimoToque < 60000) reg('beat'); }, 30000);
  setInterval(enviar, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviar();
    else if (Date.now() - ultima > 15 * 60e3) validar();
  });

  const validar = async () => {
    ultima = Date.now();
    const antes = JSON.stringify(sessao());
    const e = await chamar('estado');
    if (e.ok) {
      gravarCache(e.piloto);
      if (!e.piloto && ['carregando', 'login', 'codigo'].includes(pt.passo)) fecharPorteiro();
    } else if (lerCache() === null && ['carregando'].includes(pt.passo)) fecharPorteiro(); // sem resposta e sem histórico: abre o app público
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
    if (piloto() && !logado()) { if (!['login', 'codigo'].includes(pt.passo)) porteiro('login'); }
    else if (pt.passo === 'carregando') fecharPorteiro();
    const s2 = sessao();
    if (s2?.remoto && s2.piloto && s2.papel !== 'admin' && !s2.perfilOk && pt.passo !== 'perfil') porteiro('perfil');
    atualizarUI();
    if (aviso) { toast(aviso); aviso = ''; }
    if (JSON.stringify(sessao()) !== antes) render(false);
  };
  atualizarUI();
  reg('abriu', telaAtual());
  await validar();
  reg('tela', telaAtual());
}

// Atalho na tela inicial para a área exclusiva (quem entrou por convite).
export function atalhoArea(h) {
  const s = sessao();
  if (!s?.remoto) return '';
  const txt = s.plano === 'empresa' ? 'Estimativas, Terminal de exportação, agenda e histórico' : 'Estimativas, exportação, agenda e histórico';
  return `<a class="cartao es-cartao es-faixa-ass2" href="#/mercado/consultoria" data-ev="atalho-area">
    <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:var(--verde-claro)">${h.ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', 'style="stroke:#007731"')}</span>
    <span class="cresce"><b style="font-size:15px;display:block">Sua área exclusiva · ${esc((s.nome || '').split(' ')[0] || 'Olá')}</b><span class="mini">${txt}</span></span>
    ${h.ic(h.I.seta, 'style="width:18px;height:18px;stroke:#5F5B52"')}
  </a>`;
}

// Porteiro imediato (antes de o app desenhar a primeira tela): com cache, é na hora; sem cache, uma tela de abertura curta.
if (typeof document !== 'undefined' && document.body && !location.pathname.startsWith('/painel') && lerCache() !== 'off' && !logado()) {
  porteiro(lerCache() === 'on' ? 'login' : 'carregando');
}
