// Dados do app (/data/*.json) lidos da tabela "conteudo" do Supabase.
// Atualizar preço ou notícia passa a ser gravar no banco: não precisa publicar o site (e não gasta crédito de deploy).
// Reserva: se o Supabase falhar ou demorar, entrega o arquivo que foi junto na última publicação (x-fonte: reserva).
// Função de borda: não cobra tempo de processamento no Netlify, só a requisição (que já é cobrada hoje).

const SUPABASE = "https://lvugmecpbitcmetfxkcs.supabase.co";
const CHAVE_PUBLICA = "sb_publishable_C6V0GTK0LnN0nBfZXEU4MA_yMHwsbqn"; // chave publicável: só lê o que já é público
const ARQUIVOS = new Set(["boletins", "clima", "config", "cotacoes", "mercado", "noticias", "ofertas", "panorama", "patrocinadores", "terminal"]);
const CDN_SEGUNDOS = 60; // a CDN guarda por até 1 minuto: uma troca no banco aparece em até 1 minuto

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const nome = new URL(req.url).pathname.match(/^\/data\/([a-z]+)\.json$/)?.[1];
  if (!nome || !ARQUIVOS.has(nome) || req.method !== "GET") return; // qualquer outra coisa: segue o caminho normal

  try {
    const r = await fetch(`${SUPABASE}/rest/v1/conteudo?arquivo=eq.${nome}&select=dados`, {
      headers: { apikey: CHAVE_PUBLICA, Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    const txt = await r.text();
    // A resposta vem como [{"dados":<o arquivo, do jeito que foi gravado>}]: recorta o arquivo sem mexer em nada.
    const ini = '[{"dados":', fim = "}]";
    let corpo: string;
    if (txt.startsWith(ini) && txt.endsWith(fim)) corpo = txt.slice(ini.length, -fim.length);
    else {
      const linhas = JSON.parse(txt);
      if (!Array.isArray(linhas) || !linhas[0]) throw new Error("sem linha");
      corpo = JSON.stringify(linhas[0].dados);
    }
    JSON.parse(corpo); // confere que é JSON válido antes de entregar
    return new Response(corpo, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-cache", // o celular sempre confere
        "netlify-cdn-cache-control": `public, max-age=${CDN_SEGUNDOS}, durable`,
        "x-fonte": "supabase",
      },
    });
  } catch (e) {
    console.error("dados reserva", nome, String((e as Error)?.message ?? e).slice(0, 120));
    const res = await context.next(); // o arquivo publicado junto com o site
    const h = new Headers(res.headers);
    h.set("x-fonte", "reserva");
    h.set("cache-control", "no-cache");
    h.set("netlify-cdn-cache-control", "public, max-age=10"); // tenta o Supabase de novo logo
    return new Response(res.body, { status: res.status, headers: h });
  }
};

export const config = { path: "/data/*", cache: "manual" };
