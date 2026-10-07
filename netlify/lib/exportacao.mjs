// Dados de exportação para a área da consultoria.
// Brasil: Comex Stat (MDIC), mês a mês, por destino e com preço médio (US$/t).
// Mundo: USDA PSD (balanço anual de amendoim em casca: produção, exportação, importação, esmagamento e estoques).
import { inflateRawSync } from 'node:zlib';
import { loja } from './base.mjs';

const COMEX = 'https://api-comexstat.mdic.gov.br/general?language=pt';
const PSD_ZIP = 'https://apps.fas.usda.gov/psdonline/downloads/psd_oilseeds_csv.zip';
const PRODUTOS = { grao: '1202', oleo: '1508' }; // 1202 = amendoim (em casca e descascado); 1508 = óleo de amendoim
const PAISES_PSD = { BR: 'Brasil', AR: 'Argentina', US: 'EUA', IN: 'Índia', CH: 'China' };
const ATRIBUTOS = {
  'Area Harvested': 'area', Production: 'producao', 'MY Exports': 'exportacao', Exports: 'exportacao', 'MY Imports': 'importacao', Imports: 'importacao',
  Crush: 'esmagamento', 'Food Use Dom. Cons.': 'alimentacao', 'Feed Waste Dom. Cons.': 'outros', 'Total Dom. Cons.': 'consumo',
  'Beginning Stocks': 'estoqueInicial', 'Ending Stocks': 'estoqueFinal'
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// A API do Comex Stat limita pedidos seguidos (429): tenta de novo com intervalo.
async function comex(corpo) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    if (tentativa) await espera(4000 * tentativa);
    const r = await fetch(COMEX, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ flow: 'export', metrics: ['metricFOB', 'metricKG'], ...corpo }), signal: AbortSignal.timeout(15000) });
    if (r.status === 429) continue;
    if (!r.ok) throw new Error('comex ' + r.status);
    const j = await r.json();
    return j?.data?.list || [];
  }
  throw new Error('comex 429');
}
const t = (kg) => Math.round(Number(kg || 0) / 1000); // kg → toneladas
const produtoDe = (l) => (/1508|óleo|oleo/i.test(Object.values(l).join('|')) ? 'oleo' : 'grao');

export async function coletarBrasil() {
  const upd = await fetch('https://api-comexstat.mdic.gov.br/general/dates/updated', { signal: AbortSignal.timeout(10000) }).then((r) => r.json()).catch(() => null);
  const ano = Number(upd?.data?.year) || new Date().getFullYear();
  const mes = Number(upd?.data?.monthNumber) || 12;
  const filtro = [{ filter: 'heading', values: Object.values(PRODUTOS) }];

  // 1) Série mensal dos últimos 5 anos (toneladas e US$ FOB), grão e óleo num pedido só.
  await espera(1500);
  const mensal = await comex({ monthDetail: true, period: { from: `${ano - 4}-01`, to: `${ano}-12` }, filters: filtro, details: ['heading'] });
  const series = { grao: {}, oleo: {} };
  for (const l of mensal) {
    const s = series[produtoDe(l)];
    const a = (s[l.year] = s[l.year] || { t: Array(12).fill(null), usd: Array(12).fill(null) });
    const m = Number(l.monthNumber) - 1;
    a.t[m] = (a.t[m] || 0) + t(l.metricKG);
    a.usd[m] = (a.usd[m] || 0) + Number(l.metricFOB || 0);
  }

  // 2) Destinos: este ano e o mesmo período do ano passado, por mês (para comparar só os meses já publicados).
  await espera(3000);
  const porPais = await comex({ monthDetail: true, period: { from: `${ano - 1}-01`, to: `${ano}-${String(mes).padStart(2, '0')}` }, filters: filtro, details: ['heading', 'country'] });
  const soma = {};
  for (const l of porPais) {
    if (Number(l.monthNumber) > mes) continue;
    const chave = `${produtoDe(l)}|${l.year}|${l.country}`;
    const x = (soma[chave] = soma[chave] || { t: 0, usd: 0 });
    x.t += Number(l.metricKG || 0) / 1000; x.usd += Number(l.metricFOB || 0);
  }
  const lista = (prod, a) => Object.entries(soma).filter(([k]) => k.startsWith(`${prod}|${a}|`)).map(([k, v]) => ({ pais: k.split('|')[2], t: Math.round(v.t), usd: v.usd })).filter((x) => x.t > 0).sort((p, q) => q.t - p.t);
  const atual = lista('grao', ano), anterior = Object.fromEntries(lista('grao', ano - 1).map((d) => [d.pais, d]));
  const totalT = atual.reduce((s, d) => s + d.t, 0) || 1;
  const destinosGrao = atual.map((d) => ({
    pais: d.pais, t: d.t, part: +((d.t / totalT) * 100).toFixed(1), preco: d.t ? Math.round(d.usd / d.t) : null,
    tAnt: anterior[d.pais]?.t ?? 0, precoAnt: anterior[d.pais]?.t ? Math.round(anterior[d.pais].usd / anterior[d.pais].t) : null
  }));
  const oleo = lista('oleo', ano), totalOleo = oleo.reduce((s, d) => s + d.t, 0) || 1;
  return {
    fonte: 'Comex Stat/MDIC', atualizadoFonte: upd?.data?.updated || null, ano, mes, series, destinosGrao,
    destinosOleo: oleo.slice(0, 8).map((d) => ({ pais: d.pais, t: d.t, part: +((d.t / totalOleo) * 100).toFixed(1), preco: d.t ? Math.round(d.usd / d.t) : null }))
  };
}

// ---------- USDA PSD ----------
function entradasZip(buf) {
  let fim = buf.length - 22;
  while (fim >= 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error('zip');
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const lista = [];
  for (let i = 0; i < total; i++) {
    const metodo = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20), tamNome = buf.readUInt16LE(p + 28), tamExtra = buf.readUInt16LE(p + 30), tamCom = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + tamNome);
    lista.push({ nome, dados: () => { const ini = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28); const bruto = buf.subarray(ini, ini + comp); return metodo === 8 ? inflateRawSync(bruto) : bruto; } });
    p += 46 + tamNome + tamExtra + tamCom;
  }
  return lista;
}

// Divide uma linha de CSV respeitando aspas.
function campos(linha) {
  const out = []; let cur = '', aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') aspas = !aspas;
    else if (c === ',' && !aspas) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur.replace(/\r$/, ''));
  return out;
}

// Lê o CSV do PSD e monta o balanço do amendoim (em casca) por país e ano-safra.
export function lerPSD(csv, anosAtras = 4) {
  const linhas = csv.split('\n');
  const cab = campos(linhas[0]);
  const ix = (n) => cab.indexOf(n);
  const iCod = ix('Commodity_Code'), iPais = ix('Country_Code'), iNome = ix('Country_Name'), iAno = ix('Market_Year'), iAttr = ix('Attribute_Description'), iVal = ix('Value'), iMes = ix('Month'), iCal = ix('Calendar_Year');
  const paises = {}, mundo = {};
  let maiorAno = 0, publicado = '';
  for (let k = 1; k < linhas.length; k++) {
    const l = linhas[k];
    if (!l.startsWith('2221000,')) continue; // Oilseed, Peanut
    const c = campos(l);
    const campo = ATRIBUTOS[c[iAttr]];
    if (!campo) continue;
    const ano = Number(c[iAno]), v = Number(c[iVal]);
    if (ano > maiorAno) maiorAno = ano;
    const pub = `${c[iCal]}-${String(c[iMes]).padStart(2, '0')}`;
    if (pub > publicado) publicado = pub;
    const m = (mundo[ano] = mundo[ano] || {});
    m[campo] = (m[campo] || 0) + v;
    const cod = c[iPais];
    if (PAISES_PSD[cod]) {
      const p = (paises[cod] = paises[cod] || { nome: PAISES_PSD[cod], nomeUSDA: c[iNome], anos: {} });
      (p.anos[ano] = p.anos[ano] || {})[campo] = v;
    }
  }
  const anos = Array.from({ length: anosAtras }, (_, i) => maiorAno - anosAtras + 1 + i);
  const corta = (obj) => Object.fromEntries(anos.filter((a) => obj[a]).map((a) => [a, obj[a]]));
  for (const p of Object.values(paises)) p.anos = corta(p.anos);
  return { fonte: 'USDA PSD (Oilseed, Peanut · mil t em casca)', publicado, anos, paises, mundo: corta(mundo) };
}

export async function coletarMundo() {
  const r = await fetch(PSD_ZIP, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('psd ' + r.status);
  const ents = entradasZip(Buffer.from(await r.arrayBuffer()));
  const csv = ents.find((e) => /\.csv$/i.test(e.nome)) || ents[0];
  return lerPSD(csv.dados().toString('utf8'));
}

// Atualiza o que der; se uma fonte falhar, mantém o último dado bom dela.
export async function atualizarExportacao() {
  const l = loja('exportacao');
  const antigo = (await l.get('dados', { type: 'json' })) || {};
  const novo = { ...antigo, atualizado: new Date().toISOString(), erros: {} };
  try { novo.brasil = await coletarBrasil(); } catch (e) { novo.erros.brasil = String(e.message || e); }
  try { novo.mundo = await coletarMundo(); } catch (e) { novo.erros.mundo = String(e.message || e); }
  await l.setJSON('dados', novo);
  return novo;
}
