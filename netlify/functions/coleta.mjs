// Preços oficiais coletados automaticamente (IEA diário e Conab semanal). Dados públicos.
// GET /api/coleta → último resultado. ?atualizar=1 → coleta de novo (no máximo a cada 20 min).
import { loja, json } from '../lib/base.mjs';
import { coletar } from '../lib/coleta.mjs';

export default async (req) => {
  const atualizar = new URL(req.url).searchParams.get('atualizar');
  const ult = await loja('coleta').get('ultima', { type: 'json' });
  if (atualizar && (!ult || Date.now() - new Date(ult.atualizado).getTime() > 20 * 60000)) return json(await coletar());
  return json(ult || { erro: 'ainda sem coleta' });
};

export const config = { path: '/api/coleta' };
