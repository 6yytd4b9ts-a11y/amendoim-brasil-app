// Devolve os totais diários da medição. Só responde com a chave do Helder.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const CHAVE_SHA256 = '7db2b7a3227d1023b6f566ec1c0aac8b9b5896dd40cfb497f4e70ef82cf6b830';

export default async (req) => {
  const k = new URL(req.url).searchParams.get('k') || '';
  const cab = { 'cache-control': 'no-store' };
  if (createHash('sha256').update(k).digest('hex') !== CHAVE_SHA256) return Response.json({ erro: 'chave' }, { status: 401, headers: cab });
  const loja = getStore('metricas');
  const { blobs } = await loja.list();
  const dias = blobs.map((b) => b.key).sort().slice(-60);
  const saida = {};
  for (const d of dias) saida[d] = (await loja.get(d, { type: 'json' })) || {};
  return Response.json(saida, { headers: cab });
};

export const config = { path: '/api/numeros' };
