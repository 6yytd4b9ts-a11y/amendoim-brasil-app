// Área da consultoria: dados de exportação aprofundados (Brasil e mundo), aberta com o código dos clientes.
// Os números vêm de /api/exportacao (Comex Stat e USDA), que só responde com o código certo.
import { bandeira } from '/bandeiras.js';

const CHAVE = 'ab-cod-consultoria';
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PROD = { grao: 'Amendoim', oleo: 'Óleo', total: 'Total' };
const SIGLA = { BR: 'BR', AR: 'AR', US: 'US', IN: 'IN', CH: 'CN' };
const est = { dados: null, carregando: false, erro: '', aba: 'brasil', prod: 'grao', anoMundo: null };
let ctx = { render: () => {}, evento: () => {} };

const codigoSalvo = () => { try { return localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; } };
const nf = (n, d = 0) => (n == null || !isFinite(n) ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pc = (n) => (n == null || !isFinite(n) ? '–' : `${n > 0 ? '+' : ''}${nf(n, 1)}%`);
// Variação colorida e curta para as tabelas (verde sobe, vermelho cai).
const vc = (v) => (v == null || !isFinite(v) ? '' : `<span class="${v > 0 ? 'dx-sobe' : v < 0 ? 'dx-cai' : ''}">${pc(v)}</span>`);
const varia = (a, b) => (a != null && b ? ((a - b) / b) * 100 : null);
const seta = (v) => (v == null || !isFinite(v) ? '' : `<span class="dx-seta ${v > 0 ? 'sobe' : v < 0 ? 'cai' : ''}">${v > 0 ? '▲' : v < 0 ? '▼' : '='}</span>`);
const mil = (n) => (n == null || !isFinite(n) ? '–' : nf(n / 1000, 1)); // toneladas → mil t (cabe no celular)
const safra = (a) => `${String(a).slice(2)}/${String(a + 1).slice(2)}`;

async function carregar(codigo) {
  est.carregando = true; est.erro = ''; ctx.render(false);
  try {
    const r = await fetch('/api/exportacao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo }) });
    if (r.status === 401) { est.erro = 'Código incorreto.'; try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ } return; }
    if (r.status === 429) { est.erro = 'Muitas tentativas hoje. Fale com o Helder.'; return; }
    if (!r.ok) throw new Error('http');
    est.dados = await r.json();
    try { localStorage.setItem(CHAVE, codigo); } catch (e) { /* ignora */ }
    ctx.evento('dados-acessou');
  } catch (e) { est.erro = 'Não foi possível carregar agora. Verifique a internet e tente de novo.'; }
  finally { est.carregando = false; ctx.render(false); }
}

// ---------- Brasil: tabela mês a mês dos últimos 4 anos ----------
function serie(b, prod) {
  if (prod !== 'total') return b.series[prod] || {};
  const out = {};
  for (const p of ['grao', 'oleo']) for (const [a, s] of Object.entries(b.series[p] || {})) {
    const o = (out[a] = out[a] || { t: Array(12).fill(null), usd: Array(12).fill(null) });
    s.t.forEach((v, i) => { if (v != null) { o.t[i] = (o.t[i] || 0) + v; o.usd[i] = (o.usd[i] || 0) + (s.usd[i] || 0); } });
  }
  return out;
}

function telaBrasil(b) {
  const s = serie(b, est.prod);
  const anos = Object.keys(s).map(Number).sort((x, y) => y - x).slice(0, 4); // 4 anos, mais recente primeiro (cabe no celular)
  const atual = b.ano, n = b.mes;
  const soma = (a, ate = 12) => (s[a]?.t || []).slice(0, ate).reduce((x, v) => x + (v || 0), 0);
  const somaUsd = (a, ate = 12) => (s[a]?.usd || []).slice(0, ate).reduce((x, v) => x + (v || 0), 0);
  const ytd = Object.fromEntries(anos.map((a) => [a, soma(a, n)]));
  const precoYtd = Object.fromEntries(anos.map((a) => [a, ytd[a] ? somaUsd(a, n) / ytd[a] : null]));
  const projecao = ytd[atual] / n * 12;
  const linhaMes = (i) => {
    const vals = anos.map((a) => s[a]?.t[i] ?? null);
    const max = Math.max(...vals.filter((v) => v != null));
    const v = varia(s[atual]?.t[i], s[atual - 1]?.t[i]);
    return `<tr><th>${MESES[i]}</th>${vals.map((x) => `<td class="${x != null && x === max && vals.filter((y) => y != null).length > 1 ? 'dx-max' : ''}">${mil(x)}</td>`).join('')}<td class="dx-var">${i < n ? vc(v) : ''}</td></tr>`;
  };
  const vAno = varia(ytd[atual], ytd[atual - 1]), vPreco = varia(precoYtd[atual], precoYtd[atual - 1]), vProj = varia(projecao, soma(atual - 1));
  const ate = MESES[n - 1].toLowerCase();
  return `<div class="dx-tiles">
      <div class="dx-tile"><span>Embarcado jan–${ate}/${String(atual).slice(2)}</span><b class="num">${nf(ytd[atual])} t</b><small>${seta(vAno)}${pc(vAno)} vs ${atual - 1}</small></div>
      <div class="dx-tile"><span>Projeção ${atual}</span><b class="num">${nf(projecao)} t</b><small>${seta(vProj)}${pc(vProj)} vs ${atual - 1} inteiro</small></div>
      <div class="dx-tile"><span>Preço médio</span><b class="num">US$ ${nf(precoYtd[atual])}/t</b><small>${seta(vPreco)}${pc(vPreco)} vs ${atual - 1}</small></div>
    </div>
    <div class="chips">${Object.entries(PROD).map(([k, t]) => `<button class="chip" data-dx-prod="${k}" aria-pressed="${est.prod === k}">${t}</button>`).join('')}</div>
    <section class="cartao dx-cartao">
      <div class="cartao-cab"><span class="rotulo">Exportação mês a mês · mil toneladas</span><span class="mini">${est.prod === 'grao' ? 'NCM 1202' : est.prod === 'oleo' ? 'NCM 1508' : '1202 + 1508'}</span></div>
      <div class="tabela-rolar"><table class="tabela dx-tabela">
        <thead><tr><th>Mês</th>${anos.map((a) => `<th>${a}</th>`).join('')}<th>${String(atual).slice(2)}×${String(atual - 1).slice(2)}</th></tr></thead>
        <tbody>${MESES.map((_, i) => linhaMes(i)).join('')}</tbody>
        <tfoot>
          <tr><th>Até ${ate}</th>${anos.map((a) => `<td>${mil(ytd[a])}</td>`).join('')}<td class="dx-var">${vc(vAno)}</td></tr>
          <tr><th>Ano x ano</th>${anos.map((a) => { const v = varia(ytd[a], ytd[a - 1]); return `<td class="dx-var">${ytd[a - 1] ? vc(v) : ''}</td>`; }).join('')}<td></td></tr>
          <tr><th>Ano todo</th>${anos.map((a) => `<td>${a === atual ? `<i>${mil(projecao)}</i>` : mil(soma(a))}</td>`).join('')}<td class="dx-var">${vc(vProj)}</td></tr>
          <tr><th>US$/t</th>${anos.map((a) => `<td>${nf(precoYtd[a])}</td>`).join('')}<td class="dx-var">${vc(vPreco)}</td></tr>
        </tfoot>
      </table></div>
      <span class="mini"><i class="dx-leg"></i> maior mês entre os anos · "Até ${ate}" compara os mesmos meses de cada ano · ${atual} em itálico é a projeção (média mensal × 12) · US$/t é o preço médio FOB do período.</span>
    </section>`;
}

// ---------- Destinos e preço por país ----------
function telaDestinos(b) {
  const ate = MESES[b.mes - 1].toLowerCase();
  const top = b.destinosGrao.slice(0, 12), resto = b.destinosGrao.slice(12);
  const outros = resto.reduce((s, d) => ({ t: s.t + d.t, part: s.part + d.part }), { t: 0, part: 0 });
  return `<section class="cartao dx-cartao">
      <div class="cartao-cab"><span class="rotulo">Amendoim · destinos jan–${ate}/${b.ano}</span><span class="mini">t · US$/t FOB</span></div>
      <div class="tabela-rolar"><table class="tabela dx-tabela dx-dest">
        <thead><tr><th>País</th><th>Toneladas</th><th>%</th><th>US$/t</th><th>vs ${b.ano - 1}</th></tr></thead>
        <tbody>${top.map((d) => { const v = varia(d.preco, d.precoAnt); return `<tr><th>${d.pais}</th><td>${nf(d.t)}</td><td>${nf(d.part, 1)}</td><td>${nf(d.preco)}</td><td class="dx-var">${d.precoAnt ? vc(v) : '<small>novo</small>'}</td></tr>`; }).join('')}
        ${resto.length ? `<tr><th>Outros (${resto.length})</th><td>${nf(outros.t)}</td><td>${nf(outros.part, 1)}</td><td></td><td></td></tr>` : ''}</tbody>
      </table></div>
      <span class="mini">"vs ${b.ano - 1}" compara o preço médio pago por aquele país nos mesmos meses do ano passado.</span>
    </section>
    ${b.destinosOleo?.length ? `<section class="cartao dx-cartao">
      <div class="cartao-cab"><span class="rotulo">Óleo de amendoim · destinos jan–${ate}/${b.ano}</span></div>
      <table class="tabela dx-tabela dx-dest"><thead><tr><th>País</th><th>Toneladas</th><th>%</th><th>US$/t</th></tr></thead>
      <tbody>${b.destinosOleo.map((d) => `<tr><th>${d.pais}</th><td>${nf(d.t)}</td><td>${nf(d.part, 1)}</td><td>${nf(d.preco)}</td></tr>`).join('')}</tbody></table>
    </section>` : ''}`;
}

// ---------- Mundo: balanço dos grandes players (USDA) ----------
const LINHAS = [['producao', 'Produção'], ['exportacao', 'Exportação'], ['importacao', 'Importação'], ['esmagamento', 'Esmagamento'], ['alimentacao', 'Consumo alimentar'], ['estoqueFinal', 'Estoque final']];
// Produção do Brasil: Conab (mil t em casca). O 26/27 entra quando a Conab publicar (1º levantamento em 15/10/2026).
const CONAB = { 2024: 1159.7, 2025: 1281.5 };
const CONAB_FONTE = '10º levantamento, jul/2026';
const RENDIMENTO = 0.7; // 1 t de grão sem casca = 1/0,7 t em casca
// Exportação por safra comercial (mar a fev), do Comex Stat, convertida para casca. Devolve também quantos meses já saíram.
function expSafra(b, ano) {
  const sr = b.series?.grao || {};
  let t = 0, meses = 0;
  for (let i = 0; i < 12; i++) {
    const y = i < 10 ? ano : ano + 1, mi = i < 10 ? i + 2 : i - 10;
    if (y > b.ano || (y === b.ano && mi >= b.mes)) continue;
    const v = sr[y]?.t?.[mi];
    if (v == null) continue;
    t += v; meses++;
  }
  return meses ? { mil: t / RENDIMENTO / 1000, meses } : null;
}
const FONTE_PEQ = (t) => `<span class="dx-fonte">${t}</span>`;
function cartaoBrasil(b, anos) {
  const ex = Object.fromEntries(anos.map((a) => [a, b ? expSafra(b, a + 1) : null])); // a safra 24/25 é exportada de março/2025 a fevereiro/2026
  const parcial = anos.filter((a) => ex[a] && ex[a].meses < 12);
  const cel = (v, par) => (v == null ? '–' : `${nf(v)}${par ? '*' : ''}`);
  const pen = anos[anos.length - 2], ult = anos[anos.length - 1];
  const vprod = CONAB[ult] && CONAB[pen] ? varia(CONAB[ult], CONAB[pen]) : null;
  const ate = b ? MESES[b.mes - 1].toLowerCase() : '';
  return `<section class="cartao dx-cartao">
    <div class="cartao-cab"><span style="display:flex;align-items:center;gap:10px">${bandeira('BR', 30)}<b style="font-size:16px">Brasil</b></span><span class="mini">mil t em casca</span></div>
    <table class="tabela dx-tabela"><thead><tr><th></th>${anos.map((a) => `<th>${safra(a)}</th>`).join('')}<th>Var.</th></tr></thead>
    <tbody>
      <tr><th>Produção</th>${anos.map((a) => `<td>${a in CONAB ? nf(CONAB[a]) : '–'}</td>`).join('')}<td class="dx-var">${vc(vprod)}</td></tr>
      <tr><th>Exportação</th>${anos.map((a) => `<td>${ex[a] ? cel(ex[a].mil, ex[a].meses < 12) : '–'}</td>`).join('')}<td class="dx-var"></td></tr>
      <tr><th>Exportado da safra</th>${anos.map((a) => `<td>${ex[a] && a in CONAB && ex[a].meses === 12 ? nf((ex[a].mil / CONAB[a]) * 100) + '%' : '–'}</td>`).join('')}<td class="dx-var"></td></tr>
    </tbody></table>
    ${parcial.length ? `<span class="mini">* Parcial: ${parcial.map((a) => `${safra(a)} de março até ${ate}/${b.ano} (${ex[a].meses} meses)`).join('; ')}. A safra comercial vai de março a fevereiro.</span>` : ''}
    ${!(ult in CONAB) ? `<span class="mini">Safra ${safra(ult)}: a Conab publica a 1ª estimativa em 15/10/2026.</span>` : ''}
    ${FONTE_PEQ('Fonte: Conab (produção, ' + CONAB_FONTE + ') e Comex Stat/MDIC (exportação, grão ÷ 0,70)')}
  </section>`;
}
function cartaoPais(cod, p, anos) {
  const linhas = LINHAS.filter(([k]) => anos.some((a) => p.anos[a]?.[k]));
  return `<section class="cartao dx-cartao">
    <div class="cartao-cab"><span style="display:flex;align-items:center;gap:10px">${cod === 'MUNDO' ? '' : bandeira(SIGLA[cod] || cod, 30)}<b style="font-size:16px">${p.nome}</b></span><span class="mini">mil t em casca</span></div>
    <table class="tabela dx-tabela"><thead><tr><th></th>${anos.map((a) => `<th>${safra(a)}</th>`).join('')}<th>Var.</th></tr></thead>
    <tbody>${linhas.map(([k, rot]) => { const ult = p.anos[anos[anos.length - 1]]?.[k], pen = p.anos[anos[anos.length - 2]]?.[k]; const v = varia(ult, pen); return `<tr><th>${rot}</th>${anos.map((a) => `<td>${nf(p.anos[a]?.[k])}</td>`).join('')}<td class="dx-var">${vc(v)}</td></tr>`; }).join('')}</tbody></table>
    ${FONTE_PEQ('Fonte: USDA')}
  </section>`;
}
function telaMundo(m, b) {
  const anos = m.anos.slice(-3);
  const ordem = ['BR', 'AR', 'US', 'IN', 'CH'].filter((c) => m.paises[c]);
  return `<p class="mini dx-nota">Balanço anual por ano-safra. Brasil: Conab e Comex Stat; os demais países: USDA. A última coluna é projeção e muda a cada relatório.</p>
    ${ordem.map((c) => (c === 'BR' ? cartaoBrasil(b, anos) : cartaoPais(c, m.paises[c], anos))).join('')}
    ${cartaoPais('MUNDO', { nome: 'Mundo', anos: m.mundo }, anos)}`;
}

// ---------- Balanço Brasil: para onde vai o amendoim ----------
function telaBalanco(m, b) {
  const p = m.paises.BR;
  if (!p) return '<div class="vazio">Balanço do Brasil indisponível agora.</div>';
  const anos = m.anos.slice(-3);
  const usos = [['exportacao', 'Exportação', '#007731'], ['esmagamento', 'Esmagamento (óleo)', '#F4AD46'], ['alimentacao', 'Mercado interno (alimento)', '#2F6FA3'], ['outros', 'Semente, perdas e outros', '#9C8F7A'], ['estoqueFinal', 'Estoque de passagem', '#1B1B17']];
  const barra = (a) => {
    const x = p.anos[a] || {};
    const total = usos.reduce((s, [k]) => s + (x[k] || 0), 0) || 1;
    return `<div class="dx-barra-ano"><span>${safra(a)}</span><div class="dx-barra">${usos.map(([k, , cor]) => (x[k] ? `<i style="width:${(x[k] / total) * 100}%;background:${cor}" title="${nf(x[k])}"></i>` : '')).join('')}</div></div>`;
  };
  const oferta = (x) => (x.estoqueInicial || 0) + (x.producao || 0) + (x.importacao || 0);
  return `<section class="cartao dx-cartao">
      <div class="cartao-cab"><span class="rotulo">Para onde vai o amendoim do Brasil</span><span class="mini">mil t em casca</span></div>
      ${anos.map(barra).join('')}
      <div class="dx-legenda">${usos.map(([, rot, cor]) => `<span><i style="background:${cor}"></i>${rot}</span>`).join('')}</div>
      <table class="tabela dx-tabela"><thead><tr><th></th>${anos.map((a) => `<th>${safra(a)}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><th>Estoque inicial</th>${anos.map((a) => `<td>${nf(p.anos[a]?.estoqueInicial)}</td>`).join('')}</tr>
        <tr><th>Produção</th>${anos.map((a) => `<td>${nf(p.anos[a]?.producao)}</td>`).join('')}</tr>
        <tr class="dx-sub"><th>Oferta total</th>${anos.map((a) => `<td>${nf(oferta(p.anos[a] || {}))}</td>`).join('')}</tr>
        ${usos.map(([k, rot]) => `<tr><th>${rot}</th>${anos.map((a) => `<td>${nf(p.anos[a]?.[k])}</td>`).join('')}</tr>`).join('')}
      </tbody></table>
      <span class="mini">Fonte: USDA. Estoque de passagem = o que sobra para a safra seguinte. ${b ? `Exportação física do ano civil ${b.ano} está na aba Brasil (Comex Stat).` : ''}</span>
    </section>`;
}

// ---------- tela ----------
export function telaDados(D, h) {
  const { ic, I, esc, wa } = h;
  const topo = `<header class="topo"><a class="link-mini" href="#/mercado" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Mercado</a>
    <div><h1>Dados de exportação</h1><div class="sub">Brasil e mundo · clientes da consultoria</div></div></header>`;
  const cod = codigoSalvo();
  if (!est.dados && cod && !est.carregando && !est.erro) { setTimeout(() => carregar(cod)); }
  if (!est.dados) {
    const zap = wa('Olá Helder, quero acesso aos dados de exportação do app (consultoria Amendoim Brasil).');
    return `${topo}
    <section class="cartao dx-trava">
      <span class="sigla" style="width:52px;height:52px;border-radius:16px;background:var(--verde-claro)">${ic(I.cadeado, 'style="width:26px;height:26px;stroke:#007731"')}</span>
      <b style="font-size:18px">Área exclusiva para clientes da consultoria Amendoim Brasil</b>
      <span class="mini" style="font-size:14px;line-height:1.5;color:var(--texto-2)">Exportação mês a mês dos últimos anos, destinos e preço por país, e o balanço de Argentina, EUA, Índia e China.</span>
      <form id="form-dados" class="campo" style="gap:10px;width:100%">
        <label for="cod-dados">Código de acesso</label>
        <input id="cod-dados" inputmode="numeric" autocomplete="one-time-code" maxlength="12" value="${esc(cod)}" placeholder="Digite o código">
        <button class="btn btn-verde" type="submit" ${est.carregando ? 'disabled' : ''}>${est.carregando ? 'Abrindo…' : 'Acessar'}</button>
      </form>
      ${est.erro ? `<span class="mini" style="color:#B3261E;font-weight:700">${esc(est.erro)}</span>` : ''}
      ${zap ? `<a class="link-mini" href="${zap}" target="_blank" rel="noopener" data-ev="dados-pedir">Ainda não é cliente? Fale com o Helder</a>` : ''}
    </section>`;
  }
  const d = est.dados, b = d.brasil, m = d.mundo;
  const abas = [['brasil', 'Brasil'], ['destinos', 'Destinos'], ['mundo', 'Mundo']]; // 'Balanço' (USDA do Brasil) fora por enquanto: o Brasil agora usa Conab e Comex
  const quando = d.atualizado ? new Date(d.atualizado).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
  let corpo = '<div class="vazio">Dados indisponíveis agora. Tente mais tarde.</div>';
  if (est.aba === 'brasil' && b) corpo = telaBrasil(b);
  if (est.aba === 'destinos' && b) corpo = telaDestinos(b);
  if (est.aba === 'mundo' && m) corpo = telaMundo(m, b);
  if (est.aba === 'balanco' && m) corpo = telaBalanco(m, b);
  return `${topo}
  <div class="segmento">${abas.map(([k, t]) => `<button data-dx-aba="${k}" aria-pressed="${est.aba === k}">${t}</button>`).join('')}</div>
  ${corpo}
  <p class="mini dx-nota">Fontes: Comex Stat/MDIC${b ? ` (dados até ${MESES[b.mes - 1].toLowerCase()}/${b.ano})` : ''} e USDA PSD (outros países)${m?.publicado ? ` (relatório ${m.publicado.slice(5)}/${m.publicado.slice(0, 4)})` : ''}. Conferido em ${quando}. Atualiza sozinho quando os órgãos publicam.</p>
  <button class="link-mini dx-sair" data-dx-sair>Sair da área da consultoria</button>`;
}

export function ligarDados(render, evento) {
  ctx = { render, evento };
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'form-dados') return;
    e.preventDefault();
    const c = document.getElementById('cod-dados').value.replace(/\s/g, '');
    if (c) carregar(c);
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-dx-aba]');
    if (a) { est.aba = a.dataset.dxAba; evento('dados-' + est.aba); render(false); return; }
    const p = e.target.closest('[data-dx-prod]');
    if (p) { est.prod = p.dataset.dxProd; render(false); return; }
    if (e.target.closest('[data-dx-sair]')) { est.dados = null; est.erro = ''; try { localStorage.removeItem(CHAVE); } catch (er) { /* ignora */ } render(false); }
  });
}
