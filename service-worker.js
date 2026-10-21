// Mohamed — service worker: guarda todos os arquivos do app para funcionar offline.
// Publicou mudanças? Troque a VERSAO para os alunos receberem os arquivos novos.
const VERSAO = 'mohamed-v18';
const ARQUIVOS = [
  './', 'index.html', 'app.js', 'jogo.js', 'conteudo.js', 'relatorio.js', 'tema.css', 'audio.js', 'vila.js', 'biomas.js', 'monstros.js', 'perigos.js', 'puzzles.js', 'mapas.js', 'mapas1.js', 'mapas2.js', 'mapas3.js',
  'sprites.js', 'personagens.js', 'monstros_campo.js', 'monstros_floresta.js', 'monstros_praia.js', 'monstros_vulcao.js', 'monstros_castelo.js', 'minichefes.js', 'chefoes.js', 'chefoes2.js', 'sprites_jogo.js',
  'manifest.json', 'icone.svg', 'icone-192.png', 'icone-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// arquivos do app: responde do cache e atualiza em segundo plano.
// Pedidos para outros sites (planilha do professor) vão direto para a rede.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const rede = fetch(e.request).then(resp => {
    const copia = resp.clone();
    if (resp.ok) caches.open(VERSAO).then(c => c.put(e.request, copia));
    return resp;
  });
  e.waitUntil(rede.catch(() => {}));
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(guardado => guardado || rede.catch(() => caches.match('index.html')))
  );
});
