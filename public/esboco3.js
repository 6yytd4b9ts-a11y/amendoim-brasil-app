// ESBOÇO (parte 3): novidades desde a última visita, Conab no topo, botão ★, enquete da safra, mercado físico,
// gráfico interativo, termômetro de 5 posições, preço por destino (Empresa) e Biblioteca do amendoim.
import { conteudo, assinante, sessao, perfil, salvarPerfil } from '/esboco-dados.js';
import { municipioAtual } from '/clima.js';

let ctx = { render: () => {}, evento: () => {}, D: null };
const est = { contestar: false, msgFisico: '', bib: { tema: 'todos', busca: '' }, enqueteCel: false };
const ler = (k, s = localStorage) => { try { return JSON.parse(s.getItem(k) || 'null'); } catch (e) { return null; } };
const gravar = (k, v, s = localStorage) => { try { s.setItem(k, JSON.stringify(v)); } catch (e) { /* ignora */ } };
const nf = (n, d = 0) => (n == null || !isFinite(n) ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const brl = (n) => (n == null || !isFinite(n) ? 'R$ —' : 'R$ ' + nf(n, 2));
const ESTRELA = '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>';

// ---------- Preços de referência ----------
const refConab = (D) => (D.cotacoes.referencias || []).find((x) => x.fonte === 'Conab');
function varIEA(c) {
  const h = (c.historicoIEA || []).filter((x) => x && isFinite(x.preco)).sort((a, b) => (a.data < b.data ? -1 : 1));
  if (h.length < 2) return null;
  return { dif: h[h.length - 1].preco - h[h.length - 2].preco, desde: h[h.length - 2].data };
}
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const ordenarRefs = (l) => [...(l || [])].sort((a, b) => (a.fonte === 'Conab' ? -1 : 0) - (b.fonte === 'Conab' ? -1 : 0));

// ---------- Topo: botão ★ no lugar do alfinete ----------
export function botaoAssinanteTopo(h) {
  return `<a class="btn-icone es-btn-estrela" href="#/mercado/consultoria" aria-label="Área do Assinante" data-ev="esb-estrela">${h.ic(ESTRELA, 'style="fill:#F4AD46;stroke:#5C3A06;stroke-width:1.6"')}</a>`;
}

// ---------- Destaque: Conab (média SP) como preço principal ----------
export function heroConab(D, h) {
  const c = D.cotacoes, r = refConab(D), dest = c.destaque || {};
  const v = varIEA(c);
  const ieaTxt = dest.preco ? `${h.esc(dest.fonte || 'IEA')} ${h.esc(dest.regiao || 'Tupã')} hoje: <b class="num">${brl(dest.preco)}</b>${v ? (Math.abs(v.dif) < 0.005 ? ' · estável' : ` (${v.dif > 0 ? '+' : '−'}${brl(Math.abs(v.dif))} vs ${ddmm(v.desde)})`) : ''}` : '';
  if (!r) return '';
  const sobe = r.variacao > 0, cai = r.variacao < 0;
  return `<section class="destaque">
    <div class="cartao-cab"><span class="rotulo">${h.esc(c.produto)} · Conab</span><span class="pilula pilula-verde-escuro">Média SP</span></div>
    <div style="display:flex;align-items:baseline;gap:8px" class="num"><span class="preco">${brl(r.preco)}</span><span class="unid">/ saca 25 kg</span></div>
    ${r.variacao != null ? `<div class="hero-var ${sobe ? 'sobe' : cai ? 'cai' : ''}">${r.variacao === 0 ? '<span aria-hidden="true">=</span>' : h.ic(sobe ? h.I.sobe : h.I.cai, 'style="width:16px;height:16px;stroke-width:2.6"')}<span>${r.variacao > 0 ? '+' : ''}${nf(r.variacao, 1)}% na semana</span></div>` : ''}
    <div style="font-size:14px;font-weight:600">Fonte: Conab · preço recebido pelo produtor · ${h.esc(r.data)}</div>
    ${ieaTxt ? `<span style="font-size:13px;opacity:.92">${ieaTxt}</span>` : ''}
    <div class="hero-acoes">
      <a class="btn-branco" href="#/mercado">Ver todas as cotações</a>
      <button class="btn-enviar" data-compartilhar="preco" aria-label="Enviar o preço no WhatsApp">${h.ic(h.I.enviar)}<span>Enviar</span></button>
    </div>
  </section>`;
}

// ---------- Desde a sua última visita ----------
let base;
function fotografia(D) {
  const r = refConab(D);
  return { quando: Date.now(), conab: r?.preco ?? null, iea: D.cotacoes.destaque?.preco ?? null, fato: D.mercado?.fato?.titulo || '', boletim: D.boletins?.[0]?.id || '', noticias: (D.noticias || []).map((n) => n.titulo).slice(0, 30) };
}
function tempoDesde(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `há ${Math.max(1, m)} min`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `há ${hr} h`;
  const d = Math.round(hr / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}
export function blocoNovidades(D, h) {
  if (base === undefined) {
    // A "última visita" fica fixa durante a sessão; a fotografia de agora vira a base da próxima vez.
    const ses = ler('ab-esb-base', sessionStorage);
    if (ses) base = ses.v; else { base = ler('ab-esboco-visita'); gravar('ab-esb-base', { v: base }, sessionStorage); }
    gravar('ab-esboco-visita', fotografia(D));
  }
  const atual = fotografia(D), itens = [];
  const dif = (a, b) => (a != null && b != null ? a - b : null);
  const linha = (ic, txt, href, cls = '') => itens.push(`<a class="es-nov-item ${cls}" href="${href}">${ic}<span class="cresce">${txt}</span>${h.ic(h.I.seta, 'style="width:14px;height:14px;stroke:#5F5B52"')}</a>`);
  const bola = (cor) => `<i class="es-nov-bola" style="background:${cor}"></i>`;
  if (base) {
    const dc = dif(atual.conab, base.conab), di = dif(atual.iea, base.iea);
    if (dc) linha(bola(dc > 0 ? '#007731' : '#B3261E'), `Conab ${dc > 0 ? 'subiu' : 'caiu'} <b>${brl(Math.abs(dc))}</b> e está em ${brl(atual.conab)}`, '#/mercado', dc > 0 ? 'sobe' : 'cai');
    if (di) linha(bola(di > 0 ? '#007731' : '#B3261E'), `IEA Tupã ${di > 0 ? 'subiu' : 'caiu'} <b>${brl(Math.abs(di))}</b> e está em ${brl(atual.iea)}`, '#/mercado', di > 0 ? 'sobe' : 'cai');
    const novas = atual.noticias.filter((t) => !(base.noticias || []).includes(t)).length;
    if (novas) linha(bola('#2F6FA3'), `<b>${novas} ${novas === 1 ? 'notícia nova' : 'notícias novas'}</b> no app`, '#/inicio');
    if (atual.fato && atual.fato !== base.fato) linha(bola('#F4AD46'), `Novo fato do dia: ${h.esc(atual.fato)}`, '#/mercado/hoje');
    if (atual.boletim && atual.boletim !== base.boletim) linha(bola('#7A4A08'), 'Saiu o boletim novo do mês', '#/mercado/analises');
  }
  // Sempre tem algo do dia, mesmo quando os preços não mudaram.
  const a = D.climaAuto;
  if (itens.length < 3 && atual.fato && (!base || atual.fato === base.fato)) linha(bola('#F4AD46'), `Fato do dia: ${h.esc(atual.fato)}`, '#/mercado/hoje');
  if (itens.length < 3 && a?.dias?.length) linha(bola('#2F6FA3'), `Chuva prevista: <b>${nf(a.total7)} mm</b> em 7 dias ${h.esc(a.municipio?.gps ? 'na sua região' : 'em ' + (a.municipio?.nome || ''))}`, '#/clima');
  if (itens.length < 3 && atual.iea != null && !(base && dif(atual.iea, base.iea))) linha(bola('#5F5B52'), `IEA Tupã hoje: ${brl(atual.iea)}`, '#/mercado');
  const titulo = base ? `Desde a sua última visita · ${tempoDesde(Date.now() - base.quando)}` : 'Hoje no amendoim';
  return `<section class="cartao es-novidades">
    <div class="cartao-cab"><span class="rotulo">${titulo}</span>${base ? '' : '<span class="mini">sua primeira visita</span>'}</div>
    ${itens.slice(0, 3).join('')}
  </section>`;
}

// ---------- Enquete da safra (cadastro aos poucos) ----------
export function cartaoEnquete(h) {
  const e = conteudo().enquete, voto = ler('ab-esboco-voto');
  if (!e) return '';
  const ops = [['mais', 'Mais'], ['igual', 'Igual'], ['menos', 'Menos']];
  if (!voto) {
    return `<section class="cartao es-enquete">
      <div class="cartao-cab"><span class="rotulo">Enquete da safra 26/27</span><span class="mini">1 toque · anônimo</span></div>
      <b style="font-size:16px;line-height:1.35">${h.esc(e.pergunta)}</b>
      <div class="es-enq-ops">${ops.map(([k, t]) => `<button type="button" class="es-enq-op" data-enq="${k}">${t}</button>`).join('')}</div>
      <span class="mini">Veja o que os outros produtores responderam assim que votar.</span>
    </section>`;
  }
  const cont = { ...e.base }; cont[voto.v] = (cont[voto.v] || 0) + 1;
  const tot = ops.reduce((s, [k]) => s + (cont[k] || 0), 0) || 1;
  const p = perfil();
  return `<section class="cartao es-enquete">
    <div class="cartao-cab"><span class="rotulo">Enquete da safra 26/27</span><span class="mini">${nf(tot)} respostas${e.exemplo ? ' · exemplo' : ''}</span></div>
    <b style="font-size:15px;line-height:1.35">${h.esc(e.pergunta)}</b>
    ${ops.map(([k, t]) => { const pc = (cont[k] / tot) * 100; return `<div class="es-enq-res ${voto.v === k ? 'meu' : ''}"><span>${t}${voto.v === k ? ' · você' : ''}</span><span class="es-enq-barra"><i style="width:${pc}%"></i></span><b class="num">${nf(pc)}%</b></div>`; }).join('')}
    ${p ? '<span class="mini">Obrigado! Você recebe o resultado da sua região quando sair.</span>' : est.enqueteCel ? `<form id="enq-form" class="es-campos">
      <div class="campo"><label for="enq-nome">Nome</label><input id="enq-nome" autocomplete="name" required></div>
      <div class="campo"><label for="enq-cel">WhatsApp</label><input id="enq-cel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" required></div>
      <div class="campo"><label for="enq-area">Quantos alqueires você vai plantar? <span style="font-weight:500">(opcional)</span></label><input id="enq-area" inputmode="decimal"></div>
      <button class="btn btn-verde btn-pequeno" type="submit">Receber o resultado</button>
    </form>` : `<button class="link-mini es-enq-mais" type="button" data-enq-cel>Quer o resultado da sua região no WhatsApp? Toque aqui</button>`}
  </section>`;
}

// ---------- Mercado físico ----------
export function cartaoFisico(D, h) {
  const f = conteudo().fisico || { regioes: [] };
  const local = municipioAtual();
  const zap = h.wa(`Olá, boa tarde! Gostaria de saber os preços do amendoim em casca na minha região${local?.nome && !local.gps ? ` (${local.nome})` : ''}.`);
  return `<section class="cartao es-fisico" id="sec-fisico">
    <div class="cartao-cab"><span class="rotulo">Mercado físico · quanto está pagando hoje</span>${f.exemplo ? '<span class="aviso-exemplo">Exemplo</span>' : `<span class="pilula pilula-verde">${h.esc(f.atualizado || 'hoje')}</span>`}</div>
    <div class="es-fis-lista">${(f.regioes || []).map((r) => `<div class="es-fis-linha"><span class="cresce">${h.esc(r.nome)}</span><b class="num">${brl(r.min).replace(',00', '')} a ${brl(r.max).replace(',00', '')}</b></div>`).join('')}</div>
    <span class="mini">R$ por saca de 25 kg, casca · faixa de negócio levantada pela Amendoim Brasil</span>
    <details class="abre"><summary>Por que é diferente do preço oficial?</summary><p class="es-txt" style="margin:0 0 10px">Conab e IEA mostram médias oficiais, sempre com alguns dias de atraso. O negócio de hoje muda conforme o comprador, a qualidade (aflatoxina, umidade), o volume e o frete. A faixa acima é o que está rodando de verdade.</p></details>
    ${zap ? `<a class="btn btn-verde" href="${zap}" target="_blank" rel="noopener" data-ev="fisico">${h.ic(h.I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Pedir o preço da minha região</a>` : ''}
    ${est.contestar ? `<form id="fis-form" class="es-campos es-contestar">
      <b style="font-size:14px">Qual preço você viu na sua região?</b>
      <div class="es-duas"><div class="campo"><label for="fis-preco">R$ por saca</label><input id="fis-preco" inputmode="decimal" placeholder="ex.: 81,00" required></div>
      <div class="campo"><label for="fis-mun">Município</label><input id="fis-mun" value="${h.esc(local?.gps ? '' : local?.nome || '')}" required></div></div>
      <div class="campo"><label for="fis-obs">Detalhe <span style="font-weight:500">(opcional: comprador, qualidade)</span></label><input id="fis-obs"></div>
      <button class="btn btn-escuro btn-pequeno" type="submit">Enviar para o Helder</button>
    </form>` : `<button class="link-mini es-contestar-btn" type="button" data-fis-contestar>Esse preço está diferente na sua região? Me conta</button>`}
    ${est.msgFisico ? `<span class="mini" role="status" style="text-align:center;font-weight:700;color:var(--verde-escuro)">${h.esc(est.msgFisico)}</span>` : ''}
  </section>`;
}

// ---------- Termômetro com 5 posições ----------
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export function posicao5(status) {
  const s = semAcento(status);
  if (s.startsWith('fraco a') || s === 'estavel a fraco') return 1;
  if (s.startsWith('estavel a firme') || s === 'firme a estavel') return 3;
  if (s.startsWith('fra')) return 0;
  if (s.startsWith('fir')) return 4;
  return 2;
}
export function medidor5(status, esc) {
  const i = posicao5(status);
  const nomes = ['Fraco', 'Estável', 'Firme'];
  const ativo = (k) => (i === k * 2 || i === k * 2 - 1 || i === k * 2 + 1);
  return `<div class="medidor" role="img" aria-label="Termômetro: ${esc(status)}"><i style="left:${[10, 30, 50, 70, 90][i]}%"></i></div>
  <div class="medidor-nomes">${nomes.map((t, k) => `<span class="${ativo(k) ? 'atual' : ''}">${t}</span>`).join('')}</div>`;
}
export function ajustarDados(D) {
  const t = conteudo().termometro;
  if (t && D.config?.termometro) D.config.termometro.status = t;
}

// ---------- Gráfico de preço: curva suave, toque mostra o valor ----------
function curva(xs, ys) {
  // Curva monotônica (Fritsch-Carlson): passa por todos os pontos e não inventa picos.
  const n = xs.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  let p = `M${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1] - xs[i]) / 3;
    p += ` C${(xs[i] + dx).toFixed(1)} ${(ys[i] + m[i] * dx).toFixed(1)} ${(xs[i + 1] - dx).toFixed(1)} ${(ys[i + 1] - m[i + 1] * dx).toFixed(1)} ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return p;
}
export function graficoNovo(D, periodo) {
  const todos = D.cotacoes.historico?.pontos || [];
  if (todos.length < 2) return '<div class="vazio">Histórico ainda sem dados.</div>';
  const meses = { '3M': 3, '6M': 6 }[periodo] || 6;
  const ult = new Date((todos[todos.length - 1].data + '-01').slice(0, 10) + 'T12:00:00Z');
  ult.setUTCMonth(ult.getUTCMonth() - meses);
  const corte = ult.toISOString().slice(0, 10);
  let pts = todos.filter((p) => (p.data.length === 7 ? p.data + '-01' : p.data) >= corte);
  if (pts.length < 2) pts = todos.slice(-2);
  const W = 320, H = 170, pl = 34, pb = 22, pt = 14;
  const vals = pts.map((p) => p.preco);
  let min = Math.min(...vals), max = Math.max(...vals);
  const folga = Math.max(2, (max - min) * 0.18); min = Math.floor(min - folga); max = Math.ceil(max + folga);
  const xs = pts.map((_, i) => pl + (i * (W - pl - 10)) / (pts.length - 1));
  const ys = pts.map((p) => pt + (H - pt - pb) * (1 - (p.preco - min) / (max - min)));
  const linha = curva(xs, ys);
  const area = `${linha} L${xs[xs.length - 1].toFixed(1)} ${H - pb} L${pl} ${H - pb} Z`;
  const ticks = [min, (min + max) / 2, max];
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const viradas = pts.map((p, i) => i).filter((i) => i === 0 || pts[i].data.slice(0, 7) !== pts[i - 1].data.slice(0, 7));
  const passo = Math.ceil(viradas.length / 6);
  const dados = pts.map((p, i) => [Math.round(xs[i] * 10) / 10, Math.round(ys[i] * 10) / 10, p.data.split('-').reverse().join('/'), p.preco]);
  const uX = xs[xs.length - 1], uY = ys[ys.length - 1], uP = pts[pts.length - 1].preco;
  return `<div class="gn" data-pts='${JSON.stringify(dados)}'>
    <svg viewBox="0 0 ${W} ${H}" class="gn-svg" role="img" aria-label="Histórico de preço do amendoim em casca">
      <defs><linearGradient id="gn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#007731" stop-opacity=".28"/><stop offset="1" stop-color="#007731" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line x1="${pl}" x2="${W}" y1="${pt + (H - pt - pb) * (1 - (t - min) / (max - min))}" y2="${pt + (H - pt - pb) * (1 - (t - min) / (max - min))}" stroke="#EFEBE2"/><text class="eixo" x="${pl - 6}" y="${pt + (H - pt - pb) * (1 - (t - min) / (max - min)) + 3}" text-anchor="end">${nf(t)}</text>`).join('')}
      <path d="${area}" fill="url(#gn-g)"/>
      <path d="${linha}" fill="none" stroke="#007731" stroke-width="2.6" stroke-linecap="round"/>
      ${viradas.filter((_, k) => k % passo === 0).map((i) => { const [, m] = pts[i].data.split('-'); return `<text class="eixo" x="${Math.max(pl + 8, xs[i])}" y="${H - 6}" text-anchor="middle">${nomes[+m - 1]}</text>`; }).join('')}
      <circle cx="${uX}" cy="${uY}" r="5" fill="#F4AD46" stroke="#fff" stroke-width="2"/>
      <g class="gn-marca" style="display:none"><line class="gn-linha" y1="${pt}" y2="${H - pb}" stroke="#1B1B17" stroke-dasharray="3 3" stroke-width="1"/><circle class="gn-ponto" r="5" fill="#007731" stroke="#fff" stroke-width="2"/></g>
      <rect class="gn-area" x="${pl}" y="0" width="${W - pl}" height="${H}" fill="transparent"/>
    </svg>
    <div class="gn-dica">Última: <b>${brl(uP)}</b> · arraste o dedo no gráfico</div>
  </div>`;
}

// ---------- Plano Empresa: preço por destino ----------
export function telaDestinos(h) {
  const s = sessao(), ok = assinante() && s?.plano === 'empresa';
  const d = conteudo().destinos || { lista: [] };
  const seta = (t) => (t === 'sobe' ? '<span class="dx-sobe">▲</span>' : t === 'cai' ? '<span class="dx-cai">▼</span>' : '<span class="mini">=</span>');
  const corpo = `<section class="cartao" style="gap:6px">
      <div class="cartao-cab"><b class="es-h1" style="font-size:20px">Preço por destino</b>${d.exemplo ? '<span class="aviso-exemplo">Exemplo</span>' : ''}</div>
      <span class="mini">Amendoim em grão · US$ por tonelada</span>
    </section>
    <section class="cartao dx-cartao">
      <div class="tabela-rolar"><table class="tabela dx-tabela es-dest">
        <thead><tr><th>Destino</th><th>Comex<br>${h.esc(d.mes || '')}</th><th>Negociado<br>na semana</th><th></th></tr></thead>
        <tbody>${d.lista.map((x) => `<tr><th>${h.esc(x.pais)}</th><td class="num">${nf(x.comex)}</td><td class="num">${nf(x.min)}–${nf(x.max)}</td><td>${seta(x.tend)}</td></tr>`).join('')}</tbody>
      </table></div>
      <details class="abre"><summary>Como ler esta tabela</summary><p class="es-txt" style="margin:0 0 10px"><b>Comex:</b> preço médio oficial embarcado no mês (Comex Stat, automático). <b>Negociado na semana:</b> faixa levantada pela Amendoim Brasil com exportadores e importadores. A seta mostra a tendência da semana.</p></details>
    </section>
    <section class="cartao" style="gap:8px">
      <span class="rotulo">Também no plano Empresa</span>
      <a class="lista-linha" href="#/mercado/dados" style="text-decoration:none;color:inherit"><span class="cresce"><b style="font-size:14px">Exportação completa</b><span class="mini" style="display:block">Mês a mês, destinos, Argentina, EUA, Índia e China</span></span>${h.ic(h.I.seta, 'style="width:16px;height:16px"')}</a>
      <div class="lista-linha"><span class="cresce"><b style="font-size:14px">Paridade de exportação em R$/saca</b><span class="mini" style="display:block">Em breve</span></span></div>
    </section>`;
  const voltar = `<header class="topo"><a class="link-mini" href="#/mercado/consultoria" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Assinantes</a></header>`;
  if (ok) return voltar + corpo;
  return `${voltar}<div class="es-travado"><div class="es-borrado" aria-hidden="true">${corpo}</div>
    <section class="cartao es-cadeado">${h.ic(h.I.cadeado, 'style="width:34px;height:34px;stroke:#7A4A08"')}
      <b class="es-h1" style="text-align:center">Plano Empresa</b>
      <span class="es-txt" style="text-align:center">Quanto Argélia, Rússia, África do Sul e Europa estão pagando, semana a semana. Para quem exporta, beneficia ou compra para a indústria.</span>
      <a class="btn btn-verde" href="#/conta/planos" style="width:100%">Ver o plano Empresa</a></section></div>`;
}

// ---------- Biblioteca do amendoim ----------
const BIBLIOTECA = [
  { tema: 'aflatoxina', titulo: 'Calagem, época de colheita e secagem: efeito sobre fungos e aflatoxinas no amendoim armazenado', fonte: 'Ciência Rural', ano: 2005, resumo: 'Mostra como o momento da colheita e a forma de secar mudam a contaminação por fungos e aflatoxina no grão armazenado.', link: 'https://www.redalyc.org/pdf/331/33135210.pdf' },
  { tema: 'aflatoxina', titulo: 'Manual de Boas Práticas Agrícolas para a Produção do Amendoim', fonte: 'Embrapa', ano: null, resumo: 'Passo a passo do plantio à armazenagem para reduzir o risco de aflatoxina e entregar um produto de qualidade.', link: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/278148/1/DOC207.pdf' },
  { tema: 'armazenagem', titulo: 'Produção integrada de amendoim: qualidade e segurança com planejamento, boas práticas e monitoramento', fonte: 'Embrapa', ano: null, resumo: 'Como organizar a produção para garantir qualidade e segurança do alimento, com rastreabilidade e monitoramento.', link: 'https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/157511/1/ProducaointegradaamendoimQualidadeesegurancabaseadosemplanejamentocapacitacaoboaspraticasemonitoramento.pdf' },
  { tema: 'armazenagem', titulo: 'Produção integrada de amendoim (folheto)', fonte: 'Embrapa', ano: null, resumo: 'Resumo em uma folha dos pontos principais da produção integrada.', link: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/278103/1/FOLDERprodintamendoim.pdf' },
  { tema: 'colheita', titulo: 'Perdas de amendoim nos períodos do dia na colheita mecanizada', fonte: 'Científica (Unesp)', ano: 2014, resumo: 'Mede as perdas no arranquio e no recolhimento de manhã e à tarde, com diferentes conjuntos de máquinas.', link: 'https://cientifica.dracena.unesp.br/index.php/cientifica/article/download/494/337/3406' },
  { tema: 'colheita', titulo: 'Arranquio mecanizado do amendoim: população de plantas e umidade do solo', fonte: 'Rev. Bras. Eng. Agrícola e Ambiental', ano: 2014, resumo: 'Avalia como a umidade do solo e a população de plantas mudam as perdas no arranquio.', link: 'https://acervodigital.unesp.br/handle/11449/109946' },
  { tema: 'doencas', titulo: 'Controle de tripes e mancha-preta para reduzir prejuízos no amendoim', fonte: 'Fatec (trabalho de graduação)', ano: null, resumo: 'Revisão prática sobre tripes e mancha-preta e o impacto econômico do controle.', link: 'https://ric.cps.sp.gov.br/bitstream/123456789/33889/1/CONTROLE%20DA%20TR%c3%8dPLICE%20E%20DA%20MANCHA%20PRETA%20PARA%20DIMINUI%c3%87%c3%83O%20DOSPREJU%c3%8dZOS%20ECON%c3%94MICOS%20NA%20CULTURA%20DO%20AMENDOIM.pdf' },
  { tema: 'doencas', titulo: 'Mancha-preta do amendoim: sintomas e manejo (ficha)', fonte: 'Agrolink', ano: null, resumo: 'Ficha rápida da doença, com fotos e formas de controle.', link: 'https://www.agrolink.com.br/problemas/mancha-preta_1935.html' },
  { tema: 'doencas', titulo: 'Mancha-castanha do amendoim (ficha)', fonte: 'Agrolink', ano: null, resumo: 'Ficha rápida da doença, com fotos e formas de controle.', link: 'https://www.agrolink.com.br/problema/mancha-castanha_1527.html' }
];
const TEMAS = [['todos', 'Tudo'], ['aflatoxina', 'Aflatoxina'], ['armazenagem', 'Armazenagem'], ['colheita', 'Arranquio e colheita'], ['doencas', 'Doenças']];
export function cartaoBiblioteca(h) {
  return `<a class="cartao es-bib-chamada" href="#/biblioteca" data-ev="esb-biblioteca">
    <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:var(--amendoim-claro)">${h.ic(h.I.doc, 'style="stroke:#7A4A08"')}</span>
    <span class="cresce"><b style="font-size:15px;display:block">Biblioteca do amendoim</b><span class="mini">Artigos e manuais para ler e baixar: aflatoxina, armazenagem, colheita, doenças</span></span>
    ${h.ic(h.I.seta, 'style="width:18px;height:18px;stroke:#5F5B52"')}</a>`;
}
export function telaBiblioteca(h) {
  const { tema, busca } = est.bib;
  const q = semAcento(busca);
  const lista = BIBLIOTECA.filter((x) => (tema === 'todos' || x.tema === tema) && (!q || semAcento(x.titulo + ' ' + x.resumo + ' ' + x.fonte).includes(q)));
  const termo = encodeURIComponent('amendoim ' + (busca || (tema !== 'todos' ? TEMAS.find((t) => t[0] === tema)[1] : '')));
  return `<header class="topo">
    <a class="link-mini" href="#/ferramentas" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Ferramentas</a>
    <div><h1>Biblioteca do amendoim</h1><div class="sub">Pesquisas e manuais gratuitos, com resumo prático</div></div>
    <div class="campo"><input id="bib-busca" type="search" placeholder="Buscar: aflatoxina, secagem, arranquio…" value="${h.esc(busca)}" style="font-size:16px;font-weight:600"></div>
    <div class="chips">${TEMAS.map(([k, t]) => `<button class="chip" data-bib-tema="${k}" aria-pressed="${tema === k}">${t}</button>`).join('')}</div>
  </header>
  ${lista.length ? lista.map((x) => `<article class="cartao es-bib-item">
    <span class="es-tipo es-t-evento">${h.esc(TEMAS.find((t) => t[0] === x.tema)[1])}</span>
    <b style="font-size:15px;line-height:1.35">${h.esc(x.titulo)}</b>
    <span class="mini">${h.esc(x.fonte)}${x.ano ? ' · ' + x.ano : ''}</span>
    <span class="es-txt">${h.esc(x.resumo)}</span>
    <a class="btn btn-pequeno es-btn-claro" href="${h.esc(x.link)}" target="_blank" rel="noopener" style="align-self:flex-start">${h.ic(h.I.pdf, 'style="width:16px;height:16px"')}Abrir / baixar</a>
  </article>`).join('') : '<div class="vazio">Nada encontrado aqui. Tente as buscas abaixo.</div>'}
  <section class="cartao" style="gap:8px">
    <span class="rotulo">Procurar mais em</span>
    <div class="es-botoes">
      <a class="btn btn-pequeno es-btn-claro" href="https://search.scielo.org/?q=${termo}&lang=pt" target="_blank" rel="noopener">SciELO</a>
      <a class="btn btn-pequeno es-btn-claro" href="https://scholar.google.com/scholar?q=${termo}" target="_blank" rel="noopener">Google Acadêmico</a>
    </div>
  </section>
  <p class="mini es-legal">Só material de acesso livre. O arquivo abre no site oficial de quem publicou.</p>`;
}

// ---------- eventos ----------
export function ligarEsboco3(opcoes) {
  ctx = { ...ctx, ...opcoes };
  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest(s);
    let x;
    if ((x = q('[data-enq]'))) { gravar('ab-esboco-voto', { v: x.dataset.enq, quando: Date.now() }); ctx.evento('esb-enquete'); ctx.render(false); return; }
    if (q('[data-enq-cel]')) { est.enqueteCel = true; ctx.render(false); return; }
    if (q('[data-fis-contestar]')) { est.contestar = true; est.msgFisico = ''; ctx.render(false); return; }
    if ((x = q('[data-bib-tema]'))) { est.bib.tema = x.dataset.bibTema; ctx.render(false); return; }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'bib-busca') return;
    est.bib.busca = e.target.value; const pos = e.target.selectionStart;
    ctx.render(false); const b = document.getElementById('bib-busca'); if (b) { b.focus(); b.setSelectionRange(pos, pos); }
  });
  document.addEventListener('submit', (e) => {
    const v = (s) => (document.getElementById(s)?.value || '').trim();
    if (e.target.id === 'fis-form') {
      e.preventDefault();
      const l = ler('ab-esboco-contesta') || [];
      l.unshift({ preco: v('fis-preco'), municipio: v('fis-mun'), obs: v('fis-obs'), quando: new Date().toISOString() });
      gravar('ab-esboco-contesta', l.slice(0, 50));
      est.contestar = false; est.msgFisico = 'Recebido! O Helder confere e ajusta a faixa se precisar.';
      ctx.evento('esb-contestou'); ctx.render(false); return;
    }
    if (e.target.id === 'enq-form') {
      e.preventDefault();
      const voto = ler('ab-esboco-voto') || {};
      const area = parseFloat(v('enq-area').replace(',', '.'));
      salvarPerfil({ nome: v('enq-nome'), celular: v('enq-cel'), municipio: municipioAtual()?.nome || '', a2627: isFinite(area) ? area : null, intencao: voto.v, data: new Date().toISOString().slice(0, 10) });
      est.enqueteCel = false; ctx.render(false);
    }
  });
  // Gráfico: arrastar o dedo mostra data e preço.
  const mover = (e) => {
    const area = e.target.closest?.('.gn-area');
    if (!area) return;
    const box = area.closest('.gn'), svg = box.querySelector('svg'), pts = JSON.parse(box.dataset.pts || '[]');
    const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 320;
    let k = 0; pts.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(pts[k][0] - x)) k = i; });
    const [px, py, data, preco] = pts[k];
    const g = svg.querySelector('.gn-marca'); g.style.display = '';
    g.querySelector('.gn-linha').setAttribute('x1', px); g.querySelector('.gn-linha').setAttribute('x2', px);
    g.querySelector('.gn-ponto').setAttribute('cx', px); g.querySelector('.gn-ponto').setAttribute('cy', py);
    box.querySelector('.gn-dica').innerHTML = `${data}: <b>${brl(preco)}</b>`;
  };
  document.addEventListener('pointermove', mover);
  document.addEventListener('pointerdown', mover);
}
