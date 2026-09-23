/* Service worker do SGP — Fase 5 (uso em campo e conexões instáveis).
   Estratégia deliberadamente conservadora:
   - nunca guarda respostas da API em cache (dados de negócio precisam ser atuais);
   - usa network-first para navegação, caindo para o shell em caso de falha;
   - cache-first apenas para os arquivos estáticos com hash no nome.
*/
const VERSAO = "sgp-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/media/")) {
    return;
  }

  if (requisicao.mode === "navigate") {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put("/index.html", copia));
          return resposta;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  const estaticoComHash = /\/assets\/.+-[A-Za-z0-9_]{8}\.(js|css|woff2?)$/.test(url.pathname);
  if (estaticoComHash) {
    evento.respondWith(
      caches.match(requisicao).then(
        (emCache) =>
          emCache ||
          fetch(requisicao).then((resposta) => {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
            return resposta;
          })
      )
    );
  }
});
