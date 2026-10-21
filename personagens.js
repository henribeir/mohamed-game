/* Mohamed — personagens.js: os aliados desenhados por código (Canvas 2D, só formas simples, sem imagens).
   Registra em Sprites.registrar(id, def) — def: { nome, w, h, estados, vistas, desenhar(ctx, p) }
     p = { estado: 'idle' | 'falando' | 'feliz' | extra, vista: 'frente' | 'lado', t: segundos }
     (também aceita desenhar(ctx, estado, vista, t)). Origem (0, 0) = entre os pés; o desenho sobe (y negativo).
     A vista 'lado' olha para a direita: para a esquerda, espelhe (ctx.scale(-1, 1)).
   Se ainda não existir um Sprites, cria um mínimo com a mesma API (registrar, desenhar, def, lista).
   Leve: sem sombra borrada (shadowBlur), poucos caminhos por quadro; "reduzir movimento" acalma o balanço. */
(() => {
  const TINTA = '#1E1240', TAU = Math.PI * 2;
  const menos = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  // ---------- Sprites mínimo (só se o jogo ainda não tiver um) ----------
  if (typeof Sprites === 'undefined') {
    window.Sprites = (() => {
      const tabela = {};
      return {
        registrar(id, def) { tabela[id] = def; },
        def: id => tabela[id],
        lista: () => Object.keys(tabela),
        // pés em (x, y); tam = altura em px; o = { estado, vista, t, espelho }
        desenhar(ctx, id, x, y, tam, o = {}) {
          const d = tabela[id];
          if (!d) return;
          const k = tam ? tam * (d.escala || 1) / d.h : 1;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(o.espelho ? -k : k, k);
          d.desenhar(ctx, { ...o, estado: o.estado || 'idle', vista: o.vista || 'frente', t: o.t != null ? o.t : performance.now() / 1000 });
          ctx.restore();
        }
      };
    })();
  }

  // ---------- pincéis: preenche e contorna com a tinta escura ----------
  function pinta(g, cor, linha = 3) {
    if (cor) { g.fillStyle = cor; g.fill(); }
    if (linha) { g.lineWidth = linha; g.strokeStyle = TINTA; g.stroke(); }
  }
  function elipse(g, x, y, rx, ry, cor, linha = 3, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); pinta(g, cor, linha); }
  const bola = (g, x, y, r, cor, linha = 3) => elipse(g, x, y, r, r, cor, linha);
  function caixa(g, x, y, w, h, r, cor, linha = 3) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    pinta(g, cor, linha);
  }
  function poligono(g, pts, cor, linha = 3) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); pinta(g, cor, linha); }
  function traco(g, cor, lw, fn) { g.beginPath(); fn(); g.lineWidth = lw; g.strokeStyle = cor; g.stroke(); }
  function reflexo(g, x, y, rx, ry, a = .55) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, -.6, 0, TAU); g.fill(); }
  function aura(g, x, y, r, cor) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function sombra(g, rx) { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 0, rx, rx * .26, 0, 0, TAU); g.fill(); }
  function corar(g, x, y, r = 4) { g.fillStyle = 'rgba(255,110,150,.42)'; g.beginPath(); g.ellipse(x, y, r, r * .62, 0, 0, TAU); g.fill(); }
  function estrela(g, x, y, r, cor = '#FFE58A') {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
    g.fillStyle = cor; g.fill();
  }
  function gota(g, x, y, r, cor) { g.beginPath(); g.moveTo(x, y - r * 1.7); g.quadraticCurveTo(x + r, y - r * .4, x + r, y); g.arc(x, y, r, 0, Math.PI); g.quadraticCurveTo(x - r, y - r * .4, x, y - r * 1.7); pinta(g, cor, 1.6); }
  // pena do topete, folha do chapéu: gota alongada girada
  function folha(g, x, y, ang, comp, cor, linha = 2.2, nervura) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(comp * .55, -comp * .45, 0, -comp); g.quadraticCurveTo(-comp * .55, -comp * .45, 0, 0); pinta(g, cor, linha);
    if (nervura) traco(g, nervura, 1, () => { g.moveTo(0, -1.5); g.lineTo(0, -comp * .78); });
    g.restore();
  }
  // braço: 0 = pendurado; positivo abre para a esquerda, negativo para a direita
  function braco(g, x, y, ang, comp, cor, mao, manga) {
    g.save(); g.translate(x, y); g.rotate(ang);
    caixa(g, -3.8, -2, 7.6, comp + 2, 3.8, cor, 2.4);
    if (manga) elipse(g, 0, 1.5, 5.6, 4.6, manga, 2.2);
    bola(g, 0, comp, 4.6, mao, 2.4);
    g.restore();
  }
  // olho grande com dois brilhos; feliz = arco fechado; piscando = traço
  function olho(g, o, x, y, r, mira = 0) {
    if (o.feliz) { traco(g, TINTA, Math.max(2.2, r * .34), () => g.arc(x, y + r * .4, r * .72, Math.PI * 1.15, Math.PI * 1.85)); return; }
    if (o.pisca) { traco(g, TINTA, 2.4, () => { g.moveTo(x - r * .75, y + r * .1); g.quadraticCurveTo(x, y + r * .45, x + r * .75, y + r * .1); }); return; }
    bola(g, x, y, r, '#fff', Math.max(1.6, r * .32));
    bola(g, x + mira + r * .1, y + r * .08, r * .58, TINTA, 0);
    bola(g, x + mira - r * .12, y - r * .22, r * .23, '#fff', 0);
    bola(g, x + mira + r * .3, y + r * .3, r * .1, '#fff', 0);
  }
  // par de olhos: de frente lado a lado; de lado, o de trás menor perto da borda
  function olhos(g, o, x, y, r, dist) {
    if (o.lado) { olho(g, o, x + dist * 1.05, y, r * .62, r * .2); olho(g, o, x + dist * .2, y, r, r * .22); }
    else { olho(g, o, x - dist / 2, y, r); olho(g, o, x + dist / 2, y, r); }
  }
  // boca: falando abre e fecha; feliz sorri aberta; parada sorri de leve
  function boca(g, o, x, y, w) {
    if (o.falando) {
      const a = .2 + .8 * Math.abs(Math.sin(o.t * 11));
      elipse(g, x, y + 1, w * .42, 1.2 + w * .34 * a, '#6B1E3A', 2.2);
      if (a > .5) elipse(g, x, y + 1 + w * .18 * a, w * .22, w * .09 * a, '#FF7A9A', 0);
    } else if (o.feliz) {
      g.beginPath(); g.moveTo(x - w * .55, y - 1); g.quadraticCurveTo(x, y + w * .9, x + w * .55, y - 1); g.closePath(); pinta(g, '#6B1E3A', 2.2);
      elipse(g, x, y + w * .38, w * .22, w * .11, '#FF7A9A', 0);
    } else traco(g, TINTA, 2.3, () => { g.moveTo(x - w * .4, y); g.quadraticCurveTo(x, y + w * .32, x + w * .4, y); });
  }
  function lente(g, x, y, r, aro) {
    bola(g, x, y, r, 'rgba(190,230,255,.22)', 5);
    traco(g, aro, 2.6, () => g.arc(x, y, r, 0, TAU));
    reflexo(g, x - r * .42, y - r * .45, r * .3, r * .15, .75);
  }
  // brilhinhos em volta da cabeça no estado feliz
  function festa(g, o, cy, larg) {
    if (!o.feliz) return;
    for (let k = 0; k < 3; k++) {
      const f = (o.t * 1.2 + k / 3) % 1, a = -2.5 + k * 1.25;
      estrela(g, Math.cos(a) * larg, cy + Math.sin(a) * larg * .7 - f * 6, 1.5 + 3 * Math.sin(f * Math.PI));
    }
  }
  // + − × ÷ com traços
  function simbolo(g, k, x, y, s, cor) {
    g.beginPath();
    if (k % 4 === 0) { g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); }
    else if (k % 4 === 1) { g.moveTo(x - s, y); g.lineTo(x + s, y); }
    else if (k % 4 === 2) { g.moveTo(x - s * .75, y - s * .75); g.lineTo(x + s * .75, y + s * .75); g.moveTo(x + s * .75, y - s * .75); g.lineTo(x - s * .75, y + s * .75); }
    else { g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x + .1, y - s * .7); g.arc(x, y - s * .7, .1, 0, TAU); g.moveTo(x + .1, y + s * .7); g.arc(x, y + s * .7, .1, 0, TAU); }
    g.lineWidth = Math.max(1.6, s * .5); g.strokeStyle = cor; g.stroke();
  }
  // tempo → respiração, pulinho, piscada
  function contexto(p, semente) {
    const t = +p.t || 0, est = p.estado || 'idle', mov = menos && menos.matches ? 0 : 1;
    return {
      t, est, mov, lado: p.vista === 'lado', falando: est === 'falando', feliz: est === 'feliz',
      respira: Math.sin(t * 2.2 + semente) * 1.3 * mov,
      pulo: est === 'feliz' ? Math.abs(Math.sin(t * 5.5)) * 5 * mov : 0,
      pisca: est !== 'feliz' && (t + semente * 1.7) % 3.7 < .12
    };
  }

  // ---------- Zé Atrapalhado: criaturinha amarela, óculos tortos, macacão remendado e bolsa ----------
  const ZE = { pele: '#FFD23F', macacao: '#3E7BD6', camisa: '#FFE6D2', bolsa: '#8A5A32', bolsaE: '#6B4226', aro: '#7A4A24', bota: '#6B4226', remendo: '#E9B04A' };
  function ze(g, o) {
    const C = ZE, L = o.lado, errando = o.est === 'errando', mexe = Math.max(o.mov, .35);
    sombra(g, 20);
    g.save();
    g.translate(0, -o.pulo);
    elipse(g, L ? -4 : -9, -4, 7.5, 4.5, C.bota);
    elipse(g, L ? 7 : 9, -4, 7.5, 4.5, C.bota);
    if (L) braco(g, -4, -31, .5, 13, C.pele, C.pele, C.camisa);
    elipse(g, 0, -21, L ? 14 : 17, 15, C.camisa);
    caixa(g, L ? -12 : -14, -29, L ? 24 : 28, 21, 8, C.macacao);
    caixa(g, L ? -6 : -8, -35, L ? 13 : 16, 9, 3, C.macacao, 2.4);
    bola(g, L ? 3 : -4, -31, 2, '#F2C14E', 1.4);
    caixa(g, L ? -10 : 3, -23, 9, 8, 1.5, C.remendo, 1.8);
    traco(g, C.bolsaE, 1.1, () => { const rx = L ? -10 : 3; for (let k = 0; k < 3; k++) { g.moveTo(rx + 2 + k * 2.6, -24.5); g.lineTo(rx + 2 + k * 2.6, -22.5); } });
    traco(g, C.bolsaE, 3, () => { g.moveTo(L ? 5 : 11, -35); g.lineTo(L ? -8 : -13, -18); });
    caixa(g, L ? -15 : -24, -20, 13, 11, 3, C.bolsa, 2.2);
    caixa(g, L ? -15 : -24, -20, 13, 5, 2, C.bolsaE, 1.8);
    // braços: feliz para cima; errando coça a cabeça; falando gesticula
    const dir = o.feliz ? -2.2 : errando ? -2.9 : o.falando ? -1 + Math.sin(o.t * 6) * .25 * mexe : -.35;
    const bracoDir = () => braco(g, L ? 6 : 16, -30, dir, 13, C.pele, C.pele, C.camisa);
    if (!L) braco(g, -16, -30, o.feliz ? 2.2 : .35, 13, C.pele, C.pele, C.camisa);
    if (!errando) bracoDir();
    // cabeça: balança no "errando"
    g.save();
    g.translate(L ? 2 : 0, -56 + o.respira);
    if (errando) g.rotate(Math.sin(o.t * 13) * .22 * mexe);
    folha(g, -4, -20, -.5, 11, C.pele, 2.4);
    folha(g, 1, -21, .05, 14, C.pele, 2.4);
    folha(g, 6, -20, .55, 10, C.pele, 2.4);
    elipse(g, 0, 0, 25, 23, C.pele);
    reflexo(g, -11, -12, 7, 3.5, .45);
    const mira = errando ? Math.sin(o.t * 13) * 1.5 : 0;
    if (L) {
      corar(g, 13, 10, 3.6);
      olho(g, o, 24, -1, 4.2, 1); lente(g, 25, -1, 6.5, C.aro);
      olho(g, o, 11, 0, 7, 1.5); lente(g, 11, 0, 10.5, C.aro);
      traco(g, C.aro, 3, () => { g.moveTo(.5, 0); g.lineTo(-14, -3); });
      if (errando) elipse(g, 19, 13, 2.8, 3.6, '#6B1E3A', 2); else boca(g, o, 18, 12, 7);
    } else {
      corar(g, -15, 10); corar(g, 17, 9);
      g.save(); g.rotate(-.1); // óculos tortos
      olho(g, o, -10, 0, 6.5, mira); olho(g, o, 11, -1, 7.6, mira);
      lente(g, -10, 0, 10, C.aro); lente(g, 11, -1, 11.5, C.aro);
      traco(g, C.aro, 3, () => { g.moveTo(-20, 1); g.lineTo(-29, 7); });
      g.restore();
      if (errando) elipse(g, 2, 13, 3.4, 4.4, '#6B1E3A', 2); else boca(g, o, 2, 12, 9);
    }
    g.restore();
    if (errando) { // mão na cabeça, espiral de tontura e gota de suor
      bracoDir();
      traco(g, '#FF6B8A', 2, () => { for (let k = 0; k < 16; k++) { const a = k * .75 + o.t * 6 * mexe, r = 1 + k * .45, px = 16 + Math.cos(a) * r, py = -89 + Math.sin(a) * r * .7; if (k) g.lineTo(px, py); else g.moveTo(px, py); } });
      gota(g, -24, -66 + ((o.t * 1.5) % 1) * 6 * mexe, 2.6, '#8FD8FF');
    }
    festa(g, o, -60, 34);
    g.restore();
  }

  // ---------- Seu Troco: mercador encapuzado de manto laranja escuro, com o carrinho cheio ----------
  const TROCO = { capuz: '#C8641F', capuzC: '#E8873A', rosto: '#3B2416', bigode: '#F5E6C8', luva: '#4A2E1E', roupa: '#3A2A3E', cinto: '#5A3A22', ouro: '#F2C14E', madeira: '#8A5A32', madeiraE: '#6B4226', toldoA: '#E8833A', toldoB: '#F5E6C8', saco: '#D9B98A' };
  function garrafa(g, x, y, cor) {
    caixa(g, x - 2, y - 13, 4, 6, 1, '#C9D3E8', 1.6);
    bola(g, x, y - 4, 5.5, cor, 2.2);
    reflexo(g, x - 2, y - 6, 1.6, 1, .8);
  }
  function saco(g, x, y, r) {
    folha(g, x, y - r * .7, 0, r * .55, TROCO.saco, 1.6);
    elipse(g, x, y, r, r * .85, TROCO.saco, 2.2);
    traco(g, TINTA, 1.6, () => { g.moveTo(x - r * .35, y - r * .72); g.lineTo(x + r * .35, y - r * .72); });
  }
  function carrinho(g, x, o) {
    const C = TROCO, luz = .5 + .5 * Math.sin(o.t * 3);
    const postes = () => { g.moveTo(x + 4, -34); g.lineTo(x + 4, -66); g.moveTo(x + 58, -34); g.lineTo(x + 58, -66); };
    traco(g, TINTA, 5, postes);
    traco(g, C.madeira, 2.6, postes);
    for (let k = 0; k < 6; k++) { // toldo listrado com bordas redondas
      const sx = x - 2 + k * 11;
      g.beginPath(); g.moveTo(sx, -73); g.lineTo(sx + 11, -73); g.lineTo(sx + 11, -64); g.arc(sx + 5.5, -64, 5.5, 0, Math.PI); g.closePath();
      pinta(g, k % 2 ? C.toldoB : C.toldoA, 2);
    }
    saco(g, x + 10, -41, 7);
    garrafa(g, x + 23, -36, '#3BA8FF');
    garrafa(g, x + 33, -38, '#A96BFF');
    garrafa(g, x + 43, -36, '#5CD65C');
    saco(g, x + 54, -40, 6);
    caixa(g, x, -36, 62, 22, 4, C.madeira);
    traco(g, C.madeiraE, 2, () => { g.moveTo(x + 4, -25); g.lineTo(x + 58, -25); });
    aura(g, x + 62, -57, 12 + luz * 4, `rgba(255,200,90,${.35 + .2 * luz})`);
    traco(g, TINTA, 1.6, () => { g.moveTo(x + 58, -65); g.lineTo(x + 62, -62); });
    caixa(g, x + 58.5, -62, 7, 9, 2, '#FFD27A', 2);
    bola(g, x + 46, -12, 12, C.madeira);
    traco(g, C.madeiraE, 2, () => { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4, c = Math.cos(a) * 10, s = Math.sin(a) * 10; g.moveTo(x + 46 + c, -12 + s); g.lineTo(x + 46 - c, -12 - s); } });
    bola(g, x + 46, -12, 3, C.madeiraE, 1.8);
  }
  function troco(g, o) {
    const C = TROCO, L = o.lado, mexe = Math.max(o.mov, .3);
    sombra(g, 46);
    carrinho(g, 2, o);
    g.save();
    g.translate(-28, -o.pulo);
    elipse(g, -7, -3, 7, 4, C.rosto); elipse(g, 7, -3, 7, 4, C.rosto);
    g.beginPath(); g.moveTo(-9, -50); g.quadraticCurveTo(-25, -30, -22, -6); g.quadraticCurveTo(0, -1, 22, -6); g.quadraticCurveTo(25, -30, 9, -50); g.closePath(); pinta(g, C.capuz);
    poligono(g, [L ? -2 : -6, -44, L ? -4 : -9, -7, L ? 12 : 9, -7, L ? 8 : 6, -44], C.roupa, 2.4);
    caixa(g, -11, -24, 22, 5, 2, C.cinto, 2);
    const mx = L ? 4 : 0;
    bola(g, mx, -41, 4, C.ouro, 2); reflexo(g, mx - 1.2, -42.5, 1.4, .8, .8);
    caixa(g, -17, -23, 11, 10, 3, C.madeira, 2.2);
    if (o.feliz) { bola(g, -19, -46, 5, C.luva, 2.4); bola(g, 19, -46, 5, C.luva, 2.4); }
    else if (o.falando) { bola(g, -6, -30, 5, C.luva, 2.4); bola(g, 18, -42 + Math.sin(o.t * 6) * 3 * mexe, 5, C.luva, 2.4); }
    else { bola(g, -5, -30, 5, C.luva, 2.4); bola(g, 5, -30, 5, C.luva, 2.4); }
    // capuz com ponta e rosto escuro com bigodão
    g.save();
    g.translate(L ? 2 : 0, -58 + o.respira);
    g.beginPath(); g.moveTo(-23, 9); g.quadraticCurveTo(-29, -14, -9, -25); g.quadraticCurveTo(6, -33, 15, -41); g.quadraticCurveTo(13, -27, 21, -15); g.quadraticCurveTo(29, 0, 22, 10); g.quadraticCurveTo(0, 16, -23, 9); g.closePath(); pinta(g, C.capuz);
    traco(g, C.capuzC, 2.5, () => { g.moveTo(-18, -12); g.quadraticCurveTo(-10, -22, 2, -24); });
    const fx = L ? 6 : 0, bx = fx + (L ? 3 : 0);
    elipse(g, fx, 1, L ? 13 : 16, 13.5, C.rosto, 2.4);
    olhos(g, o, fx, -3, 5.6, 12);
    boca(g, o, bx, 10, 7);
    elipse(g, bx - 5, 6, 7, 3.8, C.bigode, 2.2, .3);
    elipse(g, bx + 5, 6, 7, 3.8, C.bigode, 2.2, -.3);
    g.restore();
    festa(g, o, -62, 30);
    g.restore();
  }

  // ---------- Ancião das Cartas: sábio pequeno, barba comprida com números, livro que brilha ----------
  const ANCIAO = { manto: '#5B2E9E', mantoE: '#3A1B6E', ouro: '#F2C14E', rosto: '#4DA3FF', barba: '#F5EFE0', livro: '#7A3E1E', pagina: '#FFF4C8', aro: '#C98A2E' };
  function anciao(g, o) {
    const C = ANCIAO, L = o.lado, luz = .5 + .5 * Math.sin(o.t * 3);
    sombra(g, 18);
    g.save();
    g.translate(0, -o.pulo);
    elipse(g, -6, -3, 6, 3.5, '#3B2416'); elipse(g, 6, -3, 6, 3.5, '#3B2416');
    g.beginPath(); g.moveTo(-10, -44); g.quadraticCurveTo(-22, -24, -20, -5); g.quadraticCurveTo(0, 0, 20, -5); g.quadraticCurveTo(22, -24, 10, -44); g.closePath(); pinta(g, C.manto);
    traco(g, C.ouro, 2.2, () => { g.moveTo(-18, -8); g.quadraticCurveTo(0, -3, 18, -8); });
    // barba comprida com números
    const bx = L ? 5 : 0;
    g.beginPath(); g.moveTo(bx - 11, -49); g.quadraticCurveTo(bx - 15, -32, bx - 3, -18); g.quadraticCurveTo(bx, -15, bx + 3, -18); g.quadraticCurveTo(bx + 15, -32, bx + 11, -49); g.closePath(); pinta(g, C.barba, 2.6);
    g.fillStyle = '#8F98C4'; g.font = '900 6px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('1', bx - 5, -41); g.fillText('2', bx + 4, -38); g.fillText('3', bx - 1, -33);
    // livro aberto que brilha
    const lx = L ? 8 : 0;
    aura(g, lx, -25, 22 + luz * 6 * o.mov, `rgba(255,214,90,${.3 + .2 * luz})`);
    caixa(g, lx - 15, -31, 30, 15, 3, C.livro, 2.6);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(lx, -29.5); g.quadraticCurveTo(lx + 7 * s, -32.5, lx + 13 * s, -29.5); g.lineTo(lx + 13 * s, -18); g.quadraticCurveTo(lx + 7 * s, -21, lx, -18); g.closePath(); pinta(g, C.pagina, 1.8); }
    simbolo(g, 0, lx - 6.5, -24.5, 2.6, '#E8A33A');
    simbolo(g, 2, lx + 6.5, -24.5, 2.6, '#E8A33A');
    bola(g, lx - 15, -24, 4, C.rosto, 2.2); bola(g, lx + 15, -24, 4, C.rosto, 2.2);
    if (o.falando || o.feliz) for (let k = 0; k < 3; k++) { // sinais saem do livro e somem
      const f = (o.t * .8 + k / 3) % 1;
      g.globalAlpha = 1 - f;
      simbolo(g, k, lx + (k - 1) * 9, -34 - f * 22, 3, '#FFD95A');
      g.globalAlpha = 1;
    }
    // cabeça no capuz com joia
    g.save();
    g.translate(L ? 2 : 0, -58 + o.respira);
    g.beginPath(); g.moveTo(-20, 9); g.quadraticCurveTo(-25, -13, -6, -24); g.quadraticCurveTo(0, -28, 6, -24); g.quadraticCurveTo(25, -13, 20, 9); g.closePath(); pinta(g, C.manto);
    const fx = L ? 5 : 0;
    elipse(g, fx, 1, 15, 13, C.ouro, 2.4);
    elipse(g, fx, 1.5, 12.5, 11, C.rosto, 0);
    poligono(g, [fx, -22, fx + 5, -16, fx, -10, fx - 5, -16], C.ouro, 2);
    poligono(g, [fx, -19, fx + 2.5, -16, fx, -13, fx - 2.5, -16], C.mantoE, 0);
    olhos(g, o, fx, -1, 4.4, 10);
    if (L) lente(g, fx + 2, -1, 6, C.aro); else { lente(g, fx - 5, -1, 6, C.aro); lente(g, fx + 5, -1, 6, C.aro); }
    elipse(g, fx - 5, -8.5, 3.5, 1.6, C.barba, 1.4); elipse(g, fx + 5, -8.5, 3.5, 1.6, C.barba, 1.4);
    boca(g, o, fx, 9, 5);
    elipse(g, fx - 4, 7, 5, 2.6, C.barba, 1.8, .25); elipse(g, fx + 4, 7, 5, 2.6, C.barba, 1.8, -.25);
    g.restore();
    festa(g, o, -60, 28);
    g.restore();
  }

  // ---------- Seu Broto: jardineiro grande e gentil, chapéu de palha com folhas e regador ----------
  const BROTO = { chapeu: '#D9A04A', chapeuE: '#B07A2E', folha: '#5CB85C', pele: '#F2B48C', nariz: '#E07A5F', barba: '#F5EFE0', camisa: '#3F9D4A', avental: '#2E6B3A', luva: '#6B3E22', bota: '#F2B92C', regador: '#7D8FB8' };
  function regador(g, x, y) {
    const C = BROTO, alca = () => g.arc(x - 1, y - 9, 7, Math.PI, 0);
    poligono(g, [x + 7, y - 2, x + 22, y - 14, x + 25, y - 10, x + 9, y + 3], C.regador, 2.4);
    elipse(g, x + 24, y - 13, 3, 4.5, '#9AACCE', 2, -.7);
    traco(g, TINTA, 5, alca);
    traco(g, C.regador, 2.6, alca);
    caixa(g, x - 11, y - 10, 20, 18, 5, C.regador, 2.6);
    folha(g, x - 1, y + 4, 0, 8, '#8FD88F', 1.4);
    reflexo(g, x - 6, y - 5, 2.2, 3.5, .45);
  }
  function broto(g, o) {
    const C = BROTO, L = o.lado, mexe = Math.max(o.mov, .3);
    sombra(g, 30);
    g.save();
    g.translate(0, -o.pulo);
    caixa(g, L ? -14 : -20, -12, 15, 12, 5, C.bota);
    caixa(g, L ? 2 : 5, -12, 15, 12, 5, C.bota);
    const acena = o.feliz ? 2.4 : o.falando ? .9 + Math.sin(o.t * 5) * .25 * mexe : .25;
    if (!L) braco(g, -27, -52, acena, 21, C.camisa, C.luva);
    elipse(g, 0, -40, L ? 25 : 30, 29, C.camisa);
    caixa(g, L ? -14 : -18, -50, L ? 28 : 36, 38, 10, C.avental, 2.6);
    traco(g, C.avental, 4, () => { g.moveTo(-13, -50); g.lineTo(-17, -63); g.moveTo(13, -50); g.lineTo(17, -63); });
    caixa(g, L ? -4 : -8, -36, 16, 12, 3, '#3F7F45', 2);
    folha(g, L ? 4 : 0, -27, 0, 8, '#8FD88F', 1.4);
    regador(g, L ? 26 : 36, -28);
    braco(g, L ? 10 : 27, -52, L ? -.55 : -.45, 21, C.camisa, C.luva);
    // cabeça: barba branca, nariz redondo, chapéu de palha com folhas
    g.save();
    g.translate(L ? 3 : 0, -78 + o.respira);
    const fx = L ? 5 : 0, nx = fx + (L ? 4 : 0);
    elipse(g, fx, 0, 19, 18, C.pele);
    g.beginPath(); g.moveTo(fx - 17, 2); g.quadraticCurveTo(fx - 21, 23, fx, 27); g.quadraticCurveTo(fx + 21, 23, fx + 17, 2); g.quadraticCurveTo(fx, 9, fx - 17, 2); g.closePath(); pinta(g, C.barba);
    corar(g, fx - 11, 5, 4.2); corar(g, fx + 11, 5, 4.2);
    olhos(g, o, fx, -2, 5.4, 14);
    elipse(g, fx - 7, -9.5, 5, 2.2, C.barba, 1.6, -.15); elipse(g, fx + 7, -9.5, 5, 2.2, C.barba, 1.6, .15);
    boca(g, o, fx, 14, 8);
    elipse(g, fx - 6, 10, 7.5, 4, C.barba, 2.2, .3); elipse(g, fx + 6, 10, 7.5, 4, C.barba, 2.2, -.3);
    elipse(g, nx, 5, 5.5, 4.5, C.nariz, 2.2); reflexo(g, nx - 1.8, 3.4, 1.6, .9, .7);
    folha(g, fx - 7, -33, -.6, 11, C.folha, 2, '#2E6B3A');
    folha(g, fx + 3, -35, .3, 13, C.folha, 2, '#2E6B3A');
    folha(g, fx + 12, -31, 1, 9, C.folha, 2, '#2E6B3A');
    elipse(g, fx, -18, 31, 7, C.chapeu);
    caixa(g, fx - 14, -35, 28, 19, 10, C.chapeu);
    caixa(g, fx - 14, -21, 28, 4.5, 1.5, C.chapeuE, 2);
    traco(g, C.chapeuE, 1.2, () => { for (let k = -2; k <= 2; k++) { g.moveTo(fx + k * 5, -33); g.lineTo(fx + k * 5.5, -22); } });
    g.restore();
    if (o.feliz) { // florzinha que aparece ao lado do chapéu
      for (let k = 0; k < 5; k++) bola(g, 30 + Math.cos(k * 1.26) * 3.5, -100 + Math.sin(k * 1.26) * 3.5, 2.8, '#FFC9DE', 1.2);
      bola(g, 30, -100, 2.2, '#FFD95A', 1.2);
    }
    festa(g, o, -82, 36);
    g.restore();
  }

  // ---------- Fagulha: vagalume que pulsa luz e deixa rastro de brilho ----------
  function fagulha(g, o) {
    const L = o.lado, pulso = .5 + .5 * Math.sin(o.t * 4), cy = -36 + Math.sin(o.t * 3) * 3 * o.mov - o.pulo, fx = L ? 5 : 0, ax = L ? -8 : 0;
    g.fillStyle = `rgba(255,240,140,${.1 + .1 * pulso})`; g.beginPath(); g.ellipse(0, 0, 10, 3, 0, 0, TAU); g.fill();
    for (let k = 1; k <= 6; k++) { // rastro que fica para trás e some
      const f = k / 6;
      g.globalAlpha = (1 - f) * .85;
      estrela(g, (L ? -7 : -3) * k, cy + 8 + Math.sin(o.t * 4 - k * .8) * 3 + (L ? 0 : k * 2.2), 1 + 3.2 * (1 - f), '#FFF3A0');
    }
    g.globalAlpha = 1;
    aura(g, ax, cy + 8, 16 + pulso * 10, `rgba(255,236,120,${.3 + .25 * pulso})`);
    g.save();
    g.translate(0, cy);
    const bate = .55 + .45 * Math.abs(Math.sin(o.t * 26 * Math.max(o.mov, .2)));
    elipse(g, -7, -9, 5.5, 9 * bate, 'rgba(215,238,255,.65)', 1.6, -.5);
    elipse(g, 7, -9, 5.5, 9 * bate, 'rgba(215,238,255,.65)', 1.6, .5);
    elipse(g, ax, 8, 7, 8, `rgb(255,${222 + Math.round(30 * pulso)},${90 + Math.round(60 * pulso)})`, 2.4, L ? .9 : 0);
    reflexo(g, ax - 2, 5, 2, 3, .6);
    elipse(g, 0, 0, 7, 6, '#4A3A78', 2.4);
    traco(g, TINTA, 1.8, () => { g.moveTo(fx - 3, -16); g.quadraticCurveTo(fx - 6, -24, fx - 9, -25); g.moveTo(fx + 3, -16); g.quadraticCurveTo(fx + 6, -24, fx + 9, -25); });
    bola(g, fx - 9, -25, 2.2, '#FFE066', 1.4); bola(g, fx + 9, -25, 2.2, '#FFE066', 1.4);
    bola(g, fx, -9, 9, '#5B4A94', 2.6);
    reflexo(g, fx - 4, -13, 2.6, 1.5, .5);
    olhos(g, o, fx, -9, 3.6, 7);
    boca(g, o, fx + (L ? 2 : 0), -3.5, 4);
    g.restore();
    festa(g, o, cy - 6, 18);
  }

  // ---------- Construtor: ajudante de capacete, cinto de ferramentas e martelo ----------
  const CONSTRUTOR = { pele: '#F5C9A0', cabelo: '#6B3E22', capacete: '#F5B82E', capaceteE: '#D98F1A', placa: '#9AA3B5', camisa: '#F2F2F2', macacao: '#3E6FC2', cinto: '#8A5A32', bolso: '#A0703A', luva: '#E8862A', bota: '#6B3E22', cabo: '#8A5A32', ferro: '#A9B2C6' };
  function construtor(g, o) {
    const C = CONSTRUTOR, L = o.lado, mart = o.est === 'martelando', ombro = L ? 5 : 16;
    const fase = (o.t * 1.6) % 1, bate = mart && fase > .88;
    // martelando: sobe devagar e desce rápido
    const ang = mart ? (fase < .65 ? -.4 - (fase / .65) * 2.3 : -2.7 + ((fase - .65) / .35) * 2.5)
      : o.feliz ? -2.3 : o.falando ? -.55 + Math.sin(o.t * 5) * .15 * Math.max(o.mov, .3) : -.5;
    sombra(g, 20);
    g.save();
    g.translate(0, -o.pulo);
    elipse(g, L ? -4 : -8, -4, 8, 5, C.bota); elipse(g, L ? 7 : 8, -4, 8, 5, C.bota);
    caixa(g, L ? -11 : -13, -22, L ? 22 : 26, 18, 6, C.macacao);
    caixa(g, L ? -11 : -14, -40, L ? 22 : 28, 22, 8, C.camisa);
    caixa(g, L ? -7 : -10, -38, L ? 15 : 20, 19, 4, C.macacao, 2.4);
    caixa(g, -15, -23, 30, 6, 2, C.cinto, 2.2);
    caixa(g, L ? -14 : -13, -20, 7, 8, 2, C.bolso, 2);
    caixa(g, 6, -20, 7, 8, 2, C.bolso, 2);
    caixa(g, -2.5, -22.5, 5, 5, 1, '#F2C14E', 1.6);
    traco(g, TINTA, 3.4, () => { g.moveTo(-10, -21); g.lineTo(-10, -27); });
    traco(g, C.ferro, 1.8, () => { g.moveTo(-10, -21); g.lineTo(-10, -27); });
    if (!L) braco(g, -16, -37, o.feliz ? 2.3 : .35, 13, C.pele, C.luva, C.camisa);
    // braço da frente com o martelo (giram juntos)
    g.save();
    g.translate(ombro, -37);
    g.rotate(ang);
    caixa(g, -1.8, 10, 3.6, 25, 1.5, C.cabo, 1.8);
    caixa(g, -9, 31, 18, 9, 2.5, C.ferro, 2.4);
    reflexo(g, -4, 33.5, 3, 1.2, .6);
    caixa(g, -3.8, -2, 7.6, 15, 3.8, C.pele, 2.4);
    elipse(g, 0, 1.5, 5.6, 4.6, C.camisa, 2.2);
    bola(g, 0, 13, 5, C.luva, 2.4);
    g.restore();
    if (bate) { // faíscas onde o martelo bate
      const px = ombro - Math.sin(ang) * 36, py = -37 + Math.cos(ang) * 36;
      traco(g, '#FFD95A', 2, () => { for (let k = 0; k < 6; k++) { const a = -Math.PI + k * Math.PI / 5; g.moveTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5); g.lineTo(px + Math.cos(a) * 11, py + Math.sin(a) * 11); } });
      estrela(g, px, py - 2, 5, '#FFF3A0');
    }
    // cabeça com capacete
    g.save();
    g.translate(L ? 2 : 0, -56 + o.respira);
    const fx = L ? 4 : 0;
    bola(g, L ? 0 : fx, 0, 17, C.cabelo);
    elipse(g, fx, 3, 15.5, 14.5, C.pele);
    bola(g, fx - 14, 4, 4.5, C.cabelo, 2);
    if (!L) bola(g, fx + 14, 4, 4.5, C.cabelo, 2);
    corar(g, fx - 9, 10, 3.6); corar(g, fx + 9, 10, 3.6);
    if (mart && fase > .55) traco(g, TINTA, 2.4, () => { g.moveTo(fx - 9, 1); g.lineTo(fx - 4, 3.5); g.lineTo(fx - 9, 6); g.moveTo(fx + 9, 1); g.lineTo(fx + 4, 3.5); g.lineTo(fx + 9, 6); }); // força!
    else olhos(g, o, fx, 4, 5.4, 12);
    boca(g, o, fx + (L ? 3 : 0), 12, 7);
    elipse(g, fx, -7, 23, 4.6, C.capacete);
    g.beginPath(); g.ellipse(fx, -7, 18.5, 16, 0, Math.PI, 0); g.closePath(); pinta(g, C.capacete);
    traco(g, C.capaceteE, 2.2, () => { g.moveTo(fx, -22.5); g.lineTo(fx, -19.5); });
    poligono(g, [fx, -19.5, fx + 5.5, -14, fx, -8.5, fx - 5.5, -14], C.placa, 1.8);
    poligono(g, [fx, -17, fx + 2.6, -14, fx, -11, fx - 2.6, -14], '#FFD95A', 0);
    reflexo(g, fx - 9, -15, 4, 2, .5);
    g.restore();
    festa(g, o, -60, 30);
    g.restore();
  }

  // ---------- registro ----------
  const BASE = ['idle', 'falando', 'feliz'];
  const ALIADOS = {
    ze: { nome: 'Zé Atrapalhado', w: 76, h: 104, estados: [...BASE, 'errando'], desenho: ze, semente: .3 },
    seuTroco: { nome: 'Seu Troco', w: 136, h: 104, estados: BASE, desenho: troco, semente: 1.1 },
    anciao: { nome: 'Ancião das Cartas', w: 64, h: 92, estados: BASE, desenho: anciao, semente: 2.3 },
    seuBroto: { nome: 'Seu Broto', w: 100, h: 130, estados: BASE, desenho: broto, semente: 3.7 },
    fagulha: { nome: 'Fagulha', w: 56, h: 72, estados: BASE, desenho: fagulha, semente: 4.9 },
    construtor: { nome: 'Construtor', w: 100, h: 100, estados: [...BASE, 'martelando'], desenho: construtor, semente: 5.5 }
  };
  const ids = [];
  for (const [id, a] of Object.entries(ALIADOS)) {
    Sprites.registrar(id, {
      nome: a.nome, w: a.w, h: a.h, estados: a.estados, vistas: ['frente', 'lado'],
      desenhar(ctx, p, vista, t) {
        const o = contexto(p && typeof p === 'object' ? p : { estado: p, vista, t }, a.semente);
        if (!a.estados.includes(o.est)) { o.est = 'idle'; o.falando = o.feliz = false; o.pulo = 0; }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        a.desenho(ctx, o);
        ctx.restore();
      }
    });
    ids.push(id);
  }

  // Fagulha segue o personagem: chame a cada quadro com o mesmo objeto f = { x, y } (unidades do mundo);
  // ela flutua atrás e acima do alvo, em volta suave; f.espelho diz se deve virar para a esquerda
  window.Personagens = {
    ids,
    seguir(f, alvoX, alvoY, dt, t, dist = 14, altura = 26) {
      const k = 1 - Math.exp(-dt * 4), ox = -dist + Math.cos(t * 1.3) * dist * .7, oy = -altura + Math.sin(t * 2.1) * altura * .2;
      const nx = f.x + (alvoX + ox - f.x) * k;
      f.espelho = nx < f.x;
      f.x = nx;
      f.y += (alvoY + oy - f.y) * k;
      return f;
    }
  };
})();
