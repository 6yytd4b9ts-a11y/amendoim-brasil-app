// Balcão de ofertas: o produtor anuncia, o Helder aprova e só então o anúncio aparece no app.
// O nome e o WhatsApp de quem anunciou nunca são publicados: ficam só para o Helder.
import { loja, json, chaveOk, idDe, avisar, hojeBR } from '../lib/base.mjs';

const LADOS = ['Venda', 'Compra'];
const CATEGORIAS = { Casca: 'Amendoim em casca', Debulhado: 'Amendoim debulhado', Blancheado: 'Amendoim blancheado', Semente: 'Semente de amendoim' };
const VALIDADE_DIAS = 45;
const txt = (v, max) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

async function todos() {
  const l = loja('balcao');
  const { blobs } = await l.list();
  const itens = await Promise.all(blobs.map((b) => l.get(b.key, { type: 'json' })));
  return itens.filter(Boolean).sort((a, b) => (a.criado < b.criado ? 1 : -1));
}
const vivo = (a) => a.status === 'aprovado' && Date.now() - new Date(a.aprovado).getTime() < VALIDADE_DIAS * 86400000;
const publico = (a) => ({ id: a.id, data: a.aprovado || a.criado, ...a.publico });

export default async (req, context) => {
  if (req.method === 'GET') return json({ anuncios: (await todos()).filter(vivo).map(publico) });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  let b = {};
  try { b = JSON.parse(await req.text()) || {}; } catch (e) { return json({ erro: 'corpo' }, 400); }
  const l = loja('balcao');

  if (b.acao === 'novo') {
    if (b.site) return json({ ok: true }); // campo invisível: robô
    const lado = LADOS.includes(b.lado) ? b.lado : null;
    const categoria = CATEGORIAS[b.categoria] ? b.categoria : null;
    const volume = txt(b.volume, 40), regiao = txt(b.regiao, 60), nome = txt(b.nome, 60);
    const whatsapp = String(b.whatsapp || '').replace(/\D/g, '').slice(0, 13);
    if (!lado || !categoria || !volume || !regiao || !nome || whatsapp.length < 10 || !b.aceite) return json({ erro: 'campos' }, 400);
    const limite = loja('balcao-limite'), chaveIp = `${hojeBR()}-${idDe(context?.ip || 'x')}`;
    const n = Number(await limite.get(chaveIp)) || 0;
    if (n >= 5) return json({ erro: 'limite' }, 429);
    await limite.set(chaveIp, String(n + 1));
    const pendentes = (await todos()).filter((a) => a.status === 'pendente').length;
    if (pendentes >= 100) return json({ erro: 'lotado' }, 429);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const anuncio = {
      id, status: 'pendente', criado: new Date().toISOString(), aprovado: null,
      publico: { lado, categoria, produto: CATEGORIAS[categoria], volume, preco: txt(b.preco, 30) || 'A combinar', entrega: txt(b.entrega, 30) || 'A combinar', regiao, detalhe: txt(b.detalhe, 200) },
      contato: { nome, whatsapp }
    };
    await l.setJSON(id, anuncio);
    try {
      await avisar((insc) => (insc.admin ? { titulo: 'Novo anúncio no balcão', corpo: `${lado === 'Venda' ? 'VENDA' : 'COMPRA'} · ${CATEGORIAS[categoria]} · ${volume} · ${regiao}. Toque para aprovar.`, url: '/painel#balcao', tag: 'balcao-admin', urgencia: 'high' } : null));
    } catch (e) { /* o aviso nunca impede o anúncio */ }
    return json({ ok: true, id });
  }

  if (!chaveOk(b.k)) return json({ erro: 'chave' }, 401);
  if (b.acao === 'admin') return json({ anuncios: await todos() });
  const a = b.id ? await l.get(String(b.id), { type: 'json' }) : null;
  if (!a) return json({ erro: 'anuncio' }, 404);
  if (b.acao === 'aprovar') {
    const novo = a.status !== 'aprovado';
    a.status = 'aprovado';
    a.aprovado = new Date().toISOString();
    await l.setJSON(a.id, a);
    if (novo) {
      const x = a.publico;
      try { await avisar((insc) => (insc.prefs?.balcao ? { titulo: 'Nova oferta no balcão', corpo: `${x.lado === 'Venda' ? 'VENDA' : 'COMPRA'} · ${x.produto} · ${x.volume} · ${x.regiao}`, url: '/#/negociar', tag: 'balcao' } : null)); } catch (e) { /* segue */ }
    }
    return json({ ok: true });
  }
  if (b.acao === 'recusar' || b.acao === 'remover') { await l.delete(a.id); return json({ ok: true }); }
  return json({ erro: 'acao' }, 400);
};

export const config = { path: '/api/balcao' };
