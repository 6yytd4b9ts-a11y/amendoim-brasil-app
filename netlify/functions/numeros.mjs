// Números do app para o painel do Helder (só com a chave).
// Soma as partes de cada dia; dias antigos são consolidados numa chave só para o painel abrir rápido.
// ?v=2 devolve { dias, extras }; sem v, devolve só os dias (formato antigo da tela #/numeros).
import { getStore } from '@netlify/blobs';
import { chaveOk, loja, json } from '../lib/base.mjs';

const hojeBR = (desloc = 0) => { const d = new Date(Date.now() + desloc * 86400000); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d); };
const somar = (a, b) => { for (const [k, v] of Object.entries(b || {})) a[k] = (a[k] || 0) + v; return a; };

async function emLotes(itens, fn, n = 25) {
  const out = [];
  for (let i = 0; i < itens.length; i += n) out.push(...(await Promise.all(itens.slice(i, i + n).map(fn))));
  return out;
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
  const dias = Math.min(Math.max(Number(q.get('dias')) || 90, 7), 400);
  const m = getStore({ name: 'metricas', consistency: 'strong' });
  const { blobs } = await m.list();
  const corte = hojeBR(-dias);
  const ontem = hojeBR(-1);
  const porDia = {};
  for (const { key } of blobs) {
    const dia = key.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < corte) continue;
    (porDia[dia] = porDia[dia] || []).push(key);
  }
  const saida = {};
  await emLotes(Object.keys(porDia), async (dia) => {
    const chaves = porDia[dia];
    const partes = await Promise.all(chaves.map((k) => m.get(k, { type: 'json' })));
    saida[dia] = partes.reduce((a, b) => somar(a, b), {});
    // Consolida dias que já fecharam (antes de ontem): uma chave por dia.
    if (dia < ontem && chaves.some((k) => k !== dia)) {
      await m.setJSON(dia, saida[dia]);
      await Promise.all(chaves.filter((k) => k !== dia).map((k) => m.delete(k)));
    }
  }, 10);
  if (q.get('v') !== '2') return json(saida);

  // Extras: alertas ativos e fila do balcão.
  const extras = { alertas: 0, alertasAdmin: 0, alertasPorTipo: {}, balcao: { pendentes: 0, aprovados: 0 } };
  try {
    const a = loja('alertas');
    const lista = (await a.list()).blobs;
    const inscs = await emLotes(lista, (b) => a.get(b.key, { type: 'json' }));
    for (const i of inscs) {
      if (!i) continue;
      extras.alertas++;
      if (i.admin) extras.alertasAdmin++;
      for (const [t, v] of Object.entries(i.prefs || {})) if (v && t !== 'local') extras.alertasPorTipo[t] = (extras.alertasPorTipo[t] || 0) + 1;
    }
  } catch (e) { /* segue sem */ }
  try {
    const b = loja('balcao');
    const lista = (await b.list()).blobs;
    const itens = await emLotes(lista, (x) => b.get(x.key, { type: 'json' }));
    for (const i of itens) if (i?.status === 'pendente') extras.balcao.pendentes++; else if (i?.status === 'aprovado') extras.balcao.aprovados++;
  } catch (e) { /* segue sem */ }
  return json({ dias: saida, extras });
};

export const config = { path: '/api/numeros' };
