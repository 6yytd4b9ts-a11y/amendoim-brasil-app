// ESBOÇO da nova aba Clima: previsão mais visual, chuva nas regiões produtoras e a leitura da semana.
// Usa os mesmos dados de hoje (Open-Meteo, provisório até a versão paga) e os mesmos controles de município.
import { MUNICIPIOS, municipioAtual, recomendacaoPlantio } from '/clima.js';
import { conteudo } from '/esboco-dados.js';

let ctx = { render: () => {} };
const est = { prev: 7, regioes: null, buscando: false };
const TZ = 'America/Sao_Paulo';
const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

const ICONES = {
  sol: ['<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', '#E59A1A', 'Sol'],
  solNuvem: ['<path d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5M18.4 5.6l-1 1"/><path d="M8.5 10a4 4 0 0 1 7.2-2.2"/><path d="M17 20H9a3.5 3.5 0 1 1 .6-6.95A4.5 4.5 0 0 1 18.2 14 3 3 0 0 1 17 20z"/>', '#C98A2E', 'Sol entre nuvens'],
  nuvem: ['<path d="M17.5 19H7a4.5 4.5 0 1 1 .8-8.93A6 6 0 0 1 19 11.5a3.75 3.75 0 0 1-1.5 7.5z"/>', '#7C8A96', 'Nublado'],
  chuva: ['<path d="M17.5 14H7a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 7.5a3.25 3.25 0 0 1-.5 6.5z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>', '#2F6FA3', 'Chuva'],
  forte: ['<path d="M17.5 14H7a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 7.5a3.25 3.25 0 0 1-.5 6.5z"/><path d="m12.5 14-2.5 4h4l-2.5 4"/>', '#5B4FA3', 'Chuva forte']
};
const tempo = (d) => {
  if (!d) return 'nuvem';
  const mm = d.mm || 0, p = d.prob ?? 0;
  if (mm >= 25) return 'forte';
  if (mm >= 2) return 'chuva';
  if (mm >= 0.5 || p >= 45) return 'nuvem';
  if (p >= 20) return 'solNuvem';
  return 'sol';
};
const icone = (h, tipo, tam = 28) => h.ic(ICONES[tipo][0], `style="width:${tam}px;height:${tam}px;stroke:${ICONES[tipo][1]};stroke-width:1.9" aria-label="${ICONES[tipo][2]}"`);
const dataCurta = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

// Chuva prevista para 7 dias em todos os municípios da lista (um pedido só).
async function buscarRegioes() {
  if (est.regioes || est.buscando) return;
  est.buscando = true;
  try {
    const q = `latitude=${MUNICIPIOS.map((m) => m.lat).join(',')}&longitude=${MUNICIPIOS.map((m) => m.lon).join(',')}&daily=precipitation_sum&past_days=20&forecast_days=7&timezone=${encodeURIComponent(TZ)}`;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
    if (!r.ok) throw new Error('http');
    const j = await r.json();
    const lista = Array.isArray(j) ? j : [j];
    const hoje = hojeISO();
    est.regioes = lista.map((x, k) => {
      const t = x.daily.time, mm = x.daily.precipitation_sum, i = t.indexOf(hoje);
      let seco = 0; for (let n = i - 1; n >= 0; n--) { if ((mm[n] ?? 0) < 1) seco++; else break; }
      return { ...MUNICIPIOS[k], prev7: mm.slice(i, i + 7).reduce((s, v) => s + (v || 0), 0), seco };
    });
  } catch (e) { est.regioes = []; }
  est.buscando = false;
  if (location.hash.startsWith('#/clima')) ctx.render(false);
}

export function telaClimaNova(D, h) {
  const { esc, ic, I, numBr } = h;
  const c = D.clima || {}, a = D.climaAuto, atual = municipioAtual();
  buscarRegioes();
  const fase = D.config.faseSafra || 'Plantio';
  const opcoes = MUNICIPIOS.map((m) => `<option value="${esc(m.nome)}" ${!atual.gps && m.nome === atual.nome ? 'selected' : ''}>${esc(m.nome)}/${esc(m.uf)}</option>`).join('');
  const minhaLocal = atual.gps ? `<option value="__gps" selected>Sua localização${atual.perto ? ' (perto de ' + esc(atual.perto) + ')' : ''}</option>` : '';
  const mm = (v) => (v == null ? '—' : numBr(v) + ' mm');
  const dias = (a?.dias || []).slice(0, est.prev);
  const hoje = a?.dias?.[0];
  const comChuva = (a?.dias || []).slice(0, 7).filter((d) => (d.mm || 0) >= 1).length;
  const rec = (c.recomendacao && !c.recomendacao.startsWith('[')) ? { titulo: 'Recomendação da semana', dica: c.recomendacao } : recomendacaoPlantio(a, fase);
  const nomeLocal = atual.gps ? (atual.perto ? 'Perto de ' + esc(atual.perto) : 'Sua localização') : `${esc(atual.nome)}/${esc(atual.uf)}`;
  const hora = a?.atualizado ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(a.atualizado) : '';
  const dif = a && a.chuvaSafra != null && a.chuvaSafraPassada != null ? Math.round(a.chuvaSafra - a.chuvaSafraPassada) : null;
  const maior = a ? Math.max(a.chuvaSafra || 0, a.chuvaSafraPassada || 0, a.mediaSafra || 0, 1) : 1;
  const barra = (v, cor) => `<div class="barra"><span style="width:${v == null ? 0 : Math.max(3, Math.round((v / maior) * 100))}%;background:${cor}"></span></div>`;
  const regs = (est.regioes || []).slice().sort((x, y) => y.prev7 - x.prev7);
  const maxReg = Math.max(10, ...regs.map((r) => r.prev7));
  const linhaReg = (r) => `<div class="es-reg"><span class="es-reg-nome">${esc(r.nome)}<small>/${esc(r.uf)}</small></span><span class="es-reg-barra"><i style="width:${Math.max(2, (r.prev7 / maxReg) * 100)}%"></i></span><b class="num">${numBr(r.prev7)} mm</b>${r.seco >= 7 ? `<span class="es-reg-seco" title="dias sem chuva">${r.seco}d seco</span>` : '<span></span>'}</div>`;
  const leitura = conteudo().leituraClima;

  return `<header class="topo">
    <h1>Clima</h1>
    <div class="campo" style="flex-direction:row;gap:8px">
      <select id="sel-municipio" aria-label="Local da lavoura" style="flex:1">${minhaLocal}${opcoes}</select>
      <button class="btn-icone" id="usar-gps" aria-label="Usar minha localização" style="width:48px;height:48px;border-radius:12px;color:var(--verde)">${ic(I.pino)}</button>
    </div>
  </header>
  ${a?.erro ? `<div class="vazio">${esc(a.erro)}</div>` : ''}

  <section class="es-clima-hero">
    <div class="cartao-cab"><span class="es-clima-local">${ic(I.pino, 'style="width:16px;height:16px;stroke:#fff"')}${nomeLocal}</span><span class="es-clima-hora">${hora ? 'atualizado ' + hora : ''}</span></div>
    ${hoje ? `<div class="es-clima-agora">
      <span class="es-clima-ic">${icone(h, tempo(hoje), 64)}</span>
      <div><span class="es-clima-temp num">${hoje.tmax != null ? Math.round(hoje.tmax) + '°' : '—'}<small>${hoje.tmin != null ? ' / ' + Math.round(hoje.tmin) + '°' : ''}</small></span>
      <span class="es-clima-desc">Hoje · ${ICONES[tempo(hoje)][2]}${hoje.prob != null ? ` · ${hoje.prob}% de chance de chuva` : ''}</span></div>
    </div>
    <div class="es-clima-resumo">
      <div><span>Previsto 7 dias</span><b class="num">${mm(a.total7)}</b></div>
      <div><span>Dias com chuva</span><b class="num">${comChuva} de 7</b></div>
      <div><span>Sem chuva há</span><b class="num">${numBr(a.semChuva)} dias</b></div>
    </div>` : '<div class="es-clima-agora"><span class="es-clima-desc">Carregando a previsão…</span></div>'}
  </section>

  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Próximos dias</span>
      <div class="alterna" role="group" aria-label="Período"><button data-cl-prev="7" aria-pressed="${est.prev === 7}">7 dias</button><button data-cl-prev="15" aria-pressed="${est.prev === 15}">15 dias</button></div>
    </div>
    <div class="es-dias">${dias.map((d) => `<div class="es-dia ${(d.mm || 0) >= 25 ? 'forte' : ''}">
      <span class="es-dia-nome">${esc(d.dia)}</span><small>${dataCurta(d.data)}</small>
      ${icone(h, tempo(d), 30)}
      <span class="es-dia-temp num">${d.tmax != null ? Math.round(d.tmax) + '°' : ''}<small>${d.tmin != null ? Math.round(d.tmin) + '°' : ''}</small></span>
      <b class="es-dia-mm num">${numBr(d.mm)}<small> mm</small></b>
      <small class="es-dia-prob">${d.prob != null ? d.prob + '%' : ''}</small>
    </div>`).join('') || '<div class="vazio">Carregando…</div>'}</div>
    <span class="mini">Arraste para o lado · % = chance de chuva</span>
    ${h.patrocinio ? h.patrocinio('clima') : ''}
  </section>

  ${rec ? `<section class="cartao fase-cartao">
    <div class="cartao-cab"><span class="rotulo" style="color:var(--verde-escuro)">Para a lavoura esta semana</span><span class="pilula pilula-verde">${esc(fase)}</span></div>
    <b style="font-size:17px;line-height:1.3">${esc(rec.titulo)}</b>
    ${rec.dica ? `<details class="abre"><summary>Ver orientação</summary><p class="es-txt" style="margin:0 0 10px">${esc(rec.dica)}</p></details>` : ''}
    <span class="mini">Automática, pela previsão · confirme com seu agrônomo</span>
  </section>` : ''}

  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Chuva nas regiões produtoras</span><span class="mini">próximos 7 dias</span></div>
    ${est.regioes == null ? '<span class="mini">Carregando…</span>' : regs.length ? `${regs.slice(0, 6).map(linhaReg).join('')}
      ${regs.length > 6 ? `<details class="abre"><summary>Ver mais ${regs.length - 6} municípios</summary>${regs.slice(6).map(linhaReg).join('')}</details>` : ''}` : '<span class="mini">Não foi possível carregar agora.</span>'}
  </section>

  ${leitura ? `<section class="boletim" style="gap:6px">
    <span class="tag">${ic(I.doc, 'style="width:18px;height:18px"')}Leitura do clima da semana</span>
    <details class="es-leitura"><summary>${esc(leitura.split('. ')[0])}.</summary><p>${esc(leitura.split('. ').slice(1).join('. '))}</p></details>
    <span class="mini" style="color:#5C3A06;font-weight:600">Helder Lamberti</span>
  </section>` : ''}

  <section class="cartao" style="gap:12px">
    <div class="cartao-cab"><span class="rotulo">Chuva desde 01/09</span>${dif != null ? `<span class="mini" style="font-weight:700">${Math.abs(dif) < 5 ? 'Igual à safra passada' : `${dif > 0 ? '+' : '−'}${numBr(Math.abs(dif))} mm vs safra passada`}</span>` : ''}</div>
    ${a && a.chuvaSafra != null ? `
    <div class="comp-linha"><div class="cartao-cab"><b>Esta safra</b><b class="num">${mm(a.chuvaSafra)}</b></div>${barra(a.chuvaSafra, 'var(--azul)')}</div>
    <div class="comp-linha"><div class="cartao-cab"><span>Safra passada</span><b class="num">${mm(a.chuvaSafraPassada)}</b></div>${barra(a.chuvaSafraPassada, '#9CC3E3')}</div>
    ${a.mediaSafra != null ? `<div class="comp-linha"><div class="cartao-cab"><span>Média de ${a.anosMedia} safras</span><b class="num">${mm(a.mediaSafra)}</b></div>${barra(a.mediaSafra, '#CFC8B8')}</div>` : ''}` : '<span class="mini">carregando…</span>'}
  </section>

  ${c.enso ? `<section class="cartao" style="padding-top:4px;padding-bottom:4px">
    <details class="abre" style="border-top:0"><summary>${ic(I.globo, 'style="width:18px;height:18px;stroke:#2F5F8A"')}El Niño · La Niña</summary>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:var(--texto-2)">${esc(c.enso)}</p></details>
  </section>` : ''}

  <div class="es-links-clima">
    <a class="cartao radar-linha" href="${esc(c.radarLink || 'https://www.ipmetradar.com.br/2mobileGis.php')}" target="_blank" rel="noopener">
      ${ic(I.chuva, 'style="width:22px;height:22px;stroke:#2F5F8A"')}<span class="cresce"><b>Radar ao vivo</b><span class="mini">IPMet</span></span></a>
    <a class="cartao radar-linha" href="https://alertas2.inmet.gov.br/" target="_blank" rel="noopener">
      ${ic(I.alerta, 'style="width:22px;height:22px;stroke:#7A4A08"')}<span class="cresce"><b>Alertas oficiais</b><span class="mini">INMET</span></span></a>
  </div>
  <p class="mini fonte-clima">Previsão: Open-Meteo${hora ? ' · ' + hora : ''}</p>`;
}

export function ligarClimaNovo(opcoes) {
  ctx = { ...ctx, ...opcoes };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl-prev]');
    if (!b) return;
    est.prev = +b.dataset.clPrev === 15 ? 15 : 7;
    ctx.render(false);
  });
}
