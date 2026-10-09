// Amendoim Brasil · login por celular (código no WhatsApp) · sessão Supabase Auth · fase de teste (piloto)
// Autenticação própria: o JWT é validado aqui dentro (verify_jwt desligado de propósito: estado/pedir/verificar são públicos).
// As ações admin_* aceitam o administrador logado OU a chave do painel (a mesma do painel do app; aqui só o hash é conferido).
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const db = createClient(SB_URL, SERVICE, opts);
const anon = () => createClient(SB_URL, ANON, opts);

// mesmo hash que protege o painel no Netlify (netlify/lib/base.mjs)
const CHAVE_PAINEL_SHA256 = "7db2b7a3227d1023b6f566ec1c0aac8b9b5896dd40cfb497f4e70ef82cf6b830";

const ORIGEM_PADRAO = "https://amendoim-brasil.netlify.app";
function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const ok = o === ORIGEM_PADRAO || /^https:\/\/[a-z0-9-]+--amendoim-brasil\.netlify\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return {
    "Access-Control-Allow-Origin": ok ? o : ORIGEM_PADRAO,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
const resp = (req: Request, status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// ---------- utilidades ----------
function normaliza(bruto: unknown): string | null {
  let d = String(bruto ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d; // DDD + número, sem o 55
  if (d.startsWith("55") && (d.length < 12 || d.length > 13)) return null;
  if (d.length < 10 || d.length > 15) return null;
  return d;
}
async function sha256(txt: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const hashCodigo = (cel: string, cod: string) => sha256(`${cel}:${cod}:${SERVICE}`);
function novoCodigo() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}
const vigente = (c: any) => c && c.ativo && (!c.expira_em || new Date(c.expira_em) > new Date());
const emailDe = (cel: string) => `${cel}@celular.amendoimbrasil.app`;
const contaOut = (c: any, piloto: boolean) => ({
  nome: c.nome, empresa: c.empresa ?? "", final: c.celular.slice(-4), plano: c.plano, papel: c.papel,
  expira_em: c.expira_em, perfil_ok: !!c.perfil_ok, piloto,
});

async function cfg(): Promise<Record<string, string>> {
  const { data } = await db.from("config").select("chave,valor");
  const o: Record<string, string> = {};
  (data ?? []).forEach((r: any) => (o[r.chave] = r.valor));
  return o;
}
const pilotoDe = (c: Record<string, string>) => (c.piloto ?? "off") === "on";

// ---------- envio pelo WhatsApp (plugável) ----------
async function enviarWhatsApp(cel: string, codigo: string): Promise<{ canal: string; enviado: boolean; erro?: string }> {
  const c = await cfg();
  const prov = c.whatsapp_provedor || "manual";
  const texto = `*Amendoim Brasil*\nSeu código de acesso: *${codigo}*\nVale por 10 minutos. Não compartilhe com ninguém.`;
  try {
    if (prov === "zapi" && c.zapi_instancia && c.zapi_token) {
      const r = await fetch(`https://api.z-api.io/instances/${c.zapi_instancia}/token/${c.zapi_token}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(c.zapi_client_token ? { "Client-Token": c.zapi_client_token } : {}) },
        body: JSON.stringify({ phone: cel, message: texto }),
      });
      if (!r.ok) return { canal: prov, enviado: false, erro: `zapi ${r.status}` };
      return { canal: prov, enviado: true };
    }
    if (prov === "meta" && c.meta_phone_id && c.meta_token && c.meta_template) {
      const r = await fetch(`https://graph.facebook.com/v21.0/${c.meta_phone_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.meta_token}` },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: cel, type: "template",
          template: {
            name: c.meta_template, language: { code: "pt_BR" },
            components: [
              { type: "body", parameters: [{ type: "text", text: codigo }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] },
            ],
          },
        }),
      });
      if (!r.ok) return { canal: prov, enviado: false, erro: `meta ${r.status}` };
      return { canal: prov, enviado: true };
    }
  } catch (e) {
    return { canal: prov, enviado: false, erro: String((e as Error).message ?? e).slice(0, 120) };
  }
  return { canal: "manual", enviado: false };
}

// ---------- aviso no celular do administrador (Web Push, enviado pela função da Netlify) ----------
async function avisarPainel(titulo: string, corpo: string, tag: string) {
  try {
    const c = await cfg();
    if (!c.aviso_segredo) return;
    const r = await fetch(`${ORIGEM_PADRAO}/api/alertas`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "painel_aviso", segredo: c.aviso_segredo, titulo, corpo, tag, url: "/painel" }),
      signal: AbortSignal.timeout(8000),
    });
    const j: any = await r.json().catch(() => ({}));
    // fica registrado se o aviso chegou a algum celular do painel (o painel mostra o último)
    await registra(null, "aviso_painel", r.ok ? `celulares=${j.alvos ?? "?"} entregues=${j.enviados ?? 0} expirados=${j.removidos ?? 0}` : `erro=${r.status}`);
  } catch (e) {
    console.error("aviso painel", String((e as Error).message ?? e).slice(0, 120));
    await registra(null, "aviso_painel", `erro=${String((e as Error).message ?? e).slice(0, 80)}`).catch(() => {});
  }
}

// ---------- sessão ----------
async function usuarioDe(req: Request) {
  const tk = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tk) return null;
  const { data, error } = await db.auth.getUser(tk);
  if (error || !data?.user) return null;
  const { data: p } = await db.from("perfis").select("user_id, ultimo_acesso, convidados(*)").eq("user_id", data.user.id).maybeSingle();
  const conv = (p as any)?.convidados;
  if (!conv) return null;
  return { user: data.user, perfil: p as any, conv, tk };
}
async function registra(user_id: string | null, evento: string, detalhe?: string) {
  await db.from("acessos").insert({ user_id, evento, detalhe: detalhe?.slice(0, 200) ?? null });
}

// ---------- ações públicas ----------
async function estado(req: Request) {
  return resp(req, 200, { ok: true, piloto: pilotoDe(await cfg()) });
}

async function pedir(req: Request, b: any) {
  const cel = normaliza(b.celular);
  if (!cel) return resp(req, 200, { ok: false, motivo: "numero_invalido", mensagem: "Confira o número: DDD + celular." });
  const { data: conv } = await db.from("convidados").select("*").eq("celular", cel).maybeSingle();
  if (!vigente(conv)) {
    await registra(null, "pedir_negado", cel.slice(-4));
    return resp(req, 200, { ok: false, motivo: "nao_autorizado", mensagem: "Este número ainda não tem acesso. Peça a liberação ao Helder." });
  }
  const desde1h = new Date(Date.now() - 3600_000).toISOString();
  const { data: ult } = await db.from("codigos_login").select("criado_em").eq("celular", cel).gte("criado_em", desde1h).order("criado_em", { ascending: false });
  if ((ult?.length ?? 0) >= 5) return resp(req, 429, { ok: false, motivo: "limite", mensagem: "Muitas tentativas. Tente de novo em uma hora." });
  if (ult?.[0]) {
    const seg = 30 - Math.floor((Date.now() - new Date(ult[0].criado_em).getTime()) / 1000);
    if (seg > 0) return resp(req, 429, { ok: false, motivo: "aguarde", segundos: seg, mensagem: `Aguarde ${seg}s para pedir outro código.` });
  }
  const codigo = novoCodigo();
  const { data: ins, error } = await db.from("codigos_login").insert({
    celular: cel, codigo_hash: await hashCodigo(cel, codigo), expira_em: new Date(Date.now() + 10 * 60_000).toISOString(),
  }).select("id").single();
  if (error || !ins) return resp(req, 500, { ok: false, motivo: "erro", mensagem: "Não foi possível gerar o código agora." });
  const env = await enviarWhatsApp(cel, codigo);
  await db.from("codigos_login").update({ canal: env.canal, enviado: env.enviado, erro_envio: env.erro ?? null, codigo_manual: env.enviado ? null : codigo }).eq("id", ins.id);
  await registra(null, "pedir", `${env.canal}${env.enviado ? "" : " (manual)"} ${cel.slice(-4)}`);
  const aviso = avisarPainel(
    "Pedido de acesso ao teste",
    env.enviado ? `${conv.nome} pediu o código. Ele já foi enviado pelo WhatsApp.` : `${conv.nome} pediu o código. Toque para abrir o painel e repassar.`,
    `pedido-${cel.slice(-6)}`,
  );
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(aviso); else await aviso;
  return resp(req, 200, {
    ok: true, canal: env.canal, enviado: env.enviado,
    mensagem: env.enviado ? "Enviamos um código de 6 dígitos para o seu WhatsApp." : "Peça o seu código de 6 dígitos ao Helder (ele recebe o pedido agora).",
  });
}

async function verificar(req: Request, b: any) {
  const cel = normaliza(b.celular);
  const codigo = String(b.codigo ?? "").replace(/\D/g, "");
  if (!cel || codigo.length !== 6) return resp(req, 200, { ok: false, motivo: "dados", mensagem: "Digite o número e o código de 6 dígitos." });
  const { data: cod } = await db.from("codigos_login").select("*").eq("celular", cel).eq("usado", false).gt("expira_em", new Date().toISOString()).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (!cod || cod.tentativas >= 5) return resp(req, 200, { ok: false, motivo: "expirado", mensagem: "Código vencido ou inválido. Peça um novo." });
  if (cod.codigo_hash !== (await hashCodigo(cel, codigo))) {
    await db.from("codigos_login").update({ tentativas: cod.tentativas + 1 }).eq("id", cod.id);
    await registra(null, "codigo_errado", cel.slice(-4));
    return resp(req, 200, { ok: false, motivo: "errado", mensagem: "Código incorreto." });
  }
  await db.from("codigos_login").update({ usado: true, codigo_manual: null }).eq("id", cod.id);
  const { data: conv } = await db.from("convidados").select("*").eq("celular", cel).maybeSingle();
  if (!vigente(conv)) return resp(req, 200, { ok: false, motivo: "nao_autorizado", mensagem: "Este número não tem acesso ativo." });

  const email = emailDe(cel);
  await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nome: conv.nome, celular: cel } }); // se já existe, o erro é ignorado
  const { data: link, error: e1 } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (e1 || !link?.properties?.hashed_token || !link.user) return resp(req, 500, { ok: false, motivo: "erro", mensagem: "Não foi possível abrir a sessão agora." });
  await db.from("perfis").upsert({ user_id: link.user.id, convidado_id: conv.id, ultimo_acesso: new Date().toISOString() }, { onConflict: "user_id" });
  const { data: sess, error: e2 } = await anon().auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (e2 || !sess?.session) return resp(req, 500, { ok: false, motivo: "erro", mensagem: "Não foi possível abrir a sessão agora." });
  await registra(link.user.id, "entrou");
  const s = sess.session;
  return resp(req, 200, { ok: true, sessao: { access_token: s.access_token, refresh_token: s.refresh_token, expira: s.expires_at }, conta: contaOut(conv, pilotoDe(await cfg())) });
}

async function renovar(req: Request, b: any) {
  const rt = String(b.refresh_token ?? "");
  if (!rt) return resp(req, 400, { ok: false, motivo: "dados" });
  const { data, error } = await anon().auth.refreshSession({ refresh_token: rt });
  if (error || !data?.session || !data.user) return resp(req, 401, { ok: false, motivo: "sessao_invalida" });
  const { data: p } = await db.from("perfis").select("convidados(*)").eq("user_id", data.user.id).maybeSingle();
  const conv = (p as any)?.convidados;
  if (!vigente(conv)) {
    await db.auth.admin.signOut(data.session.access_token, "global").catch(() => {});
    return resp(req, 403, { ok: false, motivo: "revogado", mensagem: "Seu acesso foi encerrado." });
  }
  const s = data.session;
  return resp(req, 200, { ok: true, sessao: { access_token: s.access_token, refresh_token: s.refresh_token, expira: s.expires_at }, conta: contaOut(conv, pilotoDe(await cfg())) });
}

// ---------- ações do convidado logado ----------
async function conta(req: Request) {
  const u = await usuarioDe(req);
  if (!u) return resp(req, 401, { ok: false, motivo: "sessao_invalida" });
  if (!vigente(u.conv)) return resp(req, 403, { ok: false, motivo: "revogado", mensagem: "Seu acesso foi encerrado." });
  const ult = u.perfil.ultimo_acesso ? new Date(u.perfil.ultimo_acesso).getTime() : 0;
  if (Date.now() - ult > 600_000) await db.from("perfis").update({ ultimo_acesso: new Date().toISOString() }).eq("user_id", u.user.id);
  return resp(req, 200, { ok: true, conta: contaOut(u.conv, pilotoDe(await cfg())) });
}

async function perfil(req: Request, b: any) {
  const u = await usuarioDe(req);
  if (!u || !vigente(u.conv)) return resp(req, 401, { ok: false, motivo: "sessao_invalida" });
  const nome = String(b.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const empresa = String(b.empresa ?? "").trim().slice(0, 80);
  if (nome.length < 3 || !nome.includes(" ")) return resp(req, 200, { ok: false, mensagem: "Digite o nome e o sobrenome." });
  const { data, error } = await db.from("convidados").update({ nome, empresa: empresa || null, perfil_ok: true, atualizado_em: new Date().toISOString() }).eq("id", u.conv.id).select("*").single();
  if (error || !data) return resp(req, 500, { ok: false, mensagem: "Não foi possível salvar agora." });
  return resp(req, 200, { ok: true, conta: contaOut(data, pilotoDe(await cfg())) });
}

// "l=Presidente Prudente/SP|g=1|a=1|i=1|d=iphone" -> objeto para o painel
function lerConfig(r: any) {
  if (!r?.detalhe) return null;
  const m: Record<string, string> = {};
  String(r.detalhe).split("|").forEach((p) => { const i = p.indexOf("="); if (i > 0) m[p.slice(0, i)] = p.slice(i + 1); });
  return { local: m.l || "", gps: m.g === "1", avisos: m.a === "1", app: m.i === "1", aparelho: m.d || "", em: r.criado_em };
}

async function evento(req: Request, b: any) {
  const u = await usuarioDe(req);
  if (!u || !vigente(u.conv)) return resp(req, 401, { ok: false, motivo: "sessao_invalida" });
  if (u.conv.papel === "admin") return resp(req, 200, { ok: true }); // o uso do administrador não conta
  if (!pilotoDe(await cfg())) return resp(req, 200, { ok: true });
  const itens = Array.isArray(b.itens) ? b.itens.slice(0, 60) : [];
  const agora = Date.now();
  const linhas = itens.map((i: any) => ({
    user_id: u.user.id, tipo: String(i?.t ?? ""), detalhe: String(i?.d ?? "").slice(0, 120) || null,
    criado_em: new Date(Math.min(agora, Math.max(agora - 86_400_000, Number(i?.ts) || agora))).toISOString(),
  })).filter((l: any) => ["abriu", "tela", "clique", "beat", "config"].includes(l.tipo));
  if (linhas.length) await db.from("uso").insert(linhas);
  return resp(req, 200, { ok: true });
}

const TAGS = ["confuso", "faltou", "ideia", "gostei"];
const MIMES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/aac", "audio/x-m4a", "audio/wav"];
async function feedback(req: Request, b: any) {
  const u = await usuarioDe(req);
  if (!u || !vigente(u.conv)) return resp(req, 401, { ok: false, motivo: "sessao_invalida" });
  const desde = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).gte("criado_em", desde);
  if ((count ?? 0) >= 20) return resp(req, 429, { ok: false, mensagem: "Muitos envios seguidos. Tente de novo daqui a pouco." });
  const texto = String(b.texto ?? "").trim().slice(0, 1000);
  const tag = TAGS.includes(b.tag) ? b.tag : null;
  let audio_path: string | null = null, audio_seg: number | null = null;
  if (b.audio && typeof b.audio.base64 === "string") {
    const mime = String(b.audio.mime ?? "").split(";")[0].trim().toLowerCase();
    if (!MIMES.includes(mime)) return resp(req, 200, { ok: false, mensagem: "Este aparelho gravou num formato que o app não aceita. Escreva a opinião." });
    if (b.audio.base64.length > 4_200_000) return resp(req, 200, { ok: false, mensagem: "Áudio muito longo. Grave até 2 minutos." });
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(b.audio.base64), (c) => c.charCodeAt(0)); } catch { return resp(req, 200, { ok: false, mensagem: "Áudio inválido. Grave de novo." }); }
    if (bytes.length < 800) return resp(req, 200, { ok: false, mensagem: "Áudio muito curto. Grave de novo." });
    if (bytes.length > 3_000_000) return resp(req, 200, { ok: false, mensagem: "Áudio muito longo. Grave até 2 minutos." });
    const ext = mime.split("/")[1].replace("x-m4a", "m4a").replace("mpeg", "mp3");
    const path = `${u.user.id}/${Date.now()}.${ext}`;
    const { error } = await db.storage.from("feedback-audio").upload(path, bytes, { contentType: mime, upsert: false });
    if (error) { console.error("audio", error.message); return resp(req, 500, { ok: false, mensagem: "Não foi possível guardar o áudio agora. Tente de novo." }); }
    audio_path = path;
    audio_seg = Math.min(130, Math.max(1, Math.round(Number(b.audio.seg) || 0)));
  }
  if (texto.length < 2 && !audio_path) return resp(req, 200, { ok: false, mensagem: "Escreva ou grave a sua opinião." });
  await db.from("feedback").insert({ user_id: u.user.id, texto, tela: String(b.tela ?? "").slice(0, 120) || null, tag, audio_path, audio_seg });
  return resp(req, 200, { ok: true });
}

async function sair(req: Request) {
  const u = await usuarioDe(req);
  if (u) { await db.auth.admin.signOut(u.tk, "global").catch(() => {}); await registra(u.user.id, "saiu"); }
  return resp(req, 200, { ok: true });
}

// ---------- administração (administrador logado OU chave do painel) ----------
const ranking = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const somar = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const diaBR = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

// Confere a chave do painel. Devolve uma resposta de erro, ou null se a chave está certa.
async function conferirChave(req: Request, chave: string): Promise<Response | null> {
  const ip = (req.headers.get("x-forwarded-for") ?? "?").split(",")[0].trim();
  const marca = (await sha256("ip:" + ip)).slice(0, 16);
  const desde = new Date(Date.now() - 600_000).toISOString();
  const { count } = await db.from("acessos").select("id", { count: "exact", head: true }).eq("evento", "chave_errada").eq("detalhe", marca).gte("criado_em", desde);
  if ((count ?? 0) >= 10) return resp(req, 429, { ok: false, motivo: "limite", mensagem: "Muitas tentativas. Aguarde alguns minutos." });
  if ((await sha256(chave)) === CHAVE_PAINEL_SHA256) return null;
  await registra(null, "chave_errada", marca);
  return resp(req, 401, { ok: false, motivo: "chave", mensagem: "Chave incorreta." });
}

async function admin(req: Request, b: any) {
  let uid: string | null = null;
  if (typeof b.chave === "string" && b.chave) {
    const erro = await conferirChave(req, b.chave);
    if (erro) return erro;
  } else {
    const u = await usuarioDe(req);
    if (!u || !vigente(u.conv)) return resp(req, 401, { ok: false, motivo: "sessao_invalida" });
    if (u.conv.papel !== "admin") return resp(req, 403, { ok: false, motivo: "proibido" });
    uid = u.user.id;
  }
  const acao = b.acao;
  if (acao === "admin_listar") {
    const { data: convs } = await db.from("convidados").select("*, perfis(ultimo_acesso)").order("criado_em", { ascending: true });
    const { data: pend } = await db.from("codigos_login").select("celular, codigo_manual, criado_em, expira_em").eq("usado", false).not("codigo_manual", "is", null).gt("expira_em", new Date().toISOString()).order("criado_em", { ascending: false });
    const c = await cfg();
    const nomes: Record<string, string> = {};
    (convs ?? []).forEach((x: any) => (nomes[x.celular] = x.nome));
    const { data: peds } = await db.from("codigos_login").select("celular, criado_em").order("criado_em", { ascending: false }).limit(500);
    const ultPedido: Record<string, string> = {};
    (peds ?? []).forEach((x: any) => { if (!ultPedido[x.celular]) ultPedido[x.celular] = x.criado_em; });
    const { data: av } = await db.from("acessos").select("detalhe, criado_em").eq("evento", "aviso_painel").order("criado_em", { ascending: false }).limit(1).maybeSingle();
    return resp(req, 200, {
      ok: true,
      piloto: pilotoDe(c),
      ultimoAviso: av ?? null,
      convidados: (convs ?? []).map((x: any) => ({ ...x, ultimo_acesso: x.perfis?.[0]?.ultimo_acesso ?? x.perfis?.ultimo_acesso ?? null, entrou: Array.isArray(x.perfis) ? x.perfis.length > 0 : !!x.perfis, ultimo_pedido: ultPedido[x.celular] ?? null, perfis: undefined })),
      codigos: (pend ?? []).map((x: any) => ({ celular: x.celular, nome: nomes[x.celular] ?? "", codigo: x.codigo_manual, criado_em: x.criado_em, expira_em: x.expira_em })),
      whatsapp: { provedor: c.whatsapp_provedor || "manual" },
    });
  }
  if (acao === "admin_salvar") {
    const cel = normaliza(b.celular);
    const nome = String(b.nome ?? "").trim().slice(0, 80);
    if (!cel || !nome) return resp(req, 400, { ok: false, mensagem: "Nome e celular são obrigatórios." });
    const plano = b.plano === "produtor" ? "produtor" : "empresa";
    const papel = b.papel === "admin" ? "admin" : "usuario";
    const reg = {
      celular: cel, nome, plano, papel, ativo: b.ativo !== false,
      expira_em: b.expira_em ? new Date(b.expira_em).toISOString() : null,
      observacao: b.observacao ? String(b.observacao).slice(0, 200) : null, atualizado_em: new Date().toISOString(),
    };
    const { error } = await db.from("convidados").upsert(reg, { onConflict: "celular" }); // desativar encerra as sessões (gatilho no banco)
    if (error) return resp(req, 500, { ok: false, mensagem: "Não foi possível salvar." });
    await registra(uid, "admin_salvar", `${cel.slice(-4)} ${plano} ${reg.ativo ? "ativo" : "inativo"}`);
    return resp(req, 200, { ok: true });
  }
  if (acao === "admin_whatsapp") {
    const prov = ["manual", "zapi", "meta"].includes(b.provedor) ? b.provedor : "manual";
    const campos: Record<string, unknown> = { whatsapp_provedor: prov, zapi_instancia: b.zapi_instancia, zapi_token: b.zapi_token, zapi_client_token: b.zapi_client_token, meta_phone_id: b.meta_phone_id, meta_token: b.meta_token, meta_template: b.meta_template };
    for (const [k, v] of Object.entries(campos)) {
      if (typeof v === "string" && v.trim()) await db.from("config").upsert({ chave: k, valor: v.trim(), atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
    }
    await registra(uid, "admin_whatsapp", prov);
    return resp(req, 200, { ok: true });
  }
  if (acao === "admin_piloto") {
    const ligado = b.ligado === true;
    await db.from("config").upsert({ chave: "piloto", valor: ligado ? "on" : "off", atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
    await registra(uid, "admin_piloto", ligado ? "ligado" : "desligado");
    return resp(req, 200, { ok: true, piloto: ligado });
  }
  if (acao === "admin_uso") {
    const { data: convs } = await db.from("convidados").select("id, nome, empresa, celular, plano, ativo, perfil_ok, perfis(user_id, ultimo_acesso)").neq("papel", "admin").order("criado_em", { ascending: true });
    const pf = (c: any) => (Array.isArray(c.perfis) ? c.perfis[0] : c.perfis) ?? null;
    const lista = (convs ?? []).map((c: any) => ({ c, uid: pf(c)?.user_id as string | undefined, ult: pf(c)?.ultimo_acesso ?? null }));
    const ids = lista.map((x) => x.uid).filter(Boolean) as string[];
    const desde = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data: rows } = ids.length
      ? await db.from("uso").select("user_id, tipo, detalhe, criado_em").in("user_id", ids).gte("criado_em", desde).order("criado_em", { ascending: false }).limit(20000)
      : { data: [] as any[] };
    const { data: fb } = ids.length
      ? await db.from("feedback").select("id, user_id, texto, tela, tag, audio_path, audio_seg, criado_em").in("user_id", ids).order("criado_em", { ascending: false }).limit(50)
      : { data: [] as any[] };
    const hoje = diaBR(new Date().toISOString());
    const dias14: string[] = [];
    for (let i = 13; i >= 0; i--) dias14.push(diaBR(new Date(Date.now() - i * 86_400_000).toISOString()));
    const BEAT = 30; // cada batida vale 30 segundos de uso
    type Tela = { v: number; s: number };
    const telaDe = (m: Map<string, Tela>, k: string) => { let t = m.get(k); if (!t) { t = { v: 0, s: 0 }; m.set(k, t); } return t; };
    const rankTelas = (m: Map<string, Tela>, n: number) => [...m.entries()].map(([t, x]) => ({ t, v: x.v, s: x.s })).sort((a, b) => b.s - a.s || b.v - a.v).slice(0, n);
    const telasGlobal = new Map<string, number>(), cliquesGlobal = new Map<string, number>();
    const telasDetGlobal = new Map<string, Tela>();
    const diaGlobal = new Map<string, { a: number; s: number }>();
    const dia = (m: Map<string, { a: number; s: number }>, d: string) => { let x = m.get(d); if (!x) { x = { a: 0, s: 0 }; m.set(d, x); } return x; };
    const convidados = lista.map(({ c, uid, ult }) => {
      const meus = (rows ?? []).filter((r: any) => r.user_id === uid);
      const dias = new Set<string>(), telas = new Map<string, number>(), cliques = new Map<string, number>();
      const telasDet = new Map<string, Tela>(), porDia = new Map<string, { a: number; s: number }>();
      let sessoes = 0, beats = 0, beats7 = 0;
      let cfgRow: any = null; // a configuração mais recente do celular (localização, avisos, tela inicial)
      const sete = Date.now() - 7 * 86_400_000;
      for (const r of meus) {
        const d = diaBR(r.criado_em);
        dias.add(d);
        if (r.tipo === "abriu") { sessoes++; dia(porDia, d).a++; dia(diaGlobal, d).a++; }
        else if (r.tipo === "beat") {
          beats++; if (new Date(r.criado_em).getTime() >= sete) beats7++;
          dia(porDia, d).s += BEAT; dia(diaGlobal, d).s += BEAT;
          if (r.detalhe) { telaDe(telasDet, r.detalhe).s += BEAT; telaDe(telasDetGlobal, r.detalhe).s += BEAT; }
        }
        else if (r.tipo === "tela" && r.detalhe) { somar(telas, r.detalhe); somar(telasGlobal, r.detalhe); telaDe(telasDet, r.detalhe).v++; telaDe(telasDetGlobal, r.detalhe).v++; }
        else if (r.tipo === "clique" && r.detalhe) { somar(cliques, r.detalhe); somar(cliquesGlobal, r.detalhe); }
        else if (r.tipo === "config" && !cfgRow) cfgRow = r;
      }
      return {
        id: c.id, nome: c.nome, empresa: c.empresa ?? "", celular: c.celular, plano: c.plano, ativo: c.ativo, perfil_ok: c.perfil_ok,
        ultimo_acesso: ult, sessoes, dias: dias.size, hoje: dias.has(hoje), minutos: Math.round(beats / 2), minutos7: Math.round(beats7 / 2),
        seg: beats * BEAT, seg7: beats7 * BEAT,
        porDia: dias14.map((d) => [d, porDia.get(d)?.a ?? 0, porDia.get(d)?.s ?? 0]),
        telasDet: rankTelas(telasDet, 12),
        telas: ranking(telas, 6), cliques: ranking(cliques, 8),
        config: lerConfig(cfgRow),
        ultimas: meus.filter((r: any) => r.tipo !== "beat" && r.tipo !== "config").slice(0, 12).map((r: any) => ({ t: r.tipo, d: r.detalhe, em: r.criado_em })),
      };
    });
    const nomePor: Record<string, string> = {};
    lista.forEach((x) => { if (x.uid) nomePor[x.uid] = x.c.nome; });
    const cfgAtual = await cfg();
    return resp(req, 200, {
      ok: true, convidados, telasTop: ranking(telasGlobal, 10), cliquesTop: ranking(cliquesGlobal, 10),
      minutosTotal: convidados.reduce((s: number, c: any) => s + c.minutos, 0),
      geral: {
        aberturas: convidados.reduce((s: number, c: any) => s + c.sessoes, 0),
        seg: convidados.reduce((s: number, c: any) => s + c.seg, 0),
        pessoas: convidados.filter((c: any) => c.sessoes > 0 || c.seg > 0).length,
        porDia: dias14.map((d) => [d, diaGlobal.get(d)?.a ?? 0, diaGlobal.get(d)?.s ?? 0]),
        telas: rankTelas(telasDetGlobal, 15),
        cliques: ranking(cliquesGlobal, 12),
        ranking: convidados.filter((c: any) => c.sessoes > 0 || c.seg > 0).map((c: any) => ({ id: c.id, nome: c.nome, seg: c.seg, aberturas: c.sessoes, dias: c.dias })).sort((a: any, b: any) => b.seg - a.seg || b.aberturas - a.aberturas),
      },
      desde: cfgAtual.uso_desde ?? null,
      feedback: (fb ?? []).map((f: any) => ({ id: f.id, nome: nomePor[f.user_id] ?? "", texto: f.texto, tela: f.tela, tag: f.tag, audio: !!f.audio_path, seg: f.audio_seg, em: f.criado_em })),
    });
  }
  if (acao === "admin_zerar_uso") {
    const { data: cs } = await db.from("convidados").select("id, perfis(user_id)").neq("papel", "admin");
    const uids = (cs ?? []).flatMap((c: any) => (Array.isArray(c.perfis) ? c.perfis : c.perfis ? [c.perfis] : []).map((p: any) => p.user_id)).filter(Boolean) as string[];
    let opinioes = 0;
    if (uids.length) {
      await db.from("uso").delete().in("user_id", uids);
      await db.from("perfis").update({ ultimo_acesso: null }).in("user_id", uids);
      if (b.opinioes === true) {
        const { data: fb } = await db.from("feedback").select("id, audio_path").in("user_id", uids);
        const caminhos = (fb ?? []).map((f: any) => f.audio_path).filter(Boolean) as string[];
        if (caminhos.length) await db.storage.from("feedback-audio").remove(caminhos);
        await db.from("feedback").delete().in("user_id", uids);
        opinioes = fb?.length ?? 0;
      }
    }
    const desde = new Date().toISOString();
    await db.from("config").upsert({ chave: "uso_desde", valor: desde, atualizado_em: desde }, { onConflict: "chave" });
    await registra(uid, "admin_zerar_uso", b.opinioes === true ? "com opiniões" : "só uso");
    return resp(req, 200, { ok: true, desde, opinioes });
  }
  if (acao === "admin_excluir") {
    // Apaga um convidado de vez (ex.: cadastro de teste): conta de login, uso, opiniões, áudios e códigos. Administrador não pode ser apagado.
    const id = String(b.id ?? "");
    const { data: c } = await db.from("convidados").select("id, celular, nome, papel, perfis(user_id)").eq("id", id).maybeSingle();
    if (!c) return resp(req, 404, { ok: false, mensagem: "Convidado não encontrado." });
    if ((c as any).papel === "admin") return resp(req, 403, { ok: false, mensagem: "O administrador não pode ser apagado." });
    const uids = ((Array.isArray((c as any).perfis) ? (c as any).perfis : (c as any).perfis ? [(c as any).perfis] : []).map((p: any) => p.user_id).filter(Boolean)) as string[];
    if (uids.length) {
      const { data: fb } = await db.from("feedback").select("audio_path").in("user_id", uids);
      const caminhos = (fb ?? []).map((f: any) => f.audio_path).filter(Boolean) as string[];
      if (caminhos.length) await db.storage.from("feedback-audio").remove(caminhos);
      await db.from("feedback").delete().in("user_id", uids);
      await db.from("uso").delete().in("user_id", uids);
      await db.from("acessos").delete().in("user_id", uids);
      await db.from("perfis").delete().in("user_id", uids);
      for (const u of uids) await db.auth.admin.deleteUser(u).catch(() => {});
    }
    await db.from("codigos_login").delete().eq("celular", (c as any).celular);
    const { error } = await db.from("convidados").delete().eq("id", id);
    if (error) return resp(req, 500, { ok: false, mensagem: "Não foi possível apagar agora." });
    await registra(uid, "admin_excluir", `${String((c as any).celular).slice(-4)} ${(c as any).nome}`.slice(0, 200));
    return resp(req, 200, { ok: true });
  }
  if (acao === "admin_audio") {
    const { data: f } = await db.from("feedback").select("audio_path").eq("id", Number(b.id) || -1).maybeSingle();
    if (!f?.audio_path) return resp(req, 404, { ok: false, mensagem: "Áudio não encontrado." });
    const { data: s, error } = await db.storage.from("feedback-audio").createSignedUrl(f.audio_path, 900);
    if (error || !s?.signedUrl) return resp(req, 500, { ok: false, mensagem: "Não foi possível abrir o áudio agora." });
    return resp(req, 200, { ok: true, url: s.signedUrl });
  }
  return resp(req, 400, { ok: false, motivo: "acao" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return resp(req, 405, { ok: false });
  let b: any = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  try {
    switch (b.acao) {
      case "estado": return await estado(req);
      case "pedir": return await pedir(req, b);
      case "verificar": return await verificar(req, b);
      case "renovar": return await renovar(req, b);
      case "conta": return await conta(req);
      case "perfil": return await perfil(req, b);
      case "evento": return await evento(req, b);
      case "feedback": return await feedback(req, b);
      case "sair": return await sair(req);
      default:
        if (String(b.acao ?? "").startsWith("admin_")) return await admin(req, b);
        return resp(req, 400, { ok: false, motivo: "acao" });
    }
  } catch (e) {
    console.error("acesso", b.acao, e);
    return resp(req, 500, { ok: false, motivo: "erro", mensagem: "Erro inesperado. Tente de novo." });
  }
});
