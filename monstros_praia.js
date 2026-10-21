/* Mohamed — monstros_praia.js: os 3 monstros da Praia (tema Multiplicação, acento coral e turquesa), desenhados por código.
   Mesma API de monstros_campo.js: Sprites.registrar(id, { nome, w, h, estados, vistas, desenhar(ctx, p) })
     p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t: segundos, prog: 0..1 }
     (também aceita desenhar(ctx, estado, vista, t, dir))
   Estados: idle, andando (Medusinha flutuando), atacando, ferido, morrendo (prog 0→1; sem prog repete, para prévia).
   batalha: de frente, grande, olhando para o aluno · mapa: pequeno, 3 direções ('esquerda' espelha o 'lado').
   Formas simples, sem imagens e sem shadowBlur; "reduzir movimento" acalma o balanço e tira o piscar do ferido. */
(() => {
  const TINTA = '#1E1240', TAU = Math.PI * 2;
  const CORAL = '#FF6F61', CORAL_CL = '#FFC2B8', TURQUESA = '#2EE6D6', TURQUESA_CL = '#B6FFF6'; // acentos da Praia
  const SINAIS_VEZES = ['×', '6', '2×3', '12', '×'];
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
  function sombra(g, rx) { g.fillStyle = 'rgba(0,0,0,.24)'; g.beginPath(); g.ellipse(0, 0, rx, rx * .26, 0, 0, TAU); g.fill(); }
  function estrela(g, x, y, r, cor) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = cor; g.fill();
  }
  function bolhinha(g, x, y, r) { bola(g, x, y, r, 'rgba(182,255,246,.3)', 1.8); reflexo(g, x - r * .35, y - r * .35, r * .3, r * .18, .85); }
  // tentáculo/braço que afina até a ponta, seguindo uma linha de pontos
  function tentaculo(g, pts, w0, w1, cor, linha = 2.4) {
    const n = pts.length, esq = [], dir = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = a[1] - b[1], ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1, w = w0 + (w1 - w0) * i / (n - 1);
      nx /= l; ny /= l;
      esq.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      dir.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    g.beginPath();
    g.moveTo(esq[0][0], esq[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(esq[i][0], esq[i][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(dir[i][0], dir[i][1]);
    g.closePath();
    pinta(g, cor, linha);
  }
  // conta (texto, ex.: "2×3", "12") ou sinal (+ − × ÷) com contorno escuro
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
    if (!brancos.has(base)) brancos.set(base, Object.fromEntries(Object.entries(base).map(([k, v]) => [k, /esclera|iris|boca/.test(k) ? v : '#FFF3F6'])));
    return brancos.get(base);
  }
  // olho bravo mas fofo: lado = -1 esquerdo, 1 direito
  function olhoBravo(g, o, x, y, r, iris, lado, pele, esclera, mx = 0) {
    const lw = Math.max(2, r * .2);
    if (o.est === 'ferido') {
      traco(g, TINTA, Math.max(2.2, r * .3), () => { const pa = x - lado * r * .5, pb = x + lado * r * .6; g.moveTo(pb, y - r * .5); g.lineTo(pa, y); g.lineTo(pb, y + r * .5); });
      return;
    }
    if (o.est === 'morrendo') {
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

  // ---------- efeitos comuns ----------
  function rodamoinho(g, o, cy, r) { // ataque: onda de água turquesa e coral
    aura(g, 0, cy, r * 1.2, 'rgba(46,230,214,.26)');
    const a0 = g.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const a = o.t * (5 + k) * Math.max(o.mov, .3) + k * 2.1, q = 1 - k * .14;
      g.globalAlpha = a0 * (.8 - k * .2);
      traco(g, [TURQUESA_CL, CORAL, TURQUESA][k], 3.2 - k * .7, () => g.ellipse(0, cy + 8, r * q, r * .4 * q, -.18, a, a + 2.3));
    }
    g.globalAlpha = a0;
  }
  function sinaisOrbitando(g, o, cy, r, lista, frente) { // os de trás antes do corpo, os da frente depois
    const a0 = g.globalAlpha;
    lista.forEach((s, k) => {
      const a = o.t * 1.8 * Math.max(o.mov, .3) + k * TAU / lista.length, sn = Math.sin(a);
      if ((sn >= 0) !== frente) return;
      g.globalAlpha = a0 * (frente ? .75 + .25 * sn : .45 + .2 * sn);
      sinal(g, s, Math.cos(a) * r, cy + sn * r * .32, 4, k % 2 ? TURQUESA_CL : CORAL_CL);
    });
    g.globalAlpha = a0;
  }
  function morrer(g, o, cy, r, desenha) { // encolhe e some em bolhas com brilhos (nada sangrento)
    const p = o.prog, a0 = g.globalAlpha, s = 1 - p * .7;
    g.save();
    g.globalAlpha = a0 * Math.max(0, 1 - p * 1.15);
    g.translate(0, cy); g.rotate(p * .6); g.scale(s, s); g.translate(0, -cy);
    desenha();
    g.restore();
    if (p > .3) {
      const f = (p - .3) / .7;
      g.globalAlpha = a0 * (1 - f);
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; bolhinha(g, Math.cos(a) * r * f, cy + Math.sin(a) * r * f * .7 - f * 10, 3 + 6 * f); }
    }
    for (let k = 0; k < 7; k++) {
      const a = k * TAU / 7 + .4, v = r * (.6 + (k % 3) * .3);
      g.globalAlpha = a0 * Math.max(0, 1 - p);
      estrela(g, Math.cos(a) * v * p, cy + Math.sin(a) * v * p * .8 - p * 18, 2 + 2.5 * Math.sin(p * Math.PI), k % 2 ? TURQUESA_CL : CORAL_CL);
    }
    g.globalAlpha = a0;
  }

  // ---------- Caranguejo Vezes: casco coral e garras em forma de × ----------
  const CARANGUEJO = { casco: '#E8584A', claro: '#FF8A70', barriga: '#F5D9B8', xis: '#FFE2B8', coral: '#FF7AA8', esclera: '#FFF4E8', iris: '#7A2A3A', boca: '#5A1A22' };
  function garra(g, x, y, r, lado, abre, C) { // garra com um × no meio; abre levanta a pinça
    g.save(); g.translate(x, y); g.scale(lado, 1);
    g.save(); g.translate(-r * .2, -r * .55); g.rotate(-.25 - abre * .6);
    elipse(g, r * .45, 0, r * .62, r * .34, C.casco, 2.6);
    g.restore();
    bola(g, 0, 0, r, C.casco, 2.8);
    reflexo(g, -r * .35, -r * .4, r * .3, r * .16, .45);
    const k = r * .42;
    traco2(g, C.xis, r * .26, () => { g.moveTo(-k, -k); g.lineTo(k, k); g.moveTo(k, -k); g.lineTo(-k, k); });
    g.restore();
  }
  function pernas(g, lado, anda, t, C, curta) { // 3 perninhas de cada lado, alternando no andar de lado
    for (let k = 0; k < 3; k++) {
      const lev = anda ? Math.max(0, Math.sin(t * 16 + k * 2.1 + (lado > 0 ? 0 : Math.PI))) * 3 : 0;
      const ab = curta ? .7 : 1, bx = lado * 14 * ab, by = 4 + k * 3.5, jx = lado * (26 + k * 2) * ab, jy = by - 5 - lev, px = lado * (30 + k * 3) * ab, py = 24 - lev * .6;
      traco2(g, C.casco, 3.2, () => { g.moveTo(bx, by); g.lineTo(jx, jy); g.lineTo(px, py); });
    }
  }
  function caranguejoCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado', anda = o.est === 'andando', ataca = o.est === 'atacando';
    const abre = ataca ? .5 + .5 * Math.sin(o.t * 14) : anda ? .15 : .1 + .1 * Math.sin(o.t * 2);
    const ergue = ataca ? -10 - 4 * Math.sin(o.t * 7) : 0, caido = o.est === 'ferido' ? 1 : 0;
    pernas(g, -1, anda, o.t, C, L);
    pernas(g, 1, anda, o.t, C, L);
    // olhos nas hastes
    const haste = (bx, ex, ey, r, lado) => {
      traco2(g, C.casco, 3, () => { g.moveTo(bx, -12); g.quadraticCurveTo(bx + (ex - bx) * .3, -24, ex, ey + r * .8); });
      if (d === 'cima') bola(g, ex, ey, r, C.esclera, 2.4);
      else olhoBravo(g, o, ex, ey, r, C.iris, lado, C.casco, C.esclera, L ? r * .2 : 0);
    };
    if (L) { haste(-2, 0, -33, 6, 1); haste(4, 9, -35, 7.5, 1); }
    else { haste(-6, -11 - caido * 8, -34 + caido * 6, 8, -1); haste(6, 11 + caido * 8, -34 + caido * 6, 8, 1); }
    // bracinhos das garras
    if (L) { traco2(g, C.casco, 4.2, () => { g.moveTo(2, 2); g.lineTo(-6, -6 + ergue * .6); }); garra(g, -6, -8 + ergue * .6, 10, 1, abre, C); }
    else traco2(g, C.casco, 4.2, () => { g.moveTo(-18, 4); g.lineTo(-29, -2 + ergue); g.moveTo(18, 4); g.lineTo(29, -2 + ergue); });
    // carapaça com espinhos e coral
    if (!S) for (let k = 0; k < 5; k++) { const a = Math.PI * (1.15 + k * .175), x = Math.cos(a) * 24 * (L ? .8 : 1), y = Math.sin(a) * 16; poligono(g, [x - 3, y + 1, x, y - 5, x + 3, y + 1], C.casco, 2); }
    elipse(g, 0, 0, L ? 21 : 26, 18, C.casco);
    reflexo(g, -9, -8, 9, 4, .35);
    if (!S) {
      traco2(g, C.coral, 2.4, () => { g.moveTo(-10, -15); g.lineTo(-12, -22); g.moveTo(-12, -20); g.lineTo(-16, -24); g.moveTo(-12, -20); g.lineTo(-9, -25); });
      bola(g, -16, -24, 1.8, C.coral, 1.2); bola(g, -9, -25, 1.8, C.coral, 1.2);
    }
    if (d === 'cima') { for (const [x, y] of [[-8, -4], [6, -8], [10, 3], [-3, 5]]) bola(g, x, y, 1.6, C.claro, 0); }
    else {
      const fx = L ? 6 : 0;
      elipse(g, fx, 8, L ? 11 : 15, 7, C.barriga, 2.2);
      bocaBrava(g, o, fx + (L ? 3 : 0), 6, 9, C.boca);
    }
    if (L) garra(g, 18, 2 + ergue, 12, 1, abre, C);
    else { garra(g, -33, -2 + ergue, 13, -1, abre, C); garra(g, 33, -2 + ergue, 13, 1, abre, C); }
  }
  function caranguejo(g, o) {
    const C = cores(CARANGUEJO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', cy = -26, a0 = g.globalAlpha, mexe = Math.max(o.mov, .3);
    const deLado = anda ? Math.sin(o.t * 8 * mexe) * 3 : 0, quica = anda ? Math.abs(Math.sin(o.t * 16)) * 1.5 * o.mov : o.respira * .6;
    sombra(g, 34 * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, cy, 46); sinaisOrbitando(g, o, cy - 8, 52, SINAIS_VEZES, false); }
    const desenha = () => { g.save(); g.translate(o.treme + deLado, cy - quica); caranguejoCorpo(g, o, C); g.restore(); };
    if (o.est === 'morrendo') return morrer(g, o, cy, 34, desenha);
    desenha();
    if (ataca) {
      sinaisOrbitando(g, o, cy - 8, 52, SINAIS_VEZES, true);
      for (let k = 0; k < 4; k++) { const f = (o.t * 2 + k / 4) % 1; g.globalAlpha = a0 * (1 - f); estrela(g, (k % 2 ? 1 : -1) * (36 + f * 12), cy - 18 - f * 14, 2.5, TURQUESA_CL); } // respingos
    }
    if (o.est === 'ferido') for (let k = 0; k < 3; k++) { const a = o.t * 4 + k * 2.1; g.globalAlpha = a0 * .9; estrela(g, Math.cos(a) * 14, cy - 50 + Math.sin(a) * 4, 2.6, '#FFE58A'); } // estrelinhas de tontura
    g.globalAlpha = a0;
  }

  // ---------- Medusinha: água-viva turquesa translúcida que solta bolhas ----------
  const MEDUSINHA = { sino: 'rgba(46,230,214,.6)', sinoC: 'rgba(190,255,248,.5)', borda: '#3CC9D8', flor: 'rgba(199,125,255,.85)', tentA: 'rgba(60,215,235,.8)', tentB: 'rgba(140,100,235,.75)', esclera: '#F2FFFF', iris: '#7A2FD0', boca: '#1E2A5A' };
  function sino(g, C, S) { // cúpula translúcida com borda ondulada
    g.beginPath(); g.moveTo(-26, 0); g.bezierCurveTo(-28, -34, 28, -34, 26, 0);
    const n = 6;
    for (let k = n; k > 0; k--) { const x1 = -26 + (k - 1) * 52 / n; g.quadraticCurveTo(x1 + 26 / n, 6, x1, 0); }
    g.closePath(); pinta(g, C.sino, 3);
    g.beginPath(); g.moveTo(-18, -3); g.bezierCurveTo(-20, -26, 20, -26, 18, -3); g.closePath(); g.fillStyle = C.sinoC; g.fill();
    if (S) elipse(g, 0, -20, 6, 3.5, C.flor, 1.4);
    else for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .4; elipse(g, Math.cos(a) * 5, -20 + Math.sin(a) * 3, 5, 3, C.flor, 1.4, a); }
    reflexo(g, -12, -18, 6, 3, .6);
  }
  function medusinhaCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado', n = S ? 5 : 7, mexe = Math.max(o.mov, .3), puls = Math.sin(o.t * 3 * mexe);
    for (const camada of [0, 1]) for (let k = 0; k < n; k++) { // tentáculos: de trás roxos, da frente turquesa
      if (k % 2 !== camada) continue;
      const x0 = -18 + k * 36 / (n - 1), comp = 30 + (k % 3) * 6, pts = [];
      for (let i = 0; i <= 9; i++) { const s = i / 9; pts.push([x0 + Math.sin(o.t * 3 + k * 1.3 + s * 4) * 5 * s * mexe - (L ? s * 10 : 0), 2 + s * comp * (1 + puls * .06)]); }
      tentaculo(g, pts, 3.2, 1.2, camada ? C.tentA : C.tentB, 2);
    }
    g.save(); g.scale(1 + puls * .05, 1 - puls * .07); // cúpula pulsa como quem nada
    sino(g, C, S);
    g.restore();
    if (d === 'cima') return;
    const fx = L ? 8 : 0;
    if (L) olhoBravo(g, o, fx + 6, -10, 6, C.iris, 1, C.borda, C.esclera, 1);
    else { olhoBravo(g, o, -9, -10, 6.5, C.iris, -1, C.borda, C.esclera); olhoBravo(g, o, 9, -10, 6.5, C.iris, 1, C.borda, C.esclera); }
    bocaBrava(g, o, fx + (L ? 4 : 0), -1.5, 6, C.boca);
  }
  function medusinha(g, o) {
    const C = cores(MEDUSINHA, o), voa = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), L = o.dir === 'lado';
    const cy = -58 - Math.sin(o.t * (voa ? 4 : 2.4)) * (voa ? 5 : 3) * mexe; // flutua
    sombra(g, 18 * (1 - o.prog * .6));
    if (ataca) rodamoinho(g, o, cy - 6, 40);
    for (let k = 0; k < 4; k++) { // bolhinhas subindo em volta
      const f = (o.t * .5 + k / 4) % 1;
      g.globalAlpha = a0 * (1 - f);
      bolhinha(g, Math.sin(k * 2.3) * 30, cy + 20 - f * 50, 2 + (k % 2) * 1.5);
    }
    g.globalAlpha = a0;
    const desenha = () => {
      g.save();
      g.translate(o.treme + (voa && L ? Math.sin(o.t * 4) * 2 : 0), cy);
      if (voa && L) g.rotate(.18);
      medusinhaCorpo(g, o, C);
      g.restore();
    };
    if (o.est === 'morrendo') return morrer(g, o, cy, 30, desenha);
    desenha();
    if (ataca) for (let k = 0; k < 6; k++) { // jato de bolhas: na batalha vem para o aluno; de lado vai para a frente
      const f = (o.t * 1.6 * mexe + k / 6) % 1;
      g.globalAlpha = a0 * (1 - f * .6);
      if (L && o.simples) bolhinha(g, 16 + f * 50, cy - 4 + Math.sin(k * 2 + f * 6) * 4, 2.5 + f * 5);
      else bolhinha(g, Math.sin(k * 2.4) * f * 24, cy + 4 + f * 26, 3 + f * 10);
    }
    g.globalAlpha = a0;
  }

  // ---------- Polvinho Oito: polvo roxo com 8 braços que balançam; solta tinta ao atacar ----------
  const POLVINHO = { cabeca: '#A86BE0', escuro: '#8A50C8', mancha: '#E08AD8', ventosa: '#FFB08A', esclera: '#FFF4FF', iris: '#5A1E8A', boca: '#3A0E4A', curativo: '#F5C76A', tinta: '#3A1E5E' };
  function braco8(g, o, k, C, S) { // um dos 8 braços: sai de baixo da cabeça e enrola na ponta
    const lado = k < 4 ? -1 : 1, j = k % 4, mexe = Math.max(o.mov, .3), pts = [], n = 10, comp = 30 + j * 3;
    const curl = -lado * (1.3 + j * .35), velo = o.est === 'andando' ? 5 : o.est === 'atacando' ? 7 : 2.4, a = Math.PI / 2 - lado * (.15 + j * .4);
    let x = lado * (3 + j * 4.5), y = 0;
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      pts.push([x, y]);
      const ang = a + curl * s * s + Math.sin(o.t * velo + k * .9 + s * 3) * .35 * s * mexe - (o.dir === 'lado' ? .5 * s : 0);
      x += Math.cos(ang) * comp / (n - 1);
      y += Math.sin(ang) * comp / (n - 1);
    }
    tentaculo(g, pts, 5.5, 1.6, j >= 2 ? C.escuro : C.cabeca, 2.6);
    if (!S) for (const i of [3, 5, 7]) bola(g, pts[i][0], pts[i][1], 1.9 - i * .1, C.ventosa, 0);
  }
  function curativo(g, x, y, C) { // ferido: curativo em X (nada de sangue)
    g.save(); g.translate(x, y); g.rotate(.6);
    caixa(g, -7, -2.5, 14, 5, 2.5, C.curativo, 1.8);
    caixa(g, -2.5, -7, 5, 14, 2.5, C.curativo, 1.8);
    g.restore();
  }
  function polvinhoCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado';
    g.save(); g.translate(0, 18); for (const k of [3, 7, 2, 6]) braco8(g, o, k, C, S); g.restore(); // braços de fora, atrás
    elipse(g, 0, 0, 22, 21, C.cabeca);
    elipse(g, -9, -10, 4, 3, C.mancha, 0); elipse(g, 6, -14, 3, 2.4, C.mancha, 0); elipse(g, 13, -4, 2.6, 2, C.mancha, 0);
    reflexo(g, -9, -12, 7, 4, .4);
    if (d !== 'cima') {
      const fx = L ? 7 : 0;
      if (L) olhoBravo(g, o, fx + 5, 2, 6.5, C.iris, 1, C.cabeca, C.esclera, 1.2);
      else { olhoBravo(g, o, -8, 2, 6.8, C.iris, -1, C.cabeca, C.esclera); olhoBravo(g, o, 8, 2, 6.8, C.iris, 1, C.cabeca, C.esclera); }
      if (o.est === 'idle' || o.est === 'andando') traco(g, TINTA, 2.3, () => { g.moveTo(fx - 4, 12); g.quadraticCurveTo(fx + 1, 15.5, fx + 5, 11); }); // sorrisinho maroto
      else bocaBrava(g, o, fx + (L ? 3 : 0), 12, 7, C.boca);
      if (o.est === 'ferido') curativo(g, -10, -11, C);
    }
    g.save(); g.translate(0, 18); for (const k of [1, 5, 0, 4]) braco8(g, o, k, C, S); g.restore(); // braços de dentro, na frente
  }
  function nuvemTinta(g, o, cy, deLado, C) { // tinta roxa escura: na batalha vem para o aluno
    const a0 = g.globalAlpha;
    for (let k = 0; k < 7; k++) {
      const f = (o.t * 1.2 * Math.max(o.mov, .3) + k / 7) % 1, r = 4 + f * 10;
      const x = deLado ? 18 + f * 46 : (k - 3) * 5 * f, y = deLado ? cy + 8 + Math.sin(k * 1.7) * 6 * f : cy + 24 + f * 22;
      g.globalAlpha = a0 * (1 - f) * .9;
      bola(g, x, y, r, C.tinta, 2);
      bola(g, x - r * .3, y - r * .3, r * .3, 'rgba(176,124,255,.5)', 0);
    }
    g.globalAlpha = a0;
  }
  function polvinho(g, o) {
    const C = cores(POLVINHO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), cy = -54;
    const quica = anda ? Math.abs(Math.sin(o.t * 5 * mexe)) * 5 : o.respira;
    sombra(g, 30 * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, cy + 10, 44); sinaisOrbitando(g, o, cy, 50, SINAIS_VEZES, false); }
    const desenha = () => { g.save(); g.translate(o.treme, cy - quica); polvinhoCorpo(g, o, C); g.restore(); };
    if (o.est === 'morrendo') return morrer(g, o, cy + 6, 34, desenha);
    desenha();
    if (ataca) { sinaisOrbitando(g, o, cy, 50, SINAIS_VEZES, true); nuvemTinta(g, o, cy - quica, o.dir === 'lado' && o.simples, C); }
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
    caranguejoVezes: { nome: 'Caranguejo Vezes', w: 104, h: 78, estados: BASE, desenho: caranguejo, semente: .5 },
    medusinha: { nome: 'Medusinha', w: 90, h: 96, estados: BASE, desenho: medusinha, semente: 1.7 },
    polvinhoOito: { nome: 'Polvinho Oito', w: 108, h: 86, estados: BASE, desenho: polvinho, semente: 2.9 }
  };
  const ids = [];
  for (const [id, m] of Object.entries(MONSTROS)) {
    Sprites.registrar(id, {
      nome: m.nome, w: m.w, h: m.h, estados: m.estados, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: 'praia', tema: 'Tabuada', acento: [CORAL, TURQUESA],
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
  window.MonstrosPraia = { ids, acento: [CORAL, TURQUESA] };
})();
