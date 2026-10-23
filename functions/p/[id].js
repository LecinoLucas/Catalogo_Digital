import { renderPagina } from "../_lib/pagina.js";

export async function onRequestGet({ request, env, params }) {
  return renderPagina(env, request, decodeURIComponent(params.id || ""));
}
