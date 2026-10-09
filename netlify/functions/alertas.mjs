// Inscrição dos alertas no celular.
// GET → chave pública VAPID. POST {acao: salvar | remover | teste | rodar}.
import { createHash } from 'node:crypto';
import { chavesVapid, loja, idDe, json, chaveOk, avisar } from '../lib/base.mjs';
import { endpointValido, enviarPush } from '../lib/push.mjs';
import { rodarAlertas } from '../lib/rotina.mjs';

// Segredo do servidor de login (Supabase): só ele pode mandar o aviso "alguém pediu o código" para os celulares do painel.
const AVISO_SHA256 = '7a6c07d08b98b68b491b3ac043c633cd04103d2f0c5c0c5f6de294e63fd77f9d';
const PREFS_VAZIAS = { mudanca: false, acima: null, abaixo: null, chuva: false, local: null, boletim: false, balcao: false };
const numero = (v) => { const n = Number(v); return isFinite(n) && n > 0 && n < 1000 ? Math.round(n * 100) / 100 : null; };
const coord = (v, lim) => { const n = Number(v); return isFinite(n) && Math.abs(n) <= lim ? +n.toFixed(2) : null; };

export default async (req) => {
  if (req.method === 'GET') return json({ chave: (await chavesVapid()).publica });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  let b = {};
  try { b = JSON.parse(await req.text()) || {}; } catch (e) { return json({ erro: 'corpo' }, 400); }
  const l = loja('alertas');

  if (b.acao === 'rodar') { // disparo manual da rotina (só com a chave do Helder)
    if (!chaveOk(b.k)) return json({ erro: 'chave' }, 401);
    return json(await rodarAlertas({ forcarChuva: !!b.chuva }));
  }

  if (b.acao === 'painel_aviso') { // vem do servidor de login quando alguém pede o código
    if (createHash('sha256').update(String(b.segredo || '')).digest('hex') !== AVISO_SHA256) return json({ erro: 'segredo' }, 401);
    const dados = { titulo: String(b.titulo || 'Painel Amendoim Brasil').slice(0, 80), corpo: String(b.corpo || '').slice(0, 200), tag: String(b.tag || 'painel').slice(0, 40), url: '/painel', urgencia: 'high' };
    return json(await avisar((insc) => (insc.painel ? dados : null)));
  }

  const sub = b.sub || {};
  if (!endpointValido(sub.endpoint)) return json({ erro: 'inscricao' }, 400);
  const id = idDe(sub.endpoint);

  if (String(b.acao || '').startsWith('painel_')) { // avisos do painel (só com a chave do Helder)
    if (!chaveOk(b.k)) return json({ erro: 'chave' }, 401);
    const antigo = (await l.get(id, { type: 'json' })) || null;
    if (b.acao === 'painel_estado') return json({ ok: true, ligado: !!antigo?.painel });
    if (b.acao === 'painel_ligar') {
      if (!sub.keys?.p256dh || !sub.keys?.auth || String(sub.keys.p256dh).length > 200 || String(sub.keys.auth).length > 60) return json({ erro: 'inscricao' }, 400);
      const agora = new Date().toISOString();
      await l.setJSON(id, { prefs: PREFS_VAZIAS, ...(antigo || {}), sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, admin: true, painel: true, criado: antigo?.criado || agora, atualizado: agora });
      return json({ ok: true });
    }
    if (b.acao === 'painel_desligar') {
      if (antigo) {
        const p = antigo.prefs || {};
        const outros = p.mudanca || p.acima != null || p.abaixo != null || p.chuva || p.boletim || p.balcao;
        if (outros) await l.setJSON(id, { ...antigo, painel: false, atualizado: new Date().toISOString() }); else await l.delete(id);
      }
      return json({ ok: true });
    }
    if (b.acao === 'painel_teste') {
      if (!antigo?.painel) return json({ erro: 'nao-inscrito' }, 404);
      const st = await enviarPush(antigo.sub, { titulo: 'Avisos do painel ligados', corpo: 'Tudo certo: quando alguém pedir o código do teste, você recebe aqui.', tag: 'painel-teste', url: '/painel' }, await chavesVapid(), { urgencia: 'high' });
      return json({ ok: st >= 200 && st < 300, status: st });
    }
    return json({ erro: 'acao' }, 400);
  }

  if (b.acao === 'remover') { // desligar os alertas do app não pode desligar os avisos do painel no mesmo celular
    const antigo = await l.get(id, { type: 'json' });
    if (antigo?.painel) await l.setJSON(id, { ...antigo, prefs: PREFS_VAZIAS, atualizado: new Date().toISOString() });
    else await l.delete(id);
    return json({ ok: true });
  }

  if (b.acao === 'teste') {
    const insc = await l.get(id, { type: 'json' });
    if (!insc) return json({ erro: 'nao-inscrito' }, 404);
    const st = await enviarPush(insc.sub, { titulo: 'Alertas ativados', corpo: 'Tudo certo: este celular vai receber os avisos do Amendoim Brasil.', url: '/#/alertas' }, await chavesVapid(), { urgencia: 'high' });
    return json({ ok: st >= 200 && st < 300, status: st });
  }

  if (b.acao === 'salvar') {
    if (!sub.keys?.p256dh || !sub.keys?.auth || String(sub.keys.p256dh).length > 200 || String(sub.keys.auth).length > 60) return json({ erro: 'inscricao' }, 400);
    const p = b.prefs || {};
    const antigo = (await l.get(id, { type: 'json' })) || {};
    const lat = coord(p.local?.lat, 90), lon = coord(p.local?.lon, 180);
    const prefs = {
      mudanca: !!p.mudanca,
      acima: numero(p.acima),
      abaixo: numero(p.abaixo),
      chuva: !!p.chuva && lat != null && lon != null,
      local: lat != null && lon != null ? { lat, lon, nome: String(p.local?.nome || '').slice(0, 60) } : null,
      boletim: !!p.boletim,
      balcao: !!p.balcao
    };
    const insc = {
      sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      prefs,
      admin: antigo.admin || chaveOk(b.k),
      ...(antigo.painel ? { painel: true } : {}), // mantém os avisos do painel deste celular
      criado: antigo.criado || new Date().toISOString(),
      atualizado: new Date().toISOString(),
      // o aviso de preço-alvo dispara uma vez por alvo; ao trocar o alvo, volta a valer
      avisadoAcima: antigo.prefs?.acima === prefs.acima ? antigo.avisadoAcima : null,
      avisadoAbaixo: antigo.prefs?.abaixo === prefs.abaixo ? antigo.avisadoAbaixo : null
    };
    await l.setJSON(id, insc);
    return json({ ok: true, admin: insc.admin });
  }
  return json({ erro: 'acao' }, 400);
};

export const config = { path: '/api/alertas' };
