// ESBOÇO (parte 2): acesso fácil à área do assinante, agenda do amendoim, cadastro grátis da lavoura e página de patrocínio.
import { conteudo, sessao, assinante, perfil, salvarPerfil, lembretes, alternarLembrete } from '/esboco-dados.js';
import { MUNICIPIOS } from '/clima.js';

let h = null;
let ctx = { render: () => {}, evento: () => {}, escolherLocal: () => {} };
const est = { filtro: 'todos', editar: false, msg: '' };

const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TIPOS = { dados: ['Dados de mercado', 'es-t-dados'], safra: ['Safra', 'es-t-safra'], evento: ['Evento', 'es-t-evento'], camara: ['Câmara Setorial', 'es-t-camara'] };
const nf = (n, d = 0) => (n == null || !isFinite(n) ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const estrela = '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>';
const calendario = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>';
const lavoura = '<path d="M12 21V9M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 11c3 0 5-2 5-5-3 0-5 2-5 5zM5 21h14"/>';

// ---------- Faixa da Área do Assinante (logo abaixo do topo da tela inicial) ----------
export function faixaAssinante(hh) {
  h = hh;
  const s = sessao(), ok = assinante(), c = conteudo(), ult = c.estimativas[c.estimativas.length - 1];
  return `<a class="es-faixa-ass" href="#/mercado/consultoria" data-ev="esb-faixa">
    <span class="es-faixa-ic">${h.ic(estrela, 'style="width:20px;height:20px;stroke:#5C3A06;fill:#F4AD46"')}</span>
    <span class="cresce"><b>${ok ? `Olá, ${h.esc((s.nome || 'assinante').split(' ')[0])} · sua área` : 'Área do Assinante'}</b>
      <small>${ok ? `Novo: estimativa ${h.esc(ult.safra)} e balanço do mês` : `Quanto o Brasil vai colher em ${h.esc(ult.safra)}? Estimativas e relatórios`}</small></span>
    <span class="es-faixa-btn">${ok ? 'Abrir' : 'Conhecer'}</span>
  </a>`;
}

// ---------- Agenda ----------
function eventos() {
  const hoje = hojeISO();
  const lista = conteudo().agenda || [];
  const ativo = (e) => e.data && (e.fim ? e.fim >= hoje : e.data >= hoje);
  return {
    hoje,
    proximos: lista.filter(ativo).sort((a, b) => (a.data < b.data ? -1 : 1)),
    passados: lista.filter((e) => e.data && !ativo(e)).sort((a, b) => (a.data > b.data ? -1 : 1)),
    semData: lista.filter((e) => !e.data)
  };
}
const dataBloco = (e) => {
  if (!e.data) return '<span class="es-data es-data-vazia"><b>?</b><small>a definir</small></span>';
  const [, m, d] = e.data.split('-');
  if (e.fim) { const [, m2] = e.fim.split('-'); return `<span class="es-data"><b>${MESES[+m - 1]}</b><small>a ${MESES[+m2 - 1]}</small></span>`; }
  return `<span class="es-data"><b>${+d}</b><small>${MESES[+m - 1]}</small></span>`;
};
const quando = (e, hoje) => {
  if (!e.data) return '';
  if (e.fim && e.data <= hoje) return 'acontecendo agora';
  const dias = Math.round((new Date(e.data + 'T12:00:00Z') - new Date(hoje + 'T12:00:00Z')) / 86400000);
  return dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : dias > 0 ? `em ${dias} dias` : '';
};

export function cartaoAgendaInicio(hh) {
  h = hh;
  const { hoje, proximos } = eventos();
  const agora = proximos.find((e) => e.fim && e.data <= hoje);
  const prox = proximos.filter((e) => !e.fim || e.data > hoje).slice(0, 2);
  if (!prox.length && !agora) return '';
  return `<a class="cartao es-agenda-inicio" href="#/agenda" data-ev="esb-agenda-inicio">
    <div class="cartao-cab"><span class="rotulo">Agenda do amendoim</span><span class="link-mini">ver tudo ›</span></div>
    ${prox.map((e) => `<div class="es-ag-linha">${dataBloco(e)}<span class="cresce"><b>${h.esc(e.titulo)}</b><small>${h.esc(quando(e, hoje))}${e.aConfirmar ? ' · data aproximada' : ''}</small></span></div>`).join('')}
    ${agora ? `<span class="mini" style="display:flex;align-items:center;gap:6px"><i class="es-ponto-vivo"></i>Agora: ${h.esc(agora.titulo.split(' · ')[0])}</span>` : ''}
  </a>`;
}

function itemAgenda(e, hoje, avisos) {
  const [tipo, cls] = TIPOS[e.tipo] || ['Outro', ''];
  const ligado = avisos.includes(e.id);
  return `<details class="es-ag-item">
    <summary>${dataBloco(e)}
      <span class="cresce"><span class="es-tipo ${cls}">${tipo}</span><b>${h.esc(e.titulo)}</b><small>${h.esc(e.local || '')}${quando(e, hoje) ? ' · ' + quando(e, hoje) : ''}</small></span>
    </summary>
    <div class="es-ag-corpo">
      <p>${h.esc(e.detalhe || '')}</p>
      <div class="es-botoes">
        ${e.data ? `<button class="btn btn-pequeno ${ligado ? 'btn-verde' : 'es-btn-claro'}" type="button" data-ag-lembrar="${h.esc(e.id)}" aria-pressed="${ligado}">${h.ic(h.I.sino, `style="width:16px;height:16px;stroke:${ligado ? '#fff' : 'currentColor'}"`)}${ligado ? 'Vou ser avisado' : 'Me avisar'}</button>
        <button class="btn btn-pequeno es-btn-claro" type="button" data-ag-ics="${h.esc(e.id)}">Salvar na agenda do celular</button>` : '<span class="mini">Assim que a data sair, o app avisa quem ativou os avisos.</span>'}
      </div>
    </div>
  </details>`;
}

export function telaAgenda(hh) {
  h = hh;
  const { hoje, proximos, passados, semData } = eventos();
  const avisos = lembretes();
  const filtra = (l) => (est.filtro === 'todos' ? l : l.filter((e) => e.tipo === est.filtro));
  const grupos = {};
  filtra(proximos).forEach((e) => { const k = e.fim && e.data <= hoje ? 'Agora' : `${MESES_LONGO[+e.data.slice(5, 7) - 1]} ${e.data.slice(0, 4)}`; (grupos[k] = grupos[k] || []).push(e); });
  return `<header class="topo">
    <a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Agenda do amendoim</h1><div class="sub">Relatórios que mexem no preço, safra e eventos do setor</div></div>
  </header>
  <div class="chips">${[['todos', 'Tudo'], ['dados', 'Dados de mercado'], ['safra', 'Safra'], ['evento', 'Eventos'], ['camara', 'Câmara Setorial']].map(([k, t]) => `<button class="chip" data-ag-filtro="${k}" aria-pressed="${est.filtro === k}">${t}</button>`).join('')}</div>
  ${est.filtro === 'camara' || est.filtro === 'todos' ? `<section class="cartao es-camara">
    <div class="cartao-cab"><span class="rotulo">Câmara Setorial do Amendoim</span><span class="pilula pilula-azul" style="font-size:11px">Em breve</span></div>
    <span class="es-txt">Comunicados oficiais, resumo das reuniões e a estimativa de área do setor, publicados aqui com autorização da Câmara.</span>
  </section>` : ''}
  ${Object.keys(grupos).length ? Object.entries(grupos).map(([g, l]) => `<div class="secao-titulo"><h2>${h.esc(g)}</h2></div>${l.map((e) => itemAgenda(e, hoje, avisos)).join('')}`).join('') : '<div class="vazio">Nada marcado nesse filtro.</div>'}
  ${filtra(semData).length ? `<div class="secao-titulo"><h2>Data a definir</h2></div>${filtra(semData).map((e) => itemAgenda(e, hoje, avisos)).join('')}` : ''}
  <section class="cartao" style="gap:6px">
    <span class="rotulo">Toda semana, sem precisar marcar</span>
    <span class="es-txt">IEA: preço da casca em Tupã · Conab: preço médio de SP · dólar e clima todo dia. O app atualiza sozinho.</span>
  </section>
  ${filtra(passados).length ? `<details class="abre es-ag-passados"><summary>Já aconteceu (${filtra(passados).length})</summary>${filtra(passados).map((e) => itemAgenda(e, hoje, avisos)).join('')}</details>` : ''}
  <p class="mini es-legal">Datas do USDA e da Conab conferidas nas fontes oficiais. As outras ficam como "a confirmar" até sair a data.</p>`;
}

function baixarICS(e) {
  const d = (iso) => iso.replace(/-/g, '');
  const fim = e.fim ? e.fim : e.data;
  const prox = new Date(fim + 'T12:00:00Z'); prox.setUTCDate(prox.getUTCDate() + 1);
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Amendoim Brasil//Agenda//PT', 'BEGIN:VEVENT', `UID:${e.id}@amendoimbrasil`, `DTSTART;VALUE=DATE:${d(e.data)}`, `DTEND;VALUE=DATE:${d(prox.toISOString().slice(0, 10))}`,
    `SUMMARY:${e.titulo.replace(/[,;]/g, ' ')}`, `DESCRIPTION:${String(e.detalhe || '').replace(/[,;\n]/g, ' ')} · Amendoim Brasil`, 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete Amendoim Brasil', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const u = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
  const a = document.createElement('a'); a.href = u; a.download = `amendoim-${e.id}.ics`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}

// ---------- Cadastro grátis da lavoura ----------
export function cartaoPerfilInicio(hh) {
  h = hh;
  if (perfil()) return '';
  return `<a class="cartao es-perfil-inicio" href="#/perfil" data-ev="esb-perfil-inicio">
    <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:var(--verde-claro)">${h.ic(lavoura, 'style="stroke:#007731"')}</span>
    <span class="cresce"><b style="font-size:15px;display:block">Cadastre sua lavoura · grátis</b><span class="mini">Chuva e preço da sua região, e você ajuda a medir a safra</span></span>
    ${h.ic(h.I.seta, 'style="width:18px;height:18px;stroke:#5F5B52"')}
  </a>`;
}

export function telaPerfil(hh) {
  h = hh;
  const p = perfil();
  const voltar = `<header class="topo"><a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Minha lavoura</h1><div class="sub">Cadastro grátis · leva 1 minuto</div></div></header>`;
  if (p && !est.editar) {
    const linha = (a, b) => `<div class="lista-linha"><span class="cresce mini" style="font-size:14px">${a}</span><b style="font-size:15px;text-align:right">${b}</b></div>`;
    const v = p.a2526 ? ((p.a2627 - p.a2526) / p.a2526) * 100 : null;
    return `${voltar}
    <section class="cartao" style="gap:0;padding:4px 16px">
      <div class="cartao-cab" style="padding:12px 0 6px"><b style="font-size:18px">${h.esc(p.nome)}</b><span class="pilula pilula-verde">Cadastrado</span></div>
      ${linha('Município', h.esc(p.municipio))}
      ${linha('Área 25/26', `${nf(p.a2526)} alq`)}
      ${linha('Vai plantar em 26/27', `${nf(p.a2627)} alq${v != null ? ` (${v > 0 ? '+' : ''}${nf(v)}%)` : ''}`)}
      ${linha('Armazena', h.esc(p.armazena))}
    </section>
    <section class="cartao" style="gap:8px">
      <span class="rotulo">O que você ganha com o cadastro</span>
      <div class="es-item">${h.ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#007731;stroke-width:2.4;flex-shrink:0"')}<span>Clima e alerta de chuva do seu município</span></div>
      <div class="es-item">${h.ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#007731;stroke-width:2.4;flex-shrink:0"')}<span>Preço físico da sua região quando pedir</span></div>
      <div class="es-item">${h.ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#007731;stroke-width:2.4;flex-shrink:0"')}<span>Seu número entra (sem o seu nome) na estimativa de área da região</span></div>
    </section>
    <div class="es-botoes"><button class="btn btn-escuro btn-pequeno" type="button" data-pf-editar>Editar</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pf-apagar>Apagar meu cadastro</button></div>
    <div class="mini" role="status">${h.esc(est.msg)}</div>`;
  }
  const v = p || {};
  const opts = MUNICIPIOS.map((m) => `<option ${v.municipio === m.nome ? 'selected' : ''}>${h.esc(m.nome)}</option>`).join('');
  return `${voltar}
  <form id="pf-form" class="cartao es-form es-campos">
    <span class="es-txt">Com esses dados o app mostra o clima e o preço da sua região. A área informada ajuda a Amendoim Brasil a medir a safra (sempre somada, nunca com o seu nome).</span>
    <div class="campo"><label for="pf-nome">Nome</label><input id="pf-nome" autocomplete="name" required value="${h.esc(v.nome || '')}"></div>
    <div class="campo"><label for="pf-cel">Celular com WhatsApp</label><input id="pf-cel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" required value="${h.esc(v.celular || '')}"></div>
    <div class="campo"><label for="pf-mun">Município da lavoura</label><select id="pf-mun">${opts}<option ${v.municipio && !MUNICIPIOS.some((m) => m.nome === v.municipio) ? 'selected' : ''}>Outro</option></select></div>
    <div class="es-duas">
      <div class="campo"><label for="pf-a1">Plantou em 25/26</label><input id="pf-a1" inputmode="decimal" placeholder="alqueires" value="${h.esc(v.a2526 ?? '')}"></div>
      <div class="campo"><label for="pf-a2">Vai plantar em 26/27</label><input id="pf-a2" inputmode="decimal" placeholder="alqueires" value="${h.esc(v.a2627 ?? '')}"></div>
    </div>
    <div class="campo"><label for="pf-arm">Tem armazém próprio?</label><select id="pf-arm"><option ${v.armazena === 'Não' ? '' : 'selected'}>Não</option><option ${v.armazena === 'Sim' ? 'selected' : ''}>Sim</option></select></div>
    <label class="es-check"><input type="checkbox" id="pf-ok" required ${p ? 'checked' : ''}><span>Autorizo o uso dos meus dados conforme a <a class="link-mini" href="#/privacidade">Política de privacidade</a>. Posso apagar quando quiser.</span></label>
    <button class="btn btn-verde" type="submit">${p ? 'Salvar' : 'Cadastrar grátis'}</button>
    <details class="abre"><summary>Por que pedimos a área?</summary><p class="es-txt" style="margin:0 0 10px">Ninguém sabe ao certo quanto se planta de amendoim no Brasil. Somando a área de quem usa o app, região por região, a estimativa de safra fica mais precisa, e isso ajuda você a negociar melhor.</p></details>
  </form>`;
}

// ---------- Patrocínio ----------
export function telaPatrocinio(D, hh) {
  h = hh;
  const c = conteudo(), pt = c.patrocinio || { semestral: 6000, cotas: 5 };
  const ocupadas = (D.patrocinadores || []).filter((p) => p.nome && !p.exemplo).length;
  const livres = Math.max(0, pt.cotas - ocupadas);
  const zap = h.wa('Olá Helder, quero ser patrocinador do app Amendoim Brasil. Pode me mandar as opções?');
  const formatos = [
    ['Previsão do tempo', 'Sua marca na aba Clima, a tela que o produtor abre todo dia no plantio e na colheita.'],
    ['Mercado hoje', 'Sua marca no resumo diário de preço, dólar e exportação, na tela inicial.'],
    ['Boletim do mês', 'Sua marca no boletim dentro do app e no PDF que circula nos grupos de WhatsApp.'],
    ['Agenda do amendoim', 'Sua marca nos lembretes de relatórios e eventos do setor.'],
    ['Logo no rodapé', 'Presença fixa na tela inicial, com link para o seu site ou WhatsApp.']
  ];
  const ok = (t) => `<div class="es-item">${h.ic('<path d="M5 12l5 5 9-10"/>', 'style="width:18px;height:18px;stroke:#007731;stroke-width:2.6;flex-shrink:0"')}<span>${t}</span></div>`;
  return `<header class="topo">
    <a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Patrocine o app</h1><div class="sub">Fale com quem produz e negocia amendoim</div></div>
  </header>
  <section class="destaque" style="gap:10px">
    <b style="font-size:19px;line-height:1.3">Sua marca no app que o produtor de amendoim abre todo dia</b>
    <span style="font-size:14px;line-height:1.5;opacity:.92">Preço, clima, agenda e mercado com o Helder Lamberti. Público: produtores, beneficiadoras, cerealistas e indústrias de SP, MS e MG.</span>
  </section>
  <section class="cartao es-cota">
    <div class="cartao-cab"><span class="rotulo">Cota semestral</span><span class="pilula ${livres ? 'pilula-verde' : 'pilula-amendoim'}">${livres ? `${livres} de ${pt.cotas} vagas` : 'Esgotado'}</span></div>
    <div class="num"><span class="es-preco">R$ ${nf(pt.semestral, 0)}</span><span class="mini"> por 6 meses</span></div>
    <span class="mini">ou 6× de R$ ${nf(pt.semestral / 6, 0)} · no máximo ${pt.cotas} marcas no app, uma por categoria</span>
    <div class="es-lista">
      ${ok('Um espaço fixo no app, à sua escolha')}
      ${ok('Marca no boletim mensal e no PDF')}
      ${ok('Divulgação no Instagram @amendoim.brasil')}
      ${ok('Relatório mensal de visualizações e cliques')}
    </div>
    ${zap ? `<a class="btn btn-verde" href="${zap}" target="_blank" rel="noopener" data-ev="anunciar">${h.ic(h.I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Quero patrocinar</a>` : ''}
  </section>
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 4px"><span class="rotulo">Onde sua marca aparece</span></div>
    ${formatos.map(([t, d]) => `<details class="abre"><summary>${t}</summary><p class="es-txt" style="margin:0 0 10px">${d}</p></details>`).join('')}
  </section>
  <p class="mini es-legal">Valor de exemplo, ajustável no painel.</p>`;
}

// ---------- eventos ----------
export function ligarEsboco2(opcoes) {
  ctx = { ...ctx, ...opcoes };
  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest(s);
    let x;
    if ((x = q('[data-ag-filtro]'))) { est.filtro = x.dataset.agFiltro; ctx.render(false); return; }
    if ((x = q('[data-ag-lembrar]'))) {
      e.preventDefault();
      const ligou = alternarLembrete(x.dataset.agLembrar);
      if (ligou) ctx.evento('esb-lembrete');
      const det = x.closest('details'); ctx.render(false);
      if (det) { const novo = document.querySelector(`[data-ag-lembrar="${CSS.escape(x.dataset.agLembrar)}"]`)?.closest('details'); if (novo) novo.open = true; }
      return;
    }
    if ((x = q('[data-ag-ics]'))) { const ev = (conteudo().agenda || []).find((y) => y.id === x.dataset.agIcs); if (ev) baixarICS(ev); return; }
    if (q('[data-pf-editar]')) { est.editar = true; est.msg = ''; ctx.render(false); return; }
    if (q('[data-pf-apagar]')) {
      const b = q('[data-pf-apagar]');
      if (!b.dataset.certeza) { b.dataset.certeza = '1'; b.textContent = 'Toque de novo para apagar'; return; }
      salvarPerfil(null); est.editar = false; ctx.render(false); return;
    }
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'pf-form') return;
    e.preventDefault();
    const v = (s) => (document.getElementById(s)?.value || '').trim();
    const n = (s) => { const x = parseFloat(v(s).replace(/\./g, '').replace(',', '.')); return isFinite(x) ? x : null; };
    salvarPerfil({ nome: v('pf-nome'), celular: v('pf-cel'), municipio: v('pf-mun'), a2526: n('pf-a1'), a2627: n('pf-a2'), armazena: v('pf-arm'), data: hojeISO() });
    const m = MUNICIPIOS.find((x) => x.nome === v('pf-mun'));
    if (m) ctx.escolherLocal(m);
    est.editar = false; est.msg = 'Cadastro salvo. O clima já mostra o seu município.';
    ctx.evento('esb-perfil'); ctx.render(false);
  });
}
