// ESBOÇO das abas Assinantes e Conteúdo do painel. Dados de teste, guardados só neste aparelho.
// Na versão final: assinantes e pagamentos vêm do Supabase/Asaas e o conteúdo salvo vale para todo mundo.
import { conteudo, salvarConteudo, restaurarConteudo, assinantes, salvarAssinantes, producao } from '/esboco-dados.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n, d = 0) => (n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const tile = (rot, val, sub = '') => `<div class="pn-tile"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const aviso = (t) => `<div class="es-aviso"><span>${t}</span></div>`;
const STATUS = { ativo: ['Ativo', 'pilula-verde'], cortesia: ['Cortesia', 'pilula-azul'], atrasado: ['Atrasado', 'pilula-amendoim'], cancelado: ['Cancelado', ''] };

const est = { filtro: 'todos', busca: '', novo: false, msg: '' };
let redesenhar = () => {};

// ---------- Assinantes ----------
export function telaAssinantesAdm() {
  const lista = assinantes(), c = conteudo();
  const conta = (s) => lista.filter((a) => a.status === s).length;
  const receita = lista.filter((a) => a.status === 'ativo').reduce((s, a) => {
    const emp = /Empresa/.test(a.plano), anual = /anual/.test(a.plano), p = c.planos[emp ? 'empresa' : 'produtor'];
    return s + (anual ? p.anual / 12 : p.mensal);
  }, 0);
  const vis = lista.filter((a) => (est.filtro === 'todos' || a.status === est.filtro) && (!est.busca || (a.nome + a.municipio + a.celular).toLowerCase().includes(est.busca.toLowerCase())));
  const zap = (n) => `https://wa.me/55${String(n).replace(/\D/g, '')}`;
  return `
  ${aviso('<b>Esboço:</b> nomes fictícios para você ver como fica. Na versão final a lista vem do cadastro e os pagamentos do Asaas, atualizados sozinhos.')}
  <div class="pn-tiles pn-tiles-4">
    ${tile('Assinantes ativos', nf(conta('ativo')), `${nf(conta('cortesia'))} de cortesia (consultoria)`)}
    ${tile('Receita por mês', 'R$ ' + nf(receita, 0), 'planos anuais divididos por 12')}
    ${tile('Pagamento atrasado', nf(conta('atrasado')), 'o app avisa o cliente sozinho')}
    ${tile('Cancelados', nf(conta('cancelado')), 'nos últimos 90 dias')}
  </div>
  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Liberar cliente da consultoria</span><button class="btn btn-verde btn-pequeno" data-pe-novo>${est.novo ? 'Fechar' : '+ Liberar acesso'}</button></div>
    ${est.novo ? `<form id="pe-form-novo" class="es-campos">
      <div class="campo"><label for="pe-nome">Nome</label><input id="pe-nome" required></div>
      <div class="campo"><label for="pe-cel">Celular (WhatsApp)</label><input id="pe-cel" type="tel" inputmode="tel" required></div>
      <div class="campo"><label for="pe-ate">Acesso até</label><input id="pe-ate" type="date" required></div>
      <button class="btn btn-escuro" type="submit">Liberar sem cobrança</button>
      <span class="mini">O cliente entra com o código no WhatsApp, sem pagar nada até a data escolhida.</span>
    </form>` : '<span class="mini">Clientes da consultoria entram sem pagar: você escolhe até quando.</span>'}
  </section>
  <div class="chips">${[['todos', 'Todos'], ['ativo', 'Ativos'], ['cortesia', 'Cortesia'], ['atrasado', 'Atrasados'], ['cancelado', 'Cancelados']].map(([k, t]) => `<button class="chip" data-pe-filtro="${k}" aria-pressed="${est.filtro === k}">${t}</button>`).join('')}</div>
  <div class="campo"><input id="pe-busca" type="search" placeholder="Buscar por nome, cidade ou celular" value="${esc(est.busca)}" style="font-size:15px;font-weight:600"></div>
  ${vis.length ? vis.map((a) => {
    const [st, cl] = STATUS[a.status] || [a.status, ''];
    return `<section class="cartao" style="gap:8px">
      <div class="cartao-cab"><b style="font-size:15px">${esc(a.nome)}</b><span class="pilula ${cl}" ${cl ? '' : 'style="background:#ECE7DC;color:#5F5B52"'}>${st}</span></div>
      <span class="mini">${esc(a.perfil)} · ${esc(a.municipio)} · ${esc(a.plano)} · ${esc(a.pagamento)} · ${a.status === 'cancelado' ? 'acesso até' : 'vence'} ${esc(a.vence)}</span>
      <div class="es-botoes">
        <a class="btn btn-pequeno es-btn-claro" href="${zap(a.celular)}" target="_blank" rel="noopener">WhatsApp</a>
        ${a.status === 'atrasado' ? `<button class="btn btn-pequeno es-btn-claro" data-pe-cobrar="${a.id}">Reenviar cobrança</button>` : ''}
        ${a.status === 'cancelado' ? `<button class="btn btn-pequeno es-btn-claro" data-pe-acao="cortesia" data-id="${a.id}">Dar cortesia</button>` : `<button class="btn btn-pequeno es-btn-claro" data-pe-acao="cancelado" data-id="${a.id}">Tirar acesso</button>`}
      </div>
    </section>`;
  }).join('') : '<div class="vazio">Ninguém nesse filtro.</div>'}
  <div class="mini" role="status" style="text-align:center">${esc(est.msg)}</div>`;
}

// ---------- Conteúdo ----------
export function telaConteudo() {
  const c = conteudo();
  // Números com vírgula, do jeito brasileiro (0,9 · 29,90).
  const inp = (id, v, tipo = 'text', extra = '') => tipo === 'number'
    ? `<input id="${id}" type="text" inputmode="decimal" value="${esc(String(v ?? '').replace('.', ','))}" ${extra}>`
    : `<input id="${id}" type="${tipo}" value="${esc(v)}" ${extra}>`;
  return `
  ${aviso('<b>Esboço:</b> o que você salvar aqui aparece no app <b>deste aparelho</b> (abra Mercado › Assinantes). Na versão final vale para todos os assinantes na hora.')}
  <form id="pe-form-conteudo" class="es-campos">
    <section class="cartao" style="gap:12px">
      <div class="cartao-cab"><span class="rotulo">Estimativas Amendoim Brasil</span><span class="mini">área em mil ha · sacas por alqueire</span></div>
      ${c.estimativas.map((e, i) => {
        const p = producao(e);
        return `<div class="pe-safra">
          <div class="campo"><label>Safra</label>${inp(`pe-safra-${i}`, e.safra)}</div>
          <div class="campo"><label>Área mín.</label>${inp(`pe-amin-${i}`, e.areaMin, 'number')}</div>
          <div class="campo"><label>Área máx.</label>${inp(`pe-amax-${i}`, e.areaMax, 'number')}</div>
          <div class="campo"><label>sc/alq mín.</label>${inp(`pe-pmin-${i}`, e.prodMin, 'number')}</div>
          <div class="campo"><label>sc/alq máx.</label>${inp(`pe-pmax-${i}`, e.prodMax, 'number')}</div>
          <div class="campo"><label>Situação</label><select id="pe-sit-${i}">${['Estimativa', 'Preliminar', 'Fechada'].map((s) => `<option ${s === e.situacao ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <span class="mini pe-calc">= ${nf(p.scMeio / 1e6, 1)} mi sacas · ${nf(p.tMeio / 1000, 0)} mil t em casca</span>
        </div>`;
      }).join('')}
      <div class="campo"><label for="pe-comentario">Leitura do Helder (aparece embaixo da tabela)</label><textarea id="pe-comentario" rows="3">${esc(c.comentario)}</textarea></div>
      <div class="campo"><label for="pe-atualizado">Atualizado em</label>${inp('pe-atualizado', c.atualizado)}</div>
    </section>
    <section class="cartao" style="gap:12px">
      <span class="rotulo">Parâmetros do balanço por exclusão</span>
      <div class="pe-grade">
        <div class="campo"><label>Consumo kg/hab/ano</label>${inp('pe-consumo', c.balanco.consumoKgHab, 'number')}</div>
        <div class="campo"><label>População (mi hab)</label>${inp('pe-pop', c.balanco.populacaoMi, 'number')}</div>
        <div class="campo"><label>Semente kg casca/ha</label>${inp('pe-semente', c.balanco.sementeKgHa, 'number')}</div>
        <div class="campo"><label>Rendimento casca → grão %</label>${inp('pe-rend', c.balanco.rendimento, 'number')}</div>
      </div>
    </section>
    <section class="cartao" style="gap:12px">
      <div class="cartao-cab"><span class="rotulo">Planos e preços (R$)</span><span class="aviso-exemplo">Valores de exemplo</span></div>
      <div class="pe-grade">
        <div class="campo"><label>Produtor · mensal</label>${inp('pe-pm', c.planos.produtor.mensal, 'number')}</div>
        <div class="campo"><label>Produtor · anual</label>${inp('pe-pa', c.planos.produtor.anual, 'number')}</div>
        <div class="campo"><label>Empresa · mensal</label>${inp('pe-em', c.planos.empresa.mensal, 'number')}</div>
        <div class="campo"><label>Empresa · anual</label>${inp('pe-ea', c.planos.empresa.anual, 'number')}</div>
        <div class="campo"><label>Dias grátis para testar</label>${inp('pe-teste', c.diasTeste, 'number')}</div>
      </div>
      <span class="mini">Quem já assina mantém o preço até a renovação; o aviso de mudança sai 30 dias antes.</span>
    </section>
    <section class="cartao" style="gap:8px">
      <span class="rotulo">Em breve nesta aba</span>
      <span class="mini">Fato do dia, calendário de eventos com lembrete, preços por região e banner dos patrocinadores, tudo editável daqui.</span>
    </section>
    <div class="es-botoes"><button class="btn btn-verde" type="submit" style="flex:1">Salvar</button><button class="btn es-btn-claro" type="button" data-pe-restaurar>Voltar ao original</button></div>
    <div id="pe-msg" class="mini" role="status" style="text-align:center">${esc(est.msg)}</div>
  </form>`;
}

export function ligarPainelEsboco(desenhar) {
  redesenhar = () => { desenhar(); };
  const n = (id) => {
    let t = String(document.getElementById(id)?.value || '').trim();
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const v = parseFloat(t); return isFinite(v) ? v : 0;
  };
  const t = (id) => (document.getElementById(id)?.value || '').trim();

  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest(s);
    let x;
    if ((x = q('[data-pe-filtro]'))) { est.filtro = x.dataset.peFiltro; est.msg = ''; redesenhar(); return; }
    if (q('[data-pe-novo]')) { est.novo = !est.novo; redesenhar(); return; }
    if ((x = q('[data-pe-cobrar]'))) { x.textContent = 'Cobrança reenviada (simulado)'; x.disabled = true; return; }
    if ((x = q('[data-pe-acao]'))) {
      const l = assinantes(), a = l.find((y) => y.id === x.dataset.id);
      if (!a) return;
      if (x.dataset.peAcao === 'cancelado' && !x.dataset.certeza) { x.dataset.certeza = '1'; x.textContent = 'Toque de novo para confirmar'; return; }
      a.status = x.dataset.peAcao; if (a.status === 'cortesia') { a.plano = 'Consultoria'; a.pagamento = 'Cortesia'; }
      salvarAssinantes(l); est.msg = `${a.nome}: ${STATUS[a.status][0].toLowerCase()}.`; redesenhar(); return;
    }
    if (q('[data-pe-restaurar]')) { restaurarConteudo(); est.msg = 'Voltou ao original.'; redesenhar(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'pe-busca') return;
    est.busca = e.target.value; const pos = e.target.selectionStart;
    redesenhar(); const b = document.getElementById('pe-busca'); if (b) { b.focus(); b.setSelectionRange(pos, pos); }
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'pe-form-novo') {
      e.preventDefault();
      const l = assinantes();
      const [a, m, d] = t('pe-ate').split('-');
      l.unshift({ id: 'n' + Date.now(), nome: t('pe-nome'), celular: t('pe-cel'), perfil: 'Produtor', municipio: '—', plano: 'Consultoria', status: 'cortesia', vence: d ? `${d}/${m}/${a}` : '—', pagamento: 'Cortesia' });
      salvarAssinantes(l); est.novo = false; est.msg = 'Acesso liberado (simulado).'; redesenhar(); return;
    }
    if (e.target.id === 'pe-form-conteudo') {
      e.preventDefault();
      const c = conteudo();
      c.estimativas = c.estimativas.map((x, i) => ({ safra: t(`pe-safra-${i}`) || x.safra, areaMin: n(`pe-amin-${i}`), areaMax: n(`pe-amax-${i}`) || n(`pe-amin-${i}`), prodMin: n(`pe-pmin-${i}`), prodMax: n(`pe-pmax-${i}`) || n(`pe-pmin-${i}`), situacao: t(`pe-sit-${i}`) }));
      c.comentario = t('pe-comentario'); c.atualizado = t('pe-atualizado');
      c.balanco = { consumoKgHab: n('pe-consumo'), populacaoMi: n('pe-pop'), sementeKgHa: n('pe-semente'), rendimento: n('pe-rend') || 70 };
      c.planos = { produtor: { ...c.planos.produtor, mensal: n('pe-pm'), anual: n('pe-pa') }, empresa: { ...c.planos.empresa, mensal: n('pe-em'), anual: n('pe-ea') } };
      c.diasTeste = Math.round(n('pe-teste'));
      salvarConteudo(c); est.msg = 'Salvo. Abra o app neste aparelho para ver.'; redesenhar();
    }
  });
}
