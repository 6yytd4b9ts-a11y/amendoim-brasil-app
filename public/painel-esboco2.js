// ESBOÇO do painel (parte 2): "Hoje" (o que depende do Helder a cada manhã), banco de produtores e edição da agenda,
// do patrocínio e da leitura do clima. Dados de teste, guardados só neste aparelho.
import { conteudo, salvarConteudo, perfil, PRODUTORES_FICTICIOS, ALQUEIRE_HA } from '/esboco-dados.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n, d = 0) => (n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const brl = (n) => (n == null || !isFinite(n) ? 'R$ —' : 'R$ ' + nf(n, 2));
const tile = (rot, val, sub = '') => `<div class="pn-tile"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const aviso = (t) => `<div class="es-aviso"><span>${t}</span></div>`;
const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const CHAVE_FEITO = 'ab-esboco-hoje';
const lerFeito = () => { try { const j = JSON.parse(localStorage.getItem(CHAVE_FEITO) || '{}'); return j.dia === hojeISO() ? j : { dia: hojeISO(), itens: {} }; } catch (e) { return { dia: hojeISO(), itens: {} }; } };
const gravarFeito = (j) => { try { localStorage.setItem(CHAVE_FEITO, JSON.stringify(j)); } catch (e) { /* ignora */ } };

const est = { dados: null, carregando: false, msg: '' };
let redesenhar = () => {};

async function carregarDados() {
  if (est.dados || est.carregando) return;
  est.carregando = true;
  try {
    const [c, m] = await Promise.all(['cotacoes', 'mercado'].map((a) => fetch(`/data/${a}.json`, { cache: 'no-cache' }).then((r) => r.json())));
    est.dados = { c, m };
  } catch (e) { est.dados = { c: {}, m: {} }; }
  est.carregando = false;
  redesenhar();
}

// ---------- Hoje ----------
export function telaHoje() {
  carregarDados();
  const feito = lerFeito().itens;
  const c = est.dados?.c || {}, m = est.dados?.m || {}, dest = c.destaque || {};
  const rascunho = dest.preco ? `Amendoim hoje: ${dest.fonte || 'IEA'} ${dest.regiao || 'Tupã'} ${brl(dest.preco)} a saca. Veja o mercado do dia no app.` : 'Carregando…';
  const hoje = hojeISO(), em7 = new Date(hoje + 'T12:00:00Z'); em7.setUTCDate(em7.getUTCDate() + 7);
  const semana = (conteudo().agenda || []).filter((e) => e.data && !e.fim && e.data >= hoje && e.data <= em7.toISOString().slice(0, 10));
  const item = (id, titulo, corpo, quando = '') => `<section class="cartao pe-tarefa ${feito[id] ? 'feito' : ''}" style="gap:10px">
    <div class="cartao-cab"><b style="font-size:15px">${feito[id] ? '✓ ' : ''}${titulo}</b>${quando ? `<span class="mini">${quando}</span>` : ''}</div>
    ${feito[id] ? `<span class="mini">Feito hoje. <button class="dx-sair" data-pe-desfazer="${id}" style="padding:0">desfazer</button></span>` : corpo}
  </section>`;
  const pendentes = ['notificacao', 'fisico', 'fato'].filter((k) => !feito[k]).length;
  return `
  ${aviso('<b>Como vai funcionar:</b> de segunda a sexta, às 7h45, o Claude prepara estes rascunhos e te avisa no celular. Você só confere, ajusta e aprova. No esboço os rascunhos são de exemplo e nada é enviado.')}
  <div class="pn-tiles pn-tiles-3">
    ${tile('Para você hoje', `${pendentes} de 3`, pendentes ? 'tarefas esperando' : 'tudo em dia')}
    ${tile('Na agenda da semana', nf(semana.length), 'o app avisa sozinho')}
    ${tile('Atualiza sozinho', '7 fontes', 'sem depender de você')}
  </div>
  ${item('notificacao', 'Notificação do dia', `
    <div class="campo"><label for="pe-not-txt">Rascunho do Claude (edite à vontade)</label><textarea id="pe-not-txt" rows="3">${esc(rascunho)}</textarea></div>
    <div class="campo"><label for="pe-not-pub">Para quem</label><select id="pe-not-pub"><option>Todos que ativaram avisos</option><option>Só assinantes</option><option>Só Alta Paulista</option><option>Só Mogiana / Ribeirão</option></select></div>
    <div class="es-botoes"><button class="btn btn-verde btn-pequeno" data-pe-feito="notificacao">Aprovar e enviar</button><button class="btn btn-pequeno es-btn-claro" data-pe-feito="notificacao">Hoje não</button></div>`, 'até 9h')}
  ${item('fisico', 'Preço do mercado físico', `
    <span class="mini">Referência oficial de hoje: ${dest.preco ? `${esc(dest.fonte)} ${esc(dest.regiao)} ${brl(dest.preco)}` : '…'}. Informe o que o mercado está pagando de verdade:</span>
    <div class="pe-grade"><div class="campo"><label>Alta Paulista (R$/sc)</label><input inputmode="decimal" placeholder="ex.: 82,00"></div><div class="campo"><label>Mogiana (R$/sc)</label><input inputmode="decimal" placeholder="ex.: 84,00"></div></div>
    <div class="es-botoes"><button class="btn btn-verde btn-pequeno" data-pe-feito="fisico">Publicar</button><button class="btn btn-pequeno es-btn-claro" data-pe-feito="fisico">Mesmo de ontem</button></div>`)}
  ${item('fato', 'Fato do dia', `
    <div class="campo"><label for="pe-fato">Rascunho do Claude</label><textarea id="pe-fato" rows="3">${esc(m.fato ? `${m.fato.titulo}. ${m.fato.texto || ''}` : 'Carregando…')}</textarea></div>
    <div class="es-botoes"><button class="btn btn-verde btn-pequeno" data-pe-feito="fato">Publicar</button><button class="btn btn-pequeno es-btn-claro" data-pe-feito="fato">Manter o de ontem</button></div>`)}
  <section class="cartao" style="gap:8px">
    <div class="cartao-cab"><b style="font-size:15px">Balcão de negócios</b><button class="btn btn-escuro btn-pequeno" data-pn-aba="balcao">Abrir</button></div>
    <span class="mini">Anúncios novos esperando aprovação aparecem na aba Balcão (e chegam no seu celular).</span>
  </section>
  <section class="cartao" style="gap:8px">
    <b style="font-size:15px">Agenda desta semana</b>
    ${semana.length ? semana.map((e) => `<div class="lista-linha"><span class="cresce"><b style="font-size:14px;display:block">${esc(e.titulo)}</b><span class="mini">${e.data.split('-').reverse().join('/')}</span></span><span class="pilula pilula-verde">aviso automático</span></div>`).join('') : '<span class="mini">Nada marcado para os próximos 7 dias.</span>'}
  </section>
  <section class="cartao" style="gap:6px">
    <b style="font-size:15px">Atualiza sozinho, sem você</b>
    ${[['Preço IEA (Tupã)', 'todo dia útil'], ['Preço Conab (SP)', 'toda semana'], ['Dólar', 'ao vivo'], ['Clima e previsão', 'a cada abertura do app'], ['Exportação (Comex Stat)', 'todo mês'], ['Mundo (USDA)', 'todo mês'], ['Lembretes da agenda', '1 dia antes']].map(([a, b]) => `<div class="lista-linha"><span class="cresce" style="font-size:14px">✓ ${a}</span><span class="mini">${b}</span></div>`).join('')}
  </section>`;
}

// ---------- Produtores ----------
function listaProdutores() {
  const eu = perfil();
  return [...(eu ? [{ ...eu, uf: '', nome: eu.nome + ' (este aparelho)' }] : []), ...PRODUTORES_FICTICIOS];
}
export function telaProdutores() {
  const l = listaProdutores();
  const soma = (k) => l.reduce((s, p) => s + (p[k] || 0), 0);
  const a1 = soma('a2526'), a2 = soma('a2627'), v = a1 ? ((a2 - a1) / a1) * 100 : null;
  const reg = {};
  l.forEach((p) => { const r = (reg[p.municipio] = reg[p.municipio] || { n: 0, a1: 0, a2: 0 }); r.n++; r.a1 += p.a2526 || 0; r.a2 += p.a2627 || 0; });
  const linhas = Object.entries(reg).sort((x, y) => y[1].a1 - x[1].a1);
  const zap = (n) => `https://wa.me/55${String(n || '').replace(/\D/g, '')}`;
  return `
  ${aviso('<b>Esboço:</b> produtores fictícios (e o seu cadastro, se você fez neste aparelho). Na versão final, cada produtor que se cadastra no app entra aqui sozinho. Só você vê os nomes; no app aparece só a soma.')}
  <div class="pn-tiles pn-tiles-4">
    ${tile('Produtores cadastrados', nf(l.length))}
    ${tile('Área 25/26', `${nf(a1)} alq`, `${nf(a1 * ALQUEIRE_HA)} ha`)}
    ${tile('Vão plantar 26/27', `${nf(a2)} alq`, `${nf(a2 * ALQUEIRE_HA)} ha`)}
    ${tile('Variação de área', v == null ? '—' : `${v > 0 ? '+' : ''}${nf(v, 0)}%`, 'sinal para a sua estimativa')}
  </div>
  <section class="cartao dx-cartao">
    <div class="cartao-cab"><span class="rotulo">Por município</span><span class="mini">alqueires</span></div>
    <div class="tabela-rolar"><table class="tabela dx-tabela pe-prod">
      <thead><tr><th>Município</th><th>Prod.</th><th>25/26</th><th>26/27</th><th>Var.</th></tr></thead>
      <tbody>${linhas.map(([mun, r]) => { const x = r.a1 ? ((r.a2 - r.a1) / r.a1) * 100 : null; return `<tr><th>${esc(mun)}</th><td class="num">${r.n}</td><td class="num">${nf(r.a1)}</td><td class="num">${nf(r.a2)}</td><td class="num"><span class="${x < 0 ? 'dx-cai' : 'dx-sobe'}">${x == null ? '—' : `${x > 0 ? '+' : ''}${nf(x, 0)}%`}</span></td></tr>`; }).join('')}</tbody>
    </table></div>
  </section>
  <div class="es-botoes"><button class="btn btn-escuro btn-pequeno" data-pe-csv>Baixar planilha (CSV)</button></div>
  <details class="abre cartao" style="padding:0 16px"><summary>Ver a lista de produtores (${l.length})</summary>
  ${l.map((p) => `<section class="cartao" style="gap:6px">
    <div class="cartao-cab"><b style="font-size:15px">${esc(p.nome)}</b><span class="mini">${esc(p.municipio)}${p.uf ? '/' + esc(p.uf) : ''}</span></div>
    <span class="mini">25/26: ${nf(p.a2526)} alq · 26/27: ${nf(p.a2627)} alq · armazém: ${esc(p.armazena || '—')}</span>
    <div class="es-botoes"><a class="btn btn-pequeno es-btn-claro" href="${zap(p.celular)}" target="_blank" rel="noopener">WhatsApp</a></div>
  </section>`).join('')}
  </details>`;
}

// ---------- Conteúdo: agenda, patrocínio e leitura do clima ----------
export function telaConteudoExtra() {
  const c = conteudo(), pt = c.patrocinio || { semestral: 6000, cotas: 5 };
  const TIPOS = { dados: 'Dados de mercado', safra: 'Safra', evento: 'Evento', camara: 'Câmara Setorial' };
  return `
  <form id="pe2-form" class="es-campos" style="margin-top:4px">
    <section class="cartao" style="gap:10px">
      <div class="cartao-cab"><span class="rotulo">Agenda do amendoim</span><span class="mini">${(c.agenda || []).length} itens</span></div>
      ${(c.agenda || []).map((e) => `<div class="lista-linha"><span class="cresce"><b style="font-size:14px;display:block">${esc(e.titulo)}</b><span class="mini">${e.data ? e.data.split('-').reverse().join('/') : 'data a definir'} · ${TIPOS[e.tipo] || ''}</span></span><button class="btn btn-pequeno es-btn-claro" type="button" data-pe-ag-rem="${esc(e.id)}">Remover</button></div>`).join('')}
      <details class="abre"><summary>+ Novo evento</summary>
        <div class="es-campos" style="padding-bottom:10px">
          <div class="campo"><label for="ag-tit">Título</label><input id="ag-tit" placeholder="ex.: Dia de campo em Tupã"></div>
          <div class="pe-grade"><div class="campo"><label for="ag-data">Data (vazio = a definir)</label><input id="ag-data" type="date"></div>
          <div class="campo"><label for="ag-tipo">Tipo</label><select id="ag-tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div></div>
          <div class="campo"><label for="ag-local">Local / horário</label><input id="ag-local"></div>
          <div class="campo"><label for="ag-det">Explicação (abre na setinha)</label><textarea id="ag-det" rows="2"></textarea></div>
          <button class="btn btn-escuro btn-pequeno" type="button" data-pe-ag-add>Adicionar à agenda</button>
        </div>
      </details>
    </section>
    <section class="cartao" style="gap:12px">
      <span class="rotulo">Patrocínio</span>
      <div class="pe-grade">
        <div class="campo"><label for="pe-pt-valor">Cota semestral (R$)</label><input id="pe-pt-valor" inputmode="decimal" value="${esc(String(pt.semestral).replace('.', ','))}"></div>
        <div class="campo"><label for="pe-pt-cotas">Máximo de marcas</label><input id="pe-pt-cotas" inputmode="numeric" value="${esc(pt.cotas)}"></div>
      </div>
      <span class="mini">= R$ ${nf(pt.semestral / 6, 0)} por mês por patrocinador · com ${pt.cotas} cotas: R$ ${nf((pt.semestral / 6) * pt.cotas, 0)} por mês</span>
    </section>
    <section class="cartao" style="gap:10px">
      <span class="rotulo">Leitura do clima da semana</span>
      <div class="campo"><textarea id="pe-leitura" rows="4">${esc(c.leituraClima || '')}</textarea></div>
      <span class="mini">A primeira frase aparece na aba Clima; o resto abre no "ler mais".</span>
    </section>
    <button class="btn btn-verde" type="submit">Salvar agenda, patrocínio e clima</button>
    <div class="mini" role="status" style="text-align:center">${esc(est.msg)}</div>
  </form>`;
}

export function ligarPainelEsboco2(desenhar) {
  redesenhar = () => desenhar();
  const t = (id) => (document.getElementById(id)?.value || '').trim();
  const n = (id) => { const x = parseFloat(t(id).replace(/\./g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest(s);
    let x;
    if ((x = q('[data-pe-feito]'))) { const j = lerFeito(); j.itens[x.dataset.peFeito] = true; gravarFeito(j); redesenhar(); return; }
    if ((x = q('[data-pe-desfazer]'))) { const j = lerFeito(); delete j.itens[x.dataset.peDesfazer]; gravarFeito(j); redesenhar(); return; }
    if (q('[data-pe-csv]')) {
      const l = listaProdutores();
      const csv = ['nome;celular;municipio;area_2526_alq;area_2627_alq;armazena', ...l.map((p) => [p.nome, p.celular, p.municipio, p.a2526, p.a2627, p.armazena].map((v) => String(v ?? '').replace(/;/g, ',')).join(';'))].join('\n');
      const u = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = u; a.download = 'produtores-amendoim-brasil.csv'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 10000); return;
    }
    if ((x = q('[data-pe-ag-rem]'))) {
      if (!x.dataset.certeza) { x.dataset.certeza = '1'; x.textContent = 'Confirmar'; return; }
      const c = conteudo(); c.agenda = (c.agenda || []).filter((y) => y.id !== x.dataset.peAgRem); salvarConteudo(c); est.msg = 'Evento removido.'; redesenhar(); return;
    }
    if (q('[data-pe-ag-add]')) {
      if (!t('ag-tit')) { est.msg = 'Escreva o título do evento.'; redesenhar(); return; }
      const c = conteudo();
      c.agenda = [...(c.agenda || []), { id: 'n' + Date.now(), data: t('ag-data') || null, tipo: t('ag-tipo'), titulo: t('ag-tit'), local: t('ag-local') || (t('ag-data') ? '' : 'Data a definir'), detalhe: t('ag-det') }];
      salvarConteudo(c); est.msg = 'Evento adicionado. Abra a Agenda no app deste aparelho para ver.'; redesenhar();
    }
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'pe2-form') return;
    e.preventDefault();
    const c = conteudo();
    c.patrocinio = { semestral: n('pe-pt-valor') || 6000, cotas: Math.max(1, Math.round(n('pe-pt-cotas')) || 5) };
    c.leituraClima = t('pe-leitura');
    salvarConteudo(c); est.msg = 'Salvo. Abra o app neste aparelho para ver.'; redesenhar();
  });
}
