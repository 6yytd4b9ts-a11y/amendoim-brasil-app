// Diário do mercado: guarda, uma vez por dia (última coleta do dia), o retrato do "Mercado hoje" (exportação, demanda,
// oferta, preço da casca), o dólar e o IEA. É o histórico de quando o mercado esteve fraco ou forte, para análise futura.
import { loja, SITE, hojeBR } from './base.mjs';

export async function registrarDia(coleta) {
  const dia = hojeBR();
  const l = loja('diario');
  const [mercado, dolar] = await Promise.allSettled([
    fetch(`${SITE}/data/mercado.json`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json()),
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { signal: AbortSignal.timeout(8000) }).then((r) => r.json()).then((j) => ({ bid: +j.USDBRL.bid, pct: +j.USDBRL.pctChange }))
  ]);
  const m = mercado.status === 'fulfilled' ? mercado.value : {};
  const retrato = {
    dia,
    gravado: new Date().toISOString(),
    mercado: (m.hoje || []).map((x) => ({ id: x.id, valor: x.valor, nota: x.nota, efeito: x.efeito })),
    fato: m.fato?.titulo || null,
    ofertaDemanda: m.ofertaDemanda || null,
    dolar: dolar.status === 'fulfilled' ? dolar.value : null,
    iea: coleta?.iea?.pracas ? { data: coleta.iea.data, pracas: coleta.iea.pracas } : null,
    conab: coleta?.conab?.semanas?.slice(-1)[0] || null
  };
  await l.setJSON(dia, retrato);
  // índice dos dias gravados (lista curta, para listar sem varrer o store)
  const idx = (await l.get('_dias', { type: 'json' })) || [];
  if (!idx.includes(dia)) { idx.push(dia); await l.setJSON('_dias', idx.slice(-1500)); }
  return retrato;
}

export async function lerDiario(de, ate) {
  const l = loja('diario');
  const idx = ((await l.get('_dias', { type: 'json' })) || []).filter((d) => (!de || d >= de) && (!ate || d <= ate));
  return Promise.all(idx.map((d) => l.get(d, { type: 'json' })));
}
