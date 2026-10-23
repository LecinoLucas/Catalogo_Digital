// Uso (na raiz do projeto): node tools/gerar-qr.mjs https://seu-site.pages.dev/ "Pioneira Colchões"
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
const [url, nome = "Nosso catálogo"] = process.argv.slice(2);
if (!url) { console.error("Informe o endereço do site."); process.exit(1); }
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
await QRCode.toFile("public/qr/catalogo.png", url, { width: 1024, margin: 2, color: { dark: "#0f1b2d", light: "#ffffff" } });
writeFileSync("public/qr/index.html", `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR code | ${esc(nome)}</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#f6f8fb;color:#0f1b2d;display:grid;place-items:center;min-height:100vh}
  main{background:#fff;border-radius:24px;padding:32px;max-width:420px;margin:16px;text-align:center;box-shadow:0 6px 24px rgba(15,27,45,.1)}
  h1{font-size:28px;margin:0 0 4px;letter-spacing:-.02em} p{margin:0 0 16px;color:#566176;font-size:18px}
  img{width:100%;height:auto;display:block} small{display:block;margin-top:12px;color:#566176;word-break:break-all}
  button{margin-top:16px;height:48px;padding:0 24px;border:0;border-radius:12px;background:#0f1b2d;color:#fff;font-size:16px;font-weight:700;cursor:pointer}
  @media print{body{background:#fff}main{box-shadow:none}button{display:none}}
</style></head><body><main>
<h1>${esc(nome)}</h1><p>Aponte a câmera e veja nosso catálogo</p>
<img src="/qr/catalogo.png" alt="QR code do catálogo"><small>${esc(url)}</small>
<button onclick="window.print()">Imprimir</button>
</main></body></html>`);
console.log("QR gerado em public/qr/");
