// Clima automático (fonte temporária: Open-Meteo, CC BY 4.0).
// Previsão 7 dias, dias sem chuva, chuva da safra atual vs safra passada, alertas por região
// e recomendação de plantio montada a partir da previsão.

export const MUNICIPIOS = [
  { nome: 'Presidente Prudente', uf: 'SP', lat: -22.1256, lon: -51.3889 },
  { nome: 'Martinópolis', uf: 'SP', lat: -22.1456, lon: -51.1708 },
  { nome: 'Rancharia', uf: 'SP', lat: -22.2289, lon: -50.8931 },
  { nome: 'Dracena', uf: 'SP', lat: -21.4833, lon: -51.5328 },
  { nome: 'Adamantina', uf: 'SP', lat: -21.6856, lon: -51.0731 },
  { nome: 'Tupã', uf: 'SP', lat: -21.9347, lon: -50.5136 },
  { nome: 'Paraguaçu Paulista', uf: 'SP', lat: -22.4128, lon: -50.5756 },
  { nome: 'Pompeia', uf: 'SP', lat: -22.1086, lon: -50.1717 },
  { nome: 'Marília', uf: 'SP', lat: -22.2139, lon: -49.9458 },
  { nome: 'Jaboticabal', uf: 'SP', lat: -21.2550, lon: -48.3222 },
  { nome: 'Sertãozinho', uf: 'SP', lat: -21.1378, lon: -47.9903 },
  { nome: 'Três Lagoas', uf: 'MS', lat: -20.7511, lon: -51.6783 },
  { nome: 'Nova Andradina', uf: 'MS', lat: -22.2331, lon: -53.3431 },
  { nome: 'Uberaba', uf: 'MG', lat: -19.7472, lon: -47.9381 }
];

const TZ = 'America/Sao_Paulo';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const CHAVE = 'ab-municipio';
const SECO = 1; // mm: abaixo disso conta como dia sem chuva

const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const difDias = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
const getJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('clima ' + r.status); return r.json(); };
const dataBr = (iso) => iso.split('-').reverse().join('/');

function maisProximo(lat, lon) {
  let melhor = MUNICIPIOS[0], dist = Infinity;
  MUNICIPIOS.forEach((m) => { const d = (m.lat - lat) ** 2 + ((m.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < dist) { dist = d; melhor = m; } });
  return melhor;
}

export function municipioSalvo() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (s && isFinite(s.lat) && isFinite(s.lon)) return s;
  } catch (e) { /* sem armazenamento */ }
  return null;
}

export function municipioAtual() { return municipioSalvo() || MUNICIPIOS[0]; }

export function definirMunicipio(m) {
  try { localStorage.setItem(CHAVE, JSON.stringify(m)); } catch (e) { /* ignora */ }
}

export const nomeLocal = (m) => (m?.gps ? (m.perto ? 'perto de ' + m.perto : 'na sua localização') : 'em ' + (m?.nome || ''));

// Pega a localização do aparelho (pede permissão). Se não der, devolve null.
export function localDoAparelho(tempo = 10000) {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    const limite = setTimeout(() => ok(null), tempo + 2000); // se a pessoa não responder ao pedido
    navigator.geolocation.getCurrentPosition((p) => {
      clearTimeout(limite);
      const lat = +p.coords.latitude.toFixed(4), lon = +p.coords.longitude.toFixed(4);
      const perto = maisProximo(lat, lon);
      ok({ nome: 'Sua localização', perto: perto.nome + '/' + perto.uf, uf: '', lat, lon, gps: true });
    }, () => { clearTimeout(limite); ok(null); }, { timeout: tempo, maximumAge: 3600000 });
  });
}

// No primeiro acesso tenta a localização da pessoa e devolve o novo local (ou null).
// Se já existe um local escolhido, ou se não conseguir, devolve null e fica o que está na tela.
export async function localInicial() {
  if (municipioSalvo()) return null;
  const gps = await localDoAparelho();
  if (gps) definirMunicipio(gps);
  return gps;
}

// Início da safra das águas: 1º de setembro (antes de setembro, vale a safra anterior).
function inicioSafra(hoje) {
  const [a, m] = hoje.split('-').map(Number);
  return (m >= 9 ? a : a - 1) + '-09-01';
}

function diasSemChuva(mm, ateIndice) {
  let n = 0;
  for (let i = ateIndice; i >= 0; i--) { if ((mm[i] ?? 0) < SECO) n++; else break; }
  return n;
}

const somaJanela = (d, ini, fim) => d.time.reduce((s, t, i) => (t >= ini && t <= fim ? s + (d.precipitation_sum[i] || 0) : s), 0);

export async function carregarClima(local = municipioAtual()) {
  const hoje = hojeISO();
  const ontem = somaDias(hoje, -1);
  const inicio = inicioSafra(hoje);
  const corte = somaDias(hoje, -8); // o arquivo histórico tem atraso de alguns dias
  const anoIni = Number(inicio.slice(0, 4));
  const janela = difDias(inicio, ontem); // dias desde o início da safra
  const tz = encodeURIComponent(TZ);

  const qPrev = `latitude=${local.lat}&longitude=${local.lon}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&past_days=92&forecast_days=7&timezone=${tz}`;
  const qHist = `latitude=${local.lat}&longitude=${local.lon}&daily=precipitation_sum&start_date=${anoIni - 10}-09-01&end_date=${corte}&timezone=${tz}`;
  const qReg = `latitude=${MUNICIPIOS.map((m) => m.lat).join(',')}&longitude=${MUNICIPIOS.map((m) => m.lon).join(',')}&daily=precipitation_sum&past_days=45&forecast_days=1&timezone=${tz}`;

  const [prev, hist, reg] = await Promise.allSettled([
    getJSON(`${FORECAST}?${qPrev}`),
    getJSON(`${ARCHIVE}?${qHist}`),
    getJSON(`${FORECAST}?${qReg}`)
  ]);

  const out = {
    municipio: local, atualizado: new Date(), dias: [], total7: null, semChuva: null, chuva7passados: null,
    chuvaSafra: null, chuvaSafraPassada: null, mediaSafra: null, anosMedia: 0, alertas: [],
    inicioSafra: inicio, inicioPassada: `${anoIni - 1}-09-01`, fimPassada: somaDias(`${anoIni - 1}-09-01`, janela), ate: ontem, erro: null
  };

  if (prev.status === 'fulfilled') {
    const d = prev.value.daily;
    const iHoje = d.time.indexOf(hoje);
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = iHoje; i < d.time.length && out.dias.length < 7; i++) {
      out.dias.push({
        data: d.time[i],
        dia: i === iHoje ? 'Hoje' : nomes[new Date(d.time[i] + 'T12:00:00Z').getUTCDay()],
        mm: d.precipitation_sum[i],
        prob: d.precipitation_probability_max?.[i],
        tmax: d.temperature_2m_max?.[i],
        tmin: d.temperature_2m_min?.[i]
      });
    }
    out.total7 = out.dias.reduce((s, x) => s + (x.mm || 0), 0);
    out.semChuva = diasSemChuva(d.precipitation_sum, iHoje - 1);
    out.chuva7passados = somaJanela(d, somaDias(hoje, -7), ontem);

    const recentes = somaJanela(d, corte > inicio ? somaDias(corte, 1) : inicio, ontem);
    if (hist.status === 'fulfilled') {
      const h = hist.value.daily;
      out.chuvaSafra = (inicio <= corte ? somaJanela(h, inicio, corte) : 0) + recentes;
      out.chuvaSafraPassada = somaJanela(h, out.inicioPassada, out.fimPassada);
      const totais = [];
      for (let k = 1; k <= 10; k++) {
        const ini = `${anoIni - k}-09-01`, fim = somaDias(ini, janela);
        let soma = 0, n = 0;
        h.time.forEach((t, i) => { if (t >= ini && t <= fim && h.precipitation_sum[i] != null) { soma += h.precipitation_sum[i]; n++; } });
        if (n > janela * 0.9) totais.push(soma);
      }
      if (totais.length) { out.mediaSafra = totais.reduce((a, b) => a + b, 0) / totais.length; out.anosMedia = totais.length; }
    } else if (inicio > corte) {
      out.chuvaSafra = recentes;
    }
  } else {
    out.erro = 'Não foi possível carregar a previsão agora.';
  }

  if (reg.status === 'fulfilled') {
    const lista = Array.isArray(reg.value) ? reg.value : [reg.value];
    lista.forEach((r, k) => {
      const n = diasSemChuva(r.daily.precipitation_sum, r.daily.time.indexOf(hoje) - 1);
      if (n >= 10) out.alertas.push({ municipio: MUNICIPIOS[k].nome + '/' + MUNICIPIOS[k].uf, dias: n });
    });
    out.alertas.sort((a, b) => b.dias - a.dias);
  }
  return out;
}

// Recomendação de plantio a partir da previsão (regras simples; o texto do Helder em clima.json tem prioridade).
export function recomendacaoPlantio(a) {
  if (!a || !a.dias.length) return null;
  const prox3 = a.dias.slice(0, 3).reduce((s, d) => s + (d.mm || 0), 0);
  const maxDia = Math.max(...a.dias.slice(0, 3).map((d) => d.mm || 0));
  const umido = (a.chuva7passados || 0) >= 20;
  const itens = [];
  let titulo;
  if (maxDia >= 30 || prox3 >= 40) {
    titulo = 'Chuva forte nos próximos dias: segure o plantio';
    itens.push(`Previsão de ${Math.round(prox3)} mm em 3 dias. Evite plantar logo antes do temporal, principalmente em solo arenoso: a chuva forte pode arrastar semente e formar crosta, atrapalhando a emergência.`);
    itens.push('Se já plantou, acompanhe a emergência nos pontos mais baixos e nas linhas expostas.');
  } else if (umido) {
    titulo = 'Solo com umidade: boa janela para plantar';
    itens.push(`Choveu ${Math.round(a.chuva7passados)} mm nos últimos 7 dias. Aproveite a umidade e plante sem atraso.`);
    itens.push('Profundidade entre 4 e 6 cm, com a semente em contato com o solo úmido. Em solo arenoso, pode ir um pouco mais fundo.');
  } else if ((a.semChuva || 0) >= 7 && a.total7 < 15) {
    titulo = 'Solo secando e pouca chuva prevista';
    itens.push(`São ${a.semChuva} dias sem chuva e só ${Math.round(a.total7)} mm previstos na semana. O ideal é esperar uma chuva de pelo menos 15 a 20 mm antes de plantar.`);
    itens.push('Não aprofunde demais a semente para buscar umidade: plantar fundo atrasa e enfraquece a emergência.');
  } else {
    titulo = 'Plante com o solo úmido';
    itens.push(`Previsão de ${Math.round(a.total7)} mm na semana. Plante quando houver umidade no solo e evite os dias de chuva forte.`);
    itens.push('Profundidade entre 4 e 6 cm, com boa regulagem da plantadeira para não danificar a semente.');
  }
  itens.push('Confira o zoneamento agrícola (ZARC) do seu município: ele vale para crédito e seguro.');
  return { titulo, itens };
}

// Tela de Clima. h = utilitários do app (esc, ic, I, numBr); D = dados do app.
export function telaClima(D, h) {
  const { esc, ic, I, numBr } = h;
  const c = D.clima;
  const a = D.climaAuto;
  const atual = municipioAtual();
  const carregando = !a;
  const dias = a?.dias || [];
  const maior = a ? Math.max(a.chuvaSafra || 0, a.chuvaSafraPassada || 0, 1) : 1;
  const larg = (v) => (v == null ? 0 : Math.max(3, Math.round((v / maior) * 100)));
  const dif = a && a.chuvaSafra != null && a.chuvaSafraPassada != null ? Math.round(a.chuvaSafra - a.chuvaSafraPassada) : null;
  const opcoes = MUNICIPIOS.map((m) => `<option value="${esc(m.nome)}" ${!atual.gps && m.nome === atual.nome ? 'selected' : ''}>${esc(m.nome)}/${esc(m.uf)}</option>`).join('');
  const minhaLocal = atual.gps ? `<option value="__gps" selected>Sua localização${atual.perto ? ' (perto de ' + esc(atual.perto) + ')' : ''}</option>` : '';
  const rec = (c.recomendacao && !c.recomendacao.startsWith('[')) ? { titulo: 'Recomendação da semana', itens: [c.recomendacao] } : recomendacaoPlantio(a);
  const anoA = a ? a.inicioSafra.slice(2, 4) : '';
  const anoP = a ? a.inicioPassada.slice(2, 4) : '';

  return `<header class="topo">
    <div><h1>Clima</h1><div class="sub">Chuva, alertas e plantio na sua região</div></div>
    <div class="campo" style="gap:6px">
      <label for="sel-municipio">Local da lavoura</label>
      <div style="display:flex;gap:8px">
        <select id="sel-municipio" style="flex:1">${minhaLocal}${opcoes}</select>
        <button class="btn-icone" id="usar-gps" aria-label="Usar minha localização" style="width:48px;height:48px;border-radius:12px;color:var(--verde)">${ic(I.pino)}</button>
      </div>
    </div>
  </header>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Previsão · 7 dias</span><b class="num" style="font-size:13px">${a?.total7 != null ? numBr(a.total7) + ' mm no total' : (carregando ? 'carregando…' : '— mm')}</b></div>
    ${a?.erro ? `<span class="mini">${esc(a.erro)}</span>` : ''}
    <div class="dias">${(dias.length ? dias : Array.from({ length: 7 }, () => null)).map((d) => d
      ? `<div class="dia">${esc(d.dia)}${ic(d.mm >= SECO ? I.chuva : I.sol, `style="width:22px;height:22px;stroke:${d.mm >= SECO ? '#2F6FA3' : '#D58A16'}"`)}<small class="num">${numBr(d.mm)}mm</small><small class="num" style="color:var(--texto-3);font-weight:500">${d.prob != null ? d.prob + '%' : ''}</small></div>`
      : `<div class="dia" style="opacity:.5">…${ic(I.chuva, 'style="width:22px;height:22px;stroke:#CFC8B8"')}<small>—</small></div>`).join('')}</div>
    ${dias.length ? `<div class="mini">Máx/mín hoje: <b class="num">${numBr(dias[0].tmax)}° / ${numBr(dias[0].tmin)}°</b> · % = chance de chuva</div>` : ''}
  </section>

  ${rec ? `<section class="cartao" style="border-color:#C2E2CC;background:var(--verde-fundo)">
    <span class="rotulo" style="color:var(--verde-escuro)">Planejamento de plantio</span>
    <b style="font-size:17px;line-height:1.3">${esc(rec.titulo)}</b>
    ${rec.itens.map((t) => `<p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(t)}</p>`).join('')}
    <span class="mini">Orientação automática pela previsão. Na dúvida, fale com seu agrônomo.</span>
  </section>` : ''}

  <section class="cartao" style="gap:14px">
    <div class="cartao-cab"><span class="rotulo">Chuva desde 01/09 · esta safra vs passada</span>${dif != null ? `<span class="pilula ${dif >= 0 ? 'pilula-azul' : 'pilula-amendoim'}">${dif >= 0 ? '+' : '−'}${numBr(Math.abs(dif))} mm</span>` : ''}</div>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="cartao-cab" style="font-size:13px"><b>Safra ${anoA}/${a ? +anoA + 1 : ''} · até ${a ? dataBr(a.ate).slice(0, 5) : '—'}</b><b class="num">${a?.chuvaSafra != null ? numBr(a.chuvaSafra) + ' mm' : '—'}</b></div><div class="barra"><span style="width:${larg(a?.chuvaSafra)}%;background:var(--azul)"></span></div></div>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="cartao-cab" style="font-size:13px"><span style="font-weight:600;color:var(--texto-3)">Safra ${anoP}/${a ? +anoP + 1 : ''} · até ${a ? dataBr(a.fimPassada).slice(0, 5) : '—'}</span><b class="num">${a?.chuvaSafraPassada != null ? numBr(a.chuvaSafraPassada) + ' mm' : '—'}</b></div><div class="barra"><span style="width:${larg(a?.chuvaSafraPassada)}%;background:#9CC3E3"></span></div></div>
    ${a?.mediaSafra != null ? `<span class="mini">Média de ${a.anosMedia} safras no mesmo período: <b class="num">${numBr(a.mediaSafra)} mm</b></span>` : ''}
  </section>

  <section class="cartao ${a && a.semChuva >= 10 ? 'alerta' : ''}">
    <div class="cartao-cab"><span class="rotulo">Dias seguidos sem chuva</span><b class="grande num">${a?.semChuva != null ? a.semChuva : '—'}</b></div>
    <span class="mini">${a?.semChuva != null ? (a.semChuva >= 10 ? 'Atenção: veranico na sua região.' : 'Contagem até ontem (dias com menos de 1 mm).') : ''}</span>
  </section>

  <section class="cartao alerta">
    <div style="display:flex;align-items:center;gap:8px">${ic(I.alerta, 'style="width:20px;height:20px;stroke:#7A4A08"')}<b style="font-size:15px;color:#6B3F08">Regiões com 10+ dias sem chuva</b></div>
    ${a ? (a.alertas.length ? a.alertas.map((v) => `<div class="cartao-cab" style="padding:8px 0;border-top:1px solid var(--amendoim-borda)"><b style="font-size:14px">${esc(v.municipio)}</b><b class="num" style="color:#6B3F08">${numBr(v.dias)} dias</b></div>`).join('') : '<span class="mini" style="color:#5C3A06">Nenhuma região produtora em alerta agora.</span>') : '<span class="mini">carregando…</span>'}
  </section>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Radar de chuva ao vivo</span><span class="pilula pilula-verde">IPMet</span></div>
    <span style="font-size:14px;line-height:1.5;color:var(--texto-2)">Veja onde está chovendo agora, pelos radares de Bauru e Presidente Prudente.</span>
    <a class="btn btn-verde" href="${esc(c.radarLink || 'https://www.ipmetradar.com.br/2mobileGis.php')}" target="_blank" rel="noopener">Abrir radar</a>
  </section>

  <section class="cartao">
    <span class="rotulo">Momento da safra · ${esc(D.config.safraAtual)}</span>
    ${(D.config.fases || []).map((f) => f === D.config.faseSafra
      ? `<div style="display:flex;align-items:center;gap:12px"><span style="width:22px;height:22px;border-radius:11px;background:var(--verde);border:4px solid var(--verde-claro)"></span><b class="cresce" style="font-size:15px">${esc(f)}</b><span class="pilula pilula-verde">Agora</span></div>`
      : `<div style="display:flex;align-items:center;gap:12px"><span style="width:22px;height:22px;border-radius:11px;border:2px solid #CFC8B8"></span><span class="cresce" style="font-size:15px;color:var(--texto-3)">${esc(f)}</span></div>`).join('')}
  </section>

  <section class="cartao">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:var(--azul-claro)">${ic(I.globo, 'style="stroke:#2F5F8A"')}</span>
      <b class="cresce" style="font-size:16px">El Niño · La Niña</b>
    </div>
    <p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(c.enso)}</p>
    <span class="mini">${esc(c.ensoFonte || '')}</span>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      ${c.ensoLink ? `<a class="link-mini" href="${esc(c.ensoLink)}" target="_blank" rel="noopener">Ler o boletim completo</a>` : ''}
      ${c.ensoLinkPermanente ? `<a class="link-mini" href="${esc(c.ensoLinkPermanente)}" target="_blank" rel="noopener">Acompanhar no CPTEC/INPE</a>` : ''}
    </div>
  </section>

  <p class="mini" style="text-align:center;margin:0">Dados de clima: Open-Meteo (CC BY 4.0) · fonte provisória em teste</p>`;
}
