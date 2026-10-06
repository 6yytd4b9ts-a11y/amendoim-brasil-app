// App Amendoim Brasil — sem dependências. Conteúdo vem de /data/*.json.
import { MUNICIPIOS, carregarClima, telaClima as telaClimaAuto, municipioAtual, definirMunicipio } from '/clima.js';

const ARQUIVOS = ['config', 'cotacoes', 'boletins', 'noticias', 'ofertas', 'patrocinadores', 'panorama', 'clima'];
const D = {};
const estado = { periodo: '6M', filtroBoletim: 'Todos', lado: 'Todas', produto: 'Todos', calc: {} };

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
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
};
const corSigla = { BR: 'pilula-verde', AR: 'pilula-azul', US: 'pilula-amendoim', IN: 'pilula-amendoim', CN: 'pilula-amendoim' };

function termometroBarras(status) {
  const s = (status || '').toLowerCase();
  const i = s.startsWith('fra') ? 0 : s.startsWith('fir') ? 2 : 1;
  const cls = ['ativo-fraco', 'ativo-estavel', 'ativo-firme'][i];
  return `<div class="termometro">${[0, 1, 2].map((k) => `<span class="${k === i ? cls : ''}"></span>`).join('')}</div>`;
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
      <span>${dest.variacao != null ? pct(dest.variacao) + ' vs semana anterior' : 'Cotação da semana em breve'}</span>
    </div>
    <a class="btn-branco" href="#/mercado">Ver cotações por região</a>
  </section>

  <div class="grade-2">
    <a class="cartao" href="#/mercado" style="gap:10px;padding:14px">
      <span class="rotulo">Termômetro</span>${termometroBarras(cfg.termometro.status)}
      <span class="grande">${esc(cfg.termometro.status)}</span><span class="mini">Fraco · Estável · Firme</span>
    </a>
    <a class="cartao" href="#/clima" style="gap:10px;padding:14px">
      <span class="rotulo">Chuva · 7 dias</span>${ic(I.chuva, 'style="width:32px;height:32px;stroke:#2F6FA3"')}
      <span class="grande num">${temChuva ? numBr(chuva7) + ' mm' : '— mm'}</span><span class="mini">${auto ? 'Previsto em ' + esc(auto.municipio.nome) : 'Carregando previsão…'}</span>
    </a>
  </div>

  ${b ? `
  <a class="boletim" href="${linkSeguro(b.link) || '#/mercado/analises'}" ${linkSeguro(b.link) ? 'target="_blank" rel="noopener"' : ''}>
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
      <div class="lista-linha"><span class="sigla pilula ${corSigla[p.sigla] || 'pilula-verde'}">${esc(p.sigla)}</span><span class="cresce" style="font-weight:600">${esc(p.pais)}</span><span class="mini" style="font-size:13px">${esc(p.fase)}</span></div>`).join('')}
    </div>
  </section>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Oportunidades no balcão</span><a class="link-mini" href="#/negociar">Ver balcão</a></div>
    <div>${D.ofertas.slice(0, 2).map((o) => `
      <a class="lista-linha" href="#/negociar">
        <span class="lado ${o.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${o.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span>
        <span class="cresce"><b style="font-size:14px;display:block">${esc(o.categoria)} · ${esc(o.volume)}</b><span class="mini">${esc(o.regiao)}</span></span>
        <b class="num" style="font-size:14px">${esc(o.preco)}</b>
      </a>`).join('')}
    </div>
  </section>

  ${cartaoAlertas()}

  <section class="parceiros">
    <span class="rotulo">Parceiros Amendoim Brasil</span>
    <div class="parceiros-grade">${D.patrocinadores.slice(0, 4).map((p) => {
      const href = linkSeguro(p.link);
      const dentro = p.logo ? `<img src="${esc(p.logo)}" alt="${esc(p.nome)}">` : esc(p.nome);
      return href ? `<a class="parceiro" href="${esc(href)}" target="_blank" rel="noopener sponsored">${dentro}</a>` : `<span class="parceiro">${dentro}</span>`;
    }).join('')}</div>
  </section>`;
}

function blocoNoticias() {
  if (!D.noticias.length) return '';
  return `
  <div class="secao-titulo"><h2>Notícias e vídeos</h2></div>
  <div class="carrossel">${D.noticias.map((n) => {
    const href = linkSeguro(n.link);
    const yt = idYoutube(n.link);
    const video = n.tipo === 'video' || !!yt;
    const capaUrl = linkSeguro(n.capa) || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');
    const capa = capaUrl ? `<img src="${esc(capaUrl)}" alt="" loading="lazy">` : `<span>${video ? '[Capa do vídeo]' : '[Imagem da matéria]'}</span>`;
    const tag = href ? 'a' : 'div';
    return `<${tag} class="noticia" ${href ? `href="${esc(href)}" target="_blank" rel="noopener"` : ''}>
      <div class="noticia-capa ${video ? 'video' : ''}">${capa}
        ${video ? `<span class="play"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="#1B1B17"/></svg></span>` : ''}
        ${n.patrocinado ? '<span class="patrocinado">Patrocinado</span>' : ''}
      </div>
      <div class="noticia-corpo"><span class="noticia-fonte">${esc(n.fonte)}</span><span class="noticia-titulo">${esc(n.titulo)}</span></div>
    </${tag}>`;
  }).join('')}</div>`;
}

function cartaoAlertas() {
  const link = wa('Quero receber os alertas da Amendoim Brasil no WhatsApp.');
  return `
  <section id="alertas" class="cartao" style="background:var(--verde-fundo);border-color:#C2E2CC;flex-direction:row;align-items:center">
    ${ic(I.zap, 'style="width:32px;height:32px;stroke:#007731;flex-shrink:0"')}
    <div class="cresce"><b style="font-size:15px;display:block">Alertas no WhatsApp</b><span style="font-size:13px;color:#3E4A40">Chuva, veranico e cotação da semana</span></div>
    ${link ? `<a class="btn btn-verde btn-pequeno" href="${link}" target="_blank" rel="noopener">Ativar</a>` : `<span class="btn btn-verde btn-pequeno" style="opacity:.6" title="Configure o WhatsApp em config.json">Ativar</span>`}
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
  const c = D.cotacoes, cfg = D.config;
  const chips = `<div class="chips"><button class="chip" aria-pressed="true">Casca</button>${(cfg.produtosEmBreve || []).map((p) => `<button class="chip" disabled>${esc(p)} <span class="breve">EM BREVE</span></button>`).join('')}</div>`;
  return `${topoMercado('cotacoes', chips)}
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 8px"><span class="rotulo">Casca por região · ${esc(c.unidade)}</span><span class="mini">${c.semana ? 'Semana ' + esc(c.semana) : ''}</span></div>
    ${c.regioes.map((r) => `<div class="lista-linha"><span class="cresce" style="font-size:15px;font-weight:600">${esc(r.nome)}</span><b class="num" style="font-size:17px">${brl(r.preco)}</b>${varChip(r.variacao)}</div>`).join('')}
  </section>

  <a class="chamada" href="#/negociar">
    <span class="cresce"><b style="font-size:15px;display:block">Tem amendoim pra vender?</b><span style="font-size:13px;color:#5C3A06">Veja quem está comprando no balcão</span></span>
    ${ic(I.seta, 'style="stroke:#5C3A06"')}
  </a>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Histórico de preço · R$/saca</span>${c.historico.exemplo ? '<span class="aviso-exemplo">Dados de exemplo</span>' : ''}</div>
    <div class="chips" role="group" aria-label="Período">
      ${['3M', '6M', '1A'].map((p) => `<button class="chip" data-periodo="${p}" aria-pressed="${estado.periodo === p}">${p}</button>`).join('')}
      <a class="chip" href="#/mercado/consultoria" style="text-decoration:none;border-style:dashed">${ic(I.cadeado, 'style="width:13px;height:13px"')}5 anos</a>
    </div>
    <div class="grafico" id="grafico">${graficoPreco()}</div>
  </section>

  ${c.referencias?.length ? `
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 8px"><span class="rotulo">Referências públicas</span><span class="mini">R$/saca 25 kg</span></div>
    ${c.referencias.map((r) => `<div class="lista-linha"><span class="cresce"><b style="font-size:14px;display:block">${esc(r.praca)}</b><span class="mini">${esc(r.fonte)} · ${esc(r.data)}</span></span><b class="num">${brl(r.preco)}</b></div>`).join('')}
  </section>` : ''}

  <section class="cartao">
    <span class="rotulo">Termômetro do mercado</span>
    ${termometroBarras(cfg.termometro.status)}
    <div class="fases-nomes" style="font-size:12px"><span>Fraco</span><span class="atual">${esc(cfg.termometro.status)}</span><span>Firme</span></div>
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(cfg.termometro.resumo)}</p>
    <span class="mini" style="font-weight:600">Helder Lamberti · Amendoim Brasil</span>
  </section>

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
  const n = { '3M': 4, '6M': 7, '1A': 13 }[estado.periodo] || 7;
  const pts = todos.slice(-n);
  if (pts.length < 2) return '<div class="vazio">Histórico ainda sem dados.</div>';
  const W = 320, H = 150, padL = 34, padB = 22, padT = 8;
  const vals = pts.map((p) => p.preco);
  let min = Math.min(...vals), max = Math.max(...vals);
  const folga = Math.max(2, (max - min) * 0.15); min = Math.floor(min - folga); max = Math.ceil(max + folga);
  const x = (i) => padL + (i * (W - padL - 6)) / (pts.length - 1);
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.preco).toFixed(1)}`).join(' ');
  const area = `${linha} L${x(pts.length - 1).toFixed(1)} ${H - padB} L${padL} ${H - padB} Z`;
  const ticks = [min, (min + max) / 2, max];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const rot = (d) => { const [a, m] = d.split('-'); return meses[+m - 1] + (m === '01' ? '/' + a.slice(2) : ''); };
  const passo = Math.ceil(pts.length / 5);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Histórico de preço do amendoim em casca">
    ${ticks.map((t) => `<line x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="#EFEBE2"/><text class="eixo" x="${padL - 6}" y="${y(t) + 3}" text-anchor="end">${numBr(t)}</text>`).join('')}
    <path d="${area}" fill="#DCEFE2" opacity=".8"/>
    <path d="${linha}" fill="none" stroke="#007731" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p, i) => (i % passo === 0 || i === pts.length - 1) ? `<text class="eixo" x="${x(i)}" y="${H - 6}" text-anchor="middle">${rot(p.data)}</text>` : '').join('')}
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.preco)}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${i === pts.length - 1 ? '#F4AD46' : '#007731'}" stroke="#fff" stroke-width="2" data-i="${i}" style="cursor:pointer"/>`).join('')}
    ${pts.map((p, i) => `<rect x="${x(i) - 12}" y="0" width="24" height="${H}" fill="transparent" data-ponto="${i}" data-x="${x(i)}" data-y="${y(p.preco)}" data-txt="${rot(p.data)}: ${brl(p.preco)}"/>`).join('')}
  </svg>`;
}

function telaAnalises() {
  const tipos = ['Todos', ...new Set(D.boletins.map((b) => b.tipo))];
  const lista = estado.filtroBoletim === 'Todos' ? D.boletins : D.boletins.filter((b) => b.tipo === estado.filtroBoletim);
  return `${topoMercado('analises')}
  <section class="destaque" style="gap:12px">
    <b style="font-size:20px;line-height:1.25;letter-spacing:-0.01em">Decida a venda com informação de quem está no mercado</b>
    ${['Relatórios e boletins completos', 'Histórico de preços completo', 'Paridade de exportação em R$/saca', 'Alertas personalizados no WhatsApp'].map((t) => `<div style="display:flex;align-items:center;gap:10px;font-size:14px">${ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#F4AD46;stroke-width:2.6"')}${t}</div>`).join('')}
    <a class="btn btn-amendoim" href="#/mercado/consultoria">Quero assinar</a>
  </section>
  <div class="chips">${tipos.map((t) => `<button class="chip" data-boletim="${esc(t)}" aria-pressed="${estado.filtroBoletim === t}">${esc(t)}</button>`).join('')}</div>
  ${lista.map((r) => {
    const href = !r.exclusivo && linkSeguro(r.link);
    return `<a class="cartao" style="flex-direction:row;align-items:center;padding:14px" href="${href || '#/mercado/consultoria'}" ${href ? 'target="_blank" rel="noopener"' : ''}>
      <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:var(--amendoim-claro)">${ic(I.doc, 'style="stroke:#7A4A08"')}</span>
      <span class="cresce"><span style="font-size:12px;font-weight:700;color:var(--marrom);display:block">${esc(r.tipo)}</span><b style="font-size:15px;display:block">${esc(r.titulo)}</b><span class="mini">${esc(r.data)}</span></span>
      ${r.exclusivo ? ic(I.cadeado, 'style="width:18px;height:18px;stroke:#5F5B52" aria-label="Exclusivo"') : ic(I.seta, 'style="width:18px;height:18px"')}
    </a>`;
  }).join('')}`;
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

// ---------- calculadoras ----------
const CALCS = {
  custo: {
    nome: 'Custo por saca', desc: 'E sua margem com o preço de venda',
    campos: [['custoHa', 'Custo total por hectare (R$)'], ['prod', 'Produtividade (sc 25 kg/ha)'], ['preco', 'Preço de venda (R$/sc) · opcional']],
    calc: (v) => {
      if (v.custoHa == null || !v.prod) return null;
      const cs = v.custoHa / v.prod, m = v.preco != null ? v.preco - cs : null;
      return { total: ['Seu custo por saca', brl(cs)], linhas: [['Margem por saca', m != null ? brl(m) : '—'], ['Resultado por hectare', m != null ? brl(m * v.prod) : '—']], venda: cs };
    }
  },
  equilibrio: {
    nome: 'Ponto de equilíbrio', desc: 'Produtividade mínima pra empatar',
    campos: [['custoHa', 'Custo total por hectare (R$)'], ['preco', 'Preço de venda (R$/sc)']],
    calc: (v) => (v.custoHa == null || !v.preco) ? null : { total: ['Produtividade mínima', numBr(v.custoHa / v.preco, 1) + ' sc/ha'], linhas: [['Em quilos por hectare', numBr((v.custoHa / v.preco) * 25) + ' kg/ha']] }
  },
  rendimento: {
    nome: 'Rendimento casca → grão', desc: 'Quanto de grão sai da sua carga',
    campos: [['sacas', 'Quantidade de casca (sacas 25 kg)'], ['rend', 'Rendimento de grão (%)']],
    calc: (v) => {
      if (!v.sacas || v.rend == null) return null;
      const kg = v.sacas * 25 * (v.rend / 100);
      return { total: ['Grão obtido', numBr(kg) + ' kg'], linhas: [['Em toneladas', numBr(kg / 1000, 2) + ' t'], ['Casca total', numBr(v.sacas * 25) + ' kg']] };
    }
  },
  barter: {
    nome: 'Barter', desc: 'Quantas sacas pagam semente e insumos',
    campos: [['pacoteHa', 'Custo do pacote por hectare (R$)'], ['precoBarter', 'Preço da saca no barter (R$/sc)'], ['area', 'Área (ha) · opcional']],
    calc: (v) => {
      if (v.pacoteHa == null || !v.precoBarter) return null;
      const sh = v.pacoteHa / v.precoBarter;
      return { total: ['Sacas por hectare', numBr(sh, 1) + ' sc/ha'], linhas: [['Total de sacas', v.area ? numBr(sh * v.area) + ' sc' : '—']] };
    }
  },
  semente: {
    nome: 'Semente por hectare', desc: 'Custo da semente na sua área',
    campos: [['kgHa', 'Semente (kg/ha)'], ['precoKg', 'Preço da semente (R$/kg)'], ['area', 'Área (ha)']],
    calc: (v) => {
      if (!v.kgHa || v.precoKg == null) return null;
      const ch = v.kgHa * v.precoKg;
      return { total: ['Custo por hectare', brl(ch)], linhas: [['Semente total', v.area ? numBr(v.kgHa * v.area) + ' kg' : '—'], ['Custo total', v.area ? brl(ch * v.area) : '—']] };
    }
  },
  armazenagem: {
    nome: 'Vale a pena armazenar?', desc: 'Quanto custa segurar o produto',
    campos: [['preco', 'Preço hoje (R$/sc)'], ['armaz', 'Armazenagem (R$/sc por mês)'], ['juros', 'Custo do dinheiro (% ao mês)'], ['meses', 'Meses guardando']],
    calc: (v) => {
      if (v.preco == null || !v.meses) return null;
      const custo = (v.armaz || 0) * v.meses + v.preco * ((v.juros || 0) / 100) * v.meses;
      return { total: ['Preço futuro para empatar', brl(v.preco + custo)], linhas: [['Custo de segurar por saca', brl(custo)]] };
    }
  },
  arrendamento: {
    nome: 'Arrendamento em sacas', desc: 'Converta o valor da terra',
    campos: [['valorHa', 'Arrendamento (R$/ha)'], ['preco', 'Preço da saca (R$/sc)']],
    calc: (v) => (v.valorHa == null || !v.preco) ? null : { total: ['Equivale a', numBr(v.valorHa / v.preco, 1) + ' sc/ha'], linhas: [] }
  }
};

function telaFerramentas(qual) {
  const k = CALCS[qual] ? qual : 'custo';
  const c = CALCS[k];
  const vals = estado.calc[k] || {};
  return `<header class="topo"><div><h1>Ferramentas</h1><div class="sub">Calculadoras para o dia a dia da lavoura</div></div></header>
  <section class="cartao" style="gap:14px" id="calc" data-calc="${k}">
    <div><b style="font-size:17px;display:block">${esc(c.nome)}</b><span class="mini">${esc(c.desc)}</span></div>
    ${c.campos.map(([id, rot]) => `<div class="campo"><label for="c-${id}">${esc(rot)}</label><input id="c-${id}" data-campo="${id}" inputmode="decimal" value="${esc(vals[id] ?? '')}" autocomplete="off"></div>`).join('')}
    <div id="calc-resultado">${resultadoCalc(k)}</div>
  </section>
  <span class="rotulo" style="padding:4px 4px 0">Outras calculadoras</span>
  <div class="calc-grade">${Object.entries(CALCS).filter(([id]) => id !== k).map(([id, x]) => `<a class="calc-botao" href="#/ferramentas/${id}"><b>${esc(x.nome)}</b><span class="mini">${esc(x.desc)}</span></a>`).join('')}</div>`;
}

function resultadoCalc(k) {
  const c = CALCS[k], raw = estado.calc[k] || {};
  const v = {}; c.campos.forEach(([id]) => { v[id] = num(raw[id]); });
  const r = c.calc(v);
  if (!r) return `<div class="resultado" style="opacity:.55"><div class="linha"><span>Preencha os campos</span><span class="total">—</span></div></div>`;
  return `<div class="resultado">
    <div class="linha"><span>${esc(r.total[0])}</span><span class="total num">${esc(r.total[1])}</span></div>
    ${r.linhas.length ? '<hr>' : ''}${r.linhas.map(([a, b]) => `<div class="linha"><span>${esc(a)}</span><b class="num">${esc(b)}</b></div>`).join('')}
  </div>
  ${k === 'custo' && r.venda ? `<a class="chamada" href="#/negociar" style="margin-top:12px;background:#fff;border-color:var(--borda)"><span class="cresce" style="font-size:14px;font-weight:700;color:var(--verde)">Ver compradores pagando acima de ${brl(r.venda)}</span>${ic(I.seta, 'style="stroke:#007731"')}</a>` : ''}`;
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
  ferramentas: (sub) => telaFerramentas(sub),
  negociar: () => telaNegociar()
};

function rota() {
  const [aba = 'inicio', sub] = location.hash.replace(/^#\/?/, '').split('/');
  return { aba: ROTAS[aba] ? aba : 'inicio', sub };
}

function render(rolarTopo = true) {
  const { aba, sub } = rota();
  const tela = document.getElementById('tela');
  tela.innerHTML = ROTAS[aba](sub);
  document.querySelectorAll('.abas a').forEach((a) => { if (a.dataset.aba === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (rolarTopo) window.scrollTo(0, 0);
}

// Eventos delegados (filtros, calculadoras, gráfico, login)
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-periodo],[data-boletim],[data-lado],[data-produto]');
  if (!t) return;
  if (t.dataset.periodo) { estado.periodo = t.dataset.periodo; }
  if (t.dataset.boletim) { estado.filtroBoletim = t.dataset.boletim; }
  if (t.dataset.lado) { estado.lado = t.dataset.lado; }
  if (t.dataset.produto) { estado.produto = t.dataset.produto; }
  render(false);
});

document.addEventListener('input', (e) => {
  const inp = e.target.closest('[data-campo]');
  if (!inp) return;
  const k = document.getElementById('calc').dataset.calc;
  (estado.calc[k] ||= {})[inp.dataset.campo] = inp.value;
  document.getElementById('calc-resultado').innerHTML = resultadoCalc(k);
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
  atualizarClima();
}

async function atualizarClima(local) {
  try { D.climaAuto = await carregarClima(local); } catch (e) { D.climaAuto = { erro: 'Não foi possível carregar o clima agora.', dias: [], alertas: [], municipio: local || municipioAtual(), inicioSafra: '0000-09-01' }; }
  const aba = rota().aba;
  if (aba === 'clima' || aba === 'inicio') render(false);
}

document.addEventListener('change', (e) => {
  if (e.target.id !== 'sel-municipio') return;
  const m = MUNICIPIOS.find((x) => x.nome === e.target.value);
  if (!m) return;
  definirMunicipio(m); D.climaAuto = null; render(false); atualizarClima(m);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#usar-gps') || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((p) => {
    const m = { nome: 'Minha localização', uf: '', lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) };
    definirMunicipio(m); D.climaAuto = null; render(false); atualizarClima(m);
  }, () => alertaGps());
});
function alertaGps() { const s = document.querySelector('.topo .sub'); if (s) s.textContent = 'Não foi possível usar sua localização. Escolha o município na lista.'; }

iniciar().catch((err) => {
  document.getElementById('tela').innerHTML = `<div class="vazio">Não foi possível carregar os dados. Verifique a conexão.<br><small>${esc(err.message)}</small></div>`;
});

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
