/* Mohamed — biomas.js: a cara de cada mundo da masmorra. Só visual: nada aqui muda a jogabilidade.
   Cada bioma define cores do chão e das paredes, fundo (céu), luz (0 = breu, 1 = dia claro), clima
   (partículas) e decoração desenhada em canvas com formas simples:
   (a) manchas: variação do chão (terra, grama, areia molhada, rachaduras, cinzas) para nunca ficar liso;
   (b) enfeites: sem mecânica, só dão vida; alguns balançam ou brilham.
   Mundo 1 = campo · 2 = floresta · 3 = praia · 4 = vulcão · 5 = castelo. */

// Luz, em casas. A lanterna pode virar melhoria na vila: basta aumentar CONFIG_LUZ.lanterna.
const CONFIG_LUZ = {
  lanterna: 3.2,   // círculo de visão do herói nos biomas escuros
  visao: 6,        // quanto o herói enxerga (e revela) nos biomas claros
  tocha: 3.4,      // tocha na parede (T)
  brasa: 2.6,      // braseiro no chão (F)
  vela: 1.3,       // velas da floresta
  cristal: 1.5,    // cristais do vulcão
  lava: 1.4,       // cada casa de lava
  salvar: 1.6      // chegar perto de tocha ou braseiro salva o ponto de volta
};

const BIOMA_DO_MUNDO = ['campo', 'floresta', 'praia', 'vulcao', 'castelo']; // índice = mundo do mapa de fases

const BIOMAS = (() => {
  const TAU = Math.PI * 2;
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const oval = (g, x, y, rx, ry, a = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.fill(); };
  const traco = (g, cor, w, ...p) => {
    g.strokeStyle = cor; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.stroke();
  };
  const poli = (g, ...p) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };
  const caixa = (g, x, y, w, h, r) => {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill();
  };
  const estrela = (g, x, y, r1, r2, n, giro) => {
    g.beginPath();
    for (let k = 0; k < n * 2; k++) { const r = k % 2 ? r2 : r1, a = giro + (k * Math.PI) / n; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath(); g.fill();
  };
  // brilho somado (só nos desenhos "brilho", que vêm depois da escuridão)
  const halo = (g, x, y, r, cor) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.globalCompositeOperation = 'source-over';
  };
  const chaminha = (g, x, y, t, v, k = 1) => {
    const f = t ? 1 + Math.sin(t * 12 + v * 9) * .15 : 1;
    halo(g, x, y, 10 * k, 'rgba(255,170,80,.45)');
    g.fillStyle = '#FFB347'; oval(g, x, y, 1.9 * k, 3.2 * k * f);
    g.fillStyle = '#FFF2C8'; oval(g, x, y + .8, .9 * k, 1.6 * k);
  };

  // ---------- (a) manchas do chão: (g, x, y, v, r) com x, y dentro da casa ----------
  const M = {
    terra: { peso: 2, desenhar: (g, x, y, v, r) => { g.fillStyle = 'rgba(122,90,52,.3)'; oval(g, x, y, 5 + 5 * r, 3 + 3 * r, v * 3); } },
    grama: { peso: 3, desenhar: (g, x, y) => { const c = 'rgba(36,92,38,.55)'; traco(g, c, 1.4, x - 3, y + 2, x - 4, y - 3); traco(g, c, 1.4, x, y + 2, x + .5, y - 4); traco(g, c, 1.4, x + 3, y + 2, x + 4.5, y - 2); } },
    trevo: { peso: 1, desenhar: (g, x, y) => { g.fillStyle = 'rgba(200,240,150,.55)'; circ(g, x, y, 1.3); circ(g, x + 4, y + 2, 1.1); } },
    musgo: { peso: 2, desenhar: (g, x, y, v, r) => { g.fillStyle = 'rgba(46,82,46,.45)'; oval(g, x, y, 5 + 4 * r, 3 + 2 * r, v * 3); } },
    folhas: { peso: 2, desenhar: (g, x, y, v) => { g.fillStyle = 'rgba(110,78,40,.6)'; oval(g, x, y, 2.6, 1.3, v * 6); oval(g, x + 5, y + 3, 2.2, 1.1, v * 3 + 1); } },
    raiz: { peso: 1, desenhar: (g, x, y, v) => traco(g, 'rgba(58,40,24,.6)', 1.6, x - 7, y + 1, x - 2, y - 2 + v * 3, x + 3, y + 1, x + 8, y - 1) },
    molhada: { peso: 2, desenhar: (g, x, y, v, r) => { g.fillStyle = 'rgba(150,118,64,.26)'; oval(g, x, y, 6 + 5 * r, 3 + 2 * r, v * 2); } },
    ondas: { peso: 2, desenhar: (g, x, y) => { g.strokeStyle = 'rgba(160,128,80,.4)'; g.lineWidth = 1.1; g.beginPath(); g.arc(x, y + 6, 7, 3.6, 5.8); g.stroke(); g.beginPath(); g.arc(x + 3, y + 10, 7, 3.6, 5.8); g.stroke(); } },
    pedrinhas: { peso: 1, desenhar: (g, x, y) => { g.fillStyle = 'rgba(120,110,100,.55)'; circ(g, x, y, 1.2); circ(g, x + 3, y + 2, .9); circ(g, x - 2, y + 3, .8); } },
    racha: { peso: 2, desenhar: (g, x, y, v) => traco(g, 'rgba(18,10,8,.65)', 1.3, x - 7, y - 2, x - 3, y + 1, x, y - 2 + v * 2, x + 4, y + 2, x + 8, y) },
    rachaQuente: { peso: 1, desenhar: (g, x, y, v) => { traco(g, 'rgba(18,10,8,.65)', 1.6, x - 6, y, x - 1, y + 2, x + 3, y - 1, x + 7, y + 1); traco(g, 'rgba(255,110,40,.3)', .8, x - 6, y, x - 1, y + 2, x + 3, y - 1, x + 7, y + 1); } },
    cinzas: { peso: 2, desenhar: (g, x, y, v, r) => { g.fillStyle = 'rgba(115,105,100,.28)'; oval(g, x, y, 5 + 4 * r, 3 + 2 * r, v * 3); } },
    lajota: { peso: 3, desenhar: (g, x, y, v, r) => { g.strokeStyle = 'rgba(16,16,24,.38)'; g.lineWidth = 1; g.strokeRect(x - 6 - 4 * r, y - 5 - 3 * r, 12 + 8 * r, 10 + 6 * r); } },
    rachaPedra: { peso: 1, desenhar: (g, x, y, v) => traco(g, 'rgba(14,14,20,.5)', 1, x - 6, y - 3, x - 1, y, x + 2, y - 2 + v * 3, x + 6, y + 3) },
    limo: { peso: 1, desenhar: (g, x, y, v, r) => { g.fillStyle = 'rgba(72,98,62,.3)'; oval(g, x, y, 4 + 3 * r, 2.5 + 2 * r, v * 3); } }
  };

  // ---------- (b) enfeites: desenhar(g, x, y, t, v, q) com x, y no meio da casa ----------
  // onde: 'livre' (qualquer chão), 'parede' (encostado na parede), 'canto' (quina) · chao: desenha por baixo
  // luz: raio de luz (só visual) · brilho: parte que acende no escuro · anima: balança, pisca ou solta fumaça
  // t = 0 quando o aluno pede menos movimento
  const flor = { onde: 'livre', peso: 3, anima: true, desenhar(g, x, y, t, v) {
    const cor = ['#FF8FB1', '#FFE066', '#FFFFFF', '#C9A7FF'][Math.floor(v * 4)];
    g.save(); g.translate(x, y + 7); g.rotate(Math.sin(t * 2 + v * 9) * .14);
    traco(g, '#2F7A32', 2, 0, 0, 0, -11);
    g.fillStyle = cor;
    for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5; circ(g, Math.cos(a) * 3.6, -11 + Math.sin(a) * 3.6, 2.5); }
    g.fillStyle = '#F59E0B'; circ(g, 0, -11, 1.8);
    g.restore();
  } };
  const cogumelo = { onde: 'parede', peso: 1.6, desenhar(g, x, y, t, v) {
    g.fillStyle = '#F4E9D0'; caixa(g, x - 2.5, y - 2, 5, 8, 2);
    g.fillStyle = v < .5 ? '#E2453C' : '#C97B3A'; g.beginPath(); g.arc(x, y - 1, 7, Math.PI, 0); g.fill();
    g.fillStyle = '#FFF4E0'; circ(g, x - 3, y - 4, 1.3); circ(g, x + 2.5, y - 5, 1.1);
  } };
  const pedra = { onde: 'livre', peso: 2, desenhar(g, x, y, t, v) {
    g.fillStyle = '#5F6B61'; oval(g, x - 2, y + 3, 7, 5);
    g.fillStyle = '#87938A'; oval(g, x - 3, y + 1.5, 5, 3.2);
    if (v > .5) { g.fillStyle = '#6F7B71'; oval(g, x + 6, y + 6, 3.5, 2.5); }
  } };
  const toco = { onde: 'parede', peso: 1.2, desenhar(g, x, y) {
    g.fillStyle = '#6B4A2B'; caixa(g, x - 7, y - 3, 14, 10, 3);
    g.fillStyle = '#B08458'; oval(g, x, y - 3, 7, 3.3);
    g.strokeStyle = '#8A6440'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 3, 3.5, 1.5, 0, 0, TAU); g.stroke();
  } };
  const poca = { onde: 'livre', chao: true, peso: 1, anima: true, desenhar(g, x, y, t, v) {
    g.fillStyle = '#3B8FC4'; oval(g, x, y + 2, 10, 5.5);
    g.fillStyle = 'rgba(190,235,255,.55)'; oval(g, x - 3 + Math.sin(t * 1.5 + v * 6) * 1.5, y + 1, 4, 1.3);
  } };

  const caveira = { onde: 'livre', peso: 1.1, desenhar(g, x, y) {
    g.fillStyle = '#E3DDCB'; circ(g, x, y, 5); caixa(g, x - 3, y + 2.5, 6, 3.5, 1.2);
    g.fillStyle = '#2A2620'; circ(g, x - 2, y - .5, 1.4); circ(g, x + 2, y - .5, 1.4); g.fillRect(x - .5, y + 1.6, 1, 1.4);
  } };
  const ossos = { onde: 'livre', peso: 1.5, desenhar(g, x, y, t, v) {
    g.save(); g.translate(x, y + 2); g.rotate(v * 3);
    traco(g, '#DCD4BF', 2.4, -6, 0, 6, 0);
    g.fillStyle = '#DCD4BF'; circ(g, -6, -1.4, 1.7); circ(g, -6, 1.4, 1.7); circ(g, 6, -1.4, 1.7); circ(g, 6, 1.4, 1.7);
    g.restore();
  } };
  const teia = { onde: 'canto', peso: 2.2, desenhar(g, x, y, t, v, q) {
    const cx = x + q[0] * 16, cy = y + q[1] * 16, base = Math.atan2(-q[1], -q[0]), cor = 'rgba(225,230,240,.32)';
    const raio = a => [cx + Math.cos(base + a) * 15, cy + Math.sin(base + a) * 15];
    for (const a of [-.7, -.25, .25, .7]) { const [px, py] = raio(a); traco(g, cor, .8, cx, cy, px, py); }
    for (const r of [6, 11]) {
      g.strokeStyle = cor; g.lineWidth = .8; g.beginPath();
      for (const a of [-.7, -.25, .25, .7]) g.lineTo(cx + Math.cos(base + a) * r, cy + Math.sin(base + a) * r);
      g.stroke();
    }
  } };
  const tronco = { onde: 'parede', peso: 1.2, desenhar(g, x, y, t, v) {
    g.fillStyle = '#4A3423'; caixa(g, x - 12, y - 1, 24, 8, 4);
    g.fillStyle = '#7A5A3A'; oval(g, x + 11, y + 3, 2.6, 3.8);
    g.fillStyle = '#2E5A30'; oval(g, x - 4 + v * 6, y - 1, 4, 1.6);
  } };
  const vela = { onde: 'livre', peso: 1.3, luz: CONFIG_LUZ.vela, tremula: true,
    desenhar(g, x, y) { g.fillStyle = '#EDE3CC'; caixa(g, x - 2.2, y - 3, 4.4, 9, 1.5); g.fillStyle = '#D6CBB2'; circ(g, x + 1.6, y + 1, 1); },
    brilho(g, x, y, t, v) { chaminha(g, x, y - 6, t, v); }
  };

  const concha = { onde: 'livre', peso: 2, desenhar(g, x, y, t, v) {
    g.fillStyle = v < .5 ? '#F7C6B5' : '#F3E1C4';
    g.beginPath(); g.moveTo(x, y + 4); g.arc(x, y + 4, 7, Math.PI * 1.08, Math.PI * 1.92); g.closePath(); g.fill();
    for (const a of [1.25, 1.42, 1.58, 1.75]) traco(g, '#D59A86', .9, x, y + 4, x + Math.cos(a * Math.PI) * 6.5, y + 4 + Math.sin(a * Math.PI) * 6.5);
  } };
  const estrelaMar = { onde: 'livre', peso: 1.6, desenhar(g, x, y, t, v) {
    g.fillStyle = v < .5 ? '#FF8A5B' : '#F2A541'; estrela(g, x, y + 2, 7.5, 3, 5, v * 6);
    g.fillStyle = 'rgba(255,225,200,.7)'; circ(g, x, y + 2, 1.4);
  } };
  const caranguejo = { onde: 'livre', peso: 1, anima: true, desenhar(g, x, y, t, v) {
    traco(g, '#B23A2A', 1.2, x - 5, y + 3, x - 8, y + 6); traco(g, '#B23A2A', 1.2, x + 5, y + 3, x + 8, y + 6);
    g.fillStyle = '#E4553F'; oval(g, x, y + 2, 6, 4); circ(g, x - 7, y - 1, 2.5); circ(g, x + 7, y - 1, 2.5);
    traco(g, '#B23A2A', 1, x - 2, y - 1, x - 2, y - 4); traco(g, '#B23A2A', 1, x + 2, y - 1, x + 2, y - 4);
    const pisca = t && (t * .7 + v * 5) % 4 < .15; // pisca de vez em quando
    g.fillStyle = '#fff';
    if (pisca) { g.fillRect(x - 3.5, y - 5, 3, 1); g.fillRect(x + .5, y - 5, 3, 1); }
    else { circ(g, x - 2, y - 5, 1.5); circ(g, x + 2, y - 5, 1.5); g.fillStyle = '#1E1240'; circ(g, x - 2, y - 5, .7); circ(g, x + 2, y - 5, .7); }
  } };
  const barco = { onde: 'parede', peso: .8, desenhar(g, x, y) {
    g.fillStyle = '#7A5233'; poli(g, x - 12, y - 1, x + 12, y - 3, x + 8, y + 7, x - 9, y + 7);
    traco(g, '#5C3D25', .9, x - 10, y + 2, x + 10, y + 1); traco(g, '#5C3D25', .9, x - 8, y + 5, x + 9, y + 4);
    traco(g, '#5C3D25', 2, x - 1, y - 2, x + 2, y - 13);
    g.fillStyle = '#E9E1CF'; poli(g, x + 2, y - 12, x + 9, y - 7, x + 2, y - 6);
  } };
  const pocaMare = { onde: 'livre', chao: true, peso: 1.2, anima: true, desenhar(g, x, y, t, v) {
    g.fillStyle = '#3FA7A3'; oval(g, x, y + 2, 10, 6);
    g.fillStyle = 'rgba(200,250,245,.5)'; oval(g, x - 3 + Math.sin(t * 1.3 + v * 5) * 1.5, y + .5, 3.5, 1.2);
    g.fillStyle = '#8C8C80'; circ(g, x + 5, y + 4, 1.4); circ(g, x - 6, y + 4, 1);
  } };

  const rocha = { onde: 'livre', peso: 2,
    desenhar(g, x, y) { g.fillStyle = '#2B201D'; oval(g, x, y + 2, 8, 6); g.fillStyle = '#3D2E2A'; oval(g, x - 1.5, y, 6, 4); },
    brilho(g, x, y, t, v) { traco(g, `rgba(255,110,40,${.5 + Math.sin(t * 2 + v * 6) * .2})`, 1.3, x - 5, y - 1, x - 1, y + 2, x + 2, y, x + 5, y + 3); }
  };
  const esqueleto = { onde: 'livre', peso: .7, desenhar(g, x, y) {
    const c = '#D6CDB8';
    g.fillStyle = c; circ(g, x - 7, y + 1, 3.3);
    traco(g, c, 1.6, x - 4, y + 1, x + 7, y + 1);
    for (const k of [-1, 1.5, 4]) traco(g, c, 1.1, x + k, y - 2, x + k, y + 4);
    traco(g, c, 1.2, x + 7, y + 1, x + 10, y - 2); traco(g, c, 1.2, x + 7, y + 1, x + 10, y + 4);
  } };
  const cristal = { onde: 'parede', peso: 1.3, luz: CONFIG_LUZ.cristal,
    desenhar(g, x, y, t, v) {
      const [a, b] = v < .5 ? ['#7DD3FC', '#3B9ACF'] : ['#C084FC', '#8B55C9'];
      g.fillStyle = b; poli(g, x - 6, y + 6, x - 4, y - 6, x - 1, y + 6); poli(g, x + 2, y + 6, x + 5, y - 3, x + 7, y + 6);
      g.fillStyle = a; poli(g, x - 2, y + 6, x + 1, y - 11, x + 4, y + 6);
    },
    brilho(g, x, y, t, v) { halo(g, x, y - 2, 12, v < .5 ? `rgba(125,211,252,${.3 + Math.sin(t * 2 + v * 7) * .12})` : `rgba(192,132,252,${.3 + Math.sin(t * 2 + v * 7) * .12})`); }
  };
  const chamine = { onde: 'parede', peso: 1, anima: true, desenhar(g, x, y, t, v) {
    for (let k = 0; k < 3; k++) { // fumaça que sobe devagar
      const f = t ? (t * .35 + k / 3 + v) % 1 : k / 3;
      g.fillStyle = `rgba(150,140,135,${(1 - f) * .3})`; circ(g, x + Math.sin(f * 6 + k) * 2, y - 7 - f * 16, 2.5 + f * 4);
    }
    g.fillStyle = '#2A1F1C'; poli(g, x - 7, y + 6, x + 7, y + 6, x + 3, y - 5, x - 3, y - 5);
    g.fillStyle = '#FF7A2E'; oval(g, x, y - 5, 3, 1.2);
  } };

  const estatua = { onde: 'parede', peso: .9, desenhar(g, x, y) {
    g.fillStyle = '#4A4856'; g.fillRect(x - 7, y + 1, 14, 7);
    g.fillStyle = '#787684'; caixa(g, x - 6, y - 6, 12, 8, 3);
    g.fillStyle = '#8A8896'; circ(g, x, y - 9, 3.8);
    g.fillStyle = 'rgba(255,255,255,.12)'; circ(g, x - 1.2, y - 10, 1.4);
  } };
  const barril = { onde: 'parede', peso: 1.5, desenhar(g, x, y) {
    g.fillStyle = '#6B4A2E'; caixa(g, x - 6, y - 7, 12, 14, 4);
    g.fillStyle = '#3E2A1A'; g.fillRect(x - 6, y - 4, 12, 1.6); g.fillRect(x - 6, y + 3, 12, 1.6);
    g.fillStyle = '#8A6440'; oval(g, x, y - 6.5, 5, 1.6);
  } };
  const tapete = { onde: 'livre', chao: true, peso: 1, desenhar(g, x, y) {
    g.fillStyle = '#6E1D2A'; g.fillRect(x - 12, y - 9, 24, 18);
    g.strokeStyle = '#C9A43A'; g.lineWidth = 1.2; g.strokeRect(x - 10.5, y - 7.5, 21, 15);
    g.fillStyle = '#C9A43A'; estrela(g, x, y, 3.5, 1.6, 4, 0);
  } };
  const estante = { onde: 'parede', peso: 1.2, desenhar(g, x, y, t, v) {
    g.fillStyle = '#4A3220'; g.fillRect(x - 10, y - 11, 20, 18);
    g.fillStyle = '#2E1F14'; g.fillRect(x - 8, y - 9, 16, 5); g.fillRect(x - 8, y - 2, 16, 5);
    const cores = ['#8B2E3B', '#2E5A8B', '#3E7A3A', '#B08A3A'];
    for (let k = 0; k < 5; k++) { g.fillStyle = cores[(k + Math.floor(v * 4)) % 4]; g.fillRect(x - 7.5 + k * 3, y - 8.5, 2.2, 4.5); g.fillRect(x - 7 + k * 3, y - 1.5, 2.2, 4.5); }
  } };
  const cadeira = { onde: 'livre', peso: 1, desenhar(g, x, y, t, v) {
    g.save(); g.translate(x, y + 2); g.rotate(v * .8 - .4);
    const c = '#6B4A2E';
    traco(g, c, 1.6, -5, -1, -5, -10); traco(g, c, 1.6, 4, -1, 4, -8);
    g.fillStyle = c; g.fillRect(-6, -2, 11, 3);
    traco(g, c, 1.4, -5, 1, -5, 6); traco(g, c, 1.4, 4, 1, 3, 3); // uma perna quebrada
    g.restore();
  } };

  // ---------- mato alto (M): passa por dentro e esconde o herói; balança mais quando tem alguém dentro ----------
  const lamina = (g, cor, w, x0, y0, x1, y1, cx, cy) => { g.strokeStyle = cor; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); };
  const giro = (t, k, h, mexe) => Math.sin(t * (mexe ? 7 : 2.2) + k + (h % 7)) * (mexe ? 4.5 : 2.2);
  const grama = (escura, clara) => (g, x, y, t, h, mexe) => {
    for (let k = 0; k < 7; k++) {
      const bx = x + 3 + k * 4.4 + ((h >> k) & 3), a = giro(t, k, h, mexe), alto = 8 + (k % 3) * 4;
      lamina(g, k % 2 ? clara : escura, 2.4, bx, y + 30, bx + a, y + alto, bx + a * .4, y + 18);
    }
  };
  const folhas = (g, x, y, t, h, mexe) => { // samambaia: folhas largas
    for (let k = 0; k < 4; k++) {
      const bx = x + 6 + k * 7, a = giro(t, k, h, mexe) * .06;
      g.save(); g.translate(bx, y + 28); g.rotate(-.5 + k * .33 + a);
      g.fillStyle = k % 2 ? '#2E6B3E' : '#1F4E2D'; g.beginPath(); g.ellipse(0, -11, 4.2, 12, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(160,220,150,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -21); g.stroke();
      g.restore();
    }
  };
  const algas = (g, x, y, t, h, mexe) => { // algas: fitas onduladas
    for (let k = 0; k < 5; k++) {
      const bx = x + 4 + k * 6, a = giro(t, k, h, mexe);
      g.strokeStyle = k % 2 ? '#3E8E6E' : '#5E9A3A'; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(bx, y + 30); g.bezierCurveTo(bx - 4 + a, y + 22, bx + 4 + a, y + 15, bx + a, y + 6 + (k % 2) * 4); g.stroke();
    }
  };
  const cinzas = (g, x, y, t, h, mexe) => { // tufos secos cobertos de cinza
    for (let k = 0; k < 6; k++) {
      const bx = x + 4 + k * 5, a = giro(t, k, h, mexe) * .8;
      lamina(g, k % 2 ? '#8A817C' : '#5E5450', 2, bx, y + 30, bx + a + (k % 2 ? 3 : -3), y + 10 + (k % 3) * 4, bx + a, y + 20);
    }
    g.fillStyle = 'rgba(190,182,176,.5)'; circ(g, x + 9, y + 12, 1.4); circ(g, x + 21, y + 9, 1.2);
  };
  const secas = (g, x, y, t, h, mexe) => { // castelo: monte de folhas secas e palha
    for (let k = 0; k < 6; k++) { const bx = x + 4 + k * 5, a = giro(t, k, h, mexe) * .7; lamina(g, k % 2 ? '#B08A3A' : '#7A5A2A', 2.2, bx, y + 30, bx + a, y + 11 + (k % 3) * 4, bx + a * .5, y + 20); }
    g.fillStyle = '#6E4E2A'; oval(g, x + 10, y + 26, 5, 2.5); g.fillStyle = '#8A6A3A'; oval(g, x + 22, y + 27, 5, 2.5);
  };

  // ---------- detalhe das paredes (x, y = canto da casa) ----------
  const sebe = (g, x, y, s, v) => { g.fillStyle = 'rgba(24,70,30,.55)'; circ(g, x + 8 + v * 6, y + 7, 4); circ(g, x + 22, y + 11 + v * 3, 3.5); g.fillStyle = 'rgba(150,215,120,.3)'; circ(g, x + 12, y + 5, 2); };
  const copa = (g, x, y, s, v) => { g.fillStyle = '#12301D'; circ(g, x + 16, y + 10, 12.5); g.fillStyle = '#1B452A'; circ(g, x + 11 + v * 8, y + 8, 6.5); };
  const rochedo = (g, x, y, s, v, frente) => { g.fillStyle = 'rgba(255,230,190,.16)'; oval(g, x + 10 + v * 10, y + 8, 6, 3.5); if (frente) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x, y + s * .78, s, 2); } };
  const basalto = (g, x, y, s, v) => { traco(g, 'rgba(0,0,0,.35)', 1, x + 4, y + 10, x + 14, y + 6, x + 26, y + 12); if (v < .25) traco(g, 'rgba(255,100,40,.35)', 1, x + 8, y + 15, x + 16, y + 12, x + 22, y + 16); };
  const tijolos = (g, x, y, s, v, frente) => {
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + 2, y + 2, s - 4, 2);
    if (frente) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + s * .78, s, 1); g.fillRect(x + (v < .5 ? 10 : 20), y + s * .6, 1, s * .18); g.fillRect(x + (v < .5 ? 22 : 8), y + s * .78, 1, s * .18); }
  };

  // ---------- os 5 biomas ----------
  // cores do clima em "r,g,b" · olhos: cor dos olhos dos monstros no escuro
  return {
    campo: {
      nome: 'Campo', luz: 1, ceu: '#14301E', chao: ['#5C9E4E', '#58994A', '#61A352'],
      parede: '#2C5E2F', topo: '#3B7F3C', sombra: '#1A3A1D', detalhe: sebe,
      agua: { cor: '#3489C2', cor2: 'rgba(175,228,250,.55)', margem: 'rgba(230,245,220,.5)' },
      mato: '#3C8A3A', matoAlto: grama('#2F7A32', '#4FA046'), espinho: '#4E3A22', densidade: .55, olhos: '255,236,170',
      clima: { tipo: 'vaga', cor: '255,247,194', qtd: 14, tam: 1.5, vel: 10 },
      manchas: [M.terra, M.grama, M.trevo], enfeites: [flor, cogumelo, pedra, toco, poca]
    },
    floresta: {
      nome: 'Floresta', luz: .15, ceu: '#04080A', chao: ['#1E2A22', '#1B261F', '#202D24'],
      parede: '#0E2016', topo: '#163522', sombra: '#06100A', detalhe: copa,
      agua: { cor: '#12302A', cor2: 'rgba(80,140,120,.4)', margem: 'rgba(120,160,130,.25)' },
      mato: '#1E4A2D', matoAlto: folhas, espinho: '#3A2A1A', densidade: .55, olhos: '255,226,140',
      clima: { tipo: 'vaga', cor: '214,255,122', qtd: 16, tam: 1.8, vel: 8, brilho: true },
      manchas: [M.musgo, M.folhas, M.raiz], enfeites: [caveira, ossos, teia, tronco, vela]
    },
    praia: {
      nome: 'Praia', luz: .95, ceu: '#0C3646', chao: ['#E1C68B', '#DCC085', '#E6CC92'],
      parede: '#7C5C3B', topo: '#A07A4E', sombra: '#4E3722', detalhe: rochedo,
      agua: { cor: '#2BA0C4', cor2: 'rgba(210,248,252,.6)', margem: 'rgba(255,255,255,.55)' },
      mato: '#7FA65A', matoAlto: algas, espinho: '#3E3046', densidade: .45, olhos: '255,236,170',
      clima: { tipo: 'lado', cor: '255,255,255', qtd: 14, tam: 1.3, vel: 22 },
      manchas: [M.molhada, M.ondas, M.pedrinhas], enfeites: [concha, estrelaMar, caranguejo, barco, pocaMare]
    },
    vulcao: {
      nome: 'Vulcão', luz: .55, ceu: '#120705', chao: ['#4A3530', '#45312C', '#4F3833'],
      parede: '#2A1E1B', topo: '#45332E', sombra: '#140D0B', detalhe: basalto,
      agua: { cor: '#D9501C', cor2: 'rgba(255,200,90,.75)', margem: 'rgba(255,150,60,.6)', lava: true },
      mato: '#4A3A2E', matoAlto: cinzas, espinho: '#1E1614', densidade: .45, olhos: '255,190,120',
      clima: { tipo: 'sobe', cor: '255,154,61', qtd: 20, tam: 1.6, vel: 16, brilho: true },
      manchas: [M.racha, M.rachaQuente, M.cinzas], enfeites: [rocha, esqueleto, cristal, chamine]
    },
    castelo: {
      nome: 'Castelo', luz: .12, ceu: '#07070B', chao: ['#3A3946', '#353441', '#3E3D4A'],
      parede: '#28262F', topo: '#43404D', sombra: '#141319', detalhe: tijolos,
      agua: { cor: '#1A2938', cor2: 'rgba(110,150,190,.35)', margem: 'rgba(160,170,190,.25)' },
      mato: '#2E3A2C', matoAlto: secas, espinho: '#5A5C66', densidade: .5, olhos: '190,230,255',
      clima: { tipo: 'vaga', cor: '205,195,175', qtd: 14, tam: 1.2, vel: 5 },
      manchas: [M.lajota, M.rachaPedra, M.limo], enfeites: [estatua, barril, tapete, estante, cadeira]
    }
  };
})();

// ---------- espalha manchas e enfeites com semente fixa: o mesmo mapa fica sempre igual ----------
// Enfeites só em chão livre, longe de início, saída, portas, baús e chefão, e nunca no meio de corredores.
// Cantos e bordas recebem mais enfeites.
function decorarMapa(linhas, nomeBioma, id) {
  const bio = BIOMAS[nomeBioma], L = linhas.length, C = Math.max(...linhas.map(s => s.length));
  const ch = (c, l) => (linhas[l] || '')[c] || '#';
  const solido = (c, l) => '#T~S'.includes(ch(c, l)) ? 1 : 0;
  let s = 2166136261;
  for (const k of id + ':' + nomeBioma) s = Math.imul(s ^ k.charCodeAt(0), 16777619);
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const escolher = lista => { let x = rnd() * lista.reduce((t, e) => t + e.peso, 0); for (const e of lista) if ((x -= e.peso) <= 0) return e; return lista[lista.length - 1]; };
  const perto = (c, l) => { for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) if ('@XPBCF'.includes(ch(c + dc, l + dl))) return true; return false; };
  const manchas = new Array(C * L).fill(null), enfeites = [], tem = new Set();
  for (let l = 0; l < L; l++) for (let c = 0; c < C; c++) {
    const k = ch(c, l);
    if (!'.oMSBPXF@mEC'.includes(k)) continue;
    if (rnd() < .6) {
      manchas[l * C + c] = Array.from({ length: rnd() < .25 ? 2 : 1 }, () => ({ m: escolher(bio.manchas), x: .2 + rnd() * .6, y: .2 + rnd() * .6, v: rnd(), r: rnd() }));
    }
    if (k !== '.' || perto(c, l)) continue;
    const n = solido(c, l - 1), su = solido(c, l + 1), o = solido(c - 1, l), e = solido(c + 1, l);
    if ((n && su) || (o && e)) continue; // corredor: fica limpo
    const lados = n + su + o + e, quina = (n || su) && (o || e);
    const diag = solido(c - 1, l - 1) + solido(c + 1, l - 1) + solido(c - 1, l + 1) + solido(c + 1, l + 1);
    let p = bio.densidade * (quina ? 1.5 : lados ? 1 : diag ? .4 : .18);
    if (tem.has(`${c - 1}:${l}`) || tem.has(`${c}:${l - 1}`)) p *= .3;
    if (rnd() >= Math.min(.8, p)) continue;
    const opcoes = bio.enfeites.filter(x => x.onde === 'livre' || (x.onde === 'parede' && lados) || (x.onde === 'canto' && quina));
    const enf = escolher(opcoes), q = [o ? -1 : e ? 1 : 0, n ? -1 : su ? 1 : 0];
    const encosta = enf.onde !== 'livre' ? .16 : 0;
    enfeites.push({ c, l, e: enf, v: rnd(), q, dx: q[0] * encosta + (rnd() - .5) * .16, dy: q[1] * encosta + (rnd() - .5) * .16 });
    tem.add(`${c}:${l}`);
  }
  return { manchas, enfeites };
}
