// Diagnóstico temporário: testa se o Netlify alcança as fontes de exportação. Será apagado.
import { inflateRawSync } from 'node:zlib';
import { chaveOk, json } from '../lib/base.mjs';

// Lê um .zip na memória e devolve as entradas { nome, dados() }.
function entradasZip(buf) {
  let fim = buf.length - 22;
  while (fim >= 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim--;
  const total = buf.readUInt16LE(fim + 10), inicioCd = buf.readUInt32LE(fim + 16);
  const lista = [];
  let p = inicioCd;
  for (let i = 0; i < total; i++) {
    const metodo = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20), tamNome = buf.readUInt16LE(p + 28), tamExtra = buf.readUInt16LE(p + 30), tamCom = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + tamNome);
    lista.push({ nome, comp, metodo, dados: () => { const n = buf.readUInt16LE(loc + 26), x = buf.readUInt16LE(loc + 28); const ini = loc + 30 + n + x; const bruto = buf.subarray(ini, ini + comp); return metodo === 8 ? inflateRawSync(bruto) : bruto; } });
    p += 46 + tamNome + tamExtra + tamCom;
  }
  return lista;
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!chaveOk(q.get('k'))) return json({ erro: 'chave' }, 401);
  const t0 = Date.now(), out = {};
  try {
    const r = await fetch('https://apps.fas.usda.gov/psdonline/downloads/psd_oilseeds_csv.zip', { signal: AbortSignal.timeout(20000) });
    const buf = Buffer.from(await r.arrayBuffer());
    out.zipBytes = buf.length; out.msDownload = Date.now() - t0;
    const ents = entradasZip(buf);
    out.entradas = ents.map((e) => [e.nome, e.comp]);
    const csv = ents[0].dados().toString('utf8');
    out.csvBytes = csv.length; out.msUnzip = Date.now() - t0;
    const linhas = csv.split('\n');
    out.cabecalho = linhas[0];
    const amend = linhas.filter((l) => /Peanut/.test(l));
    out.linhasAmendoim = amend.length;
    out.commodities = [...new Set(amend.map((l) => l.split(',')[1]))];
    out.exemplo = amend.filter((l) => /,"?Brazil"?,/.test(l) && /2025/.test(l)).slice(0, 40);
    out.msTotal = Date.now() - t0;
  } catch (e) { out.erro = String(e); out.ms = Date.now() - t0; }
  return json(out);
};

export const config = { path: '/api/teste-fontes' };
