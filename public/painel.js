// Painel de mercado: blocos novos da Home e da aba Mercado (teste de layout).
// Cada bloco é um cartão resumido; o detalhe abre quando a pessoa toca.
// h = utilitários do app (esc, ic, I, brl, numBr, pct, wa, linkSeguro).
import { listaOfertas } from '/balcao.js';

function seta(h, efeito) {
  const { I } = h;
  const svg = (p, c) => `<svg class="ic seta-ef ${c}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  if (efeito === 'alta') return svg(I.sobe, 'alta');
  if (efeito === 'baixa') return svg(I.cai, 'baixa');
  return '<span class="seta-ef neutro" aria-hidden="true">–</span>';
}

// Dólar ao vivo substitui o valor fixo do JSON quando disponível.
function itensHoje(D, h) {
  const lista = (D.mercado?.hoje || []).map((x) => ({ ...x }));
  const dol = lista.find((x) => x.id === 'dolar');
  if (dol && D.dolar) {
    dol.valor = h.brl(D.dolar.bid).replace('R$ ', 'R$ ');
    dol.nota = `${h.pct(D.dolar.pct)} hoje · ao vivo`;
    dol.efeito = D.dolar.pct < -0.05 ? 'baixa' : D.dolar.pct > 0.05 ? 'alta' : 'neutro';
  }
  return lista;
}

// "Atualizado hoje / ontem / há N dias" a partir de dd/mm/aaaa (horário de Brasília).
export function quando(br) {
  const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return br || '';
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const dias = Math.round((new Date(hoje + 'T12:00:00Z') - new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`)) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

// ---------- HOME ----------
// Resumo do dia em 4 quadros (o preço já está no destaque verde). Toque leva à aba Mercado.
const DESTINO = { dolar: '#/mercado/hoje', exportacao: '#/mercado/exportacao', demanda: '#/mercado/termometro', oferta: '#/mercado/termometro' };
export function blocoMercadoHoje(D, h) {
  const { esc } = h;
  const m = D.mercado;
  if (!m) return '';
  const itens = itensHoje(D, h).filter((x) => x.id !== 'fisico').slice(0, 4);
  return `<section class="cartao hoje">
    <div class="cartao-cab"><span class="rotulo">Mercado hoje</span><span class="mini" title="${esc(m.atualizado)}">Atualizado ${esc(quando(m.atualizado))}</span></div>
    <div class="hoje-grade">${itens.map((x) => `
      <a class="hoje-quadro ${x.efeito}" href="${DESTINO[x.id] || '#/mercado/hoje'}">
        <span class="hoje-rot">${esc(x.rotulo)}</span>
        <span class="hoje-valor">${seta(h, x.efeito)}<b class="num">${esc(x.valor)}</b></span>
        <span class="hoje-nota">${esc(x.nota)}</span>
      </a>`).join('')}
    </div>
    ${m.fato ? `<div class="fato-linha"><a href="#/mercado/hoje"><span class="fato-tag">Fato do dia</span><span>${esc(m.fato.titulo)}</span></a><button class="fato-enviar" data-compartilhar="fato" aria-label="Enviar o fato do dia no WhatsApp">${h.ic(h.I.enviar)}</button></div>` : ''}
    ${h.patrocinio ? h.patrocinio('mercado-hoje') : ''}
  </section>`;
}

// Mercado físico: o preço de negócio do dia vem direto com o Helder (o IEA e a Conab são médias).
export function blocoMercadoFisico(D, h) {
  const { ic, I } = h;
  const zap = h.wa('Olá Helder, quero saber o preço do mercado físico de hoje para o amendoim em casca. Minha região é: ');
  if (!zap) return '';
  return `<section class="cartao fisico" id="sec-fisico">
    <div class="cartao-cab"><span class="rotulo">Mercado físico · diário</span><span class="pilula pilula-verde">Hoje</span></div>
    <b style="font-size:18px;line-height:1.3">Quanto o mercado está pagando hoje?</b>
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">IEA e Conab mostram médias oficiais. O preço de negócio muda todo dia conforme o comprador, a qualidade e o volume. Peça o preço do dia direto com o Helder.</p>
    <a class="btn btn-verde" href="${zap}" target="_blank" rel="noopener" data-ev="fisico">${ic(I.zap, 'style="width:20px;height:20px;stroke:#fff"')}Receber o preço do mercado físico</a>
    <span class="mini" style="text-align:center">Resposta pelo WhatsApp · sem compromisso</span>
  </section>`;
}

// Versão completa, com a explicação de cada item (aba Mercado).
export function blocoMercadoHojeDetalhe(D, h) {
  const { esc } = h;
  const m = D.mercado;
  if (!m) return '';
  const itens = itensHoje(D, h);
  return `${blocoMercadoFisico(D, h)}
  <section class="cartao" id="sec-hoje">
    <div class="cartao-cab"><span class="rotulo">Mercado hoje · o que mudou</span><span class="mini">Atualizado ${esc(quando(m.atualizado))} · ${esc(m.atualizado)}</span></div>
    <div class="hoje-lista">${itens.map((x) => `
      <details class="hoje-item">
        <summary>
          ${seta(h, x.efeito)}
          <span class="cresce"><span class="hoje-rot">${esc(x.rotulo)}</span><span class="hoje-nota">${esc(x.nota)}</span></span>
          <b class="num">${esc(x.valor)}</b>
        </summary>
        <p>${esc(x.detalhe)}${h.linkSeguro(x.link) ? ` <a class="link-mini" href="${esc(x.link)}" target="_blank" rel="noopener">Ver na fonte</a>` : ''}</p>
      </details>`).join('')}
    </div>
    ${m.fato ? `<div class="fato"><span class="fato-tag">Fato do dia</span><b>${esc(m.fato.titulo)}</b><span>${esc(m.fato.texto)}</span><button class="link-enviar" data-compartilhar="fato">${h.ic(h.I.enviar)}Enviar no WhatsApp</button></div>` : ''}
    <span class="mini legenda-ef">${seta(h, 'alta')} sustenta o preço · ${seta(h, 'baixa')} pressiona · toque para ver o porquê</span>
  </section>`;
}

export function blocoOportunidades(D, h) {
  const { esc } = h;
  const ofertas = listaOfertas(D).slice(0, 3);
  return `<section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Balcão de ofertas</span><a class="link-mini" href="#/negociar">Ver todas</a></div>
    <div>${ofertas.map((o) => `
      <a class="lista-linha" href="#/negociar">
        <span class="lado ${o.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${o.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span>
        <span class="cresce"><b style="font-size:14px;display:block">${esc(o.categoria)} · ${esc(o.volume)}</b><span class="mini">${esc(o.regiao)}</span></span>
        <b class="num" style="font-size:14px">${esc(o.preco)}</b>
      </a>`).join('')}
    </div>
    <a class="btn btn-verde btn-pequeno" href="#/negociar/anunciar" data-ev="anunciar-abrir">Anunciar compra ou venda</a>
    <span class="mini">O contato de quem anuncia não aparece: a negociação passa pela Amendoim Brasil.</span>
  </section>`;
}

export function blocoPanoramaCompacto(D, h) {
  const { esc } = h;
  const cor = { BR: 'pilula-verde', AR: 'pilula-azul', US: 'pilula-amendoim', IN: 'pilula-amendoim', CN: 'pilula-amendoim' };
  return `<a class="cartao panorama-mini" href="#/mercado/mundo">
    <div class="cartao-cab"><span class="rotulo">Panorama global</span><span class="link-mini">Ver análise</span></div>
    <div class="pm-grade">${(D.panorama || []).map((p) => `
      <div class="pm-item"><span class="sigla pilula ${cor[p.sigla] || 'pilula-verde'}">${esc(p.sigla)}</span><span class="pm-fase">${esc(p.fase)}</span><b>${esc(p.indicador || '')}</b></div>`).join('')}
    </div>
  </a>`;
}

// ---------- NÚMEROS (só para o Helder, com chave) ----------
export function telaNumeros(h) {
  const { esc, ic, I } = h;
  let k = '';
  try { k = localStorage.getItem('ab-chave-numeros') || ''; } catch (e) { /* sem armazenamento */ }
  return `<header class="topo">
    <a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Números do app</h1><div class="sub">Acessos e cliques por dia (sem dados pessoais)</div></div>
  </header>
  <form id="form-numeros" class="cartao" style="gap:10px">
    <label class="rotulo" for="chave-numeros">Chave de acesso</label>
    <div style="display:flex;gap:8px"><input id="chave-numeros" type="password" autocomplete="off" value="${esc(k)}" style="flex:1"><button class="btn btn-verde btn-pequeno" type="submit">Ver</button></div>
  </form>
  <div id="numeros-saida"></div>`;
}

const COLUNAS = [
  ['aparelho-dia', 'Aparelhos'], ['aparelho-novo', 'Novos'], ['voltou', 'Voltaram'], ['abriu', 'Aberturas'],
  ['fisico', 'Mercado físico'], ['vender', 'Vender'], ['comprar', 'Comprar'], ['compartilhar', 'Enviou'], ['pdf', 'PDF'], ['grupo', 'Grupo']
];
const somaPref = (dia, pref) => Object.entries(dia || {}).reduce((s, [k, v]) => (k === pref || k.startsWith(pref + '-') ? s + v : s), 0);

export function desenharNumeros(dados, h) {
  const { numBr } = h;
  const dias = Object.keys(dados || {}).sort().reverse().slice(0, 30);
  if (!dias.length) return '<div class="vazio">Ainda não há números. Eles começam a aparecer quando o app oficial for aberto.</div>';
  const ult7 = dias.slice(0, 7);
  const tot = (pref) => ult7.reduce((s, d) => s + somaPref(dados[d], pref), 0);
  const abas = {};
  dias.slice(0, 7).forEach((d) => Object.entries(dados[d]).forEach(([k, v]) => { if (k.startsWith('aba-')) abas[k.slice(4)] = (abas[k.slice(4)] || 0) + v; }));
  return `<section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Últimos 7 dias</span></div>
    <div class="placares">
      <div class="placar"><span>Aparelhos por dia (média)</span><b class="num">${numBr(tot('aparelho-dia') / ult7.length, 1)}</b></div>
      <div class="placar"><span>Pedidos de preço físico</span><b class="num">${numBr(tot('fisico'))}</b></div>
      <div class="placar"><span>Vender + comprar</span><b class="num">${numBr(tot('vender') + tot('comprar'))}</b></div>
      <div class="placar"><span>Envios no WhatsApp</span><b class="num">${numBr(tot('compartilhar') + tot('pdf'))}</b></div>
    </div>
    ${Object.keys(abas).length ? `<span class="mini">Abas mais abertas: ${Object.entries(abas).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${numBr(v)})`).join(' · ')}</span>` : ''}
  </section>
  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Dia a dia</span></div>
    <div class="tabela-rolar"><table class="tabela">
      <thead><tr><th>Dia</th>${COLUNAS.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead>
      <tbody>${dias.map((d) => `<tr><th>${d.slice(8, 10)}/${d.slice(5, 7)}</th>${COLUNAS.map(([k]) => `<td>${numBr(somaPref(dados[d], k))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <span class="mini">Aparelhos = celulares diferentes que abriram o app no dia. Voltaram = já tinham aberto antes.</span>
  </section>`;
}

// ---------- MERCADO ----------
function barrasMensais(h, mensal) {
  const { numBr } = h;
  const W = 320, H = 130, padB = 18, padT = 6;
  const max = Math.max(...mensal.atual, ...mensal.anterior);
  const n = mensal.meses.length, larg = (W - 8) / n;
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Exportação mensal">
    ${mensal.meses.map((m, i) => {
      const x0 = 4 + i * larg, bw = (larg - 8) / 2;
      return `<rect x="${x0 + 2}" y="${y(mensal.anterior[i])}" width="${bw}" height="${H - padB - y(mensal.anterior[i])}" rx="2" fill="#CFE3D5"><title>${m} 2025: ${numBr(mensal.anterior[i])} t</title></rect>
        <rect x="${x0 + 2 + bw + 2}" y="${y(mensal.atual[i])}" width="${bw}" height="${H - padB - y(mensal.atual[i])}" rx="2" fill="#007731"><title>${m} 2026: ${numBr(mensal.atual[i])} t</title></rect>
        <text class="eixo" x="${x0 + larg / 2}" y="${H - 4}" text-anchor="middle">${m}</text>`;
    }).join('')}
  </svg>`;
}

export function blocoExportacao(D, h) {
  const { esc, numBr, pct, ic, I } = h;
  const e = D.mercado?.exportacao;
  if (!e) return '';
  return `<section class="cartao" id="sec-exportacao">
    <div class="cartao-cab"><span class="rotulo">Exportação · ${esc(e.periodo)}</span><span class="pilula pilula-verde">Fator positivo</span></div>
    <b style="font-size:19px;line-height:1.25">${esc(e.titulo)}</b>
    <div class="grade-2" style="gap:10px">${e.itens.map((x) => `
      <div class="exp-tile"><span>${esc(x.nome)}</span><b class="num">${numBr(x.toneladas)} t</b><span class="var num ${x.variacao > 0 ? 'sobe' : 'cai'}">${pct(x.variacao)} vs 2025</span></div>`).join('')}
    </div>
    ${e.precoMedio ? `<div class="exp-linha"><span>Preço médio de exportação</span><b class="num">US$ ${numBr(e.precoMedio.atual)}/t</b><span class="var num ${e.precoMedio.variacao > 0 ? 'sobe' : 'cai'}">${pct(e.precoMedio.variacao)}</span></div>` : ''}
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(e.leitura)}</p>
    <details class="abre">
      <summary>Ritmo dos embarques ${e.mensal?.exemplo ? '<span class="aviso-exemplo">Exemplo</span>' : ''}</summary>
      <div class="grafico">${e.mensal ? barrasMensais(h, e.mensal) : ''}</div>
      <span class="mini"><i class="leg" style="background:#CFE3D5"></i>2025 · <i class="leg" style="background:#007731"></i>2026 · toneladas de grão por mês</span>
      <p class="mini" style="margin:6px 0 0">${esc(e.ritmo || '')}</p>
    </details>
    <details class="abre">
      <summary>Principais destinos ${e.destinos?.exemplo ? '<span class="aviso-exemplo">Exemplo</span>' : ''}</summary>
      <div class="destinos">${(e.destinos?.lista || []).map(([p, v]) => `<div class="destino"><span>${esc(p)}</span><span class="destino-barra"><i style="width:${v}%"></i></span><b class="num">${numBr(v, 1)}%</b></div>`).join('')}</div>
      <span class="mini">Participação no volume de grão exportado em ${esc(e.periodo)}.</span>
    </details>
    ${e.fonte ? `<span class="mini">Fonte: ${h.linkSeguro(e.fonteLink) ? `<a class="link-mini" href="${esc(e.fonteLink)}" target="_blank" rel="noopener">${esc(e.fonte)}</a>` : esc(e.fonte)}</span>` : ''}
    <a href="${h.wa('Olá Helder, quero assinar a consultoria para ver a paridade de exportação em R$/saca.') || '#/mercado/consultoria'}" target="_blank" rel="noopener" data-ev="assinar" class="trava">${ic(I.cadeado, 'style="width:18px;height:18px"')}<span class="cresce"><b>Paridade de exportação em R$/saca</b><span class="mini">Exclusivo para assinantes</span></span><span class="link-mini">Assinar</span></a>
  </section>`;
}

export function blocoMundo(D, h) {
  const { esc } = h;
  const cor = { BR: 'pilula-verde', AR: 'pilula-azul', US: 'pilula-amendoim', IN: 'pilula-amendoim', CN: 'pilula-amendoim' };
  return `<section class="cartao" id="sec-mundo" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 6px"><span class="rotulo">Brasil e mundo</span><span class="mini">toque para abrir</span></div>
    ${(D.panorama || []).map((p) => `
      <details class="pais-linha">
        <summary><span class="sigla pilula ${cor[p.sigla] || 'pilula-verde'}">${esc(p.sigla)}</span><span class="cresce"><b>${esc(p.pais)}</b><span class="mini">${esc(p.fase)}</span></span><b class="num">${esc(p.indicador || '')}</b></summary>
        <p>${esc(p.resumo)}</p>
      </details>`).join('')}
  </section>`;
}

// Termômetro com oferta e demanda e os fatores que abrem a explicação (um cartão só).
export function cartaoTermometroDetalhe(D, h, medidor) {
  const { esc, ic, I } = h;
  const t = D.config.termometro;
  const od = (D.mercado?.ofertaDemanda || []).filter((x) => !/disponibilidade/i.test(x.nome));
  return `<section class="cartao" id="sec-termometro">
    <div class="cartao-cab"><span class="rotulo">${esc(t.titulo || 'Termômetro do mercado')}</span>${t.atualizado ? `<span class="mini">${esc(t.atualizado)}</span>` : ''}</div>
    ${t.subtitulo ? `<span style="font-size:13px;color:var(--texto-3);margin-top:-6px">${esc(t.subtitulo)}</span>` : ''}
    ${medidor(t.status)}
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(t.resumo)}</p>
    ${od.length ? `<div class="od-grade" id="sec-oferta">${od.map((x) => `<div class="od-cel ${x.efeito}"><span>${esc(x.nome.replace(/ de casca| industrial/i, ''))}</span><b>${esc(x.escala[x.nivel] || '')}</b><small>${x.efeito === 'alta' ? 'sustenta' : x.efeito === 'baixa' ? 'pressiona' : 'neutro'}</small></div>`).join('')}</div>` : ''}
    <div class="fatores">${(t.fatores || []).map((f) => `
      <details class="fator-det ${f.efeito === 'baixa' ? 'baixa' : 'alta'}">
        <summary class="fator ${f.efeito === 'baixa' ? 'baixa' : 'alta'}">${ic(f.efeito === 'baixa' ? I.cai : I.sobe, 'style="width:16px;height:16px;stroke-width:2.6"')}<span class="cresce">${esc(f.nome)}</span><b>${esc(f.valor)}</b></summary>
        ${f.detalhe ? `<p>${esc(f.detalhe)}</p>` : ''}
      </details>`).join('')}
    </div>
    <span class="mini">${ic(I.sobe, 'style="width:12px;height:12px;stroke:#007731;stroke-width:2.6;vertical-align:-1px"')} segura o preço · ${ic(I.cai, 'style="width:12px;height:12px;stroke:#B3261E;stroke-width:2.6;vertical-align:-1px"')} pressiona · toque no fator para ver os dados</span>
    <span class="mini" style="font-weight:600">Helder Lamberti · Amendoim Brasil</span>
    <span class="mini aviso-rec">Leitura de mercado, não é recomendação de compra ou venda.</span>
  </section>`;
}

// ---------- PATROCINADORES ----------
// Cada patrocinador pode ter um espaço fixo ("locais") além do rodapé do Início.
// Itens com "exemplo": true mostram só o espaço reservado (para o teste de layout).
export function seloPatrocinio(D, local, h) {
  const { esc, linkSeguro } = h;
  const p = (D.patrocinadores || []).find((x) => (x.locais || []).includes(local));
  if (!p) return '';
  if (p.exemplo || !p.logo) return '';
  const href = linkSeguro(p.link);
  const dentro = `<span>Oferecimento</span><img src="${esc(p.logo)}" alt="${esc(p.nome)}">`;
  return href ? `<a class="patrocinio" href="${esc(href)}" target="_blank" rel="noopener sponsored">${dentro}</a>` : `<div class="patrocinio">${dentro}</div>`;
}

export function blocoPatrocinadores(D, h) {
  const { esc, linkSeguro } = h;
  const lista = (D.patrocinadores || []).filter((x) => (x.locais || ['rodape']).includes('rodape')).slice(0, 5);
  if (!lista.length) return '';
  return `<section class="parceiros">
    <span class="rotulo">Patrocinadores</span>
    <div class="patro-grade">${lista.map((p) => {
      if (p.exemplo || !p.logo) return '<a class="parceiro vago" href="#/anuncie" data-ev="anuncie-abrir">Anuncie aqui</a>';
      const href = linkSeguro(p.link);
      const img = `<img src="${esc(p.logo)}" alt="${esc(p.nome)}">`;
      return href ? `<a class="parceiro" href="${esc(href)}" target="_blank" rel="noopener sponsored">${img}</a>` : `<span class="parceiro">${img}</span>`;
    }).join('')}</div>
  </section>`;
}
