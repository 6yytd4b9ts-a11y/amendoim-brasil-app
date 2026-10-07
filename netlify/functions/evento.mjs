// Medição anônima do app: soma, por dia, quantas vezes cada evento aconteceu.
// Não guarda nada da pessoa (nem IP, nem aparelho): só o nome do evento e o total do dia.
// Os totais ficam divididos em 16 partes por dia (menos chance de duas gravações ao mesmo tempo se atropelarem).
import { getStore } from '@netlify/blobs';

const NOME = /^[a-z0-9-]{1,60}$/;
const MAX_NOMES_DIA = 600;

export default async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  let corpo = {};
  try { corpo = JSON.parse(await req.text()) || {}; } catch (e) { /* corpo inválido */ }
  const nomes = (Array.isArray(corpo.ev) ? corpo.ev : [corpo.e]).slice(0, 40).map(String).filter((n) => NOME.test(n));
  if (!nomes.length) return new Response('', { status: 400 });
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const loja = getStore({ name: 'metricas', consistency: 'strong' });
  const chave = `${dia}/${Math.floor(Math.random() * 16)}`;
  const atual = (await loja.get(chave, { type: 'json' })) || {};
  for (const n of nomes) {
    if (!(n in atual) && Object.keys(atual).length >= MAX_NOMES_DIA) continue;
    atual[n] = (atual[n] || 0) + 1;
  }
  await loja.setJSON(chave, atual);
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/evento' };
