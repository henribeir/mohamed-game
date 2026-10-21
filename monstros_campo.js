/* Mohamed — monstros_campo.js: os 3 monstros do Campo (dia, tema Naturais, acento verde), desenhados por código.
   Mesma API de personagens.js: Sprites.registrar(id, { nome, w, h, estados, vistas, desenhar(ctx, p) })
     p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t: segundos, prog: 0..1 }
     (também aceita desenhar(ctx, estado, vista, t, dir))
   Estados: idle, andando, atacando, ferido, morrendo (prog 0→1; sem prog repete, para prévia) e dormindo (Espantoso).
   batalha: de frente, grande, olhando para o aluno · mapa: pequeno, 3 direções ('esquerda' espelha o 'lado').
   Mesmas unidades nas duas vistas (origem entre os pés); no mapa o contorno engrossa para ler bem pequeno.
   Formas simples, sem imagens e sem shadowBlur; "reduzir movimento" acalma o balanço e tira o piscar do ferido. */
(() => {
  const TINTA = '#1E1240', TAU = Math.PI * 2;
  const ACENTO = '#3DDC84', ACENTO_CL = '#A8FFCB'; // verde do Campo
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
        // pés em (x, y); tam = altura em px; o = { estado, vista, dir, t, prog, espelho }
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
  function traco2(g, cor, lw, fn) { traco(g, TINTA, lw + 2.2, fn); traco(g, cor, lw, fn); } // contorno escuro + cor
  function reflexo(g, x, y, rx, ry, a = .55) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, -.6, 0, TAU); g.fill(); }
  function aura(g, x, y, r, cor) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function sombra(g, rx) { g.fillStyle = 'rgba(0,0,0,.24)'; g.beginPath(); g.ellipse(0, 0, rx, rx * .26, 0, 0, TAU); g.fill(); }
  function estrela(g, x, y, r, cor) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = cor; g.fill();
  }
  // folha: gota alongada girada (0 = ponta para cima)
  function folha(g, x, y, ang, comp, cor, linha = 2.2, nervura) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(comp * .55, -comp * .45, 0, -comp); g.quadraticCurveTo(-comp * .55, -comp * .45, 0, 0); pinta(g, cor, linha);
    if (nervura) traco(g, nervura, 1, () => { g.moveTo(0, -1.5); g.lineTo(0, -comp * .78); });
    g.restore();
  }
  // número (texto) ou sinal (+ − × ÷) com contorno escuro
  function sinal(g, s, x, y, tam, cor) {
    if (s >= '0' && s <= '9') {
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
  // ferido: pisca branco (cores trocadas, menos olhos e boca)
  const brancos = new Map();
  function cores(base, o) {
    if (!o.flash) return base;
    if (!brancos.has(base)) brancos.set(base, Object.fromEntries(Object.entries(base).map(([k, v]) => [k, /esclera|iris|olho|tapa|boca/.test(k) ? v : '#FFF3F6'])));
    return brancos.get(base);
  }

  // olho de monstro: bravo mas fofo. lado = -1 esquerdo, 1 direito, 0 olho único (sobrancelha em V)
  function olhoBravo(g, o, x, y, r, iris, lado, pele, esclera = '#FFF6E2', mx = 0) {
    const lw = Math.max(2, r * .2);
    if (o.est === 'ferido') { // ><
      traco(g, TINTA, Math.max(2.2, r * .3), () => {
        if (lado) { const pa = x - lado * r * .5, pb = x + lado * r * .6; g.moveTo(pb, y - r * .5); g.lineTo(pa, y); g.lineTo(pb, y + r * .5); }
        else { g.moveTo(x - r, y - r * .25); g.lineTo(x - r * .35, y + r * .2); g.lineTo(x + r * .35, y - r * .2); g.lineTo(x + r, y + r * .25); }
      });
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
    // pálpebra brava, mais baixa no meio (no ataque, mais ainda)
    const b = o.est === 'atacando' ? .75 : .5, meio = y - r * (1 - b * 1.2), borda = y - r * 1.05;
    const pts = lado ? [x + lado * r * 1.3, borda, x - lado * r * 1.3, meio] : [x - r * 1.3, borda, x, meio, x + r * 1.3, borda];
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    g.beginPath(); g.moveTo(pts[0], y - r * 1.4);
    for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.lineTo(pts[pts.length - 2], y - r * 1.4); g.closePath();
    g.fillStyle = pele; g.fill();
    g.restore();
    traco(g, TINTA, Math.max(2.4, r * .26), () => {
      const lerp = (i, j, f) => [pts[i * 2] + (pts[j * 2] - pts[i * 2]) * f, pts[i * 2 + 1] + (pts[j * 2 + 1] - pts[i * 2 + 1]) * f];
      if (lado) { const [ax, ay] = lerp(0, 1, .12), [bx, by] = lerp(0, 1, .88); g.moveTo(ax, ay); g.lineTo(bx, by); }
      else { const [ax, ay] = lerp(0, 1, .15), [bx, by] = lerp(2, 1, .15); g.moveTo(ax, ay); g.lineTo(pts[2], pts[3]); g.lineTo(bx, by); }
    });
    bola(g, x, y, r, null, lw);
  }
  // boca: emburrada; no ataque abre com dois dentinhos
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
  // ataque: redemoinho verde em volta
  function rodamoinho(g, o, cy, r) {
    aura(g, 0, cy, r * 1.2, 'rgba(61,220,132,.26)');
    const a0 = g.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const a = o.t * (5 + k) * Math.max(o.mov, .3) + k * 2.1, q = 1 - k * .14;
      g.globalAlpha = a0 * (.8 - k * .2);
      traco(g, k ? ACENTO : ACENTO_CL, 3.2 - k * .7, () => g.ellipse(0, cy + 8, r * q, r * .4 * q, -.18, a, a + 2.3));
    }
    g.globalAlpha = a0;
  }
  // números e sinais girando: os de trás antes do corpo, os da frente depois
  function sinaisOrbitando(g, o, cy, r, lista, frente) {
    const a0 = g.globalAlpha;
    lista.forEach((s, k) => {
      const a = o.t * 1.8 * Math.max(o.mov, .3) + k * TAU / lista.length, sn = Math.sin(a);
      if ((sn >= 0) !== frente) return;
      g.globalAlpha = a0 * (frente ? .75 + .25 * sn : .45 + .2 * sn);
      sinal(g, s, Math.cos(a) * r, cy + sn * r * .32, 4, ACENTO_CL);
    });
    g.globalAlpha = a0;
  }
  // morrendo: encolhe e some numa fumacinha clara com brilhos (nada sangrento)
  function morrer(g, o, cy, r, desenha) {
    const p = o.prog, a0 = g.globalAlpha, s = 1 - p * .7;
    g.save();
    g.globalAlpha = a0 * Math.max(0, 1 - p * 1.15);
    g.translate(0, cy); g.rotate(p * .6); g.scale(s, s); g.translate(0, -cy);
    desenha();
    g.restore();
    if (p > .3) {
      const f = (p - .3) / .7;
      g.globalAlpha = a0 * (1 - f) * .85;
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; bola(g, Math.cos(a) * r * f, cy + Math.sin(a) * r * f * .7, 5 + 8 * f, '#F2EEFF', 0); }
    }
    for (let k = 0; k < 7; k++) {
      const a = k * TAU / 7 + .4, v = r * (.6 + (k % 3) * .3);
      g.globalAlpha = a0 * Math.max(0, 1 - p);
      estrela(g, Math.cos(a) * v * p, cy + Math.sin(a) * v * p * .8 - p * 18, 2 + 2.5 * Math.sin(p * Math.PI), k % 2 ? ACENTO_CL : '#FFF6B0');
    }
    g.globalAlpha = a0;
  }

  // ---------- Folhito: broto verde de um olho só, duas folhinhas na cabeça, anda balançando ----------
  const FOLHITO = { corpo: '#4FB36C', escuro: '#2E7A45', claro: '#8FE39A', folha: '#62CF73', nervura: '#2E7A45', marca: '#E8FFB8', esclera: '#FFF4B8', iris: '#7A3FC0' };
  function folhitoCorpo(g, o, C) {
    const S = o.simples, d = o.dir, r = 28, bal = Math.sin(o.t * 3) * .12 * o.mov, fx = d === 'lado' ? 4 : 0;
    folha(g, fx - 5, -r + 7, -.55 + bal, S ? 22 : 26, C.folha, 3, S ? null : C.nervura);
    folha(g, fx + 5, -r + 7, .55 + bal, S ? 22 : 26, C.folha, 3, S ? null : C.nervura);
    if (!S && d === 'baixo') { sinal(g, '+', fx - 12, -32, 2.6, C.marca); sinal(g, '−', fx + 12, -32, 2.6, C.marca); }
    const n = S ? 8 : 12; // borda de folhinhas em ponta
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU + .26; folha(g, Math.cos(a) * (r - 7), Math.sin(a) * (r - 7), a + Math.PI / 2, S ? 13 : 15, k % 2 ? C.corpo : C.escuro, 2.4); }
    bola(g, 0, 0, r, C.corpo);
    if (!S) for (const [x, y, a] of [[-14, 12, -2.5], [15, 10, 2.4], [-2, 19, 3.1]]) folha(g, x, y, a, 10, C.claro, 0);
    reflexo(g, -10, -13, 8, 4, .35);
    if (d === 'cima') { // costas: folhas com sinais
      folha(g, -9, 10, -.5, 15, C.claro, 2, C.nervura); folha(g, 9, 10, .5, 15, C.claro, 2, C.nervura); folha(g, 0, 16, 0, 16, C.claro, 2, C.nervura);
      if (!S) { sinal(g, '+', -13, 2, 2.2, C.marca); sinal(g, '+', 13, 2, 2.2, C.marca); }
    } else if (d === 'lado') olhoBravo(g, o, 13, 1, 11, C.iris, 0, C.corpo, C.esclera, 2);
    else olhoBravo(g, o, 0, 2, S ? 14 : 15.5, C.iris, 0, C.corpo, C.esclera);
  }
  function folhito(g, o) {
    const C = cores(FOLHITO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', cy = -38, a0 = g.globalAlpha;
    const ginga = anda ? Math.sin(o.t * 8) * .16 * Math.max(o.mov, .4) : 0;
    const salto = anda ? Math.abs(Math.sin(o.t * 8)) * 3 * o.mov : o.respira;
    sombra(g, 26 * (1 - o.prog * .6));
    if (ataca) rodamoinho(g, o, cy, 44);
    const desenha = () => {
      const passo = anda ? Math.sin(o.t * 8) * 2.5 : 0;
      elipse(g, -11 + o.treme, -4 - Math.max(0, passo), 7, 4.5, C.escuro);
      elipse(g, 11 + o.treme, -4 - Math.max(0, -passo), 7, 4.5, C.escuro);
      g.save();
      g.translate(o.treme + (ataca ? Math.sin(o.t * 10) * 2 : 0), cy - salto);
      g.rotate(ginga);
      if (ataca) g.scale(1.08, 1.08);
      folhitoCorpo(g, o, C);
      g.restore();
    };
    if (o.est === 'morrendo') return morrer(g, o, cy, 32, desenha);
    desenha();
    if (ataca) for (let k = 0; k < 4; k++) { // folhas voando na direção do aluno
      const f = (o.t * 1.4 * Math.max(o.mov, .3) + k / 4) % 1, a = k * 1.57 + o.t * 2, q = 16 + f * 34, s = .6 + f * .8;
      g.globalAlpha = a0 * (1 - f * .8);
      folha(g, Math.cos(a) * q, cy + Math.sin(a) * q * .55 - f * 8, a + 1.2, 12 * s, C.folha, 2, C.nervura);
    }
    if (o.est === 'ferido') for (let k = 0; k < 3; k++) { // folhinhas soltas caindo
      const f = (o.t * 1.6 + k / 3) % 1;
      g.globalAlpha = a0 * (1 - f);
      folha(g, -18 + k * 18, cy - 22 + f * 40, f * 6 + k, 7, C.folha, 1.6);
    }
    g.globalAlpha = a0;
  }

  // ---------- Zerinho: bolinha rosa com um 0 no peito, saltitante e rápida ----------
  const ZERINHO = { corpo: '#F06292', escuro: '#B8336A', zero: '#FFE4EE', folha: '#5CB85C', nervura: '#2E7044', esclera: '#FFF4E8', iris: '#A0225F', boca: '#6B1E3A' };
  const ZEROS = ['0', '0', '0', '0', '0'];
  function zeroNoPeito(g, x, y, r, C) { elipse(g, x, y, r * .8, r, C.zero, 2.6); elipse(g, x, y, r * .34, r * .55, C.corpo, 2); }
  function zerinhoCorpo(g, o, C) {
    const S = o.simples, d = o.dir, r = 26, L = d === 'lado';
    elipse(g, L ? -3 : -9, r - 1, 6, 4, C.escuro, 2.4);
    elipse(g, L ? 7 : 9, r - 1, 6, 4, C.escuro, 2.4);
    const cabo = () => { g.moveTo(0, -r + 2); g.quadraticCurveTo(1.5, -r - 5, -1, -r - 9); };
    traco(g, TINTA, 3.6, cabo); traco(g, C.nervura, 1.8, cabo);
    folha(g, -1, -r - 8, -1.1, 14, C.folha, 2.4, S ? null : C.nervura);
    folha(g, -1, -r - 8, .9, 12, C.folha, 2.4, S ? null : C.nervura);
    if (!L) { bola(g, -r - 1, 6, 6.5, C.corpo, 2.6); bola(g, r + 1, 6, 6.5, C.corpo, 2.6); }
    bola(g, 0, 0, r, C.corpo);
    if (!S) elipse(g, 5, 11, 17, 11, 'rgba(150,30,80,.16)', 0);
    reflexo(g, -9, -12, 8, 4.5, .45);
    if (d === 'cima') { elipse(g, 0, 3, 9, 12, C.escuro, 0); return; } // costas: mancha escura
    if (L) {
      olhoBravo(g, o, 12, -6, 8, C.iris, 1, C.corpo, C.esclera, 1.5);
      bocaBrava(g, o, 20, 4, 6, C.boca);
      zeroNoPeito(g, 15, 15, 6, C);
      bola(g, 3, 9, 6.5, C.corpo, 2.6);
      return;
    }
    olhoBravo(g, o, -9.5, -6, 8.6, C.iris, -1, C.corpo, C.esclera);
    olhoBravo(g, o, 9.5, -6, 8.6, C.iris, 1, C.corpo, C.esclera);
    bocaBrava(g, o, 0, 4.5, 7, C.boca);
    zeroNoPeito(g, 0, 16, S ? 6.5 : 7, C);
  }
  function zerinho(g, o) {
    const C = cores(ZERINHO, o), anda = o.est === 'andando', ataca = o.est === 'atacando', cy = -30, a0 = g.globalAlpha;
    const vel = anda ? 10 : ataca ? 14 : 5, alt = anda ? 13 : ataca ? 6 : 3.5;
    const fase = Math.abs(Math.sin(o.t * vel)), salto = fase * alt * Math.max(o.mov, .25);
    const noChao = fase < .22 && o.est !== 'morrendo' && o.est !== 'ferido'; // amassa ao tocar o chão
    const sx = noChao ? 1.12 : .96, sy = noChao ? .86 : 1.05;
    sombra(g, 22 * (1 - salto / 40) * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, cy, 40); sinaisOrbitando(g, o, cy, 42, ZEROS, false); }
    const desenha = () => {
      g.save();
      g.translate(o.treme + (ataca ? Math.sin(o.t * 14) * 3 : 0), -4 - salto);
      g.scale(sx, sy);
      g.translate(0, cy + 4);
      if (anda && o.dir === 'lado') g.rotate(.12);
      zerinhoCorpo(g, o, C);
      g.restore();
    };
    if (o.est === 'morrendo') {
      morrer(g, o, cy, 30, desenha);
      g.globalAlpha = a0 * (1 - o.prog); // o 0 cresce e some
      traco(g, ACENTO_CL, 3, () => g.ellipse(0, cy, 8 + 30 * o.prog, 10 + 38 * o.prog, 0, 0, TAU));
      g.globalAlpha = a0;
      return;
    }
    desenha();
    if (ataca) sinaisOrbitando(g, o, cy, 42, ZEROS, true);
    if (anda && noChao) { g.globalAlpha = a0 * .5; bola(g, -16, -3, 4, '#F6E8F0', 0); bola(g, -22, -6, 3, '#F6E8F0', 0); g.globalAlpha = a0; } // poeirinha
  }

  // ---------- Espantoso: espantalho de palha com chapéu torto; dormindo, só os olhos no mato ----------
  const ESPANTOSO = { saco: '#E2C58A', sacoE: '#B8935A', palha: '#F2C94C', palhaE: '#B88A26', chapeu: '#D9A84A', chapeuE: '#A87A2E', faixa: '#5A3A6E', madeira: '#8A5A32', roupa: '#C9A15A', roupaE: '#8F6E34', remendo: '#7A5AA8', tapa: '#4A2E1E', olho: '#FFD95A', boca: '#3B2416' };
  const NUMEROS = ['3', '+', '6', '×', '8'];
  function palha(g, x, y, ang, comp, n, cor) {
    const raios = () => { for (let k = 0; k < n; k++) { const a = ang + (k - (n - 1) / 2) * .3; g.moveTo(x, y); g.lineTo(x + Math.sin(a) * comp, y - Math.cos(a) * comp); } };
    traco(g, TINTA, 3.4, raios); traco(g, cor, 1.8, raios);
  }
  function chapeuTorto(g, C, x, y, rot, S) {
    g.save(); g.translate(x, y); g.rotate(rot);
    elipse(g, 0, 0, 30, 7.5, C.chapeu);
    g.beginPath(); g.moveTo(-15, -2); g.quadraticCurveTo(-12, -20, -3, -30); g.quadraticCurveTo(4, -38, 14, -36); g.quadraticCurveTo(8, -32, 6, -24); g.quadraticCurveTo(10, -12, 15, -2); g.closePath(); pinta(g, C.chapeu);
    caixa(g, -15, -8, 30, 6, 2, C.faixa, 2);
    if (!S) { caixa(g, -11, -21, 7, 6, 1, C.chapeuE, 1.5); traco(g, C.chapeuE, 1.2, () => { g.moveTo(-26, 2); g.lineTo(-20, 3); g.moveTo(20, 3); g.lineTo(26, 1); }); }
    g.restore();
  }
  // o olho que brilha (o outro é um tapa-olho costurado)
  function olhoAceso(g, o, x, y, C, forte) {
    if (o.est === 'ferido') { traco(g, TINTA, 2.6, () => { g.moveTo(x + 4, y - 4); g.lineTo(x - 3, y); g.lineTo(x + 4, y + 4); }); return; }
    if (o.est === 'morrendo') { traco(g, TINTA, 1.8, () => { for (let k = 0; k <= 12; k++) { const a = k * .8 + o.t * 8, q = 6 * k / 13; if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x, y); } }); return; }
    aura(g, x, y, forte ? 16 : 11, `rgba(255,217,90,${forte ? .5 : .35})`);
    bola(g, x, y, 6, C.olho, 2.4);
    bola(g, x + .8, y + .8, 2.6, '#9A5A10', 0);
    reflexo(g, x - 2, y - 2.2, 1.6, 1, .9);
    traco(g, TINTA, 2.6, () => { g.moveTo(x - 6, y - 7); g.lineTo(x + 6, y - 10.5); });
  }
  function bocaCosturada(g, o, x, y, C) {
    if (o.est === 'atacando') {
      elipse(g, x, y + 1, 7.5, 4.8, C.boca, 2.2);
      traco(g, C.saco, 1.4, () => { for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 3, y - 3); g.lineTo(x + k * 3, y + 5); } });
      return;
    }
    traco(g, TINTA, 2.2, () => {
      g.moveTo(x - 8, y); g.quadraticCurveTo(x, y + (o.est === 'ferido' ? -2 : 2), x + 8, y);
      for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 3.2, y - 2.5); g.lineTo(x + k * 3.2, y + 2.5); }
    });
  }
  function espantosoCorpo(g, o, C) {
    const S = o.simples, d = o.dir, L = d === 'lado', ataca = o.est === 'atacando', hy = -86 + o.respira;
    const braco = L ? 12 : 46, sacode = ataca ? Math.sin(o.t * 16) * 2 : 0;
    caixa(g, -3, -36, 6, 36, 2, C.madeira, 2.4); // estaca
    palha(g, 0, -32, Math.PI, 9, 5, C.palha);
    // vara dos braços, mangas esfarrapadas e palha nas mãos
    g.save();
    g.translate(0, -62 + sacode);
    if (ataca) g.rotate(Math.sin(o.t * 8) * .05);
    caixa(g, -braco, -3, braco * 2, 6, 3, C.madeira, 2.4);
    palha(g, -braco, 0, -1.57, 10, 5, C.palha);
    palha(g, braco, 0, 1.57, 10, 5, C.palha);
    if (!L) {
      poligono(g, [-12, -5, -40, -4, -38, 6, -34, 3, -30, 7, -26, 3, -12, 7], C.roupa, 2.4);
      poligono(g, [12, -5, 40, -4, 38, 6, 34, 3, 30, 7, 26, 3, 12, 7], C.roupa, 2.4);
    }
    g.restore();
    // poncho com barra em zigue-zague, remendo e botão com ×
    poligono(g, [-14, -68, 14, -68, 24, -34, 18, -38, 12, -32, 6, -37, 0, -31, -6, -37, -12, -32, -18, -38, -24, -34], C.roupa, 2.6);
    if (!S) {
      caixa(g, L ? -14 : 6, -55, 9, 8, 1.5, C.remendo, 1.8);
      traco(g, C.roupaE, 1.2, () => { g.moveTo(-16, -44); g.lineTo(-8, -40); g.moveTo(10, -42); g.lineTo(16, -45); });
    }
    if (d !== 'cima') {
      const bx = L ? 6 : 0;
      bola(g, bx, -57, 5, C.chapeuE, 2.2);
      traco(g, TINTA, 1.6, () => { g.moveTo(bx - 2.5, -59.5); g.lineTo(bx + 2.5, -54.5); g.moveTo(bx + 2.5, -59.5); g.lineTo(bx - 2.5, -54.5); });
    }
    // cabeça de saco amarrada, com palha saindo
    palha(g, -17, hy - 4, -2, 9, 4, C.palha);
    if (!L) palha(g, 17, hy - 4, 2, 9, 4, C.palha);
    elipse(g, 0, hy, 21, 19, C.saco);
    if (!S) traco(g, C.sacoE, 1.1, () => { g.moveTo(-14, hy - 10); g.lineTo(-10, hy - 13); g.moveTo(12, hy + 9); g.lineTo(16, hy + 5); });
    const corda = () => { g.moveTo(-10, hy + 16); g.quadraticCurveTo(0, hy + 20, 10, hy + 16); };
    traco(g, TINTA, 4.4, corda); traco(g, C.palhaE, 2.4, corda);
    if (d === 'cima') { // costas: costura grande
      traco(g, C.sacoE, 1.6, () => { g.moveTo(0, hy - 14); g.lineTo(0, hy + 12); for (let k = -2; k <= 2; k++) { g.moveTo(-3, hy + k * 5); g.lineTo(3, hy + k * 5); } });
    } else {
      const fx = L ? 8 : 0;
      if (!L) { // tapa-olho costurado com ×
        bola(g, fx - 8, hy - 2, 6.5, C.tapa, 2.4);
        traco(g, C.roupa, 1.6, () => { g.moveTo(fx - 11, hy - 5); g.lineTo(fx - 5, hy + 1); g.moveTo(fx - 5, hy - 5); g.lineTo(fx - 11, hy + 1); });
      }
      olhoAceso(g, o, fx + 8, hy - 2, C, ataca);
      bocaCosturada(g, o, fx + (L ? 4 : 0), hy + 9, C);
    }
    if (!o.semChapeu) chapeuTorto(g, C, L ? 3 : 0, hy - 15, L ? -.05 : -.12, S);
  }
  // dormindo: só os olhos meio fechados brilham no meio do mato (e a pontinha do chapéu)
  function tufo(g, x, y, larg) {
    const n = 9;
    for (let k = 0; k < n; k++) {
      const bx = x - larg / 2 + (k + .5) * larg / n, h = 18 + ((k * 7) % 5) * 5, curva = ((k % 3) - 1) * 4;
      g.beginPath(); g.moveTo(bx - 5, y); g.quadraticCurveTo(bx - 1, y - h * .6, bx + curva, y - h); g.quadraticCurveTo(bx + 1, y - h * .5, bx + 5, y); g.closePath();
      pinta(g, k % 2 ? '#2E6B3A' : '#3F8F58', 2);
    }
  }
  function espantosoDormindo(g, o, C) {
    const a0 = g.globalAlpha, abre = .22 + .2 * Math.max(0, Math.sin(o.t * .8)), y = -26;
    g.save(); g.translate(3, -36); g.rotate(-.2);
    g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(-4, -12, 4, -16); g.quadraticCurveTo(2, -8, 8, 0); g.closePath(); pinta(g, C.chapeu, 2.4);
    g.restore();
    aura(g, -7, y, 12, 'rgba(255,217,90,.3)');
    aura(g, 7, y, 12, 'rgba(255,217,90,.3)');
    elipse(g, -7, y, 5, 5 * abre, C.olho, 0, .25);
    elipse(g, 7, y, 5, 5 * abre, C.olho, 0, -.25);
    tufo(g, 0, 0, 40);
    const f = (o.t * .45) % 1; // "z" bem baixinho
    g.globalAlpha = a0 * (1 - f) * .75;
    g.font = '900 9px ui-rounded, "Nunito", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#DDE6FF'; g.fillText('z', 16 + f * 6, -42 - f * 14);
    g.globalAlpha = a0;
  }
  function espantoso(g, o) {
    const C = cores(ESPANTOSO, o);
    if (o.est === 'dormindo') return espantosoDormindo(g, o, C);
    const anda = o.est === 'andando', ataca = o.est === 'atacando', a0 = g.globalAlpha, mexe = Math.max(o.mov, .3);
    const salto = anda ? Math.abs(Math.sin(o.t * 7)) * 6 * mexe : 0, incl = anda ? Math.sin(o.t * 7) * .07 * mexe : 0; // pula na estaca
    sombra(g, 24 * (1 - o.prog * .6));
    if (ataca) { rodamoinho(g, o, -62, 50); sinaisOrbitando(g, o, -66, 54, NUMEROS, false); }
    const desenha = () => { g.save(); g.translate(o.treme, -salto); g.rotate(incl); espantosoCorpo(g, o, C); g.restore(); };
    if (o.est === 'morrendo') {
      o.semChapeu = true;
      morrer(g, o, -60, 40, desenha);
      const p = o.prog; // o chapéu voa e cai rodando
      g.globalAlpha = a0 * Math.max(0, 1 - p);
      chapeuTorto(g, C, -26 * p, -101 - 30 * Math.sin(p * Math.PI), -.12 - p * 2.4, o.simples);
      g.globalAlpha = a0;
      return;
    }
    desenha();
    if (ataca) sinaisOrbitando(g, o, -66, 54, NUMEROS, true);
    if (o.est === 'ferido') for (let k = 0; k < 5; k++) { // palha voando
      const f = (o.t * 1.8 + k / 5) % 1, a = -2.6 + k * .55, q = 14 + f * 24;
      g.globalAlpha = a0 * (1 - f);
      traco2(g, C.palha, 1.8, () => { const x = Math.cos(a) * q, y = -66 + Math.sin(a) * q; g.moveTo(x, y); g.lineTo(x + Math.cos(a + 1) * 5, y + Math.sin(a + 1) * 5); });
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
    folhito: { nome: 'Folhito', w: 112, h: 104, estados: BASE, desenho: folhito, semente: .7 },
    zerinho: { nome: 'Zerinho', w: 104, h: 96, estados: BASE, desenho: zerinho, semente: 1.9 },
    espantoso: { nome: 'Espantoso', w: 124, h: 146, estados: [...BASE, 'dormindo'], desenho: espantoso, semente: 3.1 }
  };
  const ids = [];
  for (const [id, m] of Object.entries(MONSTROS)) {
    Sprites.registrar(id, {
      nome: m.nome, w: m.w, h: m.h, estados: m.estados, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: 'campo', tema: 'Natural', acento: ACENTO,
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
  window.MonstrosCampo = { ids, acento: ACENTO };
})();
