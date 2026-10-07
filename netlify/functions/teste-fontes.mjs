// Diagnóstico temporário: testa se o Netlify alcança as fontes de exportação. Será apagado.
import { chaveOk, json } from '../lib/base.mjs';

async function tenta(nome, url, op = {}) {
  const t = Date.now();
  try {
    const r = await fetch(url, { ...op, signal: AbortSignal.timeout(9000) });
    const txt = await r.text();
    return { nome, status: r.status, ms: Date.now() - t, tam: txt.length, tipo: r.headers.get('content-type'), inicio: txt.slice(0, 600) };
  } catch (e) { return { nome, erro: String(e), ms: Date.now() - t }; }
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
  const corpo = { flow: 'export', monthDetail: true, period: { from: '2026-01', to: '2026-12' }, filters: [{ filter: 'heading', values: ['1202'] }], details: ['country'], metrics: ['metricFOB', 'metricKG'] };
  const so = q.get('so');
  const testes = [
    ['comex-general', 'https://api-comexstat.mdic.gov.br/general?language=pt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }],
    ['comex-updated', 'https://api-comexstat.mdic.gov.br/general/dates/updated', {}],
    ['psd-api', 'https://apps.fas.usda.gov/PSDOnlineDataServices/api/CommodityData/GetCommodityDataByYear?commodityCode=2221000&marketYear=2026', {}],
    ['psd-opendata', 'https://apps.fas.usda.gov/OpenData/api/psd/commodity/2221000/world/year/2026', {}],
    ['psd-zip', 'https://apps.fas.usda.gov/psdonline/downloads/psd_oilseeds_csv.zip', { method: 'HEAD' }],
    ['psd-report', 'https://apps.fas.usda.gov/psdonline/app/index.html#/app/downloads', {}]
  ].filter((t) => !so || t[0] === so);
  return json(await Promise.all(testes.map(([n, u, o]) => tenta(n, u, o))));
};

export const config = { path: '/api/teste-fontes' };
