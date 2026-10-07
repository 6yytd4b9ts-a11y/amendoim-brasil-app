// ESBOÇO: exportação dos dados do assinante em Excel e PDF (relatório organizado por abas/seções). Sem biblioteca externa.
// Produtor: estimativas e cotações. Empresa: tudo, inclusive preço por destino e chuva nas regiões.
import { conteudo, sessao, assinante, producao, ALQUEIRE_HA } from '/esboco-dados.js';

const nf = (n, d = 0) => (n == null || !isFinite(n) ? '' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const hojeBR = () => new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Excel (.xlsx) feito aqui mesmo, sem biblioteca externa: um zip "armazenado" com os XML do formato ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(arquivos) { // [{nome, texto}] → Blob
  const enc = new TextEncoder(), partes = [], centro = []; let off = 0;
  const u16 = (n) => [n & 255, (n >> 8) & 255], u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const { nome, texto } of arquivos) {
    const nomeB = enc.encode(nome), dados = enc.encode(texto), crc = crc32(dados);
    const cab = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(nomeB.length), ...u16(0), ...nomeB]);
    centro.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(nomeB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off), ...nomeB]));
    partes.push(cab, dados); off += cab.length + dados.length;
  }
  const tamCentro = centro.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(arquivos.length), ...u16(arquivos.length), ...u32(tamCentro), ...u32(off), ...u16(0)]);
  return new Blob([...partes, ...centro, fim], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const colLetra = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function planilha(sec) { // uma aba: título em negrito, cabeçalho com fundo, números como números
  const linhas = [[sec.titulo], [], sec.cab, ...sec.linhas, ...(sec.nota ? [[], [sec.nota]] : [])];
  const cel = (v, r, c, estilo) => { const ref = colLetra(c) + (r + 1); if (v == null || v === '') return ''; if (typeof v === 'number') return `<c r="${ref}" s="${estilo}"><v>${v}</v></c>`; return `<c r="${ref}" t="inlineStr" s="${estilo}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`; };
  const xmlLinhas = linhas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => cel(v, r, c, r === 0 ? 1 : r === 2 ? 2 : typeof v === 'number' && !Number.isInteger(v) ? 3 : 0)).join('')}</row>`).join('');
  const larg = sec.cab.map((_, i) => Math.min(50, Math.max(12, ...[sec.cab[i], ...sec.linhas.map((l) => l[i])].map((v) => String(v ?? '').length + 2))));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${larg.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${xmlLinhas}</sheetData></worksheet>`;
}
function xlsx(secoes) {
  const nomes = secoes.map((s) => s.nome.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  const arquivos = [
    { nome: '[Content_Types].xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${secoes.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { nome: '_rels/.rels', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nome: 'xl/workbook.xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomes.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${secoes.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${secoes.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nome: 'xl/styles.xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF00632A"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F4EB"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FF007731"/></bottom></border></borders><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>` },
    ...secoes.map((s, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, texto: planilha(s) }))
  ];
  return zip(arquivos);
}
function baixarBlob(blob, nome) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}
async function dados() {
  const [cot, clima] = await Promise.all(['cotacoes', 'clima'].map((a) => fetch(`/data/${a}.json`, { cache: 'no-cache' }).then((r) => r.json()).catch(() => ({}))));
  return { cot, clima };
}

// Seções do relatório: cada uma vira uma aba no Excel e um bloco no PDF.
function secoes(empresa, { cot }) {
  const c = conteudo(), s = sessao() || {};
  const out = [];
  const est = c.estimativas.map((e) => { const p = producao(e); return [e.safra, e.areaMin === e.areaMax ? e.areaMin : `${e.areaMin}–${e.areaMax}`, e.prodMin === e.prodMax ? e.prodMin : `${e.prodMin}–${e.prodMax}`, +(p.scMeio / 1e6).toFixed(1), Math.round(p.tMeio / 1000), e.situacao]; });
  out.push({ nome: 'Estimativas', titulo: 'Estimativas Amendoim Brasil · área e produção por safra', cab: ['Safra', 'Área (mil ha)', 'Produtividade (sc/alq)', 'Produção (mi sacas)', 'Produção (mil t casca)', 'Situação'], linhas: est, nota: `Atualizado em ${c.atualizado || hojeBR()} · 1 alqueire = ${ALQUEIRE_HA} ha · saca de 25 kg em casca. ${c.comentario || ''}` });
  const b = c.balanco || {}, ult = c.estimativas[c.estimativas.length - 1], ref = c.estimativas[c.estimativas.length - 2] || ult, pRef = producao(ref);
  const consumoCasca = (b.consumoKgHab * b.populacaoMi) / (b.rendimento / 100), semente = ult.areaMin * b.sementeKgHa / 1000;
  out.push({ nome: 'Balanço', titulo: `Balanço ${ref.safra} por exclusão (mil t em casca)`, cab: ['Item', 'mil t', 'Base'], linhas: [
    ['Produção', Math.round(pRef.tMeio / 1000), `${ref.areaMin}–${ref.areaMax} mil ha × ${ref.prodMin}–${ref.prodMax} sc/alq`],
    ['(−) Consumo interno', Math.round(consumoCasca), `${b.consumoKgHab} kg/hab × ${b.populacaoMi} mi hab · rendimento ${b.rendimento}%`],
    ['(−) Semente', Math.round(semente), `${ult.areaMin} mil ha × ${b.sementeKgHa} kg/ha`],
    ['(−) Exportação de grão e óleo', 'Comex Stat', 'entra sozinho na versão final'],
    ['(=) Sobra para esmagamento e estoque', 'calculado', '']
  ] });
  const refs = (cot.referencias || []).map((r) => [r.fonte, r.praca, r.preco, r.variacao == null ? '' : r.variacao, r.data]);
  out.push({ nome: 'Cotações', titulo: 'Cotações oficiais · amendoim em casca, R$ por saca de 25 kg', cab: ['Fonte', 'Praça', 'R$/sc', 'Variação %', 'Data'], linhas: refs });
  const hist = (cot.historico?.pontos || []).map((p) => [p.data.split('-').reverse().join('/'), p.preco]);
  if (hist.length) out.push({ nome: 'Histórico', titulo: `Histórico de preço · ${cot.historico.fonte || 'Conab'}`, cab: ['Semana', 'R$/sc'], linhas: hist });
  if (empresa) {
    const d = c.destinos || { lista: [] };
    out.push({ nome: 'Preço por destino', titulo: `Preço por destino · amendoim em grão, US$/t · Comex ${d.mes || ''}${d.exemplo ? ' (valores de exemplo)' : ''}`, cab: ['Destino', 'Comex (média do mês)', 'Negociado mín.', 'Negociado máx.', 'Tendência'], linhas: d.lista.map((x) => [x.pais, x.comex, x.min, x.max, x.tend === 'sobe' ? 'subindo' : x.tend === 'cai' ? 'caindo' : 'estável']) });
    const f = c.fisico || { regioes: [] };
    out.push({ nome: 'Mercado físico', titulo: `Mercado físico · faixa de negócio, R$/sc casca${f.exemplo ? ' (valores de exemplo)' : ''}`, cab: ['Região', 'Mínimo', 'Máximo'], linhas: (f.regioes || []).map((r) => [r.nome, r.min, r.max]) });
  }
  out.push({ nome: 'Sobre', titulo: 'Sobre este arquivo', cab: ['Campo', 'Valor'], linhas: [['Assinante', s.nome || ''], ['Plano', empresa ? 'Empresa' : 'Produtor'], ['Gerado em', hojeBR()], ['Fonte', 'Amendoim Brasil · Helder Lamberti'], ['Uso', 'Exclusivo do assinante. Proibido repassar ou publicar sem autorização.']] });
  return out;
}

export async function baixarExcel() {
  const empresa = (sessao() || {}).plano === 'empresa';
  const dd = await dados();
  baixarBlob(xlsx(secoes(empresa, dd)), `amendoim-brasil-${empresa ? 'empresa' : 'produtor'}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function abrirPdf() {
  const empresa = (sessao() || {}).plano === 'empresa';
  const dd = await dados();
  const secs = secoes(empresa, dd);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Amendoim Brasil · relatório ${hojeBR()}</title>
  <style>
    body { font: 13px/1.45 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1B1B17; margin: 0; padding: 28px 32px; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #007731; padding-bottom: 10px; margin-bottom: 18px; }
    header b { font-size: 20px; color: #00632A; } header span { font-size: 12px; color: #5F5B52; }
    h2 { font-size: 15px; margin: 22px 0 8px; color: #00632A; page-break-after: avoid; }
    table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
    th, td { border-bottom: 1px solid #E5E1D6; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #E7F4EB; font-size: 12px; } td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .nota { font-size: 11px; color: #5F5B52; margin-top: 6px; }
    footer { margin-top: 26px; font-size: 11px; color: #5F5B52; border-top: 1px solid #E5E1D6; padding-top: 8px; }
    .btn { display: block; width: 100%; background: #007731; color: #fff; border: 0; border-radius: 14px; padding: 12px 16px; font: inherit; font-size: 15px; font-weight: 800; margin-bottom: 16px; }
    @media print { .btn { display: none; } body { padding: 0; } }
  </style></head><body>
  <button class="btn" onclick="window.print()">Salvar em PDF / imprimir</button>
  <header><div><b>Amendoim Brasil</b><br><span>Relatório do assinante · plano ${empresa ? 'Empresa' : 'Produtor'} · ${hojeBR()}</span></div><span>Helder Lamberti</span></header>
  ${secs.map((s) => `<h2>${esc(s.titulo)}</h2><table><thead><tr>${s.cab.map((c, i) => `<th class="${i ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.linhas.map((l) => `<tr>${l.map((v, i) => `<td class="${i && typeof v === 'number' ? 'num' : ''}">${typeof v === 'number' ? nf(v, Number.isInteger(v) ? 0 : 2) : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${s.nota ? `<div class="nota">${esc(s.nota)}</div>` : ''}`).join('')}
  <footer>Conteúdo exclusivo do assinante da Amendoim Brasil. Proibido repassar ou publicar sem autorização. Estimativas são opinião de mercado, não recomendação de compra ou venda.</footer>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert('Libere pop-ups para abrir o relatório.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

// Cartão "Baixar meus dados" para a área do assinante.
export function cartaoExportar(h) {
  if (!assinante()) return '';
  const empresa = (sessao() || {}).plano === 'empresa';
  return `<section class="cartao es-export">
    <div class="cartao-cab"><span class="rotulo">Levar para a planilha</span><span class="pilula ${empresa ? 'pilula-azul' : 'pilula-verde'}">${empresa ? 'Empresa' : 'Produtor'}</span></div>
    <span class="es-txt">${empresa ? 'Estimativas, balanço, cotações, histórico, preço por destino e mercado físico, cada um numa aba.' : 'Estimativas, balanço, cotações e histórico de preço, cada um numa aba.'}</span>
    <div class="es-botoes">
      <button class="btn btn-verde btn-pequeno" type="button" data-exp="xlsx">${h.ic('<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>', 'style="width:18px;height:18px;stroke:#fff"')}Baixar Excel</button>
      <button class="btn btn-escuro btn-pequeno" type="button" data-exp="pdf">${h.ic(h.I.doc, 'style="width:18px;height:18px;stroke:#fff"')}Relatório em PDF</button>
    </div>
    <span class="mini">Gerado na hora com os dados de hoje. ${empresa ? 'Na versão final, o relatório mensal chega pronto no seu e-mail.' : 'Preço por destino e mercado físico fazem parte do plano Empresa.'}</span>
  </section>`;
}
export function ligarExportar() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-exp]');
    if (!b) return;
    b.disabled = true;
    (b.dataset.exp === 'xlsx' ? baixarExcel() : abrirPdf()).catch(() => alert('Não foi possível gerar agora. Verifique a internet e tente de novo.')).finally(() => { b.disabled = false; });
  });
}
