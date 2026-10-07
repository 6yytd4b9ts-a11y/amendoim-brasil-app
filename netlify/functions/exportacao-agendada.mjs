// Mantém os dados de exportação em dia: a cada 15 minutos atualiza a parte mais antiga (uma por vez), se tiver mais de 20 h.
// Cada parte vale por um dia; Comex Stat publica no início do mês e o USDA perto do dia 10.
import { proximaParte } from '../lib/exportacao.mjs';

export default async () => {
  console.log('exportacao', JSON.stringify(await proximaParte()));
};

export const config = { schedule: '*/15 * * * *' };
