// App Amendoim Brasil — sem dependências. Conteúdo vem de /data/*.json.
import { MUNICIPIOS, carregarClima, telaClima as telaClimaAuto, municipioAtual, definirMunicipio, localInicial, localDoAparelho, nomeLocal, recomendacaoPlantio, alternarPrevisao } from '/clima.js';
import { blocoMercadoHoje, blocoOportunidades, blocoPanoramaCompacto, blocoMercadoHojeDetalhe, blocoExportacao, blocoMundo, cartaoTermometroDetalhe, seloPatrocinio, blocoPatrocinadores, telaNumeros, desenharNumeros } from '/painel.js';
import { telaAlertas, ligarAlertas, atualizarLocalAlertas, alertasAtivos } from '/alertas.js';
import { telaNegociar, telaAnunciar, telaBalcaoAdmin, telaAnuncie, ligarBalcao, carregarAnuncios } from '/balcao.js';
import { telaFerramentas, ligarFerramentas } from '/ferramentas.js';
import { bandeira } from '/bandeiras.js';
import { evento, eventoAbertura, registrarRegiao, observarPatrocinios, slug } from '/medicao.js';
import { telaDados, ligarDados } from '/exportacao.js';

const ARQUIVOS = ['config', 'cotacoes', 'boletins', 'noticias', 'ofertas', 'patrocinadores', 'panorama', 'clima', 'mercado'];
const D = {};
const estado = { periodo: '6M', filtroBoletim: 'Todos' };

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
  enviar: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M7 8l5-5 5 5"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/>',
  grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>'
};
const H = () => {
  const h = { esc, ic, I, brl, numBr, pct, wa, linkSeguro };
  h.patrocinio = (local) => seloPatrocinio(D, local, h);
  return h;
};

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
// Variação do preço do IEA (Tupã) dia a dia, a partir de cotacoes.json → historicoIEA.
function variacaoIEA(c) {
  const h = (c.historicoIEA || []).filter((x) => x && x.data && isFinite(x.preco)).sort((a, b) => (a.data < b.data ? -1 : 1));
  if (h.length < 2) return null;
  const ult = h[h.length - 1], ant = h[h.length - 2];
  const dif = ult.preco - ant.preco;
  if (Math.abs(dif) >= 0.005) return { dif, desde: ant.data };
  let i = h.length - 1;
  while (i > 0 && Math.abs(h[i - 1].preco - ult.preco) < 0.005) i--;
  return { dif: 0, desde: h[i].data };
}
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

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
  const rec = auto && auto.dias?.length ? recomendacaoPlantio(auto, cfg.faseSafra) : null;

  return `
  <header class="topo-inicio">
    <button class="btn-icone" aria-label="Município da lavoura" onclick="location.hash='#/clima'">${ic(I.pino)}</button>
    <img src="/img/logo.png" alt="Amendoim Brasil">
    <a class="btn-icone sino" aria-label="Alertas" href="#/alertas">${ic(I.sino)}${alertasAtivos() ? '' : '<span class="ponto-sino"></span>'}</a>
  </header>

  <section class="destaque">
    <div class="cartao-cab"><span class="rotulo">${esc(c.produto)} · último preço</span><span class="pilula pilula-verde-escuro">${esc(dest.regiao || cfg.regiaoPadrao)}</span></div>
    <div style="display:flex;align-items:baseline;gap:8px" class="num"><span class="preco">${brl(dest.preco)}</span><span class="unid">/ saca 25 kg</span></div>
    ${(() => {
      const v = variacaoIEA(c);
      if (!v) return '';
      const txt = v.dif === 0 ? `Estável desde ${ddmm(v.desde)}` : `${v.dif > 0 ? '+' : '−'}${brl(Math.abs(v.dif))} vs ${ddmm(v.desde)}`;
      return `<div class="hero-var ${v.dif > 0 ? 'sobe' : v.dif < 0 ? 'cai' : ''}">${v.dif === 0 ? '<span aria-hidden="true">=</span>' : ic(v.dif > 0 ? I.sobe : I.cai, 'style="width:16px;height:16px;stroke-width:2.6"')}<span>${txt}</span></div>`;
    })()}
    <div style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600">
      <span>${dest.fonte ? `Fonte: ${esc(dest.fonte)} · ${esc(dest.data)}` : 'Cotação da semana em breve'}</span>
    </div>
    ${(() => { const r = (c.referencias || []).find((x) => x.fonte === 'Conab'); return r ? `<span style="font-size:13px;opacity:.9">Conab, média de SP: <b class="num">${brl(r.preco)}</b>${r.variacao != null ? ` (${pct(r.variacao)} na semana)` : ''}</span>` : ''; })()}
    <div class="hero-acoes">
      <a class="btn-branco" href="#/mercado">Ver todas as cotações</a>
      <button class="btn-enviar" data-compartilhar="preco" aria-label="Enviar o preço no WhatsApp">${ic(I.enviar)}<span>Enviar</span></button>
    </div>
  </section>

  ${blocoMercadoHoje(D, H())}

  <div class="grade-2">
    <a class="cartao" href="#/mercado/termometro" style="gap:10px;padding:14px">
      <span class="rotulo">Termômetro</span>
      <span class="grande">${esc(cfg.termometro.status)}</span>
      ${medidor(cfg.termometro.status)}
      <span class="mini">${(() => { const f = contaFatores(cfg.termometro); return f.alta || f.baixa ? `${f.alta} ${f.alta === 1 ? 'fator' : 'fatores'} de alta · ${f.baixa} de baixa` : 'Tendência das próximas semanas'; })()}</span>
    </a>
    <a class="cartao" href="#/clima" style="gap:10px;padding:14px">
      <span class="rotulo">Chuva · 7 dias</span>${ic(I.chuva, 'style="width:32px;height:32px;stroke:#2F6FA3"')}
      <span class="grande num">${temChuva ? numBr(chuva7) + ' mm' : '— mm'}</span>
      <span class="mini">${rec ? `<b style="color:var(--verde-escuro)">${esc(rec.titulo)}</b>` : auto ? 'Previsão ' + esc(nomeLocal(auto.municipio)) : 'Carregando previsão…'}</span>
    </a>
  </div>

  ${b ? `
  <a class="boletim" href="${hrefBoletim(b)}" ${!b.secoes && linkSeguro(b.link) ? 'target="_blank" rel="noopener"' : ''}>
    <div class="cartao-cab"><span class="tag">${ic(I.doc, 'style="width:18px;height:18px"')}${esc(cfg.boletim.rotulo)}</span><span class="mini" style="color:#5C3A06">${esc(b.data)}</span></div>
    <h2>${esc(b.titulo)}</h2>
    ${b.resumo ? `<p>${esc(b.resumo)}</p>` : ''}
    <div class="cartao-cab" style="margin-top:4px"><span class="mini" style="color:#5C3A06;font-weight:600">Helder Lamberti</span><span class="btn btn-escuro btn-pequeno" style="min-height:40px">Ler boletim</span></div>
  </a>
  ${H().patrocinio('boletim')}` : ''}

  ${blocoNoticias()}

  ${blocoOportunidades(D, H())}

  ${blocoPanoramaCompacto(D, H())}

  ${cartaoAlertas()}

  ${cartaoRedes()}

  ${blocoPatrocinadores(D, H())}`;
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
  const link = grupo || wa('Quero receber os avisos da Amendoim Brasil no WhatsApp.');
  return `
  <section class="cartao" style="background:var(--verde-fundo);border-color:#C2E2CC;flex-direction:row;align-items:center">
    ${ic(grupo ? I.grupo : I.zap, 'style="width:32px;height:32px;stroke:#007731;flex-shrink:0"')}
    <div class="cresce"><b style="font-size:15px;display:block">Grupo no WhatsApp</b><span style="font-size:13px;color:#3E4A40">Radar de preços, chuva e boletins</span></div>
    ${link ? `<a class="btn btn-verde btn-pequeno" href="${esc(link)}" target="_blank" rel="noopener" data-ev="grupo">Entrar</a>` : ''}
  </section>
  ${alertasAtivos() ? '' : `<a id="alertas" class="cartao" href="#/alertas" style="flex-direction:row;align-items:center;text-decoration:none;color:inherit">
    ${ic(I.sino, 'style="width:30px;height:30px;stroke:#007731;flex-shrink:0"')}
    <div class="cresce"><b style="font-size:15px;display:block">Alertas no celular</b><span style="font-size:13px;color:var(--texto-3)">Preço-alvo, mudança do IEA e chuva forte</span></div>
    <span class="btn btn-escuro btn-pequeno">Ativar</span>
  </a>`}`;
}

function cartaoRedes() {
  const insta = linkSeguro(D.config.instagram);
  const zap = wa('Olá Helder, vim pelo app Amendoim Brasil.');
  if (!insta && !zap) return '';
  return `<section class="redes">
    ${insta ? `<a href="${esc(insta)}" target="_blank" rel="noopener" data-ev="instagram">${ic(I.insta)}<span><b>Instagram</b><small>@amendoim.brasil</small></span></a>` : ''}
    ${zap ? `<a href="${zap}" target="_blank" rel="noopener" data-ev="falar">${ic(I.zap)}<span><b>Fale com o Helder</b><small>WhatsApp</small></span></a>` : ''}
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
  const ult = D.boletins[0];
  return `${topoMercado('cotacoes', chips)}
  ${c.referencias?.length ? `
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 4px"><span class="rotulo">Cotações oficiais · casca</span><span class="mini">${esc(c.unidade)}</span></div>
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

  ${blocoMercadoHojeDetalhe(D, H())}

  ${temProprias ? `
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 8px"><span class="rotulo">Cotação Amendoim Brasil · ${esc(c.unidade)}</span><span class="mini">${c.semana ? 'Semana ' + esc(c.semana) : ''}</span></div>
    ${c.regioes.filter((r) => r.preco != null).map((r) => `<div class="lista-linha"><span class="cresce"><b style="font-size:15px;display:block">${esc(r.nome)}</b><span class="mini">Levantamento Amendoim Brasil${r.data ? ' · ' + esc(r.data) : ''}</span></span><b class="num" style="font-size:17px">${brl(r.preco)}</b>${varChip(r.variacao)}</div>`).join('')}
  </section>` : ''}

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Histórico de preço · R$/saca</span>${h.exemplo ? '<span class="aviso-exemplo">Dados de exemplo</span>' : ''}</div>
    <div class="chips" role="group" aria-label="Período">
      ${['3M', '6M'].map((p) => `<button class="chip" data-periodo="${p}" aria-pressed="${estado.periodo === p}">${p}</button>`).join('')}
      ${['1 ano', '5 anos'].map((p) => `<a class="chip" href="${wa(`Olá Helder, quero assinar a consultoria para ver o histórico de preço de ${p}.`) || '#/mercado/consultoria'}" target="_blank" rel="noopener" data-ev="assinar" style="text-decoration:none;border-style:dashed">${ic(I.cadeado, 'style="width:13px;height:13px"')}${p}</a>`).join('')}
    </div>
    <div class="grafico" id="grafico">${graficoPreco()}</div>
    ${h.fonte ? `<span class="mini">Fonte: ${linkSeguro(h.link) ? `<a class="link-mini" href="${esc(h.link)}" target="_blank" rel="noopener">${esc(h.fonte)}</a>` : esc(h.fonte)}</span>` : ''}
  </section>

  ${cartaoTermometroDetalhe(D, H(), medidor)}

  ${blocoExportacao(D, H())}

  ${blocoMundo(D, H())}

  ${ult ? `<section class="boletim">
    <div class="cartao-cab"><span class="tag">${ic(I.doc, 'style="width:18px;height:18px"')}Análise · ${esc(ult.tipo)}</span><span class="mini" style="color:#5C3A06">${esc(ult.data)}</span></div>
    <h2>${esc(ult.titulo)}</h2>
    <div class="cartao-cab" style="margin-top:4px"><a class="link-mini" href="#/mercado/analises" style="color:#5C3A06">Ver todas as análises</a><a class="btn btn-escuro btn-pequeno" style="min-height:40px" href="${hrefBoletim(ult)}">Ler</a></div>
  </section>` : ''}

  <a class="chamada" href="#/mercado/consultoria" data-ev="consultoria"><span class="cresce"><b style="font-size:15px;display:block">Consultoria Amendoim Brasil</b><span style="font-size:13px;color:#5C3A06">Recomendação de venda, histórico completo e paridade de exportação</span></span>${ic(I.seta, 'style="stroke:#5C3A06"')}</a>`;
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
      <div class="cartao-cab"><span style="display:flex;align-items:center;gap:10px">${bandeira(p.sigla, 34)}<b style="font-size:16px">${esc(p.pais)}</b></span><span class="pilula">${esc(p.fase)}</span></div>
      ${p.indicador ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b class="num" style="font-size:18px">${esc(p.indicador)}</b>${tt ? `<span class="pilula ${tc}" style="font-size:11px">${tt}</span>` : ''}</div>` : ''}
      <p style="margin:0;font-size:14px;line-height:1.45;color:var(--texto-2)">${esc(p.resumo)}</p>
    </article>`;
  }).join('')}</div>

  <section class="destaque" style="gap:12px">
    <b style="font-size:20px;line-height:1.25;letter-spacing:-0.01em">Decida a venda com informação de quem está no mercado</b>
    ${['Relatórios e boletins completos', 'Histórico de preços completo', 'Paridade de exportação em R$/saca', 'Recomendação de venda semana a semana'].map((t) => `<div style="display:flex;align-items:center;gap:10px;font-size:14px">${ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#F4AD46;stroke-width:2.6"')}${t}</div>`).join('')}
    <a class="btn btn-amendoim" href="#/mercado/consultoria" data-ev="consultoria">Quero assinar</a>
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
    <div class="pdf-acoes">
      <button class="btn btn-verde btn-pequeno" data-pdf="${esc(b.id)}" data-modo="enviar">${ic(I.enviar)}Enviar PDF</button>
      <button class="btn btn-escuro btn-pequeno" data-pdf="${esc(b.id)}" data-modo="baixar">${ic(I.pdf)}Baixar PDF</button>
    </div>
    ${H().patrocinio('boletim')}
    ${b.resumo ? `<div class="lead">${esc(b.resumo)}</div>` : ''}
    ${b.secoes.map((s) => `<section>
      <h2>${siglas[s.titulo] ? bandeira(siglas[s.titulo], 30) : ''}${esc(s.titulo)}</h2>
      ${paras(s.texto)}
    </section>`).join('')}
  </article>
  <section class="destaque" style="gap:12px">
    <b style="font-size:18px;line-height:1.3">Quer saber o melhor momento de vender a sua produção?</b>
    <span style="font-size:14px;line-height:1.5;opacity:.9">A consultoria Amendoim Brasil acompanha o mercado com você, semana a semana.</span>
    ${zap ? `<a class="btn btn-amendoim" href="${zap}" target="_blank" rel="noopener">Falar com o Helder</a>` : `<a class="btn btn-amendoim" href="#/mercado/consultoria" data-ev="consultoria">Conhecer a consultoria</a>`}
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
      <button class="btn btn-verde" type="submit">Pedir acesso no WhatsApp</button>
    </form>
    <div id="msg-login" role="status" class="mini"></div>
    <a class="btn btn-escuro" href="#/mercado/dados" data-ev="dados-abrir">${ic(I.cadeado, 'style="width:18px;height:18px;stroke:#fff"')}Dados de exportação (clientes)</a>
    ${zap ? `<a class="link-mini" style="text-align:center" href="${zap}" target="_blank" rel="noopener">Ainda não é cliente? Fale com o Helder</a>` : ''}
  </section>
  <section class="cartao" style="opacity:.85">
    <div class="cartao-cab"><span class="rotulo">Sazonalidade do preço da casca</span><span class="pilula pilula-amendoim" style="font-size:11px">EXCLUSIVO</span></div>
    <div class="sazonal" style="filter:blur(3px)" aria-hidden="true">${meses.map((m, i) => `<div><span style="height:${alt[i]}px"></span><small>${m}</small></div>`).join('')}</div>
    <span class="mini">Disponível para clientes da consultoria</span>
  </section>`;
}

// ---------- roteador ----------
const ROTAS = {
  inicio: () => telaInicio(),
  mercado: (sub) => sub === 'analises' ? telaAnalises() : sub === 'consultoria' ? telaConsultoria() : sub === 'dados' ? telaDados(D, H()) : telaCotacoes(),
  alertas: () => telaAlertas(D, H()),
  anuncie: () => telaAnuncie(D, H()),
  'balcao-admin': () => telaBalcaoAdmin(D, H()),
  numeros: () => telaNumeros(H()),
  clima: () => telaClimaAuto(D, H()),
  ferramentas: (sub) => telaFerramentas(sub, H()),
  negociar: (sub) => sub === 'anunciar' ? telaAnunciar(D, H()) : telaNegociar(D, H()),
  boletim: (id) => telaBoletim(id)
};
const ABA_DA_ROTA = { boletim: 'mercado', alertas: 'inicio', numeros: 'inicio', anuncie: 'inicio', 'balcao-admin': 'negociar' };

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
  if (rolarTopo) {
    window.scrollTo(0, 0);
    if (aba !== 'inicio' || location.hash) evento('aba-' + aba.replace('balcao-admin', 'admin'));
    if (aba === 'ferramentas') evento('ferr-' + slug(sub || 'custo', 20));
    if (aba === 'boletim' && sub) evento('boletim-' + slug(decodeURIComponent(sub), 30));
  }
  observarPatrocinios(tela, rolarTopo);
  // Atalhos para uma seção da aba Mercado (#/mercado/mundo, #/mercado/termometro…)
  const alvo = sub && document.getElementById('sec-' + sub);
  if (alvo && rolarTopo) { alvo.scrollIntoView({ block: 'start' }); if (alvo.tagName === 'DETAILS') alvo.open = true; }
  const bPdf = document.querySelector('[data-pdf]');
  if (bPdf) prepararPdf(bPdf.dataset.pdf).catch(() => {});
}

// ---------- compartilhar ----------
// Mensagem no formato "Radar de preços", pronta para o WhatsApp (*negrito*, _itálico_) e editável.
const URL_APP = 'https://amendoim-brasil.netlify.app';
const URL_RADAR = URL_APP + '/hoje'; // link curto novo: o WhatsApp mostra a prévia com o ícone verde do app
function dataHoje() {
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  return f.charAt(0).toUpperCase() + f.slice(1);
}
function textoCompartilhar(tipo) {
  const c = D.cotacoes, dest = c.destaque || {}, m = D.mercado || {};
  const assinatura = '_Amendoim Brasil · Helder Lamberti_';
  if (tipo === 'fato' && m.fato) {
    return [
      '*FATO DO DIA · AMENDOIM BRASIL*',
      `_${dataHoje()}_`,
      '',
      `*${m.fato.titulo}*`,
      m.fato.texto || '',
      '',
      `Radar de preços completo: ${URL_RADAR}`,
      assinatura
    ].join('\n');
  }
  const v = variacaoIEA(c);
  const varTxt = !v ? '' : v.dif === 0 ? ' · estável' : ` · ${v.dif > 0 ? '+' : '−'}${brl(Math.abs(v.dif))} vs ${ddmm(v.desde)}`;
  const conab = (c.referencias || []).find((x) => x.fonte === 'Conab');
  const linhas = [
    '*RADAR DE PREÇOS · AMENDOIM BRASIL*',
    `_${dataHoje()}_`,
    '',
    '*Amendoim em casca · saca de 25 kg*',
    `• ${dest.fonte || 'IEA-SP'} ${dest.regiao || 'Tupã'} (${(dest.data || '').slice(0, 5)}): *${brl(dest.preco)}*${varTxt}`
  ];
  if (conab) linhas.push(`• Conab, média de SP: ${brl(conab.preco)}${conab.variacao != null ? ` · ${pct(conab.variacao)} na semana` : ''}`);
  if (D.dolar) linhas.push(`• Dólar: ${brl(D.dolar.bid)} · ${pct(D.dolar.pct)} hoje`);
  const hoje = (m.hoje || []).filter((x) => ['exportacao', 'demanda', 'oferta'].includes(x.id));
  if (hoje.length) linhas.push('', '*Mercado*', ...hoje.map((x) => `• ${x.rotulo}: ${x.valor}`));
  if (m.fato) linhas.push('', '*Fato do dia*', m.fato.titulo);
  linhas.push('', `Mercado físico, clima e ferramentas: ${URL_RADAR}`, assinatura);
  return linhas.join('\n');
}
async function compartilhar(tipo) {
  const texto = textoCompartilhar(tipo);
  evento('compartilhar-' + tipo);
  if (navigator.share && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
    try { await navigator.share({ text: texto }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener');
}

// ---------- PDF do boletim ----------
// O PDF é preparado assim que o boletim abre, para o "Enviar" funcionar na hora no celular.
const pdfsProntos = new Map();
function prepararPdf(id) {
  if (pdfsProntos.has(id)) return pdfsProntos.get(id);
  const b = D.boletins.find((x) => x.id === id);
  if (!b || !b.secoes?.length) return Promise.reject(new Error('boletim'));
  const pr = (async () => {
    const { gerarPdfBoletim, carregarPdfLib } = await import('/pdf.js');
    const [PDFLib, logo] = await Promise.all([carregarPdfLib(), fetch('/img/logo.png').then((r) => r.arrayBuffer())]);
    const siglas = Object.fromEntries((D.panorama || []).map((p) => [p.pais, p.sigla]));
    const bytes = await gerarPdfBoletim(PDFLib, b, { logo, url: URL_APP, whatsapp: D.config.whatsappHelder, siglas });
    const arquivo = new File([bytes], `Boletim-Amendoim-Brasil-${b.id}.pdf`, { type: 'application/pdf' });
    pr.pronto = arquivo;
    return arquivo;
  })();
  pr.catch(() => pdfsProntos.delete(id));
  pdfsProntos.set(id, pr);
  return pr;
}
function salvarArquivo(arquivo) {
  const u = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = u; a.download = arquivo.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 15000);
}
async function baixarPdf(id, modo) {
  const b = D.boletins.find((x) => x.id === id);
  if (!b) return;
  evento(modo === 'enviar' ? 'pdf-enviar' : 'pdf-baixar');
  const botoes = document.querySelectorAll(`[data-pdf="${CSS.escape(id)}"]`);
  let arquivo = pdfsProntos.get(id)?.pronto;
  if (!arquivo) {
    botoes.forEach((x) => { x.disabled = true; x.dataset.txt = x.innerHTML; x.textContent = 'Gerando PDF…'; });
    try { arquivo = await prepararPdf(id); }
    catch (e) { alert('Não foi possível gerar o PDF agora. Verifique a internet e tente de novo.'); return; }
    finally { botoes.forEach((x) => { x.disabled = false; if (x.dataset.txt) x.innerHTML = x.dataset.txt; }); }
  }
  if (modo === 'enviar' && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: b.titulo, text: `${b.titulo} · Boletim Amendoim Brasil. Acompanhe o mercado todo dia no app: ${URL_APP}` });
      return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  salvarArquivo(arquivo);
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-ev]');
  if (a) evento(a.dataset.ev);
  const s = e.target.closest('[data-compartilhar]');
  if (s) { e.preventDefault(); compartilhar(s.dataset.compartilhar); }
  const p = e.target.closest('[data-pdf]');
  if (p) { e.preventDefault(); baixarPdf(p.dataset.pdf, p.dataset.modo); }
});

// Eventos delegados (filtros, gráfico, login)
ligarFerramentas({ esc, ic, I, brl, numBr, render });
ligarAlertas(render, evento);
ligarDados(render, evento);
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-periodo],[data-boletim],[data-prev]');
  if (!t) return;
  if (t.dataset.prev) { alternarPrevisao(+t.dataset.prev); }
  if (t.dataset.periodo) { estado.periodo = t.dataset.periodo; }
  if (t.dataset.boletim) { estado.filtroBoletim = t.dataset.boletim; }
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

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'form-numeros') {
    e.preventDefault();
    const k = document.getElementById('chave-numeros').value.trim();
    const saida = document.getElementById('numeros-saida');
    saida.innerHTML = '<div class="vazio">Carregando…</div>';
    try {
      const r = await fetch('/api/numeros?k=' + encodeURIComponent(k), { cache: 'no-store' });
      if (r.status === 401) { saida.innerHTML = '<div class="vazio">Chave incorreta.</div>'; return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      try { localStorage.setItem('ab-chave-numeros', k); } catch (er) { /* ignora */ }
      saida.innerHTML = desenharNumeros(await r.json(), H());
    } catch (er) { saida.innerHTML = '<div class="vazio">Não foi possível carregar os números agora.</div>'; }
    return;
  }
  if (e.target.id !== 'form-login') return;
  e.preventDefault();
  // Enquanto o login não existe, o pedido de acesso vai direto para o WhatsApp do Helder.
  const tel = (document.getElementById('tel')?.value || '').trim();
  const link = wa(`Olá Helder, sou cliente da consultoria e quero acessar a área do cliente no app. Meu celular: ${tel}`);
  evento('consultoria-login');
  if (link) window.open(link, '_blank', 'noopener');
  document.getElementById('msg-login').textContent = 'Abrimos o WhatsApp do Helder para liberar o seu acesso.';
});

window.addEventListener('hashchange', () => render());

async function iniciar() {
  const res = await Promise.all(ARQUIVOS.map((a) => fetch(`/data/${a}.json`, { cache: 'no-cache' }).then((r) => r.json())));
  ARQUIVOS.forEach((a, i) => { D[a] = res[i]; });
  ligarBalcao(D, H(), render, evento);
  render();
  eventoAbertura();
  carregarAnuncios().then(() => { const a = rota().aba; if (a === 'negociar' || a === 'inicio') render(false); });
  carregarDolar();
  // Mostra o clima na hora (local salvo ou Presidente Prudente) e troca para a localização da pessoa quando ela permitir.
  atualizarClima(municipioAtual());
  localInicial().then((m) => { if (m) { atualizarClima(m); registrarRegiao(); } });
}

// Dólar comercial ao vivo (AwesomeAPI). Se falhar, fica o valor do mercado.json.
async function carregarDolar() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const j = (await r.json()).USDBRL;
    D.dolar = { bid: +j.bid, pct: +j.pctChange };
    if (rota().aba === 'inicio') render(false);
  } catch (e) { /* mantém o valor fixo */ }
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
  definirMunicipio(m); D.climaAuto = null; render(false); atualizarClima(m); atualizarLocalAlertas();
});

document.addEventListener('click', async (e) => {
  if (!e.target.closest('#usar-gps')) return;
  const s = document.querySelector('.topo .sub');
  if (s) s.textContent = 'Buscando sua localização…';
  const m = await localDoAparelho(15000);
  if (!m) { if (s) s.textContent = 'Não foi possível usar sua localização. Escolha o município na lista.'; return; }
  definirMunicipio(m); D.climaAuto = null; render(false); atualizarClima(m); atualizarLocalAlertas();
});

iniciar().catch((err) => {
  document.getElementById('tela').innerHTML = `<div class="vazio">Não foi possível carregar os dados. Verifique a conexão.<br><small>${esc(err.message)}</small></div>`;
});

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
