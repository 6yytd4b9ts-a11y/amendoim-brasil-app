// Inscrição dos alertas no celular.
// GET → chave pública VAPID. POST {acao: salvar | remover | teste | rodar}.
import { chavesVapid, loja, idDe, json, chaveOk } from '../lib/base.mjs';
import { endpointValido, enviarPush } from '../lib/push.mjs';
import { rodarAlertas } from '../lib/rotina.mjs';

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

  const sub = b.sub || {};
  if (!endpointValido(sub.endpoint)) return json({ erro: 'inscricao' }, 400);
  const id = idDe(sub.endpoint);

  if (b.acao === 'remover') { await l.delete(id); return json({ ok: true }); }

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
