// Dólar: gráfico e histórico (AwesomeAPI, cotação comercial PTAX/intradiária), aberto ao tocar no dólar do "Mercado hoje".
const est = { periodo: '1M', dados: {}, carregando: false, erro: '' };
let ctx = { render: () => {}, evento: () => {} };
const DIAS = { '5D': 7, '1M': 31, '6M': 183, '1A': 366 };
const brl = (n, d = 2) => (n == null || !isFinite(n) ? '—' : 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pc = (n) => (n == null || !isFinite(n) ? '–' : `${n > 0 ? '+' : ''}${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const diaDe = (ts) => new Date(ts * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

async function carregar(p) {
  if (est.dados[p] || est.carregando) return;
  est.carregando = true; est.erro = ''; ctx.render(false);
  try {
    const r = await fetch(`https://economia.awesomeapi.com.br/json/daily/USD-BRL/${DIAS[p]}`);
    if (!r.ok) throw new Error('http');
    const lista = (await r.json()).map((x) => ({ ts: +x.timestamp, bid: +x.bid, high: +x.high, low: +x.low })).filter((x) => x.bid > 0).sort((a, b) => a.ts - b.ts);
    // um ponto por dia (o primeiro item da API é a cotação de agora)
    const porDia = new Map(); lista.forEach((x) => porDia.set(diaDe(x.ts), x));
    est.dados[p] = [...porDia.values()];
  } catch (e) { est.erro = 'Não foi possível buscar o dólar agora.'; }
  finally { est.carregando = false; ctx.render(false); }
}

function grafico(pts) {
  const W = 320, H = 150, pl = 40, pb = 20, pt = 10;
  const vals = pts.map((p) => p.bid);
  let min = Math.min(...vals), max = Math.max(...vals);
  const folga = Math.max(0.02, (max - min) * 0.15); min -= folga; max += folga;
  const xs = pts.map((_, i) => pl + (i * (W - pl - 8)) / Math.max(1, pts.length - 1));
  const ys = pts.map((p) => pt + (H - pt - pb) * (1 - (p.bid - min) / (max - min)));
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${d} L${xs[xs.length - 1].toFixed(1)} ${H - pb} L${pl} ${H - pb} Z`;
  const sobe = vals[vals.length - 1] >= vals[0];
  const cor = sobe ? '#B3261E' : '#007731'; // dólar subindo pesa contra o comprador em R$: vermelho; caindo: verde
  const ticks = [min + folga, (min + max) / 2, max - folga];
  const passo = Math.max(1, Math.ceil(pts.length / 5));
  const rot = pts.map((p, i) => (i % passo === 0 || i === pts.length - 1) ? `<text class="eixo" x="${xs[i].toFixed(1)}" y="${H - 5}" text-anchor="${i === pts.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}">${diaDe(p.ts).slice(0, 5)}</text>` : '').join('');
  return `<svg class="gn-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dólar">
    <defs><linearGradient id="dl-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".22"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((t) => { const y = pt + (H - pt - pb) * (1 - (t - min) / (max - min)); return `<line x1="${pl}" x2="${W - 8}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E6E1D6"/><text class="eixo" x="${pl - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end">${t.toFixed(2).replace('.', ',')}</text>`; }).join('')}
    <path d="${area}" fill="url(#dl-g)"/><path d="${d}" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="${xs[xs.length - 1].toFixed(1)}" cy="${ys[ys.length - 1].toFixed(1)}" r="4.5" fill="${cor}" stroke="#fff" stroke-width="2"/>
    ${rot}
  </svg>`;
}

export function telaDolar(D, h) {
  const { ic, I } = h;
  const topo = `<header class="topo"><a class="link-mini" href="#/mercado" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Mercado</a>
    <div><h1>Dólar</h1><div class="sub">Comercial · R$ por US$ · ao vivo</div></div></header>`;
  const p = est.periodo, pts = est.dados[p];
  if (!pts && !est.carregando && !est.erro) setTimeout(() => carregar(p));
  const chips = `<div class="chips" role="group" aria-label="Período">${Object.keys(DIAS).map((k) => `<button class="chip" data-dl-per="${k}" aria-pressed="${p === k}">${k === '5D' ? '5 dias' : k === '1M' ? '1 mês' : k === '6M' ? '6 meses' : '1 ano'}</button>`).join('')}</div>`;
  if (!pts) return `${topo}<section class="cartao">${chips}<div class="vazio">${est.erro ? h.esc(est.erro) + ' <button class="link-mini" data-dl-tentar>Tentar de novo</button>' : 'Buscando o dólar…'}</div></section>`;
  const ult = pts[pts.length - 1], ant = pts[pts.length - 2], ini = pts[0];
  const vDia = ant ? ((ult.bid - ant.bid) / ant.bid) * 100 : null, vPer = ((ult.bid - ini.bid) / ini.bid) * 100;
  const max = Math.max(...pts.map((x) => x.high || x.bid)), min = Math.min(...pts.map((x) => x.low || x.bid));
  const agora = D.dolar?.bid || ult.bid, vAgora = D.dolar?.pct ?? vDia;
  const ultimos = pts.slice(-6).reverse();
  return `${topo}
  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Agora</span><span class="mini">${D.dolar ? 'ao vivo · AwesomeAPI' : 'último fechamento'}</span></div>
    <div><b class="num" style="font-size:34px">${brl(agora)}</b> <span class="${vAgora > 0 ? 'dx-cai' : vAgora < 0 ? 'dx-sobe' : ''}" style="font-weight:800">${pc(vAgora)} hoje</span></div>
    ${chips}
    ${grafico(pts)}
    <div class="dx-tiles" style="grid-template-columns:repeat(3,1fr)">
      <div class="dx-tile"><span>No período</span><b class="num">${pc(vPer)}</b><small>de ${brl(ini.bid)}</small></div>
      <div class="dx-tile"><span>Máxima</span><b class="num">${brl(max)}</b></div>
      <div class="dx-tile"><span>Mínima</span><b class="num">${brl(min)}</b></div>
    </div>
    <span class="mini">Verde quando o dólar cai (amendoim brasileiro mais caro lá fora, pior para exportar); vermelho quando sobe (exportação paga mais em R$).</span>
  </section>
  <section class="cartao" style="gap:4px">
    <div class="cartao-cab"><span class="rotulo">Últimos dias</span><span class="mini">fechamento</span></div>
    ${ultimos.map((x, i) => { const a = ultimos[i + 1]; const v = a ? ((x.bid - a.bid) / a.bid) * 100 : null; return `<div class="lista-linha"><span class="cresce">${diaDe(x.ts)}</span><b class="num">${brl(x.bid)}</b><span class="mini ${v > 0 ? 'dx-cai' : v < 0 ? 'dx-sobe' : ''}" style="min-width:64px;text-align:right">${pc(v)}</span></div>`; }).join('')}
  </section>
  <section class="cartao" style="gap:6px">
    <span class="rotulo">O que o dólar faz com o seu preço</span>
    <span class="es-txt">A exportação vende em dólar e paga em real. Cada 1% de alta no dólar é ~1% a mais no preço de paridade da casca para o exportador. Por isso o dólar subindo costuma segurar o preço interno, e caindo tira força da exportação.</span>
    <a class="link-mini" href="#/ferramentas">Ver as ferramentas de conta</a>
  </section>
  <p class="mini dx-nota">Fonte: AwesomeAPI (cotação comercial). O "agora" acompanha o mercado; o histórico é o fechamento de cada dia.</p>`;
}

export function ligarDolar(render, evento) {
  ctx = { render, evento };
  document.addEventListener('click', (e) => {
    let x;
    if ((x = e.target.closest('[data-dl-per]'))) { est.periodo = x.dataset.dlPer; evento('dolar-' + est.periodo); render(false); return; }
    if (e.target.closest('[data-dl-tentar]')) { est.erro = ''; render(false); }
  });
}
