// API do catálogo (Cloudflare Pages Functions).
// Bindings esperados: CATALOG (KV), ADMIN_PASSWORD (secret), SESSION_SECRET (secret, opcional),
// ASSETS (automático). FOTOS (R2) é opcional: sem ele, as fotos novas ficam no próprio KV.

const SESSION_HOURS = 12;
const MAX_CATALOG_BYTES = 300_000;
const MAX_PHOTO_BYTES = 3_000_000;
const MAX_FAILS = 5;
const FAIL_WINDOW_S = 900;
const COOKIE = "cat_session";
const enc = new TextEncoder();

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

// ---------- sessão ----------
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(env, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(env.SESSION_SECRET || env.ADMIN_PASSWORD),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function passwordOk(env, given) {
  if (!env.ADMIN_PASSWORD) return false;
  // Compara os hashes para não vazar o tamanho da senha.
  const [x, y] = await Promise.all(
    [given, env.ADMIN_PASSWORD].map(async (s) =>
      b64url(await crypto.subtle.digest("SHA-256", enc.encode(String(s))))
    )
  );
  return safeEqual(x, y);
}

async function makeToken(env) {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  return `${exp}.${await hmac(env, String(exp))}`;
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env, exp));
}

const cookie = (value, maxAge) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// ---------- catálogo ----------
const isStr = (v, max) => typeof v === "string" && v.length <= max;
const photoOk = (u) => typeof u === "string" && /^\/api\/img\/[a-z0-9-]{1,80}\.jpg$/.test(u);

function validateCatalog(c) {
  if (!c || typeof c !== "object") return "formato inválido";
  if (!c.empresa || typeof c.empresa !== "object") return "empresa ausente";
  if (!Array.isArray(c.abas) || c.abas.length > 12) return "abas inválidas";
  if (!Array.isArray(c.produtos) || c.produtos.length > 300) return "produtos inválidos";
  const abaIds = new Set();
  for (const a of c.abas) {
    if (!isStr(a.id, 40) || !isStr(a.nome, 40) || !a.id || !a.nome) return "aba inválida";
    abaIds.add(a.id);
  }
  const ids = new Set();
  for (const p of c.produtos) {
    if (!isStr(p.id, 80) || !p.id || ids.has(p.id)) return "id de produto inválido ou repetido";
    ids.add(p.id);
    if (!abaIds.has(p.aba)) return `produto "${p.nome}" está numa aba que não existe`;
    if (!isStr(p.nome, 120) || !p.nome.trim()) return "produto sem nome";
    if (!Array.isArray(p.fotos) || p.fotos.length > 12 || !p.fotos.every(photoOk)) return `fotos inválidas em "${p.nome}"`;
  }
  return null;
}

async function seedCatalog(env, url) {
  const r = await env.ASSETS.fetch(new URL("/seed/catalog.json", url));
  return r.ok ? r.json() : { empresa: {}, abas: [], produtos: [] };
}

// ---------- rotas ----------
export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const route = (params.path || []).join("/");
  const method = request.method;

  try {
    if (route === "catalog" && method === "GET") {
      const stored = await env.CATALOG.get("catalog", "json");
      const c = stored || (await seedCatalog(env, url));
      // Produtos marcados como ocultos (rascunho) só saem do servidor para a equipe logada.
      if (!(await isAdmin(request, env))) c.produtos = (c.produtos || []).filter((p) => !p.oculto);
      return json(c);
    }

    if (route === "me" && method === "GET") return json({ admin: await isAdmin(request, env) });

    if (route === "login" && method === "POST") {
      const ip = request.headers.get("cf-connecting-ip") || "local";
      const key = `fail:${ip}`;
      const fails = Number(await env.CATALOG.get(key)) || 0;
      if (fails >= MAX_FAILS) return json({ erro: "Muitas tentativas. Aguarde alguns minutos." }, 429);
      const body = await request.json().catch(() => ({}));
      if (!(await passwordOk(env, body.senha ?? ""))) {
        await env.CATALOG.put(key, String(fails + 1), { expirationTtl: FAIL_WINDOW_S });
        return json({ erro: "Senha incorreta." }, 401);
      }
      await env.CATALOG.delete(key);
      return json({ ok: true }, 200, { "set-cookie": cookie(await makeToken(env), SESSION_HOURS * 3600) });
    }

    if (route === "logout" && method === "POST") return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });

    if (route === "catalog" && method === "PUT") {
      if (!(await isAdmin(request, env))) return json({ erro: "Não autorizado." }, 401);
      const raw = await request.text();
      if (raw.length > MAX_CATALOG_BYTES) return json({ erro: "Catálogo grande demais." }, 413);
      let data;
      try { data = JSON.parse(raw); } catch { return json({ erro: "JSON inválido." }, 400); }
      const problem = validateCatalog(data);
      if (problem) return json({ erro: problem }, 400);
      await env.CATALOG.put("catalog", JSON.stringify(data));
      return json({ ok: true });
    }

    if (route === "upload" && method === "POST") {
      if (!(await isAdmin(request, env))) return json({ erro: "Não autorizado." }, 401);
      const buf = await request.arrayBuffer();
      if (buf.byteLength > MAX_PHOTO_BYTES) return json({ erro: "Foto maior que 3 MB." }, 413);
      const head = new Uint8Array(buf.slice(0, 3));
      if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) return json({ erro: "Envie JPEG." }, 400);
      const id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
      if (env.FOTOS) await env.FOTOS.put(`${id}.jpg`, buf, { httpMetadata: { contentType: "image/jpeg" } });
      else await env.CATALOG.put(`img:${id}.jpg`, buf);
      return json({ url: `/api/img/${id}.jpg` });
    }

    if (route.startsWith("img/") && method === "GET") {
      const name = route.slice(4);
      if (!/^[a-z0-9-]{1,80}\.jpg$/.test(name)) return new Response("Not found", { status: 404 });
      // Abrir a foto direto numa aba (navegação) não é permitido; só dentro da página.
      if (request.headers.get("sec-fetch-dest") === "document") return new Response("Not found", { status: 404 });
      const headers = {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
      };
      if (name.startsWith("seed-")) {
        const r = await env.ASSETS.fetch(new URL(`/seed/${name.slice(5)}`, url));
        return r.ok ? new Response(r.body, { headers }) : new Response("Not found", { status: 404 });
      }
      const body = env.FOTOS ? (await env.FOTOS.get(name))?.body : await env.CATALOG.get(`img:${name}`, "arrayBuffer");
      return body ? new Response(body, { headers }) : new Response("Not found", { status: 404 });
    }

    return json({ erro: "Rota não encontrada." }, 404);
  } catch (e) {
    return json({ erro: "Erro interno." }, 500);
  }
}
