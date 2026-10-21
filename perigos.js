/* Mohamed — perigos.js: armadilhas reutilizáveis, legíveis e com um padrão que o aluno aprende.
   Toda armadilha avisa antes (tremor, brilho ou sombra) e segue sempre o mesmo ritmo.
   Encostar tira 1 coração, dá 1,5 s de invencibilidade e empurra para trás. Nunca abre pergunta.

   Nos mapas:  perigos: [{ tipo, c, l, w, h, ritmo: [ligado, desligado], fase, dir, alcance }]
   - tipo pode ser uma FAMÍLIA, que cada bioma troca pelas suas armadilhas:
       'ritmo' (sobe e desce no lugar), 'linha' (anda ou atira em linha), 'piso' (age quando pisa), 'zona' (área)
   - ou um tipo fixo: 'espinhos', 'onda', 'setas', 'fogo', 'urso', 'caranguejo', 'racha', 'buraco', 'poca', 'mare', 'lava'
   - c, l: casa (canto de cima à esquerda) · w, h: tamanho da área (padrão 1 × 1)
   - ritmo em segundos · fase: atraso para alternar armadilhas vizinhas · dir: 'cima', 'baixo', 'esquerda', 'direita'
   - alcance: comprimento da linha em casas */

const CONFIG_PERIGOS = {
  dano: 1, invencivel: 1.5, recuo: .9, recuoTempo: .16,    // corações · segundos · casas · segundos
  aviso: .5,                                              // quanto tempo antes a armadilha avisa
  ritmo: { espinhos: [1.1, 1.5], fogo: [1, 1.7], urso: [1.2, 1.8], mare: [2.6, 3.4] },
  setas: { intervalo: 2.2, vel: 5.5 },
  onda: { passo: .35 },                                   // espinhos que sobem um atrás do outro
  caranguejo: { vel: 1.5 },
  racha: { quebra: .6, volta: 3 },                        // racha ao pisar, cai depois de 0,6 s, volta em 3 s
  urso: { reabre: 2, prende: .5 },
  escorrega: 5,                                           // casas por segundo na poça
  tiro: { vel: 4.2 },
  marca: { aviso: .7, ativo: .45 },                       // ataques do chefão no mapa
  fuga: { lava: .8, desabamento: .85, perseguidor: 2.5, espera: 2.5, empurra: 1.6, rocha: .9, pausa: 1.2 }
};

// cada bioma usa as suas: campo (espinhos e buracos), floresta (urso e setas), praia (maré e caranguejos),
// vulcão (lava e fogo), castelo (setas e pisos que racham)
const PERIGOS_DO_BIOMA = {
  campo: { ritmo: 'espinhos', linha: 'onda', piso: 'buraco', zona: 'buraco' },
  floresta: { ritmo: 'urso', linha: 'setas', piso: 'urso', zona: 'poca' },
  praia: { ritmo: 'mare', linha: 'caranguejo', piso: 'poca', zona: 'mare' },
  vulcao: { ritmo: 'fogo', linha: 'fogo', piso: 'racha', zona: 'lava' },
  castelo: { ritmo: 'espinhos', linha: 'setas', piso: 'racha', zona: 'poca' }
};
// fuga: o que vem atrás do aluno em cada bioma (o mapa pode escolher outro)
const FUGA_DO_BIOMA = { campo: 'perseguidor', floresta: 'perseguidor', praia: 'lava', vulcao: 'lava', castelo: 'desabamento' };

const Perigos = (() => {
  const T = 32, TAU = Math.PI * 2, C = CONFIG_PERIGOS;
  const DIR = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
  const dentro = (p, c, l) => c >= p.c && c < p.c + p.w && l >= p.l && l < p.l + p.h;
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const oval = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  const tri = (g, a, b, c, d, e, f) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); };
  const linha = (g, cor, w, x0, y0, x1, y1) => { g.strokeStyle = cor; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const brilho = (g, x, y, r, cor) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
  };
  // fase do ritmo: ligado agora? avisando que vai ligar?
  function ciclo(p) {
    const [a, b] = p.ritmo, x = (p.t + (p.fase || 0)) % (a + b);
    p.ligado = x < a;
    p.aviso = !p.ligado && x >= a + b - C.aviso;
  }
  // casas livres de uma linha: pula a parede de partida e para na primeira parede
  function casasLivres(p, api, desde = 0) {
    const [dx, dy] = DIR[p.dir] || DIR.direita, lista = [];
    let c = p.c + dx * desde, l = p.l + dy * desde;
    if (api.parede(c, l)) { c += dx; l += dy; }
    for (let k = 0; k < (p.alcance || 4) && !api.parede(c, l); k++) { lista.push([c, l]); c += dx; l += dy; }
    return lista;
  }

  // ---------- desenhos ----------
  function placa(g, x, y) { g.fillStyle = '#4A4852'; g.fillRect(x + 3, y + 3, T - 6, T - 6); g.fillStyle = '#2A2830'; for (const [a, b] of [[10, 10], [22, 10], [10, 22], [22, 22]]) circ(g, x + a, y + b, 2); }
  function espinhosEm(g, x, y, alto, treme) {
    const s = treme ? Math.sin(performance.now() / 30) : 0;
    for (const [a, b] of [[10, 10], [22, 10], [10, 22], [22, 22]]) {
      const h = alto ? 9 : 3;
      g.fillStyle = '#D8DCE6'; tri(g, x + a - 3.5 + s, y + b + 2, x + a + 3.5 + s, y + b + 2, x + a + s, y + b + 2 - h);
      if (alto) { g.fillStyle = '#9AA0AE'; tri(g, x + a + s, y + b + 2, x + a + 3.5 + s, y + b + 2, x + a + s, y + b + 2 - h); }
    }
  }
  function buracoEm(g, x, y, k = 1) {
    g.fillStyle = 'rgba(0,0,0,.35)'; oval(g, x + T / 2, y + T / 2 + 2, 14 * k, 12 * k);
    g.fillStyle = '#07070C'; oval(g, x + T / 2, y + T / 2 + 2, 12 * k, 10 * k);
  }
  function rachas(g, x, y, muitas) {
    linha(g, 'rgba(0,0,0,.6)', 1.4, x + 6, y + 10, x + 14, y + 16); linha(g, 'rgba(0,0,0,.6)', 1.4, x + 14, y + 16, x + 24, y + 12);
    linha(g, 'rgba(0,0,0,.6)', 1.4, x + 14, y + 16, x + 12, y + 26);
    if (muitas) { linha(g, 'rgba(0,0,0,.7)', 1.6, x + 24, y + 12, x + 28, y + 22); linha(g, 'rgba(0,0,0,.7)', 1.6, x + 6, y + 22, x + 12, y + 26); }
  }
  function urso(g, x, y, fechado) {
    const cx = x + T / 2, cy = y + T / 2 + 2, ab = fechado ? 2 : 9;
    g.fillStyle = '#5A5F6C'; oval(g, cx, cy, 13, 6);
    g.fillStyle = '#8A8F9C';
    g.beginPath(); g.ellipse(cx, cy - ab, 12, 6, 0, Math.PI, 0); g.fill();
    g.beginPath(); g.ellipse(cx, cy + ab, 12, 6, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#E3E6EE';
    for (let k = -2; k <= 2; k++) { tri(g, cx + k * 5 - 2, cy - ab, cx + k * 5 + 2, cy - ab, cx + k * 5, cy - ab + 4); tri(g, cx + k * 5 - 2, cy + ab, cx + k * 5 + 2, cy + ab, cx + k * 5, cy + ab - 4); }
    if (!fechado) { g.fillStyle = '#C9A43A'; circ(g, cx, cy, 2.5); }
  }
  function caranguejo(g, x, y, t) {
    const pe = Math.sin(t * 14) * 2;
    for (const s of [-1, 1]) { linha(g, '#9A2A1E', 1.6, x + s * 6, y + 3, x + s * 11, y + 7 + pe * s); linha(g, '#9A2A1E', 1.6, x + s * 4, y + 4, x + s * 8, y + 9 - pe * s); }
    g.fillStyle = '#E4553F'; oval(g, x, y + 1, 9, 6); circ(g, x - 10, y - 4, 3.6); circ(g, x + 10, y - 4, 3.6);
    g.fillStyle = '#fff'; circ(g, x - 3, y - 5, 2); circ(g, x + 3, y - 5, 2);
    g.fillStyle = '#1E1240'; circ(g, x - 3, y - 5, 1); circ(g, x + 3, y - 5, 1);
  }
  function seta(g, x, y, vx, vy) {
    const a = Math.atan2(vy, vx);
    g.save(); g.translate(x, y); g.rotate(a);
    linha(g, '#E8DCC0', 2, -9, 0, 7, 0);
    g.fillStyle = '#C9CED8'; tri(g, 10, 0, 5, -3.5, 5, 3.5);
    g.fillStyle = '#FF5A6E'; tri(g, -9, 0, -13, -3, -12, 0); tri(g, -9, 0, -13, 3, -12, 0);
    g.restore();
  }
  function chamas(g, x, y, t, k = 1) {
    const f = 1 + Math.sin(t * 18 + x) * .12;
    brilho(g, x, y, 16 * k, 'rgba(255,140,50,.45)');
    g.fillStyle = '#FF6A1F'; oval(g, x, y - 2 * k, 8 * k, 11 * k * f);
    g.fillStyle = '#FFC24A'; oval(g, x, y, 5 * k, 7 * k * f);
    g.fillStyle = '#FFF4D0'; oval(g, x, y + 2 * k, 2.4 * k, 3.5 * k);
  }
  function lavaEm(g, x, y, t, c, l, cor = '#D9501C', cor2 = 'rgba(255,200,90,.8)') {
    g.fillStyle = cor; g.fillRect(x, y, T + .6, T + .6);
    const f = Math.sin(t * 1.4 + c * .8 + l * 1.1);
    g.fillStyle = cor2; circ(g, x + 9 + f * 3, y + 11, 3.5 + f); circ(g, x + 22, y + 22 - f * 2, 3);
  }
  function aguaEm(g, x, y, t, c, l, bio) {
    g.fillStyle = bio.agua.cor; g.fillRect(x, y, T + .6, T + .6);
    const f = Math.sin(t * 2 + c + l);
    g.fillStyle = bio.agua.cor2; g.fillRect(x + 5 + f * 3, y + 10, 10, 2); g.fillRect(x + 15 - f * 3, y + 21, 9, 2);
  }

  // ---------- tipos ----------
  const TIPOS = {
    espinhos: {
      atualizar: ciclo,
      fere: (p, c, l) => p.ligado && dentro(p, c, l),
      evitar: () => true,
      chao(p, g, t) { for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) { placa(g, c * T, l * T); if (p.ligado || p.aviso) espinhosEm(g, c * T, l * T, p.ligado, p.aviso); } }
    },
    // espinhos que sobem um atrás do outro pela linha: o aluno vê a onda chegando
    onda: {
      atualizar(p, dt, api) {
        p.lista = p.lista || casasLivres(p, api);
        const n = p.lista.length + 2, k = Math.floor((p.t + (p.fase || 0)) / C.onda.passo) % n;
        p.alto = new Set([k, k - 1]); p.quase = k + 1;
      },
      fere: (p, c, l) => p.lista && p.lista.some(([a, b], k) => a === c && b === l && p.alto.has(k)),
      evitar: () => true,
      chao(p, g) { (p.lista || []).forEach(([c, l], k) => { placa(g, c * T, l * T); if (p.alto.has(k) || k === p.quase) espinhosEm(g, c * T, l * T, p.alto.has(k), k === p.quase); }); }
    },
    fogo: {
      atualizar(p, dt, api) { ciclo(p); if (p.dir && !p.lista) p.lista = casasLivres(p, api, 1); },
      fere(p, c, l) { return p.ligado && (p.lista ? p.lista.some(([a, b]) => a === c && b === l) : dentro(p, c, l)); },
      evitar: () => true,
      chao(p, g) {
        const bocal = (c, l) => { g.fillStyle = '#2A2228'; circ(g, c * T + T / 2, l * T + T / 2, 9); g.fillStyle = '#4A3A3A'; circ(g, c * T + T / 2, l * T + T / 2, 6); };
        if (p.lista) bocal(p.c, p.l); else for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) bocal(c, l);
      },
      topo(p, g, t) {
        const casas = p.lista || Array.from({ length: p.w * p.h }, (_, k) => [p.c + (k % p.w), p.l + Math.floor(k / p.w)]);
        if (p.aviso) { const [c, l] = p.lista ? [p.c, p.l] : casas[0]; for (const [a, b] of p.lista ? [[c, l]] : casas) brilho(g, a * T + T / 2, b * T + T / 2, 14, 'rgba(255,120,40,.55)'); }
        if (p.ligado) for (const [c, l] of casas) chamas(g, c * T + T / 2, l * T + T / 2, t);
      },
      luz: p => (p.ligado ? (p.lista || [[p.c, p.l]]).map(([c, l]) => ({ x: c + .5, y: l + .5, r: 1.6 })) : [])
    },
    urso: {
      atualizar(p, dt) {
        if (p.ritmo && p.ritmico) { ciclo(p); p.fechado = p.ligado; return; }
        if (p.fechado) { p.reabre -= dt; if (p.reabre <= 0) p.fechado = false; }
      },
      fere: (p, c, l) => !!(p.ritmico && p.ligado && dentro(p, c, l)),
      pisou(p, c, l, api) {
        if (p.ritmico || p.fechado || !dentro(p, c, l)) return;
        p.fechado = true; p.reabre = C.urso.reabre;
        api.ferir(c + .5, l + .5, { semRecuo: true }); api.prender(C.urso.prende); api.som('golpe');
      },
      evitar: () => true,
      chao(p, g) { for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) urso(g, c * T, l * T, p.fechado || (p.ritmico && p.aviso)); }
    },
    setas: {
      atualizar(p, dt, api, G) {
        const [a] = [p.intervalo || C.setas.intervalo], x = (p.t + (p.fase || 0)) % a;
        p.aviso = x > a - C.aviso;
        if (p.ultimo !== undefined && x < p.ultimo) { const [dx, dy] = DIR[p.dir] || DIR.direita; disparar(G, p.c + .5 + dx * .5, p.l + .5 + dy * .5, dx, dy, 'seta', C.setas.vel); }
        p.ultimo = x;
      },
      chao(p, g, t, api) {
        const x = p.c * T, y = p.l * T, parede = api.parede(p.c, p.l);
        if (!parede) { g.fillStyle = '#5A5866'; g.fillRect(x + 6, y + 6, T - 12, T - 12); }
        const [dx, dy] = DIR[p.dir] || DIR.direita;
        g.fillStyle = '#14121A'; g.fillRect(x + T / 2 - 4 + dx * 8, y + T / 2 - 4 + dy * 8, 8, 8);
      },
      topo(p, g) { if (p.aviso) { const [dx, dy] = DIR[p.dir] || DIR.direita; brilho(g, p.c * T + T / 2 + dx * 8, p.l * T + T / 2 + dy * 8, 12, 'rgba(255,170,80,.6)'); } }
    },
    caranguejo: {
      atualizar(p, dt, api) {
        p.lista = p.lista || casasLivres(p, api);
        const n = Math.max(1, p.lista.length - 1), ida = (p.t * (p.vel || C.caranguejo.vel) + (p.fase || 0)) % (n * 2), s = ida < n ? ida : n * 2 - ida;
        const [dx, dy] = DIR[p.dir] || DIR.direita, [c0, l0] = p.lista[0] || [p.c, p.l];
        p.x = c0 + .5 + dx * s; p.y = l0 + .5 + dy * s;
      },
      fereEm: (p, x, y) => p.x !== undefined && Math.hypot(p.x - x, p.y - y) < .6,
      topo(p, g, t) { caranguejo(g, p.x * T, p.y * T, t); }
    },
    racha: {
      atualizar(p, dt, api) {
        if (p.estado === 'rachando') { p.tq -= dt; if (p.tq <= 0) { p.estado = 'quebrado'; p.tq = C.racha.volta; api.som('golpe'); api.quebrou(p); } }
        else if (p.estado === 'quebrado') { p.tq -= dt; if (p.tq <= 0) p.estado = ''; }
      },
      pisou(p, c, l) { if (!p.estado && dentro(p, c, l)) { p.estado = 'rachando'; p.tq = C.racha.quebra; } },
      buraco: (p, c, l) => p.estado === 'quebrado' && dentro(p, c, l),
      evitar: () => true,
      chao(p, g) {
        const treme = p.estado === 'rachando' ? Math.sin(performance.now() / 25) : 0;
        for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) {
          if (p.estado === 'quebrado') buracoEm(g, c * T, l * T, 1.15);
          else { g.save(); g.translate(treme, 0); rachas(g, c * T, l * T, p.estado === 'rachando'); g.restore(); }
        }
      }
    },
    buraco: {
      buraco: (p, c, l) => dentro(p, c, l),
      evitar: () => true,
      chao(p, g) { for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) buracoEm(g, c * T, l * T, 1.15); }
    },
    poca: {
      escorrega: (p, c, l) => dentro(p, c, l),
      chao(p, g, t, api) {
        const cor = { floresta: '#5A4630', castelo: '#4E6E8E' }[api.bioma] || '#6EC6F0';
        g.fillStyle = cor; g.globalAlpha = .85;
        for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) g.fillRect(c * T + 1, l * T + 1, T - 2, T - 2);
        g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.35)';
        for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) g.fillRect(c * T + 6 + Math.sin(t * 2 + c) * 3, l * T + 8, 12, 2.5);
      }
    },
    // maré: enche e esvazia; cheia, bloqueia o caminho (a espuma avisa antes de subir)
    mare: {
      atualizar(p, dt, api) {
        const antes = p.ligado; ciclo(p);
        const P = api.heroi(), c = Math.floor(P.x), l = Math.floor(P.y);
        if (p.ligado && !antes && dentro(p, c, l)) { // pega o aluno dentro: tira 1 coração e leva para a margem mais perto
          const [dx, dy] = [[p.c - 1 - c, 0], [p.c + p.w - c, 0], [0, p.l - 1 - l], [0, p.l + p.h - l]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
          api.ferir(P.x - Math.sign(dx), P.y - Math.sign(dy), { empurra: Math.abs(dx + dy) + .3 });
        }
      },
      solido: (p, c, l) => p.ligado && dentro(p, c, l),
      evitar: () => true,
      chao(p, g, t, api) {
        for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) {
          if (p.ligado) aguaEm(g, c * T, l * T, t, c, l, api.bio);
          else { g.fillStyle = 'rgba(40,60,80,.25)'; g.fillRect(c * T, l * T, T + .6, T + .6); }
        }
        if (p.aviso) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let c = p.c; c < p.c + p.w; c++) for (let k = 0; k < 3; k++) circ(g, c * T + 6 + k * 10, p.l * T + 4 + Math.sin(t * 6 + k + c) * 2, 2.6); }
      }
    },
    lava: {
      fere: (p, c, l) => dentro(p, c, l),
      evitar: () => true,
      chao(p, g, t) { for (let l = p.l; l < p.l + p.h; l++) for (let c = p.c; c < p.c + p.w; c++) lavaEm(g, c * T, l * T, t, c, l); },
      luz: p => [{ x: p.c + p.w / 2, y: p.l + p.h / 2, r: 1.2 + Math.max(p.w, p.h) * .6 }]
    }
  };

  // ---------- montar a lista do mapa ----------
  function montar(lista, bioma) {
    const familia = PERIGOS_DO_BIOMA[bioma] || PERIGOS_DO_BIOMA.campo;
    return (lista || []).map(d => {
      const tipo = familia[d.tipo] || d.tipo;
      const p = { ...d, tipo, w: d.w || 1, h: d.h || 1, t: 0, fase: d.fase || 0 };
      if (!TIPOS[tipo]) return null;
      if (['espinhos', 'fogo', 'urso', 'mare'].includes(tipo)) p.ritmo = d.ritmo || C.ritmo[tipo];
      if (tipo === 'urso') p.ritmico = d.tipo === 'ritmo';
      if (tipo === 'setas' && d.ritmo) p.intervalo = d.ritmo[0];
      if (tipo === 'fogo' && d.tipo === 'linha' && !p.dir) p.dir = 'direita';
      return p;
    }).filter(Boolean);
  }

  // ---------- projéteis e marcas (setas, tiros dos monstros, ataques do chefão) ----------
  function disparar(G, x, y, dx, dy, estilo = 'seta', vel = C.tiro.vel) {
    const n = Math.hypot(dx, dy) || 1;
    G.tiros.push({ x, y, vx: (dx / n) * vel, vy: (dy / n) * vel, estilo, vida: 6 });
  }
  function marcar(G, c, l, estilo, aviso = C.marca.aviso, ativo = C.marca.ativo) {
    G.marcas.push({ c, l, estilo, t: 0, aviso, ativo });
  }

  // ---------- fuga: lava/água subindo, desabamento ou perseguidor ----------
  function iniciarFuga(G, def, bioma) {
    const tipo = !def || def === true || def.tipo === 'auto' || !def.tipo ? FUGA_DO_BIOMA[bioma] : def.tipo;
    const dir = (def && def.dir) || 'cima';
    G.fuga = { tipo, dir, ativo: false, espera: C.fuga.espera, frente: dir === 'cima' ? G.L + 1 : dir === 'baixo' ? -2 : dir === 'esquerda' ? G.C + 1 : -2, rastro: [], sombra: null, pausa: 0, chuva: 0, guarda: 0 };
  }
  function atualizarFuga(G, dt, api) {
    const F = G.fuga, P = api.heroi();
    if (!F) return;
    if (!F.ativo) {
      F.espera -= dt;
      if (F.espera <= 0 || Math.hypot(P.x - G.inicio.c - .5, P.y - G.inicio.l - .5) > 1.5) { F.ativo = true; api.flutuar('🏃 Corra!', P.x, P.y - 1); api.som('chefe'); if (F.tipo === 'perseguidor') F.sombra = { x: G.inicio.c + .5, y: G.inicio.l + .5 }; }
      return;
    }
    if (F.tipo === 'perseguidor') {
      F.guarda -= dt;
      if (F.guarda <= 0) { F.rastro.push({ x: P.x, y: P.y }); F.guarda = .15; }
      if (F.pausa > 0) { F.pausa -= dt; return; }
      let passo = C.fuga.perseguidor * dt;
      while (passo > 0 && F.rastro.length) {
        const alvo = F.rastro[0], dx = alvo.x - F.sombra.x, dy = alvo.y - F.sombra.y, d = Math.hypot(dx, dy);
        if (d <= passo) { F.sombra.x = alvo.x; F.sombra.y = alvo.y; F.rastro.shift(); passo -= d; } else { F.sombra.x += (dx / d) * passo; F.sombra.y += (dy / d) * passo; passo = 0; }
      }
      return;
    }
    F.frente += (F.dir === 'cima' || F.dir === 'esquerda' ? -1 : 1) * (F.tipo === 'lava' ? C.fuga.lava : C.fuga.desabamento) * dt;
    if (F.tipo === 'desabamento') {
      F.chuva -= dt;
      if (F.chuva <= 0) { // pedras caem à frente do aluno: a sombra avisa
        F.chuva = C.fuga.rocha;
        const [dx, dy] = DIR[F.dir];
        for (let n = 0; n < 2; n++) marcar(G, Math.floor(P.x) + dx * 2 + Math.round(Math.random() * 4 - 2), Math.floor(P.y) + dy * 2 + Math.round(Math.random() * 4 - 2), 'pedra', .8, .35);
      }
    }
  }
  // a frente já cobre este ponto?
  function coberto(F, x, y) {
    if (!F || !F.ativo || F.tipo === 'perseguidor') return false;
    return F.dir === 'cima' ? y > F.frente : F.dir === 'baixo' ? y < F.frente : F.dir === 'esquerda' ? x > F.frente : x < F.frente;
  }

  // ---------- por quadro ----------
  function atualizar(G, dt, api) {
    for (const p of G.perigos) { p.t += dt; const tp = TIPOS[p.tipo]; if (tp.atualizar) tp.atualizar(p, dt, api, G); }
    for (const s of G.tiros) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vida -= dt;
      if (api.parede(Math.floor(s.x), Math.floor(s.y))) s.vida = 0;
    }
    G.tiros = G.tiros.filter(s => s.vida > 0);
    for (const m of G.marcas) m.t += dt;
    G.marcas = G.marcas.filter(m => m.t < m.aviso + m.ativo);
    atualizarFuga(G, dt, api);
  }

  // o que fere o herói neste ponto? devolve de onde veio (para o recuo) ou null
  function ferindo(G, x, y) {
    const c = Math.floor(x), l = Math.floor(y);
    for (const p of G.perigos) {
      const tp = TIPOS[p.tipo];
      if (tp.fere && tp.fere(p, c, l)) return { x: c + .5, y: l + .5 };
      if (tp.fereEm && tp.fereEm(p, x, y)) return { x: p.x, y: p.y };
    }
    for (const s of G.tiros) if (Math.hypot(s.x - x, s.y - y) < .42) { s.vida = 0; return { x: s.x - s.vx * .1, y: s.y - s.vy * .1 }; }
    for (const m of G.marcas) if (m.t >= m.aviso && m.c === c && m.l === l) return { x: c + .5, y: l + .5 };
    const F = G.fuga;
    if (coberto(F, x, y)) { const [dx, dy] = DIR[F.dir]; return { x: x - dx * 2, y: y - dy * 2, empurra: C.fuga.empurra }; }
    if (F && F.sombra && F.pausa <= 0 && Math.hypot(F.sombra.x - x, F.sombra.y - y) < .7) { F.pausa = C.fuga.pausa; return { x: F.sombra.x, y: F.sombra.y }; }
    return null;
  }

  const algum = (G, chave, c, l) => G.perigos.some(p => TIPOS[p.tipo][chave] && TIPOS[p.tipo][chave](p, c, l));
  function pisou(G, c, l, api) { for (const p of G.perigos) { const tp = TIPOS[p.tipo]; if (tp.pisou) tp.pisou(p, c, l, api); } }

  // desenho rente ao chão (antes dos itens) e por cima (depois da escuridão, para o aluno sempre ver)
  function desenharChao(G, g, t, api, c0, c1, l0, l1) {
    for (const p of G.perigos) {
      if (p.c > c1 + 1 || p.l > l1 + 1 || p.c + p.w + (p.alcance || 0) < c0 - 1 || p.l + p.h + (p.alcance || 0) < l0 - 1) continue;
      const tp = TIPOS[p.tipo]; if (tp.chao) tp.chao(p, g, t, api);
    }
    const F = G.fuga;
    if (F && F.ativo && F.tipo !== 'perseguidor') {
      for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) {
        if (!coberto(F, c + .5, l + .5)) continue;
        if (F.tipo === 'lava') { if (api.bio.agua.lava) lavaEm(g, c * T, l * T, t, c, l); else aguaEm(g, c * T, l * T, t, c, l, api.bio); }
        else { g.fillStyle = '#4A4552'; g.fillRect(c * T, l * T, T + .6, T + .6); g.fillStyle = '#6E6878'; circ(g, c * T + 10, l * T + 12, 7); circ(g, c * T + 22, l * T + 20, 6); }
      }
    }
  }
  function desenharTopo(G, g, t, api) {
    for (const p of G.perigos) { const tp = TIPOS[p.tipo]; if (tp.topo) tp.topo(p, g, t, api); }
    for (const m of G.marcas) {
      const x = m.c * T, y = m.l * T, cx = x + T / 2, cy = y + T / 2, ativo = m.t >= m.aviso, k = Math.min(1, m.t / m.aviso);
      if (!ativo) {
        // aviso: sombra que cresce ou anel que pulsa, na cor do ataque
        if (m.estilo === 'galho' || m.estilo === 'pedra') { g.fillStyle = `rgba(0,0,0,${.25 + .35 * k})`; oval(g, cx, cy + 4, 4 + 10 * k, 3 + 6 * k); }
        else { g.strokeStyle = { espinhos: '#D8DCE6', onda: '#7FD3F7', fogo: '#FF8A3D' }[m.estilo] || '#fff'; g.globalAlpha = .4 + .5 * k; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 6 + 8 * k, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      } else if (m.estilo === 'espinhos') { placa(g, x, y); espinhosEm(g, x, y, true); }
      else if (m.estilo === 'fogo') chamas(g, cx, cy, t, 1.1);
      else if (m.estilo === 'onda') { g.fillStyle = 'rgba(120,210,245,.85)'; oval(g, cx, cy, 15, 9); g.fillStyle = '#fff'; oval(g, cx - 4, cy - 2, 6, 2); }
      else if (m.estilo === 'galho') { g.fillStyle = '#5A3D24'; g.save(); g.translate(cx, cy); g.rotate(.5); g.fillRect(-14, -3, 28, 6); g.restore(); g.fillStyle = '#2E6B3A'; circ(g, cx + 8, cy - 4, 5); }
      else { g.fillStyle = '#6E6878'; circ(g, cx, cy, 10); g.fillStyle = '#8A8494'; circ(g, cx - 3, cy - 3, 5); }
    }
    for (const s of G.tiros) {
      if (s.estilo === 'seta') seta(g, s.x * T, s.y * T, s.vx, s.vy);
      else {
        const cor = { fogo: ['rgba(255,140,50,.5)', '#FF8A2A'], esporo: ['rgba(190,255,140,.45)', '#B6F07A'], espinho: ['rgba(210,160,255,.45)', '#C59BFF'] }[s.estilo] || ['rgba(255,255,255,.4)', '#fff'];
        brilho(g, s.x * T, s.y * T, 12, cor[0]); g.fillStyle = cor[1]; circ(g, s.x * T, s.y * T, 4.5);
      }
    }
    const F = G.fuga;
    if (F && F.sombra) { // perseguidor: uma sombra redonda com olhos que brilham (tensão, não susto)
      const x = F.sombra.x * T, y = F.sombra.y * T, w = Math.sin(t * 6) * 1.5;
      g.fillStyle = 'rgba(10,8,20,.85)'; oval(g, x, y - 6, 13 + w, 14 - w);
      g.fillStyle = F.pausa > 0 ? 'rgba(255,224,138,.4)' : '#FFE08A'; circ(g, x - 4.5, y - 9, 2.2); circ(g, x + 4.5, y - 9, 2.2);
    }
  }

  // luzes das armadilhas (fogo aceso, lava e frente de lava) para os biomas escuros
  function luzes(G) {
    const lista = [];
    for (const p of G.perigos) { const tp = TIPOS[p.tipo]; if (tp.luz) lista.push(...tp.luz(p)); }
    for (const m of G.marcas) if (m.estilo === 'fogo' && m.t >= m.aviso) lista.push({ x: m.c + .5, y: m.l + .5, r: 1.4 });
    return lista;
  }

  return {
    montar, atualizar, ferindo, pisou, disparar, marcar, iniciarFuga, luzes, desenharChao, desenharTopo, coberto,
    solido: (G, c, l) => algum(G, 'solido', c, l),
    buraco: (G, c, l) => algum(G, 'buraco', c, l),
    escorrega: (G, c, l) => algum(G, 'escorrega', c, l),
    // monstros desviam das armadilhas (menos das poças)
    evitar: (G, c, l) => G.perigos.some(p => p.tipo !== 'poca' && (dentro(p, c, l) || (p.lista || []).some(([a, b]) => a === c && b === l))) || coberto(G.fuga, c + .5, l + .5)
  };
})();
