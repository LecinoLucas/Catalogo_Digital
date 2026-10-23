// Service worker mínimo: só habilita a instalação como aplicativo.
// Não guarda nada em cache, então o catálogo sempre mostra a versão mais nova.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
