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

  const qPrev = `latitude=${local.lat}&longitude=${local.lon}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&past_days=92&forecast_days=16&timezone=${tz}`;
  const qHist = `latitude=${local.lat}&longitude=${local.lon}&daily=precipitation_sum&start_date=${anoIni - 10}-09-01&end_date=${corte}&timezone=${tz}`;
  const qReg = `latitude=${MUNICIPIOS.map((m) => m.lat).join(',')}&longitude=${MUNICIPIOS.map((m) => m.lon).join(',')}&daily=precipitation_sum&past_days=45&forecast_days=1&timezone=${tz}`;

  const [prev, hist, reg] = await Promise.allSettled([
    getJSON(`${FORECAST}?${qPrev}`),
    getJSON(`${ARCHIVE}?${qHist}`),
    getJSON(`${FORECAST}?${qReg}`)
  ]);

  const out = {
    municipio: local, atualizado: new Date(), dias: [], total7: null, total15: null, semChuva: null, chuva5passados: null, chuva7passados: null, chuva30passados: null,
    chuvaSafra: null, chuvaSafraPassada: null, mediaSafra: null, anosMedia: 0, alertas: [],
    inicioSafra: inicio, inicioPassada: `${anoIni - 1}-09-01`, fimPassada: somaDias(`${anoIni - 1}-09-01`, janela), ate: ontem, erro: null
  };

  if (prev.status === 'fulfilled') {
    const d = prev.value.daily;
    const iHoje = d.time.indexOf(hoje);
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = iHoje; i < d.time.length && out.dias.length < 15; i++) {
      out.dias.push({
        data: d.time[i],
        dia: i === iHoje ? 'Hoje' : nomes[new Date(d.time[i] + 'T12:00:00Z').getUTCDay()],
        mm: d.precipitation_sum[i],
        prob: d.precipitation_probability_max?.[i],
        tmax: d.temperature_2m_max?.[i],
        tmin: d.temperature_2m_min?.[i]
      });
    }
    out.total7 = out.dias.slice(0, 7).reduce((s, x) => s + (x.mm || 0), 0);
    out.total15 = out.dias.reduce((s, x) => s + (x.mm || 0), 0);
    out.chuva5passados = somaJanela(d, somaDias(hoje, -5), ontem);
    out.chuva30passados = somaJanela(d, somaDias(hoje, -30), ontem);
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

// Orientação da semana conforme a fase da safra e a previsão (regras simples; o texto do Helder em clima.json tem prioridade).
export function recomendacaoPlantio(a, fase = 'Plantio') {
  if (!a || !a.dias?.length) return null;
  const prox3 = a.dias.slice(0, 3).reduce((s, d) => s + (d.mm || 0), 0);
  const maxDia = Math.max(...a.dias.slice(0, 3).map((d) => d.mm || 0));
  const forte = maxDia >= 30 || prox3 >= 40;
  const umido = (a.chuva7passados || 0) >= 20;
  const seco = (a.semChuva || 0) >= 7 && (a.total7 || 0) < 15;
  const r = (titulo, itens, dica) => ({ titulo, itens, dica });
  const f = (fase || '').toLowerCase();

  if (f.startsWith('emerg')) {
    if (forte) return r('Chuva forte na emergência: atenção à crosta', [`Previsão de ${Math.round(prox3)} mm em 3 dias. Chuva pesada logo após o plantio pode formar crosta e segurar a emergência, principalmente em solo arenoso.`], 'Depois da chuva, ande nas linhas mais baixas e veja se a planta está rompendo o solo.');
    if (seco) return r('Solo secando na emergência', [`São ${a.semChuva} dias sem chuva. Emergência irregular deixa estande falhado e lavoura desuniforme.`], 'Conte plantas por metro em vários pontos e compare com a população planejada antes de pensar em replantio.');
    return r('Boa condição para emergência', [`Choveu ${Math.round(a.chuva7passados || 0)} mm nos últimos 7 dias e a previsão é de ${Math.round(a.total7)} mm na semana.`], 'Avalie o estande entre 10 e 15 dias após o plantio: é o momento de decidir se precisa de algum ajuste.');
  }
  if (f.startsWith('flor')) {
    if (seco) return r('Florada com pouca chuva', [`São ${a.semChuva} dias sem chuva e só ${Math.round(a.total7)} mm previstos. Falta de água na florada reduz o pegamento e a formação de vagens.`], 'É a fase em que a falta de chuva mais pesa na produtividade. Acompanhe o radar e a previsão de 15 dias.');
    if (umido) return r('Umidade alta na florada: olho nas doenças', [`Choveu ${Math.round(a.chuva7passados)} mm nos últimos 7 dias. Tempo úmido favorece mancha e ferrugem.`], 'Mantenha o calendário de fungicida em dia e não deixe o intervalo esticar com a chuva.');
    return r('Florada em andamento', [`Previsão de ${Math.round(a.total7)} mm na semana.`], 'Chuva regular nesta fase é o que garante vagem. Acompanhe a previsão de 15 dias.');
  }
  if (f.startsWith('ench')) {
    if (seco) return r('Seca no enchimento: risco para o grão', [`São ${a.semChuva} dias sem chuva. Falta de água no enchimento deixa grão miúdo e aumenta o risco de aflatoxina.`], 'Se a seca continuar, antecipe a conversa sobre a comercialização: a qualidade pode cair.');
    return r('Enchimento com boa umidade', [`Previsão de ${Math.round(a.total7)} mm na semana.`], 'Monitore a maturação (raspagem de vagens) para planejar o arranquio com antecedência.');
  }
  if (f.startsWith('arranq') || f.startsWith('colh')) {
    if (forte || prox3 >= 15) return r('Chuva prevista: cuidado ao arrancar', [`Previsão de ${Math.round(prox3)} mm em 3 dias. Amendoim arrancado que toma chuva na leira perde qualidade.`], 'Procure uma janela de 3 a 4 dias secos para arrancar e recolher.');
    return r('Janela seca para o arranquio', [`Pouca chuva prevista nos próximos dias (${Math.round(prox3)} mm em 3 dias).`], 'Aproveite para arrancar e recolher com o produto secando bem na leira.');
  }
  // Plantio (padrão)
  if (forte) return r('Chuva forte nos próximos dias: segure o plantio', [`Previsão de ${Math.round(prox3)} mm em 3 dias. Evite plantar logo antes do temporal, principalmente em solo arenoso: a chuva forte pode arrastar semente e formar crosta, atrapalhando a emergência.`], 'Se já plantou, acompanhe a emergência nos pontos mais baixos e nas linhas expostas.');
  if (umido) return r('Solo com umidade: boa janela para plantar', [`Choveu ${Math.round(a.chuva7passados)} mm nos últimos 7 dias. Aproveite a umidade e plante sem atraso.`], 'Profundidade entre 4 e 6 cm, com a semente em contato com o solo úmido. Em solo arenoso, pode ir um pouco mais fundo.');
  if (seco) return r('Solo secando e pouca chuva prevista', [`São ${a.semChuva} dias sem chuva e só ${Math.round(a.total7)} mm previstos na semana. O ideal é esperar uma chuva de pelo menos 15 a 20 mm antes de plantar.`], 'Não aprofunde demais a semente para buscar umidade: plantar fundo atrasa e enfraquece a emergência.');
  return r('Plante com o solo úmido', [`Previsão de ${Math.round(a.total7)} mm na semana. Plante quando houver umidade no solo e evite os dias de chuva forte.`], 'Profundidade entre 4 e 6 cm, com boa regulagem da plantadeira para não danificar a semente.');
}

let periodoPrev = 7;
export function alternarPrevisao(n) { periodoPrev = n === 15 ? 15 : 7; }

const dataCurta = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

// Tela de Clima. h = utilitários do app (esc, ic, I, numBr, patrocinio); D = dados do app.
export function telaClima(D, h) {
  const { esc, ic, I, numBr } = h;
  const c = D.clima;
  const a = D.climaAuto;
  const atual = municipioAtual();
  const carregando = !a;
  const dias = (a?.dias || []).slice(0, periodoPrev);
  const maxMm = Math.max(10, ...dias.map((d) => d.mm || 0));
  const fase = D.config.faseSafra || 'Plantio';
  const opcoes = MUNICIPIOS.map((m) => `<option value="${esc(m.nome)}" ${!atual.gps && m.nome === atual.nome ? 'selected' : ''}>${esc(m.nome)}/${esc(m.uf)}</option>`).join('');
  const minhaLocal = atual.gps ? `<option value="__gps" selected>Sua localização${atual.perto ? ' (perto de ' + esc(atual.perto) + ')' : ''}</option>` : '';
  const rec = (c.recomendacao && !c.recomendacao.startsWith('[')) ? { titulo: 'Recomendação da semana', itens: [c.recomendacao], dica: '' } : recomendacaoPlantio(a, fase);
  const mm = (v) => (v == null ? '—' : numBr(v) + ' mm');
  const tile = (rot, val, sub = '', cls = '') => `<div class="clima-tile ${cls}"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

  // Comparação da safra em frase clara
  let frase = '';
  if (a && a.chuvaSafra != null && a.chuvaSafraPassada != null) {
    const dif = Math.round(a.chuvaSafra - a.chuvaSafraPassada);
    frase = Math.abs(dif) < 5 ? 'Choveu praticamente o mesmo que na safra passada.' : `Choveu <b>${numBr(Math.abs(dif))} mm ${dif > 0 ? 'a mais' : 'a menos'}</b> que na safra passada no mesmo período.`;
    if (a.mediaSafra != null) {
      const dm = Math.round(a.chuvaSafra - a.mediaSafra);
      frase += ` Está <b>${numBr(Math.abs(dm))} mm ${dm >= 0 ? 'acima' : 'abaixo'}</b> da média de ${a.anosMedia} safras (${numBr(a.mediaSafra)} mm).`;
    }
  }
  const maior = a ? Math.max(a.chuvaSafra || 0, a.chuvaSafraPassada || 0, a.mediaSafra || 0, 1) : 1;
  const barra = (v, cor) => `<div class="barra"><span style="width:${v == null ? 0 : Math.max(3, Math.round((v / maior) * 100))}%;background:${cor}"></span></div>`;
  const anoA = a ? +a.inicioSafra.slice(0, 4) : 0;

  return `<header class="topo">
    <div><h1>Clima</h1><div class="sub">Chuva e decisões da lavoura na sua região</div></div>
    <div class="campo" style="gap:6px">
      <label for="sel-municipio">Local da lavoura</label>
      <div style="display:flex;gap:8px">
        <select id="sel-municipio" style="flex:1">${minhaLocal}${opcoes}</select>
        <button class="btn-icone" id="usar-gps" aria-label="Usar minha localização" style="width:48px;height:48px;border-radius:12px;color:var(--verde)">${ic(I.pino)}</button>
      </div>
    </div>
  </header>

  ${a?.erro ? `<div class="vazio">${esc(a.erro)}</div>` : ''}

  <section class="clima-resumo">
    ${tile('Últimos 5 dias', carregando ? '…' : mm(a.chuva5passados), 'choveu')}
    ${tile('Últimos 7 dias', carregando ? '…' : mm(a.chuva7passados), 'choveu')}
    ${tile('Próximos 7 dias', carregando ? '…' : mm(a.total7), 'previsto', 'prev')}
    ${tile('Sem chuva', carregando ? '…' : numBr(a.semChuva) + (a.semChuva === 1 ? ' dia' : ' dias'), 'seguidos até ontem', a && a.semChuva >= 10 ? 'alerta' : '')}
  </section>

  ${rec ? `<section class="cartao fase-cartao">
    <div class="cartao-cab"><span class="rotulo" style="color:var(--verde-escuro)">Lavoura · fase de ${esc(fase.toLowerCase())}</span><span class="pilula pilula-verde">${esc(D.config.safraAtual || '')}</span></div>
    <div class="fases-linha">${(D.config.fases || []).map((x) => `<span class="${x === fase ? 'atual' : ''}">${esc(x)}</span>`).join('')}</div>
    <b style="font-size:17px;line-height:1.3">${esc(rec.titulo)}</b>
    ${rec.itens.map((t) => `<p style="margin:0;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(t)}</p>`).join('')}
    ${rec.dica ? `<div class="dica"><span class="fato-tag">Dica da semana</span><span>${esc(rec.dica)}</span></div>` : ''}
    <span class="mini">Orientação automática pela previsão e pela fase da safra. Na dúvida, fale com seu agrônomo.</span>
  </section>` : ''}

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Previsão de chuva</span>
      <div class="alterna" role="group" aria-label="Período da previsão"><button data-prev="7" aria-pressed="${periodoPrev === 7}">7 dias</button><button data-prev="15" aria-pressed="${periodoPrev === 15}">15 dias</button></div>
    </div>
    <div class="mini" style="margin-top:-4px">${a ? `<b class="num">${mm(periodoPrev === 7 ? a.total7 : a.total15)}</b> previstos em ${periodoPrev} dias` : 'carregando…'}</div>
    <div class="prev-lista ${periodoPrev === 15 ? 'longa' : ''}">${(dias.length ? dias : Array.from({ length: 7 }, () => null)).map((d) => d
      ? `<div class="prev-dia ${d.mm >= 30 ? 'forte' : ''}">
          <span class="prev-nome">${esc(d.dia)}</span><span class="prev-data">${dataCurta(d.data)}</span>
          ${ic(d.mm >= SECO ? I.chuva : I.sol, `style="width:20px;height:20px;stroke:${d.mm >= SECO ? '#2F6FA3' : '#D58A16'}"`)}
          <span class="prev-barra"><i style="height:${Math.round(((d.mm || 0) / maxMm) * 100)}%"></i></span>
          <b class="num">${numBr(d.mm)}</b><small class="num">${d.prob != null ? d.prob + '%' : ''}</small>
        </div>`
      : `<div class="prev-dia" style="opacity:.5"><span class="prev-nome">…</span></div>`).join('')}</div>
    ${dias.length ? `<div class="mini">mm por dia · % = chance de chuva · Máx/mín hoje <b class="num">${numBr(dias[0].tmax)}° / ${numBr(dias[0].tmin)}°</b>${periodoPrev === 15 ? ' · depois de 7 dias a previsão é menos precisa' : ''}</div>` : ''}
    ${h.patrocinio ? h.patrocinio('clima') : ''}
  </section>

  <section class="cartao" style="gap:12px">
    <span class="rotulo">Chuva acumulada na safra</span>
    ${a && a.chuvaSafra != null ? `<p class="frase-safra">Desde <b>01/09</b> choveu <b class="num">${mm(a.chuvaSafra)}</b> ${esc(nomeLocal(a.municipio))}. ${frase}</p>` : `<span class="mini">${carregando ? 'carregando…' : 'Sem dados do histórico agora.'}</span>`}
    ${a && a.chuvaSafra != null ? `
    <div class="comp-linha"><div class="cartao-cab"><b>Esta safra · 01/09 a ${dataCurta(a.ate)}/${anoA}</b><b class="num">${mm(a.chuvaSafra)}</b></div>${barra(a.chuvaSafra, 'var(--azul)')}</div>
    <div class="comp-linha"><div class="cartao-cab"><span>Safra passada · 01/09 a ${dataCurta(a.fimPassada)}/${anoA - 1}</span><b class="num">${mm(a.chuvaSafraPassada)}</b></div>${barra(a.chuvaSafraPassada, '#9CC3E3')}</div>
    ${a.mediaSafra != null ? `<div class="comp-linha"><div class="cartao-cab"><span>Média de ${a.anosMedia} safras · mesmo período</span><b class="num">${mm(a.mediaSafra)}</b></div>${barra(a.mediaSafra, '#CFC8B8')}</div>` : ''}
    <span class="mini">Últimos 30 dias: <b class="num">${mm(a.chuva30passados)}</b></span>` : ''}
  </section>

  <section class="cartao alerta">
    <div style="display:flex;align-items:center;gap:8px">${ic(I.alerta, 'style="width:20px;height:20px;stroke:#7A4A08"')}<b style="font-size:15px;color:#6B3F08">Regiões com 10+ dias sem chuva</b></div>
    ${a ? (a.alertas.length ? a.alertas.map((v) => `<div class="cartao-cab" style="padding:8px 0;border-top:1px solid var(--amendoim-borda)"><b style="font-size:14px">${esc(v.municipio)}</b><b class="num" style="color:#6B3F08">${numBr(v.dias)} dias</b></div>`).join('') : '<span class="mini" style="color:#5C3A06">Nenhuma região produtora em alerta agora.</span>') : '<span class="mini">carregando…</span>'}
  </section>

  <section class="cartao">
    <div class="cartao-cab"><span class="rotulo">Radar de chuva ao vivo</span><span class="pilula pilula-verde">IPMet</span></div>
    <span style="font-size:14px;line-height:1.5;color:var(--texto-2)">Radar GIS local do IPMet, com os radares de Bauru e Presidente Prudente. Dentro do radar dá para escolher PPI, chuva da última hora e acumulado de 24 horas.</span>
    <a class="btn btn-verde" href="${esc(c.radarLink || 'https://www.ipmetradar.com.br/2mobileGis.php')}" target="_blank" rel="noopener">Abrir radar</a>
    ${c.radarAlternativo ? `<span class="mini">O site do IPMet às vezes fica fora do ar. Se não abrir, <a class="link-mini" href="${esc(c.radarAlternativo)}" target="_blank" rel="noopener">veja as nuvens pelo satélite</a>.</span>` : ''}
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
