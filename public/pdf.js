// PDF do boletim no padrão Amendoim Brasil: cabeçalho com logo, título, resumo em destaque,
// seções, créditos e link do app em todas as páginas. Usa pdf-lib (carregado só quando precisa).

const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

let carregando = null;
export function carregarPdfLib() {
  if (typeof window !== 'undefined' && window.PDFLib) return Promise.resolve(window.PDFLib);
  if (carregando) return carregando;
  const tenta = (i) => new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = CDN[i];
    s.async = true;
    s.onload = () => (window.PDFLib ? ok(window.PDFLib) : falha(new Error('pdf-lib')));
    s.onerror = () => { s.remove(); falha(new Error('pdf-lib')); };
    document.head.appendChild(s);
  }).catch((e) => (i + 1 < CDN.length ? tenta(i + 1) : Promise.reject(e)));
  carregando = tenta(0).catch((e) => { carregando = null; throw e; });
  return carregando;
}

// Cores da marca
const hex = (PDFLib, h) => PDFLib.rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const COR = { verde: '#007731', verdeEsc: '#005A25', amendoim: '#F4AD46', amendoimFundo: '#FFF4E1', marrom: '#7A4A08', texto: '#1B1B17', texto2: '#45413A', texto3: '#7A756B', linha: '#E4DFD4', azul: '#2F5F8A', azulClaro: '#DCE9F5', verdeClaro: '#DCEFE2', amendoimClaro: '#FCE6C0' };
const COR_SIGLA = { BR: ['verdeClaro', 'verdeEsc'], AR: ['azulClaro', 'azul'], US: ['amendoimClaro', 'marrom'], IN: ['amendoimClaro', 'marrom'], CN: ['amendoimClaro', 'marrom'] };

/**
 * b: boletim { id, tipo, titulo, data, resumo, secoes:[{titulo, texto}] }
 * op: { logo: ArrayBuffer|Uint8Array (PNG), url: link do app, whatsapp: '+55…', siglas: { 'Brasil': 'BR', … } }
 */
export async function gerarPdfBoletim(PDFLib, b, op = {}) {
  const { PDFDocument, StandardFonts, PDFName, PDFString } = PDFLib;
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italico = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = op.logo ? await pdf.embedPng(op.logo) : null;
  const c = Object.fromEntries(Object.entries(COR).map(([k, v]) => [k, hex(PDFLib, v)]));
  const url = op.url || 'https://amendoim-brasil.netlify.app';
  const urlCurta = url.replace(/^https?:\/\//, '');

  const W = 595.28, H = 841.89, M = 54, LARG = W - 2 * M, RODAPE = 74;
  let pagina, y, noTopo = false;

  // Só caracteres que a fonte padrão do PDF consegue desenhar (acentos do português funcionam).
  const cacheOk = new Map();
  const limpa = (txt, f = fonte) => Array.from(String(txt ?? '').replace(/→/g, '->').replace(/≈/g, '~').replace(/ /g, ' ').replace(/[​⁠]/g, ''))
    .map((ch) => {
      if (ch === '\n') return ch;
      if (!cacheOk.has(ch)) { try { f.widthOfTextAtSize(ch, 10); cacheOk.set(ch, true); } catch (e) { cacheOk.set(ch, false); } }
      return cacheOk.get(ch) ? ch : '';
    }).join('');

  const quebra = (txt, f, tam, larg) => {
    const linhas = [];
    for (const par of limpa(txt, f).split('\n')) {
      let atual = '';
      for (const p of par.split(/\s+/).filter(Boolean)) {
        const teste = atual ? atual + ' ' + p : p;
        if (f.widthOfTextAtSize(teste, tam) <= larg) atual = teste;
        else { if (atual) linhas.push(atual); atual = p; }
      }
      linhas.push(atual);
    }
    return linhas;
  };

  const linkEm = (pg, x, y0, w, h, alvo) => {
    const ctx = pdf.context;
    const annot = ctx.register(ctx.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [x, y0, x + w, y0 + h], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(alvo) }
    }));
    const lista = pg.node.lookup(PDFName.of('Annots'));
    if (lista) lista.push(annot); else pg.node.set(PDFName.of('Annots'), ctx.obj([annot]));
  };

  const cabecalho = (primeira) => {
    pagina = pdf.addPage([W, H]);
    const topo = H - M + 10;
    const altLogo = primeira ? 46 : 28;
    if (logo) {
      const esc = altLogo / logo.height;
      pagina.drawImage(logo, { x: M, y: topo - altLogo, width: logo.width * esc, height: altLogo });
    }
    const tipo = limpa((b.tipo || 'Boletim').toUpperCase(), negrito);
    const tamTipo = primeira ? 9.5 : 8;
    pagina.drawText(tipo, { x: W - M - negrito.widthOfTextAtSize(tipo, tamTipo), y: topo - (primeira ? 18 : 12), size: tamTipo, font: negrito, color: c.marrom });
    const data = limpa(b.data || '');
    pagina.drawText(data, { x: W - M - fonte.widthOfTextAtSize(data, 9), y: topo - (primeira ? 32 : 24), size: 9, font: fonte, color: c.texto3 });
    const linhaY = topo - altLogo - 10;
    pagina.drawRectangle({ x: M, y: linhaY, width: LARG, height: 2, color: c.verde });
    y = linhaY - (primeira ? 26 : 22);
    noTopo = !primeira;
  };

  const rodapes = () => {
    const pags = pdf.getPages();
    pags.forEach((pg, i) => {
      const base = 30;
      pg.drawRectangle({ x: M, y: base + 30, width: LARG, height: 0.6, color: c.linha });
      const cred = limpa(`© ${new Date().getFullYear()} Amendoim Brasil · Helder Lamberti · Pode compartilhar citando a fonte.`);
      pg.drawText(cred, { x: M, y: base + 16, size: 8, font: fonte, color: c.texto3 });
      const num = `Página ${i + 1} de ${pags.length}`;
      pg.drawText(num, { x: W - M - fonte.widthOfTextAtSize(num, 8), y: base + 16, size: 8, font: fonte, color: c.texto3 });
      const pre = 'Mercado do amendoim todo dia no app: ';
      pg.drawText(pre, { x: M, y: base + 4, size: 8, font: fonte, color: c.texto3 });
      const xUrl = M + fonte.widthOfTextAtSize(pre, 8);
      pg.drawText(urlCurta, { x: xUrl, y: base + 4, size: 8, font: negrito, color: c.verde });
      linkEm(pg, xUrl, base + 2, negrito.widthOfTextAtSize(urlCurta, 8), 10, url);
      const av = 'Leitura de mercado, não é recomendação de compra ou venda.';
      pg.drawText(limpa(av, italico), { x: W - M - italico.widthOfTextAtSize(limpa(av, italico), 7.5), y: base + 4, size: 7.5, font: italico, color: c.texto3 });
    });
  };

  const espaco = (h) => { if (y - h < RODAPE) cabecalho(false); };

  const paragrafo = (txt, { f = fonte, tam = 10.3, ent = 15, cor = c.texto2, x = M, larg = LARG } = {}) => {
    for (const l of quebra(txt, f, tam, larg)) {
      espaco(ent);
      if (l) pagina.drawText(l, { x, y: y - tam, size: tam, font: f, color: cor });
      y -= ent;
      noTopo = false;
    }
  };

  // ---------- página 1 ----------
  cabecalho(true);

  // Título
  for (const l of quebra(b.titulo || '', negrito, 22, LARG)) {
    espaco(28);
    pagina.drawText(l, { x: M, y: y - 22, size: 22, font: negrito, color: c.texto });
    y -= 28;
  }
  y -= 4;
  pagina.drawText(limpa('Helder Lamberti · Amendoim Brasil'), { x: M, y: y - 10, size: 10, font: negrito, color: c.texto3 });
  y -= 26;

  // Resumo em destaque (caixa amendoim com barra lateral)
  if (b.resumo) {
    const linhas = quebra(b.resumo, negrito, 11.5, LARG - 30);
    const alt = linhas.length * 17 + 22;
    espaco(alt);
    pagina.drawRectangle({ x: M, y: y - alt, width: LARG, height: alt, color: c.amendoimFundo });
    pagina.drawRectangle({ x: M, y: y - alt, width: 4, height: alt, color: c.amendoim });
    let yy = y - 11;
    for (const l of linhas) { pagina.drawText(l, { x: M + 18, y: yy - 11.5, size: 11.5, font: negrito, color: hex(PDFLib, '#4A3A22') }); yy -= 17; }
    y -= alt + 22;
  }

  // Seções
  (b.secoes || []).forEach((s, i) => {
    espaco(70);
    if ((i > 0 || b.resumo) && !noTopo) {
      pagina.drawRectangle({ x: M, y: y + 6, width: LARG, height: 0.6, color: c.linha });
      y -= 12;
    }
    const sigla = (op.siglas || {})[s.titulo];
    let x = M;
    if (sigla) {
      const [fundo, frente] = COR_SIGLA[sigla] || ['verdeClaro', 'verdeEsc'];
      pagina.drawCircle({ x: M + 11, y: y - 8, size: 11, color: c[fundo] });
      const sg = limpa(sigla, negrito);
      pagina.drawText(sg, { x: M + 11 - negrito.widthOfTextAtSize(sg, 8) / 2, y: y - 11, size: 8, font: negrito, color: c[frente] });
      x = M + 30;
    }
    for (const l of quebra(s.titulo || '', negrito, 14, LARG - (x - M))) {
      pagina.drawText(l, { x, y: y - 13, size: 14, font: negrito, color: c.texto });
      y -= 20;
      noTopo = false;
    }
    y -= 6;
    String(s.texto || '').split(/\n\s*\n/).forEach((p, k) => {
      if (k > 0) y -= 6;
      paragrafo(p.replace(/\s*\n\s*/g, ' '));
    });
    y -= 14;
  });

  // Chamada final: app + mercado físico
  const zap = (op.whatsapp || '').replace(/\D/g, '');
  const altCta = zap ? 92 : 74;
  espaco(altCta + 10);
  y -= 4;
  pagina.drawRectangle({ x: M, y: y - altCta, width: LARG, height: altCta, color: c.verde });
  let yc = y - 22;
  pagina.drawText(limpa('Acompanhe o mercado do amendoim todo dia', negrito), { x: M + 18, y: yc, size: 13, font: negrito, color: hex(PDFLib, '#FFFFFF') });
  yc -= 17;
  pagina.drawText(limpa('Preço IEA e Conab, mercado físico, clima e ferramentas no app Amendoim Brasil:'), { x: M + 18, y: yc, size: 9.5, font: fonte, color: hex(PDFLib, '#E3F3E8') });
  yc -= 17;
  pagina.drawText(urlCurta, { x: M + 18, y: yc, size: 12, font: negrito, color: c.amendoim });
  linkEm(pagina, M + 18, yc - 3, negrito.widthOfTextAtSize(urlCurta, 12), 15, url);
  if (zap) {
    yc -= 17;
    const num = zap.replace(/^55(\d{2})(\d+)(\d{4})$/, '($1) $2-$3');
    const t = `Preço do mercado físico: fale com o Helder no WhatsApp ${num}`;
    pagina.drawText(limpa(t), { x: M + 18, y: yc, size: 9.5, font: fonte, color: hex(PDFLib, '#FFFFFF') });
    linkEm(pagina, M + 18, yc - 3, fonte.widthOfTextAtSize(limpa(t), 9.5), 13, `https://wa.me/${zap}?text=${encodeURIComponent('Olá Helder, li o boletim da Amendoim Brasil e quero saber o preço do mercado físico.')}`);
  }
  y -= altCta;

  rodapes();
  pdf.setTitle(limpa(b.titulo || 'Boletim Amendoim Brasil'));
  pdf.setAuthor('Helder Lamberti · Amendoim Brasil');
  pdf.setSubject(limpa(`${b.tipo || 'Boletim'} · ${b.data || ''}`));
  pdf.setCreator('App Amendoim Brasil');
  pdf.setProducer('Amendoim Brasil');
  pdf.setLanguage('pt-BR');
  return pdf.save();
}
