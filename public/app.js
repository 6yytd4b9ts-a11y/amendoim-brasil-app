// App Amendoim Brasil — sem dependências. Conteúdo vem de /data/*.json.
import { MUNICIPIOS, carregarClima, telaClima as telaClimaAuto, municipioAtual, definirMunicipio, localInicial, localDoAparelho, nomeLocal } from '/clima.js';
import { telaFerramentas, ligarFerramentas } from '/ferramentas.js';

const ARQUIVOS = ['config', 'cotacoes', 'boletins', 'noticias', 'ofertas', 'patrocinadores', 'panorama', 'clima'];
const D = {};
const estado = { periodo: '6M', filtroBoletim: 'Todos', lado: 'Todas', produto: 'Todos' };

// ---------- utilidades ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => (n == null || !isFinite(n)) ? 'R$ —' : 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numBr = (n, d = 0) => (n == null || !isFinite(n)) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (n) => (n == null) ? '—' : (n > 0 ? '+' : '') + numBr(n, 1) + '%';
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const idYoutube = (u) => { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : ''; };
const linkSeguro = (u) => /^https?:\/\//i.test(u || '') ? u : '';
const wa = (texto) => {
  const n = (D.config.whatsappHelder || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : '';
};
const ic = (path, extra = '') => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${path}</svg>`;
const I = {
  pino: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  sino: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  chuva: '<path d="M17.5 14H7a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 7.5a3.25 3.25 0 0 1-.5 6.5z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  zap: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
  seta: '<path d="m9 6 6 6-6 6"/>',
  sobe: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  cai: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  escudo: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
  fora: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>'
};
const corSigla = { BR: 'pilula-verde', AR: 'pilula-azul', US: 'pilula-amendoim', IN: 'pilula-amendoim', CN: 'pilula-amendoim' };

// Termômetro do preço da casca: para onde o preço tende a ir nas próximas semanas.
function posTermometro(status) {
  const s = (status || '').toLowerCase();
  return s.startsWith('fra') ? 0 : s.startsWith('fir') ? 2 : 1;
}
function medidor(status) {
  const i = posTermometro(status);
  return `<div class="medidor" role="img" aria-label="Termômetro: ${esc(status)}"><i style="left:${[16.6, 50, 83.4][i]}%"></i></div>
  <div class="medidor-nomes">${['Fraco', 'Estável', 'Firme'].map((t, k) => `<span class="${k === i ? 'atual' : ''}">${t}</span>`).join('')}</div>`;
}
function contaFatores(t) {
  const f = t.fatores || [];
  return { alta: f.filter((x) => x.efeito === 'alta').length, baixa: f.filter((x) => x.efeito === 'baixa').length };
}
function cartaoTermometro() {
  const t = D.config.termometro;
  return `<section class="cartao">
    <div class="cartao-cab"><span class="rotulo">${esc(t.titulo || 'Termômetro do mercado')}</span>${t.atualizado ? `<span class="mini">${esc(t.atualizado)}</span>` : ''}</div>
    ${t.subtitulo ? `<span style="font-size:13px;color:var(--texto-3);margin-top:-6px">${esc(t.subtitulo)}</span>` : ''}
    ${medidor(t.status)}
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(t.resumo)}</p>
    ${(t.fatores || []).length ? `<div class="fatores">${t.fatores.map((f) => `<div class="fator ${f.efeito === 'baixa' ? 'baixa' : 'alta'}">
      ${ic(f.efeito === 'baixa' ? I.cai : I.sobe, 'style="width:16px;height:16px;stroke-width:2.6"')}
      <span class="cresce">${esc(f.nome)}</span><b>${esc(f.valor)}</b></div>`).join('')}</div>
      <span class="mini">${ic(I.sobe, 'style="width:12px;height:12px;stroke:#007731;stroke-width:2.6;vertical-align:-1px"')} segura o preço · ${ic(I.cai, 'style="width:12px;height:12px;stroke:#B3261E;stroke-width:2.6;vertical-align:-1px"')} pressiona o preço</span>` : ''}
    <span class="mini" style="font-weight:600">Helder Lamberti · Amendoim Brasil</span>
  </section>`;
}

function varChip(v) {
  if (v == null) return `<span class="var num">—</span>`;
  return `<span class="var num ${v > 0 ? 'sobe' : v < 0 ? 'cai' : ''}">${pct(v)}</span>`;
}

// ---------- telas ----------
function telaInicio() {
  const c = D.cotacoes, cfg = D.config, b = D.boletins[0];
  const dest = c.destaque || {};
  const auto = D.climaAuto;
  const chuva7 = auto?.total7;
  const temChuva = chuva7 != null;
  const fases = cfg.fases || [];
  const iFase = Math.max(0, fases.indexOf(cfg.faseSafra));

  return `
  <header class="topo-inicio">
    <button class="btn-icone" aria-label="Município da lavoura" onclick="location.hash='#/clima'">${ic(I.pino)}</button>
    <img src="/img/logo.png" alt="Amendoim Brasil">
    <button class="btn-icone" aria-label="Alertas no WhatsApp" onclick="document.getElementById('alertas').scrollIntoView({behavior:'smooth',block:'center'})">${ic(I.sino)}</button>
  </header>

  <section class="destaque">
    <div class="cartao-cab"><span class="rotulo">${esc(c.produto)} · esta semana</span><span class="pilula pilula-verde-escuro">${esc(dest.regiao || cfg.regiaoPadrao)}</span></div>
    <div style="display:flex;align-items:baseline;gap:8px" class="num"><span class="preco">${brl(dest.preco)}</span><span class="unid">/ saca 25 kg</span></div>
    <div style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600">
      ${dest.variacao != null ? ic(dest.variacao >= 0 ? I.sobe : I.cai, 'style="width:16px;height:16px;stroke:#F4AD46;stroke-width:2.4"') : ''}
      <span>${dest.variacao != null ? pct(dest.variacao) + ' vs semana anterior' : dest.fonte ? `Fonte: ${esc(dest.fonte)} · ${esc(dest.data)}` : 'Cotação da semana em breve'}</span>
    </div>
    ${(() => { const r = (c.referencias || []).find((x) => x.fonte === 'Conab'); return r ? `<span style="font-size:13px;opacity:.9">Conab, média de SP: <b class="num">${brl(r.preco)}</b>${r.variacao != null ? ` (${pct(r.variacao)} na semana)` : ''}</span>` : ''; })()}
    <a class="btn-branco" href="#/mercado">Ver todas as cotações</a>
  </section>

  <div class="grade-2">
    <a class="cartao" href="#/mercado" style="gap:10px;padding:14px">
      <span class="rotulo">Preço da casca</span>
      <span class="grande">${esc(cfg.termometro.status)}</span>
      ${medidor(cfg.termometro.status)}
      <span class="mini">${(() => { const f = contaFatores(cfg.termometro); return f.alta || f.baixa ? `${f.alta} ${f.alta === 1 ? 'fator' : 'fatores'} de alta · ${f.baixa} de baixa` : 'Tendência das próximas semanas'; })()}</span>
    </a>
    <a class="cartao" href="#/clima" style="gap:10px;padding:14px">
      <span class="rotulo">Chuva · 7 dias</span>${ic(I.chuva, 'style="width:32px;height:32px;stroke:#2F6FA3"')}
      <span class="grande num">${temChuva ? numBr(chuva7) + ' mm' : '— mm'}</span><span class="mini">${auto ? 'Previsão ' + esc(nomeLocal(auto.municipio)) : 'Carregando previsão…'}</span>
    </a>
  </div>

  ${b ? `
  <a class="boletim" href="${hrefBoletim(b)}" ${!b.secoes && linkSeguro(b.link) ? 'target="_blank" rel="noopener"' : ''}>
    <div class="cartao-cab"><span class="tag">${ic(I.doc, 'style="width:18px;height:18px"')}${esc(cfg.boletim.rotulo)}</span><span class="mini" style="color:#5C3A06">${esc(b.data)}</span></div>
    <h2>${esc(b.titulo)}</h2>
    ${b.resumo ? `<p>${esc(b.resumo)}</p>` : ''}
    <div class="cartao-cab" style="margin-top:4px"><span class="mini" style="color:#5C3A06;font-weight:600">Helder Lamberti</span><span class="btn btn-escuro btn-pequeno" style="min-height:40px">Ler boletim</span></div>
  </a>` : ''}

  ${blocoNoticias()}

  <a class="cartao" href="#/clima">
    <div class="cartao-cab"><span class="rotulo">Momento da safra · ${esc(cfg.safraAtual)}</span><span class="pilula pilula-verde">${esc(cfg.faseSafra)}</span></div>
    <div class="fases">${fases.map((_, i) => `<span class="${i <= iFase ? 'feito' : ''}"></span>`).join('')}</div>
    <div class="fases-nomes">${fases.map((f, i) => `<span class="${i === iFase ? 'atual' : ''}">${esc(f)}</span>`).join('')}</div>
  </a>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Panorama global</span><a class="link-mini" href="#/mercado/analises">Ver análises</a></div>
    <div>${D.panorama.map((p) => `
      <a class="lista-linha" href="#/mercado/analises"><span class="sigla pilula ${corSigla[p.sigla] || 'pilula-verde'}">${esc(p.sigla)}</span><span class="cresce"><b style="font-size:14px;display:block">${esc(p.pais)}</b><span class="mini">${esc(p.fase)}</span></span><b class="num" style="font-size:13px;color:var(--texto-2);text-align:right">${esc(p.indicador || '')}</b></a>`).join('')}
    </div>
  </section>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Oportunidades no balcão <span class="selo-breve">Em breve</span></span><a class="link-mini" href="#/negociar">Ver prévia</a></div>
    <div>${D.ofertas.slice(0, 2).map((o) => `
      <a class="lista-linha" href="#/negociar">
        <span class="lado ${o.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${o.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span>
        <span class="cresce"><b style="font-size:14px;display:block">${esc(o.categoria)} · ${esc(o.volume)}</b><span class="mini">${esc(o.regiao)}</span></span>
        <b class="num" style="font-size:14px">${esc(o.preco)}</b>
      </a>`).join('')}
    </div>
  </section>

  ${cartaoAlertas()}

  ${cartaoRedes()}

  <section class="parceiros">
    <span class="rotulo">${D.patrocinadores.length === 1 ? 'Oferecimento' : 'Parceiros Amendoim Brasil'}</span>
    <div class="parceiros-grade" style="grid-template-columns:repeat(${Math.min(Math.max(D.patrocinadores.length, 1), 4)},1fr)">${D.patrocinadores.slice(0, 4).map((p) => {
      const href = linkSeguro(p.link);
      const dentro = p.logo ? `<img src="${esc(p.logo)}" alt="${esc(p.nome)}">` : esc(p.nome);
      return href ? `<a class="parceiro" href="${esc(href)}" target="_blank" rel="noopener sponsored">${dentro}</a>` : `<span class="parceiro">${dentro}</span>`;
    }).join('')}</div>
  </section>`;
}

function blocoNoticias() {
  if (!D.noticias.length) return '';
  const lista = [...D.noticias].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
  return `
  <div class="secao-titulo"><h2>Notícias e vídeos</h2></div>
  <div class="carrossel">${lista.map((n) => {
    const href = linkSeguro(n.link);
    const yt = idYoutube(n.link);
    const video = n.tipo === 'video' || !!yt;
    const capaUrl = linkSeguro(n.capa) || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');
    const capa = capaUrl
      ? `<img src="${esc(capaUrl)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('sem-imagem');this.replaceWith(Object.assign(document.createElement('b'),{textContent:${video ? "''" : esc(JSON.stringify(n.fonte || 'Amendoim Brasil'))}}))">`
      : `${ic(I.doc, 'style="width:26px;height:26px;stroke:#fff"')}<b>${esc(n.fonte || 'Notícia')}</b>`;
    const tag = href ? 'a' : 'div';
    return `<${tag} class="noticia ${n.destaque ? 'noticia-destaque' : ''}" ${href ? `href="${esc(href)}" target="_blank" rel="noopener"` : ''}>
      <div class="noticia-capa ${video ? 'video' : ''} ${capaUrl ? '' : 'sem-imagem'}">${capa}
        ${video ? `<span class="play"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="#1B1B17"/></svg></span>` : ''}
        ${n.destaque ? '<span class="patrocinado" style="background:var(--amendoim);color:#3A2404">Destaque</span>' : n.patrocinado ? '<span class="patrocinado">Patrocinado</span>' : ''}
      </div>
      <div class="noticia-corpo"><span class="noticia-fonte">${esc(n.fonte)}${n.data ? ' · ' + esc(n.data) : ''}</span><span class="noticia-titulo">${esc(n.titulo)}</span></div>
    </${tag}>`;
  }).join('')}</div>`;
}

function cartaoAlertas() {
  const grupo = linkSeguro(D.config.grupoWhatsapp);
  const link = grupo || wa('Quero receber os alertas da Amendoim Brasil no WhatsApp.');
  return `
  <section id="alertas" class="cartao" style="background:var(--verde-fundo);border-color:#C2E2CC;flex-direction:row;align-items:center">
    ${ic(grupo ? I.grupo : I.zap, 'style="width:32px;height:32px;stroke:#007731;flex-shrink:0"')}
    <div class="cresce"><b style="font-size:15px;display:block">${grupo ? 'Grupo no WhatsApp' : 'Alertas no WhatsApp'}</b><span style="font-size:13px;color:#3E4A40">Chuva, veranico, cotação e boletins</span></div>
    ${link ? `<a class="btn btn-verde btn-pequeno" href="${esc(link)}" target="_blank" rel="noopener">${grupo ? 'Entrar' : 'Ativar'}</a>` : `<span class="btn btn-verde btn-pequeno" style="opacity:.6" title="Configure o WhatsApp em config.json">Ativar</span>`}
  </section>`;
}

function cartaoRedes() {
  const insta = linkSeguro(D.config.instagram);
  const zap = wa('Olá Helder, vim pelo app Amendoim Brasil.');
  if (!insta && !zap) return '';
  return `<section class="redes">
    ${insta ? `<a href="${esc(insta)}" target="_blank" rel="noopener">${ic(I.insta)}<span><b>Instagram</b><small>@amendoim.brasil</small></span></a>` : ''}
    ${zap ? `<a href="${zap}" target="_blank" rel="noopener">${ic(I.zap)}<span><b>Fale com o Helder</b><small>WhatsApp</small></span></a>` : ''}
  </section>`;
}

function segmentoMercado(atual) {
  const it = [['cotacoes', 'Cotações'], ['analises', 'Análises'], ['consultoria', 'Consultoria']];
  return `<div class="segmento">${it.map(([k, t]) => `<a href="#/mercado/${k}" ${k === atual ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</div>`;
}

function topoMercado(atual, extra = '') {
  return `<header class="topo">
    <div class="topo-marca"><img src="/icons/icon-512.png" alt=""><h1>Mercado</h1></div>
    ${segmentoMercado(atual)}${extra}
  </header>`;
}

function telaCotacoes() {
  const c = D.cotacoes, cfg = D.config, h = c.historico || {};
  const chips = `<div class="chips"><button class="chip" aria-pressed="true">Casca</button>${(cfg.produtosEmBreve || []).map((p) => `<button class="chip" disabled>${esc(p)} <span class="breve">EM BREVE</span></button>`).join('')}</div>`;
  const temProprias = (c.regioes || []).some((r) => r.preco != null);
  return `${topoMercado('cotacoes', chips)}
  ${c.referencias?.length ? `
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 4px"><span class="rotulo">Preço da casca · fontes oficiais</span><span class="mini">${esc(c.unidade)}</span></div>
    ${c.referencias.map((r) => {
      const href = linkSeguro(r.link);
      return `<${href ? 'a' : 'div'} class="lista-linha ref" ${href ? `href="${esc(href)}" target="_blank" rel="noopener"` : ''}>
        <span class="cresce"><b style="font-size:15px;display:block">${esc(r.praca)}</b><span class="mini">${esc(r.fonte)} · ${esc(r.data)}${r.detalhe ? '<br>' + esc(r.detalhe) : ''}</span></span>
        <span style="text-align:right"><b class="num" style="font-size:17px;display:block">${brl(r.preco)}</b>${r.variacao != null ? varChip(r.variacao) : ''}</span>
        ${href ? ic(I.fora, 'style="width:16px;height:16px;stroke:var(--verde);flex-shrink:0" aria-label="Ver na fonte"') : ''}
      </${href ? 'a' : 'div'}>`;
    }).join('')}
    <p class="mini" style="margin:0;padding:10px 0 12px">Toque na linha para conferir na fonte. Conab: preço em R$/kg convertido para saca de 25 kg.</p>
  </section>` : ''}

  ${temProprias ? `
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 8px"><span class="rotulo">Cotação Amendoim Brasil · ${esc(c.unidade)}</span><span class="mini">${c.semana ? 'Semana ' + esc(c.semana) : ''}</span></div>
    ${c.regioes.map((r) => `<div class="lista-linha"><span class="cresce" style="font-size:15px;font-weight:600">${esc(r.nome)}</span><b class="num" style="font-size:17px">${brl(r.preco)}</b>${varChip(r.variacao)}</div>`).join('')}
  </section>` : ''}

  <a class="chamada" href="#/negociar">
    <span class="cresce"><b style="font-size:15px;display:block">Tem amendoim pra vender?</b><span style="font-size:13px;color:#5C3A06">Veja como vai funcionar o balcão</span></span>
    ${ic(I.seta, 'style="stroke:#5C3A06"')}
  </a>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Histórico de preço · R$/saca</span>${h.exemplo ? '<span class="aviso-exemplo">Dados de exemplo</span>' : ''}</div>
    <div class="chips" role="group" aria-label="Período">
      ${['3M', '6M', '1A'].map((p) => `<button class="chip" data-periodo="${p}" aria-pressed="${estado.periodo === p}">${p}</button>`).join('')}
      <a class="chip" href="#/mercado/consultoria" style="text-decoration:none;border-style:dashed">${ic(I.cadeado, 'style="width:13px;height:13px"')}5 anos</a>
    </div>
    <div class="grafico" id="grafico">${graficoPreco()}</div>
    ${h.fonte ? `<span class="mini">Fonte: ${linkSeguro(h.link) ? `<a class="link-mini" href="${esc(h.link)}" target="_blank" rel="noopener">${esc(h.fonte)}</a>` : esc(h.fonte)}</span>` : ''}
  </section>

  ${cartaoTermometro()}

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Exportação</span><span class="pilula pilula-amendoim">${esc(cfg.exportacao.status)}</span></div>
    <a href="#/mercado/consultoria" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:var(--fundo);text-decoration:none;color:var(--texto)">
      ${ic(I.cadeado, 'style="width:20px;height:20px"')}
      <span class="cresce"><b style="font-size:14px;display:block">Paridade em R$/saca de casca</b><span class="mini">Exclusivo para assinantes</span></span>
      <span class="link-mini">Assinar</span>
    </a>
  </section>`;
}

function graficoPreco() {
  const todos = D.cotacoes.historico.pontos || [];
  if (todos.length < 2) return '<div class="vazio">Histórico ainda sem dados.</div>';
  // Pontos semanais (AAAA-MM-DD) ou mensais (AAAA-MM): filtra pelo período escolhido.
  const meses = { '3M': 3, '6M': 6, '1A': 12 }[estado.periodo] || 6;
  const ult = new Date((todos[todos.length - 1].data + '-01').slice(0, 10) + 'T12:00:00Z');
  ult.setUTCMonth(ult.getUTCMonth() - meses);
  const corte = ult.toISOString().slice(0, 10);
  let pts = todos.filter((p) => (p.data.length === 7 ? p.data + '-01' : p.data) >= corte);
  if (pts.length < 2) pts = todos.slice(-2);
  const W = 320, H = 150, padL = 34, padB = 22, padT = 8;
  const vals = pts.map((p) => p.preco);
  let min = Math.min(...vals), max = Math.max(...vals);
  const folga = Math.max(2, (max - min) * 0.15); min = Math.floor(min - folga); max = Math.ceil(max + folga);
  const x = (i) => padL + (i * (W - padL - 6)) / (pts.length - 1);
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.preco).toFixed(1)}`).join(' ');
  const area = `${linha} L${x(pts.length - 1).toFixed(1)} ${H - padB} L${padL} ${H - padB} Z`;
  const ticks = [min, (min + max) / 2, max];
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const rot = (d) => { const [a, m] = d.split('-'); return nomes[+m - 1] + (m === '01' ? '/' + a.slice(2) : ''); };
  const dica = (d) => { const [a, m, dd] = d.split('-'); return dd ? `${dd}/${m}/${a.slice(2)}` : `${nomes[+m - 1]}/${a.slice(2)}`; };
  // Rótulos no início de cada mês, no máximo 6.
  const viradas = pts.map((p, i) => i).filter((i) => i === 0 || pts[i].data.slice(0, 7) !== pts[i - 1].data.slice(0, 7));
  const passo = Math.ceil(viradas.length / 6);
  const rotulos = viradas.filter((_, k) => k % passo === 0);
  const raio = pts.length > 20 ? 2.5 : 3.5;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Histórico de preço do amendoim em casca">
    ${ticks.map((t) => `<line x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="#EFEBE2"/><text class="eixo" x="${padL - 6}" y="${y(t) + 3}" text-anchor="end">${numBr(t)}</text>`).join('')}
    <path d="${area}" fill="#DCEFE2" opacity=".8"/>
    <path d="${linha}" fill="none" stroke="#007731" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${rotulos.map((i) => `<text class="eixo" x="${Math.max(padL + 8, x(i))}" y="${H - 6}" text-anchor="middle">${rot(pts[i].data)}</text>`).join('')}
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.preco)}" r="${i === pts.length - 1 ? 5 : raio}" fill="${i === pts.length - 1 ? '#F4AD46' : '#007731'}" stroke="#fff" stroke-width="${pts.length > 20 ? 1 : 2}" data-i="${i}" style="cursor:pointer"/>`).join('')}
    ${pts.map((p, i) => `<rect x="${x(i) - Math.max(3, 140 / pts.length)}" y="0" width="${Math.max(6, 280 / pts.length)}" height="${H}" fill="transparent" data-ponto="${i}" data-x="${x(i)}" data-y="${y(p.preco)}" data-txt="${dica(p.data)}: ${brl(p.preco)}"/>`).join('')}
  </svg>`;
}

function hrefBoletim(b) {
  if (b.exclusivo) return '#/mercado/consultoria';
  if (b.secoes?.length) return '#/boletim/' + encodeURIComponent(b.id);
  return linkSeguro(b.link) || '#/mercado/analises';
}

const textoTendencia = { queda: ['Oferta em queda', 'pilula-amendoim'], alta: ['Oferta em alta', 'pilula-azul'], estavel: ['Oferta estável', 'pilula-verde'] };

function telaAnalises() {
  const tipos = ['Todos', ...new Set(D.boletins.map((b) => b.tipo))];
  const lista = estado.filtroBoletim === 'Todos' ? D.boletins : D.boletins.filter((b) => b.tipo === estado.filtroBoletim);
  const ult = D.boletins[0];
  return `${topoMercado('analises')}
  ${ult ? `<a class="boletim" href="${hrefBoletim(ult)}">
    <div class="cartao-cab"><span class="tag">${ic(I.doc, 'style="width:18px;height:18px"')}${esc(ult.tipo)}</span><span class="mini" style="color:#5C3A06">${esc(ult.data)}</span></div>
    <h2>${esc(ult.titulo)}</h2>
    ${ult.resumo ? `<p>${esc(ult.resumo)}</p>` : ''}
    <div class="cartao-cab" style="margin-top:4px"><span class="mini" style="color:#5C3A06;font-weight:600">Helder Lamberti</span><span class="btn btn-escuro btn-pequeno" style="min-height:40px">Ler boletim</span></div>
  </a>` : ''}

  <div class="secao-titulo"><h2>Panorama global</h2><span class="mini">${ult ? 'Atualizado em ' + esc(ult.data) : ''}</span></div>
  <div class="paises">${D.panorama.map((p) => {
    const [tt, tc] = textoTendencia[p.tendencia] || ['', ''];
    return `<article class="cartao pais">
      <div class="cartao-cab"><span style="display:flex;align-items:center;gap:10px"><span class="sigla pilula ${corSigla[p.sigla] || 'pilula-verde'}">${esc(p.sigla)}</span><b style="font-size:16px">${esc(p.pais)}</b></span><span class="pilula">${esc(p.fase)}</span></div>
      ${p.indicador ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b class="num" style="font-size:18px">${esc(p.indicador)}</b>${tt ? `<span class="pilula ${tc}" style="font-size:11px">${tt}</span>` : ''}</div>` : ''}
      <p style="margin:0;font-size:14px;line-height:1.45;color:var(--texto-2)">${esc(p.resumo)}</p>
    </article>`;
  }).join('')}</div>

  ${cartaoTermometro()}

  <section class="destaque" style="gap:12px">
    <b style="font-size:20px;line-height:1.25;letter-spacing:-0.01em">Decida a venda com informação de quem está no mercado</b>
    ${['Relatórios e boletins completos', 'Histórico de preços completo', 'Paridade de exportação em R$/saca', 'Alertas personalizados no WhatsApp'].map((t) => `<div style="display:flex;align-items:center;gap:10px;font-size:14px">${ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#F4AD46;stroke-width:2.6"')}${t}</div>`).join('')}
    <a class="btn btn-amendoim" href="#/mercado/consultoria">Quero assinar</a>
  </section>

  <div class="secao-titulo"><h2>Boletins e relatórios</h2></div>
  <div class="chips">${tipos.map((t) => `<button class="chip" data-boletim="${esc(t)}" aria-pressed="${estado.filtroBoletim === t}">${esc(t)}</button>`).join('')}</div>
  ${lista.map((r) => {
    const href = hrefBoletim(r);
    const fora = !r.exclusivo && !r.secoes?.length && linkSeguro(r.link);
    return `<a class="cartao" style="flex-direction:row;align-items:center;padding:14px" href="${href}" ${fora ? 'target="_blank" rel="noopener"' : ''}>
      <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:var(--amendoim-claro)">${ic(I.doc, 'style="stroke:#7A4A08"')}</span>
      <span class="cresce"><span style="font-size:12px;font-weight:700;color:var(--marrom);display:block">${esc(r.tipo)}</span><b style="font-size:15px;display:block">${esc(r.titulo)}</b><span class="mini">${esc(r.data)}</span></span>
      ${r.exclusivo ? ic(I.cadeado, 'style="width:18px;height:18px;stroke:#5F5B52" aria-label="Exclusivo"') : ic(I.seta, 'style="width:18px;height:18px"')}
    </a>`;
  }).join('')}`;
}

function telaBoletim(id) {
  const b = D.boletins.find((x) => x.id === decodeURIComponent(id || '')) || D.boletins[0];
  if (!b || b.exclusivo || !b.secoes?.length) return telaAnalises();
  const siglas = Object.fromEntries(D.panorama.map((p) => [p.pais, p.sigla]));
  const zap = wa(`Olá Helder, li o ${b.tipo.toLowerCase()} "${b.titulo}" e quero conversar sobre a comercialização.`);
  const paras = (t) => String(t || '').split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');
  return `<header class="topo">
    <a class="link-mini" href="#/mercado/analises" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Análises</a>
  </header>
  <article class="leitura">
    <span class="tag-boletim">${ic(I.doc, 'style="width:16px;height:16px"')}${esc(b.tipo)} · ${esc(b.data)}</span>
    <h1>${esc(b.titulo)}</h1>
    <span class="mini" style="font-weight:600">Helder Lamberti · Amendoim Brasil</span>
    ${b.resumo ? `<div class="lead">${esc(b.resumo)}</div>` : ''}
    ${b.secoes.map((s) => `<section>
      <h2>${siglas[s.titulo] ? `<span class="sigla pilula ${corSigla[siglas[s.titulo]] || 'pilula-verde'}">${esc(siglas[s.titulo])}</span>` : ''}${esc(s.titulo)}</h2>
      ${paras(s.texto)}
    </section>`).join('')}
  </article>
  <section class="destaque" style="gap:12px">
    <b style="font-size:18px;line-height:1.3">Quer saber o melhor momento de vender a sua produção?</b>
    <span style="font-size:14px;line-height:1.5;opacity:.9">A consultoria Amendoim Brasil acompanha o mercado com você, semana a semana.</span>
    ${zap ? `<a class="btn btn-amendoim" href="${zap}" target="_blank" rel="noopener">Falar com o Helder</a>` : `<a class="btn btn-amendoim" href="#/mercado/consultoria">Conhecer a consultoria</a>`}
  </section>
  <a class="chamada" href="#/ferramentas/custo"><span class="cresce"><b style="font-size:15px;display:block">Faça a conta do seu custo por saca</b><span style="font-size:13px;color:#5C3A06">Calculadora com tabela de lucro</span></span>${ic(I.seta, 'style="stroke:#5C3A06"')}</a>`;
}

function telaConsultoria() {
  const zap = wa('Olá Helder, quero acessar a área da consultoria Amendoim Brasil.');
  const meses = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const alt = [52, 48, 40, 34, 38, 46, 58, 66, 72, 76, 70, 60];
  return `${topoMercado('consultoria')}
  <section class="cartao" style="padding:20px;gap:14px;border-radius:20px">
    <span class="sigla" style="width:52px;height:52px;border-radius:16px;background:var(--verde-claro)">${ic(I.cadeado, 'style="width:26px;height:26px;stroke:#007731"')}</span>
    <div><b style="font-size:20px;display:block">Área do cliente</b><span style="font-size:14px;line-height:1.5;color:var(--texto-2)">Exclusivo para produtores da consultoria Amendoim Brasil: recomendação de comercialização, sazonalidade de preço e relatórios completos.</span></div>
    <form id="form-login" class="campo" style="gap:10px">
      <label for="tel">Seu celular (WhatsApp)</label>
      <input id="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" required>
      <button class="btn btn-verde" type="submit">Receber código no WhatsApp</button>
    </form>
    <div id="msg-login" role="status" class="mini"></div>
    ${zap ? `<a class="link-mini" style="text-align:center" href="${zap}" target="_blank" rel="noopener">Ainda não é cliente? Fale com o Helder</a>` : ''}
  </section>
  <section class="cartao" style="opacity:.85">
    <div class="cartao-cab"><span class="rotulo">Sazonalidade do preço da casca</span><span class="pilula pilula-amendoim" style="font-size:11px">EXCLUSIVO</span></div>
    <div class="sazonal" style="filter:blur(3px)" aria-hidden="true">${meses.map((m, i) => `<div><span style="height:${alt[i]}px"></span><small>${m}</small></div>`).join('')}</div>
    <span class="mini">Disponível para clientes da consultoria</span>
  </section>`;
}

// ---------- negociar ----------
function telaNegociar() {
  const lados = [['Todas', 'Todas'], ['Venda', 'Vendendo'], ['Compra', 'Comprando']];
  const prods = ['Todos', 'Casca', 'Debulhado', 'Blancheado', 'Semente'];
  const lista = D.ofertas.filter((o) => (estado.lado === 'Todas' || o.lado === estado.lado) && (estado.produto === 'Todos' || o.categoria === estado.produto));
  const anunciar = wa('Olá Helder, quero anunciar uma oferta no balcão Amendoim Brasil.');
  return `<header class="topo">
    <div class="topo-linha"><div><h1>Negociar</h1><div class="sub">Balcão de ofertas de amendoim</div></div>
      ${anunciar ? `<a class="btn btn-amendoim btn-pequeno" href="${anunciar}" target="_blank" rel="noopener">${ic(I.mais, 'style="width:18px;height:18px;stroke-width:2.6"')}Anunciar</a>` : `<span class="btn btn-amendoim btn-pequeno">${ic(I.mais, 'style="width:18px;height:18px;stroke-width:2.6"')}Anunciar</span>`}</div>
    <div class="segmento">${lados.map(([k, t]) => `<button data-lado="${k}" aria-pressed="${estado.lado === k}">${t}</button>`).join('')}</div>
    <div class="chips">${prods.map((p) => `<button class="chip" data-produto="${p}" aria-pressed="${estado.produto === p}">${p}</button>`).join('')}</div>
  </header>
  <div class="em-breve"><span class="selo-breve">Em breve</span><span>O balcão ainda está em preparação. As ofertas abaixo são exemplos de como vai funcionar.</span></div>
  <div class="selo"><img src="/icons/icon-512.png" alt=""><span>Ofertas verificadas e negociação intermediada pela <b>Amendoim Brasil</b></span></div>
  ${lista.length ? lista.map((o) => {
    const link = wa(`Olá Helder, tenho interesse na oferta: ${o.lado} de ${o.produto}, ${o.volume}, ${o.regiao}.`);
    return `<article class="cartao">
      <div class="cartao-cab"><span class="lado ${o.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${o.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span><span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--verde-escuro)">${ic(I.escudo, 'style="width:14px;height:14px;stroke:#007731;stroke-width:2.4"')}Verificada</span></div>
      <div><b style="font-size:17px;display:block">${esc(o.produto)}</b><span style="font-size:13px;color:var(--texto-3)">${esc(o.detalhe)}</span></div>
      <div class="oferta-grade"><div><span>Volume</span><b class="num">${esc(o.volume)}</b></div><div><span>Preço</span><b class="num">${esc(o.preco)}</b></div><div><span>Entrega</span><b>${esc(o.entrega)}</b></div></div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--texto-2)">${ic(I.pino, 'style="width:16px;height:16px;stroke:#5F5B52"')}${esc(o.regiao)}</div>
      ${link ? `<a class="btn btn-verde" href="${link}" target="_blank" rel="noopener">${ic(I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Tenho interesse</a>` : `<span class="btn btn-verde" style="opacity:.6">${ic(I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Tenho interesse</span>`}
    </article>`;
  }).join('') : '<div class="vazio">Nenhuma oferta com esse filtro agora.</div>'}`;
}

// ---------- roteador ----------
const ROTAS = {
  inicio: () => telaInicio(),
  mercado: (sub) => sub === 'analises' ? telaAnalises() : sub === 'consultoria' ? telaConsultoria() : telaCotacoes(),
  clima: () => telaClimaAuto(D, { esc, ic, I, numBr }),
  ferramentas: (sub) => telaFerramentas(sub, { esc, ic, I, brl, numBr }),
  negociar: () => telaNegociar(),
  boletim: (id) => telaBoletim(id)
};
const ABA_DA_ROTA = { boletim: 'mercado' };

function rota() {
  const [aba = 'inicio', sub] = location.hash.replace(/^#\/?/, '').split('/');
  return { aba: ROTAS[aba] ? aba : 'inicio', sub };
}

function render(rolarTopo = true) {
  const { aba, sub } = rota();
  const tela = document.getElementById('tela');
  tela.innerHTML = ROTAS[aba](sub);
  const marcada = ABA_DA_ROTA[aba] || aba;
  document.querySelectorAll('.abas a').forEach((a) => { if (a.dataset.aba === marcada) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (rolarTopo) window.scrollTo(0, 0);
}

// Eventos delegados (filtros, gráfico, login)
ligarFerramentas({ esc, ic, I, brl, numBr, render });
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-periodo],[data-boletim],[data-lado],[data-produto]');
  if (!t) return;
  if (t.dataset.periodo) { estado.periodo = t.dataset.periodo; }
  if (t.dataset.boletim) { estado.filtroBoletim = t.dataset.boletim; }
  if (t.dataset.lado) { estado.lado = t.dataset.lado; }
  if (t.dataset.produto) { estado.produto = t.dataset.produto; }
  render(false);
});

document.addEventListener('pointerover', (e) => mostraDica(e));
document.addEventListener('pointerdown', (e) => mostraDica(e));
function mostraDica(e) {
  const r = e.target.closest('[data-ponto]');
  const g = document.getElementById('grafico');
  if (!g) return;
  g.querySelector('.grafico-dica')?.remove();
  if (!r) return;
  const svg = g.querySelector('svg'), esc2 = svg.getBoundingClientRect().width / 320;
  const d = document.createElement('div');
  d.className = 'grafico-dica';
  d.textContent = r.dataset.txt;
  d.style.left = (+r.dataset.x * esc2) + 'px';
  d.style.top = (+r.dataset.y * esc2) + 'px';
  g.appendChild(d);
}

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-login') return;
  e.preventDefault();
  document.getElementById('msg-login').textContent = 'O login por código no WhatsApp será ativado quando o banco de dados (Supabase) estiver conectado.';
});

window.addEventListener('hashchange', () => render());

async function iniciar() {
  const res = await Promise.all(ARQUIVOS.map((a) => fetch(`/data/${a}.json`, { cache: 'no-cache' }).then((r) => r.json())));
  ARQUIVOS.forEach((a, i) => { D[a] = res[i]; });
  render();
  // Mostra o clima na hora (local salvo ou Presidente Prudente) e troca para a localização da pessoa quando ela permitir.
  atualizarClima(municipioAtual());
  localInicial().then((m) => { if (m) atualizarClima(m); });
}

let pedidoClima = 0;
async function atualizarClima(local) {
  const meu = ++pedidoClima;
  let r;
  try { r = await carregarClima(local); } catch (e) { r = { erro: 'Não foi possível carregar o clima agora.', dias: [], alertas: [], municipio: local || municipioAtual(), inicioSafra: '0000-09-01' }; }
  if (meu !== pedidoClima) return; // chegou uma escolha mais nova
  D.climaAuto = r;
  const aba = rota().aba;
  if (aba === 'clima' || aba === 'inicio') render(false);
}

document.addEventListener('change', (e) => {
  if (e.target.id !== 'sel-municipio') return;
  const m = MUNICIPIOS.find((x) => x.nome === e.target.value);
  if (!m) return;
  definirMunicipio(m); D.climaAuto = null; render(false); atualizarClima(m);
});

document.addEventListener('click', async (e) => {
  if (!e.target.closest('#usar-gps')) return;
  const s = document.querySelector('.topo .sub');
  if (s) s.textContent = 'Buscando sua localização…';
  const m = await localDoAparelho(15000);
  if (!m) { if (s) s.textContent = 'Não foi possível usar sua localização. Escolha o município na lista.'; return; }
  definirMunicipio(m); D.climaAuto = null; render(false); atualizarClima(m);
});

iniciar().catch((err) => {
  document.getElementById('tela').innerHTML = `<div class="vazio">Não foi possível carregar os dados. Verifique a conexão.<br><small>${esc(err.message)}</small></div>`;
});

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
