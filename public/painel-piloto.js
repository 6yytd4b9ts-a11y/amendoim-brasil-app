// Painel · aba "Teste": a fase de teste inteira num lugar só (interruptor, códigos a repassar, convidados com o uso de cada um,
// opiniões e envio automático). Entra com a mesma chave do painel; o uso do administrador não conta.
const API = 'https://lvugmecpbitcmetfxkcs.supabase.co/functions/v1/acesso';

const SITE = 'https://amendoim-brasil.netlify.app';
const est = {
  dados: null, uso: null, carregando: false, erro: '', msg: '', editando: null, novo: false, ver: false, confirma: false,
  sub: 'codigos', usoVis: 'geral', abertos: new Set(), zerar: false, zerarOp: false, zMsg: '',
  inv: { nome: '', cel: '', plano: '', ate: null, msg: '', editou: false, aviso: '' }, trocandoPlano: null, usoPlano: 'todos',
  push: { estado: 'verificando', msg: '', ocupado: false }
};
let redesenhar = () => {};
let pegarChave = () => '';
let timer = null;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtCel = (c) => {
  const d = String(c || '');
  if (/^55\d{10,11}$/.test(d)) { const n = d.slice(4); return `(${d.slice(2, 4)}) ${n.length === 9 ? n.slice(0, 5) + '-' + n.slice(5) : n.slice(0, 4) + '-' + n.slice(4)}`; }
  return d;
};
const quando = (iso, vazio = 'nunca entrou') => {
  if (!iso) return vazio;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 2 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`;
};
const msgCodigo = (cod) => `Amendoim Brasil\nSeu código de acesso: ${cod}\nVale por 10 minutos. Não compartilhe com ninguém.`;
const NOMES = { '/inicio': 'Início', '/mercado': 'Mercado', '/mercado/consultoria': 'Área do assinante', '/mercado/hoje': 'Mercado hoje', '/mercado/dados': 'Exportação do Brasil', '/mercado/historico': 'Histórico de preço', '/mercado/termometro': 'Termômetro', '/estimativas': 'Estimativas', '/agenda': 'Agenda', '/terminal': 'Painel de Mercado', '/destinos': 'Preço por destino', '/dolar': 'Dólar', '/clima': 'Clima', '/ferramentas': 'Ferramentas', '/negociar': 'Negociar', '/alertas': 'Alertas', '/conta': 'Minha conta', '/perfil': 'Perfil' };
const nomeTela = (r) => NOMES[r] || r;
const TAGS = { confuso: ['Achei confuso', 'pilula-amendoim'], faltou: ['Faltou algo', 'pilula-azul'], ideia: ['Tenho uma ideia', 'pilula-verde'], gostei: ['Gostei', 'pilula-verde'] };
const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, '0')}`;

async function chamar(acao, corpo = {}, extra = {}) {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao, chave: pegarChave(), ...corpo }), ...extra });
    const j = await r.json().catch(() => ({ ok: false, mensagem: 'Resposta inesperada. Tente de novo.' }));
    return { ...j, status: r.status };
  } catch (e) { return { ok: false, status: 0, mensagem: 'Sem conexão agora. Tente de novo.' }; }
}

async function carregar() {
  if (est.carregando) return;
  est.carregando = true; est.erro = '';
  const [l, u] = await Promise.all([chamar('admin_listar'), chamar('admin_uso')]);
  est.carregando = false;
  if (l.ok) est.dados = l; else est.erro = l.mensagem || 'Não foi possível carregar.';
  if (u.ok) est.uso = u;
  redesenhar();
}

export function abrirTeste() { est.erro = ''; est.msg = ''; carregar(); verificarPush(); }

// Atualiza só o bloco de códigos (sem mexer no resto da tela) e mostra a hora da última atualização.
async function atualizarCodigos() {
  const el = document.getElementById('pp-codigos');
  if (!el) return false;
  const r = await chamar('admin_listar');
  if (r.ok) {
    est.dados = r; el.innerHTML = blocoCodigos();
    const q = document.getElementById('pp-quando');
    if (q) q.textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return r.ok;
}

// ---------- peças ----------
const tile = (rot, val, sub = '') => `<div class="pn-tile"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const lista = (itens, vazio = '—') => (itens?.length ? itens.map(([k, n]) => `<div class="lista-linha" style="padding:6px 0"><span class="cresce mini" style="font-size:13px">${esc(nomeTela(k))}</span><b class="num">${n}</b></div>`).join('') : `<span class="mini">${vazio}</span>`);

function blocoCodigos() {
  const l = est.dados?.codigos || [];
  if (!l.length) return '<span class="es-txt">Nenhum pedido de código agora. Quando alguém digitar o número no app, o código aparece aqui para você repassar (você também: peça o seu na tela do app e ele aparece aqui).</span>';
  return l.map((c) => `<div class="lista-linha" style="gap:10px;align-items:center">
    <span class="cresce"><b style="font-size:15px">${esc(c.nome || fmtCel(c.celular))}</b><br><span class="mini">${esc(fmtCel(c.celular))} · vale até ${new Date(c.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></span>
    <b class="num" style="font-size:24px;letter-spacing:2px">${esc(c.codigo)}</b>
    <a class="btn btn-verde btn-pequeno" target="_blank" rel="noopener" href="https://wa.me/${esc(c.celular)}?text=${encodeURIComponent(msgCodigo(c.codigo))}">WhatsApp</a>
  </div>`).join('');
}

// ---------- tempo e gráficos simples ----------
const fmtTempo = (s) => {
  s = Math.round(s || 0);
  const m = Math.floor(s / 60);
  const t = s < 60 ? `${s} s` : m < 5 ? `${m} min ${s % 60 ? (s % 60) + ' s' : ''}`.trim() : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
  return t.replace(/ /g, ' '); // não quebra "58 min" em duas linhas
};
const rotuloDia = (d) => { const x = new Date(d + 'T12:00:00'); return `${x.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()}<br>${d.slice(8)}`; };
function barrasDia(pd) {
  const lista = pd || [];
  const max = Math.max(1, ...lista.map((x) => x[1]));
  const total = lista.reduce((t, x) => t + x[1], 0);
  if (!total) return '<span class="mini">Nenhuma abertura nos últimos 14 dias.</span>';
  return `<div role="img" aria-label="Aberturas por dia nos últimos 14 dias: ${lista.map((x) => `${x[0].slice(8)}: ${x[1]}`).join(', ')}" style="display:flex;align-items:flex-end;gap:3px;height:92px;margin-top:4px">${lista.map((x, i) => `<div title="${esc(x[0].split('-').reverse().join('/'))}: ${x[1]} abertura(s), ${esc(fmtTempo(x[2]))}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0"><span style="font-size:11px;font-weight:800;color:#3E3B33;height:14px">${x[1] || ''}</span><span style="width:100%;height:${x[1] ? Math.max(4, Math.round((x[1] / max) * 62)) : 2}px;background:${i === lista.length - 1 ? '#007731' : '#6FAE84'};border-radius:3px 3px 0 0;${x[1] ? '' : 'opacity:.35'}"></span></div>`).join('')}</div>
  <div style="display:flex;gap:3px">${lista.map((x) => `<span style="flex:1;min-width:0;text-align:center;font-size:10px;line-height:1.15;color:var(--texto-3)">${rotuloDia(x[0])}</span>`).join('')}</div>`;
}
const barra = (pct) => `<div style="height:6px;border-radius:3px;background:#E9E5DA;margin-top:3px"><div style="width:${Math.max(3, Math.min(100, pct))}%;height:100%;background:#2E7D4F;border-radius:3px"></div></div>`;
// ranking com barra: itens = [{ rot, val, sub }], valores numéricos para o tamanho da barra
function rankBarras(itens, vazio = 'sem uso ainda') {
  if (!itens.length) return `<span class="mini">${vazio}</span>`;
  const max = Math.max(1, ...itens.map((i) => i.n));
  return itens.map((i, k) => `<div style="padding:6px 0"><div style="display:flex;gap:8px;align-items:baseline"><span class="cresce" style="font-size:13px;min-width:0"><b class="num" style="color:var(--texto-3);margin-right:6px">${k + 1}º</b>${i.rot}</span><b class="num" style="font-size:13px;white-space:nowrap">${i.val}</b></div>${barra((i.n / max) * 100)}${i.sub ? `<span class="mini" style="font-size:11px">${i.sub}</span>` : ''}</div>`).join('');
}
const rankTelas = (l) => rankBarras((l || []).map((t) => ({ rot: esc(nomeTela(t.t)), n: t.s || t.v, val: t.s ? fmtTempo(t.s) : `${t.v} vez(es)`, sub: `${t.v} visualização(ões)` })), 'ainda sem tempo registrado');
const rankToques = (l) => rankBarras((l || []).map(([k, n]) => ({ rot: esc(k), n, val: `${n}×` })), 'sem toques ainda');

// ---------- convite pelo WhatsApp ----------
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const msgConvite = (nome) => `Olá${primeiroNome(nome) ? ', ' + primeiroNome(nome) : ''}! Você foi escolhido para testar o Amendoim Brasil antes de todo mundo.\n\n1) Abra este link: ${SITE}\n2) Digite o seu celular e peça o código.\n3) O código chega para você aqui no WhatsApp, em seguida.\n\nNo iPhone, abra pelo Safari. Qualquer dúvida, é só responder esta mensagem.`;
const celConvite = () => { const d = String(est.inv.cel || '').replace(/\D/g, ''); const n = d.length === 10 || d.length === 11 ? '55' + d : d; return n.length >= 12 && n.length <= 13 ? n : ''; };
const textoConvite = () => (est.inv.editou && est.inv.msg ? est.inv.msg : msgConvite(est.inv.nome));
const linkConvite = () => { const n = celConvite(); return n ? `https://wa.me/${n}?text=${encodeURIComponent(textoConvite())}` : '#'; };
const mais21 = () => new Date(Date.now() + 21 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const ateConvite = () => (est.inv.ate === null ? mais21() : est.inv.ate);
const rotPlano = (p) => (p === 'produtor' ? 'Produtor' : 'Empresa');
const faltaConvite = () => (!celConvite() || est.inv.nome.trim().length < 2 ? 'Preencha o nome e o celular com DDD.' : !est.inv.plano ? 'Escolha o plano: Produtor ou Empresa.' : '');
const sincConvite = () => {
  const a = document.getElementById('pp-inv-wa'); if (!a) return;
  const ok = !faltaConvite();
  a.href = linkConvite();
  if (ok) { a.removeAttribute('aria-disabled'); a.style.opacity = ''; } else { a.setAttribute('aria-disabled', 'true'); a.style.opacity = '.45'; }
  const b = document.querySelector('[data-pp-inv-liberar]'); if (b) b.disabled = !ok;
};
function blocoConvite() {
  const i = est.inv, ok = !faltaConvite(), auto = est.dados?.whatsapp?.provedor !== 'manual';
  return `<section class="cartao" style="gap:10px"><span class="rotulo">Convidar para o teste</span>
    <span class="es-txt">Escreva o nome e o celular de quem você quer convidar. O botão libera o acesso e abre o WhatsApp já com a mensagem pronta. ${auto ? '' : 'Quando a pessoa pedir o código, você recebe o aviso aqui no painel e repassa.'}</span>
    <div class="campo"><label for="pp-inv-nome">Nome</label><input id="pp-inv-nome" maxlength="80" autocomplete="off" value="${esc(i.nome)}" placeholder="ex.: João da Silva"></div>
    <div class="campo"><label for="pp-inv-cel">Celular com WhatsApp</label><input id="pp-inv-cel" type="tel" inputmode="tel" autocomplete="off" placeholder="(18) 90000-0000" value="${esc(i.cel)}"></div>
    <div class="campo"><label>Plano <b style="color:#B3261E">(escolha um)</b></label><div class="segmento pn-abas" role="group" aria-label="Plano do convidado"><button type="button" data-pp-inv-plano="produtor" aria-pressed="${i.plano === 'produtor'}">Produtor</button><button type="button" data-pp-inv-plano="empresa" aria-pressed="${i.plano === 'empresa'}">Empresa</button></div>
      <span class="mini">${i.plano === 'produtor' ? 'Produtor: estimativas, exportação e histórico.' : i.plano === 'empresa' ? 'Empresa: tudo, inclusive o Painel de Mercado.' : 'Nenhum plano escolhido ainda. Sem escolher, o acesso não é liberado.'}</span></div>
    <div class="campo"><label for="pp-inv-ate">Acesso até</label><input id="pp-inv-ate" type="date" value="${esc(ateConvite())}"><span class="mini">Já vem com 21 dias a partir de hoje. Pode mudar a data. Se apagar, fica sem prazo.</span></div>
    <div class="campo"><label for="pp-inv-msg">Mensagem do convite (pode editar)</label><textarea id="pp-inv-msg" rows="8" style="width:100%;font:inherit;font-size:14px;line-height:1.4;padding:10px;border:1px solid var(--linha);border-radius:12px;background:#fff">${esc(textoConvite())}</textarea></div>
    <a class="btn btn-verde" id="pp-inv-wa" data-pp-inv-wa target="_blank" rel="noopener" href="${esc(linkConvite())}" ${ok ? '' : 'aria-disabled="true" style="opacity:.45"'}>Liberar e enviar pelo WhatsApp</a>
    <div class="es-botoes"><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-inv-share>Só compartilhar a mensagem</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-inv-liberar ${ok ? '' : 'disabled'}>Só liberar o acesso</button></div>
    <span class="mini">“Só compartilhar” abre a lista do celular para você escolher o contato. Nesse caso, depois libere o número com “Só liberar o acesso”.</span>
    <div class="mini" role="status" style="text-align:center">${esc(i.aviso)}</div>
  </section>`;
}

// ---------- avisos no celular (Web Push) ----------
const paraBytes = (t) => { const b = atob((t + '='.repeat((4 - (t.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
const suportePush = () => {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { ios, instalado, ok };
};
async function chamarPush(acao, sub) {
  try {
    const r = await fetch('/api/alertas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acao, sub, k: pegarChave() }) });
    return { ...(await r.json().catch(() => ({}))), status: r.status };
  } catch (e) { return { status: 0 }; }
}
async function registroSw() { return Promise.race([navigator.serviceWorker.ready, new Promise((_, n) => setTimeout(() => n(new Error('sw')), 8000))]); }
async function verificarPush() {
  const sp = suportePush();
  if (!sp.ok) est.push.estado = sp.ios && !sp.instalado ? 'instalar' : 'sem';
  else if (sp.ios && !sp.instalado) est.push.estado = 'instalar';
  else if (Notification.permission === 'denied') est.push.estado = 'negado';
  else if (Notification.permission !== 'granted') est.push.estado = 'desligado';
  else {
    try {
      const sub = await (await registroSw()).pushManager.getSubscription();
      const r = sub ? await chamarPush('painel_estado', sub.toJSON()) : null;
      est.push.estado = r?.ligado ? 'ligado' : 'desligado';
    } catch (e) { est.push.estado = 'desligado'; }
  }
  const el = document.getElementById('pp-push');
  if (el) el.innerHTML = blocoPush(); else if (est.sub === 'codigos') redesenhar();
}
async function ligarPush() {
  est.push.ocupado = true; est.push.msg = '';
  try {
    if ((await Notification.requestPermission()) !== 'granted') { est.push.estado = Notification.permission === 'denied' ? 'negado' : 'desligado'; est.push.msg = 'Sem a permissão, o celular não deixa o painel avisar.'; return; }
    const reg = await registroSw();
    const { chave } = await (await fetch('/api/alertas', { cache: 'no-store' })).json();
    const bytes = paraBytes(chave);
    let sub = await reg.pushManager.getSubscription();
    if (sub) { const a = sub.options?.applicationServerKey && new Uint8Array(sub.options.applicationServerKey); if (!a || a.length !== bytes.length || a.some((v, k) => v !== bytes[k])) { await sub.unsubscribe(); sub = null; } }
    sub = sub || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes }));
    const r = await chamarPush('painel_ligar', sub.toJSON());
    if (!r.ok) { est.push.msg = r.status === 401 ? 'Chave do painel não confere. Entre de novo no painel.' : 'Não foi possível ligar agora. Tente de novo.'; return; }
    est.push.estado = 'ligado';
    await chamarPush('painel_teste', sub.toJSON());
    est.push.msg = 'Ligado. Enviei um aviso de teste: ele deve aparecer em instantes.';
  } catch (e) { est.push.msg = 'Este aparelho não conseguiu ligar os avisos.'; }
  finally { est.push.ocupado = false; }
}
async function desligarPush() {
  est.push.ocupado = true; est.push.msg = '';
  try {
    const sub = await (await registroSw()).pushManager.getSubscription();
    if (sub) await chamarPush('painel_desligar', sub.toJSON());
    est.push.estado = 'desligado'; est.push.msg = 'Avisos desligados neste aparelho.';
  } catch (e) { est.push.msg = 'Não foi possível desligar agora.'; }
  finally { est.push.ocupado = false; }
}
async function testarPush() {
  est.push.ocupado = true; est.push.msg = '';
  try {
    const sub = await (await registroSw()).pushManager.getSubscription();
    const r = sub ? await chamarPush('painel_teste', sub.toJSON()) : null;
    est.push.msg = r?.ok ? 'Aviso enviado. Se não aparecer, olhe Ajustes › Notificações.' : 'Não consegui enviar o teste. Desligue e ligue de novo.';
  } catch (e) { est.push.msg = 'Não consegui enviar o teste.'; }
  finally { est.push.ocupado = false; }
}
function blocoPush() {
  const p = est.push, e = p.estado;
  const corpo = e === 'verificando' ? '<span class="mini">Verificando…</span>'
    : e === 'ligado' ? `<span class="es-txt">Quando alguém pedir o código do teste, este celular recebe um aviso. Toque nele para abrir o painel e repassar.</span><div class="es-botoes"><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-push="teste" ${p.ocupado ? 'disabled' : ''}>Enviar aviso de teste</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-push="desligar" ${p.ocupado ? 'disabled' : ''}>Desligar</button></div>`
    : e === 'instalar' ? '<span class="es-txt">No iPhone, os avisos só funcionam com o painel aberto pelo <b>ícone da Tela de Início</b> (iOS 16.4 ou mais novo). Abra o painel por lá e volte nesta tela.</span>'
    : e === 'negado' ? '<span class="es-txt">As notificações estão bloqueadas para este app. Libere em <b>Ajustes › Notificações › Painel AB</b> e abra o painel de novo.</span>'
    : e === 'sem' ? '<span class="es-txt">Este navegador não aceita avisos no celular. Use o painel pelo Chrome (Android) ou pelo ícone da Tela de Início (iPhone).</span>'
    : `<span class="es-txt">Receba um aviso no celular toda vez que alguém pedir o código do teste. Ao tocar nele, o painel abre aqui, com o código pronto para você mandar pelo WhatsApp.</span><button class="btn btn-verde btn-pequeno" type="button" data-pp-push="ligar" ${p.ocupado ? 'disabled' : ''}>${p.ocupado ? 'Ligando…' : 'Ligar os avisos'}</button>`;
  return `<div class="cartao-cab"><span class="rotulo">Avisos no celular</span><span class="pilula ${e === 'ligado' ? 'pilula-verde' : 'pilula-amendoim'}">${e === 'ligado' ? 'LIGADOS' : 'desligados'}</span></div>${corpo}${p.msg ? `<div class="mini" role="status">${esc(p.msg)}</div>` : ''}`;
}

// ---------- uso: geral e por pessoa ----------
function blocoUsoGeral() {
  const g = est.uso?.geral;
  if (!g) return '<section class="cartao"><span class="mini">Sem dados de uso ainda.</span></section>';
  if (!g.aberturas && !g.seg) return `<section class="cartao" style="gap:6px"><span class="rotulo">Uso geral do teste</span><span class="mini">Ainda sem uso dos convidados. Quando entrarem, aqui aparece o que o grupo todo mais usa.</span></section>`;
  const medio = g.pessoas ? g.seg / g.pessoas : 0;
  return `<section class="cartao" style="gap:10px"><div class="cartao-cab"><span class="rotulo">Uso geral do teste</span><span class="mini">só convidados</span></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Aberturas', g.aberturas)}${tile('Tempo total', fmtTempo(g.seg))}${tile('Por pessoa', fmtTempo(medio), 'de quem entrou')}</div>
    <span class="rotulo">Aberturas por dia · 14 dias</span>${barrasDia(g.porDia)}</section>
  <section class="cartao" style="gap:6px"><span class="rotulo">Onde mais ficaram</span><span class="mini">tempo de tela aberta e mexendo, por tela</span>${rankTelas(g.telas)}</section>
  <section class="cartao" style="gap:6px"><span class="rotulo">Botões mais tocados</span>${rankToques(g.cliques)}</section>
  <section class="cartao" style="gap:6px"><span class="rotulo">Ranking de pessoas</span><span class="mini">por tempo de uso</span>${rankBarras((g.ranking || []).map((x) => ({ rot: esc(x.nome), n: x.seg, val: fmtTempo(x.seg), sub: `${x.aberturas} abertura(s) · ${x.dias} dia(s)` })), 'ninguém entrou ainda')}</section>`;
}

function pessoaUso(c, u) {
  const uso = u || { sessoes: 0, dias: 0, seg: 0, seg7: 0, porDia: [], telasDet: [], cliques: [], ultimas: [] };
  const ult = c.ultimo_acesso || uso.ultimo_acesso, entrou = !!ult || uso.sessoes > 0;
  const aberto = est.abertos.has(c.id);
  const resumo = entrou ? `${uso.sessoes} abertura(s) · ${fmtTempo(uso.seg)}` : 'ainda não entrou';
  return `<details class="cartao" data-pp-pessoa="${esc(c.id)}" ${aberto ? 'open' : ''} style="gap:10px;${c.ativo ? '' : 'opacity:.6'}">
    <summary style="cursor:pointer;list-style:none;display:flex;gap:10px;align-items:center"><span class="cresce"><b style="font-size:16px">${esc(c.nome)}</b> <span class="pilula ${c.plano === 'empresa' ? 'pilula-azul' : 'pilula-verde'}">${c.plano === 'empresa' ? 'Empresa' : 'Produtor'}</span><br><span class="mini"><b>${c.ativo ? (entrou ? 'visto ' + quando(ult) : 'ainda não entrou') : 'acesso encerrado'}</b> · ${esc(resumo)}</span></span><span aria-hidden="true" style="font-size:20px;color:var(--texto-3)">${aberto ? '⌃' : '⌄'}</span></summary>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <span class="mini">${esc(fmtCel(c.celular))}${c.empresa ? ' · ' + esc(c.empresa) : ''}${c.observacao ? ' · ' + esc(c.observacao) : ''}${c.expira_em ? ' · até ' + new Date(c.expira_em).toLocaleDateString('pt-BR') : ''}${entrou && !c.perfil_ok ? ' · não confirmou o nome' : ''}</span>
      ${entrou ? `<div class="pn-tiles" style="grid-template-columns:repeat(2,1fr)">${tile('Aberturas', uso.sessoes)}${tile('Dias que entrou', uso.dias)}${tile('Tempo total', fmtTempo(uso.seg))}${tile('Últimos 7 dias', fmtTempo(uso.seg7))}</div>
      <span class="rotulo">Aberturas por dia · 14 dias</span>${barrasDia(uso.porDia)}
      <span class="rotulo">Onde mais ficou</span>${rankTelas(uso.telasDet)}
      <span class="rotulo">Botões tocados</span>${rankToques(uso.cliques)}
      ${uso.ultimas?.length ? `<span class="rotulo">Últimas ações</span>${uso.ultimas.map((a) => `<div class="lista-linha" style="padding:5px 0"><span class="cresce mini">${a.t === 'abriu' ? 'abriu o app' : a.t === 'tela' ? 'viu ' + esc(nomeTela(a.d)) : 'tocou ' + esc(a.d)}</span><span class="mini">${quando(a.em)}</span></div>`).join('')}` : ''}` : '<span class="mini">Ainda não abriu o app.</span>'}
      <div class="es-botoes"><button class="chip" type="button" data-pp-editar="${esc(c.id)}">Editar</button></div>
    </div></details>`;
}

function blocoZerar() {
  const desde = est.uso?.desde ? `Contando desde ${new Date(est.uso.desde).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.` : 'Contando desde o início do teste.';
  return `<section class="cartao" style="gap:8px"><span class="rotulo">Começar do zero</span><span class="mini">${desde}</span>
    ${est.zerar
      ? `<span class="es-txt">Isto apaga o uso registrado (aberturas, tempo, telas e toques) e o “visto há” de todos os convidados. Os convidados e os acessos continuam. <b>Não dá para desfazer.</b></span>
         <label class="es-check"><input type="checkbox" id="pp-zerar-op" ${est.zerarOp ? 'checked' : ''}><span>Apagar também as opiniões e os áudios</span></label>
         <div class="es-botoes"><button class="btn btn-pequeno btn-perigo" type="button" data-pp-zerar="sim">Sim, zerar agora</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-zerar="nao">Cancelar</button></div>`
      : `<button class="btn btn-pequeno es-btn-claro" type="button" data-pp-zerar="pedir">Zerar o uso do teste</button>`}
    ${est.zMsg ? `<div class="mini" role="status">${esc(est.zMsg)}</div>` : ''}</section>`;
}

// soma o uso de um grupo de pessoas (por plano) a partir dos números de cada uma
function somaGrupo(cs, usoPor) {
  const us = cs.map((c) => usoPor.get(c.id)).filter(Boolean);
  const telas = new Map(), cliques = new Map(), dias = new Map();
  us.forEach((u) => {
    (u.telasDet || []).forEach((t) => { const x = telas.get(t.t) || { t: t.t, v: 0, s: 0 }; x.v += t.v || 0; x.s += t.s || 0; telas.set(t.t, x); });
    (u.cliques || []).forEach(([k, n]) => cliques.set(k, (cliques.get(k) || 0) + n));
    (u.porDia || []).forEach(([d, a, sg]) => { const x = dias.get(d) || [d, 0, 0]; x[1] += a || 0; x[2] += sg || 0; dias.set(d, x); });
  });
  const entraram = cs.filter((c) => c.ultimo_acesso || (usoPor.get(c.id)?.sessoes || 0) > 0).length;
  const aberturas = us.reduce((n, u) => n + (u.sessoes || 0), 0), seg = us.reduce((n, u) => n + (u.seg || 0), 0);
  return {
    pessoas: cs.length, entraram, hoje: us.filter((u) => u.hoje).length, aberturas, seg,
    medio: entraram ? seg / entraram : 0, abPessoa: entraram ? aberturas / entraram : 0,
    telas: [...telas.values()].sort((a, b) => b.s - a.s || b.v - a.v).slice(0, 8),
    cliques: [...cliques.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    porDia: [...dias.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  };
}
function blocoComparar(convs, usoPor) {
  const p = somaGrupo(convs.filter((c) => c.plano !== 'empresa'), usoPor), e = somaGrupo(convs.filter((c) => c.plano === 'empresa'), usoPor);
  const linha = (rot, a, b) => `<div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:6px;padding:7px 0;border-top:1px solid var(--linha);align-items:baseline"><span class="mini" style="font-size:13px">${rot}</span><b class="num" style="font-size:14px;text-align:right">${a}</b><b class="num" style="font-size:14px;text-align:right">${b}</b></div>`;
  const nf1 = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const topo = (g) => (g.telas[0] ? esc(nomeTela(g.telas[0].t)) : '—');
  return `<section class="cartao" style="gap:2px"><div class="cartao-cab"><span class="rotulo">Produtor × Empresa</span><span class="mini">compare os dois grupos</span></div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:6px;padding:4px 0"><span></span><span class="pilula pilula-verde" style="justify-self:end">Produtor</span><span class="pilula pilula-azul" style="justify-self:end">Empresa</span></div>
    ${linha('Pessoas', p.pessoas, e.pessoas)}${linha('Já entraram', p.entraram, e.entraram)}${linha('Usaram hoje', p.hoje, e.hoje)}${linha('Aberturas', p.aberturas, e.aberturas)}${linha('Aberturas por pessoa', nf1(p.abPessoa), nf1(e.abPessoa))}${linha('Tempo total', fmtTempo(p.seg), fmtTempo(e.seg))}${linha('Tempo por pessoa', fmtTempo(p.medio), fmtTempo(e.medio))}${linha('Tela em que mais ficam', topo(p), topo(e))}
    <span class="mini" style="margin-top:6px">“Por pessoa” conta só quem já entrou. Para ver um grupo em detalhe, escolha o plano no filtro acima.</span></section>`;
}
function blocoUsoGrupo(cs, usoPor, plano) {
  const g = somaGrupo(cs, usoPor), rot = plano === 'empresa' ? 'Empresa' : 'Produtor';
  if (!g.pessoas) return `<section class="cartao"><span class="mini">Ninguém no plano ${rot} ainda.</span></section>`;
  if (!g.aberturas && !g.seg) return `<section class="cartao" style="gap:6px"><span class="rotulo">Uso do plano ${rot}</span><span class="mini">Ainda sem uso. Quando entrarem, aqui aparece o que o grupo ${rot} mais usa.</span></section>`;
  return `<section class="cartao" style="gap:10px"><div class="cartao-cab"><span class="rotulo">Uso do plano ${rot}</span><span class="mini">${g.pessoas} pessoa(s)</span></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Aberturas', g.aberturas)}${tile('Tempo total', fmtTempo(g.seg))}${tile('Por pessoa', fmtTempo(g.medio), 'de quem entrou')}</div>
    <span class="rotulo">Aberturas por dia · 14 dias</span>${barrasDia(g.porDia)}</section>
  <section class="cartao" style="gap:6px"><span class="rotulo">Onde mais ficaram</span><span class="mini">somando as telas principais de cada pessoa do grupo</span>${rankTelas(g.telas)}</section>
  <section class="cartao" style="gap:6px"><span class="rotulo">Botões mais tocados</span>${rankToques(g.cliques)}</section>`;
}
function abaUso(todos, usoPor) {
  const nP = todos.filter((c) => c.plano !== 'empresa').length, nE = todos.filter((c) => c.plano === 'empresa').length;
  const convs = est.usoPlano === 'produtor' ? todos.filter((c) => c.plano !== 'empresa') : est.usoPlano === 'empresa' ? todos.filter((c) => c.plano === 'empresa') : todos;
  const entraram = convs.filter((c) => c.ultimo_acesso).length, hoje = convs.filter((c) => usoPor.get(c.id)?.hoje).length;
  return `<section class="cartao" style="gap:10px"><div class="cartao-cab"><span class="rotulo">Quem está no teste</span><button class="chip" type="button" data-pp-recarregar>Atualizar</button></div>
    <div class="segmento pn-abas" role="group" aria-label="Filtrar por plano"><button type="button" data-pp-usoplano="todos" aria-pressed="${est.usoPlano === 'todos'}">Todos (${todos.length})</button><button type="button" data-pp-usoplano="produtor" aria-pressed="${est.usoPlano === 'produtor'}">Produtor (${nP})</button><button type="button" data-pp-usoplano="empresa" aria-pressed="${est.usoPlano === 'empresa'}">Empresa (${nE})</button></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Convidados', convs.length)}${tile('Já entraram', entraram, `de ${convs.length}`)}${tile('Usaram hoje', hoje)}</div>
    <span class="mini">Só conta quem foi convidado. O seu uso (administrador) não entra aqui.</span>
    <div class="segmento pn-abas"><button type="button" data-pp-usovis="geral" aria-pressed="${est.usoVis === 'geral'}">Geral</button><button type="button" data-pp-usovis="pessoas" aria-pressed="${est.usoVis === 'pessoas'}">Por pessoa</button></div></section>
  ${est.usoVis === 'geral' ? (est.usoPlano === 'todos' ? blocoComparar(todos, usoPor) + blocoUsoGeral() : blocoUsoGrupo(convs, usoPor, est.usoPlano))
    : `${convs.length ? `<div class="es-botoes" style="justify-content:flex-end"><button class="chip" type="button" data-pp-todos="abrir">Expandir todos</button><button class="chip" type="button" data-pp-todos="fechar">Recolher todos</button></div>` : ''}${convs.map((c) => pessoaUso(c, usoPor.get(c.id))).join('') || '<div class="vazio">Ninguém foi convidado ainda. Use a aba Convidar.</div>'}`}
  ${blocoZerar()}`;
}

function abaOpinioes() {
  const fb = est.uso?.feedback || [];
  return `<section class="cartao" style="gap:8px"><span class="rotulo">Opiniões enviadas (${fb.length})</span>
    ${fb.length ? fb.map((f) => `<div style="border-top:1px solid var(--linha);padding-top:8px;display:flex;flex-direction:column;gap:4px"><span><b style="font-size:14px">${esc(f.nome)}</b> <span class="mini">· ${quando(f.em)}${f.tela ? ' · em ' + esc(nomeTela(f.tela)) : ''}</span>${TAGS[f.tag] ? ` <span class="pilula ${TAGS[f.tag][1]}">${TAGS[f.tag][0]}</span>` : ''}</span>${f.texto ? `<div class="es-txt">${esc(f.texto)}</div>` : ''}${f.audio ? `<div data-pp-audio="${esc(f.id)}"><button class="chip" type="button" data-pp-ouvir="${esc(f.id)}">▶ Ouvir o áudio (${mmss(f.seg)})</button></div>` : ''}</div>`).join('') : '<span class="mini">Nenhuma opinião ainda. O botão "Opinar" fica na tela dos convidados.</span>'}
  </section>`;
}

// ---------- aba Pessoas: quem está ativo, quem foi cortado e o prazo de cada um ----------
const ETAPAS = {
  agora: ['Acessou há pouco', 'background:#DDF0E1;color:#0B5E2B'],
  ativo: ['Ativo', 'background:#E6F2E9;color:#0B5E2B'],
  pediu: ['Pediu o código, ainda não entrou', 'background:#FBF1DC;color:#5C3A06'],
  convidado: ['Convidado, ainda não pediu código', 'background:#E4EDF7;color:#1F4E79'],
  vencido: ['Prazo vencido', 'background:#FBE3E0;color:#B3261E'],
  cortado: ['Acesso cortado', 'background:#FBE3E0;color:#B3261E']
};
const ORDEM_ETAPA = ['agora', 'ativo', 'pediu', 'convidado', 'vencido', 'cortado'];
function etapaDe(c) {
  if (!c.ativo) return 'cortado';
  if (c.expira_em && new Date(c.expira_em) < new Date()) return 'vencido';
  const ult = c.ultimo_acesso ? new Date(c.ultimo_acesso).getTime() : 0;
  if (ult && Date.now() - ult < 15 * 60000) return 'agora';
  if (c.entrou || ult) return 'ativo';
  if (c.ultimo_pedido) return 'pediu';
  return 'convidado';
}
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR');
function linhaPessoa(c) {
  const k = etapaDe(c), [rot, cor] = ETAPAS[k];
  const prazo = c.expira_em ? String(c.expira_em).slice(0, 10) : '';
  const info = [fmtCel(c.celular), c.expira_em ? (k === 'vencido' ? 'venceu em ' : 'acesso até ') + dataBR(c.expira_em) : 'sem prazo',
    c.ultimo_acesso ? 'visto ' + quando(c.ultimo_acesso) : c.ultimo_pedido ? 'pediu o código ' + quando(c.ultimo_pedido) : ''].filter(Boolean).join(' · ');
  const corta = est.cortando === c.id, tp = est.trocandoPlano?.id === c.id ? est.trocandoPlano : null;
  return `<section class="cartao" data-pp-linha="${esc(c.id)}" style="gap:8px">
    <div style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap"><span><b style="font-size:16px">${esc(c.nome)}</b> <span class="pilula ${c.plano === 'empresa' ? 'pilula-azul' : 'pilula-verde'}">${rotPlano(c.plano)}</span></span><span style="${cor};font-size:12px;font-weight:800;border-radius:999px;padding:3px 10px">${rot}</span></div>
    <span class="mini">${esc(info)}${c.observacao ? ' · ' + esc(c.observacao) : ''}</span>
    ${tp
      ? `<span class="es-txt">Passar <b>${esc(c.nome)}</b> para o plano <b>${rotPlano(tp.plano)}</b>? ${tp.plano === 'empresa' ? 'A pessoa passa a ver também o Painel de Mercado.' : 'A pessoa deixa de ver o Painel de Mercado.'} Vale na próxima vez que abrir o app, sem sair e sem pedir código novo.</span>
         <div class="es-botoes"><button class="btn btn-pequeno btn-verde" type="button" data-pp-plano-sim>Sim, passar para ${rotPlano(tp.plano)}</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-plano-nao>Cancelar</button></div>`
      : corta
      ? `<span class="es-txt">Cortar o acesso de <b>${esc(c.nome)}</b> agora? Ele sai do app na hora e não consegue pedir outro código.</span>
         <div class="es-botoes"><button class="btn btn-pequeno btn-perigo" type="button" data-pp-cortar-sim="${esc(c.id)}">Sim, cortar o acesso</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-cortar-nao>Cancelar</button></div>`
      : `<div class="es-botoes">${c.ativo
          ? `<button class="chip" type="button" data-pp-cortar="${esc(c.id)}" style="color:#B3261E;border-color:#E3B5B0">Cortar acesso</button>`
          : `<button class="chip" type="button" data-pp-reativar="${esc(c.id)}" style="color:#0B5E2B;border-color:#9CC9A8">Reativar acesso</button>`}
         <a class="chip" target="_blank" rel="noopener" href="https://wa.me/${esc(c.celular)}?text=${encodeURIComponent(msgConvite(c.nome))}">Convite</a>
         <button class="chip" type="button" data-pp-editar="${esc(c.id)}">Editar tudo</button></div>
         <div style="display:flex;gap:8px;align-items:center"><span class="mini" style="font-weight:700">Plano</span><div class="segmento" role="group" aria-label="Plano de ${esc(c.nome)}" style="flex:1;max-width:280px"><button type="button" data-pp-plano-trocar="${esc(c.id)}" data-plano="produtor" aria-pressed="${c.plano !== 'empresa'}">Produtor</button><button type="button" data-pp-plano-trocar="${esc(c.id)}" data-plano="empresa" aria-pressed="${c.plano === 'empresa'}">Empresa</button></div></div>
         <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><label class="mini" for="pp-prazo-${esc(c.id)}" style="font-weight:700">Acesso até</label>
           <input id="pp-prazo-${esc(c.id)}" type="date" value="${esc(prazo)}" style="height:40px;border:1.5px solid var(--borda);border-radius:10px;padding:0 8px;font:inherit;font-size:15px;background:#fff">
           <button class="chip" type="button" data-pp-prazo="${esc(c.id)}">Salvar prazo</button>${c.expira_em ? `<button class="chip" type="button" data-pp-prazo-limpar="${esc(c.id)}">Sem prazo</button>` : ''}</div>`}
  </section>`;
}
function abaPessoas(convs) {
  const por = (...ks) => convs.filter((c) => ks.includes(etapaDe(c))).length;
  const ord = [...convs].sort((a, b) => ORDEM_ETAPA.indexOf(etapaDe(a)) - ORDEM_ETAPA.indexOf(etapaDe(b)) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return `<section class="cartao" style="gap:10px"><div class="cartao-cab"><span class="rotulo">Quem tem acesso</span><button class="chip" type="button" data-pp-recarregar>Atualizar</button></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Já entraram', por('agora', 'ativo'), `de ${convs.length}`)}${tile('Aguardando', por('pediu', 'convidado'), 'ainda não entrou')}${tile('Cortados', por('cortado', 'vencido'), 'sem acesso')}</div>
    <span class="mini">Cortar tira o acesso na hora, mas a pessoa continua na lista e você pode reativar. O prazo encerra o acesso sozinho na data escolhida (fim do dia).</span>
    ${est.pMsg ? `<div class="mini" role="status" style="font-weight:700">${esc(est.pMsg)}</div>` : ''}</section>
  ${ord.map(linhaPessoa).join('') || '<div class="vazio">Ninguém foi convidado ainda. Use a aba Convidar.</div>'}`;
}
async function mudarPessoa(id, m, ok) {
  const c = (est.dados?.convidados || []).find((y) => y.id === id);
  if (!c) return;
  est.cortando = null; est.trocandoPlano = null; est.pMsg = 'Salvando…'; redesenhar();
  const r = await chamar('admin_salvar', { nome: c.nome, celular: c.celular, plano: c.plano, papel: c.papel || 'usuario', ativo: c.ativo, expira_em: c.expira_em, observacao: c.observacao || '', ...m });
  if (r.ok) {
    const [l, u] = await Promise.all([chamar('admin_listar'), chamar('admin_uso')]);
    if (l.ok) est.dados = l; if (u.ok) est.uso = u;
    est.pMsg = `${c.nome}: ${ok}`;
  } else est.pMsg = r.mensagem || 'Não foi possível salvar agora.';
  redesenhar();
}

function abaConvidar(convs) {
  const e = est.editando;
  return `${blocoConvite()}
  <section class="cartao" style="gap:6px"><span class="rotulo">Convidados (${convs.length})</span>
    ${convs.length ? convs.map((c) => `<div class="lista-linha" style="gap:8px;align-items:center;${c.ativo ? '' : 'opacity:.55'}"><span class="cresce"><b style="font-size:14px">${esc(c.nome)}</b><br><span class="mini">${rotPlano(c.plano)} · ${esc(fmtCel(c.celular))} · ${c.ativo ? (c.ultimo_acesso ? 'visto ' + quando(c.ultimo_acesso) : 'ainda não entrou') : 'encerrado'}</span></span><a class="chip" target="_blank" rel="noopener" href="https://wa.me/${esc(c.celular)}?text=${encodeURIComponent(msgConvite(c.nome))}">Convite</a><button class="chip" type="button" data-pp-editar="${esc(c.id)}">Editar</button></div>`).join('') : '<span class="mini">Ninguém foi convidado ainda.</span>'}
  </section>
  <details class="cartao" id="pp-det-novo" ${e || est.novo ? 'open' : ''}><summary class="rotulo" style="cursor:pointer">${e ? 'Editar convidado' : '＋ Liberar um convidado (sem convite)'}</summary>
    <form id="pp-form" class="es-campos" style="margin-top:10px">
      <div class="campo"><label for="pp-nome">Nome</label><input id="pp-nome" required maxlength="80" value="${esc(e?.nome || '')}"></div>
      <div class="campo"><label for="pp-cel2">Celular com WhatsApp</label><input id="pp-cel2" type="tel" inputmode="tel" required placeholder="(18) 90000-0000" value="${esc(e ? fmtCel(e.celular) : '')}" ${e ? 'readonly' : ''}></div>
      <div class="campo"><label for="pp-plano">Plano</label><select id="pp-plano" required>${e ? '' : '<option value="" selected disabled>Escolha o plano…</option>'}<option value="produtor" ${e?.plano === 'produtor' ? 'selected' : ''}>Produtor</option><option value="empresa" ${e?.plano === 'empresa' ? 'selected' : ''}>Empresa (tudo, inclusive o Painel de Mercado)</option></select></div>
      <div class="campo"><label for="pp-ate">Acesso até${e ? ' (opcional)' : ''}</label><input id="pp-ate" type="date" value="${esc(e ? (e.expira_em ? String(e.expira_em).slice(0, 10) : '') : mais21())}"></div>
      <div class="campo"><label for="pp-obs">Observação (opcional)</label><input id="pp-obs" maxlength="200" placeholder="ex.: amigo da Dreyfus" value="${esc(e?.observacao || '')}"></div>
      ${e ? `<label class="es-check"><input type="checkbox" id="pp-ativo" ${e.ativo ? 'checked' : ''}><span>Acesso ativo (desmarque para encerrar na hora)</span></label>` : ''}
      <button class="btn btn-verde" type="submit">${e ? 'Salvar' : 'Liberar acesso'}</button>
      ${e ? '<button class="dx-sair" type="button" data-pp-cancelar>Cancelar edição</button>' : ''}
      <div class="mini" role="status" style="text-align:center">${esc(est.msg)}</div>
    </form>
  </details>`;
}

// ---------- a aba ----------
const SUBS = [['codigos', 'Códigos'], ['pessoas', 'Acessos'], ['convidar', 'Convidar'], ['uso', 'Uso'], ['opinioes', 'Opiniões']];
export function telaTeste() {
  if (!est.dados) return `<section class="cartao"><div class="vazio">${est.erro ? `${esc(est.erro)} <button class="link-mini" type="button" data-pp-recarregar>Tentar de novo</button>` : 'Carregando…'}</div></section>`;
  clearInterval(timer);
  if (est.sub === 'codigos') {
    timer = setInterval(() => {
      if (!document.getElementById('pp-codigos')) { clearInterval(timer); return; }
      if (document.visibilityState === 'visible') atualizarCodigos();
    }, 4000);
  }
  const d = est.dados;
  const ligado = !!d.piloto;
  const convs = d.convidados.filter((c) => c.papel !== 'admin');
  const admins = d.convidados.filter((c) => c.papel === 'admin');
  const usoPor = new Map((est.uso?.convidados || []).map((c) => [c.id, c]));
  const abas = `<div class="segmento pn-abas">${SUBS.map(([k, t]) => `<button type="button" data-pp-sub="${k}" aria-pressed="${est.sub === k}">${t}</button>`).join('')}</div>`;
  let corpo = '';
  if (est.sub === 'codigos') corpo = `
  <section class="cartao" style="gap:10px;${ligado ? 'border-color:#BFD9C6' : ''}">
    <div class="cartao-cab"><span class="rotulo">Fase de teste</span><span class="pilula ${ligado ? 'pilula-verde' : 'pilula-amendoim'}">${ligado ? 'LIGADA' : 'desligada'}</span></div>
    <span class="es-txt">${ligado
      ? '<b>O app inteiro está travado:</b> só entra quem tem convite (celular + código), com o nome na marca d\'água, sem compartilhar. O uso dos convidados é registrado; o seu não conta.'
      : 'O app está aberto ao público, como sempre. Ligue para travar tudo e começar o teste só com os convidados.'}</span>
    ${est.confirma
      ? `<div class="es-botoes"><button class="btn btn-pequeno ${ligado ? 'btn-perigo' : 'btn-verde'}" type="button" data-pp-piloto="${ligado ? 'off' : 'on'}">${ligado ? 'Sim, encerrar a fase de teste' : 'Sim, travar o app agora'}</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-piloto="nao">Cancelar</button></div>`
      : `<button class="btn btn-pequeno ${ligado ? 'es-btn-claro' : 'btn-verde'}" type="button" data-pp-piloto="pedir">${ligado ? 'Encerrar a fase de teste' : 'Ligar a fase de teste'}</button>`}
    <span class="mini">${ligado ? 'Ao encerrar, o app volta ao normal: tira o bloqueio, a marca d\'água e o registro de uso. Os convidados continuam com a conta.' : 'Antes de começar, vale zerar o uso na aba Uso para a contagem partir do zero.'}</span>
  </section>
  <section class="cartao" style="gap:8px">
    <div class="cartao-cab"><span class="rotulo">Códigos para repassar</span><span style="display:flex;align-items:center;gap:8px"><span class="mini" id="pp-quando">atualiza sozinho</span><button class="chip" type="button" data-pp-cod>↻ Atualizar</button></span></div>
    <div id="pp-codigos" style="display:flex;flex-direction:column;gap:10px">${blocoCodigos()}</div>
    <span class="mini">Envio automático pelo WhatsApp: <b>${d.whatsapp.provedor === 'manual' ? 'desligado (você repassa o código)' : 'ligado (' + esc(d.whatsapp.provedor) + ')'}</b>.</span>
  </section>
  <section class="cartao" id="pp-push" style="gap:8px">${blocoPush()}</section>
  <details class="cartao tm-info" id="pp-det-zap" ${est.ver ? 'open' : ''}><summary>Ligar o envio automático do código no WhatsApp</summary>
    <form id="pp-form-zap" class="es-campos" style="margin-top:10px">
      <span class="es-txt">Enquanto estiver desligado, o código aparece aqui e você repassa. Para automático, crie a conta no provedor e cole os dados abaixo (ficam só no servidor).</span>
      <div class="campo"><label for="pz-prov">Provedor</label><select id="pz-prov"><option value="manual" ${d.whatsapp.provedor === 'manual' ? 'selected' : ''}>Desligado (manual)</option><option value="zapi" ${d.whatsapp.provedor === 'zapi' ? 'selected' : ''}>Z-API</option><option value="meta" ${d.whatsapp.provedor === 'meta' ? 'selected' : ''}>WhatsApp Cloud API (Meta)</option></select></div>
      <div class="campo"><label for="pz-zi">Z-API · ID da instância</label><input id="pz-zi" autocomplete="off"></div>
      <div class="campo"><label for="pz-zt">Z-API · token</label><input id="pz-zt" autocomplete="off" type="password"></div>
      <div class="campo"><label for="pz-zc">Z-API · client-token (se tiver)</label><input id="pz-zc" autocomplete="off" type="password"></div>
      <div class="campo"><label for="pz-mp">Meta · ID do número</label><input id="pz-mp" autocomplete="off"></div>
      <div class="campo"><label for="pz-mt">Meta · token</label><input id="pz-mt" autocomplete="off" type="password"></div>
      <div class="campo"><label for="pz-mm">Meta · nome do modelo de autenticação</label><input id="pz-mm" autocomplete="off"></div>
      <button class="btn btn-escuro btn-pequeno" type="submit">Salvar envio</button>
      <span class="mini">Campos em branco mantêm o valor que já está salvo.</span>
    </form>
  </details>`;
  else if (est.sub === 'pessoas') corpo = abaPessoas(convs);
  else if (est.sub === 'convidar') corpo = abaConvidar(convs);
  else if (est.sub === 'uso') corpo = abaUso(convs, usoPor);
  else corpo = abaOpinioes();
  return `${abas}${corpo}${admins.length ? `<span class="mini" style="padding:0 4px">Administrador (não conta no uso): ${admins.map((a) => esc(a.nome) + ' · ' + esc(fmtCel(a.celular))).join(', ')}</span>` : ''}`;
}

// ---------- eventos ----------
export function ligarPainelPiloto(desenhar, getChave) {
  redesenhar = desenhar;
  pegarChave = getChave || (() => '');
  // voltou para o painel (aba, app em segundo plano, internet): atualiza na hora, sem esperar o relógio
  const voltou = () => { if (document.visibilityState === 'visible') atualizarCodigos(); };
  document.addEventListener('visibilitychange', voltou);
  window.addEventListener('focus', voltou);
  window.addEventListener('pageshow', voltou);
  window.addEventListener('online', voltou);
  // puxar para baixo no topo da página atualiza os códigos e a aba inteira
  let puxa = null;
  const topo = () => (document.scrollingElement || document.documentElement).scrollTop <= 0;
  const aviso = () => {
    let d = document.getElementById('pp-puxar');
    if (!d) {
      d = document.createElement('div'); d.id = 'pp-puxar';
      d.style.cssText = 'position:fixed;top:0;left:50%;transform:translate(-50%,-70px);z-index:99999;background:#fff;border:1px solid #E6E1D6;border-radius:999px;padding:9px 16px;font-size:14px;font-weight:700;color:#1B1B17;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .15s';
      document.body.appendChild(d);
    }
    return d;
  };
  document.addEventListener('touchstart', (e) => { puxa = document.getElementById('pp-codigos') && topo() && e.touches.length === 1 ? { y: e.touches[0].clientY, dy: 0 } : null; }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!puxa) return;
    const dy = e.touches[0].clientY - puxa.y; puxa.dy = Math.max(0, dy);
    if (dy <= 0) return;
    const d = aviso(); d.textContent = dy > 70 ? '↻ Solte para atualizar' : '↓ Puxe para atualizar'; d.style.transform = `translate(-50%,${Math.min(dy * 0.5, 54) - 8}px)`;
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (!puxa) return;
    const feito = puxa.dy > 70; puxa = null;
    const d = document.getElementById('pp-puxar');
    if (!d) return;
    if (!feito) { d.style.transform = 'translate(-50%,-70px)'; return; }
    d.textContent = '↻ Atualizando…'; d.style.transform = 'translate(-50%,12px)';
    await Promise.all([atualizarCodigos(), carregar()]);
    d.style.transform = 'translate(-50%,-70px)';
  });
  // o que a pessoa digita no convite não se perde quando a tela é redesenhada
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    if (!id || !id.startsWith('pp-inv-')) return;
    const i = est.inv;
    if (id === 'pp-inv-nome') i.nome = e.target.value;
    else if (id === 'pp-inv-cel') i.cel = e.target.value;
    else if (id === 'pp-inv-ate') i.ate = e.target.value;
    else if (id === 'pp-inv-msg') { i.msg = e.target.value; i.editou = true; }
    if (id !== 'pp-inv-msg' && !i.editou) { const m = document.getElementById('pp-inv-msg'); if (m) m.value = msgConvite(i.nome); }
    sincConvite();
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'pp-zerar-op') est.zerarOp = e.target.checked; });
  // as pessoas do Uso abrem e fecham sem perder o estado quando a tela é atualizada
  document.addEventListener('toggle', (e) => {
    const t = e.target;
    if (t.dataset?.ppPessoa) {
      if (t.open) est.abertos.add(t.dataset.ppPessoa); else est.abertos.delete(t.dataset.ppPessoa);
      const seta = t.querySelector('summary > span[aria-hidden]'); if (seta) seta.textContent = t.open ? '⌃' : '⌄';
      return;
    }
    if (t.id === 'pp-det-novo' && !est.editando) est.novo = t.open;
    if (t.id === 'pp-det-zap') est.ver = t.open;
  }, true);
  // a mensagem do convite pode ser enviada para um número novo: libera o acesso antes de sair do painel
  const dadosConvite = () => ({ nome: est.inv.nome.trim(), celular: celConvite() || est.inv.cel, plano: est.inv.plano, papel: 'usuario', ativo: true, expira_em: ateConvite() ? ateConvite() + 'T23:59:59-03:00' : null, observacao: 'Convite pelo painel' });
  const jaExiste = () => (est.dados?.convidados || []).find((c) => c.celular === celConvite());
  const liberarConvite = async (keep) => {
    const j = jaExiste();
    if (j && j.ativo) return { ok: true, existente: true };
    const dados = dadosConvite();
    if (j) { dados.nome = j.nome; dados.plano = j.plano; dados.observacao = j.observacao; dados.expira_em = j.expira_em; }
    return chamar('admin_salvar', dados, keep ? { keepalive: true } : {});
  };
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const a = t.closest('[data-pp-inv-wa]');
    if (a) {
      const falta = faltaConvite();
      if (falta || a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); est.inv.aviso = falta || 'Preencha o nome e o celular com DDD.'; redesenhar(); return; }
      const ja = jaExiste();
      est.inv.aviso = ja && ja.ativo ? `Este número já tinha acesso (plano ${rotPlano(ja.plano)}). Para mudar o plano, use a aba Acessos.` : 'Acesso liberado. Volte para cá depois de mandar a mensagem.'; // o link do WhatsApp abre sozinho
      liberarConvite(true).then((r) => { if (!r.ok) { est.inv.aviso = r.mensagem || 'Não consegui liberar o acesso agora. Use “Só liberar o acesso”.'; } carregar(); });
      return;
    }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && est.sub === 'convidar' && document.getElementById('pp-inv-wa')) carregar(); });
  document.addEventListener('click', async (e) => {
    const t = e.target;
    let x;
    if ((x = t.closest('[data-pp-sub]'))) { est.sub = x.dataset.ppSub; est.msg = ''; redesenhar(); window.scrollTo({ top: 0 }); return; }
    if ((x = t.closest('[data-pp-usoplano]'))) { est.usoPlano = x.dataset.ppUsoplano; redesenhar(); return; }
    if ((x = t.closest('[data-pp-usovis]'))) { est.usoVis = x.dataset.ppUsovis; redesenhar(); return; }
    if ((x = t.closest('[data-pp-todos]'))) {
      if (x.dataset.ppTodos === 'abrir') (est.dados?.convidados || []).filter((c) => c.papel !== 'admin').forEach((c) => est.abertos.add(c.id)); else est.abertos.clear();
      redesenhar(); return;
    }
    if ((x = t.closest('[data-pp-push]'))) {
      const acao = x.dataset.ppPush;
      if (acao === 'ligar') await ligarPush(); else if (acao === 'desligar') await desligarPush(); else if (acao === 'teste') await testarPush();
      redesenhar(); return;
    }
    if ((x = t.closest('[data-pp-inv-plano]'))) { est.inv.plano = x.dataset.ppInvPlano; est.inv.aviso = ''; redesenhar(); return; }
    if (t.closest('[data-pp-inv-share]')) {
      const texto = textoConvite();
      try {
        if (navigator.share) { await navigator.share({ text: texto }); est.inv.aviso = 'Mensagem compartilhada. Se o número ainda não está liberado, use “Só liberar o acesso”.'; }
        else { await navigator.clipboard.writeText(texto); est.inv.aviso = 'Mensagem copiada. Cole no WhatsApp e depois libere o número aqui.'; }
      } catch (er) { if (er?.name !== 'AbortError') est.inv.aviso = 'Não consegui abrir o compartilhamento. Copie a mensagem acima.'; }
      redesenhar(); return;
    }
    if (t.closest('[data-pp-inv-liberar]')) {
      const falta = faltaConvite();
      if (falta) { est.inv.aviso = falta; redesenhar(); return; }
      est.inv.aviso = 'Liberando…'; redesenhar();
      const r = await liberarConvite(false);
      est.inv.aviso = r.ok ? (r.existente ? `Este número já estava liberado (plano ${rotPlano(jaExiste()?.plano)}). Para mudar o plano, use a aba Acessos.` : 'Acesso liberado. A pessoa já pode pedir o código.') : (r.mensagem || 'Não foi possível liberar agora.');
      if (r.ok) { const l = await chamar('admin_listar'); if (l.ok) est.dados = l; }
      redesenhar(); return;
    }
    if ((x = t.closest('[data-pp-zerar]'))) {
      const a = x.dataset.ppZerar;
      if (a === 'pedir') { est.zerar = true; est.zMsg = ''; redesenhar(); return; }
      if (a === 'nao') { est.zerar = false; redesenhar(); return; }
      x.disabled = true; est.zMsg = 'Zerando…';
      const r = await chamar('admin_zerar_uso', { opinioes: est.zerarOp });
      est.zerar = false; est.zerarOp = false; est.abertos.clear();
      est.zMsg = r.ok ? `Pronto: uso zerado${r.opinioes ? ' e ' + r.opinioes + ' opinião(ões) apagada(s)' : ''}.` : (r.mensagem || 'Não foi possível zerar agora.');
      await carregar(); redesenhar(); return;
    }
  });
  navigator.serviceWorker?.addEventListener?.('message', (e) => { if (e.data?.tipo === 'atualizar-codigos') atualizarCodigos(); });
  document.addEventListener('click', async (e) => {
    const t = e.target;
    let x;
    if (t.closest('[data-pp-recarregar]')) { est.erro = ''; carregar(); return; }
    if ((x = t.closest('[data-pp-cod]'))) { x.disabled = true; x.textContent = 'Atualizando…'; await atualizarCodigos(); x.disabled = false; x.textContent = '↻ Atualizar'; return; }
    if ((x = t.closest('[data-pp-ouvir]'))) {
      const id = x.dataset.ppOuvir, caixa = x.parentElement;
      x.disabled = true; x.textContent = 'Abrindo…';
      const r = await chamar('admin_audio', { id: Number(id) });
      if (!r.ok || !r.url) { x.disabled = false; x.textContent = '▶ Tentar de novo'; caixa.insertAdjacentHTML('beforeend', `<div class="mini">${esc(r.mensagem || 'Não foi possível abrir o áudio.')}</div>`); return; }
      const a = document.createElement('audio');
      a.controls = true; a.autoplay = true; a.preload = 'auto'; a.src = r.url; a.style.cssText = 'width:100%;max-width:340px';
      caixa.replaceChildren(a);
      return;
    }
    if ((x = t.closest('[data-pp-editar]'))) {
      est.editando = (est.dados?.convidados || []).find((c) => c.id === x.dataset.ppEditar) || null; est.msg = ''; est.sub = 'convidar';
      redesenhar(); document.getElementById('pp-det-novo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    if ((x = t.closest('[data-pp-plano-trocar]'))) {
      const c = (est.dados?.convidados || []).find((y) => y.id === x.dataset.ppPlanoTrocar);
      if (!c || (c.plano === 'empresa' ? 'empresa' : 'produtor') === x.dataset.plano) return;
      est.trocandoPlano = { id: c.id, plano: x.dataset.plano }; est.cortando = null; est.pMsg = ''; redesenhar(); return;
    }
    if (t.closest('[data-pp-plano-nao]')) { est.trocandoPlano = null; redesenhar(); return; }
    if ((x = t.closest('[data-pp-plano-sim]'))) { const tp = est.trocandoPlano; if (!tp) return; x.disabled = true; await mudarPessoa(tp.id, { plano: tp.plano }, 'agora no plano ' + rotPlano(tp.plano) + '. Vale na próxima vez que abrir o app.'); return; }
    if ((x = t.closest('[data-pp-cortar]'))) { est.cortando = x.dataset.ppCortar; est.trocandoPlano = null; est.pMsg = ''; redesenhar(); return; }
    if (t.closest('[data-pp-cortar-nao]')) { est.cortando = null; redesenhar(); return; }
    if ((x = t.closest('[data-pp-cortar-sim]'))) { x.disabled = true; await mudarPessoa(x.dataset.ppCortarSim, { ativo: false }, 'acesso cortado.'); return; }
    if ((x = t.closest('[data-pp-reativar]'))) {
      const c = (est.dados?.convidados || []).find((y) => y.id === x.dataset.ppReativar);
      const vencido = c?.expira_em && new Date(c.expira_em) < new Date();
      x.disabled = true; await mudarPessoa(x.dataset.ppReativar, vencido ? { ativo: true, expira_em: null } : { ativo: true }, vencido ? 'acesso reativado (o prazo vencido foi retirado).' : 'acesso reativado.'); return;
    }
    if ((x = t.closest('[data-pp-prazo-limpar]'))) { x.disabled = true; await mudarPessoa(x.dataset.ppPrazoLimpar, { expira_em: null }, 'sem prazo.'); return; }
    if ((x = t.closest('[data-pp-prazo]'))) {
      const dia = document.getElementById('pp-prazo-' + x.dataset.ppPrazo)?.value;
      if (!dia) { est.pMsg = 'Escolha a data primeiro.'; redesenhar(); return; }
      x.disabled = true; await mudarPessoa(x.dataset.ppPrazo, { expira_em: dia + 'T23:59:59-03:00' }, 'acesso até ' + dia.split('-').reverse().join('/') + '.'); return;
    }
    if (t.closest('[data-pp-cancelar]')) { est.editando = null; est.novo = false; est.msg = ''; redesenhar(); return; }
    if ((x = t.closest('[data-pp-piloto]'))) {
      const a = x.dataset.ppPiloto;
      if (a === 'pedir') { est.confirma = true; redesenhar(); return; }
      if (a === 'nao') { est.confirma = false; redesenhar(); return; }
      x.disabled = true;
      const r = await chamar('admin_piloto', { ligado: a === 'on' });
      est.confirma = false;
      if (r.ok) { const l = await chamar('admin_listar'); if (l.ok) est.dados = l; } else est.erro = r.mensagem || 'Não foi possível mudar agora.';
      redesenhar();
    }
  });
  document.addEventListener('submit', async (e) => {
    const id = e.target.id;
    if (!id.startsWith('pp-')) return;
    e.preventDefault();
    const v = (k) => (document.getElementById(k)?.value || '').trim();
    if (id === 'pp-form') {
      const ed = est.editando;
      if (!v('pp-plano')) { est.msg = 'Escolha o plano: Produtor ou Empresa.'; redesenhar(); return; }
      const corpo = {
        nome: v('pp-nome'), celular: v('pp-cel2'), plano: v('pp-plano'), papel: ed?.papel || 'usuario',
        ativo: ed ? !!document.getElementById('pp-ativo')?.checked : true,
        expira_em: v('pp-ate') ? v('pp-ate') + 'T23:59:59-03:00' : null, observacao: v('pp-obs')
      };
      est.msg = 'Salvando…'; redesenhar();
      const r = await chamar('admin_salvar', corpo);
      if (r.ok) {
        est.editando = null; est.novo = false; est.msg = 'Salvo.';
        const [l, u] = await Promise.all([chamar('admin_listar'), chamar('admin_uso')]);
        if (l.ok) est.dados = l; if (u.ok) est.uso = u;
      } else est.msg = r.mensagem || 'Não foi possível salvar.';
      redesenhar();
      return;
    }
    if (id === 'pp-form-zap') {
      est.ver = true;
      const corpo = { provedor: v('pz-prov'), zapi_instancia: v('pz-zi'), zapi_token: v('pz-zt'), zapi_client_token: v('pz-zc'), meta_phone_id: v('pz-mp'), meta_token: v('pz-mt'), meta_template: v('pz-mm') };
      const r = await chamar('admin_whatsapp', corpo);
      if (r.ok) { const l = await chamar('admin_listar'); if (l.ok) est.dados = l; est.msg = 'Envio salvo.'; } else est.msg = r.mensagem || 'Não foi possível salvar o envio.';
      redesenhar();
    }
  });
}
