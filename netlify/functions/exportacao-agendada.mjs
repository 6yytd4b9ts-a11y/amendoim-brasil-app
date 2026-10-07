// Atualiza os dados de exportação todo dia às 9h20 de Brasília (Comex Stat sai no início do mês; USDA, perto do dia 10).
import { atualizarExportacao } from '../lib/exportacao.mjs';

export default async () => {
  const d = await atualizarExportacao();
  console.log('exportacao', JSON.stringify({ erros: d.erros, ano: d.brasil?.ano, mes: d.brasil?.mes, psd: d.mundo?.publicado }));
};

export const config = { schedule: '20 12 * * *' };
