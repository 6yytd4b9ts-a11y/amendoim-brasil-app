// Histórico diário do mercado (só o Helder, com a chave): GET /api/diario?k=CHAVE&de=2026-10-01&ate=2026-10-31
import { chaveOk, json } from '../lib/base.mjs';
import { lerDiario } from '../lib/diario.mjs';

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
  return json({ dias: await lerDiario(q.get('de'), q.get('ate')) });
};

export const config = { path: '/api/diario' };
