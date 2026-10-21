/* chefoes2.js — mais 2 chefões do Mohamed (Dragão Partido e O Apagador), só Canvas 2D.
   Mesma estrutura do chefoes.js: Sprites.registrar(id, def); def.desenhar(ctx, p) com
   p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t, prog, fase: 1 | 2 | 3 }
   (aceita também desenhar(ctx, estado, vista, t, dir, fase)). Origem (0,0) entre os pés, desenhando para cima.
   Na batalha ocupam metade da tela (def.ocupa = 0.5). carregando e morrendo usam p.prog (0 → 1). */
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
  function digito(g, txt, x, y, tam, cor) {
    g.font = 'bold ' + Math.max(4, Math.round(tam)) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 2.2 * esp; g.strokeStyle = TINTA; g.strokeText(txt, x, y);
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
  // no "ferido" pisca branco; aceita paletas dentro de paletas
  function cores(o, base) {
    if (!o.flash) return base;
    const k = {};
    for (const n in base) k[n] = typeof base[n] === 'object' ? cores(o, base[n]) : '#FFFFFF';
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
    for (let i = 0; i < 8; i++) {
      const an = i * 1.3 + p * 4, d = 30 + p * 60;
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

  /* ---------- 1. Dragão Partido (Mundo 4) ---------- */
  const ROCHA = { pele: '#3A2A66', pele2: '#5B2E8C', membrana: '#E5402A', membrana2: '#B5302A', osso: '#2A2050', chifre: '#5B2E8C', olho: '#FFE066', brilho: '#FF8A2A', racha: '#FF8A2A', sopro: '#FF8A2A', sopro2: '#FFE066' };
  const DRAGAO = {
    lava: { pele: '#E5402A', pele2: '#FF8A2A', membrana: '#FF8A2A', membrana2: '#C93A24', osso: '#7A2418', chifre: '#FFB23F', olho: '#FFF3A0', brilho: '#FFE066', racha: '#FFE066', sopro: '#FF8A2A', sopro2: '#FFE066' },
    rocha: ROCHA,
    rocha2: { ...ROCHA, olho: '#F0D6FF', brilho: '#B46BFF', racha: '#B46BFF', sopro: '#8A4DFF', sopro2: '#F0D6FF' },
    pedra: '#2A2050'
  };

  function asa(g, s, bate, P) {
    g.save(); g.scale(s, 1); g.translate(22, -70); g.rotate(-bate);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(20, -40); g.lineTo(62, -32);
    g.quadraticCurveTo(56, -16, 60, 2); g.quadraticCurveTo(46, -2, 44, 14); g.quadraticCurveTo(32, 8, 26, 24); g.quadraticCurveTo(14, 14, 4, 22);
    g.closePath(); pinta(g, P.membrana);
    traco(g, P.membrana2, 2, () => { g.moveTo(20, -40); g.lineTo(60, 2); g.moveTo(20, -40); g.lineTo(44, 14); g.moveTo(20, -40); g.lineTo(26, 24); });
    traco2(g, P.osso, 3.5, () => { g.moveTo(0, 0); g.lineTo(20, -40); g.lineTo(62, -32); });
    poligono(g, [18, -40, 22, -50, 25, -39], P.osso, 2);
    g.restore();
  }
  function garras(g, x, y, s, P, e = 1) {
    g.save(); g.translate(x, y); g.scale(s * e, e);
    for (const a of [-.5, 0, .5]) { g.save(); g.rotate(a); poligono(g, [-2.5, 0, 2.5, 0, 0, 9], P.chifre, 1.8); g.restore(); }
    elipse(g, 0, -2, 9, 7, P.pele, 2.6);
    g.restore();
  }
  // um dragão inteiro; P = paleta (inteiro ou lado direito), Q = paleta do lado esquerdo (dragão partido), k = força
  function dragao(g, o, P, Q, k) {
    const t = o.t, mov = o.mov, gp = o.golpe, by = o.respira;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const bate = Math.sin(t * 2.2) * .08 * mov + (carr ? .2 + o.carga * .15 : 0) + (o.est === 'ferido' ? -.15 : 0);
    const hy = -88 + by + (at2 ? Math.max(0, gp) * 6 : 0), fx = o.fx * 5, my = hy + 16;
    const ab = at2 ? Math.max(.3, gp) : carr ? .35 : o.est === 'ferido' ? .5 : 0;
    const mao = s => {
      let x = s * 34, y = -30 + by, e = 1;
      if (carr) { x = s * 24; y = -50 + by; }
      if (at1 && s === 1) { // ataque1: golpe de garras
        if (gp < 0) { const q = -gp / .6; x = 34 + 10 * q; y = -30 - 30 * q + by; }
        else { x = mix(34, 8, gp); y = mix(-30, -40, gp) + by; e = 1 + .7 * gp; }
      }
      if (o.est === 'ferido') y = -26 + by;
      return [x, y, e];
    };
    for (const s of [-1, 1]) asa(g, s, bate, s < 0 && Q ? Q : P);
    const corpo = pal => {
      traco2(g, pal.pele, 8, () => { g.moveTo(16, -14); g.quadraticCurveTo(62, -2, 66, -30); });
      poligono(g, [61, -28, 70, -44, 72, -27], pal.chifre, 2);
      for (const s of [-1, 1]) { bola(g, s * 26, -18, 14, pal.pele); garras(g, s * 30, -4, s, pal); }
      elipse(g, 0, -46 + by, 30, 34, pal.pele);
      elipse(g, 0, -40 + by, 17, 24, pal.pele2, 2.4);
      traco(g, pal.osso, 1.8, () => { for (let i = 0; i < 4; i++) { const y = -56 + by + i * 9, w = 13 - Math.abs(i - 1.5) * 2; g.moveTo(-w, y); g.lineTo(w, y); } });
      for (const s of [-1, 1]) poligono(g, [s * 18, -72 + by, s * 30, -86 + by, s * 30, -68 + by], pal.chifre, 2.2);
      for (const s of [-1, 1]) {
        const [x, y, e] = mao(s);
        traco2(g, pal.pele, 9, () => { g.moveTo(s * 22, -62 + by); g.quadraticCurveTo(s * 36, -50 + by, x, y); });
        garras(g, x, y, s, pal, e);
      }
      racha(g, -18, -56 + by, .6, 14, pal.racha); racha(g, 12, -34 + by, 2.4, 12, pal.racha);
      if (k > 1) { racha(g, -22, -30 + by, -.5, 12, pal.racha); racha(g, 16, -62 + by, 2.8, 12, pal.racha); }
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 10, hy - 12); g.quadraticCurveTo(s * 26, hy - 18, s * 30, hy - 38); g.quadraticCurveTo(s * 20, hy - 22, s * 18, hy - 6); g.closePath(); pinta(g, pal.osso); }
      poligono(g, [-6, hy - 12, -12, hy - 26, -5, hy - 23, -2, hy - 26 - 18 * k, 4, hy - 28, 10, hy - 36 * k, 7, hy - 12], pal.chifre); // crista de cristal
      elipse(g, 0, hy, 22, 17, pal.pele);
      elipse(g, 0, hy + 14 + ab * 6, 12, 6, pal.pele2, 2.6);
      if (ab > 0) elipse(g, 0, hy + 12 + ab * 3, 9, 2 + ab * 4, '#4A0E08', 2);
      elipse(g, 0, hy + 8, 14, 8, pal.pele, 2.8);
      for (const s of [-1, 1]) { bola(g, s * 4, hy + 6, 1.4, TINTA, 0); poligono(g, [s * 6, hy + 14, s * 3, hy + 14, s * 4.5, hy + 18], '#FFFFFF', 1.4); }
      reflexo(g, -12, hy - 6, 5, 3, .3);
    };
    corpo(P);
    if (Q) { // metade esquerda de lava, com a fenda brilhando no meio
      g.save(); g.beginPath(); g.rect(-120, -200, 120, 230); g.clip(); corpo(Q); g.restore();
      const fenda = () => { g.moveTo(0, hy - 30); g.lineTo(2, hy - 6); g.lineTo(-2, -60 + by); g.lineTo(2, -34 + by); g.lineTo(0, -8); };
      traco(g, TINTA, 4.4, fenda); traco(g, Q.racha, 2, fenda);
    }
    if (o.costas) for (let i = 0; i < 5; i++) poligono(g, [-4, -84 + by + i * 12, 0, -94 + by + i * 12, 4, -84 + by + i * 12], (Q || P).chifre, 2);
    else {
      const kE = pal => ({ pele: pal.pele, esclera: pal.olho, brilho: pal.brilho, raiva: .6, pupila: .22 });
      olho(g, fx - 9, hy - 3, 6, 4.6, o, -1, kE(Q || P)); olho(g, fx + 9, hy - 3, 6, 4.6, o, 1, kE(P));
    }
    if (at1 && gp > .2) { g.save(); g.globalAlpha *= lim((gp - .2) / .5); for (let i = 0; i < 3; i++) traco2(g, P.sopro2, 2.6, () => g.arc(-45 + i * 9, -105 + i * 7, 85, .05, 1.45)); g.restore(); }
    if (at2 && gp > 0) { // ataque2: sopro de lava
      const L = 24 + gp * 60, w = 10 + gp * 18, fl = Math.sin(t * 20) * 2 * mov;
      const jato = (q, cor, linha) => { g.beginPath(); g.moveTo(-4 * q, my); g.lineTo(-w * q + fl, my + L * q); g.quadraticCurveTo(0, my + L * q + 14 * q, w * q - fl, my + L * q); g.lineTo(4 * q, my); g.closePath(); pinta(g, cor, linha); };
      jato(1, P.sopro, 2.6); jato(.6, P.sopro2, 0);
    }
    if (carr) { const r = 4 + o.carga * 12; carregar(g, 0, my + 6, r + 6, P.sopro, o, P.sopro2); bola(g, 0, my + 6, r, P.sopro2, 2.4); }
  }
  function dragaoPartido(g, o, C) {
    const f = o.fase;
    aura(g, 0, -8, 96, C.lava.sopro, .3 + f * .08);
    pedrinhas(g, o, 3 + f * 2, 92, -84, C.pedra, f === 3 ? C.lava.brilho : null);
    for (const x of [-64, -34, 34, 64]) chama(g, x, 3, 6, 10 + f * 4, o, C.lava.pele, C.lava.pele2, C.lava.brilho, x);
    if (f === 2) for (const s of [-1, 1]) { // fase 2: dois dragões menores
      const o2 = s < 0 ? o : { ...o, t: o.t + .45, respira: -o.respira, golpe: o.mov && o.golpe ? pose((o.ciclo + .12) % 1) : o.golpe };
      g.save(); g.translate(s * 48, 0); g.scale(.64, .64); dragao(g, o2, s < 0 ? C.lava : C.rocha2, null, 1); g.restore();
    } else { // fase 1: partido ao meio; fase 3: unido e mais forte
      g.save();
      if (f === 3) { g.scale(1.06, 1.06); aura(g, 0, -80, 70, C.lava.brilho, .3); }
      dragao(g, o, C.rocha, C.lava, f === 3 ? 1.3 : 1);
      g.restore();
    }
    if (f === 3) faiscas(g, o, 0, -96, 74, C.lava.brilho, 7);
  }

  /* ---------- 2. O Apagador (vilão final) ---------- */
  const APAGADOR = { manto: '#2B2147', manto2: '#1A1530', manto3: '#3A2E5E', vazio: '#0E0A1E', mao: '#1A1530', brilho: '#9B7BFF', olho: '#B49BFF', cinza: '#8A86A8', claro: '#D8D4F0', ouro: '#C9A24E', roubado: '#FFE38A', sombra: '#5A3F9E', pedra: '#2E2650' };

  function olhoVazio(g, x, y, lado, o, cor, r = 5) {
    if (o.est === 'morrendo') { rodamoinho(g, x, y, r * .7, o.t * o.mov, cor); return; }
    if (o.est === 'ferido') { traco(g, cor, 2.2, () => { g.moveTo(x + lado * r * .5, y - r * .5); g.lineTo(x - lado * r * .5, y); g.lineTo(x + lado * r * .5, y + r * .5); }); return; }
    aura(g, x, y, r * 3 * (1 + o.carga * .5), cor, .55 + (o.fase - 1) * .12);
    g.save(); g.translate(x, y); g.rotate(-lado * .3);
    elipse(g, 0, 0, r, o.pisca ? .4 : r * .42, cor, 0);
    if (!o.pisca) bola(g, -r * .3, -r * .1, r * .14, '#FFFFFF', 0);
    g.restore();
  }
  function maoApagadora(g, x, y, s, e, ang, C) {
    g.save(); g.translate(x, y); g.scale(s * e, e); g.rotate(ang);
    for (const [a, l] of [[-.75, 15], [-.25, 20], [.2, 21], [.65, 17]]) traco2(g, C.mao, 4.2, () => { g.moveTo(0, 0); g.quadraticCurveTo(Math.sin(a) * l * .6 + 2, -Math.cos(a) * l * .6, Math.sin(a) * l, -Math.cos(a) * l); });
    traco2(g, C.mao, 4, () => { g.moveTo(-4, 4); g.quadraticCurveTo(-14, 2, -16, -6); });
    elipse(g, 0, 2, 10, 9, C.mao);
    traco(g, C.brilho, 1.6, () => g.arc(0, 2, 6.5, Math.PI * 1.1, Math.PI * 1.7));
    g.restore();
  }
  function orbe(g, x, y, r, o, C) {
    aura(g, x, y, r * 2.4, C.sombra, .7);
    bola(g, x, y, r, C.vazio, 3);
    for (let i = 0; i < 2; i++) { const a0 = o.t * (3 - i) * o.mov + i * 2.5; traco(g, i ? C.sombra : C.brilho, 2, () => g.arc(x, y, r * (.6 + i * .25), a0, a0 + 3.4)); }
    reflexo(g, x - r * .35, y - r * .4, r * .25, r * .15, .25);
  }
  // pequenos brilhos amarelos sendo puxados até ele e ficando cinza
  function brilhosRoubados(g, o, x, y, n, C) {
    if (o.simples) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      const u = o.mov ? (o.t * .45 + i / n) % 1 : i / n, a = i * 2.3 + 1, d = 95 * (1 - u) + 6;
      estrela(g, x + Math.cos(a) * d, y + Math.sin(a) * d * .7, 3.4 * (1 - u * .6), u < .75 ? C.roubado : C.cinza, Math.sin(u * Math.PI));
    }
  }
  function apagador(g, o, C) {
    const f = o.fase, t = o.t, mov = o.mov, gp = o.golpe, by = o.respira;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    aura(g, 0, -64, 110, C.manto, .55 + f * .1);
    pedrinhas(g, o, 3 + f * 2, 94, -88, C.pedra, null);
    const mao = s => {
      let x = s * 46, y = -64 + by + Math.sin(t * 1.6 + s) * 3 * mov, e = 1, a = .3;
      if (carr) { x = s * 28; y = -66 + by; a = -.5; }
      if (at2 && s === 1) { x = 50; y = -78 + by; a = .9; e = 1 + Math.max(0, gp) * .2; }
      if (at1 && s === 1) { // ataque1: mão de sombra que varre
        if (gp < 0) { const q = -gp / .6; x = 46 + 10 * q; y = -64 - 26 * q + by; a = mix(.3, -.3, q); }
        else { x = mix(46, 6, gp); y = mix(-64, -50, gp) + by; e = 1 + .5 * gp; a = mix(.3, 1.2, gp); }
      }
      if (o.est === 'ferido') { y += 6; a = .7; }
      return [x, y, e, a];
    };
    const maos = [mao(-1), mao(1)];
    g.save(); g.translate(0, Math.sin(t * 1.4) * 3 * mov - 4); // flutua
    // manto com a barra rasgada
    const n = o.simples ? 6 : 10;
    g.beginPath(); g.moveTo(-20, -96 + by); g.quadraticCurveTo(-44, -60, -50, -4);
    for (let i = 0; i < n; i++) { g.lineTo(-50 + (i + .5) * 100 / n, 6 + Math.sin(t * 3 + i * 1.7) * 3 * mov); g.lineTo(-50 + (i + 1) * 100 / n, -4); }
    g.quadraticCurveTo(44, -60, 20, -96 + by); g.closePath(); pinta(g, C.manto);
    traco(g, C.manto2, 2.2, () => { g.moveTo(-14, -70 + by); g.quadraticCurveTo(-24, -36, -28, -6); g.moveTo(14, -70 + by); g.quadraticCurveTo(24, -36, 28, -6); });
    if (f >= 2 && !o.costas) { // fase 2: o manto se abre num céu de estrelas apagadas
      const ab = 10 + (f === 3 ? 6 : 0) + Math.sin(t * 1.2) * 2 * mov;
      const abertura = () => { g.beginPath(); g.moveTo(0, -80 + by); g.quadraticCurveTo(-ab * .9, -40, -ab - 8, -2); g.lineTo(ab + 8, -2); g.quadraticCurveTo(ab * .9, -40, 0, -80 + by); g.closePath(); };
      abertura(); g.fillStyle = C.vazio; g.fill();
      g.save(); abertura(); g.clip();
      for (let i = 0; i < 12; i++) {
        const x = ((i * 37) % 40) - 20, y = -72 + ((i * 53) % 68), luz = mov ? lim(.25 + .5 * Math.sin(t * 1.5 + i * 2.1)) : .4;
        estrela(g, x, y, 1.5 + (i % 3), i % 4 ? C.cinza : C.roubado, i % 4 ? luz : luz * .5);
      }
      g.restore();
      abertura(); g.lineWidth = 2.6 * esp; g.strokeStyle = TINTA; g.stroke();
    }
    // números que somem do corpo
    if (!o.simples && !o.costas) [['3', -20, -50], ['7', 22, -34], ['1', -26, -22], ['4', 24, -62]].forEach(([d, x, y], i) => {
      const a = mov ? lim(.5 + .6 * Math.sin(t * 1.3 + i * 1.7)) : .6, yy = y - (1 - a) * 10 + by * .5;
      g.save(); g.globalAlpha *= a; digito(g, d, x, yy, 11, C.claro); g.restore();
      if (a < .6) for (let j = 0; j < 3; j++) {
        const u = (t * .8 + j / 3 + i * .3) % 1, px = x + (j - 1) * 5, py = yy - 8 - u * 22;
        g.save(); g.globalAlpha *= (1 - u) * (1 - a); poligono(g, [px - 1.6, py - 1.6, px + 1.6, py - 1.6, px + 1.6, py + 1.6, px - 1.6, py + 1.6], C.claro, 0); g.restore();
      }
    });
    maos.forEach(([x, y], i) => { const s = i ? 1 : -1; traco2(g, C.manto, 11, () => { g.moveTo(s * 18, -90 + by); g.quadraticCurveTo(s * 38, -84 + by, x - s * 2, y + 8); }); });
    if (!o.costas) { // fecho dourado com o sinal de menos
      bola(g, 0, -82 + by, 5.5, C.ouro); bola(g, 0, -82 + by, 3.2, C.vazio, 1.6);
      traco(g, C.ouro, 1.6, () => { g.moveTo(-2, -82 + by); g.lineTo(2, -82 + by); });
    }
    // capuz sem rosto
    const hy = -112 + by, fx = o.fx * 4;
    g.beginPath(); g.moveTo(-26, hy + 20); g.quadraticCurveTo(-32, hy - 18, 0, hy - 38); g.quadraticCurveTo(32, hy - 18, 26, hy + 20); g.quadraticCurveTo(0, hy + 28, -26, hy + 20); g.closePath(); pinta(g, C.manto3);
    traco(g, C.manto2, 2, () => { g.moveTo(-6, hy - 34); g.quadraticCurveTo(-16, hy - 10, -18, hy + 16); });
    if (!o.costas) {
      const r = f === 3 ? 18 : 15;
      elipse(g, fx, hy + 2, r, r + 1, C.vazio, 2.6);
      if (f === 3) { // fase 3: a auréola apagada aparece dentro do capuz
        g.save(); g.beginPath(); g.ellipse(fx, hy + 2, r, r + 1, 0, 0, TAU); g.clip();
        traco2(g, C.cinza, 2.4, () => g.ellipse(fx, hy - 9, 11, 3.6, 0, .4, TAU - .3));
        estrela(g, fx + 10, hy - 9, 2.2, C.roubado, mov ? .2 + .3 * Math.abs(Math.sin(t * 3)) : .35);
        g.restore();
      }
      olhoVazio(g, fx - 6, hy + 2, -1, o, C.olho); olhoVazio(g, fx + 6, hy + 2, 1, o, C.olho);
    }
    const [hx, hy2] = maos[1];
    if (at1 && gp > .2) {
      g.save(); g.globalAlpha *= lim((gp - .2) / .5);
      traco(g, C.sombra, 12, () => g.arc(-45, -105, 85, -.06, 1.51)); traco(g, C.brilho, 3, () => g.arc(-45, -105, 85, -.06, 1.51));
      g.restore();
    }
    maos.forEach(([x, y, e, a], i) => maoApagadora(g, x, y, i ? 1 : -1, e, a, C));
    if (at2 && o.voo > 0) orbe(g, mix(hx, 8, o.voo), mix(hy2 - 10, -36, o.voo), 6 + o.voo * 14, o, C); // ataque2: orbe do vazio
    if (carr) orbe(g, 0, -62 + by, 6 + o.carga * 20, o, C);
    brilhosRoubados(g, o, carr ? 0 : hx, carr ? -62 + by : hy2 - 8, carr ? 8 : 2 + f * 2, C);
    if (f === 3) faiscas(g, o, 0, -110, 70, C.cinza, 6);
    g.restore();
  }

  /* ---------- registro ---------- */
  const CHEFOES = [
    { id: 'dragaoPartido', nome: 'Dragão Partido', mundo: 4, bioma: 'vulcao', tema: 'Divisão', acento: ['#FF8A2A', '#E5402A', '#5B2E8C'], morte: '#FFE066', w: 190, h: 146, semente: .8,
      ataques: { ataque1: 'garras', ataque2: 'sopro de lava', carregando: 'bola de fogo' }, cores: DRAGAO, desenho: dragaoPartido },
    { id: 'apagador', nome: 'O Apagador', mundo: 5, final: true, bioma: 'castelo', tema: 'Revisão', acento: ['#8A86A8', '#1A1530', '#FFE38A'], morte: '#FFE38A', w: 150, h: 156, semente: 2.3,
      ataques: { ataque1: 'mão de sombra', ataque2: 'orbe do vazio', carregando: 'vazio que rouba a luz' }, cores: APAGADOR, desenho: apagador }
  ];

  CHEFOES.forEach(m => {
    Sprites.registrar(m.id, {
      nome: m.nome, w: Math.round(m.w * ESCALA), h: Math.round(m.h * ESCALA), escala: ESCALA, ocupa: .5,
      chefao: true, final: !!m.final, fases: 3, mundo: m.mundo, estados: ESTADOS, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: m.bioma, tema: m.tema, acento: m.acento, ataques: m.ataques,
      desenhar(ctx, p, vista, t, dir, fase) {
        const o = contexto(p && typeof p === 'object' ? p : { estado: p, vista, t, dir, fase }, m.semente);
        if (!ESTADOS.includes(o.est)) Object.assign(o, { est: 'idle', flash: false, treme: 0, prog: 0, carga: 0, golpe: 0, voo: 0 });
        const C = cores(o, m.cores);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.scale(ESCALA, ESCALA); if (o.espelho) ctx.scale(-1, 1);
        esp = o.simples ? 1.4 : .7;
        ctx.save(); ctx.globalAlpha *= 1 - o.prog * .8; elipse(ctx, 0, 1, m.w * .34, m.w * .06, 'rgba(30,18,64,.26)', 0); ctx.restore();
        ctx.save(); ctx.translate(o.treme, 0);
        if (o.est === 'morrendo') morrer(ctx, o, m.h);
        m.desenho(ctx, o, C);
        ctx.restore();
        if (o.est === 'morrendo' && !o.simples) fumaca(ctx, o, m.h, m.morte);
        esp = 1; ctx.restore();
      }
    });
  });
})();
