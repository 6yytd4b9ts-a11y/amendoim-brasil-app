// Coleta os preços oficiais nos dias úteis: 7h10 (antes da rotina das 7h45), 11h10 e 16h10 de Brasília.
import { coletar } from '../lib/coleta.mjs';

export default async () => {
  const r = await coletar();
  console.log('coleta', JSON.stringify({ iea: r.iea?.data, pracas: r.iea?.pracas, ieaErro: r.iea?.erro, conab: r.conab?.semanas?.slice(-1), conabErro: r.conab?.erro }));
};

export const config = { schedule: '10 10,14,19 * * 1-5' };
