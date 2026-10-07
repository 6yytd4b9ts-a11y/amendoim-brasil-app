// ESBOÇO da nova aba Clima: previsão pelo modelo europeu (ECMWF), fundo que muda com o tempo, radar do IPMet/Unesp
// no topo, chuva nas regiões produtoras de SP, MG, MS e MT, pluviômetro dos produtores e El Niño explicado.
import { MUNICIPIOS, municipioAtual, recomendacaoPlantio } from '/clima.js';
import { conteudo } from '/esboco-dados.js';

let ctx = { render: () => {} };
const est = { prev: 7, regioes: null, buscando: false, ecmwf: {}, msgChuva: '' };
const TZ = 'America/Sao_Paulo';
const OM = 'https://api.open-meteo.com/v1/forecast';
const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

// Regiões produtoras (lista do Helder), agrupadas por estado.
const REGIOES = [
  ['SP', 'Tupã', -21.935, -50.514], ['SP', 'Presidente Prudente', -22.126, -51.389], ['SP', 'Rancharia', -22.229, -50.893], ['SP', 'Marília', -22.214, -49.946],
  ['SP', 'Dracena', -21.483, -51.533], ['SP', 'Jaboticabal', -21.255, -48.322], ['SP', 'Sertãozinho', -21.138, -47.990], ['SP', 'Borborema', -21.620, -49.074],
  ['MG', 'Iturama', -19.728, -50.196],
  ['MS', 'Bataguassu', -21.714, -52.422], ['MS', 'Chapadão do Sul', -18.794, -52.623], ['MS', 'Campo Grande', -20.469, -54.620], ['MS', 'Glória de Dourados', -22.418, -54.234], ['MS', 'Itaporã', -22.079, -54.789],
  ['MT', 'Campo Verde', -15.545, -55.163], ['MT', 'Sorriso', -12.545, -55.711]
].map(([uf, nome, lat, lon]) => ({ uf, nome, lat, lon }));
const ESTADOS = { SP: 'São Paulo', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso' };

const ICONES = {
  sol: ['<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', '#E59A1A', 'Sol'],
  solNuvem: ['<path d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5M18.4 5.6l-1 1"/><path d="M8.5 10a4 4 0 0 1 7.2-2.2"/><path d="M17 20H9a3.5 3.5 0 1 1 .6-6.95A4.5 4.5 0 0 1 18.2 14 3 3 0 0 1 17 20z"/>', '#C98A2E', 'Sol entre nuvens'],
  nuvem: ['<path d="M17.5 19H7a4.5 4.5 0 1 1 .8-8.93A6 6 0 0 1 19 11.5a3.75 3.75 0 0 1-1.5 7.5z"/>', '#7C8A96', 'Nublado'],
  garoa: ['<path d="M17.5 14H7a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 7.5a3.25 3.25 0 0 1-.5 6.5z"/><path d="M10 18v1M14 19v1"/>', '#5C8FBF', 'Chuva fraca'],
  chuva: ['<path d="M17.5 14H7a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 7.5a3.25 3.25 0 0 1-.5 6.5z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>', '#2F6FA3', 'Chuva'],
  forte: ['<path d="M17.5 13H7a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 6.5a3.25 3.25 0 0 1-.5 6.5z"/><path d="m12.5 13-2.5 4h4l-2.5 4"/><path d="M7 17l-1 2M17 17l-1 2"/>', '#5B4FA3', 'Tempestade']
};
// Ícone pela chuva prevista: garoa até 5 mm, chuva até 25 mm, tempestade acima disso.
const tempo = (d) => {
  if (!d) return 'nuvem';
  const mm = d.mm || 0, p = d.prob ?? 0;
  if (mm >= 25) return 'forte';
  if (mm >= 5) return 'chuva';
  if (mm >= 0.5) return 'garoa';
  if (p >= 45) return 'nuvem';
  if (p >= 20) return 'solNuvem';
  return 'sol';
};
const icone = (h, tipo, tam = 28) => h.ic(ICONES[tipo][0], `style="width:${tam}px;height:${tam}px;stroke:${ICONES[tipo][1]};stroke-width:1.9" aria-label="${ICONES[tipo][2]}"`);
const dataCurta = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
const getJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('http ' + r.status); return r.json(); };

// Previsão do modelo europeu para o município escolhido (chuva e temperatura); a chance de chuva continua a do conjunto de modelos.
async function buscarECMWF(local) {
  const k = local.lat + ',' + local.lon;
  if (est.ecmwf[k]) return;
  est.ecmwf[k] = { carregando: true };
  try {
    const j = await getJSON(`${OM}?latitude=${local.lat}&longitude=${local.lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&forecast_days=15&models=ecmwf_ifs025&timezone=${encodeURIComponent(TZ)}`);
    const d = j.daily, mapa = {};
    d.time.forEach((t, i) => { mapa[t] = { mm: d.precipitation_sum[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i] }; });
    est.ecmwf[k] = { mapa };
  } catch (e) { est.ecmwf[k] = { erro: true }; }
  if (location.hash.startsWith('#/clima')) ctx.render(false);
}

// Chuva nas regiões: o que choveu nos últimos 7 dias e o previsto (ECMWF) para os próximos 7.
async function buscarRegioes() {
  if (est.regioes || est.buscando) return;
  est.buscando = true;
  const lat = REGIOES.map((m) => m.lat).join(','), lon = REGIOES.map((m) => m.lon).join(','), tz = encodeURIComponent(TZ);
  try {
    const [passado, futuro] = await Promise.all([
      getJSON(`${OM}?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&past_days=21&forecast_days=1&timezone=${tz}`),
      getJSON(`${OM}?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&forecast_days=7&models=ecmwf_ifs025&timezone=${tz}`).catch(() => null)
    ]);
    const lp = Array.isArray(passado) ? passado : [passado], lf = futuro ? (Array.isArray(futuro) ? futuro : [futuro]) : [];
    const hoje = hojeISO();
    est.regioes = REGIOES.map((m, k) => {
      const t = lp[k].daily.time, mm = lp[k].daily.precipitation_sum, i = t.indexOf(hoje);
      let seco = 0; for (let n = i - 1; n >= 0; n--) { if ((mm[n] ?? 0) < 1) seco++; else break; }
      const choveu7 = mm.slice(Math.max(0, i - 7), i).reduce((s, v) => s + (v || 0), 0);
      const prev7 = lf[k] ? lf[k].daily.precipitation_sum.reduce((s, v) => s + (v || 0), 0) : null;
      return { ...m, choveu7, prev7, seco };
    });
  } catch (e) { est.regioes = []; }
  est.buscando = false;
  if (location.hash.startsWith('#/clima')) ctx.render(false);
}

const lerChuva = () => { try { return JSON.parse(localStorage.getItem('ab-esboco-chuva') || '[]'); } catch (e) { return []; } };

export function telaClimaNova(D, h) {
  const { esc, ic, I, numBr } = h;
  const c = D.clima || {}, a = D.climaAuto, atual = municipioAtual();
  buscarRegioes();
  if (atual?.lat) buscarECMWF(atual);
  const eu = est.ecmwf[atual?.lat + ',' + atual?.lon];
  const usaECMWF = !!eu?.mapa;
  const diasTodos = (a?.dias || []).map((d) => (usaECMWF && eu.mapa[d.data] && eu.mapa[d.data].mm != null ? { ...d, ...eu.mapa[d.data] } : d));
  const dias = diasTodos.slice(0, est.prev);
  const hoje = diasTodos[0];
  const total7 = diasTodos.slice(0, 7).reduce((s, d) => s + (d.mm || 0), 0);
  const comChuva = diasTodos.slice(0, 7).filter((d) => (d.mm || 0) >= 1).length;
  const fase = D.config.faseSafra || 'Plantio';
  const opcoes = MUNICIPIOS.map((m) => `<option value="${esc(m.nome)}" ${!atual.gps && m.nome === atual.nome ? 'selected' : ''}>${esc(m.nome)}/${esc(m.uf)}</option>`).join('');
  const minhaLocal = atual.gps ? `<option value="__gps" selected>Sua localização${atual.perto ? ' (perto de ' + esc(atual.perto) + ')' : ''}</option>` : '';
  const mm = (v) => (v == null ? '—' : numBr(v) + ' mm');
  const rec = (c.recomendacao && !c.recomendacao.startsWith('[')) ? { titulo: 'Recomendação da semana', dica: c.recomendacao } : recomendacaoPlantio(a, fase);
  const nomeLocal = atual.gps ? (atual.perto ? 'Perto de ' + esc(atual.perto) : 'Sua localização') : `${esc(atual.nome)}/${esc(atual.uf)}`;
  const hora = a?.atualizado ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(a.atualizado) : '';
  const dif = a && a.chuvaSafra != null && a.chuvaSafraPassada != null ? Math.round(a.chuvaSafra - a.chuvaSafraPassada) : null;
  const maior = a ? Math.max(a.chuvaSafra || 0, a.chuvaSafraPassada || 0, a.mediaSafra || 0, 1) : 1;
  const barra = (v, cor) => `<div class="barra"><span style="width:${v == null ? 0 : Math.max(3, Math.round((v / maior) * 100))}%;background:${cor}"></span></div>`;
  const ceu = hoje ? tempo(hoje) : 'nuvem';
  const regs = est.regioes || [];
  const maxReg = Math.max(10, ...regs.map((r) => Math.max(r.prev7 || 0, r.choveu7 || 0)));
  const linhaReg = (r) => `<div class="es-reg2">
      <span class="es-reg-nome">${esc(r.nome)}</span>
      <span class="es-reg-num"><small>choveu</small><b class="num">${numBr(r.choveu7)}</b></span>
      <span class="es-reg-barra"><i style="width:${Math.max(2, ((r.prev7 || 0) / maxReg) * 100)}%"></i></span>
      <span class="es-reg-num prev"><small>previsto</small><b class="num">${r.prev7 == null ? '—' : numBr(r.prev7)}</b></span>
      ${r.seco >= 7 ? `<span class="es-reg-seco">${r.seco} dias sem chuva</span>` : ''}
    </div>`;
  const grupos = ['SP', 'MG', 'MS', 'MT'].map((uf) => [uf, regs.filter((r) => r.uf === uf)]).filter(([, l]) => l.length);
  const leitura = conteudo().leituraClima;
  const relatos = [...lerChuva().filter((x) => x.dia === hojeISO()).map((x) => ({ municipio: x.municipio, mm: x.mm, n: 1, meu: true })), ...(conteudo().chuvaExemplo || [])];

  return `<header class="topo">
    <h1>Clima</h1>
    <div class="campo" style="flex-direction:row;gap:8px">
      <select id="sel-municipio" aria-label="Local da lavoura" style="flex:1">${minhaLocal}${opcoes}</select>
      <button class="btn-icone" id="usar-gps" aria-label="Usar minha localização" style="width:48px;height:48px;border-radius:12px;color:var(--verde)">${ic(I.pino)}</button>
    </div>
  </header>
  ${a?.erro ? `<div class="vazio">${esc(a.erro)}</div>` : ''}

  <section class="es-clima-hero es-ceu-${ceu}">
    <div class="cartao-cab"><span class="es-clima-local">${ic(I.pino, 'style="width:16px;height:16px;stroke:currentColor"')}${nomeLocal}</span><span class="es-clima-hora">${hora ? 'atualizado ' + hora : ''}</span></div>
    ${hoje ? `<div class="es-clima-agora">
      <span class="es-clima-ic">${icone(h, ceu, 64)}</span>
      <div><span class="es-clima-temp num">${hoje.tmax != null ? Math.round(hoje.tmax) + '°' : '—'}<small>${hoje.tmin != null ? ' / ' + Math.round(hoje.tmin) + '°' : ''}</small></span>
      <span class="es-clima-desc">Hoje · ${ICONES[ceu][2]}${(hoje.mm || 0) >= 0.5 ? ` · ${numBr(hoje.mm)} mm` : ''}${hoje.prob != null ? ` · ${hoje.prob}% de chance` : ''}</span></div>
    </div>
    <div class="es-clima-resumo">
      <div><span>Previsto 7 dias</span><b class="num">${mm(total7)}</b></div>
      <div><span>Dias com chuva</span><b class="num">${comChuva} de 7</b></div>
      <div><span>Sem chuva há</span><b class="num">${numBr(a.semChuva)} dias</b></div>
    </div>` : '<div class="es-clima-agora"><span class="es-clima-desc">Carregando a previsão…</span></div>'}
    <a class="es-radar" href="${esc(c.radarLink || 'https://www.ipmetradar.com.br/2mobileGis.php')}" target="_blank" rel="noopener" data-ev="radar">
      <span class="cresce"><b>Radar ao vivo · IPMet/Unesp</b><small>Bauru e Presidente Prudente · onde está chovendo agora</small></span>
      <span class="es-radar-escala" aria-hidden="true"><i style="background:#7FD8F5"></i><i style="background:#2FBF4A"></i><i style="background:#F5E33A"></i><i style="background:#F59A23"></i><i style="background:#E5322B"></i><i style="background:#D63AC8"></i></span>
    </a>
    <span class="es-radar-leg"><span>fraca</span><span>moderada</span><span>forte</span><span>granizo</span></span>
  </section>

  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Próximos dias</span>
      <div class="alterna" role="group" aria-label="Período"><button data-cl-prev="7" aria-pressed="${est.prev === 7}">7 dias</button><button data-cl-prev="15" aria-pressed="${est.prev === 15}">15 dias</button></div>
    </div>
    <div class="es-dias">${dias.map((d) => `<div class="es-dia es-dia-${tempo(d)}">
      <span class="es-dia-nome">${esc(d.dia)}</span><small>${dataCurta(d.data)}</small>
      ${icone(h, tempo(d), 30)}
      <span class="es-dia-temp num">${d.tmax != null ? Math.round(d.tmax) + '°' : ''}<small>${d.tmin != null ? Math.round(d.tmin) + '°' : ''}</small></span>
      <b class="es-dia-mm num">${numBr(d.mm)}<small> mm</small></b>
      <small class="es-dia-prob">${d.prob != null ? d.prob + '%' : ''}</small>
    </div>`).join('') || '<div class="vazio">Carregando…</div>'}</div>
    <span class="mini">Arraste para o lado · % = chance de chuva · ${usaECMWF ? 'modelo europeu (ECMWF)' : 'conjunto de modelos'}</span>
    ${h.patrocinio ? h.patrocinio('clima') : ''}
  </section>

  ${rec ? `<section class="cartao fase-cartao">
    <div class="cartao-cab"><span class="rotulo" style="color:var(--verde-escuro)">Para a lavoura esta semana</span><span class="pilula pilula-verde">${esc(fase)}</span></div>
    <b style="font-size:17px;line-height:1.3">${esc(rec.titulo)}</b>
    ${rec.dica ? `<details class="abre"><summary>Ver orientação</summary><p class="es-txt" style="margin:0 0 10px">${esc(rec.dica)}</p></details>` : ''}
    <span class="mini">Automática, pela previsão · confirme com seu agrônomo</span>
  </section>` : ''}

  <section class="cartao" style="gap:8px">
    <div class="cartao-cab"><span class="rotulo">Chuva nas regiões produtoras</span><span class="mini">mm · 7 dias</span></div>
    ${est.regioes == null ? '<span class="mini">Carregando…</span>' : grupos.length ? grupos.map(([uf, l], k) => `<details class="abre es-reg-grupo" ${k === 0 ? 'open' : ''}><summary>${ESTADOS[uf]}<span class="mini" style="margin-left:6px;font-weight:600">${l.length} municípios</span></summary>${l.map(linhaReg).join('')}</details>`).join('') : '<span class="mini">Não foi possível carregar agora.</span>'}
    <span class="mini">Choveu: últimos 7 dias · barra azul: previsto para os próximos 7 dias (ECMWF)</span>
  </section>

  <section class="cartao es-pluvio" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Pluviômetro dos produtores</span><span class="mini">hoje</span></div>
    <b style="font-size:16px;line-height:1.3">Quanto choveu na sua propriedade?</b>
    <form id="chuva-form" class="es-chuva-form"><input id="chuva-mm" inputmode="decimal" placeholder="mm" aria-label="Milímetros de chuva" required><button class="btn btn-verde btn-pequeno" type="submit">Informar</button></form>
    ${est.msgChuva ? `<span class="mini" style="font-weight:700;color:var(--verde-escuro)">${esc(est.msgChuva)}</span>` : ''}
    <div>${relatos.map((r) => `<div class="es-relato ${r.meu ? 'meu' : ''}"><span class="cresce">${esc(r.municipio)}${r.meu ? ' · você' : ''}</span><b class="num">${numBr(r.mm)} mm</b><small>${r.meu ? '' : `${r.n} ${r.n === 1 ? 'produtor' : 'produtores'}`}</small></div>`).join('')}</div>
    <span class="mini">Chuva medida de verdade, no pluviômetro de quem planta${(conteudo().chuvaExemplo || []).length ? ' · relatos de exemplo' : ''}</span>
  </section>

  ${leitura ? `<section class="boletim" style="gap:6px">
    <span class="tag">${ic(I.doc, 'style="width:18px;height:18px"')}Leitura do clima da semana</span>
    <details class="es-leitura"><summary>${esc(leitura.split('. ')[0])}.</summary><p>${esc(leitura.split('. ').slice(1).join('. '))}</p></details>
    <span class="mini" style="color:#5C3A06;font-weight:600">Helder Lamberti</span>
  </section>` : ''}

  <section class="cartao" style="gap:12px">
    <div class="cartao-cab"><span class="rotulo">Chuva desde 01/09 · ${nomeLocal}</span>${dif != null ? `<span class="mini" style="font-weight:700">${Math.abs(dif) < 5 ? 'Igual à safra passada' : `${dif > 0 ? '+' : '−'}${numBr(Math.abs(dif))} mm`}</span>` : ''}</div>
    ${a && a.chuvaSafra != null ? `
    <div class="comp-linha"><div class="cartao-cab"><b>Esta safra</b><b class="num">${mm(a.chuvaSafra)}</b></div>${barra(a.chuvaSafra, 'var(--azul)')}</div>
    <div class="comp-linha"><div class="cartao-cab"><span>Safra passada</span><b class="num">${mm(a.chuvaSafraPassada)}</b></div>${barra(a.chuvaSafraPassada, '#9CC3E3')}</div>
    ${a.mediaSafra != null ? `<div class="comp-linha"><div class="cartao-cab"><span>Média de ${a.anosMedia} safras</span><b class="num">${mm(a.mediaSafra)}</b></div>${barra(a.mediaSafra, '#CFC8B8')}</div>` : ''}` : '<span class="mini">carregando…</span>'}
  </section>

  <details class="cartao es-enso">
    <summary>${ic(I.globo, 'style="width:22px;height:22px;stroke:#2F5F8A;flex-shrink:0"')}<span class="cresce"><b>El Niño e La Niña</b><small>O que está acontecendo no Pacífico e o que muda para o amendoim</small></span></summary>
    ${c.enso ? `<p><b>Agora:</b> ${esc(c.enso)}</p>` : ''}
    <p><b>El Niño</b> (Pacífico mais quente) costuma trazer mais chuva para o Sul do Brasil e chuva mais irregular, com veranicos, em partes do Sudeste e do Centro-Oeste.</p>
    <p><b>La Niña</b> (Pacífico mais frio) costuma ter efeito contrário: Sul mais seco e chuva mais regular no Centro-Oeste.</p>
    <p>Para o amendoim, o que mais pesa é a regularidade da chuva no plantio e na florada. Acompanhe a previsão de 15 dias e a leitura da semana.</p>
    ${c.ensoLinkPermanente || c.ensoLink ? `<a class="link-mini" href="${esc(c.ensoLinkPermanente || c.ensoLink)}" target="_blank" rel="noopener">Acompanhar no CPTEC/INPE</a>` : ''}
  </details>

  <a class="cartao radar-linha es-inmet" href="https://alertas2.inmet.gov.br/" target="_blank" rel="noopener">
    ${ic(I.alerta, 'style="width:22px;height:22px;stroke:#7A4A08"')}<span class="cresce"><b>Alertas oficiais do INMET</b><span class="mini">Tempestade, granizo e vento forte</span></span>${ic(I.seta, 'style="width:16px;height:16px"')}</a>
  <p class="mini fonte-clima">Previsão: Open-Meteo${usaECMWF ? ' · modelo ECMWF' : ''}${hora ? ' · ' + hora : ''} · Radar: IPMet/Unesp</p>`;
}

export function ligarClimaNovo(opcoes) {
  ctx = { ...ctx, ...opcoes };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl-prev]');
    if (!b) return;
    est.prev = +b.dataset.clPrev === 15 ? 15 : 7;
    ctx.render(false);
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'chuva-form') return;
    e.preventDefault();
    const v = parseFloat((document.getElementById('chuva-mm')?.value || '').replace(',', '.'));
    if (!isFinite(v) || v < 0 || v > 400) { est.msgChuva = 'Digite os milímetros (ex.: 22).'; ctx.render(false); return; }
    const m = municipioAtual();
    const l = lerChuva().filter((x) => x.dia !== hojeISO());
    l.unshift({ dia: hojeISO(), mm: v, municipio: m?.gps ? (m.perto || 'Sua região') : m?.nome || '' });
    try { localStorage.setItem('ab-esboco-chuva', JSON.stringify(l.slice(0, 60))); } catch (er) { /* ignora */ }
    est.msgChuva = 'Obrigado! Sua chuva entrou no mapa da região.';
    ctx.render(false);
  });
}
