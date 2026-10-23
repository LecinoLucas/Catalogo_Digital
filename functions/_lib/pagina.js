// Monta a página inicial com as tags de compartilhamento (WhatsApp, Instagram etc.)
// preenchidas com a foto e o nome do produto. Usada por "/" e "/p/<id>".

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const corta = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

async function catalogoPublico(env, url) {
  const guardado = await env.CATALOG.get("catalog", "json");
  const c = guardado || (await (await env.ASSETS.fetch(new URL("/seed/catalog.json", url))).json());
  c.produtos = (c.produtos || []).filter((p) => !p.oculto); // rascunhos nunca entram nas prévias
  return c;
}

export async function renderPagina(env, request, produtoId) {
  const url = new URL(request.url);
  const base = await env.ASSETS.fetch(new URL("/", url));
  let html = await base.text();
  try {
    const c = await catalogoPublico(env, url);
    const e = c.empresa || {};
    const p = produtoId ? c.produtos.find((x) => x.id === produtoId) : null;
    const nomeProduto = p ? `${p.nome} ${p.nome2 || ""}`.trim() : "";
    const titulo = p ? `${nomeProduto} | ${e.nome || "Catálogo"}` : `${e.nome || "Catálogo"} | Catálogo`;
    const desc = corta(p ? (p.descricao || e.slogan) : (e.slogan ? `${e.slogan}. ${e.descricao || ""}` : e.descricao), 200);
    const foto = p ? p.fotos[0] : (e.capa || (c.produtos.find((x) => x.fotos[0]) || { fotos: [] }).fotos[0]);
    const imagem = foto ? new URL(foto, url).href : "";
    const canonica = p ? `${url.origin}/p/${encodeURIComponent(p.id)}` : `${url.origin}/`;
    const tags = [
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="${esc(e.nome || "Catálogo")}">`,
      `<meta property="og:title" content="${esc(titulo)}">`,
      `<meta property="og:description" content="${esc(desc)}">`,
      `<meta property="og:url" content="${esc(canonica)}">`,
      imagem ? `<meta property="og:image" content="${esc(imagem)}">` : "",
      `<meta name="twitter:card" content="${imagem ? "summary_large_image" : "summary"}">`,
    ].filter(Boolean).join("\n");
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`)
      .replace("<!--OG-->", tags);
  } catch (_) { /* sem prévia: devolve a página normal */ }
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
}
