/* chefoes.js — os 3 chefões do Mohamed, desenhados só com Canvas 2D (sem imagens).
   Sprites.registrar(id, def); def.desenhar(ctx, p) com
   p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t, prog, fase: 1 | 2 | 3 }
   (aceita também desenhar(ctx, estado, vista, t, dir, fase)). Origem (0,0) entre os pés, desenhando para cima.
   Na batalha ocupam metade da tela (def.ocupa = 0.5). carregando e morrendo usam p.prog (0 → 1);
   sem prog, repetem sozinhos. */
(function () {
  'use strict';

  if (!window.Sprites) {
    const lista = {};
    window.Sprites = {
      lista,
      registrar(id, def) { lista[id] = def; return def; },
      tem: id => !!lista[id],
      desenhar(ctx, id, x, y, tam, o = {}) {
        const d = lista[id];
        if (!d) return false;
        const k = tam ? tam * (d.escala || 1) / d.h : 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        d.desenhar(ctx, { ...o, estado: o.estado || 'idle', vista: o.vista || 'batalha', t: o.t != null ? o.t : performance.now() / 1000 });
        ctx.restore();
        return true;
      }
    };
  }

  const TINTA = '#1E1240', TAU = Math.PI * 2, ESCALA = 2.6;
  const ESTADOS = ['idle', 'ataque1', 'ataque2', 'carregando', 'ferido', 'morrendo'];
  const DIRECAO = { baixo: 'baixo', frente: 'baixo', cima: 'cima', costas: 'cima', lado: 'lado', direita: 'lado', esquerda: 'lado' };
  const menos = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const lim = v => Math.max(0, Math.min(1, v)), mix = (a, b, k) => a + (b - a) * k;
  let esp = 1;

  /* ---------- ajudantes ---------- */
  function pinta(g, cor, linha = 3) {
    if (cor) { g.fillStyle = cor; g.fill(); }
    if (linha) { g.lineWidth = linha * esp; g.strokeStyle = TINTA; g.stroke(); }
  }
  function elipse(g, x, y, rx, ry, cor, linha = 3, rot = 0) {
    g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); pinta(g, cor, linha);
  }
  const bola = (g, x, y, r, cor, linha = 3) => elipse(g, x, y, r, r, cor, linha);
  function caixa(g, x, y, w, h, r, cor, linha = 3) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath(); pinta(g, cor, linha);
  }
  function poligono(g, p, cor, linha = 3) {
    g.beginPath(); g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath(); pinta(g, cor, linha);
  }
  function traco(g, cor, lw, fn) { g.beginPath(); fn(); g.lineWidth = lw * esp; g.strokeStyle = cor; g.stroke(); }
  function traco2(g, cor, lw, fn) { traco(g, TINTA, lw + 2.2, fn); traco(g, cor, lw, fn); }
  function reflexo(g, x, y, rx, ry, a = .5, rot = -.5) { g.save(); g.globalAlpha *= a; elipse(g, x, y, rx, ry, '#FFFFFF', 0, rot); g.restore(); }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function aura(g, x, y, r, cor, a = .5) {
    if (r <= 0 || a <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(cor, Math.min(1, a))); gr.addColorStop(1, rgba(cor, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  function estrela(g, x, y, r, cor, a = 1) {
    if (a <= 0 || r <= 0) return;
    g.save(); g.globalAlpha *= Math.min(1, a); g.beginPath();
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * .38 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    g.closePath(); g.fillStyle = cor; g.fill(); g.restore();
  }
  function rodamoinho(g, x, y, r, t, cor = TINTA) {
    traco(g, cor, 2.4, () => {
      for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU * 1.6 + t * 6, rr = r * i / 20; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x, y); }
    });
  }
  function racha(g, x, y, ang, len, cor) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (u, v) => [x + (u * c - v * s) * len, y + (u * s + v * c) * len];
    const caminho = () => {
      [[0, 0], [.3, .1], [.52, -.07], [.76, .08], [1, 0]].forEach(([u, v], i) => { const [px, py] = P(u, v); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      const [ax, ay] = P(.52, -.07), [bx, by] = P(.68, -.28); g.moveTo(ax, ay); g.lineTo(bx, by);
    };
    traco(g, TINTA, 3.4, caminho); traco(g, cor, 1.5, caminho);
  }
  function faiscas(g, o, x, y, r, cor, n = 5) {
    if (o.simples) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      const u = (o.t * .45 * o.mov + i / n) % 1, a = i * 2.4 + 1;
      estrela(g, x + Math.cos(a) * r * (.7 + u * .4), y + Math.sin(a) * r * .5 - u * r * .7, 2.6 + 2.4 * Math.sin(u * Math.PI), cor, Math.sin(u * Math.PI));
    }
  }
  function carregar(g, x, y, r, cor, o, cor2 = '#FFFFFF') {
    const k = o.carga;
    aura(g, x, y, r * (.7 + k * 1.6), cor, .3 + k * .6);
    aura(g, x, y, r * (.25 + k * .6), cor2, .35 + k * .6);
    const n = o.simples ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const u = (o.t * 1.3 * o.mov + i / n) % 1, a = i * TAU / n + o.t * .7 * o.mov, d = r * (.4 + 1.9 * (1 - u));
      estrela(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + 3 * u, cor2, u * (.4 + k));
    }
  }
  function olho(g, x, y, rx, ry, o, lado, k) {
    if (o.est === 'morrendo') { rodamoinho(g, x, y, Math.min(rx, ry) * .85, o.t * o.mov); return; }
    if (o.est === 'ferido') {
      const a = -lado;
      traco(g, TINTA, 3, () => { g.moveTo(x - a * rx * .6, y - ry * .55); g.lineTo(x + a * rx * .55, y); g.lineTo(x - a * rx * .6, y + ry * .55); });
      return;
    }
    if (o.pisca) { traco(g, TINTA, 2.8, () => { g.moveTo(x - rx, y); g.quadraticCurveTo(x, y + ry * .5, x + rx, y); }); return; }
    if (k.brilho) aura(g, x, y, Math.max(rx, ry) * (o.fase >= 2 ? 3 : 2.1) * (1 + o.carga * .4), k.brilho, o.fase >= 2 ? .85 : .5);
    elipse(g, x, y, rx, ry, k.esclera || '#FFFFFF', 2.6);
    const r = Math.min(rx, ry), px = x + o.fx * rx * .3, py = y + ry * .15;
    if (k.iris) bola(g, px, py, r * .62, k.iris, 0);
    if (k.pupila !== 0) bola(g, px, py, r * (k.pupila || .32), TINTA, 0);
    reflexo(g, px - r * .25, py - r * .3, r * .2, r * .17, .95, 0);
    const rv = k.raiva == null ? .45 : k.raiva;
    if (rv > 0) {
      const ix = x - lado * rx * 1.3, ox = x + lado * rx * 1.3, yi = y - ry + ry * rv * 2, yo = y - ry + ry * rv * .4;
      g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip();
      poligono(g, [ox, y - ry * 1.5, ix, y - ry * 1.5, ix, yi, ox, yo], k.pele, 0);
      g.restore();
      elipse(g, x, y, rx, ry, null, 2.6);
      traco(g, TINTA, 3.4, () => { g.moveTo(x + lado * rx * 1.1, yo - 1); g.lineTo(x - lado * rx * 1.15, yi - 1.2); });
    }
  }
  function chama(g, x, y, w, h, o, c1, c2, c3, sem = 0) {
    const ht = h * (1 + Math.sin(o.t * 10 + sem) * .12 * o.mov), bal = Math.sin(o.t * 7 + sem) * w * .35 * o.mov;
    const forma = k => {
      g.beginPath(); g.moveTo(x - w * k, y);
      g.quadraticCurveTo(x - w * k * 1.1, y - ht * k * .55, x + bal * k, y - ht * k);
      g.quadraticCurveTo(x + w * k * 1.1, y - ht * k * .55, x + w * k, y);
      g.quadraticCurveTo(x, y + w * k * .5, x - w * k, y); g.closePath();
    };
    forma(1); pinta(g, c1, 2.4);
    if (c2) { forma(.62); g.fillStyle = c2; g.fill(); }
    if (c3 && !o.simples) { forma(.32); g.fillStyle = c3; g.fill(); }
  }
  function digito(g, txt, x, y, tam, cor, brilho) {
    g.font = 'bold ' + Math.max(4, Math.round(tam)) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (brilho) { aura(g, x, y, tam * 1.3, brilho, .55); g.lineWidth = 2.2 * esp; g.strokeStyle = TINTA; g.strokeText(txt, x, y); }
    g.fillStyle = cor; g.fillText(txt, x, y);
  }
  function pedrinhas(g, o, n, r, cy, cor, brilho) {
    if (o.simples) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + o.t * .25 * o.mov, x = Math.cos(a) * r, y = cy + Math.sin(a) * r * .45 + Math.sin(o.t * 1.7 + i) * 4 * o.mov, k = 4 + (i % 3) * 2;
      if (brilho) aura(g, x, y, k * 2.2, brilho, .35);
      poligono(g, [x - k, y, x - k * .5, y - k * .8, x + k * .6, y - k * .7, x + k, y + k * .1, x + k * .4, y + k * .8, x - k * .6, y + k * .7], cor, 2.2);
    }
  }
  function ondas(g, o, C, forca) {
    for (let i = 0; i < 2; i++) {
      const u = o.mov ? (o.t * .8 + i * .5) % 1 : .3 + i * .4, r = 44 + u * 60, ry = r * .2;
      g.save(); g.globalAlpha *= (1 - u) * forca;
      traco(g, C.agua, 4, () => g.ellipse(0, 2, r, ry, 0, 0, TAU));
      traco(g, C.espuma, 1.6, () => g.ellipse(0, 1, r, ry, 0, 0, TAU));
      g.restore();
    }
  }
  function cores(o, base) {
    if (!o.flash) return base;
    const k = {};
    for (const n in base) k[n] = '#FFFFFF';
    return k;
  }
  function morrer(g, o, alt) {
    const p = o.prog, s = 1 - p * .5;
    g.translate(0, -alt * .45);
    g.rotate((Math.sin(p * 14) * .08 * (1 - p) + p * .25) * (o.mov || .3));
    g.scale(s, s);
    g.translate(0, alt * .45 + p * 6);
    g.globalAlpha *= 1 - lim((p - .5) / .5);
  }
  function fumaca(g, o, alt, cor) {
    const p = o.prog, a = Math.sin(p * Math.PI), base = g.globalAlpha;
    for (let i = 0; i < 7; i++) {
      const an = i / 7 * TAU + p * 2, d = 22 + p * 56;
      g.globalAlpha = base * .5 * a;
      bola(g, Math.cos(an) * d, -alt * .45 + Math.sin(an) * d * .6 - p * 22, 11 + p * 16, '#ECE6F7', 0);
    }
    g.globalAlpha = base;
    for (let i = 0; i < 6; i++) {
      const an = i * 1.3 + p * 4, d = 30 + p * 52;
      estrela(g, Math.cos(an) * d, -alt * .45 + Math.sin(an) * d * .7, 5 + 3 * Math.abs(Math.sin(p * 9 + i)), cor, 1 - p);
    }
  }
  const pose = c => c < .6 ? -.6 * Math.sin(c / .6 * Math.PI / 2) : c < .72 ? -.6 + (c - .6) / .12 * 1.6 : 1 - (c - .72) / .28;

  function contexto(p, semente) {
    const t = +p.t || 0, est = p.estado || 'idle', mov = menos && menos.matches ? 0 : 1, mapa = p.vista === 'mapa';
    const dir = mapa ? DIRECAO[p.dir] || 'baixo' : 'baixo', temProg = p.prog != null && !isNaN(+p.prog);
    const ciclo = (t * .95 + semente * .13) % 1;
    const carga = est === 'carregando' ? (temProg ? lim(+p.prog) : mov ? (t % 2.6) / 2.6 : .75) : 0;
    return {
      t, est, mov, simples: mapa, dir, fase: Math.max(1, Math.min(3, Math.round(+p.fase) || 1)),
      espelho: mapa && p.dir === 'esquerda', costas: dir === 'cima', fx: dir === 'lado' ? 1 : 0,
      prog: est === 'morrendo' ? lim(temProg ? +p.prog : (t % 1.8) / 1.5) : 0,
      carga, ciclo,
      golpe: est === 'ataque1' || est === 'ataque2' ? (mov ? pose(ciclo) : .75) : 0,
      voo: mov ? lim((ciclo - .6) / .4) : .5,
      respira: Math.sin(t * 1.8 + semente) * 1.8 * mov,
      flash: est === 'ferido' && mov > 0 && Math.floor(t * 14) % 2 === 0,
      treme: est === 'ferido' ? Math.sin(t * 60) * 3 * (mov || .4) : Math.sin(t * 50) * 1.6 * carga * mov,
      pisca: est === 'idle' && (t + semente) % 4.7 < .12
    };
  }

  /* ---------- 1. O Grande Contador (Mundo 1) ---------- */
  const CONTADOR = { pedra: '#5A5C8E', pedra2: '#3B3F6B', pedra3: '#8C8FB8', ouro: '#F5B841', numero: '#2E3158', energia: '#3BB54A', energia2: '#6BF57A', olho: '#C9FFD0' };

  function punho(g, x, y, s, e, C, num, txt, o) {
    g.save(); g.translate(x, y); g.scale(s * e, e);
    caixa(g, -17, -16, 34, 32, 11, C.pedra3);
    traco(g, C.pedra2, 2, () => { for (const k of [-7, 1, 9]) { g.moveTo(k, -15); g.lineTo(k, -8); } });
    caixa(g, -18, 7, 36, 7, 3, C.ouro, 2.2);
    reflexo(g, -9, -9, 5, 3, .35);
    g.restore();
    if (!o.simples) num(txt, x, y - e, 11 * e);
  }
  function coroaSigma(g, x, y, C, o) {
    const f = o.fase;
    g.save(); g.translate(x, y); if (f === 3) g.rotate(-.1);
    if (f >= 2) aura(g, 0, -14, 32, C.energia2, f === 3 ? .55 : .3);
    poligono(g, [-22, 0, -25, -20, -15, -12, -10, -24, -5, -16, 0, -34, 5, -16, 10, -24, 15, -12, 25, -20, 22, 0], C.ouro);
    traco(g, TINTA, 1.6, () => { g.moveTo(-22, -5); g.lineTo(22, -5); });
    traco(g, f >= 2 ? C.energia2 : C.numero, 2.6, () => { g.moveTo(5, -21); g.lineTo(-4, -21); g.lineTo(2, -15.5); g.lineTo(-4, -10); g.lineTo(5, -10); });
    reflexo(g, -15, -12, 2.5, 4, .5, 0);
    if (f === 3) { racha(g, -3, -31, 1.3, 26, C.energia2); racha(g, 16, -16, 2.4, 10, C.energia2); } // a coroa racha
    g.restore();
    if (f === 3) poligono(g, [x + 22, y - 36 + Math.sin(o.t * 2) * 3 * o.mov, x + 28, y - 30, x + 21, y - 28], C.ouro, 2);
  }
  function contador(g, o, C) {
    const f = o.fase, t = o.t, mov = o.mov, gp = o.golpe, by = o.respira * .6, acende = f >= 2;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const num = (txt, x, y, tam, liga = acende) => digito(g, txt, x, y, tam, liga ? C.energia2 : C.numero, liga ? C.energia2 : null);
    if (f >= 2) aura(g, 0, -64, 80 + f * 12, C.energia, .12 + f * .08);
    pedrinhas(g, o, [3, 5, 8][f - 1], 80, -72, C.pedra2, acende ? C.energia2 : null);
    const pos = s => {
      let x = s * 52, y = -44 + by + Math.sin(t * 2 + s) * 1.5 * mov, e = 1;
      if (carr) { x = s * 21; y = -56 + by; }
      if (at2) { x = s * 58; y = -66 + by - Math.max(0, gp) * 10; }
      if (at1 && s === 1) { // ataque1: soco que vem na direção do aluno
        if (gp < 0) { const k = -gp / .6; x = 52 + 8 * k; y = -44 - 18 * k + by; e = 1 - .1 * k; }
        else { x = mix(52, 14, gp); y = mix(-44, -52, gp) + by; e = 1 + .8 * gp; }
      }
      if (o.est === 'ferido') y = -38 + by;
      return [x, y, e];
    };
    const mao = [pos(-1), pos(1)];
    for (const s of [-1, 1]) { caixa(g, s * 22 - 12, -28, 24, 28, 8, C.pedra2); elipse(g, s * 22, -3, 16, 6, C.pedra2, 2.6); }
    [-1, 1].forEach((s, i) => { const [x, y] = mao[i]; traco2(g, C.pedra2, 13, () => { g.moveTo(s * 40, -82 + by); g.quadraticCurveTo(s * 60, -66 + by, x, y - 6); }); });
    caixa(g, -36, -98 + by, 72, 76, 22, C.pedra);
    reflexo(g, -18, -82 + by, 8, 14, .2, -.3);
    if (o.costas) caixa(g, -16, -78 + by, 32, 30, 6, C.pedra2, 2.4);
    else { caixa(g, -13, -68 + by, 26, 22, 6, C.ouro); num('3', 0, -57 + by, 15); }
    if (f >= 2) { racha(g, -28, -48 + by, -.3, 14, C.energia2); racha(g, 22, -86 + by, 2.2, 12, C.energia2); }
    for (const s of [-1, 1]) {
      bola(g, s * 42, -88 + by, 21, C.pedra3);
      traco2(g, C.ouro, 3.5, () => g.arc(s * 42, -88 + by, 15, Math.PI * 1.1, Math.PI * 1.9));
      if (!o.simples) num(s < 0 ? '7' : '2', s * 42, -84 + by, 13);
    }
    const hy = -101 + by, fx = o.fx * 5;
    caixa(g, -17, hy - 13, 34, 26, 10, C.pedra2);
    if (!o.costas) {
      const k = { pele: C.pedra2, esclera: C.olho, brilho: C.energia2, raiva: .6, pupila: 0 };
      olho(g, fx - 8, hy, 5.5, 3.8, o, -1, k); olho(g, fx + 8, hy, 5.5, 3.8, o, 1, k);
    }
    coroaSigma(g, 0, hy - 9, C, o);
    const [px, py, pe] = mao[1];
    if (at1 && gp > 0) {
      g.save(); g.globalAlpha *= gp;
      const arco = () => { g.moveTo(86, -86); g.quadraticCurveTo(74, -34, px, py); };
      traco(g, C.energia, 9, arco); traco(g, C.energia2, 3, arco);
      g.restore();
    }
    [-1, 1].forEach((s, i) => { const [x, y, e] = mao[i]; punho(g, x, y, s, e, C, num, s < 0 ? '9' : '4', o); });
    if (at1 && gp > .8) estrela(g, px, py - 18 * pe, 18, '#FFFFFF', (gp - .8) * 5);
    if (at2 && o.voo > 0) { // ataque2: onda de números
      g.save(); g.globalAlpha *= 1 - o.voo * .4;
      '1234567'.split('').forEach((d, i) => {
        const a = -Math.PI / 2 + (i - 3) * .45, r = 30 + o.voo * 80;
        num(d, Math.cos(a) * r * 1.3, -64 + Math.sin(a) * r * .5 + o.voo * 40, 10 + o.voo * 10, true);
      });
      g.restore();
    }
    if (carr) { // esfera de energia crescendo entre os punhos
      const cy = -60 + by, r = 4 + o.carga * 11;
      carregar(g, 0, cy, 26, C.energia2, o);
      bola(g, 0, cy, r, C.energia2, 2.4); bola(g, 0, cy, r * .5, '#FFFFFF', 0);
      if (!o.simples) for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + t * 2 * mov, d = 16 + (1 - o.carga) * 30; num('+−×÷'[i], Math.cos(a) * d, cy + Math.sin(a) * d * .6, 9, true); }
    }
    if (f === 3) faiscas(g, o, 0, -90, 60, C.energia2, 6);
  }

  /* ---------- 2. Senhor Abismo (Mundo 2) ---------- */
  const ABISMO = { sombra: '#2A1650', sombra2: '#170B33', roxo: '#6B3FD1', azul: '#3D6FE0', ciano: '#8EF0FF', claro: '#E6E0FF', sinal: '#1E2A6A', corrente: '#5A4A8E', coroa: '#4B2F96', pedra: '#3A2F66' };

  function corrente(g, x0, y0, cx, cy, x1, y1, n, cor) {
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u, x = v * v * x0 + 2 * v * u * cx + u * u * x1, y = v * v * y0 + 2 * v * u * cy + u * u * y1;
      const a = Math.atan2(2 * v * (cy - y0) + 2 * u * (y1 - cy), 2 * v * (cx - x0) + 2 * u * (x1 - cx)), fino = i % 2;
      traco2(g, cor, 2.2, () => g.ellipse(x, y, fino ? 4.5 : 5.5, fino ? 1.4 : 3.2, a, 0, TAU));
    }
  }
  // os sinais + e − são os olhos do Senhor Abismo
  function sinal(g, tipo, x, y, r, cor, brilho, o, lado) {
    if (o.est === 'morrendo') { rodamoinho(g, x, y, r * .8, o.t * o.mov, cor); return; }
    if (o.est === 'ferido') { const a = -lado; traco2(g, cor, 2.6, () => { g.moveTo(x - a * r * .6, y - r * .6); g.lineTo(x + a * r * .5, y); g.lineTo(x - a * r * .6, y + r * .6); }); return; }
    if (brilho) aura(g, x, y, r * 2.4 * (1 + o.carga * .5), brilho, .7);
    const k = o.pisca ? .2 : 1;
    traco2(g, cor, r * .5, () => { g.moveTo(x - r, y); g.lineTo(x + r, y); if (tipo === '+') { g.moveTo(x, y - r * k); g.lineTo(x, y + r * k); } });
  }
  function garraSombra(g, x, y, s, e, ang, C) {
    g.save(); g.translate(x, y); g.scale(s * e, e); g.rotate(ang);
    for (const [a, l] of [[-.5, 20], [0, 23], [.5, 20]]) {
      g.save(); g.rotate(a);
      g.beginPath(); g.moveTo(-4, -6); g.quadraticCurveTo(-6, -l, 2, -l - 6); g.quadraticCurveTo(2, -l + 4, 5, -6); g.closePath(); pinta(g, C.sombra2, 2.6);
      traco(g, C.ciano, 1.6, () => { g.moveTo(-2, -10); g.quadraticCurveTo(-3, -l + 2, 1, -l - 2); });
      g.restore();
    }
    elipse(g, 0, 0, 15, 13, C.sombra2);
    traco(g, C.ciano, 1.8, () => g.arc(0, 0, 10, Math.PI * .9, Math.PI * 1.6));
    g.restore();
  }
  function abismo(g, o, C) {
    const f = o.fase, t = o.t, mov = o.mov, gp = o.golpe, by = o.respira, fogo = 1 + (f - 1) * .25;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    aura(g, 0, -4, 74, C.roxo, .45);
    pedrinhas(g, o, 3 + f * 2, 86, -76, C.pedra, f >= 2 ? C.ciano : null);
    for (const [x, y, w, h] of [[-46, -50, 12, 40], [46, -50, 12, 40], [-30, -84, 12, 40], [30, -84, 12, 40], [0, -100, 14, 44]]) chama(g, x, y + by, w, h * fogo, o, C.roxo, C.azul, C.ciano, x * .1);
    const pos = s => {
      let x = s * 56, y = -46 + by + Math.sin(t * 1.8 + s) * 3 * mov, e = 1, a = .2;
      if (at2) { x = s * 52; y = -92 + by; a = -.1; }
      if (carr && s === 1) { x = 40; y = -62 + by; a = -.5; }
      if (at1 && s === 1) { // ataque1: garra de sombras
        if (gp < 0) { const k = -gp / .6; x = 56 + 12 * k; y = -46 - 30 * k + by; a = mix(.2, -.4, k); }
        else { x = mix(56, 4, gp); y = mix(-46, -40, gp) + by; e = 1 + .6 * gp; a = mix(.2, 1.1, gp); }
      }
      if (o.est === 'ferido') { y = -40 + by; a = .5; }
      return [x, y, e, a];
    };
    const mao = [pos(-1), pos(1)];
    [-1, 1].forEach((s, i) => { const [x, y] = mao[i]; traco2(g, C.sombra, 12, () => { g.moveTo(s * 36, -70 + by); g.quadraticCurveTo(s * 56, -70 + by, x, y + 4); }); });
    g.beginPath(); g.moveTo(-58, 0); g.quadraticCurveTo(-62, -40, -40, -74 + by); g.quadraticCurveTo(-28, -98 + by, 0, -100 + by);
    g.quadraticCurveTo(28, -98 + by, 40, -74 + by); g.quadraticCurveTo(62, -40, 58, 0); g.quadraticCurveTo(0, 8, -58, 0); g.closePath(); pinta(g, C.sombra);
    elipse(g, 0, -26, 40, 18, C.sombra2, 0);
    for (const x of [-48, -22, 22, 48]) chama(g, x, 4, 8, 16 * fogo, o, C.roxo, C.azul, null, x);
    if (!o.costas) corrente(g, -44, -70 + by, -4, -24 + by, 48, -52 + by, o.simples ? 6 : 11, C.corrente);
    // cabeça de duas faces
    const hy = -94 + by, fx = o.fx * 5, luz = f === 1 ? -1 : 1; // fase 2: as faces trocam de lado
    if (o.costas) elipse(g, 0, hy, 25, 28, C.sombra2);
    else if (f === 3) { // fase 3: uma face só, com os dois sinais
      aura(g, 0, hy, 46, C.ciano, .45);
      chama(g, 0, hy - 16, 16, 34, o, C.claro, C.ciano, null, 2);
      elipse(g, 0, hy, 25, 28, C.roxo);
      reflexo(g, -10, hy - 14, 6, 9, .3);
      traco(g, C.ciano, 2.4, () => { g.moveTo(0, hy - 27); g.lineTo(2.5, hy - 10); g.lineTo(-2.5, hy + 6); g.lineTo(0, hy + 27); });
      sinal(g, '+', fx - 11, hy + 1, 7.5, C.claro, C.ciano, o, -1);
      sinal(g, '−', fx + 11, hy + 1, 7.5, C.claro, C.roxo, o, 1);
    } else {
      chama(g, luz * 11, hy - 16, 12, 30, o, C.claro, C.ciano, null, 1);
      elipse(g, 0, hy, 25, 28, C.sombra2);
      g.save(); g.beginPath(); g.rect(luz < 0 ? -30 : 0, hy - 40, 30, 80); g.clip();
      elipse(g, 0, hy, 25, 28, C.claro, 0); reflexo(g, luz * 12, hy - 14, 5, 8, .5);
      g.restore();
      elipse(g, 0, hy, 25, 28, null, 3);
      traco(g, TINTA, 2.4, () => { g.moveTo(0, hy - 28); g.quadraticCurveTo(-4, hy, 0, hy + 28); });
      sinal(g, '+', fx + luz * 11, hy + 1, 7.5, C.sinal, null, o, luz);
      sinal(g, '−', fx - luz * 11, hy + 1, 7.5, C.claro, C.roxo, o, -luz);
    }
    const cy = hy - 24;
    if (f >= 2) aura(g, 0, cy - 12, 22, C.ciano, .5);
    poligono(g, [-16, cy + 2, -21, cy - 16, -9, cy - 8, 0, cy - 24, 9, cy - 8, 21, cy - 16, 16, cy + 2], C.coroa);
    poligono(g, [0, cy - 18, 5, cy - 9, 0, cy, -5, cy - 9], C.claro, 2);
    [-1, 1].forEach((s, i) => { const [x, y, e, a] = mao[i]; garraSombra(g, x, y, s, e, a, C); });
    if (!o.costas && !o.simples) { const [x, y] = mao[0]; corrente(g, x - 4, y + 8, x - 10, y + 30, x - 2, y + 44, 5, C.corrente); }
    if (at1 && gp > .2) {
      g.save(); g.globalAlpha *= lim((gp - .2) / .5);
      traco(g, C.roxo, 11, () => g.arc(-45, -105, 85, -.06, 1.51)); traco(g, C.ciano, 3, () => g.arc(-45, -105, 85, -.06, 1.51));
      g.restore();
    }
    if (at2) for (let i = 0; i < 4; i++) { // ataque2: meteoros numéricos
      const u = mov ? (t * 1.1 + i * .25) % 1 : .25 + i * .2, x = mix(-70 + i * 46, -36 + i * 24, u), y = mix(-170, -24, u), k = .6 + u * .8;
      g.save(); g.globalAlpha *= Math.min(1, (1 - u) * 3);
      traco(g, C.roxo, 5 * k, () => { g.moveTo(x - 12, y - 40 * k); g.lineTo(x, y); });
      g.translate(x, y); g.scale(k, k);
      aura(g, 0, 0, 18, C.ciano, .5);
      poligono(g, [-9, 0, -4.5, -8, 4.5, -8, 9, 0, 4.5, 8, -4.5, 8], C.pedra, 2.4);
      digito(g, '17+8'[i], 0, .5, 9, C.ciano, C.ciano);
      g.restore();
    }
    if (carr) { // portal crescendo perto da mão
      const x = 40, y = -40 + by, r = 6 + o.carga * 18;
      carregar(g, x, y, r, C.roxo, o, C.ciano);
      bola(g, x, y, r, C.sombra2, 3);
      for (let i = 0; i < 3; i++) { const a0 = t * (3 - i) * mov + i * 2; traco(g, i ? C.roxo : C.ciano, 2.2, () => g.arc(x, y, r * (.45 + i * .2), a0, a0 + 3.6)); }
    }
    if (f === 3) faiscas(g, o, 0, -96, 62, C.ciano, 6);
  }

  /* ---------- 3. Kraken Multiplicador (Mundo 3) ---------- */
  const KRAKEN = { corpo: '#2B2A78', tent: '#4A3AA8', pinta: '#4B49A8', ventosa: '#FF8A9A', marca: '#C2364F', coral: '#FF7A6B', gema: '#2EE6D6', olho: '#FFD95A', iris: '#FF8A1E', agua: '#1FB5B5', espuma: '#C9FFF8' };
  // por lado: [ângulo, comprimento, curva, atrás?]; fase 1 usa 2 por lado, fase 2 usa 4, fase 3 usa 6
  const SLOTS = [[.25, 62, -1.1, 0], [-.45, 56, 1, 1], [.95, 50, -1.4, 0], [-.95, 52, 1.1, 1], [.6, 70, -1.2, 0], [-1.35, 46, 1.2, 1]];

  function tentaculo(g, x0, y0, ang, len, curva, r0, C, o, sem) {
    const n = o.simples ? 7 : 12, pts = [];
    let x = x0, y = y0, a = ang + Math.sin(o.t * 1.6 + sem) * .12 * o.mov;
    const cv = curva * (1 + Math.sin(o.t * 2.1 + sem) * .15 * o.mov);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([x, y, r0 * (1 - u * .75), a]);
      a += cv * (.2 + u * u * 3) / n * 1.6;
      x += Math.cos(a) * len / n; y += Math.sin(a) * len / n;
    }
    for (const p of pts) bola(g, p[0], p[1], p[2] + 1.8 * esp, TINTA, 0); // contorno
    for (const p of pts) bola(g, p[0], p[1], p[2], C.tent, 0);
    if (!o.simples) {
      const sd = Math.sign(cv) || 1;
      for (let i = 2; i < n; i += 2) { // ventosas com um "x"
        const [px, py, r, aa] = pts[i], vx = px + Math.cos(aa + sd * Math.PI / 2) * r * .45, vy = py + Math.sin(aa + sd * Math.PI / 2) * r * .45, q = r * .2;
        bola(g, vx, vy, r * .45, C.ventosa, 1.6);
        traco(g, C.marca, 1.1, () => { g.moveTo(vx - q, vy - q); g.lineTo(vx + q, vy + q); g.moveTo(vx + q, vy - q); g.lineTo(vx - q, vy + q); });
      }
    }
  }
  function coral(g, x, y, a, l, C) {
    const dx = Math.sin(a), dy = -Math.cos(a);
    traco2(g, C.coral, 5.5, () => {
      g.moveTo(x, y); g.lineTo(x + dx * l, y + dy * l);
      for (const [k, s] of [[.45, -1], [.7, 1]]) { const bx = x + dx * l * k, bj = y + dy * l * k, b = a + s * .7; g.moveTo(bx, bj); g.lineTo(bx + Math.sin(b) * l * .35, bj - Math.cos(b) * l * .35); }
    });
  }
  function kraken(g, o, C) {
    const f = o.fase, t = o.t, mov = o.mov, gp = o.golpe, by = o.respira;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    g.save(); g.globalAlpha *= .45; elipse(g, 0, 0, 78, 13, C.agua, 0); g.restore();
    if (f >= 2 || at2) ondas(g, o, C, at2 ? 1 : .4 + f * .1);
    const ajusta = (i, s) => {
      let [a, len, cv, atras] = SLOTS[i], r0 = 9;
      if (o.est === 'ferido') { len *= .85; cv *= 1.3; }
      if (carr) cv *= 1.25;
      if (at2) { a -= Math.max(0, gp) * .45 - Math.sin(t * 9 + i * 1.3) * .2 * mov; cv *= 1 - Math.max(0, gp) * .6; } // rajada
      if (at1 && s === 1 && i === 0) { // ataque1: um tentáculo grande bate para a frente
        if (gp < 0) { const k = -gp / .6; a = mix(a, -1.4, k); cv = mix(cv, 1.2, k); }
        else { a = mix(.25, 1.2, gp); cv = mix(cv, -.4, gp); r0 = 9 * (1 + gp * .7); len *= 1 + gp * .35; }
      }
      return { a, len, cv, atras, r0 };
    };
    const tentaculos = atras => {
      for (let i = 0; i < f * 2; i++) for (const s of [-1, 1]) {
        const m = ajusta(i, s);
        if (m.atras !== atras) continue;
        g.save(); g.scale(s, 1); tentaculo(g, 12 + i * 2.5, (atras ? -48 : -30) + by * .5, m.a, m.len, m.cv, m.r0, C, o, i * 1.7 + s); g.restore();
      }
    };
    tentaculos(1);
    const hy = -66 + by, fx = o.fx * 6;
    for (const [x, a, l] of [[-26, -.8, 22], [-13, -.35, 27], [0, 0, 31], [13, .35, 27], [26, .8, 22]]) coral(g, x, hy - 30 + Math.abs(x) * .3, a, l * (f === 3 ? 1.1 : 1), C);
    elipse(g, 0, hy, 38, 40, C.corpo);
    if (!o.simples) for (const [x, y, r] of [[-24, -10, 4], [25, -16, 3], [-14, -28, 2.6], [20, 10, 3]]) bola(g, x, hy + y, r, C.pinta, 0);
    reflexo(g, -16, hy - 22, 10, 6, .25);
    if (!o.costas) {
      if (f >= 2 || carr) aura(g, 0, hy - 20, 16 + f * 4 + o.carga * 16, C.gema, .5 + f * .1);
      traco2(g, C.gema, 5, () => { g.moveTo(-7, hy - 27); g.lineTo(7, hy - 13); g.moveTo(7, hy - 27); g.lineTo(-7, hy - 13); });
      const k = { pele: C.corpo, esclera: C.olho, iris: C.iris, brilho: f >= 2 ? C.olho : null, raiva: .5 };
      olho(g, fx - 15, hy + 4, 9, 8, o, -1, k); olho(g, fx + 15, hy + 4, 9, 8, o, 1, k);
      traco(g, TINTA, 2.6, () => { g.moveTo(fx - 7, hy + 22); g.quadraticCurveTo(fx, hy + 17, fx + 7, hy + 22); });
    }
    tentaculos(0);
    if (at1 && gp > .7) {
      const a = (gp - .7) / .3;
      for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + (i - 2) * .5; elipse(g, 58 + Math.cos(an) * 22 * a, -2 + Math.sin(an) * 26 * a, 3, 4.5, C.agua, 2); }
      estrela(g, 58, -6, 16 * a, C.espuma, a);
    }
    if (carr) { // redemoinho de água crescendo
      const y = -24 + by, r = 5 + o.carga * 13;
      carregar(g, 0, y, r + 6, C.gema, o, C.espuma);
      g.save(); g.globalAlpha *= .75; bola(g, 0, y, r, C.agua, 2.6); g.restore();
      rodamoinho(g, 0, y, r * .8, t * mov, C.espuma);
    }
    if (f === 3) faiscas(g, o, 0, -70, 70, C.espuma, 6);
  }

  /* ---------- registro ---------- */
  const CHEFOES = [
    { id: 'grandeContador', nome: 'O Grande Contador', mundo: 1, bioma: 'campo', tema: 'Natural', acento: ['#3BB54A', '#6BF57A', '#F5B841'], w: 164, h: 146, semente: .4,
      ataques: { ataque1: 'soco de pedra', ataque2: 'onda de números', carregando: 'esfera de energia' }, cores: CONTADOR, desenho: contador },
    { id: 'senhorAbismo', nome: 'Senhor Abismo', mundo: 2, bioma: 'floresta', tema: 'Negativo', acento: ['#6B3FD1', '#8EF0FF', '#E6E0FF'], w: 150, h: 140, semente: 1.7,
      ataques: { ataque1: 'garra de sombras', ataque2: 'meteoros numéricos', carregando: 'portal' }, cores: ABISMO, desenho: abismo },
    { id: 'krakenMultiplicador', nome: 'Kraken Multiplicador', mundo: 3, bioma: 'praia', tema: 'Tabuada', acento: ['#2EE6D6', '#FF7A6B', '#FFD95A'], w: 172, h: 128, semente: 2.9,
      ataques: { ataque1: 'tentáculo', ataque2: 'rajada de tentáculos', carregando: 'redemoinho' }, cores: KRAKEN, desenho: kraken }
  ];

  CHEFOES.forEach(m => {
    Sprites.registrar(m.id, {
      nome: m.nome, w: Math.round(m.w * ESCALA), h: Math.round(m.h * ESCALA), escala: ESCALA, ocupa: .5,
      chefao: true, fases: 3, mundo: m.mundo, estados: ESTADOS, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: m.bioma, tema: m.tema, acento: m.acento, ataques: m.ataques,
      desenhar(ctx, p, vista, t, dir, fase) {
        const o = contexto(p && typeof p === 'object' ? p : { estado: p, vista, t, dir, fase }, m.semente);
        if (!ESTADOS.includes(o.est)) Object.assign(o, { est: 'idle', flash: false, treme: 0, prog: 0, carga: 0, golpe: 0, voo: 0 });
        const C = cores(o, m.cores);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.scale(ESCALA, ESCALA); if (o.espelho) ctx.scale(-1, 1);
        esp = o.simples ? 1.4 : .7;
        ctx.save(); ctx.globalAlpha *= 1 - o.prog * .8; elipse(ctx, 0, 1, m.w * .38, m.w * .07, 'rgba(30,18,64,.26)', 0); ctx.restore();
        ctx.save(); ctx.translate(o.treme, 0);
        if (o.est === 'morrendo') morrer(ctx, o, m.h);
        m.desenho(ctx, o, C);
        ctx.restore();
        if (o.est === 'morrendo' && !o.simples) fumaca(ctx, o, m.h, m.acento[1]);
        esp = 1; ctx.restore();
      }
    });
  });
})();
