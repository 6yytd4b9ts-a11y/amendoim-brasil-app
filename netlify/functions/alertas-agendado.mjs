// Roda de meia em meia hora: confere preço do IEA, preço-alvo, boletim novo e (uma vez por dia) chuva forte.
import { rodarAlertas } from '../lib/rotina.mjs';

export default async () => {
  const r = await rodarAlertas({});
  console.log('alertas', JSON.stringify(r));
};

export const config = { schedule: '5,35 * * * *' };
