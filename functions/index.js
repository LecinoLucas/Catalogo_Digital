import { renderPagina } from "./_lib/pagina.js";

export async function onRequestGet({ request, env }) {
  return renderPagina(env, request, null);
}
