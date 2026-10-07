// Coleta automática dos preços oficiais do amendoim em casca.
// IEA-SP: boletim diário (preço recebido pelo produtor por EDR). Conab: média semanal por UF (R$/kg → saca de 25 kg).
import { loja } from './base.mjs';

const IEA = 'http://ciagri.iea.sp.gov.br/precosdiarios/default.aspx';
const CONAB = 'https://portaldeinformacoes.conab.gov.br/downloads/arquivos/PrecosSemanalUF.txt';
const num = (s) => { const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç', acirc: 'â', ecirc: 'ê', ocirc: 'ô' };
const texto = (h) => String(h).replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&(\w+);/g, (m, n) => ENT[n.toLowerCase()] ?? m).replace(/\s+/g, ' ').trim();

async function textoDe(r) {
  const buf = await r.arrayBuffer();
  const cab = (r.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1];
  let t = new TextDecoder(cab || 'utf-8').decode(buf);
  const meta = !cab && t.slice(0, 3000).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  if (meta && !/utf-?8/i.test(meta)) t = new TextDecoder(meta).decode(buf);
  return t;
}

export function lerIEA(html) {
  const data = html.match(/name="[^"]*txtData"[^>]*value="(\d{2}\/\d{2}\/\d{4})"/)?.[1] || html.match(/value="(\d{2}\/\d{2}\/\d{4})"[^>]*txtData/)?.[1] || null;
  const pracas = {};
  for (const [, tr] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const td = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => texto(m[1]));
    if (td.length >= 4 && /^amendoim em casca/i.test(td[0]) && /25 ?kg/i.test(td[3])) {
      const p = num(td[2]);
      if (p && p > 10 && p < 500) pracas[td[1]] = p;
    }
  }
  return { data, pracas };
}

export async function coletarIEA() {
  const r = await fetch(IEA, { signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'Mozilla/5.0 (Amendoim Brasil)' } });
  if (!r.ok) throw new Error('IEA ' + r.status);
  const x = lerIEA(await textoDe(r));
  if (!x.data || !Object.keys(x.pracas).length) throw new Error('IEA sem amendoim no boletim');
  return x;
}

// Lê linhas do arquivo da Conab (ordenado por produto) e para logo depois do amendoim.
export function lerLinhasConab(linhas, acc) {
  for (const l of linhas) {
    const c = l.split(';');
    if (c.length < 11) continue;
    const prod = c[0].trim().toUpperCase();
    if (prod === 'PRODUTO') continue; // cabeçalho
    if (prod.startsWith('AMENDOIM')) {
      acc.viu = true;
      if (c[3].trim() === 'SP' && /PRODUTOR/i.test(c[9])) {
        const [ini, fim] = c[7].split(' - ').map((d) => d.trim());
        const kg = num(c[10]);
        if (kg && fim) acc.semanas.push({ classificacao: c[1].trim(), inicio: ini, fim, kg });
      }
    } else if (acc.viu || (prod > 'AMENDOIM' && /^[A-Z]/.test(prod) && prod[0] !== 'A')) { acc.fim = true; return; }
  }
}

export async function coletarConab() {
  const r = await fetch(CONAB, { signal: AbortSignal.timeout(22000) });
  if (!r.ok || !r.body) throw new Error('Conab ' + r.status);
  const leitor = r.body.getReader(), dec = new TextDecoder('utf-8');
  const acc = { viu: false, fim: false, semanas: [] };
  let resto = '', lidos = 0;
  while (!acc.fim) {
    const { done, value } = await leitor.read();
    if (done) break;
    lidos += value.length;
    const partes = (resto + dec.decode(value, { stream: true })).split('\n');
    resto = partes.pop();
    lerLinhasConab(partes, acc);
    if (lidos > 8e6) break;
  }
  try { await leitor.cancel(); } catch (e) { /* já fechado */ }
  if (!acc.semanas.length) throw new Error('Conab sem amendoim SP');
  const chave = (d) => d.split('-').reverse().join('-'); // dd-mm-aaaa → aaaa-mm-dd
  // Uma linha por semana (se houver mais de uma classificação, fica a de casca).
  const porSemana = {};
  for (const s of acc.semanas) {
    const k = chave(s.fim);
    if (!porSemana[k] || /casca/i.test(s.classificacao)) porSemana[k] = s;
  }
  const semanas = Object.keys(porSemana).sort().slice(-8).map((k) => { const s = porSemana[k]; return { inicio: s.inicio.replace(/-/g, '/'), fim: s.fim.replace(/-/g, '/'), data: k, kg: s.kg, saca: Math.round(s.kg * 25 * 100) / 100, classificacao: s.classificacao }; });
  return { semanas, lidosMB: Math.round(lidos / 1e5) / 10 };
}

// Roda as duas coletas e guarda o resultado (cada fonte que falhar mantém o último valor bom).
export async function coletar() {
  const l = loja('coleta');
  const ant = (await l.get('ultima', { type: 'json' })) || {};
  const [iea, conab] = await Promise.allSettled([coletarIEA(), coletarConab()]);
  const agora = new Date().toISOString();
  const nova = {
    atualizado: agora,
    iea: iea.status === 'fulfilled' ? { ...iea.value, coletado: agora } : { ...(ant.iea || {}), erro: String(iea.reason?.message || iea.reason) },
    conab: conab.status === 'fulfilled' ? { ...conab.value, coletado: agora } : { ...(ant.conab || {}), erro: String(conab.reason?.message || conab.reason) }
  };
  await l.setJSON('ultima', nova);
  return nova;
}
