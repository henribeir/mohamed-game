/* minichefes.js — os 5 mini-chefes do Mohamed, desenhados só com Canvas 2D (sem imagens).
   API: Sprites.registrar(id, def); def.desenhar(ctx, p) com
   p = { estado, vista: 'batalha' | 'mapa', dir: 'baixo' | 'cima' | 'lado' | 'esquerda', t, prog, fase: 1 | 2 }
   (aceita também desenhar(ctx, estado, vista, t, dir, fase)). Origem (0,0) entre os pés, desenhando para cima.
   Cada chefe sai 1,8x maior que um monstro comum (def.escala = 1.8).
   Estados: idle, ataque1, ataque2, carregando, ferido, morrendo. carregando e morrendo usam p.prog (0 → 1)
   quando vier; sem prog, repetem sozinhos. Fase 2: rachaduras, olhos mais brilhantes e mais cor de acento. */
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

  const TINTA = '#1E1240', TAU = Math.PI * 2, ESCALA = 1.8;
  const ESTADOS = ['idle', 'ataque1', 'ataque2', 'carregando', 'ferido', 'morrendo'];
  const DIRECAO = { baixo: 'baixo', frente: 'baixo', cima: 'cima', costas: 'cima', lado: 'lado', direita: 'lado', esquerda: 'lado' };
  const menos = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const lim = v => Math.max(0, Math.min(1, v)), mix = (a, b, k) => a + (b - a) * k;
  let esp = 1;

  /* ---------- ajudantes de forma ---------- */
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
  function sombra(g, rx) { elipse(g, 0, 1, rx, rx * .2, 'rgba(30,18,64,.24)', 0); }
  function rodamoinho(g, x, y, r, t, cor = TINTA) {
    traco(g, cor, 2.4, () => {
      for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU * 1.6 + t * 6, rr = r * i / 20; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x, y); }
    });
  }
  // rachadura em zigue-zague com luz de acento por dentro (fase 2)
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
      estrela(g, x + Math.cos(a) * r * (.7 + u * .4), y + Math.sin(a) * r * .5 - u * r * .7, 2.4 + 2.2 * Math.sin(u * Math.PI), cor, Math.sin(u * Math.PI));
    }
  }
  // brilho que cresce com o.carga (0 → 1) e faíscas sendo sugadas para o centro
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
  // olho grande com pálpebra brava; lado = -1 (esquerdo) ou 1 (direito)
  function olho(g, x, y, rx, ry, o, lado, k) {
    if (o.est === 'morrendo') { rodamoinho(g, x, y, Math.min(rx, ry) * .85, o.t * o.mov); return; }
    if (o.est === 'ferido') {
      const a = -lado;
      traco(g, TINTA, 3, () => { g.moveTo(x - a * rx * .6, y - ry * .55); g.lineTo(x + a * rx * .55, y); g.lineTo(x - a * rx * .6, y + ry * .55); });
      return;
    }
    if (o.pisca) { traco(g, TINTA, 2.8, () => { g.moveTo(x - rx, y); g.quadraticCurveTo(x, y + ry * .5, x + rx, y); }); return; }
    if (k.brilho) aura(g, x, y, Math.max(rx, ry) * (o.fase === 2 ? 3 : 2.1) * (1 + o.carga * .4), k.brilho, o.fase === 2 ? .85 : .5);
    elipse(g, x, y, rx, ry, k.esclera || '#FFFFFF', 2.6);
    const r = Math.min(rx, ry), px = x + o.fx * rx * .3, py = y + ry * .15;
    if (k.iris) bola(g, px, py, r * .62, k.iris, 0);
    bola(g, px, py, r * (k.pupila || .32), TINTA, 0);
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
  // boca brava com dentinhos; abre = 0 (cerrada) → 1 (aberta)
  function boca(g, x, y, w, h, o, abre, cor) {
    if (o.est === 'morrendo') {
      traco(g, TINTA, 2.6, () => { g.moveTo(x - w / 2, y); for (let i = 1; i <= 6; i++) g.lineTo(x - w / 2 + w * i / 6, y + (i % 2 ? -2.2 : 2.2)); });
      return;
    }
    const a = h * (.35 + abre * .65);
    const forma = () => {
      g.beginPath(); g.moveTo(x - w / 2, y + a * .25);
      g.quadraticCurveTo(x, y - a * .75, x + w / 2, y + a * .25);
      g.quadraticCurveTo(x, y + a * 1.25, x - w / 2, y + a * .25); g.closePath();
    };
    forma(); g.fillStyle = cor; g.fill();
    g.save(); forma(); g.clip(); g.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) { const tx = x - w * .33 + i * w * .22; g.beginPath(); g.moveTo(tx - w * .09, y - a); g.lineTo(tx + w * .09, y - a); g.lineTo(tx, y + a * .2); g.closePath(); g.fill(); }
    g.restore();
    forma(); g.lineWidth = 2.6 * esp; g.strokeStyle = TINTA; g.stroke();
  }
  function coroa(g, x, y, l, h, cor, gema, perola) {
    poligono(g, [x - l, y, x - l, y - h * .75, x - l * .5, y - h * .38, x, y - h, x + l * .5, y - h * .38, x + l, y - h * .75, x + l, y], cor, 2.6);
    traco(g, TINTA, 1.4, () => { g.moveTo(x - l, y - h * .22); g.lineTo(x + l, y - h * .22); });
    if (perola) for (const [px, py] of [[x - l, y - h * .75], [x, y - h], [x + l, y - h * .75]]) bola(g, px, py - 1.6, 2.4, perola, 1.8);
    if (gema) { elipse(g, x, y - h * .4, l * .24, h * .2, gema, 2); reflexo(g, x - l * .08, y - h * .47, l * .08, h * .06, .9, 0); }
    reflexo(g, x - l * .6, y - h * .5, l * .12, h * .14, .5, 0);
  }
  function crescente(g, x, y, r, cor, rot = 0, linha = 2.6) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath(); g.arc(0, 0, r, Math.PI * .15, Math.PI * 1.85); g.arc(r * .42, 0, r * .78, Math.PI * 1.72, Math.PI * .28, true);
    g.closePath(); pinta(g, cor, linha);
    g.restore();
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
  // no "ferido" o chefe pisca branco trocando a paleta inteira
  function cores(o, base) {
    if (!o.flash) return base;
    const k = {};
    for (const n in base) k[n] = '#FFFFFF';
    return k;
  }
  // encolhe, gira e some (nada sangrento); fumaça e brilhinhos vêm por cima
  function morrer(g, o, alt) {
    const p = o.prog, s = 1 - p * .5;
    g.translate(0, -alt * .45);
    g.rotate((Math.sin(p * 14) * .1 * (1 - p) + p * .3) * (o.mov || .3));
    g.scale(s, s);
    g.translate(0, alt * .45 + p * 6);
    g.globalAlpha *= 1 - lim((p - .5) / .5);
  }
  function fumaca(g, o, alt, cor) {
    const p = o.prog, a = Math.sin(p * Math.PI), base = g.globalAlpha;
    for (let i = 0; i < 6; i++) {
      const an = i / 6 * TAU + p * 2, d = 18 + p * 46;
      g.globalAlpha = base * .5 * a;
      bola(g, Math.cos(an) * d, -alt * .45 + Math.sin(an) * d * .6 - p * 18, 9 + p * 14, '#ECE6F7', 0);
    }
    g.globalAlpha = base;
    for (let i = 0; i < 5; i++) {
      const an = i * 1.3 + p * 4, d = 26 + p * 44;
      estrela(g, Math.cos(an) * d, -alt * .45 + Math.sin(an) * d * .7, 4 + 3 * Math.abs(Math.sin(p * 9 + i)), cor, 1 - p);
    }
  }
  // -0,6 = preparo (recolhe), 1 = golpe, depois volta a 0
  const pose = c => c < .6 ? -.6 * Math.sin(c / .6 * Math.PI / 2) : c < .72 ? -.6 + (c - .6) / .12 * 1.6 : 1 - (c - .72) / .28;

  function contexto(p, semente) {
    const t = +p.t || 0, est = p.estado || 'idle', mov = menos && menos.matches ? 0 : 1, mapa = p.vista === 'mapa';
    const dir = mapa ? DIRECAO[p.dir] || 'baixo' : 'baixo', temProg = p.prog != null && !isNaN(+p.prog);
    const ciclo = (t * 1.1 + semente * .13) % 1;
    const carga = est === 'carregando' ? (temProg ? lim(+p.prog) : mov ? (t % 2.4) / 2.4 : .75) : 0;
    return {
      t, est, mov, simples: mapa, dir, fase: +p.fase === 2 ? 2 : 1,
      espelho: mapa && p.dir === 'esquerda', costas: dir === 'cima', fx: dir === 'lado' ? 1 : 0,
      prog: est === 'morrendo' ? lim(temProg ? +p.prog : (t % 1.6) / 1.3) : 0,
      carga, ciclo,
      golpe: est === 'ataque1' || est === 'ataque2' ? (mov ? pose(ciclo) : .75) : 0,
      voo: mov ? lim((ciclo - .6) / .4) : .5,
      respira: Math.sin(t * 2.2 + semente) * 1.6 * mov,
      flash: est === 'ferido' && mov > 0 && Math.floor(t * 14) % 2 === 0,
      treme: est === 'ferido' ? Math.sin(t * 60) * 3 * (mov || .4) : Math.sin(t * 50) * 1.4 * carga * mov,
      pisca: est === 'idle' && (t + semente) % 4.3 < .12
    };
  }

  /* ---------- 1. Girassol Furioso (Campo) ---------- */
  const GIRASSOL = { caule: '#4FB548', caule2: '#2F8A3A', folha: '#5CCB4F', veia: '#A8FFCB', petala: '#FFD23F', petala2: '#F5A623', miolo: '#7A4A22', ponto: '#3E230F', olho: '#FFFFFF', iris: '#3A2410', raiz: '#8A5A2E', terra: '#6B4423', semente: '#4A2C14', sol: '#FFE45C', boca: '#4A1238', acento: '#3DDC84' };
  const GIRASSOL2 = { ...GIRASSOL, petala: '#E8892A', petala2: '#B5521B', miolo: '#5E3519', folha: '#3FA845', olho: '#D8FFE8', iris: '#3DDC84', veia: '#3DDC84' };

  function petalas(g, x, y, n, r0, r1, larg, cor, gira, sx) {
    for (let i = 0; i < n; i++) {
      g.save(); g.translate(x, y); g.scale(sx, 1); g.rotate(gira + i * TAU / n);
      g.beginPath(); g.moveTo(-larg, -r0);
      g.quadraticCurveTo(-larg * 1.2, -(r0 + r1) * .55, 0, -r1);
      g.quadraticCurveTo(larg * 1.2, -(r0 + r1) * .55, larg, -r0);
      g.closePath(); pinta(g, cor, 2.4);
      g.restore();
    }
  }
  function folha(g, x, y, s, ang, comp, larg, cor, veia, f2) {
    g.save(); g.translate(x, y); g.scale(s, 1); g.rotate(-ang);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(comp * .45, -larg, comp, 0); g.quadraticCurveTo(comp * .45, larg, 0, 0); g.closePath(); pinta(g, cor);
    traco(g, veia, f2 ? 2.4 : 1.6, () => { g.moveTo(4, 0); g.quadraticCurveTo(comp * .5, -2, comp * .82, 0); });
    g.restore();
  }
  function espinhoRaiz(g, x, h, C, f2) {
    const s = x < 0 ? -1 : 1;
    elipse(g, x, 4, 10, 3.2, C.terra, 2);
    if (h < 1) return;
    g.beginPath(); g.moveTo(x - 5, 4); g.quadraticCurveTo(x - 6, 4 - h * .6, x + s * 4, 4 - h); g.quadraticCurveTo(x + 2, 4 - h * .45, x + 5, 4); g.closePath(); pinta(g, C.raiz, 2.6);
    if (f2) bola(g, x + s * 4, 4 - h, 2.4, C.acento, 0);
  }
  function solCarregado(g, x, y, o, C, f2) {
    const r = 4 + o.carga * 9;
    carregar(g, x, y, 22, f2 ? C.acento : C.sol, o);
    g.save(); g.translate(x, y); g.rotate(o.t * 2 * o.mov);
    for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); poligono(g, [-r * .35, -r * 1.05, 0, -r * 1.7, r * .35, -r * 1.05], C.sol, 2); }
    g.restore();
    bola(g, x, y, r, C.sol, 2.6); reflexo(g, x - r * .3, y - r * .35, r * .35, r * .22, .8);
  }
  function girassol(g, o, C) {
    const f2 = o.fase === 2, t = o.t, mov = o.mov, gp = o.golpe;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const inclina = Math.sin(t * 1.5) * .05 * mov + (o.est === 'ferido' ? -.14 : 0) + (at1 ? gp * .14 : 0);
    const braco = at2 ? .4 - gp * (gp < 0 ? 1.4 : .5) : carr ? 1.25 + o.carga * .2 : .3 + Math.sin(t * 2) * .1 * mov;
    const topo = -56 + o.respira * .5;
    // raízes que servem de pés
    for (const s of [-1, 1]) {
      traco2(g, C.raiz, 4, () => { g.moveTo(s * 4, -5); g.quadraticCurveTo(s * 16, -2, s * 30, 1); });
      traco2(g, C.raiz, 3, () => { g.moveTo(s * 6, -9); g.quadraticCurveTo(s * 12, -2, s * 17, 3); });
    }
    // caule
    g.beginPath(); g.moveTo(-10, -2); g.quadraticCurveTo(-4, topo * .5, -7, topo); g.lineTo(7, topo); g.quadraticCurveTo(4, topo * .5, 10, -2); g.closePath(); pinta(g, C.caule);
    traco(g, C.caule2, 2.2, () => { g.moveTo(4, -6); g.quadraticCurveTo(2, topo * .5, 4, topo + 4); });
    if (f2) racha(g, -3, -12, -1.35, 24, C.acento);
    // folhas-braços
    for (const s of [-1, 1]) folha(g, s * 6, -32, s, braco + Math.sin(t * 2.3 + s) * .05 * mov, 34, 12, C.folha, C.veia, f2);
    // cabeça
    g.save(); g.translate(0, topo); g.rotate(inclina);
    const cy = -20, sx = o.fx ? .8 : 1, n = o.simples ? 9 : 13, gira = Math.sin(t * .8) * .05 * mov;
    const pul = o.respira * .6 + (at1 ? gp * 2.5 : 0) + o.carga * 4;
    if (carr) aura(g, 0, cy, 58 + o.carga * 30, f2 ? C.acento : C.sol, .2 + o.carga * .45);
    else if (f2) aura(g, 0, cy, 58, C.acento, .3);
    petalas(g, 0, cy, n, 19, 44 + pul, 9, C.petala2, gira + Math.PI / n, sx);
    petalas(g, 0, cy, n, 17, 37 + pul, 7.5, C.petala, gira, sx);
    if (o.costas) {
      petalas(g, 0, cy, 7, 10, 24, 6, C.caule, .2, sx);
      bola(g, 0, cy, 15, C.caule2);
      if (f2) racha(g, -8, cy - 6, .4, 14, C.acento);
    } else {
      const fx = o.fx * 5;
      elipse(g, fx * .4, cy, 22 * sx, 22, C.miolo);
      if (!o.simples) for (let i = 14; i < 30; i++) { const a = i * 2.4, r = Math.sqrt(i / 30) * 19; bola(g, fx * .4 + Math.cos(a) * r * sx, cy + Math.sin(a) * r, 1.2, C.ponto, 0); }
      reflexo(g, fx * .4 - 9, cy - 13, 6, 3.4, .35);
      const k = { pele: C.miolo, esclera: C.olho, iris: C.iris, brilho: f2 ? C.acento : carr ? C.sol : null, raiva: .5 };
      olho(g, fx - 8, cy - 4, 6.5, 7.5, o, -1, k);
      olho(g, fx + 8, cy - 4, 6.5, 7.5, o, 1, k);
      boca(g, fx, cy + 9, 17, 9, o, at1 ? Math.max(0, gp) : at2 ? .4 : carr ? .15 : o.est === 'ferido' ? .7 : 0, C.boca);
      if (f2) { racha(g, fx * .4 + 11, cy - 12, -.7, 11, C.acento); racha(g, fx * .4 - 14, cy + 9, 2.5, 10, C.acento); }
    }
    g.restore();
    // ataque1: chuva de sementes cuspidas
    if (at1 && o.voo > 0) {
      const bx = Math.sin(inclina) * 11, by = topo - 11;
      for (let i = -1; i <= 1; i++) {
        const u = o.voo, s = 1 + u * .9;
        g.save(); g.globalAlpha *= 1 - u * .4; g.translate(bx + i * u * 42, by + u * 48); g.scale(s, s); g.rotate(-i * .5);
        if (f2) aura(g, 0, 0, 10, C.acento, .55);
        elipse(g, 0, 0, 3.6, 5.2, C.semente, 2.2); reflexo(g, -1, -2, 1.2, 1.8, .7, 0);
        g.restore();
      }
    }
    // ataque2: raízes saindo do chão
    if (at2) { const h = Math.max(0, gp) * 36; for (const [x, k] of [[-48, .8], [-26, 1], [26, 1], [48, .8]]) espinhoRaiz(g, x, h * k, C, f2); }
    // carregando: sol crescendo acima da cabeça
    if (carr) solCarregado(g, 0, topo - 72, o, C, f2);
    if (f2) faiscas(g, o, 0, topo - 24, 44, C.acento, 5);
  }

  /* ---------- 2. Coruja das Trevas (Floresta) ---------- */
  const CORUJA = { corpo: '#5B3A9E', corpo2: '#43297A', barriga: '#8E6CD1', escama: '#6E4CB5', disco: '#B79AF0', asa: '#3E2672', asa2: '#2A1952', ouro: '#F2C14E', ouro2: '#C9922A', olho: '#FFE066', iris: '#FF9F1C', brilho: '#FFD84A', pena: '#7A55C8', acento: '#B07CFF', acento2: '#22E8FF' };
  const CORUJA2 = { ...CORUJA, corpo: '#4A2C88', disco: '#9D7BE6', olho: '#F2FFFF', iris: '#22E8FF', brilho: '#22E8FF' };

  function asaCoruja(g, s, ang, C, f2) {
    g.save(); g.scale(s, 1); g.translate(26, -64); g.rotate(-ang);
    g.beginPath(); g.moveTo(-4, 0); g.quadraticCurveTo(18, 8, 16, 36); g.quadraticCurveTo(14, 46, 8, 42); g.quadraticCurveTo(4, 50, -1, 43);
    g.quadraticCurveTo(-5, 48, -8, 38); g.quadraticCurveTo(-12, 14, -4, 0); g.closePath(); pinta(g, C.asa);
    traco(g, C.asa2, 2, () => { g.moveTo(8, 12); g.quadraticCurveTo(11, 26, 8, 40); g.moveTo(1, 14); g.quadraticCurveTo(3, 28, -1, 42); });
    if (f2) traco(g, C.acento2, 2.2, () => { g.moveTo(14, 37); g.lineTo(9, 42); g.moveTo(4, 41); g.lineTo(-1, 44); });
    g.restore();
  }
  function pena(g, x, y, ang, s, C, f2, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(-ang); g.scale(s, s);
    if (f2) aura(g, 0, 0, 12, C.acento2, .45);
    elipse(g, 0, 0, 3.2, 8, C.pena, 2); traco(g, TINTA, 1.3, () => { g.moveTo(0, -7); g.lineTo(0, 11); });
    g.restore();
  }
  function coruja(g, o, C) {
    const f2 = o.fase === 2, t = o.t, mov = o.mov, gp = o.golpe;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const abre = at1 ? (gp < 0 ? .2 - gp * .6 : .55 + gp * .9) : at2 ? (gp < 0 ? 1.15 : -.2) : carr ? 1 + o.carga * .45 : o.est === 'ferido' ? .75 : .12 + Math.sin(t * 3) * .08 * mov;
    const cy = -50 + o.respira;
    g.save();
    // ataque2: sobe no preparo e mergulha para a frente (fica maior)
    if (at2) { const s = 1 + Math.max(0, gp) * .25; g.translate(0, gp < 0 ? gp * 34 : gp * 6); g.translate(0, -50); g.scale(s, s); g.translate(0, 50); }
    for (const s of [-1, 1]) asaCoruja(g, s, abre, C, f2);
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) traco2(g, C.ouro, 2.6, () => { g.moveTo(s * 12, -7); g.lineTo(s * 12 + i * 4, 0); });
    // tufos dourados ("chifres")
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 13, cy - 36); g.quadraticCurveTo(s * 30, cy - 50, s * 36, cy - 64); g.quadraticCurveTo(s * 30, cy - 46, s * 31, cy - 28); g.closePath(); pinta(g, C.ouro);
      if (f2) aura(g, s * 35, cy - 62, 10, C.acento2, .7);
    }
    elipse(g, 0, cy, 36, 44, C.corpo);
    reflexo(g, -18, cy - 24, 8, 12, .2);
    if (o.costas) {
      for (let i = 0; i < 3; i++) traco(g, C.corpo2, 2.6, () => { const y = cy - 8 + i * 12; g.moveTo(-14, y); g.lineTo(0, y + 7); g.lineTo(14, y); });
      if (f2) racha(g, -20, cy - 18, .8, 16, C.acento2);
    } else {
      elipse(g, 0, cy + 14, 23, 26, C.barriga, 2.5);
      if (!o.simples) for (let r = 0; r < 3; r++) {
        const q = r % 2 ? 2 : 3;
        for (let j = 0; j < q; j++) { const x = (j - (q - 1) / 2) * 11, y = cy + 6 + r * 9; traco(g, C.escama, 2, () => { g.moveTo(x - 4, y); g.quadraticCurveTo(x, y + 4.5, x + 4, y); }); }
      }
      const fx = o.fx * 6, ey = cy - 18;
      for (const s of [-1, 1]) elipse(g, fx + s * 14, ey, 16, 15, C.disco, 2.5);
      if (carr) for (const s of [-1, 1]) carregar(g, fx + s * 14, ey, 16, C.brilho, o);
      // olhos-lanterna
      const r = 10.5 + o.carga * 1.5, k = { pele: C.disco, esclera: C.olho, iris: C.iris, brilho: C.brilho, raiva: .38, pupila: .3 };
      olho(g, fx - 14, ey, r, r, o, -1, k); olho(g, fx + 14, ey, r, r, o, 1, k);
      const ab = at1 || at2 ? Math.max(0, gp) * 4 : o.est === 'ferido' ? 3 : 0;
      poligono(g, [fx - 4, ey + 10 + ab * .5, fx + 4, ey + 10 + ab * .5, fx, ey + 17 + ab], C.ouro2, 2.2);
      poligono(g, [fx - 5.5, ey + 6, fx + 5.5, ey + 6, fx, ey + 15], C.ouro, 2.4);
      if (f2) { racha(g, -24, cy + 4, 2.3, 15, C.acento2); racha(g, 22, cy + 16, .7, 13, C.acento2); }
    }
    g.restore();
    // ataque1: rajada de penas em leque
    if (at1 && o.voo > 0) for (let i = 0; i < 5; i++) {
      const a = (i - 2) * .45, u = lim(o.voo * 1.15 - Math.abs(i - 2) * .06), d = 18 + u * 62;
      pena(g, Math.sin(a) * d, cy - 4 + Math.cos(a) * d * .7, a, .8 + u, C, f2, 1 - u * .5);
    }
    if (at2 && gp > 0) {
      g.save(); g.globalAlpha *= gp;
      for (const x of [-22, 0, 22]) traco(g, f2 ? C.acento2 : C.acento, 2.6, () => { g.moveTo(x, -128); g.lineTo(x, -108 + Math.abs(x) * .3); });
      g.restore();
    }
    if (o.est === 'ferido' && !o.simples) { pena(g, -44, cy - 10 + Math.sin(t * 3) * 4, .9, .8, C, f2, .85); pena(g, 44, cy + 4 - Math.sin(t * 3) * 4, -.7, .7, C, f2, .85); }
    if (f2) faiscas(g, o, 0, cy - 10, 46, C.acento2, 5);
  }

  /* ---------- 3. Rainha Maré (Praia) ---------- */
  const RAINHA = { corpo: '#E8463A', corpo2: '#B92E2A', claro: '#FF8A72', concha: '#3A7BD5', concha2: '#2A5BB0', espinho: '#7FB2FF', ouro: '#F2C14E', gema: '#2E9BFF', perola: '#FFF4E6', conchinha: '#FFB3C1', olho: '#FFFFFF', iris: '#2A1A3A', boca: '#5A1020', agua: '#2EE6D6', espuma: '#E9FFFC', acento: '#FF6F61', acento2: '#2EE6D6' };
  const RAINHA2 = { ...RAINHA, corpo: '#D23A33', olho: '#E0F6FF', iris: '#2E9BFF', gema: '#6FE9FF' };

  function garra(g, x, y, s, ang, esc, abre, C) {
    g.save(); g.translate(x, y); g.scale(s * esc, esc); g.rotate(ang);
    for (const k of [-1, 1]) {
      g.save(); g.translate(0, -12); g.rotate(-k * (.12 + abre * .45)); g.scale(k, 1);
      g.beginPath(); g.moveTo(-1, 2); g.quadraticCurveTo(-12, -12, 1, -26); g.quadraticCurveTo(-1, -12, 8, 1); g.closePath(); pinta(g, C.corpo, 2.6);
      g.restore();
    }
    elipse(g, 0, -5, 12, 13, C.corpo, 2.8);
    reflexo(g, -4, -10, 4, 3, .45);
    g.restore();
  }
  function conchinha(g, x, y, r, C) {
    g.beginPath(); g.moveTo(x, y + r * .7); g.arc(x, y, r, Math.PI * 1.08, Math.PI * 1.92); g.closePath(); pinta(g, C.conchinha, 1.8);
    traco(g, TINTA, 1.1, () => { for (const a of [-.5, 0, .5]) { g.moveTo(x, y + r * .6); g.lineTo(x + Math.sin(a) * r * .9, y - Math.cos(a) * r * .9); } });
  }
  function ondas(g, o, C, forca) {
    for (let i = 0; i < 2; i++) {
      const u = o.mov ? (o.t * .8 + i * .5) % 1 : .3 + i * .4, r = 34 + u * 56, ry = r * .22;
      g.save(); g.globalAlpha *= (1 - u) * forca;
      traco(g, C.agua, 4, () => g.ellipse(0, 2, r, ry, 0, 0, TAU));
      traco(g, C.espuma, 1.6, () => g.ellipse(0, 1, r, ry, 0, 0, TAU));
      g.restore();
    }
  }
  function crista(g, x, h, s, C) {
    if (h < 3) return;
    g.beginPath(); g.moveTo(x - s * 14, 3);
    g.quadraticCurveTo(x - s * 12, -h, x + s * 6, -h * .95);
    g.quadraticCurveTo(x + s * 13, -h * .8, x + s * 7, -h * .55);
    g.quadraticCurveTo(x + s * 2, -h * .35, x + s * 12, 3);
    g.closePath(); pinta(g, C.agua, 2.6);
    traco(g, C.espuma, 2.2, () => { g.moveTo(x - s * 9, -h * .7); g.quadraticCurveTo(x - s * 4, -h * .98, x + s * 6, -h * .9); });
  }
  function rainha(g, o, C) {
    const f2 = o.fase === 2, t = o.t, mov = o.mov, gp = o.golpe;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const by = o.respira * .6, fx = o.fx * 5;
    const casca = (y, k) => { // casco azul espinhoso
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.1 + i * .133), c = Math.cos(a), s = Math.sin(a);
        poligono(g, [c * 30 * k - s * 5, y + s * 21 * k + c * 5, c * 46 * k, y + s * 34 * k, c * 30 * k + s * 5, y + s * 21 * k - c * 5], C.espinho, 2.4);
      }
      elipse(g, 0, y, 34 * k, 24 * k, C.concha);
      traco(g, C.concha2, 2.2, () => { for (const a of [-.9, -.3, .3, .9]) { g.moveTo(0, y + 14 * k); g.lineTo(Math.sin(a) * 30 * k, y - Math.cos(a) * 20 * k); } });
      reflexo(g, -12 * k, y - 12 * k, 8 * k, 4 * k, .35);
      if (f2) racha(g, 14 * k, y - 14 * k, 2.3, 14 * k, C.acento2);
    };
    const garras = () => {
      for (const s of [-1, 1]) {
        let wx = s * 50, wy = -52 + by + Math.sin(t * 2 + s) * 2 * mov, ang = .35, esc = 1, ab = .3 + Math.sin(t * 3 + s) * .2 * mov;
        if (at2 || carr) { wx = s * 46; wy = (at2 ? (gp < 0 ? -80 : mix(-74, -60, gp)) : -76) + by; ab = .85; ang = .1; }
        if (at1 && s === 1) { // ataque1: a garra direita avança e fecha
          if (gp < 0) { const k = -gp / .6; wx = 50 + 6 * k; wy = -52 - 12 * k + by; ab = .3 + .6 * k; }
          else { wx = mix(50, 22, gp); wy = mix(-52, -30, gp) + by; esc = 1 + .55 * gp; ab = .3 * (1 - gp); ang = mix(.35, -.3, gp); }
        }
        if (o.est === 'ferido') { wy = -44 + by; ab = .9; }
        traco2(g, C.corpo2, 5, () => { g.moveTo(s * 32, -36 + by); g.quadraticCurveTo(s * 46, -36 + by, wx, wy + 4); });
        garra(g, wx, wy, s, ang, esc, ab, C);
        if (at1 && s === 1 && gp > .75) estrela(g, wx - 6, wy - 36 * esc, 12, C.espuma, (gp - .75) * 4);
      }
    };
    if (f2 || at2) ondas(g, o, C, at2 ? 1 : .5);
    if (!o.costas) casca(-52 + by, 1);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      traco2(g, C.corpo2, 3.2, () => { g.moveTo(s * (20 + i * 6), -18 + by); g.lineTo(s * (38 + i * 7), -22 + i * 2 + Math.sin(t * 6 + i + s) * 1.5 * mov); g.lineTo(s * (42 + i * 8), 0); });
    }
    elipse(g, 0, -34 + by, 40, 25, C.corpo);
    reflexo(g, -16, -46 + by, 12, 5, .35, -.2);
    if (!o.simples) for (const [x, y] of [[-22, -30], [24, -34], [-8, -46]]) bola(g, x, y + by, 2.2, C.claro, 0);
    if (f2) { racha(g, -30, -36 + by, .5, 14, C.acento2); racha(g, 26, -24 + by, 2.6, 12, C.acento2); }
    if (o.costas) casca(-42 + by, 1.15);
    // olhos nas hastes
    const sw = Math.sin(t * 1.7) * 1.5 * mov;
    for (const s of [-1, 1]) {
      const ex = s * 19 + sw + fx, ey = -79 + by;
      traco2(g, C.corpo2, 3, () => { g.moveTo(s * 11, -56 + by); g.quadraticCurveTo(s * 13, -66 + by, ex, ey + 5); });
      if (o.costas) bola(g, ex, ey, 7, C.corpo, 2.6);
      else olho(g, ex, ey, 7, 7.5, o, s, { pele: C.corpo, esclera: C.olho, iris: C.iris, brilho: f2 ? C.gema : null, raiva: .45 });
    }
    // coroa de conchas com gema azul
    if (carr) carregar(g, 0, -63 + by, 18, C.gema, o, C.espuma);
    else if (f2) aura(g, 0, -63 + by, 16, C.gema, .65);
    coroa(g, 0, -55 + by, 13, 22, C.ouro, C.gema, C.perola);
    if (!o.simples) for (const s of [-1, 1]) conchinha(g, s * 9, -57.5 + by, 3.4, C);
    if (!o.costas) {
      boca(g, fx, -36 + by, 20, 9, o, at1 ? Math.max(0, gp) * .8 : at2 ? .6 : carr ? .2 : o.est === 'ferido' ? .7 : 0, C.boca);
      if (!o.simples) traco(g, TINTA, 2, () => { g.moveTo(fx - 14, -39 + by); g.lineTo(fx - 17, -34 + by); g.moveTo(fx + 14, -39 + by); g.lineTo(fx + 17, -34 + by); });
    }
    garras();
    // ataque2: ondas que se levantam dos lados
    if (at2 && gp > 0) for (const s of [-1, 1]) crista(g, s * 62, gp * 36, s, C);
    if (f2) faiscas(g, o, 0, -62, 50, C.acento2, 4);
  }

  /* ---------- 4. Capitão Brasa (Vulcão) ---------- */
  const BRASA = { rocha: '#3E3550', rocha2: '#2C2540', rocha3: '#5A4E70', lava: '#FF9A3D', lava2: '#FF3B3B', lavaClaro: '#FFE08A', capa: '#E5402A', capa2: '#FF8A2A', capa3: '#FFD24A', ouro: '#F2C14E', gema: '#FF3B3B', olho: '#FFE7A0', iris: '#FF7A1A', brilho: '#FF9A3D', brilhoMartelo: '#FF9A3D', cabo: '#5A3A2A', boca: '#5A140C' };
  const BRASA2 = { ...BRASA, capa: '#2F5BFF', capa2: '#3FA2FF', capa3: '#BFF4FF', olho: '#E6FBFF', iris: '#3FA2FF', brilho: '#3FA2FF', brilhoMartelo: '#7FD8FF' };

  function martelo(g, x, y, ang, o, C, brilho) {
    g.save(); g.translate(x, y); g.rotate(ang);
    caixa(g, -3, -40, 6, 52, 3, C.cabo, 2.4);
    if (brilho > 0) aura(g, 0, -48, 24 + brilho * 26, C.brilhoMartelo, .3 + brilho * .6);
    caixa(g, -17, -58, 34, 20, 6, C.rocha3, 2.8);
    racha(g, -13, -50, -.25, 13, C.lava); racha(g, 13, -46, 2.8, 10, C.lava);
    bola(g, 0, -48, 3.4, C.lavaClaro, 1.6);
    g.restore();
  }
  function capaFogo(g, o, C) {
    const t = o.t, mov = o.mov, n = o.simples ? 5 : 8;
    const forma = (k, cor, linha) => {
      g.beginPath(); g.moveTo(-22 * k, -78); g.quadraticCurveTo(-46 * k, -54, -50 * k, -14);
      for (let i = 0; i < n; i++) {
        g.lineTo((-50 + (i + .5) * 100 / n) * k, -14 + (8 + Math.sin(t * 9 + i * 1.9) * 3 * mov) * k);
        g.lineTo((-50 + (i + 1) * 100 / n) * k, -14);
      }
      g.quadraticCurveTo(46 * k, -54, 22 * k, -78); g.closePath(); pinta(g, cor, linha);
    };
    forma(1, C.capa, 3); forma(.72, C.capa2, 0);
    for (const s of [-1, 1]) {
      chama(g, s * 46, -22, 7, 26, o, C.capa, C.capa2, C.capa3, s * 2);
      chama(g, s * 30, -74, 8, 28, o, C.capa, C.capa2, C.capa3, s * 3 + 1);
    }
  }
  function erupcao(g, x, h, o, C, i) {
    if (h < 2) return;
    chama(g, x, 6, 7 + h * .1, h, o, C.lava2, C.lava, C.lavaClaro, i * 1.7);
    for (const d of [-1, 1]) poligono(g, [x + d * 9, -h * .8, x + d * 14, -h * .8 - 4, x + d * 15, -h * .8 + 3], C.rocha2, 2);
  }
  function capitao(g, o, C) {
    const f2 = o.fase === 2, t = o.t, mov = o.mov, gp = o.golpe;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const by = o.respira * .6, S = [30, -72 + by];
    let ra = .15 + Math.sin(t * 2) * .04 * mov, ha = .3;
    if (at1) { // ataque1: ergue o martelo e bate no chão
      if (gp < 0) { const k = -gp / .6; ra = mix(.15, -2.6, k); ha = mix(.3, -.3, k); }
      else { ra = mix(.15, .3, gp); ha = mix(.3, 2.39, gp); }
    } else if (carr) { ra = -2.6; ha = -.3; }
    else if (at2) { ra = .35; ha = .9; }
    else if (o.est === 'ferido') { ra = .45; ha = .8; }
    const F = [S[0] - Math.sin(ra) * 26, S[1] + Math.cos(ra) * 26], alto = ra < -1.2;
    const bracoMartelo = () => {
      traco2(g, C.rocha2, 9, () => { g.moveTo(S[0], S[1]); g.lineTo(F[0], F[1]); });
      martelo(g, F[0], F[1], ha, o, C, carr ? o.carga : f2 ? .3 : 0);
      bola(g, F[0], F[1], 8.5, C.rocha3, 2.6);
    };
    g.save();
    if (at2) g.scale(gp > 0 ? 1 + gp * .08 : 1, gp < 0 ? 1 - gp * .08 : 1 - gp * .1); // pisão
    if (!o.costas) capaFogo(g, o, C);
    if (alto) bracoMartelo();
    for (const s of [-1, 1]) { caixa(g, s * 15 - 9, -28, 18, 26, 6, C.rocha2); elipse(g, s * 15, -3, 12, 5, C.rocha2, 2.6); }
    caixa(g, -28, -80 + by, 56, 56, 16, C.rocha);
    reflexo(g, -14, -66 + by, 7, 11, .18, -.3);
    caixa(g, -28, -38 + by, 56, 8, 3, C.rocha2, 2.4);
    racha(g, -16, -68 + by, .5, 16, C.lava); racha(g, 12, -52 + by, 2.4, 14, C.lava);
    if (f2) { aura(g, -6, -60 + by, 24, C.lava, .4); racha(g, -22, -46 + by, -.4, 14, C.lava2); racha(g, 18, -74 + by, 2.7, 12, C.lava2); }
    if (o.costas) capaFogo(g, o, C);
    for (const s of [-1, 1]) bola(g, s * 30, -74 + by, 11, C.rocha3);
    traco2(g, C.rocha2, 9, () => { g.moveTo(-30, -70 + by); g.lineTo(-38, -46 + by); });
    bola(g, -38, -44 + by, 9, C.rocha3);
    const fx = o.fx * 5;
    caixa(g, -19, -108 + by, 38, 30, 11, C.rocha3);
    if (!o.costas) {
      const k = { pele: C.rocha3, esclera: C.olho, iris: C.iris, brilho: C.brilho, raiva: .55, pupila: .26 };
      olho(g, fx - 8, -95 + by, 5.5, 4.8, o, -1, k); olho(g, fx + 8, -95 + by, 5.5, 4.8, o, 1, k);
      boca(g, fx, -85 + by, 15, 7, o, at1 || at2 ? Math.max(0, gp) * .8 : carr ? .35 : o.est === 'ferido' ? .7 : 0, C.boca);
    }
    if (f2) racha(g, 11, -105 + by, 2.1, 9, C.lava2);
    coroa(g, 0, -106 + by, 13, 14, C.ouro, C.gema, null);
    if (f2 && !o.simples) for (const x of [-13, 0, 13]) chama(g, x, -106 + by - (x ? 10.5 : 14), 2.6, 9, o, C.capa, C.capa2, null, x);
    if (!alto) bracoMartelo();
    g.restore();
    if (at1 && gp > .7) { // impacto do martelo
      const a = (gp - .7) / .3;
      racha(g, 56, 2, 0, 22 * a, C.lava); racha(g, 56, 2, Math.PI, 22 * a, C.lava);
      chama(g, 46, 3, 5, 16 * a, o, C.lava2, C.lava, null, 3); chama(g, 66, 3, 5, 13 * a, o, C.lava2, C.lava, null, 5);
      estrela(g, 56, -6, 16 * a, C.lavaClaro, a);
    }
    if (at2) { // ataque2: explosão no chão
      const h = Math.max(0, gp) * 44;
      if (h > 0) { racha(g, 0, 3, .12, 46 * gp, C.lava); racha(g, 0, 3, Math.PI - .12, 46 * gp, C.lava); }
      [[-48, .8], [48, .8], [-22, 1], [22, 1]].forEach(([x, k], i) => erupcao(g, x, h * k, o, C, i));
    }
    if (carr) carregar(g, F[0] + Math.sin(ha) * 48, F[1] - Math.cos(ha) * 48, 18, C.brilhoMartelo, o);
    if (f2) faiscas(g, o, 0, -72, 48, C.capa3, 6);
  }

  /* ---------- 5. Cavaleiro Eclipse (Castelo) ---------- */
  const ECLIPSE = { prata: '#C9D3E6', prata2: '#8E9AB8', ouro: '#F2C14E', visor: '#140B2A', luzOlho: '#8FA3C8', capa: '#6A3FB5', capa2: '#4A2A86', escudo: '#2C3E78', lua: '#F2C14E', lamina: '#E6ECF7', cabo: '#3A2A5A', roxo: '#B07CFF' };
  const ECLIPSE2 = { ...ECLIPSE, luzOlho: '#FFE38A', capa: '#5A2FA8', prata2: '#7D88A8' };

  function espada(g, x, y, ang, o, C, brilho) {
    g.save(); g.translate(x, y); g.rotate(ang);
    if (brilho > 0) aura(g, 0, -30, 20 + brilho * 22, C.ouro, .25 + brilho * .55);
    poligono(g, [-3.6, -7, 3.6, -7, 3, -46, 0, -55, -3, -46], C.lamina, 2.4);
    traco(g, C.prata2, 1.4, () => { g.moveTo(0, -10); g.lineTo(0, -44); });
    caixa(g, -10, -9, 20, 4.5, 2, C.ouro, 2.2);
    caixa(g, -2.2, -5, 4.4, 11, 2, C.cabo, 2);
    bola(g, 0, 8, 2.8, C.ouro, 2);
    g.restore();
  }
  function escudo(g, x, y, esc, o, C, f2) {
    g.save(); g.translate(x, y); g.scale(esc, esc);
    g.beginPath(); g.moveTo(-15, -17); g.lineTo(15, -17); g.quadraticCurveTo(16, 8, 0, 21); g.quadraticCurveTo(-16, 8, -15, -17); g.closePath(); pinta(g, C.escudo);
    g.beginPath(); g.moveTo(-11, -13); g.lineTo(11, -13); g.quadraticCurveTo(12, 6, 0, 16); g.quadraticCurveTo(-12, 6, -11, -13); g.closePath();
    g.lineWidth = 2 * esp; g.strokeStyle = C.ouro; g.stroke();
    if (f2) { // a lua vira eclipse: disco escuro com anel de luz
      aura(g, 0, 0, 18 + o.carga * 10, C.ouro, .75);
      bola(g, 0, 0, 7.5, C.visor, 0);
      traco(g, C.ouro, 2.4, () => g.arc(0, 0, 8.2, 0, TAU));
      traco(g, '#FFF6D6', 1, () => g.arc(0, 0, 8.2, -1.2, .2));
    } else {
      if (o.carga > 0) aura(g, 0, 0, 12 + o.carga * 12, C.lua, .3 + o.carga * .5);
      crescente(g, 1.5, 0, 8, C.lua, Math.PI, 2);
    }
    reflexo(g, -8, -10, 3, 5, .35, .2);
    g.restore();
  }
  function capaCavaleiro(g, o, C, k) {
    const onda = s => Math.sin(o.t * 2.5 + s) * 3 * o.mov;
    g.beginPath(); g.moveTo(-22, -76); g.quadraticCurveTo(-42 * k, -44, -44 * k + onda(0), -4);
    g.quadraticCurveTo(-22 * k, 2 + onda(1), 0, -4); g.quadraticCurveTo(22 * k, 2 + onda(2), 44 * k + onda(3), -4);
    g.quadraticCurveTo(42 * k, -44, 22, -76); g.closePath(); pinta(g, C.capa);
    traco(g, C.capa2, 2.2, () => { g.moveTo(-14, -60); g.quadraticCurveTo(-24 * k, -30, -26 * k, -8); g.moveTo(14, -60); g.quadraticCurveTo(24 * k, -30, 26 * k, -8); });
  }
  function cavaleiro(g, o, C) {
    const f2 = o.fase === 2, t = o.t, mov = o.mov, gp = o.golpe;
    const at1 = o.est === 'ataque1', at2 = o.est === 'ataque2', carr = o.est === 'carregando';
    const by = o.respira * .5, S = [28, -70 + by];
    let ra = .2 + Math.sin(t * 2) * .04 * mov, sa = .22;
    if (at1) { // ataque1: corte de espada na diagonal
      if (gp < 0) { const k = -gp / .6; ra = mix(.2, -2.4, k); sa = mix(.22, -.5, k); }
      else { ra = mix(.2, .6, gp); sa = mix(.22, 2.2, gp); }
    } else if (carr) { ra = -2.9; sa = -.05; }
    else if (o.est === 'ferido') { ra = .5; sa = .9; }
    const F = [S[0] - Math.sin(ra) * 24, S[1] + Math.cos(ra) * 24], alto = ra < -1.2;
    let ex = -34, ey = -50 + by, ee = 1;
    if (at2) { // ataque2: investida de escudo
      if (gp < 0) { const k = -gp / .6; ex = mix(-34, -42, k); ee = mix(1, .92, k); }
      else { ex = mix(-34, -6, gp); ey = mix(-50, -46, gp) + by; ee = 1 + .75 * gp; }
    }
    const bracoEspada = () => {
      traco2(g, C.prata2, 8, () => { g.moveTo(S[0], S[1]); g.lineTo(F[0], F[1]); });
      espada(g, F[0], F[1], sa, o, C, carr ? o.carga : 0);
      bola(g, F[0], F[1], 6.5, C.prata, 2.4);
    };
    const bracoEscudo = () => {
      traco2(g, C.prata2, 8, () => { g.moveTo(-27, -70 + by); g.lineTo(ex + 4, ey); });
      escudo(g, ex, ey, ee, o, C, f2);
    };
    g.save();
    if (at2 && gp > 0) { const s = 1 + gp * .06; g.translate(0, -50); g.scale(s, s); g.translate(0, 50); }
    if (o.costas) { bracoEspada(); bracoEscudo(); }
    else { capaCavaleiro(g, o, C, f2 ? 1.08 : 1); if (alto) bracoEspada(); }
    for (const s of [-1, 1]) { caixa(g, s * 13 - 7, -32, 14, 30, 5, C.prata2); elipse(g, s * 13, -3, 10, 4.5, C.prata, 2.6); }
    caixa(g, -26, -80 + by, 52, 50, 14, C.prata);
    caixa(g, -24, -36 + by, 48, 10, 4, C.prata2, 2.4);
    traco(g, C.ouro, 2.4, () => { g.moveTo(0, -76 + by); g.lineTo(0, -42 + by); g.moveTo(-20, -46 + by); g.quadraticCurveTo(0, -40 + by, 20, -46 + by); });
    reflexo(g, -13, -66 + by, 6, 11, .4, -.2);
    if (f2) { racha(g, -16, -66 + by, .6, 14, C.roxo); racha(g, 14, -50 + by, 2.5, 13, C.roxo); }
    for (const s of [-1, 1]) {
      elipse(g, s * 27, -73 + by, 14, 10, C.prata);
      traco(g, C.ouro, 2, () => g.ellipse(s * 27, -71 + by, 10, 6, 0, Math.PI * 1.1, Math.PI * 1.9));
    }
    if (o.costas) capaCavaleiro(g, o, C, 1);
    // elmo sem rosto: só o visor escuro com duas luzes
    const hy = -96 + by, fx = o.fx * 5;
    elipse(g, 0, hy, 19, 21, C.prata);
    if (o.costas) traco(g, C.prata2, 2.2, () => { g.moveTo(0, hy - 19); g.lineTo(0, hy + 18); });
    else {
      caixa(g, fx - 13, hy - 7, 26, 17, 8, C.visor, 2.6);
      const luz = (f2 ? 1 : .5) + o.carga * .5;
      for (const s of [-1, 1]) {
        const x = fx + s * 6, y = hy + 1;
        if (o.est === 'morrendo') rodamoinho(g, x, y, 3.2, t * mov, C.luzOlho);
        else if (o.est === 'ferido') traco(g, C.luzOlho, 2, () => { g.moveTo(x + s * 2.5, y - 2.5); g.lineTo(x - s * 2.5, y); g.lineTo(x + s * 2.5, y + 2.5); });
        else { aura(g, x, y, 6 + luz * 7, C.luzOlho, .3 + luz * .45); elipse(g, x, y, 3.8, o.pisca ? .5 : 1.6, C.luzOlho, 0, -s * .25); }
      }
    }
    reflexo(g, -9, hy - 12, 5, 7, .45, -.4);
    if (f2) { racha(g, 9, hy - 14, 2.2, 9, C.roxo); aura(g, 0, hy - 26, 16, C.ouro, .5); }
    crescente(g, 0, hy - 26, 9, C.ouro, -Math.PI / 2, 2.4);
    if (!o.costas) { bracoEscudo(); if (!alto) bracoEspada(); }
    g.restore();
    if (at1 && gp > .2) { // rastro do corte em meia-lua
      g.save(); g.globalAlpha *= lim((gp - .2) / .5);
      traco(g, C.ouro, 7, () => g.arc(-45, -105, 85, -.06, 1.51));
      traco(g, '#FFFFFF', 2.6, () => g.arc(-45, -105, 85, -.06, 1.51));
      g.restore();
    }
    if (at2 && gp > .3) {
      g.save(); g.globalAlpha *= gp;
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; traco(g, C.ouro, 2.2, () => { g.moveTo(ex + Math.cos(a) * 24 * ee, ey + Math.sin(a) * 24 * ee); g.lineTo(ex + Math.cos(a) * 33 * ee, ey + Math.sin(a) * 33 * ee); }); }
      g.restore();
    }
    if (carr) carregar(g, F[0] + Math.sin(sa) * 44, F[1] - Math.cos(sa) * 44, 18, C.ouro, o);
    if (f2) faiscas(g, o, 0, -44, 46, C.roxo, 5);
  }

  /* ---------- registro ---------- */
  const CHEFES = [
    { id: 'girassolFurioso', nome: 'Girassol Furioso', bioma: 'campo', tema: 'Natural', acento: ['#3DDC84', '#A8FFCB'], w: 104, h: 124, semente: .3,
      ataques: { ataque1: 'chuva de sementes', ataque2: 'raízes do chão', carregando: 'sol carregado' }, cores: GIRASSOL, cores2: GIRASSOL2, desenho: girassol },
    { id: 'corujaTrevas', nome: 'Coruja das Trevas', bioma: 'floresta', tema: 'Negativo', acento: ['#B07CFF', '#22E8FF'], w: 104, h: 116, semente: 1.1,
      ataques: { ataque1: 'rajada de penas', ataque2: 'mergulho', carregando: 'olhos-lanterna' }, cores: CORUJA, cores2: CORUJA2, desenho: coruja },
    { id: 'rainhaMare', nome: 'Rainha Maré', bioma: 'praia', tema: 'Tabuada', acento: ['#FF6F61', '#2EE6D6'], w: 128, h: 92, semente: 2.2,
      ataques: { ataque1: 'garra', ataque2: 'ondas', carregando: 'gema da maré' }, cores: RAINHA, cores2: RAINHA2, desenho: rainha },
    { id: 'capitaoBrasa', nome: 'Capitão Brasa', bioma: 'vulcao', tema: 'Divisão', acento: ['#FF9A3D', '#FF3B3B'], w: 116, h: 124, semente: 3.4,
      ataques: { ataque1: 'martelo', ataque2: 'explosão no chão', carregando: 'martelo de lava' }, cores: BRASA, cores2: BRASA2, desenho: capitao },
    { id: 'cavaleiroEclipse', nome: 'Cavaleiro Eclipse', bioma: 'castelo', tema: 'Revisão', acento: ['#8FA3C8', '#F2C14E'], w: 104, h: 132, semente: 4.6,
      ataques: { ataque1: 'corte de espada', ataque2: 'investida de escudo', carregando: 'lâmina da lua' }, cores: ECLIPSE, cores2: ECLIPSE2, desenho: cavaleiro }
  ];

  CHEFES.forEach(m => {
    Sprites.registrar(m.id, {
      nome: m.nome, w: Math.round(m.w * ESCALA), h: Math.round(m.h * ESCALA), escala: ESCALA,
      minichefe: true, fases: 2, estados: ESTADOS, vistas: ['batalha', 'mapa'], direcoes: ['baixo', 'cima', 'lado', 'esquerda'],
      bioma: m.bioma, tema: m.tema, acento: m.acento, ataques: m.ataques,
      desenhar(ctx, p, vista, t, dir, fase) {
        const o = contexto(p && typeof p === 'object' ? p : { estado: p, vista, t, dir, fase }, m.semente);
        if (!ESTADOS.includes(o.est)) Object.assign(o, { est: 'idle', flash: false, treme: 0, prog: 0, carga: 0, golpe: 0, voo: 0 });
        const C = cores(o, o.fase === 2 ? m.cores2 : m.cores);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.scale(ESCALA, ESCALA); if (o.espelho) ctx.scale(-1, 1);
        esp = o.simples ? 1.5 : .8;
        ctx.save(); ctx.globalAlpha *= 1 - o.prog * .8; sombra(ctx, m.w * .4); ctx.restore();
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
