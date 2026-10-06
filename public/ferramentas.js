// Ferramentas (calculadoras) da Amendoim Brasil.
// Números no padrão brasileiro: área e sacas "12.000", valores "12.000,00".
// O que a pessoa digita fica salvo só neste aparelho.

const ALQ = 2.42; // 1 alqueire paulista = 2,42 ha
const CHAVE = 'ab-ferramentas';
const SECAGEM_PROPRIA = 2.0; // R$/saca, média estimada com gás e lenha

// Campo: [id, rótulo, tipo (int|brl|dec), unidade, conversão ao trocar alqueire/hectare (area|porArea|''), placeholder]
const FERR = {
  custo: {
    nome: 'Lucratividade', desc: 'Custo por saca, ponto de equilíbrio e tabela de lucro',
    campos: [
      ['prod', 'Produtividade', 'int', 'sc/{u}', 'porArea'],
      ['custo', 'Custo total', 'brl', 'R$/{u}', 'porArea'],
      ['preco', 'Preço de venda', 'brl', 'R$/sc', ''],
      ['area', 'Área plantada · opcional', 'int', '{u}', 'area']
    ],
    padrao: { prod: '380', custo: '30.000,00', preco: '72,00', area: '' }
  },
  barter: {
    nome: 'Barter', desc: 'Quantas sacas pagam o pacote de insumos',
    campos: [
      ['pacote', 'Valor do pacote', 'brl', 'R$/{u}', 'porArea', 'ex.: 9.000,00'],
      ['precoBarter', 'Preço da saca no barter', 'brl', 'R$/sc', '', 'ex.: 75,00'],
      ['mercado', 'Preço de mercado hoje · opcional', 'brl', 'R$/sc', ''],
      ['prod', 'Produtividade esperada · opcional', 'int', 'sc/{u}', 'porArea'],
      ['area', 'Área · opcional', 'int', '{u}', 'area']
    ],
    padrao: {}
  },
  armazenar: {
    nome: 'Armazenar ou vender', desc: 'Quanto custa segurar o amendoim',
    campos: [
      ['preco', 'Preço hoje', 'brl', 'R$/sc', ''],
      ['meses', 'Meses guardando', 'int', 'meses', ''],
      ['armaz', 'Armazenagem na safra', 'brl', 'R$/sc', ''],
      ['secagem', 'Secagem', 'brl', 'R$/sc', ''],
      ['juros', 'Custo do dinheiro', 'dec', '% ao mês', ''],
      ['quebra', 'Quebra de peso', 'dec', '% ao ano', ''],
      ['futuro', 'Preço que espera vender · opcional', 'brl', 'R$/sc', ''],
      ['sacas', 'Quantidade · opcional', 'int', 'sacas', '']
    ],
    padrao: { preco: '75,00', meses: '4', armaz: '3,00', secagem: '3,50', juros: '1,2', quebra: '2,5' }
  },
  rendimento: {
    nome: 'Casca → grão', desc: 'Quanto de grão sai da sua carga',
    campos: [
      ['sacas', 'Casca', 'int', 'sacas 25 kg', ''],
      ['rend', 'Rendimento de grão', 'dec', '%', '', 'ex.: 70']
    ],
    padrao: {}
  },
  avista: {
    nome: 'À vista ou a prazo', desc: 'Qual proposta paga mais de verdade',
    campos: [
      ['avista', 'Preço à vista', 'brl', 'R$/sc', ''],
      ['aprazo', 'Preço a prazo', 'brl', 'R$/sc', ''],
      ['dias', 'Prazo de pagamento', 'int', 'dias', ''],
      ['juros', 'Custo do dinheiro', 'dec', '% ao mês', ''],
      ['sacas', 'Quantidade · opcional', 'int', 'sacas', '']
    ],
    padrao: { avista: '76,00', aprazo: '80,00', dias: '60', juros: '1,2' }
  },
  frete: {
    nome: 'Frete', desc: 'Quanto o frete tira do seu preço',
    campos: [
      ['valor', 'Valor do frete', 'brl', 'R$/carga', '', 'ex.: 2.500,00'],
      ['carga', 'Tamanho da carga', 'dec', 'toneladas', '', 'ex.: 15'],
      ['preco', 'Preço oferecido · opcional', 'brl', 'R$/sc', '']
    ],
    padrao: {}
  },
  dolar: {
    nome: 'Dólar → R$/saca', desc: 'Converte preço em US$/t para R$ por saca',
    campos: [
      ['usd', 'Preço em dólar', 'brl', 'US$/t', '', 'ex.: 1.164,00'],
      ['cambio', 'Dólar', 'brl', 'R$/US$', '']
    ],
    padrao: { cambio: '4,98' }
  },
  arrendamento: {
    nome: 'Arrendamento', desc: 'O valor da terra em sacas',
    campos: [
      ['valor', 'Arrendamento', 'brl', 'R$/{u}', 'porArea'],
      ['preco', 'Preço da saca', 'brl', 'R$/sc', ''],
      ['area', 'Área · opcional', 'int', '{u}', 'area']
    ],
    padrao: {}
  }
};

// Ordem em que as ferramentas aparecem.
const ORDEM = ['custo', 'avista', 'armazenar', 'barter', 'frete', 'dolar', 'rendimento', 'arrendamento'];

// ---------- estado salvo ----------
let st = carregar();
function carregar() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { /* sem armazenamento */ }
  s = s && typeof s === 'object' ? s : {};
  s.unidade = s.unidade === 'ha' ? 'ha' : 'alq';
  s.v = s.v || {};
  Object.keys(FERR).forEach((k) => { s.v[k] = { ...FERR[k].padrao, ...(s.v[k] || {}) }; });
  s.secPropria = !!s.secPropria;
  return s;
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) { /* ignora */ } }

// ---------- números ----------
export const ler = (s) => { const n = parseFloat(String(s ?? '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };

export function formatar(tipo, bruto, final = false) {
  let s = String(bruto ?? '');
  if (tipo === 'int') {
    const d = s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    return d ? Number(d).toLocaleString('pt-BR') : '';
  }
  if (tipo === 'dec') s = s.replace(/\./g, ',');
  else s = s.replace(/\./g, '');
  s = s.replace(/[^\d,]/g, '');
  const i = s.indexOf(',');
  let int = (i >= 0 ? s.slice(0, i) : s).replace(/^0+(?=\d)/, '').slice(0, 12);
  let dec = i >= 0 ? s.slice(i + 1).replace(/,/g, '').slice(0, 2) : null;
  let intF = int ? Number(int).toLocaleString('pt-BR') : (dec != null ? '0' : '');
  if (final && tipo === 'brl' && intF) dec = (dec || '').padEnd(2, '0');
  if (final && dec === '') dec = null;
  return intF + (dec != null ? ',' + dec : '');
}

const fmtNum = (tipo, n) => {
  if (n == null || !isFinite(n)) return '';
  if (tipo === 'int') return formatar('int', String(Math.round(n)));
  const s = formatar(tipo, n.toFixed(2).replace('.', ','), true);
  return tipo === 'dec' && s.includes(',') ? s.replace(/0+$/, '').replace(/,$/, '') : s;
};

function mascarar(inp) {
  const tipo = inp.dataset.tipo;
  let bruto = inp.value;
  if (tipo === 'dec') bruto = bruto.replace(/\./g, ',');
  const pos = inp.selectionStart ?? bruto.length;
  const antes = bruto.slice(0, pos).replace(tipo === 'int' ? /\D/g : /[^\d,]/g, '').length;
  const novo = formatar(tipo, bruto);
  inp.value = novo;
  let n = 0, p = 0;
  while (p < novo.length && n < antes) { if (/[\d,]/.test(novo[p])) n++; p++; }
  try { inp.setSelectionRange(p, p); } catch (e) { /* alguns tipos não aceitam */ }
}

// ---------- tela ----------
export function telaFerramentas(qual, h) {
  const { esc } = h;
  const k = FERR[qual] ? qual : 'custo';
  const f = FERR[k];
  const u = st.unidade === 'ha' ? 'ha' : 'alq';
  const temArea = f.campos.some((c) => c[4]);
  const vals = st.v[k];
  const campo = ([id, rot, tipo, unid, , ph]) => {
    const travado = k === 'armazenar' && id === 'secagem' && st.secPropria;
    const valor = travado ? fmtNum('brl', SECAGEM_PROPRIA) : (vals[id] ?? '');
    return `<div class="campo">
      <label for="f-${id}"><span>${esc(rot)}</span><em>${esc(unid.replace('{u}', u))}</em></label>
      <div class="entrada"><input id="f-${id}" data-ferr="${id}" data-tipo="${tipo}" inputmode="${tipo === 'int' ? 'numeric' : 'decimal'}" autocomplete="off" value="${esc(valor)}" placeholder="${esc(ph || '')}" ${travado ? 'disabled' : ''}></div>
    </div>`;
  };
  return `<header class="topo"><div><h1>Ferramentas</h1><div class="sub">Faça a conta da sua lavoura</div></div>
    <div class="chips" role="tablist">${ORDEM.map((id) => [id, FERR[id]]).map(([id, x]) => `<a class="chip" href="#/ferramentas/${id}" aria-pressed="${id === k}" style="text-decoration:none">${esc(x.nome)}</a>`).join('')}</div>
  </header>
  <section class="cartao" style="gap:14px" id="ferr" data-ferr-k="${k}">
    <div class="cartao-cab" style="align-items:flex-start;gap:12px">
      <div><b style="font-size:18px;display:block">${esc(f.nome)}</b><span class="mini">${esc(f.desc)}</span></div>
      ${temArea ? `<div class="alterna" role="group" aria-label="Unidade de área">
        <button data-unidade="alq" aria-pressed="${u === 'alq'}">Alqueire</button><button data-unidade="ha" aria-pressed="${u === 'ha'}">Hectare</button></div>` : ''}
    </div>
    <div class="campos-2">${f.campos.map(campo).join('')}</div>
    ${k === 'armazenar' ? `<label class="marcar"><input type="checkbox" id="sec-propria" ${st.secPropria ? 'checked' : ''}><span>Secagem própria <small>(usamos uma média estimada de ${h.brl(SECAGEM_PROPRIA)}/saca com gás e lenha)</small></span></label>` : ''}
    <div id="ferr-resultado">${resultado(k, h)}</div>
    ${h.patrocinio ? h.patrocinio('ferramentas') : ''}
  </section>
  <p class="mini" style="text-align:center;margin:0 8px">${temArea ? '1 alqueire paulista = 2,42 ha · ' : ''}Seus números ficam salvos só neste aparelho.</p>`;
}

// ---------- contas ----------
function valores(k) {
  const v = {};
  FERR[k].campos.forEach(([id]) => { v[id] = ler(st.v[k][id]); });
  if (k === 'armazenar' && st.secPropria) v.secagem = SECAGEM_PROPRIA;
  return v;
}

const vazio = (txt = 'Preencha os campos para ver o resultado') => `<div class="resultado" style="opacity:.6"><div class="linha"><span>${txt}</span><span class="total">—</span></div></div>`;
const linha = (a, b, cls = '') => `<div class="linha"><span>${a}</span><b class="num ${cls}">${b}</b></div>`;
const bloco = (rot, val, cls = '') => `<div class="placar ${cls}"><span>${rot}</span><b class="num">${val}</b></div>`;

function resultado(k, h) {
  const { numBr, ic, I } = h;
  const brl = (n) => (n < 0 ? '−' : '') + h.brl(Math.abs(n)); // −R$ 2.640,00
  const v = valores(k);
  const u = st.unidade === 'ha' ? 'ha' : 'alq';
  const sinal = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');

  if (k === 'custo') {
    if (!v.prod || v.custo == null) return vazio();
    const cs = v.custo / v.prod;
    const temPreco = v.preco != null && v.preco > 0;
    const lucro = temPreco ? v.prod * v.preco - v.custo : null;
    return `<div class="placares">
        ${bloco('Custo por saca', brl(cs))}
        ${bloco(`Lucro por ${u}`, temPreco ? brl(lucro) : '—', temPreco ? sinal(lucro) : '')}
      </div>
      <div class="resultado">
        ${linha('Preço de equilíbrio <small>abaixo disso, prejuízo</small>', brl(cs))}
        ${temPreco ? linha('Produtividade de equilíbrio', numBr(v.custo / v.preco, 1) + ` sc/${u}`) : ''}
        ${temPreco ? linha(`Receita por ${u}`, brl(v.prod * v.preco)) : ''}
        ${temPreco ? linha('Margem por saca', brl(v.preco - cs), sinal(v.preco - cs)) : ''}
        ${v.area ? '<hr>' + linha('Produção total', numBr(v.prod * v.area) + ' sc') + (temPreco ? linha('Lucro total da área', brl(lucro * v.area), sinal(lucro)) : '') : ''}
      </div>
      ${temPreco ? matriz(v, h) : '<span class="mini">Coloque o preço de venda para ver a tabela de lucro.</span>'}
      <a class="chamada" href="#/negociar" style="background:#fff;border-color:var(--borda)"><span class="cresce" style="font-size:14px;font-weight:700;color:var(--verde)">Ver compradores pagando acima de ${brl(cs)}</span>${ic(I.seta, 'style="stroke:#007731"')}</a>`;
  }

  if (k === 'barter') {
    if (v.pacote == null || !v.precoBarter) return vazio();
    const sc = v.pacote / v.precoBarter;
    const vant = v.mercado ? v.precoBarter - v.mercado : null;
    return `<div class="placares">
        ${bloco(`Sacas por ${u}`, numBr(sc, 1) + ' sc')}
        ${bloco('Da sua produção', v.prod ? numBr((sc / v.prod) * 100, 1) + '%' : '—')}
      </div>
      <div class="resultado">
        ${v.area ? linha('Total de sacas no contrato', numBr(sc * v.area) + ' sc') + linha('Valor total do pacote', brl(v.pacote * v.area)) : linha('Total de sacas', '<small>informe a área</small>')}
        ${vant != null ? '<hr>' + linha('Barter vs vender hoje', (vant > 0 ? '+' : '') + brl(vant) + '/sc', sinal(vant)) + linha(`Diferença em sacas por ${u}`, numBr(v.pacote / v.mercado - sc, 1) + ' sc') : ''}
      </div>
      ${vant != null ? `<span class="mini">${vant >= 0 ? 'O barter paga mais que o mercado hoje: você entrega menos sacas.' : 'O mercado hoje paga mais que o barter. Compare com comprar à vista e vender depois.'}</span>` : ''}`;
  }

  if (k === 'armazenar') {
    if (!v.preco || !v.meses) return vazio();
    const conta = (m) => {
      const juros = v.preco * ((v.juros || 0) / 100) * m;
      const quebra = v.preco * ((v.quebra || 0) / 100) * (m / 12);
      const fixo = (v.armaz || 0) + (v.secagem || 0);
      return { juros, quebra, fixo, total: juros + quebra + fixo };
    };
    const c = conta(v.meses);
    const empate = v.preco + c.total;
    const ganho = v.futuro ? v.futuro - empate : null;
    const meses = [...new Set([2, 4, 6, 8, 10, v.meses])].sort((a, b) => a - b);
    return `<div class="placares">
        ${bloco('Custo de segurar', brl(c.total) + '<small>/sc</small>')}
        ${bloco('Preço para empatar', brl(empate))}
      </div>
      <div class="resultado">
        ${linha('Armazenagem (na safra)', brl(v.armaz || 0))}
        ${linha(st.secPropria ? 'Secagem própria (estimada)' : 'Secagem', brl(v.secagem || 0))}
        ${linha(`Juros de ${numBr(v.meses)} ${v.meses === 1 ? 'mês' : 'meses'}`, brl(c.juros))}
        ${linha('Quebra de peso', brl(c.quebra))}
        ${ganho != null ? '<hr>' + linha('Guardar vs vender hoje', (ganho > 0 ? '+' : '') + brl(ganho) + '/sc', sinal(ganho)) + (v.sacas ? linha('No total', brl(ganho * v.sacas), sinal(ganho)) : '') : (v.sacas ? '<hr>' + linha('Custo total de segurar', brl(c.total * v.sacas)) : '')}
      </div>
      ${ganho != null ? `<span class="mini">${ganho >= 0 ? 'Se o preço chegar lá, guardar compensa.' : 'Com esse preço, vender hoje rende mais.'}</span>` : ''}
      <div class="tabela-rolar"><table class="tabela">
        <thead><tr><th>Meses</th><th>Custo/sc</th><th>Empata em</th></tr></thead>
        <tbody>${meses.map((m) => { const x = conta(m); return `<tr class="${m === v.meses ? 'sua' : ''}"><th>${numBr(m)}</th><td>${brl(x.total)}</td><td><b>${brl(v.preco + x.total)}</b></td></tr>`; }).join('')}</tbody>
      </table></div>`;
  }

  if (k === 'rendimento') {
    if (!v.sacas || v.rend == null) return vazio();
    const kg = v.sacas * 25 * (v.rend / 100);
    return `<div class="placares">${bloco('Grão obtido', numBr(kg) + ' kg')}${bloco('Em sacas de grão', numBr(kg / 25) + ' sc')}</div>
      <div class="resultado">${linha('Em toneladas', numBr(kg / 1000, 2) + ' t')}${linha('Casca total', numBr(v.sacas * 25) + ' kg')}${linha('Casca + resíduo', numBr(v.sacas * 25 - kg) + ' kg')}</div>`;
  }

  if (k === 'avista') {
    if (!v.avista || !v.aprazo || !v.dias) return vazio();
    const j = (v.juros || 0) / 100;
    const vp = v.aprazo / Math.pow(1 + j, v.dias / 30);
    const dif = vp - v.avista;
    const implicita = (Math.pow(v.aprazo / v.avista, 30 / v.dias) - 1) * 100;
    return `<div class="placares">
        ${bloco('A prazo vale hoje', brl(vp))}
        ${bloco(dif >= 0 ? 'A prazo compensa' : 'À vista compensa', (dif >= 0 ? '+' : '') + brl(dif) + '<small>/sc</small>', dif >= 0 ? 'pos' : 'neg')}
      </div>
      <div class="resultado">
        ${linha('Juros que o comprador está pagando', numBr(implicita, 2) + '% ao mês')}
        ${linha('Seu custo do dinheiro', numBr(v.juros || 0, 2) + '% ao mês')}
        ${v.sacas ? '<hr>' + linha('Diferença no total', brl(dif * v.sacas), sinal(dif)) : ''}
      </div>
      <span class="mini">${dif >= 0 ? 'O prêmio do prazo paga mais que o seu custo do dinheiro.' : 'O prêmio do prazo não cobre o seu custo do dinheiro: melhor receber à vista.'} Lembre também do risco de receber.</span>`;
  }

  if (k === 'frete') {
    if (!v.valor || !v.carga) return vazio();
    const sacas = (v.carga * 1000) / 25;
    const porSc = v.valor / sacas;
    return `<div class="placares">
        ${bloco('Frete por saca', brl(porSc))}
        ${bloco('Preço líquido', v.preco ? brl(v.preco - porSc) : '—')}
      </div>
      <div class="resultado">
        ${linha('Frete por tonelada', brl(v.valor / v.carga))}
        ${linha('Sacas na carga', numBr(sacas) + ' sc')}
        ${v.preco ? linha('Peso do frete no preço', numBr((porSc / v.preco) * 100, 1) + '%') : ''}
      </div>`;
  }

  if (k === 'dolar') {
    if (!v.usd || !v.cambio) return vazio();
    const porT = v.usd * v.cambio;
    return `<div class="placares">
        ${bloco('Por saca de 25 kg', brl(porT / 40))}
        ${bloco('Por tonelada', brl(porT))}
      </div>
      <span class="mini">Conversão direta do mesmo produto (1 t = 40 sacas de 25 kg). Para comparar grão exportado com casca, é preciso descontar rendimento, beneficiamento e frete até o porto.</span>`;
  }

  if (k === 'arrendamento') {
    if (v.valor == null || !v.preco) return vazio();
    const sc = v.valor / v.preco;
    return `<div class="placares">${bloco(`Sacas por ${u}`, numBr(sc, 1) + ' sc')}${bloco('Total na área', v.area ? numBr(sc * v.area) + ' sc' : '—')}</div>
      ${v.area ? `<div class="resultado">${linha('Valor total do arrendamento', brl(v.valor * v.area))}</div>` : ''}`;
  }
  return vazio();
}

// Tabela de lucro: produtividade (linhas) × preço (colunas), como a planilha.
function matriz(v, h) {
  const { numBr, brl } = h;
  const u = st.unidade === 'ha' ? 'ha' : 'alq';
  const passoP = Math.max(1, Math.round(v.preco * 0.05));
  const precos = [-3, -2, -1, 0, 1, 2, 3].map((i) => v.preco + i * passoP).filter((p) => p > 0);
  const passoQ = Math.max(5, Math.round((v.prod * 0.08) / 5) * 5);
  const prods = [-2, -1, 0, 1, 2].map((i) => v.prod + i * passoQ).filter((q) => q > 0);
  const cel = (q, p) => {
    const r = q * p - v.custo;
    const cls = (r >= 0 ? 'pos' : 'neg') + (q === v.prod && p === v.preco ? ' seu' : (q === v.prod || p === v.preco ? ' cruz' : ''));
    return `<td class="${cls}">${r >= 0 ? '' : '−'}${numBr(Math.abs(r))}</td>`;
  };
  return `<div style="display:flex;flex-direction:column;gap:8px">
    <div class="cartao-cab"><span class="rotulo">Tabela de lucro · R$ por ${u}</span></div>
    <div class="tabela-rolar"><table class="tabela matriz">
      <thead><tr><th class="canto">sc/${u} ↓ · R$/sc →</th>${precos.map((p) => `<th class="${p === v.preco ? 'seu-col' : ''}">${brl(p).replace('R$ ', '')}</th>`).join('')}</tr></thead>
      <tbody>${prods.map((q) => `<tr><th class="${q === v.prod ? 'seu-col' : ''}">${numBr(q)}</th>${precos.map((p) => cel(q, p)).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <span class="mini">Verde é lucro, vermelho é prejuízo. A linha e a coluna destacadas são os seus números.</span>
  </div>`;
}

// ---------- eventos ----------
export function ligarFerramentas(h) {
  const atualizar = () => {
    const box = document.getElementById('ferr');
    if (!box) return;
    document.getElementById('ferr-resultado').innerHTML = resultado(box.dataset.ferrK, h);
  };

  document.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-ferr]');
    if (!inp) return;
    mascarar(inp);
    const k = document.getElementById('ferr').dataset.ferrK;
    st.v[k][inp.dataset.ferr] = inp.value;
    salvar(); atualizar();
  });

  document.addEventListener('focusout', (e) => {
    const inp = e.target.closest('[data-ferr]');
    if (!inp) return;
    const final = formatar(inp.dataset.tipo, inp.value, true);
    if (final !== inp.value) {
      inp.value = final;
      st.v[document.getElementById('ferr').dataset.ferrK][inp.dataset.ferr] = final;
      salvar();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id !== 'sec-propria') return;
    st.secPropria = e.target.checked;
    salvar();
    const inp = document.getElementById('f-secagem');
    if (inp) { inp.disabled = st.secPropria; inp.value = st.secPropria ? fmtNum('brl', SECAGEM_PROPRIA) : (st.v.armazenar.secagem || ''); }
    atualizar();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-unidade]');
    if (!b || b.dataset.unidade === st.unidade) return;
    const fator = b.dataset.unidade === 'ha' ? ALQ : 1 / ALQ; // alq→ha: área ×2,42; por área ÷2,42
    Object.entries(FERR).forEach(([k, f]) => f.campos.forEach(([id, , tipo, , conv]) => {
      const n = ler(st.v[k][id]);
      if (n == null || !conv) return;
      st.v[k][id] = fmtNum(tipo, conv === 'area' ? n * fator : n / fator);
    }));
    st.unidade = b.dataset.unidade;
    salvar();
    h.render(false);
  });
}
