// Balcão de ofertas: anúncios dos produtores (aprovados pelo Helder) + ofertas da Amendoim Brasil.
// O contato de quem anuncia nunca aparece: o interessado sempre fala com o Helder.
import { ativar, prefsSalvas } from '/alertas.js';

const estado = { lado: 'Todas', produto: 'Todos', enviado: false, ultimo: null };
const NOME_PRODUTO = { Casca: 'amendoim em casca', Debulhado: 'amendoim debulhado', Blancheado: 'amendoim blancheado', Semente: 'semente de amendoim' };
const milhar = (s) => String(s ?? '').replace(/(^|[^\d.,])(\d{4,})/g, (_, a, n) => a + n.replace(/\B(?=(\d{3})+$)/g, '.')); // 50000 → 50.000 (quantidade e preço)
const PRODUTOS = ['Casca', 'Debulhado', 'Blancheado', 'Semente'];
const chaveSalva = () => { try { return localStorage.getItem('ab-chave-numeros') || ''; } catch (e) { return ''; } };
const dataCurta = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }); };
let ctx = { D: {}, h: {}, render: () => {}, evento: () => {} };

export async function carregarAnuncios() {
  try {
    const r = await fetch('/api/balcao', { cache: 'no-store' });
    ctx.D.anuncios = r.ok ? (await r.json()).anuncios || [] : [];
  } catch (e) { ctx.D.anuncios = []; }
}

// Lista única: anúncios aprovados primeiro, depois as ofertas fixas da Amendoim Brasil.
export function listaOfertas(D) {
  const anuncios = (D.anuncios || []).map((a) => ({ ...a, origem: 'produtor' }));
  const proprias = (D.ofertas || []).map((o) => ({ ...o, origem: 'amendoim' }));
  return [...anuncios, ...proprias];
}

function cartaoOferta(o, h) {
  const { esc, ic, I, wa } = h;
  const ref = o.id ? ` (anúncio ${o.id.slice(-5).toUpperCase()})` : '';
  const link = wa(`Olá Helder, tenho interesse na oferta do balcão${ref}: ${o.lado} de ${o.produto}, ${milhar(o.volume)}, ${o.regiao}.`);
  return `<article class="cartao">
    <div class="cartao-cab"><span class="lado ${o.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${o.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span>
      <span class="oferta-origem">${o.origem === 'amendoim' ? `${ic(I.escudo, 'style="width:14px;height:14px;stroke:#007731;stroke-width:2.4"')}Amendoim Brasil` : `Anúncio verificado · ${esc(dataCurta(o.data))}`}</span></div>
    <div><b style="font-size:17px;display:block">${esc(o.produto)}</b>${o.detalhe ? `<span style="font-size:13px;color:var(--texto-3)">${esc(o.detalhe)}</span>` : ''}</div>
    <div class="oferta-grade"><div><span>Volume</span><b class="num">${esc(milhar(o.volume))}</b></div><div><span>Preço</span><b class="num">${esc(milhar(o.preco))}</b></div><div><span>Entrega</span><b>${esc(o.entrega)}</b></div></div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--texto-2)">${ic(I.pino, 'style="width:16px;height:16px;stroke:#5F5B52"')}${esc(o.regiao)}</div>
    ${link ? `<a class="btn btn-verde" href="${link}" target="_blank" rel="noopener" data-ev="interesse">${ic(I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Tenho interesse</a>` : ''}
  </article>`;
}

export function telaNegociar(D, h) {
  const { ic, I } = h;
  const lados = [['Todas', 'Todas'], ['Venda', 'Vendendo'], ['Compra', 'Comprando']];
  const todas = listaOfertas(D);
  const lista = todas.filter((o) => (estado.lado === 'Todas' || o.lado === estado.lado) && (estado.produto === 'Todos' || o.categoria === estado.produto));
  return `<header class="topo">
    <div class="topo-linha"><div><h1>Negociar</h1><div class="sub">Balcão de compra e venda de amendoim</div></div>
      <a class="btn btn-amendoim btn-pequeno" href="#/negociar/anunciar" data-ev="anunciar-abrir">${ic(I.mais, 'style="width:18px;height:18px;stroke-width:2.6"')}Anunciar</a></div>
    <div class="segmento">${lados.map(([k, t]) => `<button data-lado-b="${k}" aria-pressed="${estado.lado === k}">${t}</button>`).join('')}</div>
    <div class="chips">${['Todos', ...PRODUTOS].map((p) => `<button class="chip" data-produto-b="${p}" aria-pressed="${estado.produto === p}">${p}</button>`).join('')}</div>
  </header>
  <div class="selo"><img src="/icons/icon-512.png" alt=""><span>Cada anúncio é conferido antes de entrar. A negociação é intermediada pela <b>Amendoim Brasil</b> e o contato de quem anunciou não aparece.</span></div>
  ${D.anuncios === undefined ? '<div class="vazio">Carregando anúncios…</div>' : ''}
  ${lista.length ? lista.map((o) => cartaoOferta(o, h)).join('') : '<div class="vazio">Nenhuma oferta com esse filtro agora.</div>'}
  <a class="chamada" href="#/negociar/anunciar"><span class="cresce"><b style="font-size:15px;display:block">Tem amendoim para vender ou quer comprar?</b><span style="font-size:13px;color:#5C3A06">Anuncie grátis. O Helder confere e publica.</span></span>${ic(I.seta, 'style="stroke:#5C3A06"')}</a>`;
}

export function telaAnunciar(D, h) {
  const { ic, I, wa, esc } = h;
  const voltar = `<a class="link-mini" href="#/negociar" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Balcão</a>`;
  if (estado.enviado) {
    // Último passo: o anunciante manda o anúncio para o Helder no WhatsApp (contato humano na hora, com fotos).
    const u = estado.ultimo || {};
    const cod = u.id ? u.id.slice(-5).toUpperCase() : '';
    const txt = [
      `Olá Helder, acabei de anunciar no balcão do app Amendoim Brasil${cod ? ` (anúncio ${cod})` : ''}:`,
      `${u.lado === 'Compra' ? 'COMPRA' : 'VENDA'} de ${NOME_PRODUTO[u.categoria] || u.categoria || 'amendoim'}`,
      `Quantidade: ${milhar(u.volume) || '-'}`,
      `Preço: ${milhar(u.preco) || 'a combinar'}`,
      `Cidade: ${u.regiao || '-'}`,
      `Entrega: ${u.entrega || 'a combinar'}`,
      u.detalhe ? `Detalhes: ${u.detalhe}` : null,
      `Nome: ${u.nome || ''}`,
      '',
      'Posso mandar fotos do produto por aqui.'
    ].filter((l) => l !== null).join('\n');
    const zap = wa(txt);
    return `<header class="topo">${voltar}<div><h1>Falta um passo</h1></div></header>
    <section class="cartao" style="gap:12px;text-align:center;align-items:center;padding:24px 18px">
      <span class="sigla" style="width:56px;height:56px;border-radius:50%;background:var(--verde-claro)">${ic('<path d="M5 12l5 5 9-10"/>', 'style="width:28px;height:28px;stroke:#007731;stroke-width:2.6"')}</span>
      <b style="font-size:18px">Anúncio registrado${cod ? ` · ${esc(cod)}` : ''}</b>
      <span style="font-size:14px;line-height:1.5;color:var(--texto-2)">Agora envie para o Helder no WhatsApp. Ele confere, pede fotos se precisar e publica no balcão.</span>
      ${zap ? `<a class="btn btn-verde" style="align-self:stretch" href="${zap}" target="_blank" rel="noopener" data-ev="anuncio-zap">${ic(I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Enviar para o Helder no WhatsApp</a>` : ''}
      <a class="link-mini" href="#/negociar" data-novo-anuncio>Voltar ao balcão</a>
    </section>`;
  }
  const opc = (nome, lista, marcado) => lista.map((v) => `<label class="opcao"><input type="radio" name="${nome}" value="${v}" ${v === marcado ? 'checked' : ''} required><span>${v === 'Venda' ? 'Quero vender' : v === 'Compra' ? 'Quero comprar' : v}</span></label>`).join('');
  return `<header class="topo">${voltar}<div><h1>Anunciar no balcão</h1><div class="sub">Grátis · publicado depois da conferência</div></div></header>
  <form id="form-anuncio" class="cartao form-anuncio" style="gap:14px">
    <div class="opcoes">${opc('lado', ['Venda', 'Compra'], 'Venda')}</div>
    <div class="campo"><span class="rotulo-campo">Produto</span><div class="opcoes">${opc('categoria', PRODUTOS, 'Casca')}</div></div>
    <div class="campos-2">
      <div class="campo"><label for="an-volume">Quantidade</label><input id="an-volume" name="volume" required maxlength="40" placeholder="Ex.: 2.000 sacas"></div>
      <div class="campo"><label for="an-preco">Preço pretendido <em>opcional</em></label><input id="an-preco" name="preco" maxlength="30" placeholder="Ex.: R$ 80,00/sc"></div>
    </div>
    <div class="campos-2">
      <div class="campo"><label for="an-regiao">Cidade / UF</label><input id="an-regiao" name="regiao" required maxlength="60" placeholder="Ex.: Tupã/SP"></div>
      <div class="campo"><label for="an-entrega">Entrega <em>opcional</em></label><input id="an-entrega" name="entrega" maxlength="30" placeholder="Ex.: Imediata"></div>
    </div>
    <div class="campo"><label for="an-detalhe">Detalhes <em>opcional</em></label><textarea id="an-detalhe" name="detalhe" maxlength="200" rows="3" placeholder="Cultivar, tipo, peneira, umidade, armazenagem…"></textarea></div>
    <div class="campo-sep"><b>Seu contato</b><span class="mini">Fica só com o Helder. Não aparece no anúncio.</span></div>
    <div class="campos-2">
      <div class="campo"><label for="an-nome">Nome</label><input id="an-nome" name="nome" required maxlength="60" autocomplete="name"></div>
      <div class="campo"><label for="an-zap">WhatsApp</label><input id="an-zap" name="whatsapp" required type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000"></div>
    </div>
    <input name="site" tabindex="-1" autocomplete="off" class="escondido" aria-hidden="true">
    <label class="marcar"><input type="checkbox" name="aceite" required><span>Autorizo a Amendoim Brasil a guardar meu nome e WhatsApp para intermediar este negócio.<small>Você pode pedir a remoção a qualquer momento pelo WhatsApp do Helder.</small></span></label>
    <button class="btn btn-verde" type="submit">Enviar anúncio</button>
    <div id="anuncio-msg" role="status" class="mini" style="text-align:center"></div>
  </form>`;
}

// ---------- Área do Helder: aprovar anúncios ----------
export function telaBalcaoAdmin(D, h) {
  const { esc, ic, I } = h;
  return `<header class="topo">
    <a class="link-mini" href="#/negociar" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Balcão</a>
    <div><h1>Aprovar anúncios</h1><div class="sub">Só para o Helder</div></div>
  </header>
  <form id="form-balcao-admin" class="cartao" style="gap:10px">
    <label class="rotulo" for="chave-balcao">Chave de acesso</label>
    <div style="display:flex;gap:8px"><input id="chave-balcao" type="password" autocomplete="off" value="${esc(chaveSalva())}" style="flex:1"><button class="btn btn-verde btn-pequeno" type="submit">Ver</button></div>
  </form>
  <div id="balcao-admin-saida"></div>`;
}

function desenharAdmin(lista, h) {
  const { esc } = h;
  const pend = lista.filter((a) => a.status === 'pendente'), apr = lista.filter((a) => a.status === 'aprovado');
  const linha = (a) => {
    const x = a.publico, c = a.contato || {};
    const dig = String(c.whatsapp || ''), zap = `https://wa.me/${dig.length >= 12 && dig.startsWith('55') ? dig : '55' + dig}?text=${encodeURIComponent(`Olá ${c.nome || ''}, aqui é o Helder da Amendoim Brasil. Recebi o seu anúncio no balcão (${x.lado} de ${x.produto}, ${x.volume}). Podemos confirmar os detalhes?`)}`;
    return `<article class="cartao" style="gap:8px">
      <div class="cartao-cab"><span class="lado ${x.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${x.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span><span class="mini">${esc(dataCurta(a.criado))} · ${esc(a.id.slice(-5).toUpperCase())}</span></div>
      <b style="font-size:16px">${esc(x.produto)} · ${esc(milhar(x.volume))}</b>
      <span class="mini">${esc(x.regiao)} · ${esc(milhar(x.preco))} · entrega ${esc(x.entrega)}${x.detalhe ? '<br>' + esc(x.detalhe) : ''}</span>
      <a class="link-mini" href="${zap}" target="_blank" rel="noopener">${esc(c.nome)} · WhatsApp ${esc(c.whatsapp)}</a>
      <div class="duas-acoes">
        ${a.status === 'pendente' ? `<button class="btn btn-verde btn-pequeno" data-adm="aprovar" data-id="${esc(a.id)}">Aprovar</button><button class="btn btn-pequeno btn-contorno" data-adm="recusar" data-id="${esc(a.id)}">Recusar</button>` : `<button class="btn btn-pequeno btn-contorno" data-adm="remover" data-id="${esc(a.id)}">Tirar do ar</button>`}
      </div>
    </article>`;
  };
  return `<div class="duas-acoes" style="margin-bottom:4px"><button class="btn btn-escuro btn-pequeno" id="admin-avisos">Avisar novos anúncios neste celular</button><span class="mini" id="admin-avisos-msg" style="align-self:center"></span></div>
  <div class="secao-titulo"><h2>Aguardando aprovação (${pend.length})</h2></div>
  ${pend.length ? pend.map(linha).join('') : '<div class="vazio">Nenhum anúncio esperando.</div>'}
  <div class="secao-titulo"><h2>No ar (${apr.length})</h2></div>
  ${apr.length ? apr.map(linha).join('') : '<div class="vazio">Nenhum anúncio no ar.</div>'}`;
}

async function admin(corpo) {
  const r = await fetch('/api/balcao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...corpo, k: document.getElementById('chave-balcao')?.value.trim() || chaveSalva() }) });
  if (r.status === 401) throw new Error('chave');
  if (!r.ok) throw new Error('http');
  return r.json();
}
async function abrirAdmin() {
  const saida = document.getElementById('balcao-admin-saida');
  if (!saida) return;
  saida.innerHTML = '<div class="vazio">Carregando…</div>';
  try {
    const r = await admin({ acao: 'admin' });
    try { localStorage.setItem('ab-chave-numeros', document.getElementById('chave-balcao').value.trim()); } catch (e) { /* ignora */ }
    saida.innerHTML = desenharAdmin(r.anuncios || [], ctx.h);
  } catch (e) { saida.innerHTML = `<div class="vazio">${e.message === 'chave' ? 'Chave incorreta.' : 'Não foi possível carregar agora.'}</div>`; }
}

// ---------- Anuncie no app (patrocínio) ----------
export function telaAnuncie(D, h) {
  const { ic, I, wa } = h;
  const zap = wa('Olá Helder, quero anunciar a minha empresa no app Amendoim Brasil. Pode me mandar as opções?');
  const formatos = [
    ['Oferecimento da previsão do tempo', 'Sua marca na previsão de chuva da aba Clima, a tela que o produtor abre todo dia no plantio e na colheita.'],
    ['Oferecimento do Mercado hoje', 'Sua marca no resumo diário de preço, dólar, exportação e demanda, na tela inicial.'],
    ['Oferecimento do boletim', 'Sua marca no boletim do mês, dentro do app e no PDF que circula nos grupos de WhatsApp.'],
    ['Logo no rodapé', 'Presença fixa na tela inicial, com link para o seu site ou WhatsApp.']
  ];
  return `<header class="topo">
    <a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Anuncie no app</h1><div class="sub">Fale com quem produz e negocia amendoim</div></div>
  </header>
  <section class="destaque" style="gap:10px">
    <b style="font-size:19px;line-height:1.3">Sua marca no app que o produtor de amendoim abre todo dia</b>
    <span style="font-size:14px;line-height:1.5;opacity:.92">Preço da casca, clima da lavoura e mercado em um só lugar, com o Helder Lamberti, consultor e trader do setor. Público: produtores, arrendatários, beneficiadoras, cerealistas e indústrias do Oeste Paulista, Alta Paulista, Alta Mogiana e Mato Grosso do Sul.</span>
  </section>
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 4px"><span class="rotulo">Formatos</span><span class="mini">poucas marcas por tela</span></div>
    ${formatos.map(([t, d]) => `<div class="formato"><b>${t}</b><span>${d}</span></div>`).join('')}
  </section>
  <section class="cartao" style="gap:8px">
    <span class="rotulo">Por que anunciar aqui</span>
    ${['Público 100% do amendoim, sem dispersão', 'Marca ao lado da informação que decide a venda', 'Exclusividade por categoria (um banco, uma revenda de insumos, uma máquina…)', 'Relatório mensal de acessos ao seu espaço'].map((t) => `<div style="display:flex;align-items:center;gap:10px;font-size:14px">${ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#007731;stroke-width:2.6;flex-shrink:0"')}${t}</div>`).join('')}
  </section>
  ${zap ? `<a class="btn btn-verde" href="${zap}" target="_blank" rel="noopener" data-ev="anunciar">${ic(I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Quero anunciar</a>` : ''}`;
}

export function ligarBalcao(D, h, render, evento) {
  ctx = { D, h, render, evento };
  // Área do Helder: 5 toques seguidos no logo da tela inicial abrem o painel privado (que pede a chave).
  let toques = 0, ultimo = 0;
  document.addEventListener('pointerup', (e) => {
    if (!e.target.closest('.topo-inicio img')) return;
    const agora = Date.now();
    toques = agora - ultimo < 1500 ? toques + 1 : 1;
    ultimo = agora;
    if (toques >= 5) { toques = 0; location.href = '/painel'; }
  });
  document.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-lado-b],[data-produto-b]');
    if (f) { if (f.dataset.ladoB) estado.lado = f.dataset.ladoB; if (f.dataset.produtoB) estado.produto = f.dataset.produtoB; render(false); return; }
    if (e.target.closest('[data-novo-anuncio]')) { estado.enviado = false; return; }
    const b = e.target.closest('[data-adm]');
    if (b) {
      if (b.dataset.adm !== 'aprovar' && !confirmar(b)) return;
      b.disabled = true;
      try { await admin({ acao: b.dataset.adm, id: b.dataset.id }); await carregarAnuncios(); abrirAdmin(); }
      catch (er) { b.disabled = false; b.textContent = 'Tente de novo'; }
      return;
    }
    if (e.target.closest('#admin-avisos')) {
      const m = document.getElementById('admin-avisos-msg');
      try {
        await ativar(prefsSalvas() || { mudanca: true, chuva: false, boletim: false, balcao: false }, { k: document.getElementById('chave-balcao').value.trim() });
        if (m) m.textContent = 'Pronto: este celular avisa a cada anúncio novo.';
      } catch (er) { if (m) m.textContent = 'Não deu para ativar aqui. Use o Chrome no Android ou o app instalado no iPhone.'; }
    }
  });
  // Quantidade e preço ganham o ponto de milhar quando a pessoa sai do campo (50000 → 50.000).
  document.addEventListener('focusout', (e) => {
    if (e.target.matches?.('#an-volume, #an-preco')) e.target.value = milhar(e.target.value);
  });
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'form-balcao-admin') { e.preventDefault(); abrirAdmin(); return; }
    if (e.target.id !== 'form-anuncio') return;
    e.preventDefault();
    const f = e.target, msg = document.getElementById('anuncio-msg'), botao = f.querySelector('[type=submit]');
    const dados = Object.fromEntries(new FormData(f).entries());
    dados.aceite = f.aceite.checked;
    if (String(dados.whatsapp || '').replace(/\D/g, '').length < 10) { msg.textContent = 'Confira o WhatsApp com DDD.'; return; }
    botao.disabled = true; msg.textContent = 'Enviando…';
    try {
      const r = await fetch('/api/balcao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acao: 'novo', ...dados }) });
      if (r.status === 429) throw new Error('limite');
      if (!r.ok) throw new Error('http');
      const resp = await r.json().catch(() => ({}));
      evento('anuncio-enviado');
      estado.ultimo = { ...dados, id: resp.id || '' };
      estado.enviado = true;
      render();
    } catch (er) {
      botao.disabled = false;
      msg.textContent = er.message === 'limite' ? 'Muitos anúncios hoje. Fale direto com o Helder pelo WhatsApp.' : 'Não foi possível enviar agora. Verifique a internet e tente de novo.';
    }
  });
}

// Confirmação em dois toques (sem caixa de diálogo do navegador).
function confirmar(b) {
  if (b.dataset.certeza) return true;
  b.dataset.certeza = '1';
  b.textContent = 'Toque de novo para confirmar';
  setTimeout(() => { if (b.isConnected) { delete b.dataset.certeza; b.textContent = b.dataset.adm === 'recusar' ? 'Recusar' : 'Tirar do ar'; } }, 4000);
  return false;
}
