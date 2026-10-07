// Bandeiras dos países produtores, desenhadas em SVG (aparecem iguais em qualquer celular).
const estrela = (cx, cy, r, rot = -90) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const ang = ((rot + i * 36) * Math.PI) / 180, raio = i % 2 ? r * 0.4 : r;
    p.push(`${(cx + raio * Math.cos(ang)).toFixed(1)},${(cy + raio * Math.sin(ang)).toFixed(1)}`);
  }
  return p.join(' ');
};

const DESENHO = {
  BR: `<rect width="60" height="60" fill="#009C3B"/><polygon points="30,9 55,30 30,51 5,30" fill="#FFDF00"/><circle cx="30" cy="30" r="11" fill="#002776"/><path d="M19.4 28.2c7-2.2 14.5-1.2 21.2 3" stroke="#fff" stroke-width="2.2" fill="none"/>`,
  AR: `<rect width="60" height="60" fill="#74ACDF"/><rect y="20" width="60" height="20" fill="#fff"/><circle cx="30" cy="30" r="5.5" fill="#F6B40E"/>`,
  US: `<rect width="60" height="60" fill="#fff"/>${[0, 2, 4, 6].map((k) => `<rect y="${(k * 60) / 7}" width="60" height="${60 / 7}" fill="#B22234"/>`).join('')}<rect width="30" height="${(4 * 60) / 7}" fill="#3C3B6E"/>${[[7, 7], [15, 7], [23, 7], [11, 14], [19, 14], [7, 21], [15, 21], [23, 21], [11, 28], [19, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`).join('')}`,
  IN: `<rect width="60" height="60" fill="#fff"/><rect width="60" height="20" fill="#FF9933"/><rect y="40" width="60" height="20" fill="#138808"/><circle cx="30" cy="30" r="6.5" fill="none" stroke="#000080" stroke-width="1.6"/><circle cx="30" cy="30" r="1.6" fill="#000080"/>`,
  CN: `<rect width="60" height="60" fill="#DE2910"/><polygon points="${estrela(19, 21, 9)}" fill="#FFDE00"/>${[[33, 11, -60], [38, 17, -75], [38, 25, -100], [33, 31, -115]].map(([x, y, r]) => `<polygon points="${estrela(x, y, 3, r)}" fill="#FFDE00"/>`).join('')}`
};

export const NOME_CURTO = { BR: 'Brasil', AR: 'Argentina', US: 'EUA', IN: 'Índia', CN: 'China' };

// Bandeira redonda; se o país não estiver na lista, mostra a sigla num círculo.
export function bandeira(sigla, tam = 36) {
  const d = DESENHO[sigla];
  if (!d) return `<span class="bandeira bandeira-sigla" style="width:${tam}px;height:${tam}px">${String(sigla || '').slice(0, 2)}</span>`;
  return `<span class="bandeira" style="width:${tam}px;height:${tam}px" role="img" aria-label="Bandeira ${NOME_CURTO[sigla] || sigla}"><svg viewBox="0 0 60 60" width="${tam}" height="${tam}" aria-hidden="true">${d}</svg></span>`;
}
