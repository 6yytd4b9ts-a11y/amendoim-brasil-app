// Mapa de chuva (v19): enquadra a região produtora, mostra os milímetros em cada ponto sem sobrepor,
// põe a sigla dos estados e deixa tocar num ponto para ver a cidade. A lista repetida saiu: as cidades ficam nas setas por estado.
import { UFS, projetar } from '/esboco-mapa.js';

const PROD = ['SP', 'MG', 'MS', 'MT', 'PR', 'GO'];
const cor = (mm) => (mm >= 40 ? '#1F4E78' : mm >= 20 ? '#2F6FA3' : mm >= 5 ? '#7FAED6' : mm >= 1 ? '#B9D3E8' : '#D9D3C4');

// centro de cada estado produtor (caixa dos pontos do desenho)
const CENTRO = {};
PROD.forEach((uf) => {
  const nums = (UFS[uf] || '').match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i + 1 < nums.length; i += 2) { const x = +nums[i], y = +nums[i + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  CENTRO[uf] = [(x0 + x1) / 2, (y0 + y1) / 2];
});

function estilo() {
  if (typeof document === 'undefined' || document.getElementById('mc2-css')) return;
  const st = Object.assign(document.createElement('style'), { id: 'mc2-css' });
  st.textContent = `.es-mapa .mc-ponto{cursor:pointer}
  .es-mapa .mc-ponto.sel{stroke:#1B1B17;stroke-width:1.6}
  .es-mapa .mc-uf-t{font-weight:800;fill:#7C9A80;opacity:.75;text-anchor:middle;pointer-events:none;letter-spacing:.04em}
  .es-mapa .mc-cap{text-align:center;font-size:14px;font-weight:700;color:#3E3B33;min-height:22px;padding:6px 8px 2px}
  .es-mapa .mc-cap b{color:#1B1B17}`;
  document.head.appendChild(st);
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const p = e.target.closest?.('.es-mapa .mc-ponto');
    if (!p) return;
    const mapa = p.closest('.es-mapa');
    mapa.querySelectorAll('.mc-ponto.sel').forEach((c) => c.classList.remove('sel'));
    p.classList.add('sel');
    const cap = mapa.querySelector('.mc-cap');
    if (cap) cap.innerHTML = `<b></b> · <span></span>`, cap.querySelector('b').textContent = p.dataset.nome, cap.querySelector('span').textContent = `${p.dataset.mm} mm nos últimos 7 dias`;
  });
}

export function mapaChuva2(regs, esc, numBr) {
  estilo();
  const pts = regs.map((r) => { const [x, y] = projetar(r.lat, r.lon); return { r, x, y, mm: r.choveu7 || 0 }; }).sort((p, q) => q.mm - p.mm);
  // enquadramento: caixa dos pontos com folga, na proporção do mapa antigo (300 x 255)
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs) - 32, x1 = Math.max(...xs) + 32, y0 = Math.min(...ys) - 26, y1 = Math.max(...ys) + 26;
  let w = x1 - x0, h = y1 - y0;
  const ASP = 300 / 255;
  if (w / h < ASP) { const nw = h * ASP; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ASP; y0 -= (nh - h) / 2; h = nh; }
  if (w > 330) { x0 = 60; y0 = 95; w = 300; h = 255; }
  const k = w / 300; // unidades do desenho por "unidade antiga": mantém pontos e letras do mesmo tamanho na tela
  pts.forEach((p) => { p.rr = (2.6 + Math.min(2.6, Math.sqrt(p.mm) * 0.4)) * k; });

  const fonteMm = 9 * k, fonteUf = 9.5 * k;
  const caixas = pts.map((p) => ({ x0: p.x - p.rr, x1: p.x + p.rr, y0: p.y - p.rr, y1: p.y + p.rr }));
  const ufs = PROD.filter((uf) => CENTRO[uf] && CENTRO[uf][0] > x0 + 6 * k && CENTRO[uf][0] < x0 + w - 6 * k && CENTRO[uf][1] > y0 + 6 * k && CENTRO[uf][1] < y0 + h - 6 * k);
  const bate = (c) => caixas.some((o) => c.x0 < o.x1 && c.x1 > o.x0 && c.y0 < o.y1 && c.y1 > o.y0);
  const rotulos = pts.map((p) => {
    const t = numBr(p.mm) + ' mm', wt = (t.length * 5.2 + 2) * k, ht = 10 * k;
    const lados = [[p.rr + 2 * k, 0, 'start'], [-p.rr - 2 * k, 0, 'end'], [0, -p.rr - 5 * k, 'middle'], [0, p.rr + 11 * k, 'middle'], [p.rr + 2 * k, -9 * k, 'start'], [p.rr + 2 * k, 10 * k, 'start'], [-p.rr - 2 * k, -9 * k, 'end'], [-p.rr - 2 * k, 10 * k, 'end'], [p.rr + 2 * k, -18 * k, 'start'], [-p.rr - 2 * k, 19 * k, 'end']];
    for (const [dx, dy, an] of lados) {
      const x = p.x + dx, y = p.y + dy + 3 * k;
      const c = { x0: an === 'start' ? x : an === 'end' ? x - wt : x - wt / 2, y0: y - ht + 2 * k, y1: y + 2 * k };
      c.x1 = c.x0 + wt;
      if (c.x0 < x0 || c.x1 > x0 + w || c.y0 < y0 || c.y1 > y0 + h) continue;
      if (!bate(c)) { caixas.push(c); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="mc-mm" text-anchor="${an}" style="font-size:${fonteMm.toFixed(2)}px;stroke-width:${(2.5 * k).toFixed(2)}px">${t}</text>`; }
    }
    return '';
  }).join('');
  const siglas = ufs.map((uf) => `<text x="${CENTRO[uf][0].toFixed(1)}" y="${(CENTRO[uf][1] + 3 * k).toFixed(1)}" class="mc-uf-t" style="font-size:${fonteUf.toFixed(2)}px">${uf}</text>`).join('');
  const estados = Object.entries(UFS).map(([uf, d]) => `<path d="${d}" class="${PROD.includes(uf) ? 'mc-uf-prod' : 'mc-uf-n'}" style="stroke-width:${(1.2 * k).toFixed(2)}px"/>`).join('');
  const pontos = pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.rr.toFixed(1)}" fill="${cor(p.mm)}" class="mc-ponto" data-nome="${esc(p.r.nome)}" data-mm="${esc(numBr(p.mm))}" style="stroke-width:${(1.2 * k).toFixed(2)}px"><title>${esc(p.r.nome)}: ${numBr(p.mm)} mm</title></circle>`).join('');
  return `<div class="es-mapa"><svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" role="img" aria-label="Mapa com a chuva dos últimos 7 dias nas regiões produtoras">${estados}${siglas}${pontos}${rotulos}</svg>
    <div class="mc-cap" role="status">Toque num ponto para ver a cidade</div>
    <div class="es-mapa-leg"><span><i style="background:#D9D3C4"></i>seco</span><span><i style="background:#B9D3E8"></i>1–5 mm</span><span><i style="background:#7FAED6"></i>5–20</span><span><i style="background:#2F6FA3"></i>20–40</span><span><i style="background:#1F4E78"></i>40+</span></div>
    <span class="mini" style="text-align:center">Chuva dos últimos 7 dias, em mm · as cidades estão nas setas por estado, logo abaixo</span></div>`;
}
