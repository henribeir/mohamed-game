// Mohamed — service worker: guarda todos os arquivos do app para funcionar offline.
// Publicou mudanças? Troque a VERSAO (e a VERSAO_APP em seguranca.js). Os alunos recebem a versão nova inteira
// de uma vez e veem "Nova versão disponível, tocar para atualizar".
const VERSAO = 'mohamed-v19';
const ARQUIVOS = [
  './', 'index.html', 'seguranca.js', 'app.js', 'jogo.js', 'conteudo.js', 'questoes.js', 'relatorio.js', 'tema.css', 'audio.js', 'vila.js', 'biomas.js', 'monstros.js', 'perigos.js', 'puzzles.js', 'mapas.js', 'mapas1.js', 'mapas2.js', 'mapas3.js',
  'sprites.js', 'personagens.js', 'monstros_campo.js', 'monstros_floresta.js', 'monstros_praia.js', 'monstros_vulcao.js', 'monstros_castelo.js', 'minichefes.js', 'chefoes.js', 'chefoes2.js', 'sprites_jogo.js',
  'manifest.json', 'icone.svg', 'icone-192.png', 'icone-512.png'
];

// cache: 'reload' busca cada arquivo na rede, e não no cache HTTP do navegador: nada de versão velha misturada
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// arquivos do app: sempre da versão guardada (todos da mesma versão). A versão nova chega inteira quando a VERSAO muda.
// Pedidos para outros sites (planilha do professor) vão direto para a rede.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSAO).then(c => c.match(e.request, { ignoreSearch: true }).then(guardado => guardado || fetch(e.request)
    .then(resp => { if (resp.ok && resp.type === 'basic') c.put(e.request, resp.clone()); return resp; })
    .catch(() => (e.request.mode === 'navigate' ? c.match('index.html') : Response.error())))));
});
