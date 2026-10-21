// Mohamed — jogo.js: masmorra vista de cima (Canvas), batalha por turnos e desafios de baús e portas

// confete das conquistas (também usado em app.js)
function confete(qtd = 70) {
  const caixa = document.createElement('div');
  caixa.className = 'confete';
  const cores = ['#7B2FF7', '#FFC531', '#1FC46B', '#FF4B5C', '#38BDF8', '#FF4FD8'];
  for (let i = 0; i < qtd; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${Math.random() * 100}%;background:${cores[i % cores.length]};--dx:${Math.random() * 160 - 80}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * .3}s;animation-duration:${1.2 + Math.random() * .8}s`;
    caixa.appendChild(p);
  }
  document.body.appendChild(caixa);
  setTimeout(() => caixa.remove(), 2600);
}

// =====================================================================
// DESAFIOS de baús e portas: arrastar para ℕ ou ℤ, ligar, ordenar, reta e fila
// =====================================================================
const Jogo = (() => {
  let el = {}, ocupado = false;
  const tremer = x => { x.classList.remove('treme'); void x.offsetWidth; x.classList.add('treme'); };

  // ---------- painéis ----------
  function abrirPainel(cls, html) {
    const p = document.createElement('div');
    p.className = 'painel ' + cls;
    p.innerHTML = html;
    el.palco.appendChild(p);
    el.painel = p;
    return p;
  }

  // controla os passos de um painel: cada acerto ou erro faz o personagem reagir
  function passos(total, fim) {
    let restam = total, errou = false, conta = null;
    return {
      certo() { el.reagir(true); if (--restam === 0) fim(!errou, { dada: errou ? conta : 'ok', conta }); },
      errado(c, ...fichas) { errou = true; conta = conta || c; fichas.forEach(tremer); el.reagir(false); }
    };
  }

  // (1) arrastar (ou tocar e tocar) cada número para ℕ ou ℤ
  function pConjunto(ex, fim) {
    const p = abrirPainel('p-conjunto',
      `<div class="fichas">${ex.itens.map((it, k) => `<button class="ficha" data-k="${k}">${it.t}</button>`).join('')}</div>` +
      '<div class="conj cz" data-conj="ℤ"><b class="rot">ℤ</b><div class="conj cn" data-conj="ℕ"><b class="rot">ℕ</b><div class="dentro"></div></div><div class="dentro"></div></div>');
    const passo = passos(ex.itens.length, fim);
    let sel = null;
    const colocar = (f, alvo) => {
      const it = ex.itens[f.dataset.k];
      f.classList.remove('sel', 'arrasta');
      f.style.transform = '';
      sel = null;
      if (it.alvo === alvo) {
        f.classList.add('ok');
        f.disabled = true;
        p.querySelector(`[data-conj="${alvo}"] > .dentro`).appendChild(f);
        passo.certo();
      } else passo.errado(`${it.t} em ${alvo}`, f);
    };
    p.querySelectorAll('.ficha').forEach(f => {
      let x0 = null, y0 = 0, moveu = false;
      f.onpointerdown = e => {
        if (f.disabled || ocupado) return;
        x0 = e.clientX; y0 = e.clientY; moveu = false;
        f.setPointerCapture(e.pointerId);
      };
      f.onpointermove = e => {
        if (x0 === null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!moveu && Math.hypot(dx, dy) < 8) return;
        moveu = true;
        f.classList.add('arrasta');
        f.style.transform = `translate(${dx}px,${dy}px)`;
      };
      f.onpointerup = e => {
        if (x0 === null) return;
        x0 = null;
        if (!moveu) { // toque: seleciona e depois toca no conjunto
          p.querySelectorAll('.ficha.sel').forEach(o => o !== f && o.classList.remove('sel'));
          f.classList.toggle('sel');
          sel = f.classList.contains('sel') ? f : null;
          som('clique');
          return;
        }
        f.style.visibility = 'hidden';
        const alvo = document.elementFromPoint(e.clientX, e.clientY);
        f.style.visibility = '';
        const conj = alvo && alvo.closest('[data-conj]');
        if (conj) colocar(f, conj.dataset.conj);
        else { f.classList.remove('arrasta'); f.style.transform = ''; }
      };
      f.onpointercancel = () => { x0 = null; f.classList.remove('arrasta'); f.style.transform = ''; };
    });
    p.querySelectorAll('[data-conj]').forEach(c => c.addEventListener('click', e => {
      e.stopPropagation(); // ℕ fica dentro de ℤ: vale o conjunto mais de dentro
      if (sel && !ocupado) colocar(sel, c.dataset.conj);
    }));
  }

  // (2) ligar conta e resultado: toque num lado e depois no outro
  function pLigar(ex, fim) {
    const lado = (l, lista) => `<div class="col">${lista.map(o => `<button class="ficha" data-lado="${l}" data-v="${o.v}">${o.t}</button>`).join('')}</div>`;
    const esq = embaralhar(ex.pares.map(([c, r]) => ({ t: c, v: String(r) })));
    const dir = embaralhar(ex.pares.map(([, r]) => ({ t: typeof r === 'number' ? fmt(r) : r, v: String(r) })));
    const p = abrirPainel('p-ligar', lado('e', esq) + lado('d', dir));
    const passo = passos(ex.pares.length, fim);
    let sel = null;
    p.onclick = e => {
      const f = e.target.closest('.ficha');
      if (!f || f.disabled || ocupado) return;
      if (sel === f) { f.classList.remove('sel'); sel = null; return; }
      if (!sel || sel.dataset.lado === f.dataset.lado) {
        if (sel) sel.classList.remove('sel');
        sel = f;
        f.classList.add('sel');
        som('clique');
        return;
      }
      const a = sel;
      sel = null;
      a.classList.remove('sel');
      if (a.dataset.v === f.dataset.v) {
        [a, f].forEach(x => { x.classList.add('ok'); x.disabled = true; });
        passo.certo();
      } else passo.errado((a.dataset.lado === 'e' ? a : f).textContent, a, f);
    };
  }

  // ordenar: toque nos números na ordem certa
  function pOrdenar(ex, fim) {
    const ordem = ex.itens.slice().sort((a, b) => (ex.decrescente ? b - a : a - b));
    const sinal = `<span class="sinal">${ex.decrescente ? '&gt;' : '&lt;'}</span>`;
    const p = abrirPainel('p-ordenar',
      `<div class="fichas">${embaralhar(ex.itens).map(n => `<button class="ficha" data-v="${n}">${fmt(n)}</button>`).join('')}</div>` +
      `<div class="vagas">${ordem.map(() => '<i class="vaga"></i>').join(sinal)}</div>`);
    const passo = passos(ordem.length, fim);
    let k = 0;
    p.onclick = e => {
      const f = e.target.closest('.ficha');
      if (!f || f.disabled || ocupado) return;
      if (+f.dataset.v !== ordem[k]) return passo.errado(`Ordenar ${ex.itens.map(fmt).join(', ')}`, f);
      const vaga = p.querySelectorAll('.vaga')[k++];
      vaga.textContent = f.textContent;
      vaga.classList.add('cheia');
      f.disabled = true;
      f.classList.add('usada');
      passo.certo();
    };
  }

  // (etapa 10) posicionar um número tocando na reta
  function pReta(ex, fim) {
    const { min, max } = ex, W = 300, x0 = 14, passo = (W - 2 * x0) / (max - min);
    const X = v => x0 + (v - min) * passo;
    const rot = ex.rotulos || [min, 0, max].filter(v => v >= min && v <= max);
    let s = `<svg viewBox="0 0 ${W} 70"><line x1="4" y1="34" x2="${W - 4}" y2="34" stroke="#1E1240" stroke-width="3" stroke-linecap="round"/>`;
    for (let v = min; v <= max; v++) {
      const z = v === 0;
      s += `<line x1="${X(v)}" y1="${z ? 24 : 28}" x2="${X(v)}" y2="${z ? 44 : 40}" stroke="#1E1240" stroke-width="${z ? 3 : 2}"/>`;
      if (rot.includes(v)) s += `<text x="${X(v)}" y="62" text-anchor="middle" font-size="15" font-weight="900" fill="#1E1240">${fmt(v)}</text>`;
    }
    const p = abrirPainel('p-reta', s + '<g class="marcas"></g></svg>');
    const svg = p.querySelector('svg');
    const pino = (v, cor) => `<g transform="translate(${X(v)} 34)"><path d="M0 -3 L-7 -16 H7Z" fill="${cor}"/><circle cy="-21" r="9" fill="${cor}" stroke="#fff" stroke-width="2"/></g>`;
    svg.onpointerdown = e => {
      if (ocupado || svg.dataset.feito) return;
      const r = svg.getBoundingClientRect();
      const v = Math.max(min, Math.min(max, Math.round(((e.clientX - r.left) * (W / r.width) - x0) / passo + min)));
      const certo = v === ex.resposta;
      svg.dataset.feito = 1;
      svg.querySelector('.marcas').innerHTML = (certo ? '' : pino(ex.resposta, '#1FC46B')) + pino(v, certo ? '#1FC46B' : '#FF4B5C');
      fim(certo, { dada: fmt(v), conta: ex.conta || ex.pergunta });
    };
  }

  // ordem das operações: toque nas operações na ordem em que são feitas
  function pFila(ex, fim) {
    const toks = ex.tokens.map(t => (t.op ? `<button class="op" data-id="${t.id}">${t.op}</button>` : `<span>${t.t}</span>`)).join('');
    const p = abrirPainel('p-fila', `<div class="expr">${toks}</div><div class="vagas">${ex.ordem.map((_, i) => `<i class="vaga">${i + 1}º</i>`).join('')}</div>`);
    const passo = passos(ex.ordem.length, fim);
    let k = 0;
    p.onclick = e => {
      const b = e.target.closest('.op');
      if (!b || b.disabled || ocupado) return;
      if (+b.dataset.id !== ex.ordem[k]) return passo.errado(ex.conta || ex.pergunta, b);
      const vaga = p.querySelectorAll('.vaga')[k];
      vaga.textContent = ex.passos[k];
      vaga.classList.add('cheia');
      b.disabled = true;
      b.dataset.n = ++k;
      b.classList.add('feita');
      passo.certo();
    };
  }

  const PAINEIS = { conjunto: pConjunto, ligar: pLigar, ordenar: pOrdenar, reta: pReta, fila: pFila };

  // abre o painel do exercício dentro da caixa; "reagir" responde a cada passo
  function desafio(caixa, ex, fim, reagir) {
    ocupado = false;
    caixa.innerHTML = '';
    el = { palco: caixa, reagir, painel: null };
    PAINEIS[ex.tipo](ex, fim);
    if (el.painel) el.painel.classList.add('solto');
  }

  return { desafio, tipos: Object.keys(PAINEIS) };
})();

// =====================================================================
// MASMORRA vista de cima (Canvas): mapas com câmera, névoa, luz, furtividade, armadilhas e puzzles.
// Mapas e receitas: mapas.js (+ mapas1.js…) · biomas.js · monstros.js · perigos.js · puzzles.js
// =====================================================================

// ---------- monstros originais por tema ----------
const TEMAS_MONSTRO = ['Natural', 'Negativo', 'Tabuada', 'Divisão'];
const ICONE_TEMA = { Natural: '🌿', Negativo: '❄️', Tabuada: '✖️', 'Divisão': '➗' };
const NOMES_CHEFE = { Natural: 'Rei Raizão', Negativo: 'Rainha Geleira', Tabuada: 'Vulcão Supremo', 'Divisão': 'Maré Gigante' };
const NOMES_MONSTRO = {
  Natural: ['Brotão', 'Folhito', 'Raizudo'],
  Negativo: ['Friúncio', 'Gelatão', 'Nevisco'],
  Tabuada: ['Brasinha', 'Lavito', 'Fumacê'],
  'Divisão': ['Bolhudo', 'Gotão', 'Marolo']
};
// sprites desenhados por código (sprites_jogo.js); sem eles, fica a arte antiga
const SJ = () => (typeof SpritesJogo !== 'undefined' ? SpritesJogo : null);

function desenharMonstro(tema, chefe = false) {
  const K = '#1E1240', T = `stroke="${K}" stroke-width="4" stroke-linejoin="round"`;
  const olho = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${T}/><circle cx="${x - 2}" cy="${y + 1}" r="${r / 2}" fill="${K}"/>`;
  const traco = d => `<path d="${d}" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>`;
  const ARTE = {
    // broto com uma folha de cada lado e um olho só
    Natural: `<path d="M50 26 Q38 6 22 12 Q32 28 50 26Z M50 26 Q62 4 80 10 Q70 28 50 26Z" fill="#86EFAC" ${T}/>${traco('M50 26 V36')}<ellipse cx="50" cy="64" rx="38" ry="32" fill="#22C55E" ${T}/>` + olho(50, 56, 14) + traco('M38 76 Q50 84 62 76'),
    // bloco de gelo com pontas; a boca é um sinal de menos
    Negativo: `<path d="M22 42 L30 12 L40 36 L50 6 L60 36 L70 12 L78 42Z" fill="#E0F2FE" ${T}/><rect x="14" y="34" width="72" height="62" rx="30" fill="#60A5FA" ${T}/>` + olho(38, 58, 10) + olho(62, 58, 10) + traco('M40 80 H60'),
    // chama de lava brava; a boca é um ×
    Tabuada: `<path d="M50 6 Q66 26 74 34 Q92 52 84 74 Q76 96 50 96 Q24 96 16 74 Q8 52 26 34 Q34 26 50 6Z" fill="#F97316" ${T}/><path d="M50 42 Q62 56 60 70 Q56 84 50 84 Q44 84 40 70 Q38 56 50 42Z" fill="#FDE047"/>` + olho(36, 56, 10) + olho(64, 56, 10) + traco('M26 42 L44 48 M74 42 L56 48') + traco('M44 72 L56 84 M56 72 L44 84'),
    // gota com bolhas; a boca é um ÷
    'Divisão': `<path d="M50 4 Q72 36 82 56 Q92 92 50 96 Q8 92 18 56 Q28 36 50 4Z" fill="#22D3EE" ${T}/><circle cx="28" cy="30" r="5" fill="#CFFAFE" ${T}/><circle cx="76" cy="24" r="4" fill="#CFFAFE" ${T}/>` + olho(38, 58, 10) + olho(62, 58, 10) + traco('M40 80 H60') + `<circle cx="50" cy="73" r="3" fill="${K}"/><circle cx="50" cy="87" r="3" fill="${K}"/>`
  };
  const coroa = chefe ? `<path d="M28 16 L34 -6 L44 6 L50 -10 L56 6 L66 -6 L72 16Z" fill="#FFC531" ${T}/><circle cx="50" cy="3" r="3.5" fill="#FF4B5C"/>` : '';
  return `<svg viewBox="0 ${chefe ? -14 : 0} 100 ${chefe ? 114 : 100}" xmlns="http://www.w3.org/2000/svg">${ARTE[tema] || ARTE.Natural}${coroa}</svg>`;
}

const Masmorra = (() => {
  const T = 32, VEL = 3.4, VISTA = 11;                           // px por casa · casas por segundo · casas na largura da tela
  const CORPO = { l: .56, a: .44 };                              // caixa de colisão dos pés (em casas)
  const CF = CONFIG_MONSTROS, CP = CONFIG_PERIGOS;
  const VETOR = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
  const TECLAS = { arrowup: 'cima', arrowdown: 'baixo', arrowleft: 'esquerda', arrowright: 'direita', w: 'cima', s: 'baixo', a: 'esquerda', d: 'direita' };
  const NEVOA = '#05060C', SOLIDO = '#~STFBbRNGgD';
  const menos = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const calmo = () => !!(menos && menos.matches);              // "reduzir movimento": sem balanço, partículas e tremor

  let M = null, cv = null, ctx = null, raf = 0, ligado = false, cache = { chave: '', imgs: {} }, shift = false;
  let vw = 0, vh = 0, zoom = 1, dpr = 1;
  const joy = { x: 0, y: 0 }, teclas = new Set(), artes = {};
  const sombra = document.createElement('canvas'), sctx = sombra.getContext('2d');
  const fixa = document.createElement('canvas'), fctx = fixa.getContext('2d');
  let chaveFixa = '';

  const casa = (c, l) => { const G = M.mapa; return c < 0 || l < 0 || c >= G.C || l >= G.L ? '#' : G.g[l][c]; };
  const escuro = () => M.bio.luz < .7;
  function cumprido() {
    const G = M.mapa;
    switch (G.objetivo) {
      case 'monstros': return !G.monstros.length;
      case 'puzzle': return Puzzles.todosResolvidos(G);
      case 'minichefe': return !G.monstros.some(m => m.mini);
      case 'chefe': return !G.monstros.some(m => m.chefe);
      default: return true;
    }
  }
  function solido(c, l) {
    const ch = casa(c, l), G = M.mapa;
    if (ch === '~' && Puzzles.pedra(G, c, l)) return false;
    return SOLIDO.includes(ch) || ch === 'P' || (ch === 'X' && !cumprido()) || Perigos.solido(G, c, l) || Puzzles.solido(G, c, l);
  }
  const paredeEm = (c, l) => '#TPD'.includes(casa(c, l)); // para tiros e linhas de armadilha

  // ---------- o que os outros arquivos (perigos.js e puzzles.js) podem pedir ----------
  const api = {
    heroi: () => M.P,
    get bio() { return M.bio; },
    get bioma() { return M.nome; },
    parede: paredeEm, livre: (c, l) => !solido(c, l),
    ferir: (x, y, op) => ferir(x, y, op),
    empurrar: (x, y, dist) => ferir(x, y, { dano: 0, empurra: dist }),
    prender: seg => { M.P.preso = seg; },
    levarPara: (c, l) => { M.P.x = c + .5; M.P.y = l + .5; M.P.desliza = null; M.P.recuo = null; M.P.casa = -1; },
    quebrou: p => { const c = Math.floor(M.P.x), l = Math.floor(M.P.y); if (c >= p.c && c < p.c + p.w && l >= p.l && l < p.l + p.h) cair(); },
    flutuar: (txt, x, y) => flutuar(txt, x, y),
    som: nome => (['clique', 'acerto', 'erro', 'golpe', 'moeda', 'porta', 'vitoria', 'derrota', 'bau', 'chefe', 'espreita'].includes(nome) ? Audio2.sfx(nome) : som(nome)),
    moeda: n => M.op.aoMoeda(n),
    gema: n => { if (M.op.aoGema) M.op.aoGema(n); },
    bau: (c, l) => { M.mapa.g[l][c] = 'B'; M.mapa.extras.push(`${c}:${l}`); },
    abrirPorta: (c, l) => { M.mapa.g[l][c] = '.'; M.P.casa = -1; },
    fecharPorta: (c, l) => { M.mapa.g[l][c] = 'D'; },
    registrar: (certo, conta, tema) => M.op.aoRegistro(certo, conta, tema),
    dia: () => M.op.dia,
    toast: txt => toast(txt),
    inicioMapa: () => M.mapa.inicio,
    jaResolvido: k => M.prog.pegos.includes(`pz:${M.mapa.i}:${k}`),
    resolvido: pz => { M.prog.pegos.push(`pz:${M.mapa.i}:${pz.k}`); M.op.aoSalvar(); conferirObjetivo(); },
    disparar: (x, y, dx, dy, estilo, vel) => Perigos.disparar(M.mapa, x, y, dx, dy, estilo, vel),
    marcar: (c, l, estilo, aviso, ativo) => { if (!solido(c, l) && casa(c, l) !== '~') Perigos.marcar(M.mapa, c, l, estilo, aviso, ativo); },
    calmo
  };

  // ---------- abrir a masmorra do dia ----------
  function abrir(op) {
    cv = document.getElementById('mas-tela');
    ctx = cv.getContext('2d');
    if (!ligado) ligarControles();
    const nome = BIOMA_DO_MUNDO[op.mundo] || 'campo';
    Audio2.bioma(nome); // a trilha e os sons ambientes seguem o bioma
    Audio2.ambiente(nome);
    M = {
      op, prog: op.progresso, nome, bio: BIOMAS[nome], roteiro: receitaDoDia(op.dia),
      vidas: op.vidas, maxVidas: op.vidas, cam: { x: 0, y: 0 }, textos: [], particulas: [], transicao: null, entrada: null,
      ultimo: 0, fim: false, pausa: false, graca: 0, inv: 0, toque: 0, acorda: 0, aviso: 0, errosMapa: 0, salvoEm: 0, vistoSujo: false, visto: false,
      faixa: null, tenso: 0
    };
    M.prog.mapa = Math.min(M.prog.mapa || 0, M.roteiro.length - 1);
    sprites();
    ajustar();
    montar(M.prog.mapa);
    tocar();
    pintarVidas();
    teclas.clear();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(quadro);
  }

  // lê o mapa de texto: terreno na grade; monstros, armadilhas, puzzles e luzes em listas
  function montar(i) {
    const { tipo, id } = M.roteiro[i], D = MAPAS[id], L = D.mapa.length, C = Math.max(...D.mapa.map(s => s.length)), pegos = M.prog.pegos;
    const TM = TIPOS_MAPA[tipo] || TIPOS_MAPA.combate;
    const G = { i, id, D, tipo, TM, objetivo: D.objetivo || TM.objetivo, C, L, g: [], monstros: [], luzes: [], inicio: { c: 1, l: 1 }, extras: [], tiros: [], marcas: [], perigos: [], puzzles: [], fuga: null };
    M.mapa = G;
    const espera = [];
    D.mapa.forEach((linha, l) => G.g.push(Array.from({ length: C }, (_, c) => {
      const ch = linha[c] || '#', chave = `${i}:${c}:${l}`;
      if (ch === '@') { G.inicio = { c, l }; return '.'; }
      if ('mEZHC'.includes(ch)) { if (!pegos.includes('m:' + chave)) espera.push([ch, c, l]); return '.'; }
      if (ch === 'o') return pegos.includes(chave) ? '.' : 'o';
      if (ch === 'B') return pegos.includes(chave) ? 'b' : 'B';
      if (ch === 'G') return pegos.includes(chave) ? 'g' : 'G';
      if (ch === 'P') return pegos.includes('porta:' + chave) ? 'p' : 'P';
      if (ch === 'T' || ch === 'F' || ch === 'R') G.luzes.push({ x: c + .5, y: l + (ch === 'T' ? .95 : .5), r: ch === 'T' ? CONFIG_LUZ.tocha : CONFIG_LUZ.brasa + (ch === 'R' ? .6 : 0), tremula: true, salva: `${c}:${l}` });
      return ch;
    })));
    for (const [ch, c, l] of espera) G.monstros.push(criarMonstro(ch, c, l, i));
    G.perigos = Perigos.montar(D.perigos, M.nome);
    G.puzzles = Puzzles.montar(D.puzzles, G, api);
    if (D.fuga || tipo === 'fuga') Perigos.iniciarFuga(G, D.fuga, M.nome);
    G.deco = decorarMapa(D.mapa, M.nome, id);
    G.porLinha = Array.from({ length: L }, () => []);
    for (const e of G.deco.enfeites) {
      G.porLinha[e.l].push(e);
      if (e.e.luz) G.luzes.push({ x: e.c + .5 + e.dx, y: e.l + .5 + e.dy, r: e.e.luz, tremula: !!e.e.tremula });
    }
    G.vistos = lerVistos((M.prog.vistos || {})[i], C * L);
    G.nevoa = document.createElement('canvas');
    G.nevoa.width = C; G.nevoa.height = L;
    G.nctx = G.nevoa.getContext('2d');
    G.nctx.fillStyle = NEVOA;
    G.nctx.fillRect(0, 0, C, L);
    G.mini = document.createElement('canvas');
    G.mini.width = C * 3; G.mini.height = L * 3;
    G.mctx = G.mini.getContext('2d');
    for (let k = 0; k < C * L; k++) if (G.vistos[k]) descobrir(k % C, Math.floor(k / C));
    // começa no último ponto de luz deste mapa ou no início
    const s = M.prog.salvo && M.prog.salvo.m === i ? M.prog.salvo : G.inicio;
    M.P = { x: s.c + .5, y: s.l + .5, dir: 'baixo', passo: 0, andando: false, correndo: false, casa: -1, seguro: { c: s.c, l: s.l }, recuo: null, desliza: null, preso: 0, noMato: false };
    M.acorda = CF.desconfiado.confirma + .5;
    M.errosMapa = 0;
    M.fim = false;
    M.visto = false;
    M.inv = 0;
    olharEmVolta();
    centrarCamera();
    criarParticulas();
    pintarReinicio();
  }

  // ---------- monstros ----------
  function criarMonstro(ch, c, l, i) {
    const lista = MONSTROS_DO_BIOMA[M.nome] || MONSTROS_DO_BIOMA.campo, pedido = (M.mapa.D.monstros || {})[`${c}:${l}`];
    let def, chefe = ch === 'C', mini = ch === 'H';
    if (chefe) def = { ...CHEFOES[M.nome], jeito: 'chefe', vida: CONFIG_BATALHA.vidaChefe };
    else if (mini) def = { ...MINICHEFES[M.nome], jeito: 'patrulheiro', vida: CF.vidaMini };
    else {
      const porJeito = j => lista.find(id => TIPOS_MONSTRO[id].jeito === j);
      const id = TIPOS_MONSTRO[pedido] ? pedido : (pedido && porJeito(pedido)) || (ch === 'E' && porJeito('emboscador')) || lista[(c * 7 + l * 13) % lista.length];
      def = TIPOS_MONSTRO[id];
    }
    const J = chefe ? { vel: 0, caca: 0, patrulha: 'parado' } : mini ? { vel: 1, caca: 2.2, patrulha: 'linha' } : JEITOS[def.jeito];
    const horiz = [1, 2, 3].filter(k => !'#~STP'.includes((M.mapa.D.mapa[l] || '')[c + k] || '#')).length + [1, 2, 3].filter(k => !'#~STP'.includes((M.mapa.D.mapa[l] || '')[c - k] || '#')).length;
    const vert = [1, 2, 3].filter(k => !'#~STP'.includes((M.mapa.D.mapa[l + k] || '')[c] || '#')).length + [1, 2, 3].filter(k => !'#~STP'.includes((M.mapa.D.mapa[l - k] || '')[c] || '#')).length;
    const estado = chefe ? 'chefe' : ch === 'Z' ? 'dormindo' : (ch === 'E' || J.espreita) ? 'espreita' : 'patrulha';
    return {
      def, J, chave: `m:${i}:${c}:${l}`, mapa: i, mapas: M.roteiro.length, x: c + .5, y: l + .5, casa: { x: c + .5, y: l + .5 }, eixo: horiz >= vert ? 'x' : 'y', sentido: 1,
      nome: def.nome, tema: def.tema, fraqueza: def.fraqueza, vida: def.vida, max: def.vida, arte: ARTE_MONSTRO.svg(def.arte, chefe), img: def.arte + (chefe ? '👑' : ''),
      chefe, mini, voa: !!J.voa, estado, ang: Math.PI / 2, dir: null, t: 0, alerta: 0, semVer: 0, desconf: 0, vendo: 0, ultima: null,
      bob: Math.random() * 3, pisca: Math.random() * 4, corre: 0, descansa: 0, tiro: 1 + Math.random() * CF.tiro.intervalo, carga: 0,
      investe: CF.investida.intervalo, avanco: null, padrao: 0, k: 0, anunciado: false,
      tam: chefe ? CF.tamanho.chefe : mini ? CF.tamanho.mini : CF.tamanho.normal, cores: { a1: M.bio.topo, a2: M.bio.chao[0] }
    };
  }

  function sprites() {
    const chave = JSON.stringify(M.op.personagem);
    if (cache.chave !== chave) {
      cache = { chave, imgs: {} };
      for (const dir of Object.keys(VETOR)) for (const pose of ['parado', 'anda1', 'anda2']) cache.imgs[dir + pose] = imagem(desenharPersonagem(M.op.personagem, pose, dir).replace('<svg ', '<svg width="100" height="132" '));
    }
    const todos = [...Object.values(TIPOS_MONSTRO).map(d => [d.arte, false]), ...Object.values(MINICHEFES).map(d => [d.arte, false]), ...Object.values(CHEFOES).map(d => [d.arte, true])];
    for (const [arte, chefe] of todos) { const k = arte + (chefe ? '👑' : ''); if (!artes[k]) artes[k] = imagem(ARTE_MONSTRO.svg(arte, chefe).replace('<svg ', `<svg width="100" height="${chefe ? 124 : 100}" `)); }
  }
  function imagem(svg) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return img;
  }

  function ajustar() {
    const palco = cv.parentElement, w = palco.clientWidth, h = palco.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    zoom = Math.min(1.8, Math.max(.6, w / (VISTA * T)));
    vw = w / zoom;
    vh = h / zoom;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    if (M && M.mapa) centrarCamera();
  }

  // ---------- câmera que segue o herói, com suavização ----------
  function alvoCamera() {
    const W = M.mapa.C * T, H = M.mapa.L * T;
    return [
      W <= vw ? (W - vw) / 2 : Math.max(0, Math.min(W - vw, M.P.x * T - vw / 2)),
      H <= vh ? (H - vh) / 2 : Math.max(0, Math.min(H - vh, M.P.y * T - vh / 2))
    ];
  }
  function centrarCamera() { [M.cam.x, M.cam.y] = alvoCamera(); }
  function moverCamera(dt) {
    const [x, y] = alvoCamera(), k = calmo() ? 1 : 1 - Math.exp(-dt * 7);
    M.cam.x += (x - M.cam.x) * k;
    M.cam.y += (y - M.cam.y) * k;
  }

  // ---------- névoa de exploração e mini mapa (com o ícone do tipo de mapa) ----------
  function lerVistos(hex, n) {
    const v = new Uint8Array(n);
    if (hex) for (let k = 0; k < n; k++) v[k] = (parseInt(hex[k >> 2], 16) >> (k & 3)) & 1;
    return v;
  }
  function gravarVistos() {
    const G = M.mapa, n = G.C * G.L, v = G.vistos;
    let s = '';
    for (let k = 0; k < n; k += 4) s += ((v[k] | 0) | ((v[k + 1] | 0) << 1) | ((v[k + 2] | 0) << 2) | ((v[k + 3] | 0) << 3)).toString(16);
    M.prog.vistos = M.prog.vistos || {};
    M.prog.vistos[G.i] = s;
    M.vistoSujo = false;
  }
  const MINI = { '#': '#3A4377', T: '#FFB347', F: '#FF9A3D', R: '#FF9A3D', '=': '#B08A5C', S: '#5A4A3A', B: '#FFC531', b: '#FFC531', G: '#FFE066', g: '#FFE066', P: '#B07A3A', p: '#B07A3A', D: '#B07CFF', N: '#3DDC84', X: '#22E8FF', M: '#4E8A4A' };
  function descobrir(c, l) {
    const G = M.mapa, ch = G.g[l][c];
    G.nctx.clearRect(c, l, 1, 1);
    G.mctx.fillStyle = ch === '~' ? (M.bio.agua.lava ? '#E2541C' : '#2F7FB8') : MINI[ch] || 'rgba(220,228,255,.55)';
    G.mctx.fillRect(c * 3, l * 3, 3, 3);
  }
  function mostrarMini() {
    const G = M.mapa, el = document.getElementById('mas-mini');
    if (!el || !el.getContext) return;
    if (el.width !== G.mini.width || el.height !== G.mini.height) { el.width = G.mini.width; el.height = G.mini.height; }
    const g = el.getContext('2d');
    g.clearRect(0, 0, el.width, el.height);
    g.drawImage(G.mini, 0, 0);
    g.fillStyle = '#22E8FF';
    g.fillRect(Math.floor(M.P.x) * 3 - 1, Math.floor(M.P.y) * 3 - 1, 5, 5);
    g.fillStyle = 'rgba(5,6,12,.75)';
    g.beginPath(); g.arc(10, 10, 9, 0, Math.PI * 2); g.fill();
    g.font = '12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(G.TM.icone, 10, 11);
  }

  // ao mudar de casa: revela o que o herói enxerga (paredes e portas fechadas tampam a vista)
  function olharEmVolta() {
    const G = M.mapa, pc = Math.floor(M.P.x), pl = Math.floor(M.P.y), k0 = pl * G.C + pc;
    if (k0 === M.P.casa) return false;
    M.P.casa = k0;
    const r = escuro() ? CONFIG_LUZ.lanterna + .6 : CONFIG_LUZ.visao, R = Math.ceil(r);
    for (let dl = -R; dl <= R; dl++) for (let dc = -R; dc <= R; dc++) {
      const c = pc + dc, l = pl + dl, k = l * G.C + c;
      if (c < 0 || l < 0 || c >= G.C || l >= G.L || dc * dc + dl * dl > r * r || G.vistos[k] || !linhaLivre(pc, pl, c, l)) continue;
      G.vistos[k] = 1;
      descobrir(c, l);
      M.vistoSujo = true;
    }
    mostrarMini();
    return true;
  }
  function linhaLivre(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    while (x !== x1 || y !== y1) {
      if ((x !== x0 || y !== y0) && '#TPD'.includes(casa(x, y))) return false;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return true;
  }

  // ---------- controles: joystick virtual, setas e Shift (correr) ----------
  function ligarControles() {
    ligado = true;
    const base = document.getElementById('joy'), bola = base.querySelector('i');
    let id = null;
    const mexer = e => {
      const r = base.getBoundingClientRect(), raio = r.width / 2 - 16;
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > raio) { dx *= raio / d; dy *= raio / d; }
      bola.style.transform = `translate(${dx}px,${dy}px)`;
      joy.x = dx / raio;
      joy.y = dy / raio;
      base.classList.toggle('corre', Math.hypot(joy.x, joy.y) >= CF.correr.joystick);
    };
    const soltar = e => {
      if (e && e.pointerId !== id) return;
      id = null;
      joy.x = joy.y = 0;
      bola.style.transform = '';
      base.classList.remove('ativo', 'corre');
    };
    base.addEventListener('pointerdown', e => { id = e.pointerId; base.setPointerCapture(id); base.classList.add('ativo'); mexer(e); });
    base.addEventListener('pointermove', e => { if (e.pointerId === id) mexer(e); });
    base.addEventListener('pointerup', soltar);
    base.addEventListener('pointercancel', soltar);
    addEventListener('keydown', e => {
      if (e.key === 'Shift') shift = true;
      const d = TECLAS[(e.key || '').toLowerCase()];
      if (!d || !M || M.pausa || !document.getElementById('t-masmorra').classList.contains('ativa')) return;
      teclas.delete(d);
      teclas.add(d);
      e.preventDefault();
    });
    addEventListener('keyup', e => { if (e.key === 'Shift') shift = false; teclas.delete(TECLAS[(e.key || '').toLowerCase()]); });
    addEventListener('resize', () => { if (M) ajustar(); });
    const re = document.getElementById('mas-reinicia');
    if (re) re.onclick = () => { if (M && Puzzles.reiniciar(M.mapa, M.P.x, M.P.y, api)) flutuar('↺', M.P.x, M.P.y - 1); };
  }

  function direcao() {
    if (teclas.size) return [...teclas].pop();
    if (Math.hypot(joy.x, joy.y) < .3) return null;
    return Math.abs(joy.x) > Math.abs(joy.y) ? (joy.x > 0 ? 'direita' : 'esquerda') : joy.y > 0 ? 'baixo' : 'cima';
  }
  const correndo = () => shift || Math.hypot(joy.x, joy.y) >= CF.correr.joystick;

  // ---------- movimento e colisão ----------
  function colide(x, y, l = CORPO.l, a = CORPO.a, bloqueia = solido) {
    const c0 = Math.floor(x - l / 2), c1 = Math.floor(x + l / 2 - 1e-6), l0 = Math.floor(y - a / 2), l1 = Math.floor(y + a / 2 - 1e-6);
    for (let k = l0; k <= l1; k++) for (let c = c0; c <= c1; c++) if (bloqueia(c, k)) return true;
    return false;
  }

  function andar(eixo, passo, tocar = true) {
    const P = M.P, novo = { x: P.x, y: P.y };
    novo[eixo] += passo;
    if (!colide(novo.x, novo.y)) { P[eixo] = novo[eixo]; return true; }
    if (!tocar) return false;
    const outro = eixo === 'x' ? 'y' : 'x', s = Math.sign(passo), meia = (eixo === 'x' ? CORPO.l : CORPO.a) / 2;
    const frente = Math.floor(novo[eixo] + s * meia - (s > 0 ? 1e-6 : 0)), meio = Math.floor(P[outro]); // casa onde o passo bateu
    const ali = eixo === 'x' ? [frente, meio] : [meio, frente], ch = casa(...ali);
    if (M.toque <= 0 && Puzzles.bater(M.mapa, ...ali, P.dir, api)) { M.toque = .2; return false; }
    if (ch === 'B') return abrirBau(...ali), false;
    if (ch === 'G') return abrirOuro(...ali), false;
    if (ch === 'P') return bateuPorta(...ali), false;
    if (ch === 'N') return mercador(), false;
    if (ch === 'D') return avisar('🧩', ...ali), false;
    if (ch === 'X' && !cumprido()) return avisar(falta(), ...ali), false;
    // quina: escorrega para o centro da fileira livre mais perto
    let alvo = null;
    for (const k of [meio, meio - 1, meio + 1]) {
      const livre = eixo === 'x' ? !solido(frente, k) : !solido(k, frente);
      const dist = Math.abs(k + .5 - P[outro]);
      if (livre && dist < .75 && (alvo === null || dist < Math.abs(alvo + .5 - P[outro]))) alvo = k;
    }
    if (alvo === null) return false;
    const d = alvo + .5 - P[outro], tenta = { x: P.x, y: P.y };
    tenta[outro] += Math.sign(d) * Math.min(Math.abs(d), Math.abs(passo));
    if (!colide(tenta.x, tenta.y)) P[outro] = tenta[outro];
    return false;
  }

  // ---------- dano das armadilhas: 1 coração, invencível 1,5 s e recuo (sem pergunta) ----------
  function ferir(x, y, op = {}) {
    const P = M.P, dano = op.dano === undefined ? CP.dano : op.dano;
    if (dano && (M.inv > 0 || M.pausa || M.transicao)) return;
    if (!op.semRecuo) {
      const dx = P.x - x, dy = P.y - y, d = Math.hypot(dx, dy) || 1, dist = op.empurra || CP.recuo;
      P.recuo = { vx: (dx / d) * dist / CP.recuoTempo, vy: (dy / d) * dist / CP.recuoTempo, t: CP.recuoTempo };
      P.desliza = null;
    }
    if (!dano) return;
    M.vidas = Math.max(0, M.vidas - dano);
    M.inv = CP.invencivel;
    Audio2.sfx('erro');
    vibrar(60);
    flutuar(`−${dano} ❤️`, P.x, P.y - 1);
    pintarVidas();
    if (M.vidas <= 0) setTimeout(reaparecer, 350);
  }
  // sem corações: volta ao último ponto de luz deste mapa (tocha acesa) ou ao início
  function reaparecer() {
    if (!M || M.transicao) return;
    M.vidas = M.maxVidas;
    pintarVidas();
    M.transicao = { t: 0, trocou: false, trocar: () => { montar(M.mapa.i); flutuar('💪', M.P.x, M.P.y - 1); } };
  }
  // buraco ou piso quebrado: cai, perde 1 coração e volta à última casa segura
  function cair() {
    const P = M.P;
    if (M.inv > 0) { P.x = P.seguro.c + .5; P.y = P.seguro.l + .5; return; }
    flutuar('💨', P.x, P.y);
    ferir(P.x, P.y, { semRecuo: true });
    P.x = P.seguro.c + .5; P.y = P.seguro.l + .5; P.desliza = null; P.recuo = null; P.casa = -1;
  }

  // ---------- moedas, baús, portas, mercador, fogueira e saída ----------
  const guardar = chave => { M.prog.pegos.push(chave); M.op.aoSalvar(); };
  const flutuar = (txt, x, y) => M.textos.push({ txt, x, y, t: 0 });
  function avisar(txt, c, l) { if (M.aviso > 0) return; flutuar(txt, c + .5, l + .3); M.aviso = 1.2; }

  function coletar() {
    const P = M.P;
    for (let l = Math.floor(P.y) - 1; l <= Math.floor(P.y) + 1; l++) for (let c = Math.floor(P.x) - 1; c <= Math.floor(P.x) + 1; c++) {
      if (casa(c, l) !== 'o' || Math.hypot(c + .5 - P.x, l + .5 - P.y) > .62) continue;
      M.mapa.g[l][c] = '.';
      guardar(`${M.mapa.i}:${c}:${l}`);
      M.op.aoMoeda(1);
      som('moeda');
      vibrar(15);
      flutuar('+1 🪙', c + .5, l + .2);
    }
  }

  function desafio(tipo, depois) {
    if (M.graca > 0 || M.pausa) return;
    M.pausa = true;
    M.op.aoDesafio(tipo, r => {
      M.pausa = false;
      M.ultimo = 0;
      M.graca = .8;
      if (r.aberto) depois(r);
    });
  }
  const pegar = (c, l) => { if (!M.mapa.extras.includes(`${c}:${l}`)) guardar(`${M.mapa.i}:${c}:${l}`); };
  function abrirBau(c, l) {
    desafio('bau', r => {
      const n = r.certo ? 5 : 2;
      if (M.op.aoBau) M.op.aoBau(false);
      M.mapa.g[l][c] = 'b';
      pegar(c, l);
      M.op.aoMoeda(n);
      som('bau');
      vibrar(40);
      flutuar(`+${n} 🪙`, c + .5, l - .1);
    });
  }
  function abrirOuro(c, l) {
    desafio('bau', r => {
      const n = r.certo ? 10 : 5;
      if (M.op.aoBau) M.op.aoBau(true);
      M.mapa.g[l][c] = 'g';
      pegar(c, l);
      M.op.aoMoeda(n);
      som('vitoria');
      confete(40);
      flutuar(`💎 +${n} 🪙`, c + .5, l - .1);
    });
  }
  function bateuPorta(c, l) {
    desafio('porta', () => {
      M.mapa.g[l][c] = 'p';
      guardar(`porta:${M.mapa.i}:${c}:${l}`);
      Audio2.sfx('porta');
      flutuar('🔓', c + .5, l + .3);
      M.P.casa = -1;
    });
  }
  function mercador() {
    if (M.graca > 0 || M.pausa) return;
    M.pausa = true;
    M.op.aoMercador(() => { M.pausa = false; M.ultimo = 0; M.graca = .6; });
  }
  // fogueira de descanso: cura 1 coração, uma vez por mapa
  function descanso() {
    const G = M.mapa, chave = 'cura:' + G.i;
    for (const L of G.luzes) {
      if (!L.salva || casa(Math.floor(L.x), Math.floor(L.y)) !== 'R' || Math.hypot(L.x - M.P.x, L.y - M.P.y) > 1.6 || M.prog.pegos.includes(chave)) continue;
      if (M.vidas >= M.maxVidas) { avisar('❤️ cheio', M.P.x - .5, M.P.y - 1); return; }
      M.vidas++;
      guardar(chave);
      pintarVidas();
      Audio2.sfx('bau');
      flutuar('❤️ +1', M.P.x, M.P.y - 1);
    }
  }
  const falta = () => {
    const G = M.mapa;
    if (G.objetivo === 'chefe') return '👑';
    if (G.objetivo === 'minichefe') return '😈';
    if (G.objetivo === 'puzzle') return `🧩 ${G.puzzles.filter(p => p.resolvido).length}/${G.puzzles.length}`;
    return `👾 ${G.monstros.length}`;
  };

  // objetivo cumprido (monstros, puzzles, mini-chefe ou chefão): a saída abre e vem a carta
  function conferirObjetivo(chefe = false) {
    const G = M.mapa;
    if (G.objetivo === 'chegar' || !cumprido() || M.prog.pegos.includes('ok:' + G.i)) return;
    M.prog.pegos.push('ok:' + G.i);
    som('vitoria');
    flutuar('✨ Saída aberta', M.P.x, M.P.y - 1.2);
    mostrarMini();
    M.op.aoSalaLimpa(G.i, M.errosMapa === 0, chefe, M.roteiro.length);
    M.op.aoSalvar();
  }

  // saída aberta: próximo mapa da receita (ou fim do dia no último)
  function conferirCasa() {
    if (M.fim || casa(Math.floor(M.P.x), Math.floor(M.P.y)) !== 'X' || !cumprido()) return;
    const G = M.mapa;
    M.fim = true;
    if (G.objetivo === 'chegar' && !M.prog.pegos.includes('ok:' + G.i)) {
      M.prog.pegos.push('ok:' + G.i);
      if (G.TM.bonus && !M.visto) { M.op.aoMoeda(G.TM.bonus); flutuar(`🥷 Sem ser visto! +${G.TM.bonus} 🪙`, M.P.x, M.P.y - 1.4); }
      M.op.aoSalaLimpa(G.i, M.errosMapa === 0, false, M.roteiro.length);
    }
    const prox = G.i + 1;
    if (prox < M.roteiro.length) {
      Audio2.sfx('porta');
      gravarVistos();
      M.transicao = { t: 0, trocou: false, trocar: () => {
        M.prog.mapa = prox;
        M.prog.salvo = null;
        M.op.aoSalvar();
        montar(prox);
        M.tenso = 0;
        tocar();
        const tm = M.mapa.TM;
        toast(`${tm.icone} ${tm.nome} · ${tm.dica}`);
      } };
    } else {
      som('vitoria');
      flutuar('🏁', M.P.x, M.P.y - 1);
      setTimeout(() => M.op.aoSaida(), 450);
    }
  }

  // tochas, braseiros e fogueiras: chegar perto salva o ponto de volta
  function pontoDeLuz() {
    for (const L of M.mapa.luzes) {
      if (!L.salva || Math.hypot(L.x - M.P.x, L.y - M.P.y) > CONFIG_LUZ.salvar) continue;
      const s = M.prog.salvo;
      if (s && s.m === M.mapa.i && s.luz === L.salva) return;
      M.prog.salvo = { m: M.mapa.i, c: M.P.seguro.c, l: M.P.seguro.l, luz: L.salva };
      gravarVistos();
      M.op.aoSalvar();
      Audio2.sfx('bau');
      flutuar('🔥 Salvo', M.P.x, M.P.y - .9);
      return;
    }
  }

  // ---------- monstros: dormindo, patrulhando, desconfiado (?) e perseguindo (!) ----------
  const rumo = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : dy > 0 ? 'baixo' : 'cima');
  const ANG = { direita: 0, baixo: Math.PI / 2, esquerda: Math.PI, cima: -Math.PI / 2 };
  function bloqueio(m) {
    return (c, l) => {
      const ch = casa(c, l);
      if (ch === '~' && m.voa) return false;
      return SOLIDO.includes(ch) || 'PpX'.includes(ch) || Perigos.evitar(M.mapa, c, l) || Puzzles.solido(M.mapa, c, l);
    };
  }
  function passoMonstro(m, dir, v) {
    const [vx, vy] = VETOR[dir], nx = m.x + vx * v, ny = m.y + vy * v, corpo = m.chefe || m.mini ? .9 : .6;
    m.ang = ANG[dir];
    if (vx) m.olhar = vx;
    if (colide(nx, ny, corpo, corpo, bloqueio(m))) return false;
    m.x = nx;
    m.y = ny;
    return true;
  }
  function irPara(m, x, y, v) {
    const dx = x - m.x, dy = y - m.y;
    if (Math.hypot(dx, dy) < .1) return;
    if (!passoMonstro(m, rumo(dx, dy), v)) passoMonstro(m, Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 'baixo' : 'cima') : dx > 0 ? 'direita' : 'esquerda', v);
  }

  // percebe o aluno? cone de visão curto à frente; correr faz barulho; no mato é invisível
  function perceber(m, dist) {
    const P = M.P, V = CF.visao;
    if (P.noMato) return null;
    if (m.estado !== 'dormindo') {
      const a = Math.atan2(P.y - m.y, P.x - m.x), dif = Math.abs(((a - m.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (dist <= V.alcance && dif <= (V.angulo * Math.PI) / 180 && linhaLivre(Math.floor(m.x), Math.floor(m.y), Math.floor(P.x), Math.floor(P.y))) return 've';
    }
    const ouvido = m.estado === 'dormindo' ? (P.correndo ? CF.dormindo.acorda : 0) : P.andando ? (P.correndo ? CF.ouvido.correndo : CF.ouvido.andando) : 0;
    return dist <= ouvido ? 'ouve' : null;
  }

  function moverMonstros(dt) {
    const G = M.mapa, P = M.P;
    for (const m of G.monstros) {
      const dx = P.x - m.x, dy = P.y - m.y, dist = Math.hypot(dx, dy);
      m.bob += dt;
      m.pisca += dt;
      if (dist > 14) continue;
      // chefão: entrada dramática quando aparece; depois ataca o mapa com seu padrão até o aluno encostar
      if (m.chefe) {
        if (!m.anunciado && dist < 5.5 && G.vistos[Math.floor(m.y) * G.C + Math.floor(m.x)]) {
          m.anunciado = true;
          M.entrada = { t: 0, nome: m.nome };
          som('chefe');
          vibrar([120, 60, 120]);
          tocar();
          return;
        }
        if (m.anunciado && m.def.padrao) {
          m.padrao -= dt;
          if (m.padrao <= 0) { const pd = PADROES_CHEFE[m.def.padrao]; m.padrao = pd.intervalo; pd.executar(m, m.k++, api); }
        }
        if (dist < CF.visao.colado + .3 && M.graca <= 0 && !M.pausa) return batalha(m, false);
        continue;
      }
      if (M.acorda > 0) continue;
      const J = m.J, sente = perceber(m, dist), antes = m.estado;
      // golem: só se mexe quando o aluno se mexe
      const pode = !J.soComHeroi || P.andando;
      switch (m.estado) {
        case 'dormindo':
          if (sente) { m.estado = 'desconfiado'; m.desconf = 0; m.ultima = { x: P.x, y: P.y }; }
          break;
        case 'espreita':
          if (m.alerta > 0) { m.alerta -= dt; if (m.alerta <= 0) { m.estado = 'caca'; m.semVer = 0; M.visto = true; } }
          else if (dist < CF.espreita.distancia && (!P.noMato || dist <= CF.visao.colado)) { m.alerta = CF.espreita.aviso; Audio2.sfx('espreita'); }
          break;
        case 'patrulha':
          if (sente === 've' && dist < CF.visao.alcance * .5) { m.estado = 'caca'; m.semVer = 0; M.visto = true; }
          else if (sente) { m.estado = 'desconfiado'; m.desconf = 0; m.vendo = 0; m.ultima = { x: P.x, y: P.y }; }
          else if (pode) patrulhar(m, dt);
          break;
        case 'desconfiado':
          m.desconf += dt;
          m.ang = Math.atan2((m.ultima || P).y - m.y, (m.ultima || P).x - m.x);
          if (sente === 've') { m.vendo += dt; m.ultima = { x: P.x, y: P.y }; if (m.vendo >= CF.desconfiado.confirma) { m.estado = 'caca'; m.semVer = 0; M.visto = true; } }
          else if (m.desconf >= CF.desconfiado.tempo) m.estado = 'patrulha';
          break;
        case 'caca': {
          if (sente) { m.semVer = 0; m.ultima = { x: P.x, y: P.y }; } else m.semVer += dt;
          if (m.semVer >= CF.perder) { m.estado = 'patrulha'; m.ultima = null; break; }
          if (!pode) break;
          const alvo = sente ? P : m.ultima || P;
          if (J.atira) atirar(m, dt, dist, sente === 've');
          else if (J.cansa && cansado(m, dt)) break;
          else if (m.mini && investir(m, dt, dist, sente === 've')) break;
          else irPara(m, alvo.x, alvo.y, J.caca * dt);
          break;
        }
      }
      // encostar em quem ainda não estava perseguindo (dormindo, patrulhando ou "?"): ataque furtivo
      if (dist < (m.mini ? 1 : .75) && M.graca <= 0 && !M.pausa && m.alerta <= 0) return batalha(m, antes !== 'caca' && antes !== 'espreita');
    }
  }

  function patrulhar(m, dt) {
    const J = m.J, v = J.vel * dt;
    if (J.patrulha === 'parado') return;
    if (J.patrulha === 'linha') { // vai e volta numa linha a partir de casa
      const dir = m.eixo === 'x' ? (m.sentido > 0 ? 'direita' : 'esquerda') : m.sentido > 0 ? 'baixo' : 'cima';
      const longe = Math.abs((m.eixo === 'x' ? m.x - m.casa.x : m.y - m.casa.y)) > CF.visao.alcance;
      if (!passoMonstro(m, dir, v) || (longe && Math.sign(m.eixo === 'x' ? m.x - m.casa.x : m.y - m.casa.y) === m.sentido)) m.sentido *= -1;
      return;
    }
    m.t -= dt; // solto ou ondulando: passeia perto de casa
    const ox = m.casa.x - m.x, oy = m.casa.y - m.y;
    if (m.t <= 0 || !m.dir) { m.dir = Math.hypot(ox, oy) > 3 ? rumo(ox, oy) : sortear(Object.keys(VETOR)); m.t = 1 + Math.random(); }
    if (!passoMonstro(m, m.dir, v)) m.t = 0;
  }
  function cansado(m, dt) { // corredor: corre um pouco e para para respirar
    if (m.descansa > 0) { m.descansa -= dt; return true; }
    m.corre += dt;
    if (m.corre >= CF.corredor.cansa) { m.corre = 0; m.descansa = CF.corredor.descanso; }
    return false;
  }
  function atirar(m, dt, dist, ve) { // atirador: mantém distância e atira depois de brilhar
    const P = M.P;
    if (dist < 2.6) irPara(m, m.x - (P.x - m.x), m.y - (P.y - m.y), m.J.vel * dt);
    else if (dist > 4.5) irPara(m, P.x, P.y, m.J.caca * dt);
    m.ang = Math.atan2(P.y - m.y, P.x - m.x);
    if (m.carga > 0) {
      m.carga -= dt;
      if (m.carga <= 0) api.disparar(m.x, m.y - .2, P.x - m.x, P.y - m.y + .2, { cogumago: 'esporo', ourico: 'espinho', brasinha: 'fogo' }[m.def.arte] || 'seta', CF.tiro.vel);
      return;
    }
    m.tiro -= dt;
    if (m.tiro <= 0 && ve && dist <= CF.tiro.alcance) { m.tiro = CF.tiro.intervalo; m.carga = CF.tiro.carga; }
  }
  function investir(m, dt, dist, ve) { // mini-chefe: treme, avisa e avança em linha reta
    const I = CF.investida, P = M.P;
    if (m.avanco) {
      m.avanco.t -= dt;
      if (m.avanco.carga > 0) { m.avanco.carga -= dt; return true; }
      const [dx, dy] = m.avanco.d;
      if (!passoMonstro(m, rumo(dx, dy), I.vel * dt) || m.avanco.t <= 0) m.avanco = null;
      return true;
    }
    m.investe -= dt;
    if (m.investe <= 0 && ve && dist < 5) { m.investe = I.intervalo; m.avanco = { carga: I.carga, t: I.carga + I.dura, d: Math.abs(P.x - m.x) > Math.abs(P.y - m.y) ? [Math.sign(P.x - m.x), 0] : [0, Math.sign(P.y - m.y)] }; return true; }
    return false;
  }

  // encostou: abre a batalha por turnos (app.js decide perguntas, dano e prêmios)
  function batalha(m, furtivo) {
    M.pausa = true;
    M.P.andando = false;
    teclas.clear();
    joy.x = joy.y = 0;
    som('pulo');
    vibrar(60);
    gravarVistos();
    if (furtivo) flutuar('🗡️ Furtivo!', m.x, m.y - 1);
    M.op.aoBatalha(m, { vidas: M.vidas, max: M.maxVidas, furtivo, mapa: M.mapa.tipo }, res => {
      M.pausa = false;
      M.ultimo = 0;
      M.graca = 1.2;
      if (res.venceu) {
        M.vidas = res.vidas;
        M.mapa.monstros = M.mapa.monstros.filter(x => x !== m);
        M.prog.pegos.push(m.chave);
        M.errosMapa += res.erros;
        flutuar('💥', m.x, m.y - .4);
        conferirObjetivo(!!m.chefe);
        M.op.aoSalvar();
      } else {
        M.vidas = M.maxVidas;
        M.transicao = { t: 0, trocou: false, trocar: () => { montar(M.mapa.i); flutuar('💪', M.P.x, M.P.y - 1); } };
      }
      pintarVidas();
      M.faixa = null;
      tocar();
    });
  }

  // ---------- clima ----------
  function criarParticulas() {
    const c = M.bio.clima;
    M.particulas = Array.from({ length: c ? c.qtd : 0 }, () => ({ x: M.cam.x + Math.random() * vw, y: M.cam.y + Math.random() * vh, f: Math.random() * 6.28, s: .6 + Math.random() * .8 }));
  }
  function moverParticulas(dt) {
    const c = M.bio.clima;
    if (!c || calmo()) return;
    for (const p of M.particulas) {
      p.f += dt;
      if (c.tipo === 'sobe') { p.y -= c.vel * p.s * dt; p.x += Math.sin(p.f * 1.3) * 6 * dt; }
      else if (c.tipo === 'lado') { p.x += c.vel * p.s * dt; p.y += Math.sin(p.f * 2) * 4 * dt; }
      else { p.x += Math.cos(p.f * .7 + p.s * 4) * c.vel * dt; p.y += Math.sin(p.f * .9 + p.s * 2) * c.vel * dt; }
      if (p.x < M.cam.x - 8) p.x += vw + 16; else if (p.x > M.cam.x + vw + 8) p.x -= vw + 16;
      if (p.y < M.cam.y - 8) p.y += vh + 16; else if (p.y > M.cam.y + vh + 8) p.y -= vh + 16;
    }
  }

  // ---------- laço do jogo ----------
  function quadro(ms) {
    if (!M) return;
    if (!document.getElementById('t-masmorra').classList.contains('ativa')) return parar();
    const dt = M.ultimo ? Math.min(.05, (ms - M.ultimo) / 1000) : 0;
    M.ultimo = ms;
    atualizar(dt);
    desenhar(ms / 1000);
    raf = requestAnimationFrame(quadro);
  }

  function atualizar(dt) {
    M.textos = M.textos.filter(f => (f.t += dt) < .5);
    const tr = M.transicao, P = M.P, G = M.mapa;
    if (tr) {
      tr.t += dt;
      if (tr.t >= .14 && !tr.trocou) { tr.trocou = true; tr.trocar(); }
      if (tr.t >= .36) M.transicao = null;
      return;
    }
    if (M.entrada) {
      M.entrada.t += dt;
      if (M.entrada.t > 1.4) M.entrada = null;
      return;
    }
    moverParticulas(dt);
    moverCamera(dt);
    if (M.pausa) return;
    M.graca = Math.max(0, M.graca - dt);
    M.inv = Math.max(0, M.inv - dt);
    M.toque = Math.max(0, M.toque - dt);
    M.acorda = Math.max(0, M.acorda - dt);
    M.aviso = Math.max(0, M.aviso - dt);
    P.preso = Math.max(0, P.preso - dt);
    Perigos.atualizar(G, dt, api);
    Puzzles.atualizar(G, dt, api);
    P.noMato = casa(Math.floor(P.x), Math.floor(P.y)) === 'M';
    P.correndo = correndo();
    const vel = VEL * (P.correndo ? CF.correr.velocidade : 1);
    let d = null;
    if (P.recuo) { // empurrão da armadilha
      P.recuo.t -= dt;
      andar('x', P.recuo.vx * dt, false);
      andar('y', P.recuo.vy * dt, false);
      if (P.recuo.t <= 0) P.recuo = null;
    } else if (P.desliza) { // poça: escorrega até sair dela ou bater
      const [dx, dy] = VETOR[P.desliza];
      const andou = dx ? andar('x', dx * CP.escorrega * dt, false) : andar('y', dy * CP.escorrega * dt, false);
      if (!andou || !Perigos.escorrega(G, Math.floor(P.x), Math.floor(P.y))) P.desliza = null;
    } else if (!P.preso && !M.fim) {
      d = direcao();
      if (d) {
        P.dir = d;
        P.passo += dt * (P.correndo ? 1.5 : 1);
        const [dx, dy] = VETOR[d];
        if (dx) andar('x', dx * vel * dt); else andar('y', dy * vel * dt);
      }
    }
    P.andando = !!d;
    coletar();
    conferirCasa();
    if (olharEmVolta()) entrouNaCasa();
    // armadilhas que ferem onde o herói está
    if (M.inv <= 0) { const f = Perigos.ferindo(G, P.x, P.y); if (f) ferir(f.x, f.y, { empurra: f.empurra }); }
    if (!M.pausa && !M.transicao) moverMonstros(dt);
    M.tenso = G.monstros.some(m => m.estado === 'caca') ? 4 : Math.max(0, M.tenso - dt); // perseguição: trilha tensa por mais 4 s
    if (!M.pausa) tocar();
    descanso();
    pintarReinicio();
    if (M.vistoSujo && performance.now() - M.salvoEm > 3000) { M.salvoEm = performance.now(); gravarVistos(); M.op.aoSalvar(); }
  }

  // trilha do bioma: chefão anunciado, tensa (furtividade, fuga ou perseguição) ou exploração
  function trilha() {
    if (M.mapa.monstros.some(x => x.chefe && x.anunciado)) return 'chefao';
    return M.tenso > 0 || ['furtividade', 'fuga'].includes(M.mapa.tipo) ? 'furtividade' : 'masmorra';
  }
  function tocar() { const f = trilha(); if (f !== M.faixa) { M.faixa = f; Audio2.musica(f); } }

  // entrou numa casa nova: pisar em placas, pisos e poças; buracos; ponto salvo
  function entrouNaCasa() {
    const G = M.mapa, P = M.P, c = Math.floor(P.x), l = Math.floor(P.y);
    if (Perigos.buraco(G, c, l)) return cair();
    Perigos.pisou(G, c, l, api);
    Puzzles.pisou(G, c, l, api);
    if (Perigos.escorrega(G, c, l) && !P.recuo) P.desliza = P.dir;
    if (!Perigos.evitar(G, c, l) && casa(c, l) !== '~') P.seguro = { c, l };
    pontoDeLuz();
  }

  let botaoReinicio = null;
  function pintarReinicio() {
    const bt = botaoReinicio || (botaoReinicio = document.getElementById('mas-reinicia'));
    if (!bt) return;
    const mostra = !!(M && M.mapa && Puzzles.atual(M.mapa, M.P.x, M.P.y));
    if (bt.hidden === mostra) bt.hidden = !mostra;
  }

  // ---------- desenho: só as casas que aparecem na tela ----------
  const circ = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const oval = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  function caixa(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  function desenhar(t) {
    const G = M.mapa, ta = calmo() ? 0 : t, k = zoom * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = M.bio.ceu;
    ctx.fillRect(0, 0, cv.width, cv.height);
    let cx = M.cam.x;
    const cy = M.cam.y;
    if (M.entrada && M.entrada.t < .5 && !calmo()) cx += Math.sin(t * 70) * 3;
    camadaFixa(cx, cy, k);
    ctx.setTransform(k, 0, 0, k, Math.round(-cx * k), Math.round(-cy * k));
    const c0 = Math.max(0, Math.floor(cx / T)), c1 = Math.min(G.C - 1, Math.floor((cx + vw) / T));
    const l0 = Math.max(0, Math.floor(cy / T)), l1 = Math.min(G.L - 1, Math.floor((cy + vh) / T) + 1);
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) chaoVivo(c, l, G.g[l][c], ta);
    Perigos.desenharChao(G, ctx, ta, api, c0, c1, l0, l1);
    enfeites(l0, l1, c0, c1, ta, true, true);
    enfeites(l0, l1, c0, c1, ta, false, true);
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) itens(c, l, G.g[l][c], t);
    Puzzles.desenhar(G, ctx, ta, api);
    // no escuro, monstro só aparece inteiro dentro da luz; fora dela, só os olhos
    const ocultos = [];
    for (const m of G.monstros) {
      if (m.x < c0 - 2 || m.x > c1 + 3 || m.y < l0 - 2 || m.y > l1 + 3) continue;
      const escondido = m.estado === 'espreita' && m.alerta <= 0 && casa(Math.floor(m.x), Math.floor(m.y)) === 'M';
      if (escondido) continue; // emboscador no mato: só o mato mexendo entrega
      if (escuro() && !(m.chefe && m.anunciado) && !iluminado(m.x, m.y)) ocultos.push(m);
      else { cone(m); monstro(m, t); }
    }
    heroi();
    if (escuro()) sombras(t, l0, l1, c0, c1);
    emissivos(l0, l1, c0, c1, ta);
    Perigos.desenharTopo(G, ctx, ta, api);
    Puzzles.rotulos(G, ctx, t, api);
    particulas();
    ctx.drawImage(G.nevoa, 0, 0, G.C, G.L, 0, 0, G.C * T, G.L * T);
    for (const m of ocultos) olhos(m, t);
    for (const m of G.monstros) if (!ocultos.includes(m)) icone(m, t);
    textos();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    objetivo();
    if (M.entrada) entradaChefe();
    if (M.transicao) {
      const tr = M.transicao, a = tr.t < .14 ? tr.t / .14 : 1 - (tr.t - .14) / .22;
      ctx.fillStyle = `rgba(5,6,12,${Math.max(0, Math.min(1, a))})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
  }

  // camada fixa: chão, manchas, paredes e enfeites parados ficam guardados até a câmera mudar de casa
  function camadaFixa(cx, cy, k) {
    const G = M.mapa, cc0 = Math.floor(cx / T) - 1, cl0 = Math.floor(cy / T) - 1, nc = Math.ceil(vw / T) + 3, nl = Math.ceil(vh / T) + 3;
    const ox = Math.round(cc0 * T * k), oy = Math.round(cl0 * T * k), chave = [M.nome, G.id, cc0, cl0, nc, nl, k].join('|');
    if (chave !== chaveFixa) {
      chaveFixa = chave;
      const W = Math.ceil(nc * T * k), H = Math.ceil(nl * T * k), real = ctx;
      if (fixa.width !== W || fixa.height !== H) { fixa.width = W; fixa.height = H; }
      ctx = fctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(k, 0, 0, k, -ox, -oy);
      const c0 = Math.max(0, cc0), c1 = Math.min(G.C - 1, cc0 + nc - 1), l0 = Math.max(0, cl0), l1 = Math.min(G.L - 1, cl0 + nl - 1);
      for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) { const ch = G.g[l][c]; if (ch !== '#' && ch !== 'T') chao(c, l, ch); }
      enfeites(l0, l1, c0, c1, 0, true, false);
      for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) { const ch = G.g[l][c]; if (ch === '#' || ch === 'T') parede(c, l, ch); }
      enfeites(l0, l1, c0, c1, 0, false, false);
      ctx = real;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fixa, ox + Math.round(-cx * k), oy + Math.round(-cy * k));
  }

  function chao(c, l, ch) {
    const B = M.bio, x = c * T, y = l * T, h = (c * 73856093 ^ l * 19349663) >>> 0;
    if (ch === '~' || ch === '=') {
      ctx.fillStyle = B.agua.cor;
      ctx.fillRect(x, y, T + .6, T + .6);
      const cima = casa(c, l - 1);
      if (cima !== '~' && cima !== '=') { ctx.fillStyle = B.agua.margem; ctx.fillRect(x, y, T + .6, 3); }
      if (ch === '=') ponte(x, y, c, l);
      return;
    }
    ctx.fillStyle = B.chao[h % B.chao.length];
    ctx.fillRect(x, y, T + .6, T + .6);
    const lista = M.mapa.deco.manchas[l * M.mapa.C + c];
    if (lista) for (const p of lista) p.m.desenhar(ctx, x + p.x * T, y + p.y * T, p.v, p.r);
    if (ch === 'S') espinho(x, y, h);
  }

  // o que mexe no chão: ondas da água (ou bolhas da lava) e o mato alto que balança
  function chaoVivo(c, l, ch, t) {
    if (ch === 'M') {
      const P = M.P, perto = Math.floor(P.x) === c && Math.floor(P.y) === l;
      const mexe = perto || M.mapa.monstros.some(m => m.estado === 'espreita' && Math.floor(m.x) === c && Math.floor(m.y) === l && Math.hypot(m.x - P.x, m.y - P.y) < 4);
      return M.bio.matoAlto(ctx, c * T, l * T, t, (c * 73856093 ^ l * 19349663) >>> 0, mexe);
    }
    if (ch !== '~') return;
    const A = M.bio.agua, x = c * T, y = l * T, f = Math.sin(t * (A.lava ? 1.2 : 1.8) + c * .9 + l * 1.3);
    ctx.fillStyle = A.cor2;
    if (A.lava) { circ(x + 10 + f * 3, y + 12, 4 + f); circ(x + 22, y + 22 - f * 2, 3); }
    else { ctx.fillRect(x + 6 + f * 3, y + 10, 10, 2); ctx.fillRect(x + 16 - f * 3, y + 22, 9, 2); }
  }

  function ponte(x, y, c, l) {
    const deitada = casa(c - 1, l) !== '~' || casa(c + 1, l) !== '~';
    ctx.fillStyle = '#7A5634';
    if (deitada) ctx.fillRect(x, y + 6, T + .6, T - 12); else ctx.fillRect(x + 6, y, T - 12, T + .6);
    ctx.fillStyle = '#5A3D24';
    for (let k = 1; k < 4; k++) if (deitada) ctx.fillRect(x + k * 8, y + 6, 1.4, T - 12); else ctx.fillRect(x + 6, y + k * 8, T - 12, 1.4);
    if (deitada) { ctx.fillRect(x, y + 6, T + .6, 2); ctx.fillRect(x, y + T - 8, T + .6, 2); }
    else { ctx.fillRect(x + 6, y, 2, T + .6); ctx.fillRect(x + T - 8, y, 2, T + .6); }
  }

  function espinho(x, y, h) {
    const cx = x + T / 2, cy = y + T / 2 + 2, giro = (h % 6) * .3;
    ctx.fillStyle = M.bio.espinho;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) { const r = k % 2 ? 6 : 13, a = giro + (k * Math.PI) / 7; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8); }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    circ(cx - 2, cy - 2, 3);
  }

  function parede(c, l, ch) {
    const B = M.bio, x = c * T, y = l * T, abaixo = casa(c, l + 1), frente = abaixo !== '#' && abaixo !== 'T', v = ((c * 7 + l * 13) % 10) / 10;
    ctx.fillStyle = B.topo;
    ctx.fillRect(x, y, T + .6, T + .6);
    if (frente) {
      ctx.fillStyle = B.parede;
      ctx.fillRect(x, y + T * .6, T + .6, T * .4 + .6);
      ctx.fillStyle = B.sombra;
      ctx.fillRect(x, y + T - 4, T + .6, 4);
    }
    B.detalhe(ctx, x, y, T, v, frente);
    if (ch === 'T') { ctx.fillStyle = '#3A2A1A'; ctx.fillRect(x + 14, y + T * .62, 4, 9); ctx.fillStyle = '#6B4A2E'; ctx.fillRect(x + 12, y + T * .6, 8, 3); }
  }

  function enfeites(l0, l1, c0, c1, t, rentes, animados) {
    for (let l = l0; l <= l1; l++) for (const e of M.mapa.porLinha[l]) {
      if (!!e.e.chao !== rentes || !!e.e.anima !== animados || e.c < c0 - 1 || e.c > c1 + 1) continue;
      e.e.desenhar(ctx, (e.c + .5 + e.dx) * T, (e.l + .5 + e.dy) * T, t, e.v, e.q);
    }
  }

  function itens(c, l, ch, t) {
    const x = c * T, y = l * T;
    if (ch === 'o') moeda(x + T / 2, y + T / 2 + Math.sin(t * 4 + c + l) * 2.5);
    else if (ch === 'B' || ch === 'b') bau(x, y, ch === 'b');
    else if (ch === 'G' || ch === 'g') bau(x, y, ch === 'g', true);
    else if (ch === 'P' || ch === 'p') porta(x, y, ch === 'p');
    else if (ch === 'X') saida(x + T / 2, y + T / 2, !cumprido());
    else if (ch === 'F' || ch === 'R') { ctx.fillStyle = '#4A4550'; oval(x + T / 2, y + T / 2 + 5, 11, 5.5); ctx.fillStyle = '#2A2630'; oval(x + T / 2, y + T / 2 + 3, 7.5, 3); if (ch === 'R') { ctx.fillStyle = '#6B4A2E'; ctx.save(); ctx.translate(x + T / 2, y + T / 2 + 4); ctx.rotate(.4); ctx.fillRect(-11, -2, 22, 4); ctx.rotate(-.8); ctx.fillRect(-11, -2, 22, 4); ctx.restore(); } }
    else if (ch === 'N') vendedor(x, y);
  }

  function moeda(x, y) {
    ctx.fillStyle = '#E09B00'; circ(x, y + 1.5, 8);
    ctx.fillStyle = '#FFC531'; circ(x, y, 8);
    ctx.fillStyle = '#FFF3B0'; circ(x - 2.5, y - 2.5, 2.6);
  }

  function bau(x, y, aberto, ouro) {
    const px = x + 5, py = y + 8, w = T - 10;
    ctx.fillStyle = ouro ? '#B8860B' : '#9A3412'; caixa(px, py + 6, w, 14, 4);
    ctx.fillStyle = aberto ? '#5B1F0A' : ouro ? '#FFD43B' : '#C2410C'; caixa(px, aberto ? py - 3 : py, w, 9, 4);
    ctx.fillStyle = ouro ? '#FFF3B0' : '#FFC531'; ctx.fillRect(px + w / 2 - 3, py + 2, 6, 16);
    if (aberto) { ctx.globalAlpha = .7; ctx.fillStyle = '#FFE48A'; circ(px + w / 2, py + 3, 6); ctx.globalAlpha = 1; }
  }

  function porta(x, y, aberta) {
    ctx.fillStyle = '#3A2A1A';
    ctx.fillRect(x, y, 5, T); ctx.fillRect(x + T - 5, y, 5, T);
    if (aberta) return;
    ctx.fillStyle = '#7A4E2A'; ctx.fillRect(x + 5, y + 2, T - 10, T - 4);
    ctx.fillStyle = '#5A3820'; ctx.fillRect(x + 11, y + 2, 1.5, T - 4); ctx.fillRect(x + 19, y + 2, 1.5, T - 4);
    ctx.fillStyle = '#FFC531'; caixa(x + 12, y + 15, 8, 7, 2);
    ctx.strokeStyle = '#FFC531'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x + 16, y + 15, 3, Math.PI, 0); ctx.stroke();
  }

  // mercador: barraca com toldo listrado e um vendedor de capuz
  function vendedor(x, y) {
    const perto = Math.hypot(x / T + .5 - M.P.x, y / T + .5 - M.P.y) < 2.2;
    if (SJ() && SJ().aliado(ctx, 'seuTroco', x + T / 2, y + T * .95, T * 1.05, { falando: perto })) {
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#F2E8D0' : '#3DDC84'; ctx.fillRect(x + 1 + k * 7.5, y - 14, 7.5, 6); }
      return;
    }
    ctx.fillStyle = '#6B4A2E'; ctx.fillRect(x + 2, y + 18, T - 4, 10);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#F2E8D0' : '#3DDC84'; ctx.fillRect(x + 1 + k * 7.5, y - 6, 7.5, 8); }
    ctx.fillStyle = '#5A4FA0'; circ(x + T / 2, y + 10, 8);
    ctx.fillStyle = '#F4D7B5'; circ(x + T / 2, y + 11, 4.5);
    ctx.fillStyle = '#1E1240'; circ(x + T / 2 - 1.6, y + 11, 1); circ(x + T / 2 + 1.6, y + 11, 1);
    ctx.fillStyle = '#FFC531'; circ(x + 8, y + 22, 2.4); circ(x + 24, y + 22, 2.4);
  }

  function saida(x, y, fechada) {
    ctx.fillStyle = fechada ? '#2A3058' : '#0FB5D0'; circ(x, y, 13);
    ctx.fillStyle = fechada ? '#3D4578' : '#B8FBFF'; circ(x, y, 8);
    ctx.fillStyle = fechada ? '#5A6290' : '#fff'; circ(x, y, 3.5);
  }

  // cone de visão curto: o aluno aprende por onde passar
  function cone(m) {
    if (m.chefe || m.estado === 'dormindo' || m.estado === 'espreita' || (m.J.soComHeroi && !M.P.andando && m.estado !== 'caca')) return;
    const r = CF.visao.alcance * T, a = (CF.visao.angulo * Math.PI) / 180;
    ctx.fillStyle = m.estado === 'caca' ? 'rgba(255,75,92,.12)' : m.estado === 'desconfiado' ? 'rgba(255,212,59,.12)' : 'rgba(255,255,255,.07)';
    ctx.beginPath();
    ctx.moveTo(m.x * T, m.y * T);
    ctx.arc(m.x * T, m.y * T, r, m.ang - a, m.ang + a);
    ctx.closePath();
    ctx.fill();
  }

  function monstro(m, t) {
    const img = artes[m.img], w = T * m.tam, h = m.chefe ? w * 1.24 : w;
    const voo = m.voa ? 6 + Math.sin(m.bob * CF.voador.freq * 2) * 3 : 0;
    const parado = m.estado === 'dormindo' || (m.estado === 'espreita' && m.alerta <= 0) || (m.J.soComHeroi && !M.P.andando);
    const pulo = parado ? 0 : Math.abs(Math.sin(m.bob * (m.estado === 'caca' ? 9 : 5))) * 3;
    const treme = (m.alerta > 0 || (m.avanco && m.avanco.carga > 0)) && !calmo() ? Math.sin(t * 60) * 1.4 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(m.x * T, (m.y + .3) * T, w * (m.voa ? .24 : .34), 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (m.carga > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,90,.35)'; circ(m.x * T, (m.y - .2) * T, 18); ctx.globalCompositeOperation = 'source-over'; }
    // sprite: dormindo (ou escondido no mato), atacando (avisando o tiro ou a investida), andando ou parado
    const ataca = m.carga > 0 || m.alerta > 0 || (m.avanco && m.avanco.carga > 0);
    const estado = m.estado === 'dormindo' || (m.estado === 'espreita' && m.alerta <= 0) ? 'dormindo' : ataca ? 'atacando' : parado || m.chefe ? 'idle' : 'andando';
    const cx = Math.cos(m.ang), cy = Math.sin(m.ang), dir = Math.abs(cx) > Math.abs(cy) ? (cx < 0 ? 'esquerda' : 'lado') : (cy < 0 ? 'cima' : 'baixo');
    if (SJ() && SJ().monstroMapa(ctx, m, m.x * T + treme, (m.y + .3) * T - (m.voa ? 4 : 0), T * m.tam, { estado, dir, bioma: M.nome })) return;
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.translate(m.x * T + treme, (m.y + .3) * T - pulo - voo);
      if (m.olhar > 0) ctx.scale(-1, 1);
      if (m.estado === 'dormindo') ctx.globalAlpha = .9;
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
    }
  }

  // estado em cima do monstro: z dormindo, ? desconfiado, ! perseguindo
  function icone(m, t) {
    if (m.chefe || m.x < 0) return;
    const txt = m.estado === 'dormindo' ? 'z' : m.estado === 'desconfiado' ? '?' : m.estado === 'caca' || m.alerta > 0 ? '!' : '';
    if (!txt || (m.estado === 'espreita' && m.alerta <= 0)) return;
    const k = M.mapa.vistos[Math.floor(m.y) * M.mapa.C + Math.floor(m.x)];
    if (!k) return;
    const y = (m.y + .3) * T - T * m.tam - 6 - (m.estado === 'dormindo' && !calmo() ? (t * 8) % 6 : 0);
    ctx.font = '900 15px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = txt === '!' ? '#FF4B5C' : txt === '?' ? '#FFD43B' : '#C9D3FF';
    ctx.strokeText(txt, m.x * T, y);
    ctx.fillText(txt, m.x * T, y);
  }

  function olhos(m, t) {
    const d = Math.hypot(m.x - M.P.x, m.y - M.P.y);
    if (d > 8) return;
    const alerta = m.alerta > 0 || m.estado === 'caca', parado = m.estado === 'espreita' || m.estado === 'dormindo';
    const fechado = m.estado === 'dormindo' || (!alerta && !calmo() && m.pisca % 3.4 < .14);
    const a = alerta ? 1 : parado ? .3 : .8 * Math.max(.35, 1 - d / 8);
    const treme = m.alerta > 0 && !calmo() ? Math.sin(t * 60) * 1.2 : 0;
    const x = m.x * T + treme, y = (m.y - (m.chefe ? 1 : .3)) * T, sep = m.chefe ? 7 : 4.5, r = (m.chefe ? 2.6 : 1.8) * (alerta ? 1.25 : 1);
    const cor = M.bio.olhos || '255,224,138';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${cor},${a * .22})`;
    circ(x - sep, y, r * 3); circ(x + sep, y, r * 3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(${cor},${a})`;
    if (fechado) { ctx.fillRect(x - sep - r, y - .6, r * 2, 1.2); ctx.fillRect(x + sep - r, y - .6, r * 2, 1.2); }
    else { circ(x - sep, y, r); circ(x + sep, y, r); }
  }

  function heroi() {
    const P = M.P, pose = P.andando ? (Math.floor(P.passo * 8) % 2 ? 'anda1' : 'anda2') : 'parado';
    const img = cache.imgs[P.dir + pose], w = T * 1.15, h = w * 1.32, pe = (P.y + CORPO.a / 2) * T;
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(P.x * T, pe - 2, w * .32, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    let alfa = P.noMato ? CF.mato.alfa : 1;                          // no mato: meio transparente
    if ((M.graca > 0 && Math.floor(M.graca * 10) % 2) || (M.inv > 0 && Math.floor(M.inv * 10) % 2)) alfa *= .45; // pisca invencível
    ctx.globalAlpha = alfa;
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, P.x * T - w / 2, pe - h * (128 / 132), w, h);
    ctx.globalAlpha = 1;
  }

  function luzesAgora() {
    const G = M.mapa;
    return [...G.luzes, ...Perigos.luzes(G), ...Puzzles.luzes(G)];
  }
  function iluminado(x, y) {
    if (Math.hypot(x - M.P.x, y - M.P.y) < CONFIG_LUZ.lanterna * .85) return true;
    for (const L of luzesAgora()) if (Math.hypot(x - L.x, y - L.y) < L.r * .7) return true;
    if (M.bio.agua.lava) for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) if (casa(Math.floor(x) + dc, Math.floor(y) + dl) === '~') return true;
    return false;
  }

  function sombras(t, l0, l1, c0, c1) {
    const q = 8, W = Math.ceil(vw / q) + 2, H = Math.ceil(vh / q) + 2, ox = M.cam.x, oy = M.cam.y;
    if (sombra.width !== W || sombra.height !== H) { sombra.width = W; sombra.height = H; }
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, W, H);
    sctx.fillStyle = `rgba(3,3,10,${Math.min(.8, (1 - M.bio.luz) * .92)})`; // explorado e sem luz: levemente visível
    sctx.fillRect(0, 0, W, H);
    sctx.globalCompositeOperation = 'destination-out';
    const osc = calmo() ? 0 : Math.sin(t * 7) * .04 + Math.sin(t * 17) * .02;
    const furo = (x, y, r, f) => {
      const mx = (x * T - ox) / q, my = (y * T - oy) / q, mr = (r * T) / q;
      if (mx < -mr || my < -mr || mx > W + mr || my > H + mr) return;
      const g = sctx.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, `rgba(0,0,0,${f})`);
      g.addColorStop(.5, `rgba(0,0,0,${f * .85})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = g;
      sctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    };
    furo(M.P.x, M.P.y, CONFIG_LUZ.lanterna * (1 + osc), 1);
    for (const L of luzesAgora()) furo(L.x, L.y, L.r * (1 + (L.tremula ? osc * 1.5 : 0)), .9);
    for (const m of M.mapa.monstros) if (m.chefe && m.anunciado) furo(m.x, m.y - .4, 1.8, .7);
    if (M.bio.agua.lava) for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) if (M.mapa.g[l][c] === '~') furo(c + .5, l + .5, CONFIG_LUZ.lava, .55);
    ctx.drawImage(sombra, ox, oy, W * q, H * q);
  }

  function emissivos(l0, l1, c0, c1, t) {
    const G = M.mapa;
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) {
      const ch = G.g[l][c];
      if (ch === 'T') chama(c * T + T / 2, l * T + T * .6, t, c + l, 1);
      else if (ch === 'F' || ch === 'R') chama(c * T + T / 2, l * T + T / 2, t, c * 3 + l, ch === 'R' ? 1.5 : 1.3);
      else if (ch === 'X' && cumprido()) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(c * T + T / 2, l * T + T / 2, 0, c * T + T / 2, l * T + T / 2, 30);
        g.addColorStop(0, `rgba(34,232,255,${.4 + Math.sin(t * 4) * .1})`);
        g.addColorStop(1, 'rgba(34,232,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(c * T - 14, l * T - 14, T + 28, T + 28);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    for (let l = l0; l <= l1; l++) for (const e of G.porLinha[l]) {
      if (e.e.brilho && e.c >= c0 - 1 && e.c <= c1 + 1) e.e.brilho(ctx, (e.c + .5 + e.dx) * T, (e.l + .5 + e.dy) * T, t, e.v, e.q);
    }
  }

  function chama(x, y, t, s, k) {
    const f = t ? 1 + Math.sin(t * 11 + s) * .1 + Math.sin(t * 23 + s * 2) * .05 : 1;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 22 * k);
    g.addColorStop(0, 'rgba(255,170,80,.38)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 22 * k, y - 22 * k, 44 * k, 44 * k);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#FF8A2A'; oval(x, y - 4 * k * f, 3.6 * k, 6 * k * f);
    ctx.fillStyle = '#FFD27A'; oval(x, y - 3 * k * f, 2.2 * k, 4 * k * f);
    ctx.fillStyle = '#FFF6D8'; oval(x, y - 2 * k, k, 2 * k);
  }

  function particulas() {
    const c = M.bio.clima;
    if (!c || calmo()) return;
    for (const p of M.particulas) {
      const a = c.brilho ? .3 + .45 * Math.abs(Math.sin(p.f * 1.7)) : .45;
      if (c.brilho) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(${c.cor},${a * .25})`;
        circ(p.x, p.y, c.tam * p.s * 3);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = `rgba(${c.cor},${a})`;
      circ(p.x, p.y, c.tam * p.s);
    }
  }

  function textos() {
    ctx.font = '900 13px ui-rounded, "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = '#fff';
    for (const f of M.textos) {
      const y = (f.y - f.t * 1.2) * T;
      ctx.globalAlpha = 1 - f.t / .5;
      ctx.strokeText(f.txt, f.x * T, y);
      ctx.fillText(f.txt, f.x * T, y);
    }
    ctx.globalAlpha = 1;
  }

  // canto da tela: tipo do mapa, posição na receita e o que falta para abrir a saída
  function objetivo() {
    const G = M.mapa, chaves = Puzzles.hud(G);
    const txt = `${G.TM.icone} ${G.i + 1}/${M.roteiro.length}  ${cumprido() ? '✨ Saída' : falta()}${chaves ? '  🗝️' + chaves : ''}${M.P.correndo && M.P.andando ? '  🏃' : ''}`;
    ctx.font = '900 13px ui-rounded, "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 20;
    ctx.fillStyle = 'rgba(5,6,12,.62)';
    caixa(8, 8, w, 26, 13);
    ctx.fillStyle = '#E8EDFF';
    ctx.fillText(txt, 18, 21.5);
    ctx.textBaseline = 'alphabetic';
  }

  function entradaChefe() {
    const W = cv.width / dpr, H = cv.height / dpr, e = M.entrada.t;
    const a = Math.min(1, e / .3) * (e > 1.1 ? Math.max(0, 1 - (e - 1.1) / .3) : 1), k = e < .4 && !calmo() ? .6 + e : 1;
    ctx.fillStyle = `rgba(5,6,12,${.55 * a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * .3);
    ctx.scale(k, k);
    ctx.font = '900 26px ui-rounded, "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = '#FFC531';
    ctx.strokeText(`👑 ${M.entrada.nome}`, 0, 0);
    ctx.fillText(`👑 ${M.entrada.nome}`, 0, 0);
    ctx.restore();
  }

  function pintarVidas() {
    document.getElementById('mas-vidas').innerHTML = Array.from({ length: M.maxVidas }, (_, k) => (k < M.vidas ? '❤️' : '🤍')).join('');
  }

  function parar() {
    cancelAnimationFrame(raf);
    teclas.clear();
    joy.x = joy.y = 0;
    shift = false;
    if (M && M.mapa && M.vistoSujo) { gravarVistos(); M.op.aoSalvar(); }
    Audio2.ambiente(null);
    Audio2.bioma(null);
    const bt = document.getElementById('mas-reinicia');
    if (bt) bt.hidden = true;
  }

  function pausar(sim) {
    if (!M) return;
    M.pausa = sim;
    M.ultimo = 0;
    teclas.clear();
  }
  function coracao() {
    if (!M) return;
    M.maxVidas++;
    M.vidas++;
    pintarVidas();
  }

  return { abrir, parar, pausar, coracao, info: () => M && { mapa: M.mapa.id, tipo: M.mapa.tipo, i: M.mapa.i, vidas: M.vidas, P: { x: M.P.x, y: M.P.y }, monstros: M.mapa.monstros.map(m => ({ nome: m.nome, estado: m.estado, x: m.x, y: m.y })), puzzles: M.mapa.puzzles.map(p => ({ tipo: p.tipo, resolvido: p.resolvido })) } };
})();

// =====================================================================
// BATALHA por turnos: monstro no alto à direita, aluno de costas embaixo
// =====================================================================
const Batalha = (() => {
  const $b = id => document.getElementById(id);
  let op = null, fala = 0;

  function abrir(o) {
    op = o;
    const m = o.monstro, b = $b('batalha'), arena = $b('arena');
    b.hidden = false;
    arena.classList.toggle('chefe', !!m.chefe);
    b.style.setProperty('--a1', m.cores.a1);
    b.style.setProperty('--a2', m.cores.a2);
    nome(m);
    $b('b-arte').className = 'b-arte-m' + (m.chefe ? ' grande' : '');
    $b('b-carga').hidden = !o.carga;
    carga(0);
    relogio(0);
    if (!(SJ() && SJ().batalha.abrir($b('b-arte'), m))) $b('b-arte').innerHTML = m.arte || desenharMonstro(m.tema, m.chefe);
    $b('b-poderes').hidden = true;
    $b('b-efeitos').textContent = '';
    $b('b-dano').classList.remove('pop');
    $b('b-heroi').className = 'b-arte-h';
    $b('b-heroi').innerHTML = desenharPersonagem(o.personagem, 'parado', 'cima');
    $b('b-respostas').innerHTML = '';
    $b('b-fala').textContent = `${m.nome} apareceu!`;
    $b('b-dica').innerHTML = '';
    $b('b-segue').hidden = true;
    vida(m.vida, m.max);
    vidas(o.vidas);
    Audio2.musica(m.chefe ? 'chefao' : 'batalha');
    $b('b-poder').disabled = !o.aoPoder;
    $b('b-poder').onclick = () => o.aoPoder && o.aoPoder();
    $b('b-dicabt').onclick = () => o.aoDica();
    if (m.chefe) { // entrada dramática: escurece, o chefão desce, nome grande, tremor
      animar(arena, 'escurece');
      animar($b('b-arte'), 'desce');
      banner(`👑 ${m.nome}`);
      som('chefe');
      vibrar([150, 60, 150]);
      setTimeout(() => animar(arena, 'balanca'), 450);
    }
  }

  // nome com o tema, a fraqueza e os modificadores (🧱 escudo · 🧬 mutante · 😡 enfurecido)
  function nome(m) {
    $b('b-nome').textContent = `${ICONE_TEMA[m.tema] || ''} ${m.nome}${m.fraqueza ? ` · fraco a ${PODER_ICONE[m.fraqueza]}` : ''}${m.mods && m.mods.length ? ' · ' + m.mods.map(k => ICONE_MOD[k]).join('') : ''}`;
  }

  // barra fina do bônus rápido: esvazia sozinha em "seg" segundos, sem som; relogio(0) para e some
  function relogio(seg) {
    const r = $b('b-relogio'), i = r.firstElementChild;
    if (!seg) { i.style.width = getComputedStyle(i).width; r.classList.remove('vivo'); return; }
    i.style.transition = 'none';
    i.style.width = '100%';
    void i.offsetWidth;
    i.style.transition = `width ${seg}s linear`;
    i.style.width = '0%';
    r.classList.add('vivo');
  }

  // barra de carga do ataque forte (mini-chefe e chefão): brilha mais perto do fim, sem alarme
  function carga(f) {
    const c = $b('b-carga'), k = Math.max(0, Math.min(1, f));
    c.firstElementChild.style.width = 100 * k + '%';
    c.classList.toggle('quase', k >= .75);
    $b('b-arte').classList.toggle('carrega', k >= .75 && !c.hidden);
    if (SJ()) SJ().batalha.carga(c.hidden ? 0 : k);
  }
  const blindado = sim => $b('b-arte').classList.toggle('blindado', !!sim);
  const furia = sim => $b('b-arte').classList.toggle('furia', !!sim);
  function mutou(m) {
    nome(m);
    $b('b-arte').classList.add('mutante');
    animar($b('b-arte'), 'muta');
    banner(`${ICONE_MOD.mutante} ${ICONE_TEMA[m.tema] || ''}`);
  }

  function banner(txt) {
    const b = $b('b-banner');
    b.textContent = txt;
    animar(b, 'mostra');
  }

  // fase do chefão: novo tipo de pergunta e cor mais brava
  function fase(n, rotulo) {
    const a = $b('b-arte');
    a.classList.remove('fase2', 'fase3');
    if (n > 1) a.classList.add('fase' + n);
    if (SJ()) SJ().batalha.fase(n);
    banner(`Fase ${n} · ${rotulo}`);
  }

  // poderes das cartas: lista curta acima das respostas
  function poderes(lista, escolher) {
    const p = $b('b-poderes');
    if (!p.hidden) { p.hidden = true; return; }
    p.innerHTML = lista.map(x => `<button class="b-poder" data-id="${x.id}"${x.qtd ? '' : ' disabled'}><span>${x.icone}</span><b>${x.nome} · ${x.qtd}</b><small>${x.efeito}</small></button>`).join('');
    p.hidden = false;
    p.onclick = e => { const bt = e.target.closest('.b-poder'); if (!bt || bt.disabled) return; p.hidden = true; escolher(bt.dataset.id); };
  }

  function eliminar(k) {
    const bt = botoes()[k];
    if (bt) { bt.disabled = true; bt.classList.add('fora'); }
  }

  function efeitos(selos, dicaTxt, poderTxt) {
    $b('b-efeitos').textContent = selos;
    $b('b-dicabt').textContent = dicaTxt;
    $b('b-poder').textContent = poderTxt;
  }

  function vida(v, max) {
    const i = $b('b-vida'), f = v / max;
    i.style.width = 100 * f + '%';
    i.style.background = f > .5 ? 'var(--ok)' : f > .25 ? 'var(--ouro)' : 'var(--erro)';
    $b('b-pv').textContent = `${v}/${max}`;
  }

  function vidas(n, perdeu) {
    $b('b-vidas').innerHTML = Array.from({ length: op.maxVidas }, (_, k) => `<span class="${perdeu && k === n ? 'perde' : ''}">${k < n ? '❤️' : '🤍'}</span>`).join('');
  }

  // a pergunta aparece digitando (até 0,45 s); as respostas ficam numa grade 2x2
  function perguntar(q, pronto) {
    $b('b-poderes').hidden = true;
    $b('b-dica').innerHTML = '';
    $b('b-segue').hidden = true;
    const r = $b('b-respostas');
    r.innerHTML = '';
    q.opcoes.forEach((o, i) => {
      const bt = document.createElement('button');
      bt.className = 'b-resp' + (o.length > 6 ? ' longa' : '');
      bt.dataset.i = i;
      bt.textContent = o;
      r.appendChild(bt);
    });
    r.onclick = e => { const bt = e.target.closest('.b-resp'); if (bt && !bt.disabled) op.aoResponder(+bt.dataset.i); };
    const el = $b('b-fala'), n = q.texto.length, porVez = Math.max(1, Math.ceil(n / 28));
    let k = 0;
    clearInterval(fala);
    el.textContent = '';
    fala = setInterval(() => {
      k = Math.min(n, k + porVez);
      el.textContent = q.texto.slice(0, k);
      if (k >= n) { clearInterval(fala); if (pronto) pronto(); }
    }, 16);
  }

  const botoes = () => [...$b('b-respostas').children];
  const travar = () => botoes().forEach(b => (b.disabled = true));
  const animar = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function numero(txt, cor) {
    const d = $b('b-dano');
    d.textContent = txt;
    d.style.color = cor;
    animar(d, 'pop');
  }

  // acerto: o aluno avança e ataca, o monstro treme e a vida desce
  function acerto(i, dano, v, max, rapido, cb, txt) {
    clearInterval(fala);
    travar();
    botoes()[i].classList.add('certa');
    animar($b('b-heroi'), 'ataca');
    Audio2.sfx('acerto');
    carga(0);
    setTimeout(() => {
      animar($b('b-arte'), 'dor');
      if (SJ()) SJ().batalha.evento('ferido');
      vida(v, max);
      numero(txt || `Acerto! ${dano} de dano${rapido ? ' ⚡' : ''}`, '#fff');
      Audio2.sfx('golpe');
      vibrar(30);
    }, 200);
    setTimeout(cb, 900);
  }

  // erro (ou ataque carregado, i = -1): o monstro ataca, a tela balança, sai um coração e aparece a dica
  function erro(i, certa, q, n, txt, cb) {
    clearInterval(fala);
    travar();
    if (botoes()[i]) botoes()[i].classList.add('errada');
    if (botoes()[certa]) botoes()[certa].classList.add('certa');
    if (i < 0) $b('b-fala').textContent = q.texto;
    carga(0);
    animar($b('b-arte'), 'investe');
    if (SJ()) SJ().batalha.evento(i < 0 ? 'ataqueForte' : 'ataque');
    setTimeout(() => {
      animar($b('arena'), 'balanca');
      som('erro');
      vibrar([80, 40, 80]);
      vidas(n, true);
      numero(txt, '#FFB3BB');
      dica(q.dica, q.visual);
      const s = $b('b-segue');
      s.hidden = false;
      s.onclick = () => { s.hidden = true; som('clique'); cb(); };
    }, 250);
  }

  function dica(txt, visual) {
    $b('b-dica').innerHTML = `💡 ${esc(txt)}${visual ? `<div class="visual">${visual}</div>` : ''}`;
  }

  function vitoria(txt, cb, chefe) {
    $b('b-respostas').innerHTML = '';
    if (chefe) { banner('🏆 Vitória!'); confete(); }
    if (!(SJ() && SJ().batalha.evento('morrendo'))) animar($b('b-arte'), 'desmaia');
    numero(txt, '#FFE48A');
    $b('b-fala').textContent = '🎉 Monstro derrotado!';
    som('vitoria');
    setTimeout(cb, chefe ? 1600 : 1100);
  }

  function derrota(cb) {
    $b('b-respostas').innerHTML = '';
    animar($b('b-heroi'), 'desmaia');
    $b('b-fala').textContent = '💔 Sem corações! De volta ao início';
    Audio2.sfx('derrota');
    const s = $b('b-segue');
    s.hidden = false;
    s.onclick = () => { s.hidden = true; som('clique'); cb(); };
  }

  function fechar() {
    clearInterval(fala);
    relogio(0);
    if (SJ()) SJ().batalha.fechar();
    $b('batalha').hidden = true;
  }

  return { abrir, perguntar, acerto, erro, dica, vitoria, derrota, fechar, fase, poderes, eliminar, efeitos, banner, relogio, carga, blindado, furia, mutou };
})();
