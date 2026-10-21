/* Mohamed — monstros_floresta.js: os 3 monstros da Floresta (noite, tema Inteiros, acento roxo e ciano), desenhados por código.
   Mesma API de monstros_campo.js: Sprites.registrar(id, { nome, w, h, estados, vistas, desenhar(ctx, p) })
     p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t: segundos, prog: 0..1 }
     (também aceita desenhar(ctx, estado, vista, t, dir))
   Estados: idle, andando (Sombrinha voando), atacando, ferido, morrendo (prog 0→1) e dormindo (Olhudo: só os olhos).
   batalha: de frente, grande, olhando para o aluno · mapa: pequeno, 3 direções ('esquerda' espelha o 'lado').
   Formas simples, sem imagens e sem shadowBlur; "reduzir movimento" acalma o balanço e tira o piscar do ferido. */
(() => {
  const TINTA = '#1E1240', TAU = Math.PI * 2;
  const ROXO = '#B07CFF', ROXO_CL = '#E3CCFF', CIANO = '#22E8FF', CIANO_CL = '#B8FBFF'; // acentos da Floresta
  const SINAIS_INTEIROS = ['−3', '+', '−8', '−', '5'];
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
  function sombra(g, rx) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0, rx, rx * .26, 0, 0, TAU); g.fill(); }
  function estrela(g, x, y, r, cor) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = cor; g.fill();
  }
  function folha(g, x, y, ang, comp, cor, linha = 2.2, nervura) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(comp * .55, -comp * .45, 0, -comp); g.quadraticCurveTo(-comp * .55, -comp * .45, 0, 0); pinta(g, cor, linha);
    if (nervura) traco(g, nervura, 1, () => { g.moveTo(0, -1.5); g.lineTo(0, -comp * .78); });
    g.restore();
  }
  // número inteiro (texto, ex.: "−3") ou sinal (+ − × ÷) com contorno escuro
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
    if (!brancos.has(base)) brancos.set(base, Object.fromEntries(Object.entries(base).map(([k, v]) => [k, /esclera|iris|olho|boca/.test(k) ? v : '#FFF3F6'])));
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
  function rodamoinho(g, o, cy, r) { // ataque: redemoinho roxo e ciano
    aura(g, 0, cy, r * 1.2, 'rgba(176,124,255,.28)');
    const a0 = g.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const a = o.t * (5 + k) * Math.max(o.mov, .3) + k * 2.1, q = 1 - k * .14;
      g.globalAlpha = a0 * (.8 - k * .2);
      traco(g, [ROXO_CL, CIANO, ROXO][k], 3.2 - k * .7, () => g.ellipse(0, cy + 8, r * q, r * .4 * q, -.18, a, a + 2.3));
    }
    g.globalAlpha = a0;
  }
  function sinaisOrbitando(g, o, cy, r, lista, frente) { // os de trás antes do corpo, os da frente depois
    const a0 = g.globalAlpha;
    lista.forEach((s, k) => {
      const a = o.t * 1.8 * Math.max(o.mov, .3) + k * TAU / lista.length, sn = Math.sin(a);
      if ((sn >= 0) !== frente) return;
      g.globalAlpha = a0 * (frente ? .75 + .25 * sn : .45 + .2 * sn);
      sinal(g, s, Math.cos(a) * r, cy + sn * r * .32, 4, k % 2 ? CIANO_CL : ROXO_CL);
    });
    g.globalAlpha = a0;
  }
  function morrer(g, o, cy, r, desenha) { // encolhe e some numa fumaça escura com brilhos (nada sangrento)
    const p = o.prog, a0 = g.globalAlpha, s = 1 - p * .7;
    g.save();
    g.globalAlpha = a0 * Math.max(0, 1 - p * 1.15);
    g.translate(0, cy); g.rotate(p * .6); g.scale(s, s); g.translate(0, -cy);
    desenha();
    g.restore();
    if (p > .3) {
      const f = (p - .3) / .7;
      g.globalAlpha = a0 * (1 - f) * .8;
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; bola(g, Math.cos(a) * r * f, cy + Math.sin(a) * r * f * .7, 5 + 8 * f, '#5A4A8A', 0); }
    }
    for (let k = 0; k < 7; k++) {
      const a = k * TAU / 7 + .4, v = r * (.6 + (k % 3) * .3);
      g.globalAlpha = a0 * Math.max(0, 1 - p);
      estrela(g, Math.cos(a) * v * p, cy + Math.sin(a) * v * p * .8 - p * 18, 2 + 2.5 * Math.sin(p * Math.PI), k % 2 ? CIANO_CL : ROXO_CL);
    }
    g.globalAlpha = a0;
  }

  // ---------- Sombrinha: morcego-sombra roxo com um sinal de menos brilhando na barriga ----------
  const SOMBRINHA = { corpo: '#4A2E8C', escuro: '#2E1A5E', asa: '#5B3AA8', asaE: '#2E1A5E', membrana: '#9B7BEA', orelha: '#C9A0FF', barriga: '#E6D5FF', menos: '#FF7BEF', esclera: '#FFE9FF', iris: '#C2189B', boca: '#2A0E3A' };
  // asa de morcego presa no ombro; ang levanta, dobra encolhe na batida
  function asa(g, lado, ang, dobra, C, S) {
    g.save();
    g.scale(lado, 1);
    g.rotate(-ang);
    g.scale(1, dobra);
    g.beginPath();
    g.moveTo(0, -4); g.quadraticCurveTo(14, -24, 38, -22);
    g.quadraticCurveTo(32, -13, 34, -4); g.quadraticCurveTo(26, -7, 24, 3);
    g.quadraticCurveTo(16, -1, 12, 8); g.quadraticCurveTo(7, 2, 0, 6); g.closePath();
    pinta(g, C.asa, 2.6);
    if (!S) {
      traco(g, C.asaE, 1.6, () => { g.moveTo(2, -3); g.lineTo(38, -22); g.moveTo(3, -1); g.lineTo(34, -4); g.moveTo(3, 1); g.lineTo(24, 3); });
      g.globalAlpha *= .55;
      elipse(g, 20, -11, 8, 3, C.membrana, 0, -.35);
    }
    g.restore();
  }
  function sombrinhaCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado', r = 22;
    const freq = o.est === 'atacando' ? 14 : o.est === 'andando' ? 11 : 6, fase = Math.sin(o.t * freq * Math.max(o.mov, .3));
    const ang = .2 + .45 * fase, dobra = .85 + .15 * fase;
    // asas atrás do corpo (de lado, a de trás menor)
    if (L) { g.save(); g.translate(-2, -6); asa(g, -1, ang + .35, dobra * .8, C, S); g.restore(); }
    else for (const s of [-1, 1]) { g.save(); g.translate(s * 14, -6); asa(g, s, ang, dobra, C, S); g.restore(); }
    // orelhas pontudas
    const orelha = (x, inc) => {
      g.save(); g.translate(x, -r + 6); g.rotate(inc);
      poligono(g, [-7, 2, 0, -16, 7, 2], C.corpo, 2.6);
      if (!S) poligono(g, [-3.5, 0, 0, -10, 3.5, 0], C.orelha, 0);
      g.restore();
    };
    if (L) orelha(2, .15); else { orelha(-11, -.35); orelha(11, .35); }
    traco(g, TINTA, 3, () => { g.moveTo(-6, r - 2); g.lineTo(-7, r + 5); g.moveTo(6, r - 2); g.lineTo(7, r + 5); }); // pezinhos
    bola(g, 0, 0, r, C.corpo);
    if (!S) poligono(g, [-5, -r + 1, -2, -r - 5, 0, -r + 1, 3, -r - 4, 5, -r + 2], C.corpo, 2); // topete de pelo
    reflexo(g, -8, -10, 7, 4, .3);
    if (d === 'cima') { elipse(g, 0, 4, 12, 13, C.escuro, 0); return; }
    const fx = L ? 8 : 0, brilho = .5 + .5 * Math.sin(o.t * 4);
    // barriga clara com o sinal de menos que brilha
    aura(g, fx, 11, 14 + brilho * 4, `rgba(255,123,239,${.3 + .2 * brilho})`);
    elipse(g, fx, 11, L ? 8 : 11, 8, C.barriga, 2.2);
    caixa(g, fx - (L ? 4.5 : 6), 9.5, L ? 9 : 12, 3.6, 1.8, C.menos, 1.6);
    if (L) olhoBravo(g, o, fx + 5, -5, 7, C.iris, 1, C.corpo, C.esclera, 1.2);
    else { olhoBravo(g, o, -8, -5, 7.2, C.iris, -1, C.corpo, C.esclera); olhoBravo(g, o, 8, -5, 7.2, C.iris, 1, C.corpo, C.esclera); }
    bocaBrava(g, o, fx + (L ? 4 : 0), 2.5, 6, C.boca);
    if (L) { g.save(); g.translate(2, -2); asa(g, -1, ang, dobra, C, S); g.restore(); } // asa da frente
  }
  function sombrinha(g, o) {
    const C = cores(SOMBRINHA, o), voa = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3);
    const cy = -46 - Math.sin(o.t * (voa ? 6 : 3)) * (voa ? 4 : 3) * mexe; // sempre no ar
    sombra(g, 16 * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, cy, 44); sinaisOrbitando(g, o, cy, 50, SINAIS_INTEIROS, false); }
    if (voa) for (let k = 1; k <= 3; k++) { // rastro de sombra
      g.globalAlpha = a0 * (.35 - k * .08);
      bola(g, o.dir === 'lado' ? -k * 10 : Math.sin(o.t * 3 + k) * 4, cy + 14 + k * 6, 7 - k, '#3A2470', 0);
    }
    g.globalAlpha = a0;
    const desenha = () => {
      g.save();
      g.translate(o.treme + (ataca ? Math.sin(o.t * 12) * 3 : 0), cy);
      if (voa && o.dir === 'lado') g.rotate(.15);
      if (ataca) g.scale(1.1, 1.1);
      sombrinhaCorpo(g, o, C);
      g.restore();
    };
    if (o.est === 'morrendo') return morrer(g, o, cy, 30, desenha);
    desenha();
    if (ataca) sinaisOrbitando(g, o, cy, 50, SINAIS_INTEIROS, true);
    if (o.est === 'ferido') for (let k = 0; k < 3; k++) { // faíscas de sombra soltas
      const f = (o.t * 1.6 + k / 3) % 1;
      g.globalAlpha = a0 * (1 - f);
      estrela(g, -20 + k * 20, cy - 10 - f * 24, 3, k % 2 ? CIANO_CL : ROXO_CL);
    }
    g.globalAlpha = a0;
  }

  // ---------- Tronquelo: tronco caminhante com musgo, dois olhinhos e braços de galho ----------
  const TRONQUELO = { casca: '#8A5A32', cascaE: '#5E3B20', topo: '#D9A066', anel: '#A8743E', musgo: '#5CA84A', musgoE: '#3E7A3A', folha: '#6BCB5A', oco: '#22140C', olho: '#E8FF6B' };
  function musgo(g, x, y, larg, C) { // tufos de musgo: bolinhas encostadas
    const n = Math.max(2, Math.round(larg / 6));
    for (let k = 0; k < n; k++) bola(g, x + (k - (n - 1) / 2) * 6, y + (k % 2) * 2, 4.5, k % 2 ? C.musgoE : C.musgo, 1.8);
  }
  // olho que brilha: pequeno e inclinado; ferido aperta, morrendo gira
  function olhoAceso(g, o, x, y, r, cor, luz, inclina, lado) {
    if (o.est === 'ferido') { traco(g, cor, Math.max(2, r * .35), () => { const pa = x - lado * r * .5, pb = x + lado * r * .7; g.moveTo(pb, y - r * .6); g.lineTo(pa, y); g.lineTo(pb, y + r * .6); }); return; }
    if (o.est === 'morrendo') { traco(g, cor, 1.6, () => { for (let k = 0; k <= 10; k++) { const a = k * .9 + o.t * 8, q = r * k / 11; if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x, y); } }); return; }
    aura(g, x, y, r * 2.8, luz);
    if (o.pisca) { traco(g, cor, 2, () => { g.moveTo(x - r, y); g.lineTo(x + r, y); }); return; }
    elipse(g, x, y, r, r * .66, cor, 1.8, inclina);
    bola(g, x, y + r * .1, r * .28, '#3A4410', 0);
    reflexo(g, x - r * .35, y - r * .25, r * .25, r * .15, .9);
  }
  function bracoGalho(g, x, y, ang, C, S) {
    g.save(); g.translate(x, y); g.rotate(ang);
    caixa(g, -5, -2, 10, 26, 5, C.casca, 2.6);
    if (!S) {
      traco(g, C.cascaE, 1.4, () => { g.moveTo(-1.5, 3); g.lineTo(-1, 20); });
      traco2(g, C.casca, 1.8, () => { g.moveTo(4, 9); g.lineTo(11, 5); });
      folha(g, 11, 5, .9, 7, C.folha, 1.6);
    }
    caixa(g, -9, 20, 18, 17, 6, C.casca, 2.8); // punho de madeira
    if (!S) traco(g, C.cascaE, 1.4, () => { g.moveTo(0, 23.5); g.lineTo(4, 28.5); g.lineTo(0, 33.5); g.lineTo(-4, 28.5); g.closePath(); });
    musgo(g, 0, 0, 12, C); // musgo no ombro
    g.restore();
  }
  function tronqueloCorpo(g, o, C, golpe, guarda) {
    const S = o.simples, d = o.dir, L = d === 'lado', w = L ? 15 : 20;
    if (!L) bracoGalho(g, -w - 2, -62, guarda, C, S);
    caixa(g, -w, -80, w * 2, 66, 10, C.casca, 3);
    if (!S) traco(g, C.cascaE, 1.6, () => { for (const x of L ? [-6, 4] : [-11, -3, 6, 13]) { g.moveTo(x, -70); g.quadraticCurveTo(x + 2, -50, x - 1, -20); } });
    elipse(g, 0, -80, w, 6, C.topo, 2.6); // topo com anéis
    if (!S) { traco(g, C.anel, 1.2, () => g.ellipse(0, -80, w * .62, 3.6, 0, 0, TAU)); traco(g, C.anel, 1.2, () => g.ellipse(0, -80, w * .3, 1.8, 0, 0, TAU)); }
    traco2(g, C.musgoE, 1.8, () => { g.moveTo(3, -84); g.quadraticCurveTo(4, -90, 2, -94); }); // broto no topo
    folha(g, 2, -93, -.9, 9, C.folha, 2);
    folha(g, 2, -93, .8, 8, C.folha, 2);
    musgo(g, -w + 6, -77, 14, C);
    musgo(g, w - 7, -74, 10, C);
    if (!S) musgo(g, -w + 3, -36, 10, C);
    if (d === 'cima') { musgo(g, 0, -55, 22, C); musgo(g, 4, -40, 14, C); }
    else {
      const fx = L ? 6 : 0, luz = 'rgba(232,255,107,.4)';
      elipse(g, fx, -54, L ? 9 : 13, 7.5, C.oco, 2.4); // oco escuro
      if (L) olhoAceso(g, o, fx + 3, -54, 4.2, C.olho, luz, -.3, 1);
      else { olhoAceso(g, o, fx - 5.5, -54, 4.2, C.olho, luz, .35, -1); olhoAceso(g, o, fx + 5.5, -54, 4.2, C.olho, luz, -.35, 1); }
      traco(g, C.cascaE, 3, () => { g.moveTo(fx - 14, -63); g.lineTo(fx, -58.5); g.lineTo(fx + 14, -63); }); // testa franzida
      if (!S) musgo(g, fx, -45, 18, C); // barba de musgo
    }
    bracoGalho(g, L ? 4 : w + 2, -62, golpe, C, S); // braço da frente
  }
  function tronquelo(g, o) {
    const C = cores(TRONQUELO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3), L = o.dir === 'lado';
    const passo = anda ? Math.sin(o.t * 3.2 * mexe) : 0; // lento e pesado
    const sobe = anda ? Math.abs(passo) * 2.5 : o.respira * .5, incl = anda ? passo * .05 : 0;
    const fase = (o.t * 1.1) % 1; // golpe: levanta devagar e esmaga rápido
    const golpe = ataca ? (fase < .7 ? -.3 - (fase / .7) * 2.4 : -2.7 + ((fase - .7) / .3) * 2.9) : anda ? -.2 - passo * .15 : -.25;
    const guarda = anda ? .25 + passo * .15 : ataca ? .45 : .22;
    sombra(g, 30 * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, -50, 50); sinaisOrbitando(g, o, -56, 56, SINAIS_INTEIROS, false); }
    const desenha = () => {
      const pe = (x, lev) => { // pernas de raiz, uma levanta de cada vez
        caixa(g, x, -16 - lev, 13, 16, 5, C.cascaE, 2.6);
        traco(g, TINTA, 2.4, () => { g.moveTo(x + 1, -1 - lev); g.lineTo(x - 2, 1 - lev); g.moveTo(x + 12, -1 - lev); g.lineTo(x + 15, 1 - lev); });
      };
      pe(L ? -10 : -16, Math.max(0, passo) * 4);
      pe(L ? -2 : 3, Math.max(0, -passo) * 4);
      g.save();
      g.translate(o.treme, -sobe);
      g.rotate(incl);
      tronqueloCorpo(g, o, C, golpe, guarda);
      g.restore();
    };
    if (o.est === 'morrendo') return morrer(g, o, -48, 40, desenha);
    desenha();
    if (ataca) {
      sinaisOrbitando(g, o, -56, 56, SINAIS_INTEIROS, true);
      if (fase > .9) { // pedrinhas e brilho onde o punho bate
        const px = (L ? 4 : 22) - Math.sin(golpe) * 30, py = -62 - sobe + Math.cos(golpe) * 30;
        estrela(g, px, py, 7, CIANO_CL);
        for (let k = 0; k < 4; k++) { const a = -2.6 + k * .7, q = 8 + (fase - .9) * 120; poligono(g, [px + Math.cos(a) * q, py + Math.sin(a) * q, px + Math.cos(a) * q + 4, py + Math.sin(a) * q + 1, px + Math.cos(a) * q + 1, py + Math.sin(a) * q + 4], '#6A6478', 1.6); }
      }
    }
    if (anda && Math.abs(passo) < .15) { g.globalAlpha = a0 * .45; bola(g, -18, -3, 5, '#8A7A9A', 0); bola(g, 18, -3, 5, '#8A7A9A', 0); } // poeira do passo pesado
    if (o.est === 'ferido') for (let k = 0; k < 4; k++) { // lascas de madeira voando
      const f = (o.t * 1.6 + k / 4) % 1, a = -2.7 + k * .6, q = 22 + f * 22;
      g.globalAlpha = a0 * (1 - f);
      poligono(g, [Math.cos(a) * q, -56 + Math.sin(a) * q, Math.cos(a) * q + 5, -56 + Math.sin(a) * q + 2, Math.cos(a) * q + 2, -56 + Math.sin(a) * q + 4], C.casca, 1.4);
    }
    g.globalAlpha = a0;
  }

  // ---------- Olhudo: bolha escura com muitos olhos brilhantes; dormindo, só os olhos ----------
  const OLHUDO = { corpo: '#241A44', borda: '#5A48A0', esclera: '#F2FBFF', irisA: '#22E8FF', irisB: '#B07CFF', boca: '#0A0614' };
  const OLHOS = [[0, -4, 9, 0], [-14, -13, 5.5, 1], [13, -15, 6, 1], [-19, 3, 4.6, 0], [19, 1, 5, 0], [-7, 11, 4.2, 1], [9, 12, 4.6, 1], [1, -22, 4.2, 0]];
  const OLHOS_MAPA = [[0, -3, 10, 0], [-14, -12, 6, 1], [14, -12, 6, 1], [0, 12, 5, 0]];
  // bolha mole: contorno que ondula, base achatada no chão
  function bolha(g, o, R, sx, sy, cor) {
    const n = 16, pts = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU, w = 1 + .06 * Math.sin(3 * a + o.t * 2 * o.mov) + .04 * Math.sin(5 * a - o.t * 3 * o.mov);
      pts.push([Math.cos(a) * R * w * sx, Math.min(R * .72 * sy, Math.sin(a) * R * w * sy)]);
    }
    const meio = k => [(pts[k % n][0] + pts[(k + 1) % n][0]) / 2, (pts[k % n][1] + pts[(k + 1) % n][1]) / 2];
    g.beginPath();
    g.moveTo(...meio(0));
    for (let k = 1; k <= n; k++) { const p = pts[k % n], m = meio(k); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    g.closePath();
    pinta(g, cor, 3);
  }
  // cada olho pisca na sua hora e olha para um lado diferente
  function olhoBolha(g, o, x, y, r, iris, i, C) {
    if (o.est === 'ferido') { traco(g, CIANO_CL, Math.max(1.8, r * .3), () => { g.moveTo(x - r * .75, y - r * .3); g.quadraticCurveTo(x, y + r * .5, x + r * .75, y - r * .3); }); return; }
    const pisca = (o.est === 'idle' || o.est === 'andando') && (o.t + i * 1.37) % 3.3 < .14;
    if (pisca) { traco(g, iris, Math.max(1.6, r * .26), () => { g.moveTo(x - r * .8, y); g.quadraticCurveTo(x, y + r * .4, x + r * .8, y); }); return; }
    const ataca = o.est === 'atacando', k = ataca ? 1.15 : 1, foco = ataca ? .8 : 1;
    const mx = ataca ? 0 : Math.cos(o.t * .7 + i * 1.9) * r * .22 * o.mov, my = ataca ? 0 : Math.sin(o.t * .5 + i) * r * .15 * o.mov;
    bola(g, x, y, r * k, C.esclera, Math.max(1.6, r * .22));
    bola(g, x + mx, y + my, r * .6 * foco, iris, 0);
    bola(g, x + mx, y + my, r * .3 * foco, TINTA, 0);
    bola(g, x + mx - r * .2, y + my - r * .22, r * .2, '#fff', 0);
  }
  function olhudoCorpo(g, o, C, sx, sy) {
    const S = o.simples, d = o.dir, R = 30;
    aura(g, 0, -4, R * 1.5, 'rgba(176,124,255,.18)'); // brilho roxo em volta, de noite
    bolha(g, o, R, sx, sy, C.corpo);
    if (!S) traco(g, C.borda, 2, () => g.ellipse(-6, -10, R * .55 * sx, R * .4 * sy, -.3, Math.PI * 1.05, Math.PI * 1.6));
    reflexo(g, -11, -16, 6, 3, .22);
    if (d === 'cima') { // costas: dois olhinhos fechados
      traco(g, ROXO_CL, 2, () => { g.moveTo(-12, -6); g.quadraticCurveTo(-8, -3, -4, -6); g.moveTo(6, -11); g.quadraticCurveTo(10, -8, 14, -11); });
      return;
    }
    const L = d === 'lado', desl = L ? 8 : 0, enc = L ? .6 : 1;
    if (o.est === 'atacando') bocaBrava(g, o, desl, 18 * sy, 9, C.boca);
    (S ? OLHOS_MAPA : OLHOS).forEach(([x, y, r, c], i) => {
      if (L && x < -10) return; // de lado, os de trás somem
      olhoBolha(g, o, (x * enc + desl) * sx, y * sy, r * (L && x < 0 ? .8 : 1), c ? C.irisB : C.irisA, i, C);
    });
  }
  function tentaculos(g, o, cy) { // ataque: fios de sombra que se esticam
    for (let k = 0; k < 4; k++) {
      const lado = k % 2 ? 1 : -1, base = k < 2 ? 6 : -8, comp = 26 + Math.sin(o.t * 6 + k) * 6;
      const ponto = f => [lado * (22 + comp * f), cy + base + Math.sin(o.t * 8 + k + f * 5) * 5 * f - f * 6];
      const fio = () => { g.moveTo(...ponto(0)); for (let s = 1; s <= 6; s++) g.lineTo(...ponto(s / 6)); };
      traco(g, TINTA, 6.5, fio);
      traco(g, '#3E3070', 4, fio);
      const [ex, ey] = ponto(1);
      estrela(g, ex, ey, 3.5, k % 2 ? CIANO_CL : ROXO_CL);
    }
  }
  function olhudoDormindo(g, o, C) { // no escuro, só os olhos meio fechados brilham
    const a0 = g.globalAlpha;
    (o.simples ? OLHOS_MAPA : OLHOS.slice(0, 6)).forEach(([x, y, r, c], i) => {
      const abre = .15 + .25 * Math.max(0, Math.sin(o.t * .7 + i * 1.3)), px = x, py = -22 + y;
      aura(g, px, py, r * 2.4, c ? 'rgba(176,124,255,.35)' : 'rgba(34,232,255,.35)');
      elipse(g, px, py, r, r * abre, c ? C.irisB : C.irisA, 0);
      elipse(g, px, py, r * .45, r * abre * .55, '#FFFFFF', 0);
    });
    const f = (o.t * .45) % 1; // "z" bem baixinho
    g.globalAlpha = a0 * (1 - f) * .75;
    g.font = '900 9px ui-rounded, "Nunito", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#DDE6FF'; g.fillText('z', 24 + f * 6, -46 - f * 14);
    g.globalAlpha = a0;
  }
  function olhudo(g, o) {
    const C = cores(OLHUDO, o);
    if (o.est === 'dormindo') return olhudoDormindo(g, o, C);
    const anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3);
    const onda = Math.sin(o.t * (anda ? 5 : 2.2) * mexe) * (anda ? .09 : .04); // escorre e balança
    let sx = 1 + onda, sy = 1 - onda;
    if (ataca) { sx *= 1.12; sy *= 1.12; }
    if (o.est === 'morrendo') { sx *= 1 + o.prog * .5; sy *= 1 - o.prog * .75; } // derrete
    const cy = -30 * .72 * sy; // a base achatada fica no chão
    sombra(g, 30 * sx);
    if (anda) for (let k = 1; k <= 3; k++) { g.globalAlpha = a0 * (.4 - k * .1); elipse(g, (o.dir === 'lado' ? -1 : 0) * (20 + k * 8), -1, 6 - k, 2, '#241A44', 0); } // gotinhas que ficam
    g.globalAlpha = a0;
    if (ataca) { rodamoinho(g, o, cy, 46); tentaculos(g, o, cy); }
    g.save();
    g.translate(o.treme + (anda ? Math.sin(o.t * 2.5) * 2 : 0), cy);
    if (o.est === 'morrendo') g.globalAlpha = a0 * Math.max(0, 1 - o.prog * .9);
    olhudoCorpo(g, o, C, sx, sy);
    g.restore();
    if (o.est === 'morrendo') OLHOS.forEach(([x, y, r, c], i) => { // os olhos viram brilhos e sobem
      g.globalAlpha = a0 * Math.max(0, 1 - o.prog);
      estrela(g, x * (1 + o.prog * .6), cy + y - o.prog * (24 + i * 3), r * .6 + 1, c ? ROXO_CL : CIANO_CL);
    });
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
    sombrinha: { nome: 'Sombrinha', w: 120, h: 100, estados: BASE, desenho: sombrinha, semente: .9 },
    tronquelo: { nome: 'Tronquelo', w: 112, h: 110, estados: BASE, desenho: tronquelo, semente: 2.2 },
    olhudo: { nome: 'Olhudo', w: 116, h: 78, estados: [...BASE, 'dormindo'], desenho: olhudo, semente: 3.4 }
  };
  const ids = [];
  for (const [id, m] of Object.entries(MONSTROS)) {
    Sprites.registrar(id, {
      nome: m.nome, w: m.w, h: m.h, estados: m.estados, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: 'floresta', tema: 'Negativo', acento: [ROXO, CIANO],
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
  window.MonstrosFloresta = { ids, acento: [ROXO, CIANO] };
})();
