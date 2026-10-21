/* Mohamed — monstros_castelo.js: os 3 monstros do Castelo (tema Revisão, acento cinza-azulado e dourado), desenhados por código.
   Mesma API de monstros_campo.js: Sprites.registrar(id, { nome, w, h, estados, vistas, desenhar(ctx, p) })
     p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t: segundos, prog: 0..1 }
     (também aceita desenhar(ctx, estado, vista, t, dir))
   Estados: idle, andando (Grimório e Fantasma flutuando), atacando, ferido, morrendo (prog 0→1; sem prog repete, para prévia).
   batalha: de frente, grande, olhando para o aluno · mapa: pequeno, 3 direções ('esquerda' espelha o 'lado').
   Formas simples, sem imagens e sem shadowBlur; "reduzir movimento" acalma o balanço e tira o piscar do ferido. */
(() => {
  const TINTA = '#1E1240', TAU = Math.PI * 2;
  const AZULADO = '#8FA3C8', AZULADO_CL = '#D6E0F5', DOURADO = '#F2C14E', DOURADO_CL = '#FFE6A0'; // acentos do Castelo
  const SINAIS_REVISAO = ['+', '7', '−', '3×2', '÷'];
  const menos = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let esp = 1; // espessura do contorno (1 na batalha, 1,7 no mapa)

  // ---------- Sprites mínimo (só se o jogo ainda não tiver um) ----------
  if (typeof Sprites === 'undefined') {
    window.Sprites = (() => {
      const tabela = {};
      return {
        registrar(id, def) { tabela[id] = def; },
        def: id => tabela[id],
        lista: () => Object.keys(tabela),
        desenhar(ctx, id, x, y, tam, o = {}) {
          const d = tabela[id];
          if (!d) return;
          const k = (tam || d.h) / d.h;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(o.espelho ? -k : k, k);
          d.desenhar(ctx, { ...o, estado: o.estado || 'idle', t: o.t != null ? o.t : performance.now() / 1000 });
          ctx.restore();
        }
      };
    })();
  }

  // ---------- pincéis ----------
  function pinta(g, cor, linha = 3) {
    if (cor) { g.fillStyle = cor; g.fill(); }
    if (linha) { g.lineWidth = linha * esp; g.strokeStyle = TINTA; g.stroke(); }
  }
  function elipse(g, x, y, rx, ry, cor, linha = 3, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); pinta(g, cor, linha); }
  const bola = (g, x, y, r, cor, linha = 3) => elipse(g, x, y, r, r, cor, linha);
  function caixa(g, x, y, w, h, r, cor, linha = 3) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    pinta(g, cor, linha);
  }
  function poligono(g, pts, cor, linha = 3) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); pinta(g, cor, linha); }
  function traco(g, cor, lw, fn) { g.beginPath(); fn(); g.lineWidth = lw * esp; g.strokeStyle = cor; g.stroke(); }
  function traco2(g, cor, lw, fn) { traco(g, TINTA, lw + 2.2, fn); traco(g, cor, lw, fn); }
  function reflexo(g, x, y, rx, ry, a = .55) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, -.6, 0, TAU); g.fill(); }
  function aura(g, x, y, r, cor) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function sombra(g, rx) { g.fillStyle = 'rgba(0,0,0,.26)'; g.beginPath(); g.ellipse(0, 0, rx, rx * .26, 0, 0, TAU); g.fill(); }
  function estrela(g, x, y, r, cor) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = cor; g.fill();
  }
  // conta (texto, ex.: "3×2") ou sinal (+ − × ÷) com contorno escuro
  function sinal(g, s, x, y, tam, cor) {
    if (/\d/.test(s)) {
      g.font = `900 ${Math.round(tam * 2.6)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3 * esp; g.strokeStyle = TINTA; g.strokeText(s, x, y);
      g.fillStyle = cor; g.fillText(s, x, y);
      return;
    }
    const k = tam;
    traco2(g, cor, Math.max(2, k * .5), () => {
      if (s === '+' || s === '−' || s === '÷') { g.moveTo(x - k, y); g.lineTo(x + k, y); }
      if (s === '+') { g.moveTo(x, y - k); g.lineTo(x, y + k); }
      if (s === '×') { g.moveTo(x - k * .75, y - k * .75); g.lineTo(x + k * .75, y + k * .75); g.moveTo(x + k * .75, y - k * .75); g.lineTo(x - k * .75, y + k * .75); }
      if (s === '÷') { g.moveTo(x, y - k * .75); g.lineTo(x, y - k * .7); g.moveTo(x, y + k * .7); g.lineTo(x, y + k * .75); }
    });
  }
  // ferido: pisca branco (menos olhos e boca)
  const brancos = new Map();
  function cores(base, o) {
    if (!o.flash) return base;
    if (!brancos.has(base)) brancos.set(base, Object.fromEntries(Object.entries(base).map(([k, v]) => [k, /esclera|iris|olho|boca|viseira/.test(k) ? v : '#FFF3F6'])));
    return brancos.get(base);
  }
  // olho bravo mas fofo: lado = -1 esquerdo, 1 direito
  function olhoBravo(g, o, x, y, r, iris, lado, pele, esclera, mx = 0) {
    const lw = Math.max(2, r * .2);
    if (o.est === 'ferido') {
      traco(g, TINTA, Math.max(2.2, r * .3), () => { const pa = x - lado * r * .5, pb = x + lado * r * .6; g.moveTo(pb, y - r * .5); g.lineTo(pa, y); g.lineTo(pb, y + r * .5); });
      return;
    }
    if (o.est === 'morrendo') { // tonto, em espiral
      traco(g, TINTA, Math.max(1.6, r * .18), () => { for (let k = 0; k <= 14; k++) { const a = k * .8 + o.t * 8, q = r * k / 15; if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x, y); } });
      return;
    }
    bola(g, x, y, r, esclera, lw);
    if (o.pisca) {
      g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.fillStyle = pele; g.fillRect(x - r, y - r, 2 * r, r * 1.1); g.restore();
      traco(g, TINTA, lw, () => { g.moveTo(x - r * .85, y + r * .1); g.lineTo(x + r * .85, y + r * .1); });
      bola(g, x, y, r, null, lw);
      return;
    }
    bola(g, x + mx, y + r * .1, r * .62, iris, 0);
    bola(g, x + mx, y + r * .1, r * .32, TINTA, 0);
    bola(g, x + mx - r * .22, y - r * .18, r * .2, '#fff', 0);
    bola(g, x + mx + r * .2, y + r * .32, r * .09, '#fff', 0);
    const b = o.est === 'atacando' ? .75 : .5, meio = y - r * (1 - b * 1.2), borda = y - r * 1.05;
    const ox = x + lado * r * 1.3, ix = x - lado * r * 1.3;
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    g.beginPath(); g.moveTo(ox, y - r * 1.4); g.lineTo(ox, borda); g.lineTo(ix, meio); g.lineTo(ix, y - r * 1.4); g.closePath();
    g.fillStyle = pele; g.fill();
    g.restore();
    traco(g, TINTA, Math.max(2.4, r * .26), () => { g.moveTo(ox + (ix - ox) * .12, borda + (meio - borda) * .12); g.lineTo(ox + (ix - ox) * .88, borda + (meio - borda) * .88); });
    bola(g, x, y, r, null, lw);
  }
  function bocaBrava(g, o, x, y, w, escura) {
    if (o.est === 'atacando') {
      elipse(g, x, y + w * .2, w * .55, w * .42, escura, 2.2);
      poligono(g, [x - w * .38, y - w * .14, x - w * .14, y - w * .14, x - w * .26, y + w * .14], '#fff', 0);
      poligono(g, [x + w * .38, y - w * .14, x + w * .14, y - w * .14, x + w * .26, y + w * .14], '#fff', 0);
    } else if (o.est === 'ferido') traco(g, TINTA, 2.2, () => { g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w / 4, y - 2.5, x, y); g.quadraticCurveTo(x + w / 4, y + 2.5, x + w / 2, y); });
    else if (o.est === 'morrendo') elipse(g, x, y, w * .22, w * .28, escura, 2);
    else traco(g, TINTA, 2.3, () => { g.moveTo(x - w * .42, y + 1.5); g.quadraticCurveTo(x, y - w * .22, x + w * .42, y + 1.5); });
  }
  function curativo(g, x, y) { // ferido: curativo em X (nada de sangue)
    g.save(); g.translate(x, y); g.rotate(.6);
    caixa(g, -7, -2.5, 14, 5, 2.5, '#F5C76A', 1.8);
    caixa(g, -2.5, -7, 5, 14, 2.5, '#F5C76A', 1.8);
    g.restore();
  }

  // ---------- efeitos comuns ----------
  function rodamoinho(g, o, cy, r) { // ataque: redemoinho cinza-azulado e dourado
    aura(g, 0, cy, r * 1.2, 'rgba(143,163,200,.28)');
    const a0 = g.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const a = o.t * (5 + k) * Math.max(o.mov, .3) + k * 2.1, q = 1 - k * .14;
      g.globalAlpha = a0 * (.8 - k * .2);
      traco(g, [AZULADO_CL, DOURADO, AZULADO][k], 3.2 - k * .7, () => g.ellipse(0, cy + 8, r * q, r * .4 * q, -.18, a, a + 2.3));
    }
    g.globalAlpha = a0;
  }
  function sinaisOrbitando(g, o, cy, r, lista, frente) { // os de trás antes do corpo, os da frente depois
    const a0 = g.globalAlpha;
    lista.forEach((s, k) => {
      const a = o.t * 1.8 * Math.max(o.mov, .3) + k * TAU / lista.length, sn = Math.sin(a);
      if ((sn >= 0) !== frente) return;
      g.globalAlpha = a0 * (frente ? .75 + .25 * sn : .45 + .2 * sn);
      sinal(g, s, Math.cos(a) * r, cy + sn * r * .32, 4, k % 2 ? DOURADO_CL : AZULADO_CL);
    });
    g.globalAlpha = a0;
  }
  function fimEmBrilho(g, cy, r, p, fumaca) { // fim: fumacinha e brilhos (nada sangrento)
    const a0 = g.globalAlpha;
    if (p > .25) {
      const f = (p - .25) / .75;
      g.globalAlpha = a0 * (1 - f) * .75;
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; bola(g, Math.cos(a) * r * f, cy + Math.sin(a) * r * f * .6 - f * 16, 5 + 8 * f, fumaca, 0); }
    }
    for (let k = 0; k < 7; k++) {
      const a = k * TAU / 7 + .4, v = r * (.6 + (k % 3) * .3);
      g.globalAlpha = a0 * Math.max(0, 1 - p);
      estrela(g, Math.cos(a) * v * p, cy + Math.sin(a) * v * p * .8 - p * 22, 2 + 2.5 * Math.sin(p * Math.PI), k % 2 ? DOURADO_CL : AZULADO_CL);
    }
    g.globalAlpha = a0;
  }
  function morrer(g, o, cy, r, desenha, fumaca = '#7A8098') { // encolhe, gira e some
    const p = o.prog, a0 = g.globalAlpha, s = 1 - p * .7;
    g.save();
    g.globalAlpha = a0 * Math.max(0, 1 - p * 1.15);
    g.translate(0, cy); g.rotate(p * .6); g.scale(s, s); g.translate(0, -cy);
    desenha();
    g.restore();
    fimEmBrilho(g, cy, r, p, fumaca);
  }

  // ---------- Armadurão: armadura vazia com olhos de luz azul, espada grande e capa ----------
  const ARMADURAO = { metal: '#8E96B8', metalC: '#B8C0DC', metalE: '#5E6688', ouro: '#F2C14E', viseira: '#141428', olho: '#5AC8FF', capa: '#2E3A8C', pluma: '#3A7BFF', plumaC: '#7FB4FF', lamina: '#D6E0F5', joia: '#5AC8FF' };
  function espada(g, x, y, ang, C, S) { // 0 = lâmina para cima
    g.save(); g.translate(x, y); g.rotate(ang);
    poligono(g, [-4, -4, -4.5, -38, 0, -46, 4.5, -38, 4, -4], C.lamina, 2.6);
    if (!S) traco(g, C.metalC, 1.4, () => { g.moveTo(0, -6); g.lineTo(0, -38); });
    caixa(g, -2, 1, 4, 9, 1.5, '#6B4226', 1.8);
    bola(g, 0, 11, 2.8, C.ouro, 1.6);
    caixa(g, -11, -4, 22, 5, 2, C.ouro, 2);
    poligono(g, [0, -5, 2.6, -1.5, 0, 2, -2.6, -1.5], C.joia, 1.2);
    g.restore();
  }
  function escudo(g, x, y, C) {
    g.save(); g.translate(x, y);
    poligono(g, [0, -12, 10, -8, 8, 6, 0, 14, -8, 6, -10, -8], C.metalC, 2.6);
    traco(g, C.ouro, 2, () => { g.moveTo(0, -9.5); g.lineTo(7.6, -6.4); g.lineTo(6, 4.8); g.lineTo(0, 11); g.lineTo(-6, 4.8); g.lineTo(-7.6, -6.4); g.closePath(); });
    poligono(g, [0, -5, 4, 1, 0, 7, -4, 1], C.joia, 1.4);
    g.restore();
  }
  function pluma(g, x, y, o, C) { // penacho azul que ondula
    const w = Math.sin(o.t * 3) * 3 * o.mov;
    g.beginPath(); g.moveTo(x - 3, y + 2); g.quadraticCurveTo(x - 4, y - 14, x + 6 + w, y - 18); g.quadraticCurveTo(x + 18 + w * 1.4, y - 16, x + 22 + w * 1.6, y - 6);
    g.quadraticCurveTo(x + 14 + w, y - 9, x + 10, y - 6); g.quadraticCurveTo(x + 6, y - 2, x + 4, y + 2); g.closePath();
    pinta(g, C.pluma, 2.4);
    traco(g, C.plumaC, 1.6, () => { g.moveTo(x, y - 4); g.quadraticCurveTo(x + 2, y - 13, x + 10 + w, y - 14); });
  }
  function olhosLuz(g, o, x, y, C, um, luz) { // olhos de luz azul dentro da viseira escura
    if (o.est === 'morrendo') return;
    const a0 = g.globalAlpha;
    aura(g, x, y, 16, `rgba(90,200,255,${.25 + .25 * luz})`);
    g.globalAlpha = a0 * (.55 + .45 * luz);
    if (o.est === 'ferido' || o.pisca) traco(g, C.olho, 2.2, () => { g.moveTo(x - 8, y - 1); g.lineTo(x - 3, y + 1); g.moveTo(x + 3, y + 1); g.lineTo(x + 8, y - 1); });
    else if (um) elipse(g, x + 3, y, 4, 2.2, C.olho, 0, -.3);
    else { elipse(g, x - 5.5, y, 4, 2.4, C.olho, 0, .32); elipse(g, x + 5.5, y, 4, 2.4, C.olho, 0, -.32); }
    g.globalAlpha = a0;
  }
  function armaduraoCorpo(g, o, C, bracoD, espAng, luz, levE, levD) {
    const S = o.simples, d = o.dir, L = d === 'lado', costas = d === 'cima';
    const capa = () => poligono(g, [L ? -12 : -18, -60, L ? 8 : 18, -60, L ? 10 : 26, -10, L ? 4 : 16, -14, L ? -2 : 6, -8, L ? -8 : -6, -14, L ? -14 : -16, -9, L ? -20 : -26, -12], C.capa, 2.6);
    if (!costas) capa();
    const perna = (x, lev) => { caixa(g, x, -24 - lev, 11, 20, 4, C.metal, 2.6); elipse(g, x + 5.5, -4 - lev, 7.5, 4.5, C.metalE, 2.4); };
    perna(L ? -9 : -14, levE);
    perna(L ? -1 : 3, levD);
    caixa(g, L ? -14 : -18, -58, L ? 28 : 36, 32, 10, C.metal); // peitoral
    if (!S && !costas) {
      traco(g, C.ouro, 2.2, () => { g.moveTo(L ? -6 : -12, -56); g.lineTo(L ? 4 : 0, -40); g.lineTo(L ? 12 : 12, -56); });
      poligono(g, [L ? 4 : 0, -50, (L ? 4 : 0) + 4, -45, L ? 4 : 0, -40, (L ? 4 : 0) - 4, -45], C.joia, 1.4);
    }
    caixa(g, L ? -14 : -18, -29, L ? 28 : 36, 6, 2, C.metalE, 2); // cinto
    if (!costas) caixa(g, (L ? 4 : 0) - 3.5, -30, 7, 8, 1.5, C.ouro, 1.6);
    if (costas) capa();
    // ombreiras douradas com espinho
    for (const s of L ? [1] : [-1, 1]) {
      const x = L ? 2 : s * 21;
      poligono(g, [x - 3, -61, x + s * 2, -68, x + 4, -61], C.ouro, 1.8);
      elipse(g, x, -56, 11, 8, C.metalC, 2.6);
      traco(g, C.ouro, 2, () => g.ellipse(x, -56, 11, 8, 0, Math.PI * .05, Math.PI * .95));
    }
    // braço esquerdo com escudo (de frente)
    if (!L && !costas) { caixa(g, -26, -54, 9, 20, 4.5, C.metal, 2.4); escudo(g, -27, -36, C); }
    // elmo com viseira, chifrinhos dourados e penacho
    g.save();
    g.translate(L ? 2 : 0, -80 + o.respira);
    pluma(g, L ? -6 : -2, -14, o, C);
    if (!L) { poligono(g, [-14, -6, -19, -15, -11, -11], C.ouro, 1.8); poligono(g, [14, -6, 19, -15, 11, -11], C.ouro, 1.8); }
    elipse(g, 0, 0, 17, 16, C.metal);
    if (costas) traco(g, C.ouro, 2.2, () => { g.moveTo(0, -15); g.lineTo(0, 12); });
    else {
      caixa(g, L ? 1 : -12, -5, L ? 15 : 24, 11, 5, C.viseira, 2.2);
      traco(g, C.ouro, 2.2, () => { g.moveTo(L ? 6 : 0, -15.5); g.lineTo(L ? 6 : 0, -5.5); });
      olhosLuz(g, o, L ? 6 : 0, .5, C, L, luz);
    }
    reflexo(g, -7, -9, 5, 2.6, .45);
    g.restore();
    // braço direito com a espada (gira no golpe)
    if (!costas) {
      const sx = L ? 6 : 21, sy = -54, hx = sx - Math.sin(bracoD) * 20, hy = sy + Math.cos(bracoD) * 20;
      g.save(); g.translate(sx, sy); g.rotate(bracoD); caixa(g, -4.5, -2, 9, 22, 4.5, C.metal, 2.4); g.restore();
      espada(g, hx, hy, espAng, C, S);
      bola(g, hx, hy, 5.2, C.metalE, 2.4);
    }
  }
  function armadurao(g, o) {
    const C = cores(ARMADURAO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), L = o.dir === 'lado';
    const passo = anda ? Math.sin(o.t * 3 * mexe) : 0, sobe = anda ? Math.abs(passo) * 2.5 : o.respira * .5, incl = anda ? passo * .04 : 0; // avança devagar
    const fase = (o.t * 1.2 * mexe) % 1, corte = ataca && fase >= .6;
    let bracoD = -.35, espAng = -.12;
    if (ataca) { // levanta a espada devagar e corta rápido
      if (fase < .6) { const f = fase / .6; bracoD = -.3 - 2.3 * f; espAng = -.1 - .8 * f; }
      else { const f = (fase - .6) / .4; bracoD = -2.6 + 2.7 * f; espAng = -.9 + 2.9 * f; }
    } else if (anda) bracoD = -.3 + passo * .1;
    const luz = o.est === 'ferido' ? (Math.sin(o.t * 30) > 0 ? 1 : .2) : .7 + .3 * Math.sin(o.t * 2.6);
    sombra(g, 30 * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, -50, 52); sinaisOrbitando(g, o, -64, 58, SINAIS_REVISAO, false); }
    const desenha = () => {
      g.save(); g.translate(o.treme, -sobe); g.rotate(incl);
      armaduraoCorpo(g, o, C, bracoD, espAng, luz, Math.max(0, passo) * 4, Math.max(0, -passo) * 4);
      g.restore();
    };
    if (o.est === 'morrendo') {
      morrer(g, o, -54, 44, desenha);
      for (let k = 0; k < 5; k++) { // pecinhas de metal se soltando
        const a = -2.8 + k * .7, q = 18 + o.prog * 34;
        g.globalAlpha = a0 * Math.max(0, 1 - o.prog);
        poligono(g, [Math.cos(a) * q, -54 + Math.sin(a) * q + o.prog * o.prog * 24, Math.cos(a) * q + 6, -54 + Math.sin(a) * q + 2, Math.cos(a) * q + 2, -54 + Math.sin(a) * q + 6], C.metalC, 1.6);
      }
      g.globalAlpha = a0;
      return;
    }
    desenha();
    if (corte) { // meia-lua de luz azul acompanhando a espada
      const f = (fase - .6) / .4, sx = L ? 6 : 21, sy = -54 - sobe, a1 = -Math.PI / 2 - .9, a2 = -Math.PI / 2 + espAng;
      g.globalAlpha = a0 * (1 - f);
      g.beginPath(); g.arc(sx, sy, 64, a1, a2); g.arc(sx, sy, 50, a2, a1, true); g.closePath();
      g.fillStyle = 'rgba(160,220,255,.7)'; g.fill();
      g.globalAlpha = a0;
    }
    if (ataca) sinaisOrbitando(g, o, -64, 58, SINAIS_REVISAO, true);
    if (o.est === 'ferido') for (let k = 0; k < 3; k++) { // fumacinha saindo da armadura
      const f = (o.t * 1.4 + k / 3) % 1;
      g.globalAlpha = a0 * (1 - f) * .6;
      bola(g, (k - 1) * 18, -70 - f * 18, 3 + f * 4, '#6A6E80', 0);
    }
    g.globalAlpha = a0;
  }

  // ---------- Grimório Mordedor: livro voador com dentes, soltando páginas com números ----------
  const GRIMORIO = { capa: '#5B2E9E', capaC: '#7B4FC0', ouro: '#F2C14E', pagina: '#FFF4D8', paginaE: '#D9C89A', joia: '#B07CFF', esclera: '#FFE07A', iris: '#7A2A10', boca: '#2A0E3A', lingua: '#FF6FA8', dente: '#FFFFFF', fita: '#B0306A' };
  const NUMEROS_PAGINAS = ['2', '3', '7', '5'];
  function pagina(g, x, y, ang, s, num, C) { // pagininha com um número
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    caixa(g, -6, -7.5, 12, 15, 1.5, C.pagina, 1.8);
    g.font = '900 9px ui-rounded, "Nunito", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#E89A2A'; g.fillText(num, 0, .5);
    g.restore();
  }
  function paginasOrbita(g, o, cy, C, frente) { // páginas que rodam em volta do livro
    for (let k = 0; k < 3; k++) {
      const a = o.t * .9 * Math.max(o.mov, .3) + k * 2.1, sn = Math.sin(a);
      if ((sn >= 0) !== frente) continue;
      pagina(g, Math.cos(a) * 40, cy + sn * 12, Math.sin(o.t * 2 + k) * .4, .8 + .2 * sn, NUMEROS_PAGINAS[k], C);
    }
  }
  function bocaLivro(g, o, x, y, w, abre, C) { // a abertura do livro é a boca: dentes em cima e embaixo, língua para fora
    const h = 2 + abre * 9, n = 6, larg = w * 1.7 / n;
    elipse(g, x, y, w, h, C.boca, 2.4);
    g.save();
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, TAU); g.clip();
    g.fillStyle = C.dente;
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const dx = x - w * .85 + (k + .5) * larg, dw = larg * .45, dh = Math.min(4.5, h * .7);
      g.moveTo(dx - dw, y - h); g.lineTo(dx, y - h + dh + 1); g.lineTo(dx + dw, y - h);
      g.moveTo(dx - dw, y + h); g.lineTo(dx, y + h - dh - 1); g.lineTo(dx + dw, y + h);
    }
    g.fill();
    g.restore();
    if (abre > .25 && o.est !== 'ferido') elipse(g, x + 4, y + h + 1.5, 4.2, 3 + abre * 3, C.lingua, 1.8);
  }
  function grimorioCorpo(g, o, C, abre) {
    const S = o.simples, d = o.dir, L = d === 'lado', costas = d === 'cima', w = L ? 13 : 24;
    if (!S) for (const [x, a] of [[-6, -.4], [0, 0], [6, .4]]) { // tufo de páginas saindo em cima
      g.save(); g.translate(x * (L ? .5 : 1), -30); g.rotate(a + Math.sin(o.t * 4 + x) * .1 * o.mov);
      poligono(g, [-3, 2, 0, -9, 3, 2], C.pagina, 1.6);
      g.restore();
    }
    caixa(g, -w + 3, -27, w * 2, 51, 5, C.pagina, 2.4); // bloco de páginas
    if (!S) traco(g, C.paginaE, 1, () => { for (let k = 0; k < 3; k++) { g.moveTo(-w + 6, 21 + k * 1.2); g.lineTo(w, 21 + k * 1.2); } });
    traco2(g, C.fita, 2, () => { g.moveTo(8, 20); g.quadraticCurveTo(12 + Math.sin(o.t * 3) * 2 * o.mov, 27, 9, 33); }); // fitinha marcadora
    caixa(g, -w, -30, w * 2, 50, 6, C.capa, 3); // capa
    if (!S) traco(g, C.capaC, 1.4, () => { g.rect(-w + 4, -26, w * 2 - 8, 42); });
    for (const [cx, cy, ix, iy] of [[-w, -30, 1, 1], [w, -30, -1, 1], [-w, 20, 1, -1], [w, 20, -1, -1]]) // cantoneiras douradas
      poligono(g, [cx, cy, cx + 10 * ix, cy, cx + 10 * ix, cy + 4 * iy, cx + 4 * ix, cy + 4 * iy, cx + 4 * ix, cy + 10 * iy, cx, cy + 10 * iy], C.ouro, 2);
    if (costas) { // costas: emblema de losango
      poligono(g, [0, -18, 10, -5, 0, 8, -10, -5], C.ouro, 2.2);
      poligono(g, [0, -12, 5, -5, 0, 2, -5, -5], C.joia, 1.4);
      return;
    }
    const fx = L ? 5 : 0;
    poligono(g, [fx, -28, fx + 5, -22, fx, -16, fx - 5, -22], C.ouro, 2);
    poligono(g, [fx, -25.5, fx + 2.6, -22, fx, -18.5, fx - 2.6, -22], C.joia, 0);
    if (L) olhoBravo(g, o, fx + 3, -6, 7, C.iris, 1, C.capa, C.esclera, 1.2);
    else {
      olhoBravo(g, o.est === 'ferido' ? { ...o, est: 'morrendo' } : o, -9, -6, 7.5, C.iris, -1, C.capa, C.esclera); // ferido: um olho tonto
      olhoBravo(g, o, 9, -6, 7.5, C.iris, 1, C.capa, C.esclera);
    }
    bocaLivro(g, o, fx + (L ? 3 : 0), 10, L ? 9 : 15, abre, C);
  }
  function grimorio(g, o) {
    const C = cores(GRIMORIO, o), voa = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), L = o.dir === 'lado';
    const cy = -50 - Math.sin(o.t * (voa ? 5 : 2.6)) * (voa ? 5 : 3) * mexe; // voa
    const abre = ataca ? Math.abs(Math.sin(o.t * 9)) : o.est === 'ferido' ? .2 : .3 + .15 * Math.sin(o.t * 3) * o.mov; // morde no ataque
    sombra(g, 20 * (1 - o.prog * .6));
    aura(g, 0, cy, 44, 'rgba(176,124,255,.2)');
    if (ataca) { rodamoinho(g, o, cy, 46); sinaisOrbitando(g, o, cy - 6, 52, SINAIS_REVISAO, false); }
    paginasOrbita(g, o, cy, C, false);
    const desenha = () => {
      g.save();
      g.translate(o.treme, cy);
      g.rotate(Math.sin(o.t * 2) * .08 * mexe + (voa && L ? .12 : 0));
      grimorioCorpo(g, o, C, abre);
      g.restore();
    };
    if (o.est === 'morrendo') {
      morrer(g, o, cy, 34, desenha, '#5A4A8A');
      for (let k = 0; k < 4; k++) { // páginas se espalham
        g.globalAlpha = a0 * Math.max(0, 1 - o.prog);
        pagina(g, Math.cos(k * 1.6) * (12 + o.prog * 40), cy + Math.sin(k * 1.6) * 10 + o.prog * 26, o.prog * 4 + k, .8, NUMEROS_PAGINAS[k], C);
      }
      g.globalAlpha = a0;
      return;
    }
    desenha();
    paginasOrbita(g, o, cy, C, true);
    if (ataca) {
      sinaisOrbitando(g, o, cy - 6, 52, SINAIS_REVISAO, true);
      for (let k = 0; k < 4; k++) { // páginas lançadas: na batalha vêm para o aluno
        const f = (o.t * 1.4 * mexe + k / 4) % 1;
        g.globalAlpha = a0 * (1 - f * .7);
        if (L && o.simples) pagina(g, 20 + f * 50, cy + Math.sin(k * 2 + f * 6) * 5, f * 3, .7, NUMEROS_PAGINAS[k], C);
        else pagina(g, (k - 1.5) * 10 * f, cy + 14 + f * 24, f * 2 + k, .6 + f * 1.2, NUMEROS_PAGINAS[k], C);
      }
    }
    g.globalAlpha = a0;
  }

  // ---------- Fantasma dos Erros: translúcido, segura um quadro com × e contas riscadas ----------
  const FANTASMA = { corpo: 'rgba(170,215,255,.78)', corpoC: 'rgba(225,242,255,.65)', olho: '#FFD95A', fundoOlho: '#1E2A5A', quadro: '#2A3040', moldura: '#8A5A32', giz: '#F2F2F2', erro: '#FF4B5C', papel: '#FFF4D8', boca: '#1E2A5A' };
  function corpoFantasma(g, o, C) { // cabeça redonda, rabicho no topo e barra ondulada
    const w = Math.sin(o.t * 3) * 2 * o.mov;
    g.beginPath();
    g.moveTo(-24, 6);
    g.bezierCurveTo(-27, -22, -14, -36, -2, -36);
    g.quadraticCurveTo(2 + w, -46, -4 + w, -54);
    g.quadraticCurveTo(10 + w, -48, 6, -35);
    g.bezierCurveTo(18, -33, 27, -20, 24, 6);
    for (let k = 0; k < 4; k++) { const x1 = 24 - (k + 1) * 12; g.quadraticCurveTo(x1 + 6, 16 + Math.sin(o.t * 4 + k) * 2.5 * o.mov, x1, 6); }
    g.closePath();
    pinta(g, C.corpo, 3);
  }
  function rostoFantasma(g, o, C, fx, um) { // olhos tristes (bravos no ataque) com luz amarela
    const bravo = o.est === 'atacando';
    for (const s of um ? [1] : [-1, 1]) {
      const x = fx + s * (um ? 3 : 8), y = -14;
      elipse(g, x, y, 5.5, 6.5, C.fundoOlho, 0);
      if (o.est === 'ferido') { traco(g, C.olho, 2, () => { const pa = x - s * 2.5, pb = x + s * 3; g.moveTo(pb, y - 2.5); g.lineTo(pa, y); g.lineTo(pb, y + 2.5); }); }
      else if (o.est !== 'morrendo') {
        if (o.pisca) traco(g, C.olho, 1.8, () => { g.moveTo(x - 3, y + 1); g.lineTo(x + 3, y + 1); });
        else { aura(g, x, y + 1.5, 7, 'rgba(255,217,90,.35)'); elipse(g, x - s * .5, y + 1.5, 3, 3.6, C.olho, 0); reflexo(g, x - 1, y, 1, .7, .9); }
      }
      const yi = bravo ? y - 7.5 : y - 11.5, yo = bravo ? y - 11.5 : y - 8; // sobrancelha: triste ou brava
      traco(g, TINTA, 2.4, () => { g.moveTo(x - s * 5, yi); g.lineTo(x + s * 5.5, yo); });
    }
    if (o.est === 'idle' || o.est === 'andando') traco(g, TINTA, 2.2, () => { g.moveTo(fx + (um ? 2 : 0) - 4, -2); g.quadraticCurveTo(fx + (um ? 2 : 0), -5, fx + (um ? 2 : 0) + 4, -2); }); // boquinha triste
    else bocaBrava(g, o, fx + (um ? 2 : 0), -3, 7, C.boca);
  }
  function quadro(g, x, y, ang, C, S) { // quadro com contas riscadas e um × grande
    g.save(); g.translate(x, y); g.rotate(ang);
    caixa(g, -17, -13, 34, 26, 3, C.moldura, 2.6);
    caixa(g, -14, -10, 28, 20, 1.5, C.quadro, 1.6);
    if (!S) {
      g.font = '900 5.5px ui-rounded, "Nunito", system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = C.giz;
      g.fillText('2+3=5', -12, -5); g.fillText('7−4=', -12, 1); g.fillText('8÷2=', -12, 7);
      traco(g, C.erro, 1.2, () => { g.moveTo(-2, -8); g.lineTo(4, -2); g.moveTo(-3, 3); g.lineTo(3, -1); g.moveTo(-3, 9); g.lineTo(4, 4); });
    }
    traco2(g, C.erro, 2.6, () => { g.moveTo(3, -6); g.lineTo(12, 5); g.moveTo(12, -6); g.lineTo(3, 5); });
    g.restore();
  }
  function papelErro(g, x, y, ang, s, C) { // papelzinho com × vermelho
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    caixa(g, -6, -7, 12, 14, 1.5, C.papel, 1.8);
    traco(g, C.erro, 2, () => { g.moveTo(-3, -3.5); g.lineTo(3, 3.5); g.moveTo(3, -3.5); g.lineTo(-3, 3.5); });
    g.restore();
  }
  function papeisOrbita(g, o, cy, C, frente) {
    for (let k = 0; k < 3; k++) {
      const a = o.t * .8 * Math.max(o.mov, .3) + k * 2.1, sn = Math.sin(a);
      if ((sn >= 0) !== frente) continue;
      papelErro(g, Math.cos(a) * 40, cy + sn * 10, Math.sin(o.t * 2 + k) * .5, .8 + .2 * sn, C);
    }
  }
  function fantasmaCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado';
    corpoFantasma(g, o, C);
    elipse(g, -6, -14, 12, 14, C.corpoC, 0);
    reflexo(g, -12, -24, 5, 3, .5);
    if (d === 'cima') return;
    const fx = L ? 7 : 0, qx = L ? 12 : 6;
    rostoFantasma(g, o, C, fx, L);
    if (o.est === 'ferido') curativo(g, -10, -26);
    quadro(g, qx, 13, L ? -.05 : -.14, C, S);
    bola(g, qx - 16, 15, 4.5, C.corpo, 2.2); // mãozinhas segurando
    bola(g, qx + 16, 9, 4.5, C.corpo, 2.2);
  }
  function fantasma(g, o) {
    const C = cores(FANTASMA, o), voa = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), L = o.dir === 'lado';
    const cy = -46 - Math.sin(o.t * (voa ? 4 : 2.2)) * (voa ? 5 : 3) * mexe; // flutua
    sombra(g, 20 * (1 - o.prog * .6));
    aura(g, 0, cy - 14, 44, 'rgba(127,180,255,.22)');
    if (ataca) { rodamoinho(g, o, cy - 6, 44); sinaisOrbitando(g, o, cy - 10, 50, SINAIS_REVISAO, false); }
    papeisOrbita(g, o, cy - 10, C, false);
    const desenha = () => {
      g.save();
      g.translate(o.treme, cy);
      if (voa && L) g.rotate(.12);
      fantasmaCorpo(g, o, C);
      g.restore();
    };
    if (o.est === 'morrendo') { // sobe e se desfaz em fiapos de luz
      const p = o.prog;
      g.save(); g.globalAlpha = a0 * Math.max(0, 1 - p); g.translate(0, -p * 34); g.scale(1 - p * .3, 1 + p * .2); desenha(); g.restore();
      fimEmBrilho(g, cy - 10 - p * 20, 34, p, 'rgba(200,230,255,.8)');
      return;
    }
    desenha();
    papeisOrbita(g, o, cy - 10, C, true);
    if (ataca) {
      sinaisOrbitando(g, o, cy - 10, 50, SINAIS_REVISAO, true);
      for (let k = 0; k < 4; k++) { // papéis de erro e × dourados lançados: na batalha vêm para o aluno
        const f = (o.t * 1.4 * mexe + k / 4) % 1;
        g.globalAlpha = a0 * (1 - f * .7);
        const x = L && o.simples ? 20 + f * 50 : (k - 1.5) * 10 * f, y = L && o.simples ? cy - 6 + Math.sin(k * 2 + f * 6) * 5 : cy + 10 + f * 24, s = L && o.simples ? .7 : .6 + f * 1.1;
        if (k % 2) papelErro(g, x, y, f * 3 + k, s, C);
        else sinal(g, '×', x, y, 3 + f * 4, DOURADO);
      }
    }
    g.globalAlpha = a0;
  }

  // ---------- estado do quadro ----------
  const DIRECAO = { frente: 'baixo', baixo: 'baixo', costas: 'cima', cima: 'cima', lado: 'lado', direita: 'lado', esquerda: 'lado' };
  function contexto(p, semente) {
    const t = +p.t || 0, est = p.estado || 'idle', mov = menos && menos.matches ? 0 : 1, mapa = p.vista === 'mapa';
    return {
      t, est, mov, simples: mapa,
      dir: mapa ? DIRECAO[p.dir] || 'baixo' : 'baixo',
      espelho: mapa && p.dir === 'esquerda',
      prog: est === 'morrendo' ? Math.max(0, Math.min(1, p.prog != null ? +p.prog : (t % 1.6) / 1.3)) : 0,
      respira: Math.sin(t * 2.4 + semente) * 1.4 * mov,
      flash: est === 'ferido' && mov > 0 && Math.floor(t * 14) % 2 === 0,
      treme: est === 'ferido' ? Math.sin(t * 60) * 2.5 * (mov || .4) : 0,
      pisca: est === 'idle' && (t + semente) % 4.1 < .12
    };
  }

  // ---------- registro ----------
  const BASE = ['idle', 'andando', 'atacando', 'ferido', 'morrendo'];
  const MONSTROS = {
    armadurao: { nome: 'Armadurão', w: 126, h: 128, estados: BASE, desenho: armadurao, semente: .6 },
    grimorio: { nome: 'Grimório Mordedor', w: 104, h: 96, estados: BASE, desenho: grimorio, semente: 1.8 },
    fantasmaErros: { nome: 'Fantasma dos Erros', w: 100, h: 106, estados: BASE, desenho: fantasma, semente: 3 }
  };
  const ids = [];
  for (const [id, m] of Object.entries(MONSTROS)) {
    Sprites.registrar(id, {
      nome: m.nome, w: m.w, h: m.h, estados: m.estados, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: 'castelo', tema: 'Revisão', acento: [AZULADO, DOURADO],
      desenhar(ctx, p, vista, t, dir) {
        const o = contexto(p && typeof p === 'object' ? p : { estado: p, vista, t, dir }, m.semente);
        if (!m.estados.includes(o.est)) Object.assign(o, { est: 'idle', flash: false, treme: 0, prog: 0 });
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (o.espelho) ctx.scale(-1, 1);
        esp = o.simples ? 1.7 : 1;
        m.desenho(ctx, o);
        esp = 1;
        ctx.restore();
      }
    });
    ids.push(id);
  }
  window.MonstrosCastelo = { ids, acento: [AZULADO, DOURADO] };
})();
