// Painel de mercado: blocos novos da Home e da aba Mercado (teste de layout).
// Cada bloco é um cartão resumido; o detalhe abre quando a pessoa toca.
// h = utilitários do app (esc, ic, I, brl, numBr, pct, wa, linkSeguro).

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

// ---------- HOME ----------
export function blocoMercadoHoje(D, h) {
  const { esc } = h;
  const m = D.mercado;
  if (!m) return '';
  const itens = itensHoje(D, h);
  return `<section class="cartao hoje">
    <div class="cartao-cab"><span class="rotulo">Mercado hoje</span><span class="mini">Atualizado ${esc(m.atualizado)}</span></div>
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
    ${m.fato ? `<div class="fato"><span class="fato-tag">Fato do dia</span><b>${esc(m.fato.titulo)}</b><span>${esc(m.fato.texto)}</span></div>` : ''}
    <span class="mini legenda-ef">${seta(h, 'alta')} sustenta o preço · ${seta(h, 'baixa')} pressiona · toque para ver o porquê</span>
    ${h.patrocinio ? h.patrocinio('mercado-hoje') : ''}
  </section>`;
}

export function blocoOportunidades(D, h) {
  const { esc, wa } = h;
  const ofertas = D.ofertas || [];
  const vender = wa('Olá Helder, quero vender amendoim. Pode me ajudar?');
  const comprar = wa('Olá Helder, estou procurando amendoim para comprar.');
  return `<section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Oportunidades de negócio <span class="selo-breve">Em breve</span></span><a class="link-mini" href="#/negociar">Ver balcão</a></div>
    <div>${ofertas.slice(0, 3).map((o) => `
      <a class="lista-linha" href="#/negociar">
        <span class="lado ${o.lado === 'Compra' ? 'lado-compra' : 'lado-venda'}">${o.lado === 'Compra' ? 'COMPRA' : 'VENDA'}</span>
        <span class="cresce"><b style="font-size:14px;display:block">${esc(o.categoria)} · ${esc(o.volume)}</b><span class="mini">${esc(o.regiao)}</span></span>
        <b class="num" style="font-size:14px">${esc(o.preco)}</b>
      </a>`).join('')}
    </div>
    <div class="duas-acoes">
      ${vender ? `<a class="btn btn-verde btn-pequeno" href="${vender}" target="_blank" rel="noopener">Quero vender</a>` : ''}
      ${comprar ? `<a class="btn btn-escuro btn-pequeno" href="${comprar}" target="_blank" rel="noopener">Quero comprar</a>` : ''}
    </div>
    <span class="mini">A outra parte não aparece: o contato e a negociação passam pela Amendoim Brasil.</span>
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

// ---------- ALERTAS ----------
export function telaAlertas(D, h) {
  const { esc, ic, I, linkSeguro } = h;
  const grupo = linkSeguro(D.config.grupoWhatsapp);
  const tipos = [
    ['Mudança de preço', 'Quando a casca subir ou cair na sua praça'],
    ['Termômetro mudou', 'Quando o mercado virar de Estável para Firme ou Fraco'],
    ['Preço-alvo atingido', 'Você define o preço e o app avisa quando chegar'],
    ['Nova demanda de compra', 'Comprador procurando produto na sua região'],
    ['Alerta climático', 'Veranico, chuva forte ou risco no arranquio'],
    ['Novo resumo de mercado', 'Boletim e Mercado hoje publicados']
  ];
  return `<header class="topo">
    <a class="link-mini" href="#/inicio" style="display:flex;align-items:center;gap:4px">${ic(I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Início</a>
    <div><h1>Alertas</h1><div class="sub">Escolha o que você quer receber no celular</div></div>
  </header>
  <div class="em-breve"><span class="selo-breve">Em breve</span><span>Os alertas personalizados estão em preparação. Por enquanto, os avisos saem no grupo do WhatsApp.</span></div>
  <section class="cartao" style="gap:0;padding:4px 16px">
    ${tipos.map(([t, d]) => `<label class="alerta-linha"><span class="cresce"><b>${esc(t)}</b><small>${esc(d)}</small></span><input type="checkbox" disabled aria-label="${esc(t)}"><span class="chave" aria-hidden="true"></span></label>`).join('')}
  </section>
  ${grupo ? `<a class="btn btn-verde" href="${esc(grupo)}" target="_blank" rel="noopener">${ic(I.grupo, 'style="width:20px;height:20px;stroke:#fff"')}Entrar no grupo do WhatsApp</a>` : ''}`;
}

// ---------- MERCADO ----------
export function blocoIndicativo(D, h) {
  const { esc, brl, numBr, wa } = h;
  const ind = D.mercado?.indicativo;
  if (!ind) return '';
  const refs = (D.cotacoes.referencias || []).filter((r) => r.praca !== 'Presidente Prudente');
  const vals = [ind.min, ind.max, ...refs.map((r) => r.preco)];
  const lo = Math.floor(Math.min(...vals) - 3), hi = Math.ceil(Math.max(...vals) + 3);
  const pos = (v) => ((v - lo) / (hi - lo)) * 100;
  const zap = wa('Olá Helder, vi o indicativo Amendoim Brasil no app e quero conversar sobre um negócio.');
  return `<section class="cartao indicativo">
    <div class="cartao-cab"><span class="rotulo">Indicativo Amendoim Brasil</span>${ind.exemplo ? '<span class="aviso-exemplo">Exemplo</span>' : ''}</div>
    <div class="num" style="display:flex;align-items:baseline;gap:8px"><span class="preco-ind">R$ ${numBr(ind.min)} a ${numBr(ind.max)}</span><span class="mini">/ saca 25 kg</span></div>
    <span class="mini">${esc(ind.data)} · ${esc(ind.condicao)}</span>
    <div class="escala">
      <div class="escala-faixa" style="left:${pos(ind.min)}%;width:${pos(ind.max) - pos(ind.min)}%"></div>
      ${refs.map((r) => `<span class="escala-ponto" style="left:${pos(r.preco)}%" title="${esc(r.fonte)} ${esc(r.praca)}"></span>`).join('')}
      <span class="escala-ext" style="left:0">${numBr(lo)}</span><span class="escala-ext" style="right:0">${numBr(hi)}</span>
    </div>
    <div class="escala-legenda"><span><i class="faixa"></i>Mercado físico</span>${refs.map((r) => `<span><i class="ponto"></i>${esc(r.fonte)} ${esc(r.praca === 'Média do estado de SP' ? 'SP' : r.praca)} ${brl(r.preco)}</span>`).join('')}</div>
    <p class="aviso-ind">Não é cotação oficial. É a leitura da Amendoim Brasil sobre os negócios fechados no mercado físico.</p>
    ${zap ? `<a class="link-mini" href="${zap}" target="_blank" rel="noopener">Quer negociar nessa faixa? Fale com o Helder</a>` : ''}
  </section>`;
}

export function blocoOfertaDemanda(D, h) {
  const { esc } = h;
  const od = D.mercado?.ofertaDemanda || [];
  if (!od.length) return '';
  const sust = od.filter((x) => x.efeito === 'alta').map((x) => x.nome.toLowerCase());
  const press = od.filter((x) => x.efeito === 'baixa').map((x) => x.nome.toLowerCase());
  return `<section class="cartao" id="sec-oferta">
    <div class="cartao-cab"><span class="rotulo">Oferta e demanda</span></div>
    <div class="od-lista">${od.map((x) => `
      <details class="od-item">
        <summary>
          <span class="cresce"><b>${esc(x.nome)}</b><span class="od-efeito ${x.efeito}">${x.efeito === 'alta' ? 'sustenta o preço' : x.efeito === 'baixa' ? 'pressiona o preço' : 'neutro'}</span></span>
          <span class="od-medidor">${x.escala.map((t, i) => `<span class="${i === x.nivel ? 'ativo ' + x.efeito : ''}">${esc(t)}</span>`).join('')}</span>
        </summary>
        <p>${esc(x.detalhe)}</p>
      </details>`).join('')}
    </div>
    <div class="od-resumo">
      ${sust.length ? `<span>${seta(h, 'alta')}<b>Sustentam:</b> ${esc(sust.join(', '))}</span>` : ''}
      ${press.length ? `<span>${seta(h, 'baixa')}<b>Pressionam:</b> ${esc(press.join(', '))}</span>` : ''}
    </div>
  </section>`;
}

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
    <a href="#/mercado/consultoria" class="trava">${ic(I.cadeado, 'style="width:18px;height:18px"')}<span class="cresce"><b>Paridade de exportação em R$/saca</b><span class="mini">Exclusivo para assinantes</span></span><span class="link-mini">Assinar</span></a>
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

// Termômetro com fatores que abrem a explicação.
export function cartaoTermometroDetalhe(D, h, medidor) {
  const { esc, ic, I } = h;
  const t = D.config.termometro;
  return `<section class="cartao" id="sec-termometro">
    <div class="cartao-cab"><span class="rotulo">${esc(t.titulo || 'Termômetro do mercado')}</span>${t.atualizado ? `<span class="mini">${esc(t.atualizado)}</span>` : ''}</div>
    ${t.subtitulo ? `<span style="font-size:13px;color:var(--texto-3);margin-top:-6px">${esc(t.subtitulo)}</span>` : ''}
    ${medidor(t.status)}
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(t.resumo)}</p>
    <div class="fatores">${(t.fatores || []).map((f) => `
      <details class="fator-det ${f.efeito === 'baixa' ? 'baixa' : 'alta'}">
        <summary class="fator ${f.efeito === 'baixa' ? 'baixa' : 'alta'}">${ic(f.efeito === 'baixa' ? I.cai : I.sobe, 'style="width:16px;height:16px;stroke-width:2.6"')}<span class="cresce">${esc(f.nome)}</span><b>${esc(f.valor)}</b></summary>
        ${f.detalhe ? `<p>${esc(f.detalhe)}</p>` : ''}
      </details>`).join('')}
    </div>
    <span class="mini">${ic(I.sobe, 'style="width:12px;height:12px;stroke:#007731;stroke-width:2.6;vertical-align:-1px"')} segura o preço · ${ic(I.cai, 'style="width:12px;height:12px;stroke:#B3261E;stroke-width:2.6;vertical-align:-1px"')} pressiona · toque no fator para ver os dados</span>
    <span class="mini" style="font-weight:600">Helder Lamberti · Amendoim Brasil</span>
  </section>`;
}

// ---------- PATROCINADORES ----------
// Cada patrocinador pode ter um espaço fixo ("locais") além do rodapé do Início.
// Itens com "exemplo": true mostram só o espaço reservado (para o teste de layout).
export function seloPatrocinio(D, local, h) {
  const { esc, linkSeguro } = h;
  const p = (D.patrocinadores || []).find((x) => (x.locais || []).includes(local));
  if (!p) return '';
  if (p.exemplo || !p.logo) return `<div class="patrocinio vago"><span>Oferecimento</span><b>Espaço para patrocinador</b></div>`;
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
      if (p.exemplo || !p.logo) return '<span class="parceiro vago">Seu logo aqui</span>';
      const href = linkSeguro(p.link);
      const img = `<img src="${esc(p.logo)}" alt="${esc(p.nome)}">`;
      return href ? `<a class="parceiro" href="${esc(href)}" target="_blank" rel="noopener sponsored">${img}</a>` : `<span class="parceiro">${img}</span>`;
    }).join('')}</div>
  </section>`;
}
