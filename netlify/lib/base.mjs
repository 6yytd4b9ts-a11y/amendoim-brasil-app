// Peças comuns das funções: chave do Helder, inscrições de alerta e disparo de notificações.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { novasChavesVapid, enviarPush } from './push.mjs';

export const SITE = 'https://amendoim-brasil.netlify.app';
const CHAVE_SHA256 = '7db2b7a3227d1023b6f566ec1c0aac8b9b5896dd40cfb497f4e70ef82cf6b830';
export const chaveOk = (k) => createHash('sha256').update(String(k || '')).digest('hex') === CHAVE_SHA256;
export const idDe = (txt) => createHash('sha256').update(String(txt)).digest('hex').slice(0, 32);
export const loja = (nome) => getStore({ name: nome, consistency: 'strong' });
export const json = (dados, status = 200) => Response.json(dados, { status, headers: { 'cache-control': 'no-store' } });
export const hojeBR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

// Chaves VAPID: criadas uma única vez e guardadas no Blobs (a chave privada nunca vai para o repositório).
export async function chavesVapid() {
  const l = loja('alertas-config');
  const v = await l.get('vapid', { type: 'json' });
  if (v?.publica && v?.privada) return v;
  await l.setJSON('vapid', novasChavesVapid());
  return l.get('vapid', { type: 'json' });
}

// Percorre as inscrições e envia a notificação para quem passar no filtro.
// filtro(insc) devolve a notificação, uma lista delas ou null e pode alterar insc (gravado depois).
export async function avisar(filtro) {
  const v = await chavesVapid();
  const l = loja('alertas');
  const { blobs } = await l.list();
  let enviados = 0, removidos = 0, alvos = 0;
  const fila = blobs.map((b) => b.key);
  async function um(chave) {
    const insc = await l.get(chave, { type: 'json' });
    if (!insc?.sub) return;
    const antes = JSON.stringify(insc);
    const lista = [].concat((await filtro(insc)) || []);
    if (lista.length) alvos++;
    for (const dados of lista) {
      const st = await enviarPush(insc.sub, dados, v, { urgencia: dados.urgencia });
      if (st === 404 || st === 410) { await l.delete(chave); removidos++; return; }
      if (st >= 200 && st < 300) enviados++;
    }
    if (JSON.stringify(insc) !== antes) await l.setJSON(chave, insc);
  }
  for (let i = 0; i < fila.length; i += 10) await Promise.all(fila.slice(i, i + 10).map(um));
  return { inscritos: fila.length, alvos, enviados, removidos };
}
