/* Mohamed — vila.js: a vila em grade (16 × 16 casas), desenhada no canvas.
   CONSTRUIR (🔨): barra embaixo com categorias; toque no item e depois numa casa livre da grade.
                   Toque num item já colocado para mover (✋), girar (↻) ou guardar (📦).
   PASSEAR (🚶):   o herói anda com o joystick (bate em muros e casas). Chegue perto ou toque para coletar.
   Produção: poço (água) e moinho (moedas) produzem aos poucos, mesmo com o app fechado, até um limite.
             Só cresce com o estudo: cada relatório de 15 min enviado dá +1 nível de produção naquele dia.
   Canteiros: semente → broto → muda → árvore, um estágio por rega em dias diferentes (1 rega por dia).
              Árvore adulta dá prêmio diário. Sem rega por 3 dias a planta fica triste, mas nunca morre.
   Salvo em estado.vila: { itens: [{ id, x, y, r }], guardados: { id: qtd }, baldes, sementes, ... } */

// ---------- números da vila (fácil de ajustar) ----------
const CONFIG_VILA = {
  tamanho: 16,                 // casas de lado
  vista: 9,                    // casas na largura da tela
  vel: 3.2,                    // casas por segundo no passeio
  alcance: 1.4,                // chegar perto a esta distância coleta
  produz: {                    // por nível de estudo do dia, por hora, até o limite
    poco: { recurso: 'baldes', porHora: .5, limite: 3, icone: '🪣' },
    moinho: { recurso: 'moedas', porHora: 2, limite: 12, icone: '🪙' }
  },
  baldePorAcertos: 5,          // a cada 5 acertos (batalha, puzzle, baú), 1 balde
  sementes: { bau: .35, ouro: 1, chefao: 2, diaDeEstudo: 1 }, // chance no baú comum, quantas no dourado, no chefão e por dia de estudo
  gemas: { chefao: 3, medalha: 2 },                          // o puzzle sem erro dá a dele em puzzles.js
  diasTriste: 3,               // dias sem rega até ficar triste (nunca morre)
  diasBrilhante: 3,            // a cada 3 dias seguidos de estudo nasce uma árvore brilhante
  precoCarta: 4,               // enfeite temático de cada carta aprendida (em moedas)
  lanternaPasso: .5,           // quanto cada nível de lanterna da loja aumenta a luz da masmorra
  loja: [                      // melhorias à venda (em gemas), com nível máximo
    { id: 'lanterna', icone: '🔦', nome: 'Lanterna maior', gemas: 3, max: 3 },
    { id: 'coracao', icone: '❤️', nome: '+1 coração', gemas: 5, max: 2 },
    { id: 'dica', icone: '💡', nome: 'Dica extra', gemas: 3, max: 2 }
  ],
  inicial: { itens: [{ id: 'poco', x: 10, y: 6 }, { id: 'canteiro', x: 6, y: 6 }, { id: 'pedra', x: 7, y: 8 }, { id: 'pedra', x: 8, y: 8 }, { id: 'pedra', x: 9, y: 8 }], sementes: { carvalho: 1 } }
};

// sementes: peso no sorteio, prêmio diário da árvore adulta e de quantos em quantos dias
const SEMENTES = {
  carvalho: { icone: '🌳', peso: 5, premio: { moedas: 3 }, cada: 1 },
  pinheiro: { icone: '🌲', peso: 3, premio: { moedas: 2 }, cada: 1 },
  macieira: { icone: '🍎', peso: 2, premio: { gemas: 1 }, cada: 2 },  // fruta que vale gema
  brilhante: { icone: '✨', peso: 0, premio: { gemas: 1, moedas: 3 }, cada: 1 } // nasce com dias seguidos de estudo
};

// ---------- itens que dá para construir (tabela fácil de editar) ----------
// preco: moedas · gemas: itens especiais · chao: dá para pisar · caminho / liga: se ligam aos vizinhos
// gira: 'lado' (espelha) ou 'eixo' (deitado/em pé) · produz: chave de CONFIG_VILA.produz · canteiro: recebe sementes
const CATEGORIAS_VILA = [
  { id: 'caminhos', icone: '🟫' }, { id: 'muros', icone: '🧱' }, { id: 'casas', icone: '🏠' },
  { id: 'plantas', icone: '🌱' }, { id: 'decoracao', icone: '🏮' }, { id: 'especiais', icone: '✨' }
];
const ITENS_VILA = {
  terra: { cat: 'caminhos', preco: 1, chao: true, caminho: true },
  pedra: { cat: 'caminhos', preco: 2, chao: true, caminho: true },
  tabua: { cat: 'caminhos', preco: 2, chao: true, caminho: true, gira: 'eixo' },
  seixos: { cat: 'caminhos', preco: 3, chao: true, caminho: true },
  cerca: { cat: 'muros', preco: 2, liga: true },
  muro: { cat: 'muros', preco: 3, liga: true },
  sebe: { cat: 'muros', preco: 3, liga: true },
  cabana: { cat: 'casas', preco: 15, gira: 'lado' },
  casa: { cat: 'casas', preco: 25, gira: 'lado' },
  celeiro: { cat: 'casas', preco: 30, gira: 'lado' },
  torre: { cat: 'casas', preco: 40 },
  canteiro: { cat: 'plantas', preco: 4, chao: true, canteiro: true },
  flores: { cat: 'plantas', preco: 2, chao: true },
  girassol: { cat: 'plantas', preco: 3, chao: true },
  arbusto: { cat: 'plantas', preco: 3 },
  cogumelo: { cat: 'plantas', preco: 2, chao: true },
  banco: { cat: 'decoracao', preco: 4, gira: 'eixo' },
  lampiao: { cat: 'decoracao', preco: 5, luz: '#FFC86B' },
  barril: { cat: 'decoracao', preco: 3 },
  rocha: { cat: 'decoracao', preco: 2 },
  placa: { cat: 'decoracao', preco: 3, gira: 'lado' },
  poco: { cat: 'especiais', gemas: 3, produz: 'poco' },
  moinho: { cat: 'especiais', gemas: 5, produz: 'moinho' },
  fonte: { cat: 'especiais', gemas: 4 },
  cristal: { cat: 'especiais', gemas: 6, luz: '#7DF9FF' }
};
// enfeites da aldeia antiga → itens da vila (para não perder nada)
const ENFEITE_ANTIGO = { '🌷': 'flores', '🌳': 'arbusto', '🏮': 'lampiao', '🌻': 'girassol', '🪨': 'rocha', '🍄': 'cogumelo' };

const Vila = (() => {
  const T = 32, C = CONFIG_VILA, N = C.tamanho, TAU = Math.PI * 2;
  const VET = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
  const TECLAS = { arrowup: 'cima', arrowdown: 'baixo', arrowleft: 'esquerda', arrowright: 'direita', w: 'cima', s: 'baixo', a: 'esquerda', d: 'direita' };
  const menos = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const calmo = () => !!(menos && menos.matches);
  let V = null, cv = null, ctx = null, raf = 0, ligado = false, ultimo = 0, grade = [];
  let modo = 'passeio', cat = 'caminhos', ferramenta = null, segurado = null, menuDe = null, hover = null;
  let vw = 0, vh = 0, zoom = 1, dpr = 1, P = null, textos = [], gotas = [], chuvaT = 0, prodEm = 0;
  const cam = { x: 0, y: 0 }, joy = { x: 0, y: 0 }, teclas = new Set(), anim = new Map(), previas = {};
  let sprites = { chave: '', imgs: {} };
  let fagulha = null, tAnterior = 0;                             // a Fagulha (personagens.js) segue o herói no passeio
  const $v = id => document.getElementById(id);

  // ---------- dias (data local) ----------
  const diaNum = (ts = Date.now()) => { const d = new Date(ts); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const hoje = () => diaNum();
  const nivelHoje = () => V.niveis[hoje()] || 0;

  // ---------- estado salvo (cria e migra a aldeia antiga sem perder nada) ----------
  function garantir() {
    if (V && estado.vila === V) return V;
    if (!estado.vila) {
      estado.vila = { versao: 1, itens: C.inicial.itens.map(i => ({ ...i, r: 0 })), guardados: {}, baldes: 1, acertos: 0, sementes: { ...C.inicial.sementes }, niveis: {}, estudo: { dia: 0, seguidos: 0 }, chuva: 0, chuvaVista: 0, heroi: null };
      for (const it of estado.vila.itens) if (ITENS_VILA[it.id].produz) { it.t = Date.now(); it.acc = 0; }
    }
    V = estado.vila;
    V.guardados = V.guardados || {};
    V.sementes = V.sementes || {};
    V.niveis = V.niveis || {};
    V.estudo = V.estudo || { dia: 0, seguidos: 0 };
    reindexar();
    const antigos = (estado.aldeia && estado.aldeia.lotes) || [];
    if (antigos.length && !estado.aldeia.migrada) {
      for (const l of antigos) {
        const id = l.c ? 'carta:' + l.c : ENFEITE_ANTIGO[l.e] || 'flores', lugar = casaLivrePerto(8, 9);
        if (lugar) { V.itens.push({ id, x: lugar[0], y: lugar[1], r: 0 }); reindexar(); } else V.guardados[id] = (V.guardados[id] || 0) + 1;
      }
      estado.aldeia.migrada = true;
    }
    // poucos dias de nível guardados
    for (const k of Object.keys(V.niveis)) if (+k < hoje() - 7) delete V.niveis[k];
    return V;
  }
  function reindexar() {
    grade = new Array(N * N).fill(null);
    for (const it of V.itens) if (!it.solto && dentro(it.x, it.y)) grade[it.y * N + it.x] = it;
  }
  const dentro = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const itemEm = (x, y) => (dentro(x, y) ? grade[y * N + x] : null);
  const livre = (x, y) => dentro(x, y) && !itemEm(x, y);
  function casaLivrePerto(cx, cy) {
    for (let r = 0; r < N; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (livre(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    }
    return null;
  }
  function def(id) {
    if (ITENS_VILA[id]) return ITENS_VILA[id];
    if (!String(id).startsWith('carta:')) return null;
    const l = cartaPorId(id.slice(6));
    return l ? { cat: 'decoracao', preco: C.precoCarta, emoji: l.carta.emoji, carta: true, nome: l.carta.titulo } : null;
  }
  const solido = it => { const d = def(it.id); if (!d) return false; if (d.canteiro) return !!(it.planta && it.planta.est >= 3); return !d.chao; };
  const bloqueia = (x, y) => !dentro(x, y) || !!(itemEm(x, y) && solido(itemEm(x, y)));

  // ---------- produção: integra dia a dia com o nível de estudo de cada dia ----------
  function produzir(it, agora) {
    const p = C.produz[def(it.id).produz];
    let t = Math.min(it.t || agora, agora), acc = it.acc || 0;
    while (t < agora && acc < p.limite) {
      const fim = new Date(t);
      fim.setHours(24, 0, 0, 0);
      const ate = Math.min(agora, Math.max(fim.getTime(), t + 1));
      acc = Math.min(p.limite, acc + (V.niveis[diaNum(t)] || 0) * p.porHora * (ate - t) / 36e5);
      t = ate;
    }
    it.t = agora;
    it.acc = acc;
  }
  const produzirTudo = () => { const agora = Date.now(); for (const it of V.itens) if (def(it.id) && def(it.id).produz) produzir(it, agora); };

  function coletar(it, perto) {
    const p = C.produz[def(it.id).produz];
    produzir(it, Date.now());
    const n = Math.floor(it.acc);
    if (n < 1) { if (!perto) flutuar(nivelHoje() ? '⏳' : '📤', it.x + .5, it.y - .4); return false; }
    it.acc -= n;
    if (p.recurso === 'baldes') V.baldes += n;
    else if (p.recurso === 'gemas') estado.gemas += n;
    else estado.moedas += n;
    flutuar(`+${n} ${p.icone}`, it.x + .5, it.y - .5);
    som('moeda');
    pulo(it);
    salvar();
    pintarHUD();
    return true;
  }

  // ---------- canteiros e árvores ----------
  const triste = pl => hoje() - pl.rega >= C.diasTriste;
  const madura = pl => pl.est >= 3 && !triste(pl) && hoje() - pl.colheu >= SEMENTES[pl.sem].cada;
  function regar(it, chuva) {
    const pl = it.planta, h = hoje();
    if (!pl || pl.rega === h) return false;
    if (!chuva) {
      if (V.baldes <= 0) { flutuar('🪣 0', it.x + .5, it.y - .4); tremer(it); return false; }
      V.baldes--;
    }
    pl.rega = h;
    if (SJ()) SJ().evento('seuBroto', 'feliz');
    if (pl.est < 3) { pl.est++; if (pl.est === 3) pl.colheu = h; } // árvore nova: o primeiro prêmio vem amanhã
    anim.set(it, { t: 0, tipo: 'cresce' });
    if (!chuva) { flutuar('💧', it.x + .5, it.y - .6); som('acerto'); salvar(); pintarHUD(); }
    return true;
  }
  function colher(it) {
    const pl = it.planta, s = SEMENTES[pl.sem];
    pl.colheu = hoje();
    if (s.premio.moedas) estado.moedas += s.premio.moedas;
    if (s.premio.gemas) estado.gemas += s.premio.gemas;
    flutuar([s.premio.gemas ? `+${s.premio.gemas} 💎` : '', s.premio.moedas ? `+${s.premio.moedas} 🪙` : ''].filter(Boolean).join(' '), it.x + .5, it.y - 1.4);
    som(s.premio.gemas ? 'bau' : 'moeda');
    pulo(it);
    salvar();
    pintarHUD();
  }
  function plantar(it, sem) {
    if (!(V.sementes[sem] > 0) || it.planta) return;
    V.sementes[sem]--;
    it.planta = { sem, est: 0, rega: hoje() - 1, colheu: -1e9 }; // pode regar já no dia em que plantou
    anim.set(it, { t: 0, tipo: 'cresce' });
    som('clique');
    fecharMenu();
    salvar();
    pintarHUD();
  }
  // árvore brilhante: nasce sozinha numa casa livre perto do centro
  function nascerBrilhante() {
    const lugar = casaLivrePerto(8, 8);
    if (!lugar) { V.sementes.brilhante = (V.sementes.brilhante || 0) + 1; return; }
    const it = { id: 'canteiro', x: lugar[0], y: lugar[1], r: 0, planta: { sem: 'brilhante', est: 1, rega: hoje(), colheu: -1e9 } };
    V.itens.push(it);
    reindexar();
    anim.set(it, { t: 0, tipo: 'surge' });
  }

  // ---------- abrir a tela ----------
  function abrir() {
    garantir();
    cv = $v('vila-tela');
    ctx = cv.getContext('2d');
    if (!ligado) ligar();
    produzirTudo();
    const h = V.heroi && !bloqueia(Math.floor(V.heroi.x), Math.floor(V.heroi.y)) ? V.heroi : (() => { const l = casaLivrePerto(8, 9) || [8, 9]; return { x: l[0] + .5, y: l[1] + .5 }; })();
    P = { x: h.x, y: h.y, dir: 'baixo', passo: 0, andando: false };
    trocarModo('passeio');
    ajustar();
    centrar();
    pintarHUD();
    criarSprites();
    // chuva do relatório: as plantas já foram regadas; aqui ela aparece
    if (V.chuva > V.chuvaVista) { V.chuvaVista = V.chuva; chuvaT = calmo() ? 1 : 3.5; salvar(); }
    cancelAnimationFrame(raf);
    ultimo = 0;
    raf = requestAnimationFrame(quadro);
  }

  function trocarModo(m) {
    modo = m;
    ferramenta = null;
    soltarSegurado();
    fecharMenu();
    $v('vila-barra').hidden = m !== 'construir';
    $v('vila-controle').hidden = m === 'construir';
    const bt = $v('vila-modo');
    bt.textContent = m === 'construir' ? '🚶' : '🔨';
    bt.setAttribute('aria-label', m === 'construir' ? 'Passear' : 'Construir');
    if (m === 'construir') pintarBarra();
    else if (P && bloqueia(Math.floor(P.x), Math.floor(P.y))) { const l = casaLivrePerto(Math.floor(P.x), Math.floor(P.y)); if (l) { P.x = l[0] + .5; P.y = l[1] + .5; } }
    if (cv) ajustar();
  }

  function ajustar() {
    const palco = cv.parentElement, w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    zoom = Math.max(.8, w / (C.vista * T));
    vw = w / zoom;
    vh = h / zoom;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  function limitar() {
    const m = T * .5, W = N * T, H = N * T;
    cam.x = W + 2 * m <= vw ? (W - vw) / 2 : Math.max(-m, Math.min(W + m - vw, cam.x));
    cam.y = H + 2 * m <= vh ? (H - vh) / 2 : Math.max(-m, Math.min(H + m - vh, cam.y));
  }
  function centrar() { cam.x = P.x * T - vw / 2; cam.y = P.y * T - vh / 2; limitar(); }

  // ---------- recursos no topo e barra de construir ----------
  function pintarHUD() {
    const el = $v('vila-recursos');
    if (!el) return;
    const sem = Object.values(V.sementes).reduce((a, b) => a + b, 0), n = nivelHoje();
    el.innerHTML = `<span>🪙 ${estado.moedas}</span><span>💎 ${estado.gemas}</span><span>🪣 ${V.baldes}</span><span>🌰 ${sem}</span><span class="${n ? '' : 'apagado'}" data-nivel>📚 ${n}</span>`;
  }
  function itensDaCategoria(c) {
    const ids = Object.keys(ITENS_VILA).filter(id => ITENS_VILA[id].cat === c);
    if (c === 'decoracao') ids.push(...estado.cartas.map(id => 'carta:' + id).filter(id => def(id)));
    return ids;
  }
  const preco = d => (d.gemas ? `💎 ${d.gemas}` : `🪙 ${d.preco}`);
  const podePagar = d => (d.gemas ? estado.gemas >= d.gemas : estado.moedas >= d.preco);
  function pintarBarra() {
    $v('vila-cats').innerHTML = CATEGORIAS_VILA.map(k => `<button class="vila-cat${k.id === cat ? ' sel' : ''}" data-cat="${k.id}" aria-label="${k.id}">${k.icone}</button>`).join('');
    $v('vila-itens').innerHTML = itensDaCategoria(cat).map(id => {
      const d = def(id), tem = V.guardados[id] || 0;
      return `<button class="vila-item${id === ferramenta ? ' sel' : ''}${tem || podePagar(d) ? '' : ' caro'}" data-id="${id}"><img src="${previa(id)}" alt=""><small>${tem ? `📦 ${tem}` : preco(d)}</small></button>`;
    }).join('');
  }

  // ---------- controles ----------
  function ligar() {
    ligado = true;
    $v('vila-modo').onclick = () => { som('clique'); trocarModo(modo === 'construir' ? 'passeio' : 'construir'); };
    $v('vila-loja').onclick = abrirLoja;
    $v('vila-recursos').onclick = e => { if (e.target.closest('[data-nivel]')) toast(nivelHoje() ? `📚 ${nivelHoje()} · 🪣 🪙 ⏳` : '📤 Relatório de 15 min → 📚 +1'); };
    $v('vila-cats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; som('clique'); pintarBarra(); };
    $v('vila-itens').onclick = e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      soltarSegurado();
      fecharMenu();
      ferramenta = ferramenta === b.dataset.id ? null : b.dataset.id;
      som('clique');
      pintarBarra();
    };
    $v('vila-menu').onclick = e => { const b = e.target.closest('[data-a]'); if (b) acaoMenu(b.dataset.a); };
    // canvas: arrastar move a câmera (construir); tocar escolhe a casa
    let toque = null;
    cv.addEventListener('pointerdown', e => { toque = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, arrasta: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      hover = casaDaTela(e.clientX, e.clientY);
      if (!toque || e.pointerId !== toque.id) return;
      const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
      if (!toque.arrasta && Math.hypot(dx, dy) > 8) toque.arrasta = true;
      if (toque.arrasta && modo === 'construir') { cam.x = toque.cx - dx / zoom; cam.y = toque.cy - dy / zoom; limitar(); fecharMenu(); }
    });
    cv.addEventListener('pointerup', e => { if (!toque || e.pointerId !== toque.id) return; const t = toque; toque = null; if (!t.arrasta) tocar(...casaDaTela(e.clientX, e.clientY)); });
    cv.addEventListener('pointercancel', () => { toque = null; });
    cv.addEventListener('pointerleave', () => { hover = null; });
    // joystick do passeio
    const base = $v('vila-joy'), bola = base.querySelector('i');
    let id = null;
    const mexer = e => {
      const r = base.getBoundingClientRect(), raio = r.width / 2 - 16;
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > raio) { dx *= raio / d; dy *= raio / d; }
      bola.style.transform = `translate(${dx}px,${dy}px)`;
      joy.x = dx / raio;
      joy.y = dy / raio;
    };
    const soltar = e => { if (e && e.pointerId !== id) return; id = null; joy.x = joy.y = 0; bola.style.transform = ''; base.classList.remove('ativo'); };
    base.addEventListener('pointerdown', e => { id = e.pointerId; base.setPointerCapture(id); base.classList.add('ativo'); mexer(e); });
    base.addEventListener('pointermove', e => { if (e.pointerId === id) mexer(e); });
    base.addEventListener('pointerup', soltar);
    base.addEventListener('pointercancel', soltar);
    addEventListener('keydown', e => {
      if (!$v('t-aldeia').classList.contains('ativa')) return;
      if (e.key === 'Escape') { ferramenta = null; soltarSegurado(); fecharMenu(); if (modo === 'construir') pintarBarra(); return; }
      const d = TECLAS[(e.key || '').toLowerCase()];
      if (!d || modo !== 'passeio' || document.querySelector('.sobre')) return;
      teclas.delete(d);
      teclas.add(d);
      e.preventDefault();
    });
    addEventListener('keyup', e => teclas.delete(TECLAS[(e.key || '').toLowerCase()]));
    addEventListener('resize', () => { if (cv && $v('t-aldeia').classList.contains('ativa')) ajustar(); });
  }
  function casaDaTela(cx, cy) {
    const r = cv.getBoundingClientRect();
    return [Math.floor(((cx - r.left) / zoom + cam.x) / T), Math.floor(((cy - r.top) / zoom + cam.y) / T)];
  }

  // ---------- tocar na grade ----------
  function tocar(x, y) {
    const it = itemEm(x, y);
    if (modo === 'construir') {
      if (segurado) return largar(x, y);
      if (it) return abrirMenu(it);
      fecharMenu();
      if (ferramenta) colocar(x, y);
      return;
    }
    fecharMenu();
    if (it) usar(it);
  }
  // passeio: cada coisa faz a sua parte
  function usar(it, perto) {
    const d = def(it.id);
    if (!d) return;
    if (d.produz) return coletar(it, perto);
    if (d.canteiro) {
      if (!it.planta) return perto ? null : escolherSemente(it);
      if (madura(it.planta)) return colher(it);
      if (perto) return;
      if (it.planta.rega !== hoje()) return regar(it);
      flutuar('💧✔', it.x + .5, it.y - .6);
      return;
    }
    if (!perto) pulo(it);
  }

  // construir: paga em moedas (ou gemas) ou usa o que está guardado
  function colocar(x, y) {
    const id = ferramenta, d = def(id);
    if (!d || !livre(x, y)) return;
    if ((V.guardados[id] || 0) > 0) V.guardados[id]--;
    else if (!podePagar(d)) { flutuar(d.gemas ? `💎 ${d.gemas - estado.gemas}` : `🪙 ${d.preco - estado.moedas}`, x + .5, y + .2); som('erro'); return; }
    else if (d.gemas) estado.gemas -= d.gemas;
    else estado.moedas -= d.preco;
    const it = { id, x, y, r: 0 };
    if (d.produz) { it.t = Date.now(); it.acc = 0; }
    V.itens.push(it);
    reindexar();
    anim.set(it, { t: 0, tipo: 'surge' });
    som(d.gemas ? 'bau' : 'clique');
    vibrar(15);
    salvar();
    pintarHUD();
    pintarBarra();
  }

  // menu do item colocado: mover, girar, guardar
  function abrirMenu(it) {
    menuDe = it;
    const d = def(it.id), m = $v('vila-menu');
    m.innerHTML = '<button data-a="mover" aria-label="Mover">✋</button>' + (d.gira ? '<button data-a="girar" aria-label="Girar">↻</button>' : '') + '<button data-a="guardar" aria-label="Guardar">📦</button>';
    m.hidden = false;
    posicionarMenu();
    som('clique');
  }
  function posicionarMenu() {
    if (!menuDe) return;
    const m = $v('vila-menu'), x = ((menuDe.x + .5) * T - cam.x) * zoom, y = (menuDe.y * T - cam.y) * zoom - 14;
    m.style.left = Math.max(70, Math.min(cv.clientWidth - 70, x)) + 'px';
    m.style.top = Math.max(30, y) + 'px';
  }
  function fecharMenu() { menuDe = null; const m = $v('vila-menu'); if (m) { m.hidden = true; m.innerHTML = ''; } }
  function acaoMenu(a) {
    const it = menuDe;
    if (!it) return;
    if (a === 'semente') return;
    if (a.startsWith('sem:')) return plantar(it, a.slice(4));
    if (a === 'girar') { it.r = ((it.r || 0) + 1) % 4; pulo(it); som('clique'); salvar(); return; }
    fecharMenu();
    if (a === 'mover') { segurado = { it, de: { x: it.x, y: it.y } }; it.solto = true; reindexar(); som('clique'); return; }
    if (a === 'guardar') {
      if (it.planta) { tremer(it); flutuar('🌱', it.x + .5, it.y - .4); return; } // canteiro com planta fica
      V.itens = V.itens.filter(x => x !== it);
      V.guardados[it.id] = (V.guardados[it.id] || 0) + 1;
      reindexar();
      som('clique');
      salvar();
      pintarBarra();
    }
  }
  function largar(x, y) {
    if (!livre(x, y)) { som('erro'); return; }
    const it = segurado.it;
    it.x = x; it.y = y; it.solto = false;
    segurado = null;
    reindexar();
    anim.set(it, { t: 0, tipo: 'surge' });
    som('clique');
    salvar();
  }
  function soltarSegurado() { if (!segurado) return; const it = segurado.it; it.x = segurado.de.x; it.y = segurado.de.y; it.solto = false; segurado = null; reindexar(); }

  function escolherSemente(it) {
    const tem = Object.keys(SEMENTES).filter(k => V.sementes[k] > 0);
    if (!tem.length) { flutuar('🌰 0', it.x + .5, it.y - .3); tremer(it); return; }
    menuDe = it;
    const m = $v('vila-menu');
    m.innerHTML = tem.map(k => `<button data-a="sem:${k}">${SEMENTES[k].icone}<small>${V.sementes[k]}</small></button>`).join('');
    m.hidden = false;
    posicionarMenu();
  }

  // ---------- loja: melhorias por gemas ----------
  function abrirLoja() {
    som('clique');
    const s = document.createElement('div');
    s.className = 'sobre';
    const pintar = () => {
      s.innerHTML = `<div class="caixa vila-loja"><h2 class="titulo">🛒 · 💎 ${estado.gemas}</h2><div class="mel-opcoes">${C.loja.map(o => {
        const n = estado.extras[o.id] || 0, fim = n >= o.max;
        return `<button class="mel" data-o="${o.id}"${fim || estado.gemas < o.gemas ? ' disabled' : ''}><span>${o.icone}</span><b>${o.nome}</b><small>${fim ? '✔' : '💎 ' + o.gemas} · ${n}/${o.max}</small></button>`;
      }).join('')}</div><button class="btn" id="loja-ok">Ok ▶</button></div>`;
      s.querySelector('.mel-opcoes').onclick = e => {
        const b = e.target.closest('.mel');
        if (!b || b.disabled) return;
        const o = C.loja.find(x => x.id === b.dataset.o);
        estado.gemas -= o.gemas;
        estado.extras[o.id] = (estado.extras[o.id] || 0) + 1;
        if (o.id === 'lanterna' && typeof lanternaTotal === 'function') CONFIG_LUZ.lanterna = lanternaTotal();
        salvar();
        som('bau');
        confete(24);
        if (SJ()) SJ().evento('seuTroco', 'feliz');
        pintarHUD();
        pintar();
      };
      s.querySelector('#loja-ok').onclick = () => { som('clique'); s.remove(); };
      if (SJ()) SJ().retrato(s.querySelector('.vila-loja'), 'seuTroco', { falando: true, antes: true, w: 104, h: 80 }); // Seu Troco atende
    };
    pintar();
    document.body.appendChild(s);
  }

  // ---------- laço ----------
  function quadro(ms) {
    if (!$v('t-aldeia').classList.contains('ativa')) return parar();
    const dt = ultimo ? Math.min(.05, (ms - ultimo) / 1000) : 0;
    ultimo = ms;
    atualizar(dt);
    desenhar(ms / 1000);
    raf = requestAnimationFrame(quadro);
  }
  function parar() {
    cancelAnimationFrame(raf);
    teclas.clear();
    joy.x = joy.y = 0;
    soltarSegurado();
    if (V && P) { V.heroi = { x: P.x, y: P.y }; salvar(); }
  }

  function atualizar(dt) {
    textos = textos.filter(f => (f.t += dt) < .9);
    for (const [it, a] of anim) if ((a.t += dt) > .6) anim.delete(it);
    if (chuvaT > 0) chuvaT -= dt;
    prodEm -= dt;
    if (prodEm <= 0) { prodEm = 1; produzirTudo(); }
    if (modo === 'passeio' && !document.querySelector('.sobre')) andar(dt);
    // câmera: segue o herói no passeio
    if (modo === 'passeio') {
      const ax = P.x * T - vw / 2, ay = P.y * T - vh / 2, k = 1 - Math.exp(-dt * 7);
      cam.x += (ax - cam.x) * k;
      cam.y += (ay - cam.y) * k;
      limitar();
    }
    posicionarMenu();
  }

  function direcao() {
    if (teclas.size) return [...teclas].pop();
    if (Math.hypot(joy.x, joy.y) < .25) return null;
    return Math.abs(joy.x) > Math.abs(joy.y) ? (joy.x > 0 ? 'direita' : 'esquerda') : joy.y > 0 ? 'baixo' : 'cima';
  }
  const colide = (x, y) => { const l = .5, a = .34; for (let k = Math.floor(y - a / 2); k <= Math.floor(y + a / 2 - 1e-6); k++) for (let c = Math.floor(x - l / 2); c <= Math.floor(x + l / 2 - 1e-6); c++) if (bloqueia(c, k)) return true; return false; };
  function andar(dt) {
    const d = direcao();
    P.andando = !!d;
    if (d) {
      P.dir = d;
      P.passo += dt;
      const [dx, dy] = VET[d], v = C.vel * dt;
      if (dx && !colide(P.x + dx * v, P.y)) P.x += dx * v;
      else if (dy && !colide(P.x, P.y + dy * v)) P.y += dy * v;
    }
    // chegar perto: coleta o que estiver pronto
    for (let y = Math.floor(P.y) - 2; y <= Math.floor(P.y) + 2; y++) for (let x = Math.floor(P.x) - 2; x <= Math.floor(P.x) + 2; x++) {
      const it = itemEm(x, y);
      if (!it || Math.hypot(x + .5 - P.x, y + .5 - P.y) > C.alcance) continue;
      const df = def(it.id);
      if ((df.produz && it.acc >= 1) || (it.planta && madura(it.planta))) usar(it, true);
    }
  }

  // ---------- desenho ----------
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const oval = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill(); }
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };

  function desenhar(t) {
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -cam.x * dpr * zoom, -cam.y * dpr * zoom);
    const c0 = Math.floor(cam.x / T) - 1, c1 = Math.ceil((cam.x + vw) / T) + 1, l0 = Math.floor(cam.y / T) - 1, l1 = Math.ceil((cam.y + vh) / T) + 2;
    // grama (fora da grade fica a mata escura)
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) {
      const x = c * T, y = l * T, h = hash(c, l);
      if (!dentro(c, l)) { ctx.fillStyle = h > .5 ? '#123026' : '#10291F'; ctx.fillRect(x, y, T + .5, T + .5); if (h > .7) { ctx.fillStyle = '#1A4434'; circ(ctx, x + 16, y + 14, 12); } continue; }
      ctx.fillStyle = (c + l) % 2 ? '#3B8A58' : '#378454';
      ctx.fillRect(x, y, T + .5, T + .5);
      if (h > .55) { ctx.strokeStyle = '#4FA36C'; ctx.lineWidth = 1.4; ctx.beginPath(); const gx = x + 6 + h * 18, gy = y + 10 + hash(l, c) * 14; ctx.moveTo(gx, gy + 5); ctx.lineTo(gx - 2, gy); ctx.moveTo(gx + 3, gy + 5); ctx.lineTo(gx + 4, gy - 1); ctx.stroke(); }
    }
    // borda da vila
    ctx.strokeStyle = '#0B1F18';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, N * T, N * T);
    // chão: caminhos, canteiros e flores
    const altos = [];
    for (const it of V.itens) {
      if (it.solto) continue;
      const d = def(it.id);
      if (!d) continue;
      if (it.x < c0 - 1 || it.x > c1 + 1 || it.y < l0 - 1 || it.y > l1 + 2) continue;
      if (d.caminho || d.canteiro || it.id === 'flores' || it.id === 'cogumelo') comAnim(it, () => desenharItem(ctx, it, it.x * T, it.y * T, t, vizinho));
      if (!d.caminho && it.id !== 'flores' && it.id !== 'cogumelo' && !(d.canteiro && !it.planta)) altos.push(it);
    }
    // grade (só no construir)
    if (modo === 'construir') {
      ctx.strokeStyle = '#FFFFFF1C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= N; k++) { ctx.moveTo(k * T, 0); ctx.lineTo(k * T, N * T); ctx.moveTo(0, k * T); ctx.lineTo(N * T, k * T); }
      ctx.stroke();
    }
    // coisas altas e o herói, de cima para baixo
    if (modo === 'passeio') altos.push({ heroi: true, y: P.y - .5, x: P.x });
    if (SJ()) { // aliados: Seu Broto cuida do primeiro canteiro; a Fagulha voa atrás do herói
      const cant = V.itens.find(it => !it.solto && def(it.id) && def(it.id).canteiro);
      if (cant) { const lado = itemEm(cant.x + 1, cant.y) && !itemEm(cant.x - 1, cant.y) ? -1 : 1; altos.push({ npc: 'seuBroto', x: cant.x + lado + .5, y: cant.y + .95 }); }
      if (modo === 'passeio') altos.push({ npc: 'fagulha', y: P.y + .2, x: P.x });
    }
    altos.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const it of altos) {
      if (it.heroi) { desenharHeroi(t); continue; }
      if (it.npc) { desenharAliado(it, t); continue; }
      comAnim(it, () => (it.planta ? desenharPlanta(ctx, it, it.x * T, it.y * T, t) : desenharItem(ctx, it, it.x * T, it.y * T, t, vizinho)));
    }
    // luzes suaves de lampiões e cristais
    ctx.globalCompositeOperation = 'lighter';
    for (const it of altos) {
      const d = !it.heroi && def(it.id);
      if (!d || !d.luz) continue;
      const x = it.x * T + T / 2, y = it.y * T - (it.id === 'lampiao' ? 14 : 4), g = ctx.createRadialGradient(x, y, 0, x, y, 40);
      g.addColorStop(0, d.luz + '55');
      g.addColorStop(1, d.luz + '00');
      ctx.fillStyle = g;
      ctx.fillRect(x - 40, y - 40, 80, 80);
    }
    ctx.globalCompositeOperation = 'source-over';
    // balões: produção pronta, árvore com prêmio, planta pedindo água
    for (const it of V.itens) {
      const d = def(it.id);
      if (!d || it.solto) continue;
      const bob = calmo() ? 0 : Math.sin(t * 3 + it.x) * 2;
      if (d.produz && it.acc >= 1) balao(it.x * T + T / 2, it.y * T - 30 + bob, `${C.produz[d.produz].icone}${Math.floor(it.acc)}`);
      else if (it.planta && madura(it.planta)) balao(it.x * T + T / 2, it.y * T - 46 + bob, SEMENTES[it.planta.sem].premio.gemas ? '💎' : '🪙');
      else if (it.planta && it.planta.rega !== hoje() && (triste(it.planta) || modo === 'passeio')) balao(it.x * T + T / 2, it.y * T - (it.planta.est >= 2 ? 34 : 14) + bob, '💧', true);
    }
    // construir: item escolhido na casa sob o dedo e item sendo movido
    if (modo === 'construir') {
      const alvo = segurado ? segurado.it : ferramenta ? { id: ferramenta, r: 0 } : null;
      if (alvo && hover && dentro(...hover)) {
        const ok = livre(...hover);
        ctx.globalAlpha = .6;
        ctx.fillStyle = ok ? '#22E8FF33' : '#FF3B5C44';
        ctx.fillRect(hover[0] * T, hover[1] * T, T, T);
        if (ok) { const fake = { ...alvo, x: hover[0], y: hover[1] }; alvo.planta ? desenharPlanta(ctx, fake, hover[0] * T, hover[1] * T, t) : desenharItem(ctx, fake, hover[0] * T, hover[1] * T, t, vizinho); }
        ctx.globalAlpha = 1;
      }
      if (menuDe) { ctx.strokeStyle = '#22E8FF'; ctx.lineWidth = 2; ctx.strokeRect(menuDe.x * T + 1, menuDe.y * T + 1, T - 2, T - 2); }
      if (alvo && hover && dentro(...hover) && SJ()) SJ().aliado(ctx, 'construtor', (hover[0] + 1.3) * T, (hover[1] + 1) * T, T, { trabalhando: true }); // o Construtor martela ao lado
    }
    // textos que sobem
    for (const f of textos) {
      ctx.globalAlpha = Math.min(1, (1 - f.t / .9) * 2);
      texto(f.txt, f.x * T, f.y * T - f.t * 22, 12);
    }
    ctx.globalAlpha = 1;
    // chuva do relatório
    if (chuvaT > 0) chuva(t);
  }

  function comAnim(it, fn) {
    const a = anim.get(it);
    if (!a || calmo()) return fn();
    const k = Math.min(1, a.t / .35), cx = it.x * T + T / 2, cy = it.y * T + T;
    let s = 1, dy = 0;
    if (a.tipo === 'surge') s = .3 + .7 * k + Math.sin(k * Math.PI) * .25;
    else if (a.tipo === 'cresce') s = 1 + Math.sin(k * Math.PI) * .22;
    else if (a.tipo === 'pula') dy = -Math.sin(k * Math.PI) * 5;
    else if (a.tipo === 'treme') { ctx.save(); ctx.translate(Math.sin(a.t * 60) * 2 * (1 - k), 0); fn(); ctx.restore(); return; }
    ctx.save();
    ctx.translate(cx, cy + dy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    fn();
    ctx.restore();
    if (a.tipo === 'cresce' && k < 1) { ctx.fillStyle = '#FFF6B0'; for (let j = 0; j < 5; j++) { const ang = j * 1.26 + a.t * 4; circ(ctx, cx + Math.cos(ang) * 14 * k, cy - 12 - Math.sin(ang) * 12 * k, 1.8); } }
  }
  const pulo = it => anim.set(it, { t: 0, tipo: 'pula' });
  const tremer = it => anim.set(it, { t: 0, tipo: 'treme' });
  const flutuar = (txt, x, y) => textos.push({ txt, x, y, t: 0 });
  function texto(txt, x, y, tam) {
    ctx.font = `900 ${tam}px ui-rounded, "Nunito", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#0B0F26';
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(txt, x, y);
  }
  function balao(x, y, txt, fraco) {
    ctx.font = '900 10px ui-rounded, "Nunito", system-ui, sans-serif';
    const w = Math.max(18, ctx.measureText(txt).width + 10);
    ctx.fillStyle = fraco ? '#0B1030AA' : '#0B1030E6';
    rr(ctx, x - w / 2, y - 9, w, 18, 9);
    ctx.fillStyle = fraco ? '#0B103088' : '#0B1030E6';
    ctx.beginPath(); ctx.moveTo(x - 4, y + 8); ctx.lineTo(x + 4, y + 8); ctx.lineTo(x, y + 13); ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(txt, x, y + 1);
  }
  function chuva(t) {
    if (gotas.length < 70) for (let k = 0; k < 70; k++) gotas.push({ x: Math.random(), y: Math.random(), v: .7 + Math.random() * .6 });
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = cv.width / dpr, h = cv.height / dpr, a = Math.min(1, chuvaT);
    ctx.fillStyle = `rgba(40,80,140,${.18 * a})`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(190,225,255,${.55 * a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const g of gotas) {
      const y = ((g.y + t * g.v) % 1) * h, x = (g.x * w + y * .15) % w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 10);
    }
    ctx.stroke();
    ctx.restore();
  }

  function desenharAliado(n, t) {
    if (n.npc === 'fagulha') {
      const dt = Math.min(.1, Math.max(0, t - tAnterior));
      tAnterior = t;
      if (!fagulha) fagulha = { x: P.x * T, y: P.y * T - 26 };
      if (typeof Personagens !== 'undefined') Personagens.seguir(fagulha, P.x * T, P.y * T - 4, dt, t);
      SJ().aliado(ctx, 'fagulha', fagulha.x, fagulha.y, 19, { espelho: fagulha.espelho });
      return;
    }
    const perto = modo === 'passeio' && Math.hypot(n.x - P.x, n.y - .5 - P.y) < 1.8;
    SJ().aliado(ctx, n.npc, n.x * T, n.y * T, T * 1.15, { falando: perto });
  }

  function desenharHeroi(t) {
    const x = P.x * T, y = P.y * T, pose = P.andando ? (Math.floor(P.passo * 8) % 2 ? 'anda1' : 'anda2') : 'parado', img = sprites.imgs[P.dir + pose];
    ctx.fillStyle = '#00000040';
    oval(ctx, x, y + 6, 10, 4);
    if (img && img.complete) ctx.drawImage(img, x - 14, y - 30, 28, 37);
  }
  function criarSprites() {
    const chave = JSON.stringify(estado.personagem);
    if (sprites.chave === chave) return;
    sprites = { chave, imgs: {} };
    for (const dir of Object.keys(VET)) for (const pose of ['parado', 'anda1', 'anda2']) {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(desenharPersonagem(estado.personagem, pose, dir).replace('<svg ', '<svg width="100" height="132" '));
      sprites.imgs[dir + pose] = img;
    }
  }

  // vizinho do mesmo jeito (muros e cercas se ligam; caminhos se emendam)
  function vizinho(it, dx, dy) {
    const o = itemEm(it.x + dx, it.y + dy);
    if (!o || o === it) return false;
    const a = def(it.id), b = def(o.id);
    return a.caminho ? !!(b && b.caminho) : o.id === it.id;
  }

  // ---------- arte dos itens (original, desenhada com formas simples) ----------
  function desenharItem(g, it, x, y, t, viz) {
    const d = def(it.id);
    if (!d) return;
    const v = (dx, dy) => viz(it, dx, dy), espelho = d.gira === 'lado' && it.r % 2;
    if (espelho) { g.save(); g.translate(x + T, y); g.scale(-1, 1); x = 0; y = 0; }
    if (d.carta) carta(g, x, y, d.emoji);
    else (ARTE[it.id] || ARTE.rocha)(g, x, y, it, v, t);
    if (espelho) g.restore();
  }
  function caminho(g, x, y, v, cor, borda) {
    g.fillStyle = borda;
    rr(g, x + 2, y + 2, T - 4, T - 4, 7);
    if (v(-1, 0)) g.fillRect(x, y + 2, 8, T - 4);
    if (v(1, 0)) g.fillRect(x + T - 8, y + 2, 8, T - 4);
    if (v(0, -1)) g.fillRect(x + 2, y, T - 4, 8);
    if (v(0, 1)) g.fillRect(x + 2, y + T - 8, T - 4, 8);
    g.fillStyle = cor;
    rr(g, x + 4, y + 4, T - 8, T - 8, 6);
    if (v(-1, 0)) g.fillRect(x, y + 4, 8, T - 8);
    if (v(1, 0)) g.fillRect(x + T - 8, y + 4, 8, T - 8);
    if (v(0, -1)) g.fillRect(x + 4, y, T - 8, 8);
    if (v(0, 1)) g.fillRect(x + 4, y + T - 8, T - 8, 8);
  }
  // muro, cerca e sebe: um pilar no meio e braços para cada vizinho igual
  function pilar(g, x, y, v, braco) {
    const cx = x + T / 2, cy = y + T / 2;
    if (v(-1, 0)) braco(cx - T / 2, cy, cx, cy, 'h');
    if (v(1, 0)) braco(cx, cy, cx + T / 2, cy, 'h');
    if (v(0, -1)) braco(cx, cy - T / 2, cx, cy, 'v');
    if (v(0, 1)) braco(cx, cy, cx, cy + T / 2, 'v');
  }
  function carta(g, x, y, emoji) {
    g.fillStyle = '#00000030'; oval(g, x + 16, y + 28, 11, 4);
    g.fillStyle = '#8D92A6'; rr(g, x + 7, y + 14, 18, 15, 3);
    g.fillStyle = '#B4B9CC'; rr(g, x + 5, y + 11, 22, 5, 2);
    g.font = '18px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji || '⭐', x + 16, y + 2);
  }
  const ARTE = {
    terra: (g, x, y, it, v) => { caminho(g, x, y, v, '#9A6B42', '#7C5333'); g.fillStyle = '#7C5333'; circ(g, x + 11, y + 12, 1.5); circ(g, x + 21, y + 20, 1.5); },
    pedra: (g, x, y, it, v) => { caminho(g, x, y, v, '#8C93A3', '#6B7282'); g.fillStyle = '#A9B0BF'; rr(g, x + 7, y + 7, 9, 7, 3); rr(g, x + 17, y + 9, 8, 7, 3); rr(g, x + 9, y + 17, 8, 8, 3); rr(g, x + 19, y + 19, 7, 6, 3); },
    tabua: (g, x, y, it, v) => {
      caminho(g, x, y, v, '#B07A45', '#7E5430');
      g.strokeStyle = '#7E5430'; g.lineWidth = 1.5; g.beginPath();
      for (const k of [11, 16, 21]) { if (it.r % 2) { g.moveTo(x + k, y + 4); g.lineTo(x + k, y + T - 4); } else { g.moveTo(x + 4, y + k); g.lineTo(x + T - 4, y + k); } }
      g.stroke();
    },
    seixos: (g, x, y, it, v) => { caminho(g, x, y, v, '#D9C9A3', '#B8A57C'); g.fillStyle = '#9C8F78'; for (const [a, b] of [[9, 9], [20, 11], [13, 19], [23, 22], [8, 23]]) circ(g, x + a, y + b, 2); },
    cerca: (g, x, y, it, v) => {
      pilar(g, x, y, v, (x0, y0, x1, y1, o) => { g.fillStyle = '#9A6A3A'; if (o === 'h') { g.fillRect(x0, y0 - 8, x1 - x0, 3); g.fillRect(x0, y0 - 2, x1 - x0, 3); } else { g.fillRect(x0 - 1.5, y0 - 6, 3, y1 - y0 + 2); } });
      g.fillStyle = '#00000030'; oval(g, x + 16, y + 22, 5, 2);
      g.fillStyle = '#B07A45'; rr(g, x + 13, y + 4, 6, 18, 2); g.fillStyle = '#C99560'; rr(g, x + 13, y + 3, 6, 4, 2);
    },
    muro: (g, x, y, it, v) => {
      pilar(g, x, y, v, (x0, y0, x1, y1, o) => { g.fillStyle = '#6E7486'; if (o === 'h') g.fillRect(x0, y0 - 12, x1 - x0, 18); else g.fillRect(x0 - 9, y0 - 12, 18, y1 - y0 + 6); g.fillStyle = '#9AA0B2'; if (o === 'h') g.fillRect(x0, y0 - 14, x1 - x0, 5); else g.fillRect(x0 - 9, y0 - 14, 18, y1 - y0 + 2); });
      g.fillStyle = '#5E6476'; rr(g, x + 6, y + 3, 20, 22, 3); g.fillStyle = '#A3A9BA'; rr(g, x + 6, y + 1, 20, 6, 3);
      g.strokeStyle = '#4E5466'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 6, y + 14); g.lineTo(x + 26, y + 14); g.moveTo(x + 16, y + 7); g.lineTo(x + 16, y + 14); g.stroke();
    },
    sebe: (g, x, y, it, v) => {
      pilar(g, x, y, v, (x0, y0, x1, y1, o) => { g.fillStyle = '#2E7044'; if (o === 'h') rr(g, x0, y0 - 11, x1 - x0, 18, 6); else rr(g, x0 - 9, y0 - 11, 18, y1 - y0 + 6, 6); });
      g.fillStyle = '#2E7044'; circ(g, x + 16, y + 12, 11); g.fillStyle = '#3F8F58'; circ(g, x + 13, y + 9, 6); circ(g, x + 20, y + 11, 5);
    },
    cabana: (g, x, y) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 29, 15, 4);
      g.fillStyle = '#8A5A32'; g.fillRect(x + 4, y + 8, 24, 21);
      g.fillStyle = '#C9A15A'; g.beginPath(); g.moveTo(x - 1, y + 11); g.lineTo(x + 16, y - 10); g.lineTo(x + 33, y + 11); g.closePath(); g.fill();
      g.strokeStyle = '#A9823F'; g.lineWidth = 1.5; g.beginPath(); for (const k of [2, 7, 12]) { g.moveTo(x + k, y + 9); g.lineTo(x + 16, y - 6); } g.stroke();
      g.fillStyle = '#4A2E18'; rr(g, x + 18, y + 16, 7, 13, 2);
      g.fillStyle = '#FFD27A'; g.fillRect(x + 7, y + 15, 6, 5);
    },
    casa: (g, x, y) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 30, 16, 4);
      g.fillStyle = '#E9DCC0'; g.fillRect(x + 3, y + 6, 26, 24);
      g.fillStyle = '#C8473E'; g.beginPath(); g.moveTo(x - 2, y + 9); g.lineTo(x + 16, y - 12); g.lineTo(x + 34, y + 9); g.closePath(); g.fill();
      g.fillStyle = '#A8362F'; g.fillRect(x + 22, y - 9, 5, 9);
      g.fillStyle = '#6B4226'; rr(g, x + 18, y + 17, 8, 13, 2);
      g.fillStyle = '#FFD27A'; g.fillRect(x + 6, y + 13, 8, 7); g.fillStyle = '#E9DCC0'; g.fillRect(x + 9.5, y + 13, 1, 7);
    },
    celeiro: (g, x, y) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 30, 16, 4);
      g.fillStyle = '#B23A35'; g.fillRect(x + 2, y + 6, 28, 24);
      g.fillStyle = '#7A2622'; g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 8, y - 6); g.lineTo(x + 24, y - 6); g.lineTo(x + 32, y + 8); g.closePath(); g.fill();
      g.fillStyle = '#F2E6D0'; g.fillRect(x + 10, y + 14, 12, 16);
      g.strokeStyle = '#B23A35'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 10, y + 14); g.lineTo(x + 22, y + 30); g.moveTo(x + 22, y + 14); g.lineTo(x + 10, y + 30); g.stroke();
    },
    torre: (g, x, y) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 30, 13, 4);
      g.fillStyle = '#7D8496'; g.fillRect(x + 6, y - 10, 20, 40);
      g.fillStyle = '#5B6274'; for (let k = 0; k < 4; k++) g.fillRect(x + 6 + (k % 2) * 10, y - 4 + k * 9, 10, 1.5);
      g.fillStyle = '#4C3B8C'; g.beginPath(); g.moveTo(x + 3, y - 9); g.lineTo(x + 16, y - 32); g.lineTo(x + 29, y - 9); g.closePath(); g.fill();
      g.fillStyle = '#FFD27A'; rr(g, x + 13, y + 2, 6, 8, 3);
      g.fillStyle = '#3E2A18'; rr(g, x + 12, y + 20, 8, 10, 3);
    },
    canteiro: (g, x, y) => {
      g.fillStyle = '#6B4A2E'; rr(g, x + 3, y + 5, T - 6, T - 8, 5);
      g.fillStyle = '#4A321E'; rr(g, x + 5, y + 7, T - 10, T - 12, 4);
      g.strokeStyle = '#5E4128'; g.lineWidth = 1.2; g.beginPath(); for (const k of [12, 18, 24]) { g.moveTo(x + 7, y + k); g.lineTo(x + T - 7, y + k); } g.stroke();
    },
    flores: (g, x, y, it, v, t) => { const cores = ['#FF7AA8', '#FFD43B', '#B07CFF', '#FFFFFF']; for (let k = 0; k < 5; k++) { const a = x + 6 + hash(it.x + k, it.y) * 20, b = y + 8 + hash(it.y, it.x + k) * 18; g.fillStyle = '#2E7044'; g.fillRect(a - .6, b, 1.2, 5); g.fillStyle = cores[k % 4]; circ(g, a, b, 2.6); g.fillStyle = '#FFE08A'; circ(g, a, b, 1); } },
    girassol: (g, x, y, it, v, t) => {
      const s = calmo() ? 0 : Math.sin(t * 1.5 + it.x) * 1.5;
      g.strokeStyle = '#2E7044'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 16, y + 26); g.lineTo(x + 16 + s, y + 2); g.stroke();
      g.fillStyle = '#3F8F58'; oval(g, x + 12, y + 16, 4, 2); oval(g, x + 20, y + 19, 4, 2);
      g.fillStyle = '#FFC531'; for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; circ(g, x + 16 + s + Math.cos(a) * 5, y + 1 + Math.sin(a) * 5, 3); }
      g.fillStyle = '#6B4226'; circ(g, x + 16 + s, y + 1, 3.5);
    },
    arbusto: (g, x, y) => { g.fillStyle = '#00000030'; oval(g, x + 16, y + 26, 12, 4); g.fillStyle = '#2E7044'; circ(g, x + 11, y + 18, 8); circ(g, x + 21, y + 18, 8); circ(g, x + 16, y + 12, 9); g.fillStyle = '#4FA36C'; circ(g, x + 13, y + 10, 4); g.fillStyle = '#FF7AA8'; circ(g, x + 20, y + 14, 1.8); circ(g, x + 10, y + 19, 1.8); },
    cogumelo: (g, x, y, it) => { for (const [a, b, s] of [[12, 20, 1], [21, 23, .75]]) { g.fillStyle = '#F2E6D0'; g.fillRect(x + a - 2 * s, y + b - 2, 4 * s, 7 * s); g.fillStyle = '#E04A4A'; g.beginPath(); g.ellipse(x + a, y + b - 2, 7 * s, 5 * s, 0, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; circ(g, x + a - 2 * s, y + b - 4 * s, 1.2); circ(g, x + a + 3 * s, y + b - 3 * s, 1); } },
    banco: (g, x, y, it) => {
      g.fillStyle = '#00000030'; oval(g, x + 16, y + 25, 13, 3);
      g.save(); if (it.r % 2) { g.translate(x + 16, y + 16); g.rotate(Math.PI / 2); g.translate(-x - 16, -y - 16); }
      g.fillStyle = '#5A3A1E'; g.fillRect(x + 6, y + 18, 3, 7); g.fillRect(x + 23, y + 18, 3, 7);
      g.fillStyle = '#B07A45'; rr(g, x + 3, y + 14, 26, 5, 2); rr(g, x + 3, y + 7, 26, 4, 2);
      g.restore();
    },
    lampiao: (g, x, y, it, v, t) => {
      g.fillStyle = '#00000030'; oval(g, x + 16, y + 27, 6, 2.5);
      g.fillStyle = '#2C3346'; g.fillRect(x + 15, y - 6, 3, 33); g.fillRect(x + 11, y + 24, 11, 3);
      g.fillStyle = '#2C3346'; rr(g, x + 10, y - 14, 13, 4, 2);
      const f = calmo() ? 1 : .85 + Math.sin(t * 9 + it.x) * .15;
      g.fillStyle = `rgba(255,${190 + 40 * f},120,1)`; rr(g, x + 11, y - 10, 11, 9, 2);
    },
    barril: (g, x, y) => { g.fillStyle = '#00000030'; oval(g, x + 16, y + 27, 9, 3); g.fillStyle = '#9A6A3A'; rr(g, x + 8, y + 6, 16, 21, 6); g.fillStyle = '#6B4226'; g.fillRect(x + 8, y + 10, 16, 2); g.fillRect(x + 8, y + 21, 16, 2); g.fillStyle = '#B88450'; oval(g, x + 16, y + 7, 8, 3); },
    rocha: (g, x, y) => { g.fillStyle = '#00000030'; oval(g, x + 16, y + 26, 12, 3.5); g.fillStyle = '#7D8496'; g.beginPath(); g.moveTo(x + 5, y + 26); g.lineTo(x + 9, y + 12); g.lineTo(x + 18, y + 8); g.lineTo(x + 27, y + 15); g.lineTo(x + 28, y + 26); g.closePath(); g.fill(); g.fillStyle = '#9AA0B2'; g.beginPath(); g.moveTo(x + 10, y + 13); g.lineTo(x + 18, y + 9); g.lineTo(x + 20, y + 17); g.closePath(); g.fill(); },
    placa: (g, x, y) => { g.fillStyle = '#00000030'; oval(g, x + 16, y + 27, 6, 2.5); g.fillStyle = '#7E5430'; g.fillRect(x + 14, y + 8, 4, 19); g.fillStyle = '#B07A45'; g.beginPath(); g.moveTo(x + 6, y + 4); g.lineTo(x + 24, y + 4); g.lineTo(x + 29, y + 9); g.lineTo(x + 24, y + 14); g.lineTo(x + 6, y + 14); g.closePath(); g.fill(); g.fillStyle = '#7E5430'; g.fillRect(x + 9, y + 8, 12, 1.5); },
    poco: (g, x, y, it, v, t) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 28, 14, 4);
      g.fillStyle = '#7D8496'; rr(g, x + 3, y + 12, 26, 15, 6);
      g.fillStyle = '#2A5A8A'; oval(g, x + 16, y + 14, 10, 4);
      g.fillStyle = '#5B6274'; g.fillRect(x + 5, y - 6, 3, 20); g.fillRect(x + 24, y - 6, 3, 20);
      g.fillStyle = '#8A3A2E'; g.beginPath(); g.moveTo(x + 1, y - 4); g.lineTo(x + 16, y - 13); g.lineTo(x + 31, y - 4); g.closePath(); g.fill();
      g.fillStyle = '#9A6A3A'; rr(g, x + 13, y + 2 + (calmo() ? 0 : Math.sin(t * 2) * 1.5), 6, 6, 2);
    },
    moinho: (g, x, y, it, v, t) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 30, 13, 4);
      g.fillStyle = '#E9DCC0'; g.beginPath(); g.moveTo(x + 7, y + 30); g.lineTo(x + 10, y - 4); g.lineTo(x + 22, y - 4); g.lineTo(x + 25, y + 30); g.closePath(); g.fill();
      g.fillStyle = '#C8473E'; g.beginPath(); g.moveTo(x + 8, y - 3); g.lineTo(x + 16, y - 13); g.lineTo(x + 24, y - 3); g.closePath(); g.fill();
      g.fillStyle = '#6B4226'; rr(g, x + 13, y + 20, 6, 10, 3);
      const a = calmo() ? .4 : t * 1.4;
      g.save(); g.translate(x + 16, y - 2); g.rotate(a);
      for (let k = 0; k < 4; k++) { g.rotate(TAU / 4); g.fillStyle = '#7E5430'; g.fillRect(-1, 0, 2, 17); g.fillStyle = '#F2E6D0'; g.fillRect(1, 4, 5, 12); }
      g.restore();
      g.fillStyle = '#4A321E'; circ(g, x + 16, y - 2, 2.5);
    },
    fonte: (g, x, y, it, v, t) => {
      g.fillStyle = '#00000038'; oval(g, x + 16, y + 28, 15, 4);
      g.fillStyle = '#9AA0B2'; oval(g, x + 16, y + 22, 14, 7);
      g.fillStyle = '#3A8FD8'; oval(g, x + 16, y + 21, 11, 5);
      g.fillStyle = '#9AA0B2'; g.fillRect(x + 14, y + 6, 4, 15);
      const s = calmo() ? 0 : Math.sin(t * 6) * 1.5;
      g.fillStyle = '#9FD8FF'; circ(g, x + 16, y + 3 + s, 3); circ(g, x + 11, y + 10 - s, 1.8); circ(g, x + 21, y + 10 + s, 1.8);
    },
    cristal: (g, x, y, it, v, t) => {
      g.fillStyle = '#00000030'; oval(g, x + 16, y + 27, 9, 3);
      const s = calmo() ? 0 : Math.sin(t * 2) * 2;
      g.fillStyle = '#3BC9E0'; g.beginPath(); g.moveTo(x + 16, y - 8 + s); g.lineTo(x + 24, y + 10 + s); g.lineTo(x + 16, y + 24); g.lineTo(x + 8, y + 10 + s); g.closePath(); g.fill();
      g.fillStyle = '#B8FBFF'; g.beginPath(); g.moveTo(x + 16, y - 8 + s); g.lineTo(x + 12, y + 10 + s); g.lineTo(x + 16, y + 8 + s); g.closePath(); g.fill();
    }
  };

  // plantas nos canteiros: semente, broto, muda e árvore (tristes ficam murchas e sem cor)
  function desenharPlanta(g, it, x, y, t) {
    ARTE.canteiro(g, x, y);
    const pl = it.planta, s = SEMENTES[pl.sem] || SEMENTES.carvalho, tris = triste(pl), bal = calmo() ? 0 : Math.sin(t * 1.6 + it.x * 2) * (tris ? .5 : 1.2);
    const folha = tris ? '#7E8A4E' : pl.sem === 'brilhante' ? '#3FE0C0' : '#4FB36C', escura = tris ? '#5E683A' : pl.sem === 'brilhante' ? '#1FA898' : '#2E7044';
    const cx = x + 16, base = y + 20;
    if (pl.est === 0) { g.fillStyle = '#7A5431'; oval(g, cx, base, 6, 3); g.fillStyle = '#C9A15A'; oval(g, cx, base - 2, 2.5, 2); return; }
    if (pl.est === 1) { g.strokeStyle = escura; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, base); g.lineTo(cx + bal, base - 7); g.stroke(); g.fillStyle = folha; oval(g, cx - 3 + bal, base - 8 + (tris ? 2 : 0), 3.5, 2); oval(g, cx + 3 + bal, base - 8 + (tris ? 2 : 0), 3.5, 2); return; }
    if (pl.est === 2) {
      g.strokeStyle = '#7A5431'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx, base); g.lineTo(cx + bal, base - 16); g.stroke();
      g.fillStyle = folha; for (const [a, b] of [[-5, -11], [5, -13], [-3, -17], [4, -18]]) oval(g, cx + a + bal, base + b + (tris ? 3 : 0), 4, 2.4);
      return;
    }
    // árvore adulta
    g.fillStyle = '#00000038'; oval(g, cx, y + 27, 13, 4);
    g.fillStyle = '#6B4226'; g.fillRect(cx - 2.5, y + 2, 5, 23);
    if (pl.sem === 'pinheiro') {
      g.fillStyle = escura; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx - 13 + k * 2 + bal, y + 10 - k * 9); g.lineTo(cx + bal * .5, y - 8 - k * 9); g.lineTo(cx + 13 - k * 2 + bal, y + 10 - k * 9); g.closePath(); g.fill(); }
    } else {
      g.fillStyle = escura; circ(g, cx - 7 + bal, y - 2, 9); circ(g, cx + 7 + bal, y - 2, 9); circ(g, cx + bal, y - 10, 11);
      g.fillStyle = folha; circ(g, cx - 3 + bal, y - 12, 5); circ(g, cx + 6 + bal, y - 5, 4);
      if (pl.sem === 'macieira' && madura(pl)) { g.fillStyle = '#FF4B5C'; for (const [a, b] of [[-8, 0], [6, -9], [2, 1], [-3, -10]]) circ(g, cx + a + bal, y + b, 2.6); }
    }
    if (pl.sem === 'brilhante' && !tris) {
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) { const a = t * (calmo() ? 0 : 1.2) + k * 1.26, r = 12 + Math.sin(t * 2 + k) * 3; g.fillStyle = '#FFF6B088'; circ(g, cx + Math.cos(a) * r, y - 6 + Math.sin(a) * r * .6, 1.8); }
      g.globalCompositeOperation = 'source-over';
    }
  }

  // miniatura do item para a barra (desenhada com a mesma arte)
  function previa(id) {
    if (previas[id]) return previas[id];
    const c = document.createElement('canvas');
    c.width = 72; c.height = 84;
    const g = c.getContext('2d'), d = def(id);
    g.scale(1.6, 1.6);
    const it = { id, x: 0, y: 0, r: 0 }, viz = (o, dx) => !!(d.liga || d.caminho) && dx !== 0;
    if (d.canteiro) ARTE.canteiro(g, 6.5, 18);
    else desenharItem(g, it, 6.5, 18, 0, viz);
    return (previas[id] = c.toDataURL());
  }

  // ---------- eventos do resto do app ----------
  // estudo: a cada 5 acertos, 1 balde; no 1º acerto do dia, semente e dias seguidos (árvore brilhante)
  function estudo(certo) {
    if (!certo) return;
    garantir();
    V.acertos++;
    if (V.acertos % C.baldePorAcertos === 0) { V.baldes++; toast('🪣 +1'); }
    const h = hoje();
    if (V.estudo.dia !== h) {
      V.estudo.seguidos = V.estudo.dia === h - 1 ? V.estudo.seguidos + 1 : 1;
      V.estudo.dia = h;
      sementes(C.sementes.diaDeEstudo);
      if (V.estudo.seguidos % C.diasBrilhante === 0) { nascerBrilhante(); toast(`✨ 🌳 ${V.estudo.seguidos} 🔥`); }
      else toast(`🌰 +${C.sementes.diaDeEstudo}`);
    }
  }
  // sementes sorteadas pelo peso; devolve o ícone para mostrar
  function sementes(n) {
    garantir();
    const lista = Object.entries(SEMENTES).filter(([, s]) => s.peso > 0), total = lista.reduce((a, [, s]) => a + s.peso, 0);
    for (let k = 0; k < n; k++) {
      let x = Math.random() * total, i = 0;
      while (i < lista.length - 1 && (x -= lista[i][1].peso) > 0) i++;
      V.sementes[lista[i][0]] = (V.sementes[lista[i][0]] || 0) + 1;
    }
    return '🌰';
  }
  function gemas(n) { estado.gemas = (estado.gemas || 0) + n; }
  function bau(ouro) {
    const n = ouro ? C.sementes.ouro : Math.random() < C.sementes.bau ? 1 : 0;
    if (n) { sementes(n); toast(`🌰 +${n}`); }
  }
  function chefao() {
    gemas(C.gemas.chefao);
    sementes(C.sementes.chefao);
    toast(`💎 +${C.gemas.chefao}  🌰 +${C.sementes.chefao}`);
  }
  // relatório de 15 min enviado: +1 nível de produção hoje e chuva que rega todas as plantas
  addEventListener('mohamed:relatorio', () => {
    garantir();
    if (V.itens.some(i => def(i.id) && def(i.id).produz)) produzirTudo(); // o que já tinha sido produzido fica no nível antigo
    V.niveis[hoje()] = nivelHoje() + 1;
    for (const it of V.itens) if (it.planta) regar(it, true);
    V.chuva = Date.now();
    salvar();
  });

  return {
    abrir, estudo, sementes, gemas, bau, chefao,
    info: () => (garantir(), { itens: V.itens.length, modo, ferramenta, baldes: V.baldes, sementes: { ...V.sementes }, nivel: nivelHoje(), P: P && { x: P.x, y: P.y } }),
    _dev: { V: () => V, tocar, usar: it => usar(it), cam, P: () => P, diaNum, reindexar, desenhar: () => desenhar(0) }
  };
})();
