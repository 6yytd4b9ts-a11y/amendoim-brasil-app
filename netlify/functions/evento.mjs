// Medição anônima do app: soma, por dia, quantas vezes cada evento aconteceu.
// Não guarda nada da pessoa (nem IP, nem aparelho): só o nome do evento e o total do dia.
import { getStore } from '@netlify/blobs';

const NOME = /^[a-z0-9-]{1,30}$/;

export default async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  let nome = '';
  try { nome = String((JSON.parse(await req.text()) || {}).e || ''); } catch (e) { /* corpo inválido */ }
  if (!NOME.test(nome)) return new Response('', { status: 400 });
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const loja = getStore('metricas');
  const atual = (await loja.get(dia, { type: 'json' })) || {};
  atual[nome] = (atual[nome] || 0) + 1;
  await loja.setJSON(dia, atual);
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/evento' };
