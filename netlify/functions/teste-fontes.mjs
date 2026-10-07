// Diagnóstico temporário: cabeçalhos de limite do Comex Stat. Será apagado.
import { chaveOk, json } from '../lib/base.mjs';

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
  const tipo = q.get('tipo') || 'pequeno';
  const corpos = {
    pequeno: { flow: 'export', monthDetail: false, period: { from: '2026-01', to: '2026-09' }, filters: [{ filter: 'heading', values: ['1202'] }], details: [], metrics: ['metricKG'] },
    mensal: { flow: 'export', monthDetail: true, period: { from: '2022-01', to: '2026-12' }, filters: [{ filter: 'heading', values: ['1202', '1508'] }], details: ['heading'], metrics: ['metricFOB', 'metricKG'] }
  };
  const t = Date.now();
  const r = await fetch(q.get('url') || 'https://api-comexstat.mdic.gov.br/general?language=pt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpos[tipo]), signal: AbortSignal.timeout(9000) }).catch((e) => ({ erro: String(e) }));
  if (r.erro) return json(r);
  const txt = await r.text();
  return json({ status: r.status, ms: Date.now() - t, headers: Object.fromEntries(r.headers.entries()), corpo: txt.slice(0, 1500) });
};

export const config = { path: '/api/teste-fontes' };
