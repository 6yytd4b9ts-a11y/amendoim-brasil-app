// Alertas no celular (notificações do próprio app).
// Android: Chrome. iPhone: só com o app instalado na Tela de Início (iOS 16.4 ou mais novo).
import { municipioAtual, nomeLocal } from '/clima.js';

const CHAVE = 'ab-alertas';
let renderApp = () => {};

export function suporte() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { ok, ios, instalado, permissao: 'Notification' in window ? Notification.permission : 'default' };
}

export function prefsSalvas() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; }
}
function guardar(p) { try { if (p) localStorage.setItem(CHAVE, JSON.stringify(p)); else localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } }
export const alertasAtivos = () => !!prefsSalvas() && suporte().permissao === 'granted';

const paraBytes = (s) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
const iguais = (a, b) => { if (!a || !b) return false; const x = new Uint8Array(a); return x.length === b.length && x.every((v, i) => v === b[i]); };

async function inscricao(criar) {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, n) => setTimeout(() => n(new Error('sw')), 8000))]);
  let sub = await reg.pushManager.getSubscription();
  if (!criar) return sub;
  const { chave } = await (await fetch('/api/alertas', { cache: 'no-store' })).json();
  const bytes = paraBytes(chave);
  if (sub && !iguais(sub.options?.applicationServerKey, bytes)) { await sub.unsubscribe(); sub = null; }
  return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
}

async function chamar(corpo) {
  const r = await fetch('/api/alertas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error('servidor ' + r.status);
  return r.json();
}

export async function ativar(prefs, extra = {}) {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('permissao');
  const sub = await inscricao(true);
  const r = await chamar({ acao: 'salvar', sub: sub.toJSON(), prefs, ...extra });
  guardar(prefs);
  return r;
}

export async function desativar() {
  const sub = await inscricao(false).catch(() => null);
  if (sub) { await chamar({ acao: 'remover', sub: sub.toJSON() }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  guardar(null);
}

export async function testar() {
  const sub = await inscricao(false);
  if (!sub) throw new Error('nao-inscrito');
  return chamar({ acao: 'teste', sub: sub.toJSON() });
}

// Quando a pessoa troca o local da lavoura na aba Clima, o alerta de chuva acompanha.
export function atualizarLocalAlertas() {
  const p = prefsSalvas();
  if (!p?.chuva || !alertasAtivos()) return;
  const m = municipioAtual();
  p.local = { lat: m.lat, lon: m.lon, nome: nomeLocal(m) };
  inscricao(false).then((sub) => sub && chamar({ acao: 'salvar', sub: sub.toJSON(), prefs: p })).then(() => guardar(p)).catch(() => {});
}

const numero = (v) => { const n = parseFloat(String(v || '').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
const valorCampo = (n) => (n ? n.toFixed(2).replace('.', ',') : '');

export function telaAlertas(D, h) {
  const { esc, ic, I, brl, linkSeguro } = h;
  const s = suporte();
  const p = prefsSalvas() || { mudanca: true, chuva: true, boletim: true, balcao: false };
  const ativo = alertasAtivos();
  const dest = D.cotacoes?.destaque || {};
  const local = municipioAtual();
  const grupo = linkSeguro(D.config.grupoWhatsapp);
  const chave = (nome, titulo, desc) => `<label class="alerta-linha"><span class="cresce"><b>${titulo}</b><small>${desc}</small></span><input type="checkbox" name="${nome}" ${p[nome] ? 'checked' : ''}><span class="chave" aria-hidden="true"></span></label>`;

  let aviso = '';
  if (!s.ok && s.ios && !s.instalado) {
    aviso = `<section class="cartao aviso-instalar">
      <b style="font-size:16px">No iPhone, instale o app primeiro</b>
      <ol>
        <li>No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
        <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
        <li>Abra o Amendoim Brasil pelo ícone novo e volte nesta tela.</li>
      </ol>
      <span class="mini">Os alertas funcionam no iPhone com iOS 16.4 ou mais novo.</span>
    </section>`;
  } else if (!s.ok) {
    aviso = '<div class="em-breve"><span>Este navegador não recebe notificações. No Android, abra o app pelo Chrome.</span></div>';
  } else if (s.permissao === 'denied') {
    aviso = '<div class="em-breve"><span>As notificações estão bloqueadas para este app. Libere em Configurações do celular → Notificações e tente de novo.</span></div>';
  }

  return `<header class="topo">
    <a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Alertas no celular</h1><div class="sub">O app avisa você, mesmo fechado</div></div>
  </header>
  ${aviso}
  ${ativo ? `<div class="alertas-on">${ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#fff;stroke-width:2.8"')}<span>Alertas ativados neste celular</span></div>` : ''}
  <form id="form-alertas" class="cartao" style="gap:14px" ${s.ok ? '' : 'inert'}>
    <div class="alvo">
      <span class="rotulo">Preço-alvo · IEA ${esc(dest.regiao || 'Tupã')}</span>
      <span class="mini">Hoje: <b class="num">${brl(dest.preco)}</b> por saca (${esc((dest.data || '').slice(0, 5))}). O aviso chega quando o preço publicado passar do seu alvo.</span>
      <div class="campos-2">
        <div class="campo"><label for="alvo-acima">Avisar acima de</label><div class="entrada"><input id="alvo-acima" name="acima" inputmode="decimal" placeholder="${esc(valorCampo((dest.preco || 77) + 3))}" value="${esc(valorCampo(p.acima))}"><span>R$/sc</span></div></div>
        <div class="campo"><label for="alvo-abaixo">Avisar abaixo de</label><div class="entrada"><input id="alvo-abaixo" name="abaixo" inputmode="decimal" placeholder="${esc(valorCampo(Math.max(1, (dest.preco || 77) - 3)))}" value="${esc(valorCampo(p.abaixo))}"><span>R$/sc</span></div></div>
      </div>
    </div>
    <div style="border-top:1px solid var(--linha)">
      ${chave('mudanca', 'Preço do IEA mudou', 'Quando a casca subir ou cair no IEA')}
      ${chave('chuva', 'Chuva forte na lavoura', `30 mm ou mais previstos ${esc(nomeLocal(local))} · troque o local na aba Clima`)}
      ${chave('boletim', 'Novo boletim', 'Quando sair análise ou boletim do Helder')}
      ${chave('balcao', 'Nova oferta no balcão', 'Quando entrar anúncio de compra ou venda')}
    </div>
    <button class="btn btn-verde" type="submit">${ativo ? 'Salvar alterações' : 'Ativar alertas'}</button>
    <div id="alertas-msg" role="status" class="mini" style="text-align:center"></div>
    ${ativo ? `<div class="duas-acoes"><button type="button" class="btn btn-escuro btn-pequeno" id="alertas-teste">Enviar um teste</button><button type="button" class="btn btn-pequeno btn-contorno" id="alertas-desligar">Desativar</button></div>` : ''}
  </form>
  ${grupo ? `<a class="chamada" href="${esc(grupo)}" target="_blank" rel="noopener" data-ev="grupo"><span class="cresce"><b style="font-size:15px;display:block">Grupo do WhatsApp</b><span style="font-size:13px;color:#5C3A06">Radar de preços e Fato do dia todo dia útil</span></span>${ic(I.seta, 'style="stroke:#5C3A06"')}</a>` : ''}`;
}

function msg(t) { const m = document.getElementById('alertas-msg'); if (m) m.textContent = t; }

export function ligarAlertas(render, evento) {
  renderApp = render;
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'form-alertas') return;
    e.preventDefault();
    const f = e.target, m = municipioAtual();
    const prefs = {
      acima: numero(f.acima.value), abaixo: numero(f.abaixo.value),
      mudanca: f.mudanca.checked, chuva: f.chuva.checked, boletim: f.boletim.checked, balcao: f.balcao.checked,
      local: { lat: m.lat, lon: m.lon, nome: nomeLocal(m) }
    };
    if (prefs.acima && prefs.abaixo && prefs.abaixo >= prefs.acima) { msg('O alvo de baixa precisa ser menor que o de alta.'); return; }
    const botao = f.querySelector('[type=submit]');
    botao.disabled = true; msg('Ativando…');
    try {
      await ativar(prefs);
      evento('alertas-ativou');
      renderApp(false);
      msg('Pronto! Os alertas estão ativos neste celular.');
    } catch (er) {
      botao.disabled = false;
      msg(er.message === 'permissao' ? 'Para receber os alertas, toque em "Permitir" quando o celular perguntar.' : 'Não foi possível ativar agora. Verifique a internet e tente de novo.');
    }
  });
  document.addEventListener('click', async (e) => {
    if (e.target.closest('#alertas-teste')) {
      msg('Enviando…');
      try { const r = await testar(); msg(r.ok ? 'Teste enviado. A notificação chega em alguns segundos.' : 'O serviço de notificação não aceitou. Desative e ative de novo.'); }
      catch (er) { msg('Não foi possível enviar o teste agora.'); }
    }
    if (e.target.closest('#alertas-desligar')) {
      await desativar();
      evento('alertas-desativou');
      renderApp(false);
    }
  });
}
