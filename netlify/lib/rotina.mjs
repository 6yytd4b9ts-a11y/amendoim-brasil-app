// Rotina dos alertas: compara o que está publicado no app com o que já foi avisado e manda as notificações.
import { SITE, loja, avisar, hojeBR } from './base.mjs';

const brl = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',');
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

async function pegar(arq) {
  const r = await fetch(`${SITE}/data/${arq}.json?t=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } });
  if (!r.ok) throw new Error(arq + ' ' + r.status);
  return r.json();
}

// Previsão de chuva dos próximos 3 dias para cada local inscrito (agrupado em ~10 km).
async function previsaoChuva(locais) {
  const res = {};
  const chaves = [...locais.keys()];
  for (let i = 0; i < chaves.length; i += 50) {
    const lote = chaves.slice(i, i + 50);
    const lat = lote.map((k) => k.split(',')[0]).join(','), lon = lote.map((k) => k.split(',')[1]).join(',');
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&forecast_days=3&timezone=America%2FSao_Paulo`);
    if (!r.ok) throw new Error('open-meteo ' + r.status);
    const j = await r.json();
    (Array.isArray(j) ? j : [j]).forEach((x, k) => {
      const mm = x.daily?.precipitation_sum || [], t = x.daily?.time || [];
      let maior = 0, dia = null;
      mm.forEach((v, n) => { if ((v || 0) > maior) { maior = v || 0; dia = t[n]; } });
      const total = mm.reduce((s, v) => s + (v || 0), 0);
      res[lote[k]] = { maior: Math.round(maior), dia, total: Math.round(total) };
    });
  }
  return res;
}

const chaveLocal = (l) => `${(Math.round(l.lat * 10) / 10).toFixed(1)},${(Math.round(l.lon * 10) / 10).toFixed(1)}`;
const diaTxt = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${iso === hojeBR() ? 'hoje' : DIAS[d.getUTCDay()]} (${iso.slice(8, 10)}/${iso.slice(5, 7)})`; };

export async function rodarAlertas({ forcarChuva = false } = {}) {
  const cfg = loja('alertas-config');
  const estado = (await cfg.get('estado', { type: 'json' })) || {};
  const [cot, bol] = await Promise.all([pegar('cotacoes'), pegar('boletins')]);
  const d = cot.destaque || {};
  const preco = Number(d.preco), praca = d.regiao || 'Tupã';
  const b0 = (Array.isArray(bol) ? bol : [])[0];

  const temPreco = isFinite(preco) && preco > 0 && !!d.data;
  const novoPreco = temPreco && !!estado.ieaData && (d.data !== estado.ieaData || preco !== estado.ieaPreco);
  const mudou = novoPreco && isFinite(estado.ieaPreco) && Math.abs(preco - estado.ieaPreco) >= 0.005;
  const novoBoletim = !!b0 && !!estado.boletimId && b0.id !== estado.boletimId;
  const hora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const fazerChuva = forcarChuva || (hora >= 6 && hora < 20 && estado.chuvaDia !== hojeBR());

  let chuva = null;
  if (fazerChuva) {
    const l = loja('alertas');
    const { blobs } = await l.list();
    const locais = new Map();
    for (const b of blobs) {
      const insc = await l.get(b.key, { type: 'json' });
      if (insc?.prefs?.chuva && insc.prefs.local) locais.set(chaveLocal(insc.prefs.local), true);
    }
    try { chuva = locais.size ? await previsaoChuva(locais) : {}; } catch (e) { chuva = null; }
  }

  const saida = { preco: temPreco ? `${d.data} ${preco}` : null, novoPreco, mudou, novoBoletim, chuva: chuva ? Object.keys(chuva).length : (fazerChuva ? 'falhou' : 'nao') };
  if (novoPreco || novoBoletim || chuva) {
    saida.envio = await avisar((insc) => {
      const p = insc.prefs || {}, msgs = [];
      if (novoPreco) {
        if (p.acima) {
          if (preco >= p.acima && insc.avisadoAcima !== p.acima) {
            msgs.push({ titulo: 'Preço-alvo atingido', corpo: `IEA ${praca}: ${brl(preco)} por saca (${d.data.slice(0, 5)}). Seu alvo era acima de ${brl(p.acima)}.`, url: '/#/mercado', tag: 'alvo', urgencia: 'high' });
            insc.avisadoAcima = p.acima;
          } else if (preco < p.acima) insc.avisadoAcima = null;
        }
        if (p.abaixo) {
          if (preco <= p.abaixo && insc.avisadoAbaixo !== p.abaixo) {
            msgs.push({ titulo: 'Preço-alvo atingido', corpo: `IEA ${praca}: ${brl(preco)} por saca (${d.data.slice(0, 5)}). Seu alvo era abaixo de ${brl(p.abaixo)}.`, url: '/#/mercado', tag: 'alvo', urgencia: 'high' });
            insc.avisadoAbaixo = p.abaixo;
          } else if (preco > p.abaixo) insc.avisadoAbaixo = null;
        }
        if (mudou && p.mudanca && !msgs.length) {
          const dif = preco - estado.ieaPreco;
          msgs.push({ titulo: `Amendoim em casca ${dif > 0 ? 'subiu' : 'caiu'}`, corpo: `IEA ${praca}: ${brl(preco)} por saca (${dif > 0 ? '+' : '−'}${brl(Math.abs(dif))} vs ${brl(estado.ieaPreco)}).`, url: '/#/inicio', tag: 'preco' });
        }
      }
      if (novoBoletim && p.boletim) msgs.push({ titulo: 'Novo boletim Amendoim Brasil', corpo: b0.titulo, url: b0.secoes?.length ? '/#/boletim/' + encodeURIComponent(b0.id) : '/#/mercado/analises', tag: 'boletim' });
      if (chuva && p.chuva && p.local) {
        const c = chuva[chaveLocal(p.local)];
        if (c && c.dia && (c.maior >= 30 || c.total >= 50) && insc.chuvaAvisada !== c.dia) {
          msgs.push({ titulo: 'Chuva forte prevista', corpo: `${c.maior} mm ${diaTxt(c.dia)}${p.local.nome ? ' ' + p.local.nome : ' na sua lavoura'}, ${c.total} mm nos próximos 3 dias. Planeje plantio, pulverização e arranquio.`, url: '/#/clima', tag: 'chuva', urgencia: 'high' });
          insc.chuvaAvisada = c.dia;
        }
      }
      return msgs;
    });
  }

  if (temPreco) { estado.ieaData = d.data; estado.ieaPreco = preco; }
  if (b0) estado.boletimId = b0.id;
  if (fazerChuva && chuva) estado.chuvaDia = hojeBR();
  await cfg.setJSON('estado', estado);
  return saida;
}
