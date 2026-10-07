// Painel privado do Helder: uso do app, patrocinadores (com relatório para imprimir) e aprovação do balcão.
// Só funciona com a chave; os números são anônimos (contagem de eventos, sem dados pessoais).
import { ativar, prefsSalvas, suporte } from '/alertas.js';
import { MUNICIPIOS } from '/clima.js';

const CHAVE_LS = 'ab-chave-numeros';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => (n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (a, b) => (b ? num((a / b) * 100, 1) + '%' : '—');
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const slug = (s, max = 24) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');

const ABAS = { inicio: 'Início', mercado: 'Mercado', clima: 'Clima', ferramentas: 'Ferramentas', negociar: 'Negociar (balcão)', boletim: 'Leitura de boletim', alertas: 'Alertas', anuncie: 'Anuncie no app', numeros: 'Números', admin: 'Aprovar anúncios' };
const FERR = { custo: 'Lucratividade', avista: 'À vista ou a prazo', armazenar: 'Armazenar ou vender', frete: 'Frete', arrendamento: 'Arrendamento', barter: 'Barter', dolar: 'Dólar → saca', rendimento: 'Casca → grão' };
const ACOES = [
  ['fisico', 'Pediu preço físico'], ['interesse', 'Interesse em oferta'], ['anuncio-enviado', 'Anúncio enviado'],
  ['anuncio-zap', 'Anúncio no seu WhatsApp'], ['vender', 'Quero vender'], ['comprar', 'Quero comprar'], ['falar', 'Fale com o Helder'],
  ['consultoria', 'Abriu a consultoria'], ['assinar', 'Clicou em assinar'], ['consultoria-login', 'Login de cliente'],
  ['grupo', 'Entrou no grupo'], ['instagram', 'Instagram'], ['alertas-ativou', 'Ativou alertas'], ['anuncie-abrir', 'Abriu "Anuncie no app"'], ['anunciar', 'Quer patrocinar']
];
const ENVIOS = [['compartilhar-preco', 'Radar de preços'], ['compartilhar-fato', 'Fato do dia'], ['pdf-enviar', 'Boletim em PDF (enviado)'], ['pdf-baixar', 'Boletim em PDF (baixado)']];
const LOCAIS = { 'mercado-hoje': 'Mercado hoje (tela inicial)', rodape: 'Rodapé da tela inicial', clima: 'Previsão do tempo (Clima)', boletim: 'Boletim do mês', ferramentas: 'Ferramentas' };
const DISP = { android: 'Android', iphone: 'iPhone', computador: 'Computador' };
const MODO = { app: 'App instalado', navegador: 'Pelo navegador' };

const est = { k: '', dados: null, extras: null, periodo: 30, aba: 'geral', patros: [], relatorio: null, balcao: null };

// ---------- dados ----------
function diasDoPeriodo() {
  const h = hojeISO(), lista = [];
  for (let i = est.periodo - 1; i >= 0; i--) lista.push(somaDias(h, -i));
  return lista;
}
function total(nome, dias = diasDoPeriodo()) {
  return dias.reduce((s, d) => { const x = est.dados[d] || {}; return s + Object.entries(x).reduce((t, [k, v]) => (k === nome || k.startsWith(nome + '-') ? t + v : t), 0); }, 0);
}
function exato(nome, dias = diasDoPeriodo()) { return dias.reduce((s, d) => s + ((est.dados[d] || {})[nome] || 0), 0); }
function grupo(prefixo, dias = diasDoPeriodo()) {
  const g = {};
  dias.forEach((d) => Object.entries(est.dados[d] || {}).forEach(([k, v]) => { if (k.startsWith(prefixo)) { const n = k.slice(prefixo.length); g[n] = (g[n] || 0) + v; } }));
  return Object.entries(g).sort((a, b) => b[1] - a[1]);
}
const ACENTO = { tupa: 'Tupã', marilia: 'Marília', sao: 'São', pompeia: 'Pompeia', assis: 'Assis', lucelia: 'Lucélia', adamantina: 'Adamantina', aracatuba: 'Araçatuba', paraguacu: 'Paraguaçu', ribeirao: 'Ribeirão', jau: 'Jaú', itapolis: 'Itápolis', guaira: 'Guaíra', tres: 'Três', lagoas: 'Lagoas', iguacu: 'Iguaçu', goias: 'Goiás', jatai: 'Jataí', uberlandia: 'Uberlândia', parana: 'Paraná', bebedouro: 'Bebedouro', tabapua: 'Tabapuã', taquaritinga: 'Taquaritinga', osvaldo: 'Osvaldo', cruz: 'Cruz', panorama: 'Panorama', ourinhos: 'Ourinhos', candido: 'Cândido', mota: 'Mota', florida: 'Flórida', paulista: 'Paulista', herculandia: 'Herculândia', quintana: 'Quintana', iacri: 'Iacri', bastos: 'Bastos', rinopolis: 'Rinópolis', parapua: 'Parapuã', junqueiropolis: 'Junqueirópolis', irapuru: 'Irapuru', pacaembu: 'Pacaembu' };
const MINUSC = new Set(['de', 'do', 'da', 'dos', 'das', 'e']);
const CIDADES = {};
const nomeRegiao = (s) => {
  if (!CIDADES._ok) { MUNICIPIOS.forEach((m) => { CIDADES[slug(`${m.nome}/${m.uf}`, 30)] = `${m.nome}/${m.uf}`; }); CIDADES._ok = 1; }
  if (CIDADES[s]) return CIDADES[s];
  if (s.startsWith('perto-de-') && CIDADES[s.slice(9)]) return 'Perto de ' + CIDADES[s.slice(9)];
  const m = s.match(/^(.*?)-(sp|ms|mg|go|pr|mt|ba|to|rs|sc|rj)$/);
  const base = (m ? m[1] : s).split('-').map((w, i) => ACENTO[w] || (i && MINUSC.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  return base + (m ? '/' + m[2].toUpperCase() : '');
};

// ---------- peças visuais ----------
const tile = (rot, val, sub = '') => `<div class="pn-tile"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
function ranking(titulo, linhas, vazio = 'Sem dados no período.') {
  const max = Math.max(1, ...linhas.map((l) => l[1]));
  return `<section class="cartao pn-rank"><span class="rotulo">${titulo}</span>
    ${linhas.length ? linhas.map(([n, v]) => `<div class="pn-linha"><span class="pn-nome">${esc(n)}</span><span class="pn-barra"><i style="width:${Math.max(2, (v / max) * 100)}%"></i></span><b class="num">${num(v)}</b></div>`).join('') : `<span class="mini">${vazio}</span>`}
  </section>`;
}
function grafico(dias) {
  const vals = dias.map((d) => (est.dados[d] || {})['aparelho-dia'] || 0);
  const ab = dias.map((d) => (est.dados[d] || {}).abriu || 0);
  const W = 640, H = 170, pB = 22, pT = 10, max = Math.max(4, ...vals);
  const larg = W / dias.length, bw = Math.max(2, larg - (dias.length > 40 ? 2 : 4));
  const y = (v) => pT + (H - pT - pB) * (1 - v / max);
  const passo = Math.ceil(dias.length / 8);
  return `<div class="pn-grafico"><div class="pn-leitura" id="pn-leitura">Toque numa barra para ver o dia</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Aparelhos por dia">
      <line x1="0" x2="${W}" y1="${H - pB}" y2="${H - pB}" stroke="#E3DED3"/>
      <text class="eixo" x="2" y="${pT + 8}">${num(max)}</text>
      ${dias.map((d, i) => `<rect x="${i * larg + (larg - bw) / 2}" y="${y(vals[i])}" width="${bw}" height="${Math.max(0, H - pB - y(vals[i]))}" rx="3" fill="#007731"/>
        <rect x="${i * larg}" y="0" width="${larg}" height="${H}" fill="transparent" data-dia="${ddmm(d)}" data-v="${vals[i]}" data-a="${ab[i]}"/>
        ${i % passo === 0 ? `<text class="eixo" x="${i * larg + larg / 2}" y="${H - 6}" text-anchor="middle">${ddmm(d)}</text>` : ''}`).join('')}
    </svg></div>`;
}

// ---------- abas ----------
function telaGeral() {
  const dias = diasDoPeriodo(), h = hojeISO();
  const ap = exato('aparelho-dia', dias);
  const dSem = (() => { const d = new Date(h + 'T12:00:00Z'); const back = (d.getUTCDay() + 6) % 7; return Array.from({ length: back + 1 }, (_, i) => somaDias(h, -i)); })();
  const dMes = Array.from({ length: +h.slice(8, 10) }, (_, i) => somaDias(h, -i));
  const abas = grupo('aba-'), ferr = grupo('ferr-'), regs = grupo('reg-');
  const melhorDia = dias.reduce((m, d) => (((est.dados[d] || {})['aparelho-dia'] || 0) > ((est.dados[m] || {})['aparelho-dia'] || 0) ? d : m), dias[0]);
  const x = est.extras || {};
  return `<div class="pn-tiles">
      ${tile('Aparelhos por dia', num(ap / dias.length, 1), 'média do período')}
      ${tile('Aparelhos na semana', num(exato('aparelho-semana', dSem)), 'diferentes, desde segunda')}
      ${tile('Aparelhos no mês', num(exato('aparelho-mes', dMes)), 'diferentes, desde o dia 1º')}
      ${tile('Novos', num(exato('aparelho-novo', dias)), 'primeira vez no app')}
      ${tile('Taxa de retorno', pct(exato('voltou', dias), ap), 'dos aparelhos do dia já tinham vindo')}
      ${tile('Aberturas', num(exato('abriu', dias)), 'vezes que o app foi aberto')}
      ${tile('Alertas ativos', num(x.alertas), 'celulares inscritos')}
      ${tile('Anúncios esperando', num(x.balcao?.pendentes), `<a href="#" data-pn-aba="balcao">abrir o balcão</a>`)}
    </div>
    <section class="cartao"><div class="cartao-cab"><span class="rotulo">Aparelhos por dia</span><span class="mini">últimos ${est.periodo} dias</span></div>${grafico(dias)}</section>
    <section class="cartao pn-destaques"><span class="rotulo">Destaques do período</span>
      <div><span>Aba mais aberta</span><b>${abas[0] ? esc(ABAS[abas[0][0]] || abas[0][0]) + ' · ' + num(abas[0][1]) : '—'}</b></div>
      <div><span>Ferramenta mais usada</span><b>${ferr[0] ? esc(FERR[ferr[0][0]] || ferr[0][0]) + ' · ' + num(ferr[0][1]) : '—'}</b></div>
      <div><span>Região com mais acessos</span><b>${regs[0] ? esc(nomeRegiao(regs[0][0])) + ' · ' + num(regs[0][1]) : '—'}</b></div>
      <div><span>Dia de maior uso</span><b>${melhorDia && (est.dados[melhorDia] || {})['aparelho-dia'] ? ddmm(melhorDia) + ' · ' + num(est.dados[melhorDia]['aparelho-dia']) + ' aparelhos' : '—'}</b></div>
      <div><span>Pedidos de preço físico</span><b>${num(exato('fisico', dias))}</b></div>
      <div><span>Envios para o WhatsApp</span><b>${num(total('compartilhar', dias) + exato('pdf-enviar', dias))}</b></div>
    </section>`;
}

function telaUso() {
  const x = est.extras || {};
  const tipoAlerta = { mudanca: 'Mudança do IEA', acima: 'Preço-alvo de alta', abaixo: 'Preço-alvo de baixa', chuva: 'Chuva forte', boletim: 'Boletim novo', balcao: 'Oferta no balcão' };
  return `<div class="pn-grade">
    ${ranking('Abas mais acessadas', grupo('aba-').map(([k, v]) => [ABAS[k] || k, v]))}
    ${ranking('Ferramentas mais usadas', grupo('ferr-').map(([k, v]) => [FERR[k] || k, v]))}
    ${ranking('Ações de negócio', ACOES.map(([k, n]) => [n, exato(k)]).filter((l) => l[1] > 0).sort((a, b) => b[1] - a[1]), 'Nenhuma ação no período.')}
    ${ranking('Envios para o WhatsApp', ENVIOS.map(([k, n]) => [n, exato(k)]).filter((l) => l[1] > 0))}
    ${ranking('Regiões do público', grupo('reg-').slice(0, 10).map(([k, v]) => [nomeRegiao(k), v]))}
    ${ranking('Aparelho', grupo('disp-').map(([k, v]) => [DISP[k] || k, v]))}
    ${ranking('Como abrem o app', grupo('modo-').map(([k, v]) => [MODO[k] || k, v]))}
    ${ranking('Boletins lidos', grupo('boletim-').slice(0, 8).map(([k, v]) => [k.replace(/-/g, ' '), v]))}
    ${ranking('Alertas ativos por tipo', Object.entries(x.alertasPorTipo || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => [tipoAlerta[k] || k, v]), 'Ninguém ativou alertas ainda.')}
  </div>
  <p class="mini pn-nota">Regiões, aparelho e "como abrem" contam cada aparelho uma vez por dia. Abas e ferramentas contam cada vez que a tela foi aberta.</p>`;
}

function numerosPatro(id, dias = diasDoPeriodo()) {
  const ver = grupo(`patro-ver-${id}-`, dias), cli = grupo(`patro-clique-${id}-`, dias);
  const locais = [...new Set([...ver.map((l) => l[0]), ...cli.map((l) => l[0])])];
  const porLocal = locais.map((l) => ({ local: l, ver: (ver.find((x) => x[0] === l) || [, 0])[1], cli: (cli.find((x) => x[0] === l) || [, 0])[1] })).sort((a, b) => b.ver - a.ver);
  return { ver: porLocal.reduce((s, x) => s + x.ver, 0), cli: porLocal.reduce((s, x) => s + x.cli, 0), porLocal };
}

function telaPatro() {
  const reais = est.patros.filter((p) => !p.exemplo && p.nome);
  const vagos = est.patros.filter((p) => p.exemplo || !p.nome).flatMap((p) => p.locais || []);
  return `${reais.map((p) => {
    const id = slug(p.nome, 20), n = numerosPatro(id);
    return `<section class="cartao">
      <div class="cartao-cab" style="flex-wrap:wrap"><span style="display:flex;align-items:center;gap:10px">${p.logo ? `<img src="${esc(p.logo)}" alt="" style="height:26px;max-width:110px;object-fit:contain">` : ''}<b style="font-size:17px">${esc(p.nome)}</b></span>
        <button class="btn btn-verde btn-pequeno" data-relatorio="${esc(p.nome)}">Relatório para o patrocinador</button></div>
      <div class="pn-tiles pn-tiles-3">${tile('Impressões', num(n.ver), 'vezes que a marca apareceu na tela')}${tile('Cliques', num(n.cli), 'toques na marca')}${tile('Taxa de clique', pct(n.cli, n.ver))}</div>
      ${n.porLocal.length ? `<table class="tabela pn-tabela"><thead><tr><th>Espaço</th><th>Impressões</th><th>Cliques</th><th>Taxa</th></tr></thead><tbody>${n.porLocal.map((l) => `<tr><th>${esc(LOCAIS[l.local] || l.local)}</th><td>${num(l.ver)}</td><td>${num(l.cli)}</td><td>${pct(l.cli, l.ver)}</td></tr>`).join('')}</tbody></table>` : '<span class="mini">Ainda sem impressões no período. A contagem começou com esta versão do painel.</span>'}
    </section>`;
  }).join('') || '<div class="vazio">Nenhum patrocinador ativo.</div>'}
  ${vagos.length ? `<section class="cartao"><span class="rotulo">Espaços livres para vender</span><div class="pn-chips">${vagos.map((l) => `<span class="pilula">${esc(LOCAIS[l] || l)}</span>`).join('')}</div></section>` : ''}`;
}

function telaRelatorio(nome) {
  const p = est.patros.find((x) => x.nome === nome);
  if (!p) return '';
  const dias = diasDoPeriodo(), id = slug(p.nome, 20), n = numerosPatro(id, dias);
  const ap = exato('aparelho-dia', dias);
  const regs = grupo('reg-', dias).slice(0, 6), disp = grupo('disp-', dias);
  const totReg = regs.reduce((s, r) => s + r[1], 0), totDisp = disp.reduce((s, r) => s + r[1], 0);
  return `<div class="pn-relatorio">
    <div class="pn-acoes-rel"><button class="btn btn-escuro btn-pequeno" data-fechar-rel>Voltar</button><button class="btn btn-verde btn-pequeno" onclick="window.print()">Imprimir / salvar PDF</button></div>
    <article class="pn-folha">
      <header><img src="/img/logo.png" alt="Amendoim Brasil"><div><b>Relatório de exposição da marca</b><span>${esc(p.nome)} · ${ddmm(dias[0])}/${dias[0].slice(0, 4)} a ${ddmm(dias[dias.length - 1])}/${dias[dias.length - 1].slice(0, 4)}</span></div></header>
      <div class="pn-tiles pn-tiles-4">${tile('Impressões', num(n.ver), 'vezes que a marca apareceu na tela')}${tile('Cliques', num(n.cli), 'toques na marca')}${tile('Taxa de clique', pct(n.cli, n.ver))}${tile('Aparelhos por dia', num(ap / dias.length, 1), 'média de quem abriu o app')}</div>
      <h3>Desempenho por espaço</h3>
      ${n.porLocal.length ? `<table class="tabela pn-tabela"><thead><tr><th>Espaço</th><th>Impressões</th><th>Cliques</th><th>Taxa</th></tr></thead><tbody>${n.porLocal.map((l) => `<tr><th>${esc(LOCAIS[l.local] || l.local)}</th><td>${num(l.ver)}</td><td>${num(l.cli)}</td><td>${pct(l.cli, l.ver)}</td></tr>`).join('')}</tbody></table>` : '<p class="mini">Sem impressões no período.</p>'}
      <div class="pn-duas">
        <div><h3>Onde está o público</h3>${regs.length ? regs.map(([k, v]) => `<div class="pn-linha"><span class="pn-nome">${esc(nomeRegiao(k))}</span><span class="pn-barra"><i style="width:${(v / totReg) * 100}%"></i></span><b class="num">${pct(v, totReg)}</b></div>`).join('') : '<p class="mini">Sem dados.</p>'}</div>
        <div><h3>Aparelho</h3>${disp.length ? disp.map(([k, v]) => `<div class="pn-linha"><span class="pn-nome">${esc(DISP[k] || k)}</span><span class="pn-barra"><i style="width:${(v / totDisp) * 100}%"></i></span><b class="num">${pct(v, totDisp)}</b></div>`).join('') : '<p class="mini">Sem dados.</p>'}</div>
      </div>
      <p class="pn-sobre">O app Amendoim Brasil reúne preço da casca (IEA e Conab), mercado físico, clima da lavoura e ferramentas de decisão para produtores, beneficiadoras e indústrias do amendoim. Impressão conta quando a marca aparece de fato na tela (metade visível), uma vez por tela aberta.</p>
      <footer>Amendoim Brasil · Helder Lamberti · amendoim-brasil.netlify.app · Métricas anônimas: o app não coleta nome, telefone nem localização exata.</footer>
    </article>
  </div>`;
}

function telaBalcao() {
  if (!est.balcao) return '<div class="vazio">Carregando anúncios…</div>';
  const pend = est.balcao.filter((a) => a.status === 'pendente'), apr = est.balcao.filter((a) => a.status === 'aprovado');
  const linha = (a) => {
    const x = a.publico || {}, c = a.contato || {};
    const dig = String(c.whatsapp || ''), tel = dig.length >= 12 && dig.startsWith('55') ? dig : '55' + dig;
    const zap = `https://wa.me/${tel}?text=${encodeURIComponent(`Olá ${c.nome || ''}, aqui é o Helder da Amendoim Brasil. Recebi o seu anúncio no balcão (${x.lado} de ${x.produto}, ${x.volume}). Pode me mandar fotos do produto?`)}`;
    return `<article class="cartao" style="gap:8px">
      <div class="cartao-cab"><span class="lado ${x.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${x.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span><span class="mini">${new Date(a.criado).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${esc(a.id.slice(-5).toUpperCase())}</span></div>
      <b style="font-size:16px">${esc(x.produto)} · ${esc(x.volume)}</b>
      <span class="mini">${esc(x.regiao)} · ${esc(x.preco)} · entrega ${esc(x.entrega)}${x.detalhe ? '<br>' + esc(x.detalhe) : ''}</span>
      <a class="btn btn-escuro btn-pequeno" href="${zap}" target="_blank" rel="noopener">Chamar ${esc(c.nome || '')} no WhatsApp · ${esc(dig)}</a>
      <div class="duas-acoes">${a.status === 'pendente'
        ? `<button class="btn btn-verde btn-pequeno" data-adm="aprovar" data-id="${esc(a.id)}">Aprovar e publicar</button><button class="btn btn-pequeno btn-contorno" data-adm="recusar" data-id="${esc(a.id)}">Recusar</button>`
        : `<button class="btn btn-pequeno btn-contorno" data-adm="remover" data-id="${esc(a.id)}">Tirar do ar</button>`}</div>
    </article>`;
  };
  return `<section class="cartao pn-aviso"><div><b>Aviso de anúncio novo neste celular</b><span class="mini">Chega como notificação, mesmo com o app fechado.</span></div><button class="btn btn-verde btn-pequeno" id="pn-avisos">Ativar</button><span class="mini" id="pn-avisos-msg"></span></section>
  <div class="secao-titulo"><h2>Esperando aprovação (${pend.length})</h2></div>
  ${pend.length ? pend.map(linha).join('') : '<div class="vazio">Nenhum anúncio esperando.</div>'}
  <div class="secao-titulo"><h2>No ar (${apr.length})</h2></div>
  ${apr.length ? apr.map(linha).join('') : '<div class="vazio">Nenhum anúncio no ar.</div>'}`;
}

// ---------- montagem ----------
function desenhar() {
  const corpo = $('#pn-corpo');
  if (est.relatorio) { corpo.innerHTML = telaRelatorio(est.relatorio); document.body.classList.add('imprimindo'); return; }
  document.body.classList.remove('imprimindo');
  const abas = [['geral', 'Visão geral'], ['uso', 'Uso do app'], ['patro', 'Patrocínio'], ['balcao', `Balcão${est.extras?.balcao?.pendentes ? ` (${est.extras.balcao.pendentes})` : ''}`]];
  corpo.innerHTML = `<div class="segmento pn-abas">${abas.map(([k, t]) => `<button data-pn-aba="${k}" aria-pressed="${est.aba === k}">${t}</button>`).join('')}</div>
    ${est.aba !== 'balcao' ? `<div class="chips pn-periodo">${[7, 30, 90].map((p) => `<button class="chip" data-periodo="${p}" aria-pressed="${est.periodo === p}">${p} dias</button>`).join('')}<button class="chip" data-recarregar>Atualizar</button></div>` : ''}
    ${est.aba === 'geral' ? telaGeral() : est.aba === 'uso' ? telaUso() : est.aba === 'patro' ? telaPatro() : telaBalcao()}`;
}

async function carregar() {
  const corpo = $('#pn-corpo');
  corpo.innerHTML = '<div class="vazio">Carregando…</div>';
  try {
    const [r, p] = await Promise.all([fetch(`/api/numeros?v=2&dias=120&k=${encodeURIComponent(est.k)}`, { cache: 'no-store' }), fetch('/data/patrocinadores.json', { cache: 'no-cache' })]);
    if (r.status === 401) { sair('Chave incorreta.'); return; }
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    est.dados = j.dias || {}; est.extras = j.extras || {}; est.patros = p.ok ? await p.json() : [];
    try { localStorage.setItem(CHAVE_LS, est.k); } catch (e) { /* ignora */ }
    $('#pn-entrar').hidden = true; $('#pn-sair').hidden = false;
    desenhar();
    if (est.aba === 'balcao') carregarBalcao();
  } catch (e) { corpo.innerHTML = '<div class="vazio">Não foi possível carregar agora. Verifique a internet e toque em Atualizar.</div>'; }
}

async function balcao(corpo) {
  const r = await fetch('/api/balcao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...corpo, k: est.k }) });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
async function carregarBalcao() {
  try { est.balcao = (await balcao({ acao: 'admin' })).anuncios || []; } catch (e) { est.balcao = []; }
  if (est.extras) est.extras.balcao = { pendentes: est.balcao.filter((a) => a.status === 'pendente').length, aprovados: est.balcao.filter((a) => a.status === 'aprovado').length };
  if (est.aba === 'balcao') desenhar();
}

function sair(msg = '') {
  try { localStorage.removeItem(CHAVE_LS); } catch (e) { /* ignora */ }
  est.k = ''; est.dados = null;
  $('#pn-entrar').hidden = false; $('#pn-sair').hidden = true;
  $('#pn-corpo').innerHTML = msg ? `<div class="vazio">${esc(msg)}</div>` : '';
}

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'pn-entrar') return;
  e.preventDefault();
  est.k = $('#pn-chave').value.trim();
  if (est.k) carregar();
});

document.addEventListener('click', async (e) => {
  const t = e.target;
  const aba = t.closest('[data-pn-aba]');
  if (aba) { e.preventDefault(); est.aba = aba.dataset.pnAba; desenhar(); if (est.aba === 'balcao') carregarBalcao(); return; }
  const per = t.closest('[data-periodo]');
  if (per) { est.periodo = +per.dataset.periodo; desenhar(); return; }
  if (t.closest('[data-recarregar]')) { carregar(); return; }
  if (t.closest('#pn-sair')) { sair(); return; }
  const rel = t.closest('[data-relatorio]');
  if (rel) { est.relatorio = rel.dataset.relatorio; desenhar(); scrollTo(0, 0); return; }
  if (t.closest('[data-fechar-rel]')) { est.relatorio = null; desenhar(); return; }
  const adm = t.closest('[data-adm]');
  if (adm) {
    if (adm.dataset.adm !== 'aprovar' && !adm.dataset.certeza) {
      adm.dataset.certeza = '1'; adm.textContent = 'Toque de novo para confirmar';
      setTimeout(() => { if (adm.isConnected) { delete adm.dataset.certeza; adm.textContent = adm.dataset.adm === 'recusar' ? 'Recusar' : 'Tirar do ar'; } }, 4000);
      return;
    }
    adm.disabled = true;
    try { await balcao({ acao: adm.dataset.adm, id: adm.dataset.id }); await carregarBalcao(); } catch (er) { adm.disabled = false; adm.textContent = 'Tente de novo'; }
    return;
  }
  if (t.closest('#pn-avisos')) {
    const m = $('#pn-avisos-msg');
    const sp = suporte();
    if (sp.ios && !sp.instalado) { m.textContent = 'No iPhone: abra o app Amendoim Brasil instalado, entre em amendoim-brasil.netlify.app/#/numeros e toque em "Abrir o painel". Ative lá.'; return; }
    try { await ativar(prefsSalvas() || { mudanca: true, chuva: false, boletim: false, balcao: false }, { k: est.k }); m.textContent = 'Pronto: este celular avisa a cada anúncio novo.'; }
    catch (er) { m.textContent = er.message === 'permissao' ? 'Permita as notificações quando o celular perguntar.' : 'Não deu para ativar agora. Tente de novo em instantes.'; }
  }
});

// Leitura do gráfico: mostra o dia ao tocar ou passar o mouse.
['pointerover', 'pointerdown'].forEach((ev) => document.addEventListener(ev, (e) => {
  const r = e.target.closest('[data-dia]');
  const l = $('#pn-leitura');
  if (r && l) l.textContent = `${r.dataset.dia}: ${num(+r.dataset.v)} aparelhos · ${num(+r.dataset.a)} aberturas`;
}));

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
if (location.hash === '#balcao') est.aba = 'balcao';
try { est.k = localStorage.getItem(CHAVE_LS) || ''; } catch (e) { /* sem armazenamento */ }
if (est.k) carregar(); else sair();
