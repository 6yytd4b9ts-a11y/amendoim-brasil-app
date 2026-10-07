// Diagnóstico temporário: as fontes de preço (IEA e Conab) respondem a partir do Netlify?
import { json, chaveOk } from '../lib/base.mjs';

async function testar(url, opc = {}) {
  const t = Date.now();
  try {
    const r = await fetch(url, { ...opc, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    const corpo = opc.method === 'HEAD' ? '' : await r.text();
    return { url, status: r.status, ms: Date.now() - t, tipo: r.headers.get('content-type'), tamanho: r.headers.get('content-length'), intervalo: r.headers.get('content-range'), final: r.url, inicio: corpo.slice(0, Number(opc.mostrar || 4000)) };
  } catch (e) { return { url, erro: String(e?.cause?.code || e?.message || e), ms: Date.now() - t }; }
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
  const alvo = q.get('u');
  if (alvo && /^https?:\/\/[^/]*(iea\.sp\.gov\.br|conab\.gov\.br)\//.test(alvo)) return json(await testar(alvo, { mostrar: q.get('n') || 12000, headers: q.get('r') ? { Range: 'bytes=' + q.get('r') } : {} }));
  return json(await Promise.all([
    testar('http://ciagri.iea.sp.gov.br/precosdiarios/', { mostrar: 6000 }),
    testar('https://portaldeinformacoes.conab.gov.br/downloads/arquivos/PrecosSemanalUF.txt', { headers: { Range: 'bytes=0-1500' }, mostrar: 1500 })
  ]));
};

export const config = { path: '/api/diag' };
