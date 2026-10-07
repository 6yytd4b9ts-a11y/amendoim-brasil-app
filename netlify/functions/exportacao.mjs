// Área da consultoria: dados de exportação (Brasil e mundo). Só abre com o código dos clientes.
// POST { codigo } → dados. GET ?k=CHAVE_DO_HELDER&atualizar=mensal|destinos|mundo → busca essa parte de novo (&bruto=1 mostra tudo).
import { createHash } from 'node:crypto';
import { loja, json, chaveOk, idDe, hojeBR } from '../lib/base.mjs';
import { atualizarParte, lerExportacao } from '../lib/exportacao.mjs';

// Código dos clientes da consultoria (guardado só como resumo SHA-256). Para trocar, gere o novo resumo.
const CODIGO_SHA256 = 'bfda4d8c75ec43f513af152b3ca2efae0d65b624be8be6c9722eadc3f41d4967';
const codigoOk = (c) => createHash('sha256').update(String(c || '').trim()).digest('hex') === CODIGO_SHA256;
const MAX_TENTATIVAS = 15; // por aparelho/rede por dia

export default async (req, context) => {
  if (req.method === 'GET') {
    const q = new URL(req.url).searchParams;
    if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
    const parte = q.get('atualizar');
    if (parte) return json({ parte, ...(await atualizarParte(parte)) });
    const d = await lerExportacao();
    if (q.get('bruto')) return json(d);
    return json({ atualizado: d.atualizado, partes: d.partes, brasil: d.brasil ? { ano: d.brasil.ano, mes: d.brasil.mes, fonte: d.brasil.atualizadoFonte, destinos: d.brasil.destinosGrao.length } : null, mundo: d.mundo ? { anos: d.mundo.anos, publicado: d.mundo.publicado, paises: Object.keys(d.mundo.paises || {}) } : null });
  }
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  let b = {};
  try { b = JSON.parse(await req.text()) || {}; } catch (e) { return json({ erro: 'corpo' }, 400); }
  const limite = loja('exportacao-limite'), chave = `${hojeBR()}-${idDe(context?.ip || 'x')}`;
  const n = Number(await limite.get(chave)) || 0;
  if (n >= MAX_TENTATIVAS) return json({ erro: 'limite' }, 429);
  if (!codigoOk(b.codigo)) { await limite.set(chave, String(n + 1)); return json({ erro: 'codigo' }, 401); }
  return json(await lerExportacao());
};

export const config = { path: '/api/exportacao' };
