// Terminal Amendoim Brasil (plano Empresa): a mesa de decisão de quem exporta, beneficia ou compra para a indústria.
// Exportação mês a mês (Comex Stat, via /api/exportacao), preço FOB por destino e por tipo (levantamento Amendoim Brasil
// em /data/terminal.json) e a leitura da semana. Feito para a tela do computador; no celular as tabelas rolam de lado.
import { conteudo, assinante, sessao } from '/esboco-dados.js';
import { cartaoExclusivo } from '/esboco3.js';
import { telaMundo } from '/exportacao.js';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const OLEO_EM_GRAO = 2.5; // 1 t de óleo ≈ 2,5 t de grão (rendimento de 40% no esmagamento)
const est = { comex: null, mundo: null, dados: null, carregando: false, erro: '', prod: 'grao', tipoVisao: 'mes', aba: 'exportacao' };
let ctx = { render: () => {}, evento: () => {} };

const nf = (n, d = 0) => (n == null || !isFinite(n) ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pc = (n) => (n == null || !isFinite(n) ? '–' : `${n > 0 ? '+' : ''}${nf(n, 1)}%`);
const vc = (v) => (v == null || !isFinite(v) ? '<span class="mini">–</span>' : `<span class="${v > 0 ? 'dx-sobe' : v < 0 ? 'dx-cai' : ''}">${pc(v)}</span>`);
const varia = (a, b) => (a != null && b ? ((a - b) / b) * 100 : null);
const mil = (n) => (n == null || !isFinite(n) ? '–' : nf(n / 1000, 1));
const mesPt = (ym) => { const [a, m] = ym.split('-'); return `${MESES[+m - 1].toLowerCase()}/${a.slice(2)}`; };
const info = (titulo, texto) => `<details class="abre tm-info"><summary>ⓘ ${titulo}</summary><p class="es-txt" style="margin:0 0 10px">${texto}</p></details>`;

async function carregar() {
  est.carregando = true; est.erro = ''; ctx.render(false);
  try {
    const [c, t] = await Promise.all([
      fetch('/api/exportacao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/data/terminal.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]);
    est.comex = c?.brasil || null; est.mundo = c?.mundo || null; est.dados = t;
    if (!c && !t) est.erro = 'Não foi possível carregar agora. Verifique a internet e tente de novo.';
    ctx.evento('terminal-abriu');
  } finally { est.carregando = false; ctx.render(false); }
}

// ---------- Comex: série por produto (óleo convertido em grão para o total) ----------
function serie(b, prod) {
  if (prod === 'grao' || prod === 'oleo') return b.series[prod] || {};
  const out = {};
  for (const [p, fator] of [['grao', 1], ['oleo', OLEO_EM_GRAO]]) for (const [a, s] of Object.entries(b.series[p] || {})) {
    const o = (out[a] = out[a] || { t: Array(12).fill(null), usd: Array(12).fill(null) });
    s.t.forEach((v, i) => { if (v != null) { o.t[i] = (o.t[i] || 0) + v * fator; o.usd[i] = (o.usd[i] || 0) + (s.usd[i] || 0); } });
  }
  return out;
}

function blocoExportacao(b, h) {
  const s = serie(b, est.prod);
  const anos = Object.keys(s).map(Number).sort((x, y) => x - y).slice(-5);
  const atual = b.ano, n = b.mes;
  const soma = (a, de = 0, ate = 12) => (s[a]?.t || []).slice(de, ate).reduce((x, v) => x + (v || 0), 0);
  const ytd = Object.fromEntries(anos.map((a) => [a, soma(a, 0, n)]));
  const fechados = anos.filter((a) => a < atual && soma(a) > 0 && (s[a]?.t || []).filter((v) => v != null).length === 12);
  // Projeção com sazonalidade: quanto os mesmos meses pesaram no ano, na média dos anos fechados.
  const peso = fechados.length ? fechados.reduce((x, a) => x + soma(a, 0, n) / soma(a), 0) / fechados.length : n / 12;
  const projSazonal = ytd[atual] / peso, projLinear = (ytd[atual] / n) * 12;
  const ultimo = s[atual]?.t[n - 1], mesmosMes = anos.filter((a) => a < atual).map((a) => s[a]?.t[n - 1]).filter((v) => v != null);
  const recorde = ultimo != null && mesmosMes.length && ultimo > Math.max(...mesmosMes);
  const mediaMes = mesmosMes.length ? mesmosMes.reduce((x, v) => x + v, 0) / mesmosMes.length : null;
  const linha = (i) => {
    const vals = anos.map((a) => s[a]?.t[i] ?? null), max = Math.max(...vals.filter((v) => v != null));
    return `<tr><th>${MESES[i]}</th>${vals.map((x, k) => `<td class="${k < anos.length - 3 ? 'tm-ant ' : ''}${x != null && x === max && vals.filter((y) => y != null).length > 1 ? 'dx-max' : ''}">${mil(x)}</td>`).join('')}<td class="dx-var">${i < n ? vc(varia(s[atual]?.t[i], s[atual - 1]?.t[i])) : ''}</td></tr>`;
  };
  const rot = { grao: 'Grão (NCM 1202)', oleo: 'Óleo (NCM 1508)', total: 'Total em grão' }[est.prod];
  const ate = MESES[n - 1].toLowerCase();
  return `<section class="cartao tm-bloco">
    <div class="cartao-cab"><b class="es-h1" style="font-size:18px">Exportação do Brasil</b><span class="mini">Comex Stat · até ${ate}/${atual}</span></div>
    <div class="chips">${[['grao', 'Grão'], ['oleo', 'Óleo'], ['total', 'Total em grão']].map(([k, t]) => `<button class="chip" data-tm-prod="${k}" aria-pressed="${est.prod === k}">${t}</button>`).join('')}</div>
    <div class="dx-tiles tm-tiles">
      <div class="dx-tile"><span>${MESES[n - 1]}/${String(atual).slice(2)} ${recorde ? '<em class="tm-recorde">recorde</em>' : ''}</span><b class="num">${nf(ultimo)} t</b><small>${vc(varia(ultimo, mediaMes))} vs média de ${MESES[n - 1].toLowerCase()} (${anos.filter((a) => a < atual).length} anos)</small></div>
      <div class="dx-tile"><span>Jan–${ate}/${String(atual).slice(2)}</span><b class="num">${nf(ytd[atual])} t</b><small>${vc(varia(ytd[atual], ytd[atual - 1]))} vs ${atual - 1}</small></div>
      <div class="dx-tile"><span>Projeção ${atual} (sazonal)</span><b class="num">${nf(projSazonal)} t</b><small>${vc(varia(projSazonal, soma(atual - 1)))} vs ${atual - 1} · linear ${nf(projLinear)}</small></div>
    </div>
    <div class="tabela-rolar"><table class="tabela dx-tabela tm-tabela">
      <thead><tr><th>${rot}</th>${anos.map((a, i) => `<th class="${i < anos.length - 3 ? 'tm-ant' : ''}">${a}</th>`).join('')}<th>${String(atual).slice(2)}×${String(atual - 1).slice(2)}</th></tr></thead>
      <tbody>${MESES.map((_, i) => linha(i)).join('')}</tbody>
      <tfoot>
        <tr><th>Até ${ate}</th>${anos.map((a, k) => `<td class="${k < anos.length - 3 ? 'tm-ant' : ''}">${mil(ytd[a])}</td>`).join('')}<td class="dx-var">${vc(varia(ytd[atual], ytd[atual - 1]))}</td></tr>
        <tr><th>Ano x ano</th>${anos.map((a, k) => `<td class="dx-var ${k < anos.length - 3 ? 'tm-ant' : ''}">${ytd[a - 1] ? vc(varia(ytd[a], ytd[a - 1])) : ''}</td>`).join('')}<td></td></tr>
        <tr><th>Ano todo</th>${anos.map((a, k) => `<td class="${k < anos.length - 3 ? 'tm-ant' : ''}">${a === atual ? `<i>${mil(projSazonal)}</i>` : mil(soma(a))}</td>`).join('')}<td class="dx-var">${vc(varia(projSazonal, soma(atual - 1)))}</td></tr>
      </tfoot>
    </table></div>
    <span class="mini"><i class="dx-leg"></i> maior mês entre os anos (mil t) · ${atual} em itálico é a projeção<span class="tm-so-cel"> · no celular aparecem os 3 últimos anos; vire a tela para ver os 5</span></span>
    ${info('Como ler', `<b>Recorde</b> é o maior valor daquele mês entre os anos da tabela. <b>Até ${ate}</b> soma os mesmos meses de cada ano, para comparar igual com igual. <b>Projeção sazonal</b> usa o peso que jan–${ate} teve nos anos fechados; a linear (média × 12) subestima quando o pico de embarque é no segundo semestre. <b>Total em grão</b> converte o óleo em amendoim equivalente (1 t de óleo ≈ ${OLEO_EM_GRAO} t de grão, rendimento de 40%). Fonte: Comex Stat/MDIC, publicado com cerca de um mês de atraso.`)}
  </section>`;
}

// ---------- Preço FOB por destino, mês a mês ----------
function blocoDestinos(d, h) {
  const meses = Object.keys(d.precoMes).sort(), dest = d.destinos.slice(0, 10);
  const ultimo = meses[meses.length - 1];
  const faixa = (v) => { if (v == null) return ''; const t = Math.max(0, Math.min(1, (v - 850) / 600)); return `style="background:rgba(0,119,49,${(0.06 + t * 0.3).toFixed(2)})"`; };
  const r12 = d.ranking.slice(0, 12), tot = d.ranking.reduce((x, r) => x + r.t, 0);
  return `<section class="cartao tm-bloco">
    <div class="cartao-cab"><b class="es-h1" style="font-size:18px">Preço FOB por destino</b><span class="mini">US$/t · ${mesPt(meses[0])} a ${mesPt(ultimo)}</span></div>
    <div class="tabela-rolar"><table class="tabela dx-tabela tm-tabela tm-dest">
      <thead><tr><th>Mês</th>${dest.map((p) => `<th>${h.esc(p)}</th>`).join('')}<th>Brasil</th></tr></thead>
      <tbody>${meses.map((m) => { const tot = d.totalMes.find((x) => x.mes === m); return `<tr><th>${mesPt(m)}</th>${dest.map((p) => { const v = d.precoMes[m][p]; return `<td ${faixa(v)}>${v == null ? '<span class="mini">–</span>' : nf(v)}</td>`; }).join('')}<td><b>${nf(tot?.usdt)}</b></td></tr>`; }).join('')}</tbody>
      <tfoot><tr><th>12 meses</th>${dest.map((p) => { const r = d.ranking.find((x) => x.destino === p); return `<td>${nf(r?.usdt)}</td>`; }).join('')}<td>${nf(Math.round(d.ranking.reduce((x, r) => x + r.usdt * r.t, 0) / tot))}</td></tr>
      <tr><th>${mesPt(ultimo)} vs 12 m</th>${dest.map((p) => { const r = d.ranking.find((x) => x.destino === p); return `<td class="dx-var">${vc(varia(r?.ago, r?.usdt))}</td>`; }).join('')}<td></td></tr></tfoot>
    </table></div>
    <span class="mini">Quanto mais escuro o verde, maior o preço. "Brasil" é a média de todos os destinos no mês.</span>
    ${info('Como ler', `Preço = valor FOB declarado nos embarques ÷ toneladas embarcadas, por mês de embarque e país de destino. Já sem frete e seguro. Mistura todos os tipos de grão (cru, blancheado, banda), por isso um destino que compra blancheado aparece mais caro. O mês mais recente pode mudar um pouco quando o governo fecha a publicação. ${h.esc(d.fonte)}.`)}
  </section>
  <section class="cartao tm-bloco">
    <div class="cartao-cab"><b class="es-h1" style="font-size:18px">Quem compra o amendoim do Brasil</b><span class="mini">12 meses até ${mesPt(ultimo)}</span></div>
    <div class="tabela-rolar"><table class="tabela dx-tabela tm-tabela tm-rank">
      <thead><tr><th>#</th><th>Destino</th><th>Toneladas</th><th>%</th><th>US$/t 12 m</th><th>${mesPt(ultimo)}</th><th>vs 12 m</th></tr></thead>
      <tbody>${r12.map((r, i) => `<tr><td class="mini">${i + 1}</td><th>${h.esc(r.destino)}</th><td>${nf(r.t)}</td><td><span class="tm-barra" style="width:${Math.round((r.part / r12[0].part) * 60)}px"></span>${nf(r.part, 1)}</td><td>${nf(r.usdt)}</td><td><b>${nf(r.ago)}</b></td><td class="dx-var">${vc(varia(r.ago, r.usdt))}</td></tr>`).join('')}</tbody>
    </table></div>
    ${info('Como ler', 'Ranking por volume embarcado nos últimos 12 meses. "vs 12 m" compara o preço do último mês com a média dos 12 meses daquele destino: positivo é destino pagando acima do que costuma pagar.')}
  </section>`;
}

// ---------- Preço por tipo de grão (classificação pela descrição do embarque) ----------
function blocoTipos(t, h) {
  const meses = Object.keys(t.mes).sort(), cls = t.classes;
  const curto = (c) => c.replace('blancheado', 'blanch.').replace(' inteiro', '');
  const corpoMes = `<table class="tabela dx-tabela tm-tabela tm-dest"><thead><tr><th>Mês</th>${cls.map((c) => `<th>${h.esc(curto(c))}</th>`).join('')}</tr></thead>
    <tbody>${meses.map((m) => `<tr><th>${mesPt(m)}</th>${cls.map((c) => { const x = t.mes[m][c]; return `<td title="${x ? `${nf(x.t)} t · ${x.n} embarques` : ''}">${x ? nf(x.usdt) : '<span class="mini">–</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><th>Toneladas</th>${cls.map((c) => `<td>${nf(meses.reduce((s, m) => s + (t.mes[m][c]?.t || 0), 0))}</td>`).join('')}</tr></tfoot></table>`;
  const dests = Object.entries(t.destino).map(([p, v]) => [p, v, Object.values(v).reduce((s, x) => s + x.t, 0)]).sort((a, b) => b[2] - a[2]);
  const corpoDest = `<table class="tabela dx-tabela tm-tabela tm-dest"><thead><tr><th>Destino</th>${cls.map((c) => `<th>${h.esc(curto(c))}</th>`).join('')}<th>t</th></tr></thead>
    <tbody>${dests.map(([p, v, tt]) => `<tr><th>${h.esc(p)}</th>${cls.map((c) => { const x = v[c]; return `<td title="${x ? `${nf(x.t)} t · ${x.n} embarques` : ''}">${x ? nf(x.usdt) : '<span class="mini">–</span>'}</td>`; }).join('')}<td class="mini">${nf(tt)}</td></tr>`).join('')}</tbody></table>`;
  return `<section class="cartao tm-bloco">
    <div class="cartao-cab"><b class="es-h1" style="font-size:18px">Preço por tipo de grão</b><span class="mini">US$/t · ${mesPt(t.periodo.de)} a ${mesPt(t.periodo.ate)}</span></div>
    <div class="segmento"><button data-tm-tipo="mes" aria-pressed="${est.tipoVisao === 'mes'}">Por mês</button><button data-tm-tipo="destino" aria-pressed="${est.tipoVisao === 'destino'}">Por destino</button></div>
    <div class="tabela-rolar">${est.tipoVisao === 'mes' ? corpoMes : corpoDest}</div>
    <span class="mini">Cru e blancheado, inteiro por calibre e banda. Passe o mouse (ou toque) no número para ver toneladas e embarques. ${h.esc(t.nota)}</span>
    ${info('Como ler', 'O tipo e o calibre vêm da descrição do embarque (BL): "blanched", "split", "38/42"… Embarques sem descrição ou com preço fora da faixa (BL com outro produto junto) ficam de fora. É a leitura de mercado da Amendoim Brasil, não uma estatística oficial. Mostra o prêmio que o blancheado e cada calibre estão pagando em cada mercado.')}
  </section>`;
}

function blocoLeitura(d, h) {
  const linhas = conteudo().terminalLeitura?.length ? conteudo().terminalLeitura : d?.leitura || [];
  if (!linhas.length) return '';
  return `<section class="cartao tm-bloco tm-leitura">
    <div class="cartao-cab"><b class="es-h1" style="font-size:18px">Leitura Amendoim Brasil</b><span class="mini">${d?.atualizado ? new Date(d.atualizado + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</span></div>
    <ul class="tm-lista">${linhas.map((l) => `<li>${h.esc(l)}</li>`).join('')}</ul>
  </section>`;
}

export function telaTerminal(h) {
  const topo = `<header class="topo tm-topo"><a class="link-mini" href="#/conta" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Assinantes</a>
    <div><h1>Terminal Amendoim Brasil</h1><div class="sub">Exportação, preço por destino e por tipo · para decidir</div></div></header>`;
  const s = sessao(), ok = assinante() && s?.plano === 'empresa';
  if (!ok) return topo + cartaoExclusivo(h, 'A mesa de decisão de quem exporta', 'Exportação mês a mês com recorde e projeção, preço FOB por destino e por tipo de grão (cru, blancheado, banda, calibre), ranking de compradores e a leitura da Amendoim Brasil. Atualizado todo mês.', ['Tabela de 5 anos, estilo mesa de exportação', 'Preço por destino, mês a mês', 'Preço por tipo e calibre', 'Leitura de mercado da Amendoim Brasil'], '#/conta/planos', 'Conhecer o plano Empresa');
  if (!est.dados && !est.comex && !est.carregando && !est.erro) setTimeout(carregar);
  if (!est.dados && !est.comex) return `${topo}<section class="cartao dx-trava">${est.erro ? `<b style="font-size:18px">Não foi possível abrir agora</b><span class="mini" style="color:#B3261E;font-weight:700">${h.esc(est.erro)}</span><button class="btn btn-verde" type="button" data-tm-tentar>Tentar de novo</button>` : '<b style="font-size:18px">Abrindo o terminal…</b><span class="mini">Buscando Comex Stat e o levantamento de preços.</span>'}</section>`;
  const d = est.dados;
  const abas = [['exportacao', 'Exportação'], ['destinos', 'Destinos'], ['tipos', 'Por tipo'], ['mundo', 'Mundo']];
  let corpo = '';
  if (est.aba === 'exportacao') corpo = est.comex ? blocoExportacao(est.comex, h) : '<div class="vazio">Comex Stat indisponível agora.</div>';
  if (est.aba === 'destinos') corpo = d ? blocoDestinos(d, h) : '<div class="vazio">Levantamento indisponível agora.</div>';
  if (est.aba === 'tipos') corpo = d?.tipos ? blocoTipos(d.tipos, h) : '<div class="vazio">Levantamento por tipo indisponível agora.</div>';
  if (est.aba === 'mundo') corpo = est.mundo ? `<div class="tm-mundo">${telaMundo(est.mundo, est.comex)}</div>` : '<div class="vazio">USDA indisponível agora.</div>';
  return `${topo}
  <div class="segmento tm-abas">${abas.map(([k, t]) => `<button data-tm-aba="${k}" aria-pressed="${est.aba === k}">${t}</button>`).join('')}</div>
  <div class="tm-grade tm-aba-${est.aba}">
    ${est.aba === 'exportacao' ? blocoLeitura(d, h) : ''}
    ${corpo}
  </div>
  <p class="mini dx-nota">Fontes: Comex Stat/MDIC e levantamento Amendoim Brasil${d?.atualizado ? ` · conferido em ${new Date(d.atualizado + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}. Os dados oficiais saem com cerca de um mês de atraso. Uso exclusivo do assinante; não repasse as tabelas.</p>`;
}

export function ligarTerminal(render, evento) {
  ctx = { render, evento };
  document.addEventListener('click', (e) => {
    let x;
    if ((x = e.target.closest('[data-tm-aba]'))) { est.aba = x.dataset.tmAba; evento('terminal-' + est.aba); render(false); return; }
    if ((x = e.target.closest('[data-tm-prod]'))) { est.prod = x.dataset.tmProd; render(false); return; }
    if ((x = e.target.closest('[data-tm-tipo]'))) { est.tipoVisao = x.dataset.tmTipo; render(false); return; }
    if (e.target.closest('[data-tm-tentar]')) { est.erro = ''; render(false); }
  });
}
