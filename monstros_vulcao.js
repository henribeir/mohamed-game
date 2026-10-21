/* Mohamed — monstros_vulcao.js: os 3 monstros do Vulcão (tema Divisão, acento laranja e vermelho), desenhados por código.
   Mesma API de monstros_campo.js: Sprites.registrar(id, { nome, w, h, estados, vistas, desenhar(ctx, p) })
     p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t: segundos, prog: 0..1 }
     (também aceita desenhar(ctx, estado, vista, t, dir))
   Estados: idle, andando, atacando, ferido, morrendo e, no Meio-a-Meio, dividindo
     (morrendo e dividindo usam prog 0→1; sem prog repetem, para prévia).
   As duas gosmas menores do Meio-a-Meio podem ser desenhadas com o mesmo id em tamanho menor.
   batalha: de frente, grande, olhando para o aluno · mapa: pequeno, 3 direções ('esquerda' espelha o 'lado').
   Formas simples, sem imagens e sem shadowBlur; "reduzir movimento" acalma o balanço e tira o piscar do ferido. */
(() => {
  const TINTA = '#1E1240', TAU = Math.PI * 2;
  const LARANJA = '#FF9A3D', LARANJA_CL = '#FFD08A', VERMELHO = '#FF3B3B', VERMELHO_CL = '#FFB0A0'; // acentos do Vulcão
  const SINAIS_DIVISAO = ['÷', '12÷3', '4', '8÷2', '÷'];
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
  function poligono(g, pts, cor, linha = 3) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); pinta(g, cor, linha); }
  function traco(g, cor, lw, fn) { g.beginPath(); fn(); g.lineWidth = lw * esp; g.strokeStyle = cor; g.stroke(); }
  function traco2(g, cor, lw, fn) { traco(g, TINTA, lw + 2.2, fn); traco(g, cor, lw, fn); }
  function reflexo(g, x, y, rx, ry, a = .55) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, -.6, 0, TAU); g.fill(); }
  function aura(g, x, y, r, cor) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function sombra(g, rx) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0, rx, rx * .26, 0, 0, TAU); g.fill(); }
  function estrela(g, x, y, r, cor) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = cor; g.fill();
  }
  const ruido = s => { const v = Math.sin(s * 127.1) * 43758.5453; return v - Math.floor(v); };
  // conta (texto, ex.: "12÷3") ou sinal (+ − × ÷) com contorno escuro
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

  // ---------- efeitos comuns ----------
  function rodamoinho(g, o, cy, r) { // ataque: redemoinho de calor laranja e vermelho
    aura(g, 0, cy, r * 1.2, 'rgba(255,120,40,.28)');
    const a0 = g.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const a = o.t * (5 + k) * Math.max(o.mov, .3) + k * 2.1, q = 1 - k * .14;
      g.globalAlpha = a0 * (.8 - k * .2);
      traco(g, [LARANJA_CL, VERMELHO, LARANJA][k], 3.2 - k * .7, () => g.ellipse(0, cy + 8, r * q, r * .4 * q, -.18, a, a + 2.3));
    }
    g.globalAlpha = a0;
  }
  function sinaisOrbitando(g, o, cy, r, lista, frente) { // os de trás antes do corpo, os da frente depois
    const a0 = g.globalAlpha;
    lista.forEach((s, k) => {
      const a = o.t * 1.8 * Math.max(o.mov, .3) + k * TAU / lista.length, sn = Math.sin(a);
      if ((sn >= 0) !== frente) return;
      g.globalAlpha = a0 * (frente ? .75 + .25 * sn : .45 + .2 * sn);
      sinal(g, s, Math.cos(a) * r, cy + sn * r * .32, 4, k % 2 ? VERMELHO_CL : LARANJA_CL);
    });
    g.globalAlpha = a0;
  }
  function fumacaEBrasas(g, o, cy, r, p) { // fim: fumaça cinza e brasas que sobem (nada sangrento)
    const a0 = g.globalAlpha;
    if (p > .25) {
      const f = (p - .25) / .75;
      g.globalAlpha = a0 * (1 - f) * .75;
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; bola(g, Math.cos(a) * r * f, cy + Math.sin(a) * r * f * .6 - f * 16, 5 + 8 * f, '#6A6478', 0); }
    }
    for (let k = 0; k < 7; k++) {
      const a = k * TAU / 7 + .4, v = r * (.6 + (k % 3) * .3);
      g.globalAlpha = a0 * Math.max(0, 1 - p);
      estrela(g, Math.cos(a) * v * p, cy + Math.sin(a) * v * p * .8 - p * 22, 2 + 2.5 * Math.sin(p * Math.PI), k % 2 ? LARANJA_CL : VERMELHO_CL);
    }
    g.globalAlpha = a0;
  }
  function morrer(g, o, cy, r, desenha) { // encolhe, gira e some
    const p = o.prog, a0 = g.globalAlpha, s = 1 - p * .7;
    g.save();
    g.globalAlpha = a0 * Math.max(0, 1 - p * 1.15);
    g.translate(0, cy); g.rotate(p * .6); g.scale(s, s); g.translate(0, -cy);
    desenha();
    g.restore();
    fumacaEBrasas(g, o, cy, r, p);
  }
  function brasas(g, o, cy, larg, n, cor) { // faíscas subindo em volta
    const a0 = g.globalAlpha;
    for (let k = 0; k < n; k++) {
      const f = (o.t * .7 * Math.max(o.mov, .3) + k / n) % 1;
      g.globalAlpha = a0 * (1 - f);
      bola(g, Math.sin(k * 2.7 + o.t) * larg, cy - f * 30, 1.6 + (k % 2), cor, 0);
    }
    g.globalAlpha = a0;
  }
  function bolaDeFogo(g, x, y, r, rabo) { // rabo: de onde ela veio ({x, y})
    aura(g, x, y, r * 2.2, 'rgba(255,140,40,.4)');
    for (let k = 3; k >= 1; k--) bola(g, x - rabo.x * k * r * .6, y - rabo.y * k * r * .6, r * (1 - k * .22), k % 2 ? '#FF5A2A' : '#FF9A3D', 0);
    bola(g, x, y, r, '#FF5A2A', 2.4);
    bola(g, x, y, r * .7, '#FF9A3D', 0);
    bola(g, x - r * .15, y - r * .15, r * .4, '#FFE07A', 0);
  }

  // ---------- Magmito: golem de pedra escura com rachaduras de lava brilhando ----------
  const MAGMITO = { pedra: '#3E3550', lava: '#FF8A2A', lavaC: '#FFD95A', esclera: '#FFE07A', iris: '#B3260F', boca: '#2A0A0A' };
  function pedra(g, x, y, rx, ry, seed, cor, linha = 3) { // pedra irregular de cantos arredondados
    const n = 7, pts = [];
    for (let k = 0; k < n; k++) { const a = k / n * TAU + seed, q = .82 + .18 * ruido(seed * 7 + k); pts.push([x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q]); }
    const meio = k => [(pts[k % n][0] + pts[(k + 1) % n][0]) / 2, (pts[k % n][1] + pts[(k + 1) % n][1]) / 2];
    g.beginPath();
    g.moveTo(...meio(0));
    for (let k = 1; k <= n; k++) { const p = pts[k % n], m = meio(k); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    g.closePath();
    pinta(g, cor, linha);
  }
  function rachaduras(g, x, y, r, seed, luz, C) { // linhas de lava com galhinhos; luz pulsa
    const linhas = () => {
      for (let k = 0; k < 3; k++) {
        const a = seed * 2 + k * 2.1, l1 = r * (.45 + .25 * ruido(seed + k));
        const jx = x + Math.cos(a) * l1 * .5 + Math.cos(a + .6) * r * .12, jy = y + Math.sin(a) * l1 * .5 + Math.sin(a + .6) * r * .12;
        g.moveTo(x + Math.cos(a + .3) * r * .1, y + Math.sin(a + .3) * r * .1);
        g.lineTo(jx, jy);
        g.lineTo(x + Math.cos(a) * l1, y + Math.sin(a) * l1);
        g.moveTo(jx, jy);
        g.lineTo(jx + Math.cos(a + 1.3) * r * .25, jy + Math.sin(a + 1.3) * r * .25);
      }
    };
    traco(g, C.lava, 3 * luz + .6, linhas);
    traco(g, C.lavaC, 1.2, linhas);
  }
  function rocha(g, x, y, rx, ry, seed, C, luz, S) {
    pedra(g, x, y, rx, ry, seed, C.pedra);
    if (!S) reflexo(g, x - rx * .35, y - ry * .4, rx * .28, ry * .14, .18);
    rachaduras(g, x, y, Math.min(rx, ry), seed, luz, C);
  }
  function punho(g, x, y, r, soco, seed, C, luz, S) { // o soco aproxima o punho do aluno (maior e mais ao centro)
    const s = 1 + soco * .4;
    rocha(g, x * (1 - soco * .35), y + soco * 10, r * s, r * s * .95, seed, C, luz, S);
  }
  function magmitoCorpo(g, o, C, socoE, socoD, luz) {
    const S = o.simples, d = o.dir, L = d === 'lado';
    if (L) rocha(g, -14, -36, 12, 12, 4.1, C, luz, S); // punho de trás
    rocha(g, 0, -34, L ? 16 : 20, 18, 1.3, C, luz, S); // corpo
    if (!L) { rocha(g, -24, -50, 11, 10, 2.2, C, luz, S); rocha(g, 24, -50, 11, 10, 3.3, C, luz, S); } // ombros
    rocha(g, L ? 3 : 0, -66, L ? 20 : 24, 22, .7, C, luz, S); // cabeça
    if (d !== 'cima') {
      const fx = L ? 9 : 0;
      aura(g, fx, -66, 18, `rgba(255,200,80,${.25 + .2 * luz})`); // olhos acesos
      if (L) olhoBravo(g, o, fx + 3, -66, 5.4, C.iris, 1, C.pedra, C.esclera);
      else { olhoBravo(g, o, -8, -66, 5.6, C.iris, -1, C.pedra, C.esclera); olhoBravo(g, o, 8, -66, 5.6, C.iris, 1, C.pedra, C.esclera); }
      bocaBrava(g, o, fx + (L ? 2 : 0), -55, 8, C.boca);
    }
    if (L) punho(g, 16, -30, 14, socoD, 5.2, C, luz, S);
    else { punho(g, -34, -30, 14, socoE, 5.2, C, luz, S); punho(g, 34, -30, 14, socoD, 6.3, C, luz, S); }
  }
  function pedrinhas(g, cy, f, C) { // fragmentos de rocha voando
    const a0 = g.globalAlpha;
    for (let k = 0; k < 5; k++) {
      const a = -2.8 + k * .7, q = 18 + f * 30;
      g.globalAlpha = a0 * Math.max(0, 1 - f);
      pedra(g, Math.cos(a) * q, cy + Math.sin(a) * q + f * f * 20, 3.5, 3, k * 1.7, C.pedra, 1.6);
    }
    g.globalAlpha = a0;
  }
  function magmito(g, o) {
    const C = cores(MAGMITO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), L = o.dir === 'lado';
    const passo = anda ? Math.sin(o.t * 3.2 * mexe) : 0, sobe = anda ? Math.abs(passo) * 2.5 : o.respira * .5, incl = anda ? passo * .05 : 0; // passo pesado
    const fase = (o.t * 1.5 * mexe) % 1, soco = f => { const q = (fase + f) % 1; return q < .5 ? q / .5 : 1 - (q - .5) / .5; };
    const socoE = ataca ? soco(.5) : 0, socoD = ataca ? soco(0) : 0; // socos alternados
    const luz = o.est === 'ferido' ? .3 + .7 * Math.abs(Math.sin(o.t * 20)) : .6 + .4 * Math.sin(o.t * 2.5);
    sombra(g, 32 * (1 - o.prog * .6));
    aura(g, 0, -48, 56, `rgba(255,110,30,${.12 + .1 * luz})`); // calor em volta
    if (ataca) { rodamoinho(g, o, -44, 52); sinaisOrbitando(g, o, -60, 56, SINAIS_DIVISAO, false); }
    const desenha = () => {
      rocha(g, L ? -6 : -12, -10 - Math.max(0, passo) * 4, 10, 10, 7.7, C, luz, o.simples); // pernas
      rocha(g, L ? 5 : 12, -10 - Math.max(0, -passo) * 4, 10, 10, 8.8, C, luz, o.simples);
      g.save();
      g.translate(o.treme, -sobe);
      g.rotate(incl);
      magmitoCorpo(g, o, C, socoE, socoD, luz);
      g.restore();
    };
    if (o.est === 'morrendo') { morrer(g, o, -48, 44, desenha); pedrinhas(g, -48, o.prog, C); return; }
    desenha();
    if (ataca) {
      sinaisOrbitando(g, o, -60, 56, SINAIS_DIVISAO, true);
      for (const [s, lado] of [[socoD, 1], [socoE, -1]]) if (s > .85) { // respingos de lava no impacto
        const px = lado * 34 * (1 - s * .35), py = -30 + s * 10;
        for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .55; bola(g, px + Math.cos(a) * 18, py + Math.sin(a) * 14, 2.6, k % 2 ? C.lavaC : C.lava, 1.2); }
      }
    }
    if (o.est === 'ferido') pedrinhas(g, -60, (o.t * 1.6) % 1, C);
    g.globalAlpha = a0;
  }

  // ---------- Fagulhão: chama saltitante laranja com carinha ----------
  const FAGULHAO = { fora: '#FF5A2A', meio: '#FF9A3D', dentro: '#FFD95A', esclera: '#FFF4D8', iris: '#7A1A1A', boca: '#5A0E0E' };
  // chama: base redonda e línguas que tremulam; inclina > 0 joga as pontas para trás (de lado)
  function chama(g, R, h, t, mov, inclina, cor, linha) {
    const P = (x, y, k) => [x + R * Math.sin(t * 9 + k * 1.7) * .08 * mov + inclina * y * .35, y * (1 + Math.sin(t * 7 + k * 2.3) * .06 * mov)];
    const seg = [
      [R * 1.1, -h * .35, 0, R * .62, -h * .85, 1],
      [R * .42, -h * .55, 0, R * .26, -h * .58, 0],
      [R * .36, -h * .98, 0, R * .02, -h * 1.22, 2],
      [-R * .2, -h * .76, 0, -R * .3, -h * .62, 0],
      [-R * .48, -h * .92, 0, -R * .72, -h * .82, 3],
      [-R * 1.12, -h * .4, 0, -R, 0, 0]
    ];
    g.beginPath();
    g.moveTo(R, 0);
    for (const [cx, cy, ck, ex, ey, ek] of seg) { const c = P(cx, cy, ck), e = P(ex, ey, ek); g.quadraticCurveTo(c[0], c[1], e[0], e[1]); }
    g.arc(0, 0, R, Math.PI, 0, true);
    g.closePath();
    pinta(g, cor, linha);
  }
  function fagulhaoCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado', R = 20, h = 46, mexe = Math.max(o.mov, .3), incl = L ? .5 : 0;
    if (!S) for (const s of L ? [-1] : [-1, 1]) { // linguinhas dos lados (as mãozinhas)
      g.save(); g.translate(s * R * .95, -h * .3); g.rotate(s * (1.1 + Math.sin(o.t * 8 + s) * .2 * mexe)); g.scale(.28, .3);
      chama(g, R, h, o.t + s, o.mov, 0, C.fora, 6);
      g.restore();
    }
    chama(g, R, h, o.t, o.mov, incl, C.fora, 3);
    g.save(); g.translate(0, -1); g.scale(.78, .8); chama(g, R, h, o.t + .7, o.mov, incl, C.meio, 0); g.restore();
    g.save(); g.scale(.52, .55); chama(g, R, h, o.t + 1.4, o.mov, incl, C.dentro, 0); g.restore();
    reflexo(g, -R * .4, -h * .45, R * .2, h * .08, .35);
    if (d === 'cima') return;
    const fx = L ? 7 : 0;
    if (L) olhoBravo(g, o, fx + 4, -10, 6, C.iris, 1, C.meio, C.esclera, 1.2);
    else { olhoBravo(g, o, -7.5, -10, 6.6, C.iris, -1, C.meio, C.esclera); olhoBravo(g, o, 7.5, -10, 6.6, C.iris, 1, C.meio, C.esclera); }
    if (o.est === 'idle' || o.est === 'andando') { // sorriso travesso com dentinho
      g.beginPath(); g.moveTo(fx - 5, 0); g.quadraticCurveTo(fx + 1, 5, fx + 6, -1); g.quadraticCurveTo(fx + 1, 2, fx - 5, 0); g.closePath(); pinta(g, C.boca, 2);
      poligono(g, [fx + 1, 1.4, fx + 3.4, .6, fx + 2.4, 3], '#fff', 0);
    } else bocaBrava(g, o, fx + (L ? 3 : 0), 1, 7, C.boca);
  }
  function fagulhao(g, o) {
    const C = cores(FAGULHAO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, L = o.dir === 'lado';
    const vel = anda ? 11 : ataca ? 9 : 5, alt = anda ? 14 : ataca ? 6 : 4;
    const fase = Math.abs(Math.sin(o.t * vel)), salto = fase * alt * Math.max(o.mov, .25);
    const noChao = fase < .22 && o.est !== 'morrendo' && o.est !== 'ferido'; // amassa ao tocar o chão
    const sx = noChao ? 1.12 : .95, sy = noChao ? .86 : 1.06, enc = o.est === 'ferido' ? .9 : 1;
    sombra(g, 20 * (1 - salto / 40) * (1 - o.prog * .6));
    aura(g, 0, -26 - salto, 40, 'rgba(255,140,40,.28)');
    if (ataca) { rodamoinho(g, o, -30, 40); sinaisOrbitando(g, o, -34, 46, SINAIS_DIVISAO, false); }
    if (anda) for (let k = 1; k <= 3; k++) { // rastro de foguinhos
      g.globalAlpha = a0 * (.5 - k * .12);
      g.save(); g.translate(L ? -k * 12 : Math.sin(o.t * 3 + k) * 5, 0); g.scale(.25 - k * .04, .25 - k * .04);
      chama(g, 20, 46, o.t + k, o.mov, 0, C.fora, 0);
      g.restore();
    }
    g.globalAlpha = a0;
    const desenha = () => {
      g.save();
      g.translate(o.treme, -salto);
      g.scale(sx * enc, sy * enc);
      g.translate(0, -20); // a base redonda encosta no chão
      fagulhaoCorpo(g, o, C);
      g.restore();
    };
    if (o.est === 'morrendo') return morrer(g, o, -24, 28, desenha);
    desenha();
    brasas(g, o, -44 - salto, 22, 4, '#FFB040');
    if (ataca) { // lança uma bola de fogo: na batalha vem para o aluno
      sinaisOrbitando(g, o, -34, 46, SINAIS_DIVISAO, true);
      const f = (o.t * 1.3 * Math.max(o.mov, .3)) % 1;
      if (L && o.simples) bolaDeFogo(g, 16 + f * 50, -26, 4 + f * 3, { x: 1, y: 0 });
      else bolaDeFogo(g, 6 * f, -19 + f * 26, 4 + f * 10, { x: 0, y: 1 });
    }
    if (o.est === 'ferido') for (let k = 0; k < 3; k++) { // fumacinha saindo de cima
      const f = (o.t * 1.5 + k / 3) % 1;
      g.globalAlpha = a0 * (1 - f) * .6;
      bola(g, (k - 1) * 8, -64 - f * 14, 3 + f * 3, '#8A8494', 0);
    }
    g.globalAlpha = a0;
  }

  // ---------- Meio-a-Meio: gosma de lava dividida ao meio; ao ser ferida, se divide em duas ----------
  const MEIO = { claro: '#FFB23A', claroC: '#FFE07A', escuro: '#B8283A', escuroE: '#6E1A3A', fenda: '#FFF0A0', esclera: '#FFF0B8', escleraE: '#FFC9A0', iris: '#7A1A1A', boca: '#3A0A10' };
  function caminhoGosma(g, R, h, w) { // gota larga com um biquinho no topo
    g.beginPath();
    g.moveTo(-R, 0);
    g.quadraticCurveTo(-R * (1.12 + w), -h * .5, -R * .38, -h * .8);
    g.quadraticCurveTo(-R * .08, -h * .95, R * .06, -h * 1.12);
    g.quadraticCurveTo(R * .2, -h * .9, R * .45, -h * .76);
    g.quadraticCurveTo(R * (1.12 - w), -h * .5, R, 0);
    g.quadraticCurveTo(0, h * .16, -R, 0);
    g.closePath();
  }
  function gosma(g, o, C, R, h, S) {
    const w = Math.sin(o.t * 3) * .04 * o.mov;
    const fp = []; // linha da divisão, ondulando de leve
    for (let k = 0; k <= 6; k++) { const f = k / 6; fp.push([R * .06 * (1 - f) + (k ? Math.sin(f * 9 + o.t * 3) * 1.4 : 0), -h * 1.12 + f * (h * 1.12 + 4)]); }
    elipse(g, -R * .45, 1, R * .7, R * .2, C.claro, 2.2); // poça embaixo, metade de cada cor
    elipse(g, R * .45, 1, R * .7, R * .2, C.escuro, 2.2);
    caminhoGosma(g, R, h, w);
    g.fillStyle = C.escuro; g.fill();
    g.save();
    caminhoGosma(g, R, h, w);
    g.clip();
    g.beginPath(); g.moveTo(-R * 1.6, -h * 1.3); g.lineTo(fp[0][0], -h * 1.3);
    for (const [x, y] of fp) g.lineTo(x, y);
    g.lineTo(-R * 1.6, fp[fp.length - 1][1]); g.closePath();
    g.fillStyle = C.claro; g.fill();
    if (!S) {
      elipse(g, -R * .55, -h * .3, R * .14, h * .08, C.claroC, 0); elipse(g, -R * .2, -h * .62, R * .1, h * .06, C.claroC, 0);
      elipse(g, R * .5, -h * .25, R * .13, h * .07, C.escuroE, 0); elipse(g, R * .3, -h * .6, R * .09, h * .05, C.escuroE, 0);
    }
    g.restore();
    const linha = () => { g.moveTo(fp[0][0], fp[0][1]); for (const [x, y] of fp) g.lineTo(x, y); };
    traco(g, LARANJA, 3.2, linha);
    traco(g, C.fenda, 1.4, linha);
    caminhoGosma(g, R, h, w);
    pinta(g, null, 3);
    reflexo(g, -R * .5, -h * .6, R * .16, h * .07, .5);
  }
  function meioRosto(g, o, C, R, h) {
    const d = o.dir;
    if (d === 'cima') return;
    if (d === 'lado') { olhoBravo(g, o, R * .42, -h * .42, R * .22, C.iris, 1, C.escuro, C.escleraE); bocaBrava(g, o, R * .62, -h * .14, 7, C.boca); return; }
    olhoBravo(g, o.est === 'ferido' ? { ...o, est: 'morrendo' } : o, -R * .36, -h * .42, R * .25, C.iris, -1, C.claro, C.esclera); // ferido: um olho tonto
    olhoBravo(g, o, R * .36, -h * .42, R * .25, C.iris, 1, C.escuro, C.escleraE);
    bocaBrava(g, o, 0, -h * .16, 9, C.boca);
  }
  function meioDividindo(g, o, C, R, h) {
    const p = o.prog, a0 = g.globalAlpha;
    if (p < .4) { // estica, treme e a fenda brilha forte
      const f = p / .4;
      g.save(); g.translate(Math.sin(o.t * 50) * 1.5 * f * o.mov, 0); g.scale(1 + f * .25, 1 - f * .12);
      gosma(g, o, C, R, h, o.simples); meioRosto(g, o, C, R, h);
      g.restore();
      aura(g, 0, -h * .5, 16 + f * 34, `rgba(255,240,160,${.25 + .5 * f})`);
      return;
    }
    const f = (p - .4) / .6, dx = 8 + f * 24, s = .62 + .06 * Math.sin(f * Math.PI); // duas gosmas menores se afastam
    for (const lado of [-1, 1]) { g.save(); g.translate(lado * dx, -Math.sin(f * Math.PI) * 8); g.scale(s, s); gosma(g, o, C, R, h, o.simples); meioRosto(g, o, C, R, h); g.restore(); }
    g.globalAlpha = a0 * (1 - f);
    for (let k = 0; k < 5; k++) estrela(g, Math.cos(k * 1.26) * 10 * (1 + f), -h * .5 + Math.sin(k * 1.26) * 8 * (1 + f), 3, k % 2 ? LARANJA_CL : '#FFF0A0');
    g.globalAlpha = a0;
  }
  function meioAMeio(g, o) {
    const C = cores(MEIO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, R = 30, h = 50, S = o.simples;
    const onda = Math.sin(o.t * (anda ? 6 : 2.4) * Math.max(o.mov, .3)) * (anda ? .1 : .04), quica = anda ? Math.abs(Math.sin(o.t * 6)) * 4 * o.mov : 0;
    sombra(g, 36 * (1 - o.prog * .6));
    aura(g, 0, -24, 50, 'rgba(255,120,40,.22)');
    if (o.est === 'dividindo') return meioDividindo(g, o, C, R, h);
    if (o.est === 'morrendo') { // derrete numa poça e vira fumaça
      const p = o.prog;
      g.save(); g.globalAlpha = a0 * Math.max(0, 1 - p); g.scale(1 + p * .5, 1 - p * .8);
      gosma(g, o, C, R, h, S); meioRosto(g, o, C, R, h);
      g.restore();
      fumacaEBrasas(g, o, -20, 36, p);
      return;
    }
    if (ataca) { rodamoinho(g, o, -26, 46); sinaisOrbitando(g, o, -34, 52, SINAIS_DIVISAO, false); }
    g.save();
    g.translate(o.treme, -quica);
    g.scale(1 + onda, 1 - onda);
    gosma(g, o, C, R, h, S);
    meioRosto(g, o, C, R, h);
    g.restore();
    for (let k = 0; k < 3; k++) { // gotinhas de lava pulando em cima
      const f = (o.t * .9 + k / 3) % 1;
      if (f < .9) bola(g, (k - 1) * 16, -h * 1.05 - quica - Math.sin(f * Math.PI) * 14, 2.6, k % 2 ? C.claro : C.escuro, 1.4);
    }
    if (ataca) { // cospe lava: na batalha vem para o aluno
      sinaisOrbitando(g, o, -34, 52, SINAIS_DIVISAO, true);
      const f = (o.t * 1.3 * Math.max(o.mov, .3)) % 1;
      if (o.dir === 'lado' && S) bolaDeFogo(g, 20 + f * 48, -20, 4 + f * 3, { x: 1, y: 0 });
      else bolaDeFogo(g, -4 * f, -10 + f * 22, 4 + f * 10, { x: 0, y: 1 });
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
      prog: est === 'morrendo' || est === 'dividindo' ? Math.max(0, Math.min(1, p.prog != null ? +p.prog : (t % 1.6) / 1.3)) : 0,
      respira: Math.sin(t * 2.4 + semente) * 1.4 * mov,
      flash: est === 'ferido' && mov > 0 && Math.floor(t * 14) % 2 === 0,
      treme: est === 'ferido' ? Math.sin(t * 60) * 2.5 * (mov || .4) : 0,
      pisca: est === 'idle' && (t + semente) % 4.1 < .12
    };
  }

  // ---------- registro ----------
  const BASE = ['idle', 'andando', 'atacando', 'ferido', 'morrendo'];
  const MONSTROS = {
    magmito: { nome: 'Magmito', w: 110, h: 100, estados: BASE, desenho: magmito, semente: .4 },
    fagulhao: { nome: 'Fagulhão', w: 92, h: 94, estados: BASE, desenho: fagulhao, semente: 1.6 },
    meioAMeio: { nome: 'Meio-a-Meio', w: 112, h: 82, estados: [...BASE, 'dividindo'], desenho: meioAMeio, semente: 2.8 }
  };
  const ids = [];
  for (const [id, m] of Object.entries(MONSTROS)) {
    Sprites.registrar(id, {
      nome: m.nome, w: m.w, h: m.h, estados: m.estados, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: 'vulcao', tema: 'Divisão', acento: [LARANJA, VERMELHO],
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
  window.MonstrosVulcao = { ids, acento: [LARANJA, VERMELHO] };
})();
