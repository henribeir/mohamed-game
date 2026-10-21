/* Mohamed — puzzles.js: puzzles reutilizáveis, resolvidos andando e empurrando. Sem tempo limite.
   Cada puzzle tem botão de reiniciar (↺ no topo) e dá uma dica depois de 60 s parado.
   Resolver dá recompensa (moedas ou baú), abre as portas do puzzle e conta para abrir a saída.

   Nos mapas:  puzzles: [{ tipo, area: [c0, l0, c1, l1], ... }]  — as peças são letras da grade dentro da área:
     K bloco (ou saco da balança) · _ placa · D porta do puzzle · L alavanca · Q cristal · Y totem
     k chave · [ prato esquerdo · ] prato direito · * pedra da ponte (sobre a água)
   Lógica:
     blocos     empurre os blocos até todas as placas                    { recompensa: 'bau', bau: [c, l] }
     alavancas  puxe na ordem que as luzes piscam                        { ordem: [2, 0, 1] } (opcional)
     chaves     cada chave abre só a porta da mesma cor                  { chaves: ['vermelho'], portas: ['vermelho'] }
     memoria    o cristal mostra 3 a 5 cores; pise nas placas na ordem   { tamanho: 4 }
   Matemática do dia (regras e números de conteudo.js, pelo tema do dia; acertos e erros vão para o relatório):
     placas     pise só nas placas que seguem a regra do totem
     balanca    empurre os sacos até os dois pratos terem a mesma soma
     ponte      pule nas pedras na sequência do totem                    { inicio: [c, l] } (margem de partida) */

const CONFIG_PUZZLE = {
  dica: 60,                                  // segundos parado no puzzle até a dica
  moedas: 5,                                 // recompensa quando não há baú
  memoria: { mostra: .6, pausa: .25 },       // cada cor do cristal
  luzes: { intervalo: 4, mostra: .45 },      // alavancas: as luzes piscam a ordem a cada 4 s
  placas: { certas: .5 },                    // metade das placas segue a regra
  erro: { recuo: .9 },                       // pisar errado: armadilha leve (empurra, sem tirar coração)
  ponte: { afunda: 1.2 },
  gemaSemErro: 1                             // resolver sem nenhum erro dá gema
};
const CORES_PUZZLE = { vermelho: '#FF5A6E', azul: '#4DA3FF', verde: '#3DDC84', amarelo: '#FFD43B', roxo: '#B07CFF' };
const NOMES_CORES = Object.keys(CORES_PUZZLE);
const QUADRADO_COR = { vermelho: '🟥', azul: '🟦', verde: '🟩', amarelo: '🟨', roxo: '🟪' };

const Puzzles = (() => {
  const T = 32, TAU = Math.PI * 2, C = CONFIG_PUZZLE;
  const VET = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const oval = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  const caixa = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill(); };
  const brilho = (g, x, y, r, cor) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalCompositeOperation = 'source-over'; };
  const na = (pz, c, l) => c >= pz.area[0] && c <= pz.area[2] && l >= pz.area[1] && l <= pz.area[3];
  const em = (lista, c, l) => lista.find(e => e.c === c && e.l === l);
  const texto = (g, txt, x, y, tam = 13, cor = '#fff') => {
    g.font = `900 ${tam}px ui-rounded, "Nunito", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = '#1E1240'; g.strokeText(txt, x, y); g.fillStyle = cor; g.fillText(txt, x, y); g.textBaseline = 'alphabetic';
  };
  const placaPiso = (g, c, l, cor, aceso) => {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(c * T + 3, l * T + 4, T - 6, T - 6);
    g.fillStyle = aceso ? cor : '#5E5A6A'; caixa(g, c * T + 3, l * T + 3, T - 6, T - 7, 5);
    g.fillStyle = aceso ? 'rgba(255,255,255,.35)' : cor; caixa(g, c * T + 8, l * T + 8, T - 16, T - 17, 3);
  };
  const totem = (g, c, l) => { g.fillStyle = '#6A6478'; caixa(g, c * T + 9, l * T + 4, T - 18, T - 6, 4); g.fillStyle = '#FFD43B'; circ(g, c * T + T / 2, l * T + 10, 3); };
  const porta = (g, c, l, cor) => {
    g.fillStyle = '#3A3444'; g.fillRect(c * T, l * T, T + .6, T + .6);
    g.fillStyle = '#6E5A44'; g.fillRect(c * T + 4, l * T + 2, T - 8, T - 4);
    g.fillStyle = cor || '#9AA0AE'; g.fillRect(c * T + 4, l * T + 12, T - 8, 5);
    g.fillStyle = '#1E1240'; circ(g, c * T + T / 2, l * T + 22, 2.4);
  };
  const mexeu = pz => { pz.parado = 0; };
  // números da regra: metade certos, metade errados, todos diferentes
  function sortearNumeros(regra, qtd, certos) {
    const [a, b] = regra.faixa, ok = [], ruim = [], usados = new Set();
    for (let t = 0; t < 600 && (ok.length < certos || ruim.length < qtd - certos); t++) {
      const n = a + Math.floor(Math.random() * (b - a + 1));
      if (usados.has(n)) continue;
      if (regra.testa(n) && ok.length < certos) { ok.push(n); usados.add(n); } else if (!regra.testa(n) && ruim.length < qtd - certos) { ruim.push(n); usados.add(n); }
    }
    return embaralhar([...ok.map(n => ({ n, certa: true })), ...ruim.map(n => ({ n, certa: false }))]);
  }

  const TIPOS = {
    // ---------- (1) blocos nas placas de pressão ----------
    blocos: {
      montar(pz, pecas) { pz.blocos = pecas.K.map(p => ({ ...p, c0: p.c, l0: p.l })); pz.placas = pecas._; },
      solido: (pz, c, l) => !!em(pz.blocos, c, l),
      bater(pz, c, l, [dx, dy], api) {
        const b = em(pz.blocos, c, l);
        if (!b) return false;
        const nc = c + dx, nl = l + dy;
        if (!na(pz, nc, nl) || !api.livre(nc, nl) || em(pz.blocos, nc, nl)) return true;
        b.c = nc; b.l = nl; mexeu(pz); api.som('clique');
        if (pz.placas.every(p => em(pz.blocos, p.c, p.l))) resolver(pz, api);
        return true;
      },
      desenhar(pz, g) {
        for (const p of pz.placas) placaPiso(g, p.c, p.l, '#FFD43B', !!em(pz.blocos, p.c, p.l));
        for (const b of pz.blocos) { g.fillStyle = '#8A5A2B'; caixa(g, b.c * T + 3, b.l * T + 2, T - 6, T - 5, 4); g.strokeStyle = '#5A3A1A'; g.lineWidth = 2.4; g.strokeRect(b.c * T + 7, b.l * T + 6, T - 14, T - 13); g.beginPath(); g.moveTo(b.c * T + 7, b.l * T + 6); g.lineTo(b.c * T + T - 7, b.l * T + T - 7); g.stroke(); }
      },
      dica(pz) { const p = pz.placas.find(x => !em(pz.blocos, x.c, x.l)); if (p) pz.destaque = { c: p.c, l: p.l, t: 5 }; return 'Empurre um bloco até a placa'; },
      reiniciar(pz) { for (const b of pz.blocos) { b.c = b.c0; b.l = b.l0; } }
    },

    // ---------- (2) alavancas na ordem das luzes ----------
    alavancas: {
      montar(pz, pecas, def) {
        pz.alavancas = pecas.L.map((p, i) => ({ ...p, cor: NOMES_CORES[i % NOMES_CORES.length], puxada: false }));
        pz.ordem = def.ordem || embaralhar(pz.alavancas.map((_, i) => i));
        pz.passo = 0; pz.relogio = 1;
        pz.painel = pecas.Y[0] || pz.portas[0] || pz.alavancas[0];
      },
      solido: (pz, c, l) => !!em(pz.alavancas, c, l) || !!em(pecasFixas(pz), c, l),
      bater(pz, c, l, d, api) {
        const i = pz.alavancas.findIndex(a => a.c === c && a.l === l);
        if (i < 0) return !!em(pecasFixas(pz), c, l);
        if (pz.alavancas[i].puxada) return true;
        mexeu(pz);
        if (pz.ordem[pz.passo] === i) {
          pz.alavancas[i].puxada = true; pz.passo++; api.som('clique');
          if (pz.passo === pz.alavancas.length) resolver(pz, api);
        } else {
          for (const a of pz.alavancas) a.puxada = false;
          pz.passo = 0; pz.errou = true; api.som('erro'); api.flutuar('🔁', c + .5, l);
        }
        return true;
      },
      atualizar(pz, dt) { pz.relogio += dt; },
      desenhar(pz, g) {
        for (const a of pz.alavancas) {
          const x = a.c * T + T / 2, y = a.l * T + T / 2;
          g.fillStyle = '#4A4452'; caixa(g, x - 9, y + 4, 18, 8, 3);
          g.strokeStyle = '#2A2630'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + (a.puxada ? 8 : -8), y - 8); g.stroke();
          g.fillStyle = CORES_PUZZLE[a.cor]; circ(g, x + (a.puxada ? 8 : -8), y - 9, 4.5);
        }
        if (pecasFixas(pz).length) for (const y of pecasFixas(pz)) totem(g, y.c, y.l);
      },
      rotulos(pz, g, t) {
        // painel de luzes: aceso para cada alavanca certa; de tempos em tempos pisca a ordem (a dica de luzes)
        const n = pz.alavancas.length, x0 = pz.painel.c * T + T / 2 - (n - 1) * 6, y = pz.painel.l * T - 6;
        const ciclo = pz.relogio % C.luzes.intervalo, k = Math.floor(ciclo / C.luzes.mostra);
        g.fillStyle = 'rgba(5,6,12,.7)'; caixa(g, x0 - 9, y - 7, (n - 1) * 12 + 18, 14, 7);
        for (let j = 0; j < n; j++) {
          const cor = CORES_PUZZLE[pz.alavancas[pz.ordem[j]].cor], aceso = j < pz.passo || (!pz.resolvido && k === j && ciclo % C.luzes.mostra < C.luzes.mostra * .8);
          g.fillStyle = aceso ? cor : '#2A2832'; circ(g, x0 + j * 12, y, 4.2);
          if (aceso) brilho(g, x0 + j * 12, y, 9, cor + '88');
        }
      },
      dica(pz) { const a = pz.alavancas[pz.ordem[pz.passo]]; if (a) pz.destaque = { c: a.c, l: a.l, t: 5 }; return 'Siga a ordem das luzes'; },
      reiniciar(pz) { for (const a of pz.alavancas) a.puxada = false; pz.passo = 0; pz.relogio = 0; }
    },

    // ---------- (3) chaves coloridas ----------
    chaves: {
      montar(pz, pecas, def) {
        pz.chaves = pecas.k.map((p, i) => ({ ...p, cor: (def.chaves || NOMES_CORES)[i % (def.chaves || NOMES_CORES).length], pega: false }));
        pz.portas.forEach((p, i) => { p.cor = (def.portas || def.chaves || NOMES_CORES)[i % (def.portas || def.chaves || NOMES_CORES).length]; });
        pz.mao = [];
      },
      pisou(pz, c, l, api) {
        const k = pz.chaves.find(x => x.c === c && x.l === l && !x.pega);
        if (!k) return;
        k.pega = true; pz.mao.push(k.cor); mexeu(pz); api.som('moeda'); api.flutuar(`🗝️ ${QUADRADO_COR[k.cor]}`, c + .5, l);
      },
      bater(pz, c, l, d, api) {
        const p = pz.portas.find(x => x.c === c && x.l === l && !x.aberta);
        if (!p) return false;
        const i = pz.mao.indexOf(p.cor);
        if (i < 0) { api.flutuar(`🔒 ${QUADRADO_COR[p.cor]}`, c + .5, l); return true; }
        pz.mao.splice(i, 1); p.aberta = true; api.abrirPorta(c, l); mexeu(pz); api.som('porta');
        if (pz.portas.every(x => x.aberta)) resolver(pz, api);
        return true;
      },
      portasProprias: true,
      desenhar(pz, g) {
        for (const p of pz.portas) if (!p.aberta) porta(g, p.c, p.l, CORES_PUZZLE[p.cor]);
        for (const k of pz.chaves) if (!k.pega) {
          const x = k.c * T + T / 2, y = k.l * T + T / 2;
          g.fillStyle = CORES_PUZZLE[k.cor]; circ(g, x - 5, y, 5.5); g.fillRect(x - 1, y - 2, 12, 4); g.fillRect(x + 7, y + 1, 3, 5);
          g.fillStyle = '#1E1240'; circ(g, x - 5, y, 2);
        }
      },
      hud: pz => pz.mao.map(c => QUADRADO_COR[c]).join(''),
      dica(pz) {
        const p = pz.portas.find(x => !x.aberta && pz.mao.includes(x.cor)) || pz.chaves.find(x => !x.pega);
        if (p) pz.destaque = { c: p.c, l: p.l, t: 5 };
        return 'A chave abre a porta da mesma cor';
      },
      reiniciar(pz, api) { for (const k of pz.chaves) k.pega = false; for (const p of pz.portas) if (p.aberta) { p.aberta = false; api.fecharPorta(p.c, p.l); } pz.mao = []; }
    },

    // ---------- (4) memória de luzes ----------
    memoria: {
      montar(pz, pecas, def) {
        pz.cristal = pecas.Q[0];
        pz.placas = pecas._.map((p, i) => ({ ...p, cor: NOMES_CORES[i % NOMES_CORES.length] }));
        const n = Math.max(3, Math.min(5, def.tamanho || 4));
        pz.seq = [];
        while (pz.seq.length < n) { const j = Math.floor(Math.random() * pz.placas.length); if (j !== pz.seq[pz.seq.length - 1]) pz.seq.push(j); }
        pz.passo = 0; pz.mostra = null; pz.aceso = -1; pz.acesoT = 0; pz.viu = false;
      },
      solido: (pz, c, l) => !!pz.cristal && pz.cristal.c === c && pz.cristal.l === l,
      bater(pz, c, l, d, api) { if (!TIPOS.memoria.solido(pz, c, l)) return false; mostrar(pz); api.som('clique'); return true; },
      pisou(pz, c, l, api) {
        const j = pz.placas.findIndex(p => p.c === c && p.l === l);
        if (j < 0 || pz.mostra) return;
        pz.aceso = j; pz.acesoT = .35; mexeu(pz);
        if (pz.seq[pz.passo] === j) { pz.passo++; api.som('clique'); if (pz.passo === pz.seq.length) resolver(pz, api); }
        else { pz.passo = 0; pz.errou = true; api.som('erro'); api.flutuar('🔁', c + .5, l); setTimeout(() => mostrar(pz), 600); }
      },
      atualizar(pz, dt, api) {
        const P = api.heroi();
        if (!pz.viu && na(pz, Math.floor(P.x), Math.floor(P.y))) { pz.viu = true; mostrar(pz); }
        pz.acesoT -= dt;
        const m = pz.mostra;
        if (!m) return;
        m.t += dt;
        const passo = (C.memoria.mostra + C.memoria.pausa) * m.lento, k = Math.floor(m.t / passo);
        if (k >= pz.seq.length) { pz.mostra = null; return; }
        pz.aceso = m.t % passo < C.memoria.mostra * m.lento ? pz.seq[k] : -1;
        pz.acesoT = pz.aceso >= 0 ? .1 : 0;
      },
      desenhar(pz, g) {
        pz.placas.forEach((p, j) => placaPiso(g, p.c, p.l, CORES_PUZZLE[p.cor], (pz.aceso === j && pz.acesoT > 0) || pz.resolvido));
        if (pz.cristal) {
          const x = pz.cristal.c * T + T / 2, y = pz.cristal.l * T + T / 2, cor = pz.aceso >= 0 && pz.acesoT > 0 ? CORES_PUZZLE[pz.placas[pz.aceso].cor] : '#BFE9FF';
          g.fillStyle = '#4A4452'; oval(g, x, y + 10, 10, 4);
          g.fillStyle = cor; g.beginPath(); g.moveTo(x, y - 13); g.lineTo(x + 8, y); g.lineTo(x, y + 10); g.lineTo(x - 8, y); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(x, y - 13); g.lineTo(x - 8, y); g.lineTo(x, y - 2); g.closePath(); g.fill();
        }
      },
      rotulos(pz, g) {
        if (pz.cristal && pz.aceso >= 0 && pz.acesoT > 0) brilho(g, pz.cristal.c * T + T / 2, pz.cristal.l * T + T / 2, 22, CORES_PUZZLE[pz.placas[pz.aceso].cor] + 'AA');
        if (!pz.resolvido) texto(g, `${pz.passo}/${pz.seq.length}`, pz.cristal.c * T + T / 2, pz.cristal.l * T - 8, 11);
      },
      dica(pz) { mostrar(pz, 1.6); return 'Olhe o cristal com calma'; },
      reiniciar(pz) { pz.passo = 0; mostrar(pz); }
    },

    // ---------- (5) placas numeradas: pise só nas que seguem a regra ----------
    placas: {
      montar(pz, pecas, def, api) {
        const info = puzzlesDoDia(api.dia());
        pz.tema = info.tema; pz.regra = info.regra; pz.totem = pecas.Y[0];
        const nums = sortearNumeros(pz.regra, pecas._.length, Math.max(2, Math.round(pecas._.length * C.placas.certas)));
        pz.placas = pecas._.map((p, i) => ({ ...p, ...(nums[i] || { n: 0, certa: false }), pisada: false, erro: 0 }));
      },
      solido: (pz, c, l) => !!pz.totem && pz.totem.c === c && pz.totem.l === l,
      bater: (pz, c, l) => TIPOS.placas.solido(pz, c, l),
      pisou(pz, c, l, api) {
        const p = pz.placas.find(x => x.c === c && x.l === l);
        if (!p || p.pisada) return;
        mexeu(pz);
        const conta = `${fmt(p.n)} · ${pz.regra.texto}`;
        if (p.certa) {
          p.pisada = true; api.som('acerto'); api.registrar(true, conta, pz.tema);
          if (pz.placas.every(x => !x.certa || x.pisada)) resolver(pz, api);
        } else {
          p.erro = .6; pz.errou = true; api.som('erro'); api.registrar(false, conta, pz.tema);
          api.empurrar(c + .5, l + .5, C.erro.recuo); // armadilha leve: espinhos sobem e empurram, sem tirar coração
        }
      },
      atualizar(pz, dt) { for (const p of pz.placas) p.erro = Math.max(0, p.erro - dt); },
      desenhar(pz, g) {
        for (const p of pz.placas) {
          placaPiso(g, p.c, p.l, '#3DDC84', p.pisada);
          if (p.erro > 0) { g.fillStyle = '#D8DCE6'; for (const [a, b] of [[10, 12], [22, 12], [16, 22]]) { g.beginPath(); g.moveTo(p.c * T + a - 3, p.l * T + b + 3); g.lineTo(p.c * T + a + 3, p.l * T + b + 3); g.lineTo(p.c * T + a, p.l * T + b - 6); g.fill(); } }
        }
        if (pz.totem) totem(g, pz.totem.c, pz.totem.l);
      },
      rotulos(pz, g) {
        for (const p of pz.placas) texto(g, fmt(p.n), p.c * T + T / 2, p.l * T + T / 2 + 1, p.n <= -10 || p.n >= 100 ? 11 : 13, p.erro > 0 ? '#FF8A9D' : '#fff');
        if (pz.totem) placaTexto(g, pz.regra.texto, pz.totem.c * T + T / 2, pz.totem.l * T - 6);
      },
      dica(pz) { const p = pz.placas.find(x => x.certa && !x.pisada); if (p) pz.destaque = { c: p.c, l: p.l, t: 5 }; return 'Leia a regra no totem'; },
      reiniciar(pz) { for (const p of pz.placas) p.pisada = false; }
    },

    // ---------- (6) balança: os dois pratos com a mesma soma ----------
    balanca: {
      montar(pz, pecas, def, api) {
        const info = puzzlesDoDia(api.dia()), { min, max } = info.balanca, nE = pecas['['].length, nD = pecas[']'].length;
        pz.tema = info.tema; pz.esq = pecas['[']; pz.dir = pecas[']']; pz.totem = pecas.Y[0];
        const valor = () => { let v = 0; while (!v) v = min + Math.floor(Math.random() * (max - min + 1)); return v; };
        let sol = null;
        for (let t = 0; t < 400 && !sol; t++) {
          const e = Array.from({ length: nE }, valor), d = Array.from({ length: nD - 1 }, valor), resto = e.reduce((a, b) => a + b, 0) - d.reduce((a, b) => a + b, 0);
          if (resto && resto >= min && resto <= max) sol = [...e, ...d, resto];
        }
        sol = sol || Array.from({ length: nE + nD }, () => 1);
        pz.solucao = sol.slice();
        while (sol.length < pecas.K.length) sol.push(valor());
        const vals = embaralhar(sol);
        pz.sacos = pecas.K.map((p, i) => ({ ...p, c0: p.c, l0: p.l, n: vals[i] }));
        pz.tentativa = '';
      },
      solido: (pz, c, l) => !!em(pz.sacos, c, l) || (!!pz.totem && pz.totem.c === c && pz.totem.l === l),
      bater(pz, c, l, [dx, dy], api) {
        const s = em(pz.sacos, c, l);
        if (!s) return !!pz.totem && pz.totem.c === c && pz.totem.l === l;
        const nc = c + dx, nl = l + dy;
        if (!na(pz, nc, nl) || !api.livre(nc, nl) || em(pz.sacos, nc, nl) || (pz.totem && pz.totem.c === nc && pz.totem.l === nl)) return true;
        s.c = nc; s.l = nl; mexeu(pz); api.som('clique');
        const cheio = [...pz.esq, ...pz.dir].every(p => em(pz.sacos, p.c, p.l));
        if (cheio) {
          const se = soma(pz, pz.esq), sd = soma(pz, pz.dir), chave = pz.sacos.map(x => x.c + ':' + x.l).join('|');
          const conta = `${pz.esq.map(p => ent(em(pz.sacos, p.c, p.l).n)).join(' + ')} = ${pz.dir.map(p => ent(em(pz.sacos, p.c, p.l).n)).join(' + ')}`;
          if (se === sd) { api.registrar(true, conta, pz.tema); resolver(pz, api); }
          else if (chave !== pz.tentativa) { pz.tentativa = chave; pz.errou = true; api.registrar(false, conta, pz.tema); api.som('erro'); api.flutuar(`⚖️ ${fmt(se)} ≠ ${fmt(sd)}`, nc + .5, nl); }
        }
        return true;
      },
      desenhar(pz, g) {
        for (const p of [...pz.esq, ...pz.dir]) { g.fillStyle = '#9AA0AE'; oval(g, p.c * T + T / 2, p.l * T + T / 2 + 4, 13, 7); g.fillStyle = '#C9CED8'; oval(g, p.c * T + T / 2, p.l * T + T / 2 + 2, 11, 5); }
        // braço da balança: inclina para o lado mais pesado
        const se = soma(pz, pz.esq), sd = soma(pz, pz.dir), meio = (lista, k) => lista.reduce((a, p) => a + p[k], 0) / lista.length;
        if (pz.esq.length && pz.dir.length) {
          const xe = meio(pz.esq, 'c') * T + T / 2, xd = meio(pz.dir, 'c') * T + T / 2, y = Math.min(meio(pz.esq, 'l'), meio(pz.dir, 'l')) * T - 10;
          const inc = Math.max(-8, Math.min(8, (sd - se) * 1.2));
          g.strokeStyle = '#C9A43A'; g.lineWidth = 3; g.beginPath(); g.moveTo(xe, y - inc); g.lineTo(xd, y + inc); g.stroke();
          g.fillStyle = '#C9A43A'; circ(g, (xe + xd) / 2, y, 4);
        }
        for (const s of pz.sacos) { g.fillStyle = '#C8A06A'; g.beginPath(); g.ellipse(s.c * T + T / 2, s.l * T + T / 2 + 3, 11, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#8A6A3A'; g.fillRect(s.c * T + T / 2 - 5, s.l * T + 5, 10, 4); }
        if (pz.totem) totem(g, pz.totem.c, pz.totem.l);
      },
      rotulos(pz, g) {
        for (const s of pz.sacos) texto(g, fmt(s.n), s.c * T + T / 2, s.l * T + T / 2 + 4, 12, s.n < 0 ? '#9FD8FF' : '#fff');
        const rot = (lista, txt) => { if (!lista.length) return; const p = lista[0]; texto(g, txt, (lista.reduce((a, q) => a + q.c, 0) / lista.length) * T + T / 2, Math.min(...lista.map(q => q.l)) * T - 4, 11, '#FFE08A'); };
        rot(pz.esq, `Σ ${fmt(soma(pz, pz.esq))}`); rot(pz.dir, `Σ ${fmt(soma(pz, pz.dir))}`);
        if (pz.totem) placaTexto(g, 'Equilibre ⚖️', pz.totem.c * T + T / 2, pz.totem.l * T - 6);
      },
      dica(pz) {
        const s = pz.sacos.find(x => pz.solucao.includes(x.n) && ![...pz.esq, ...pz.dir].some(p => p.c === x.c && p.l === x.l));
        if (s) pz.destaque = { c: s.c, l: s.l, t: 5 };
        return 'Os dois lados com a mesma soma';
      },
      reiniciar(pz) { for (const s of pz.sacos) { s.c = s.c0; s.l = s.l0; } pz.tentativa = ''; }
    },

    // ---------- (7) ponte numérica: pule na sequência do totem ----------
    ponte: {
      montar(pz, pecas, def, api) {
        const info = puzzlesDoDia(api.dia()), termos = info.sequencia.termos;
        pz.tema = info.tema; pz.seq = info.sequencia; pz.totem = pecas.Y[0];
        pz.inicio = def.inicio ? { c: def.inicio[0], l: def.inicio[1] } : api.inicioMapa();
        // fileiras de pedras, da mais perto para a mais longe da margem de partida
        const dist = p => Math.abs(p.c - pz.inicio.c) + Math.abs(p.l - pz.inicio.l);
        const porLinha = {}, media = k => pecas['*'].reduce((a, p) => a + p[k], 0) / Math.max(1, pecas['*'].length);
        const deitada = Math.abs(media('l') - pz.inicio.l) >= Math.abs(media('c') - pz.inicio.c); // ponte para cima/baixo: fileiras são linhas
        for (const p of pecas['*']) { const k = deitada ? 'l' + p.l : 'c' + p.c; (porLinha[k] = porLinha[k] || []).push(p); }
        const fileiras = Object.values(porLinha).sort((a, b) => Math.min(...a.map(dist)) - Math.min(...b.map(dist)));
        pz.pedras = [];
        fileiras.forEach((lista, r) => {
          const certo = termos[Math.min(r, termos.length - 1)], passo = Math.abs((termos[1] || 2) - (termos[0] || 0)) || 2, usados = new Set([certo]);
          const j = Math.floor(Math.random() * lista.length);
          lista.forEach((p, i) => {
            let n = certo;
            if (i !== j) { for (let t = 0; t < 50 && usados.has(n); t++) n = certo + (Math.random() < .5 ? -1 : 1) * (1 + Math.floor(Math.random() * Math.max(2, passo))); usados.add(n); }
            pz.pedras.push({ ...p, n, fileira: r, certa: i === j, acesa: false, afunda: 0 });
          });
        });
        pz.fileiras = fileiras.length; pz.proxima = 0;
      },
      solido: (pz, c, l) => !!pz.totem && pz.totem.c === c && pz.totem.l === l,
      bater: (pz, c, l) => TIPOS.ponte.solido(pz, c, l),
      pedra: (pz, c, l) => pz.pedras.some(p => p.c === c && p.l === l && p.afunda <= 0),
      pisou(pz, c, l, api) {
        const p = pz.pedras.find(x => x.c === c && x.l === l);
        if (!p || p.acesa) return;
        mexeu(pz);
        const conta = `${pz.seq.texto} → ${fmt(p.n)}`;
        if (p.certa && p.fileira === pz.proxima) {
          p.acesa = true; pz.proxima++; api.som('acerto'); api.registrar(true, conta, pz.tema);
          if (pz.proxima === pz.fileiras) resolver(pz, api);
        } else {
          p.afunda = C.ponte.afunda; pz.errou = true; api.som('erro'); api.registrar(false, conta, pz.tema);
          api.flutuar('💦', c + .5, l); api.levarPara(pz.inicio.c, pz.inicio.l);
        }
      },
      atualizar(pz, dt) { for (const p of pz.pedras) p.afunda = Math.max(0, p.afunda - dt); },
      desenhar(pz, g, t) {
        for (const p of pz.pedras) {
          const x = p.c * T + T / 2, y = p.l * T + T / 2;
          if (p.afunda > 0) { g.fillStyle = 'rgba(255,255,255,.5)'; circ(g, x - 4, y + Math.sin(t * 9) * 2, 2.5); circ(g, x + 5, y - 2, 2); continue; }
          g.fillStyle = 'rgba(0,0,0,.25)'; oval(g, x, y + 4, 13, 8);
          g.fillStyle = p.acesa ? '#7DF9FF' : '#8D8A96'; oval(g, x, y + 1, 13, 9);
          g.fillStyle = 'rgba(255,255,255,.18)'; oval(g, x - 3, y - 2, 6, 3);
        }
        if (pz.totem) totem(g, pz.totem.c, pz.totem.l);
      },
      rotulos(pz, g) {
        for (const p of pz.pedras) if (p.afunda <= 0) texto(g, fmt(p.n), p.c * T + T / 2, p.l * T + T / 2 + 1, Math.abs(p.n) >= 100 ? 10 : 12);
        if (pz.totem) placaTexto(g, pz.seq.texto, pz.totem.c * T + T / 2, pz.totem.l * T - 6);
      },
      dica(pz) { const p = pz.pedras.find(x => x.certa && x.fileira === pz.proxima); if (p) pz.destaque = { c: p.c, l: p.l, t: 5 }; return 'Siga a sequência do totem'; },
      reiniciar(pz) { for (const p of pz.pedras) { p.acesa = false; p.afunda = 0; } pz.proxima = 0; }
    }
  };

  const pecasFixas = pz => pz.fixas || [];
  const soma = (pz, lista) => lista.reduce((a, p) => { const s = em(pz.sacos, p.c, p.l); return a + (s ? s.n : 0); }, 0);
  function placaTexto(g, txt, x, y) {
    g.font = '900 11px ui-rounded, "Nunito", system-ui, sans-serif';
    const w = g.measureText(txt).width + 14;
    g.fillStyle = 'rgba(5,6,12,.78)'; caixa(g, x - w / 2, y - 10, w, 18, 9);
    g.fillStyle = '#FFE08A'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y - 1); g.textBaseline = 'alphabetic';
  }
  function mostrar(pz, lento = 1) { if (pz.tipo === 'memoria' && !pz.resolvido) { pz.mostra = { t: -.3, lento }; pz.passo = 0; } }

  function resolver(pz, api) {
    pz.resolvido = true;
    for (const p of pz.portas) if (!p.aberta) { p.aberta = true; api.abrirPorta(p.c, p.l); }
    api.som('bau');
    const x = (pz.area[0] + pz.area[2] + 1) / 2, y = (pz.area[1] + pz.area[3] + 1) / 2;
    api.flutuar('✨ Resolvido!', x, y);
    if (pz.recompensa === 'bau' && pz.bau) api.bau(pz.bau[0], pz.bau[1]);
    else { api.moeda(C.moedas); api.flutuar(`+${C.moedas} 🪙`, x, y + .6); }
    if (!pz.errou && api.gema) { api.gema(C.gemaSemErro); api.flutuar(`💎 +${C.gemaSemErro}`, x, y - .6); }
    api.resolvido(pz);
  }

  // ---------- montar os puzzles do mapa: recolhe as peças da grade dentro de cada área ----------
  function montar(lista, G, api) {
    return (lista || []).map((def, k) => {
      const pz = { ...def, k, tipo: def.tipo, area: def.area, recompensa: def.recompensa || (def.bau ? 'bau' : 'moedas'), parado: 0, destaque: null, resolvido: false };
      const pecas = { K: [], _: [], D: [], L: [], Q: [], Y: [], k: [], '[': [], ']': [], '*': [] };
      for (let l = def.area[1]; l <= def.area[3]; l++) for (let c = def.area[0]; c <= def.area[2]; c++) {
        const ch = G.g[l] && G.g[l][c];
        if (!(ch in pecas)) continue;
        pecas[ch].push({ c, l });
        if (ch !== 'D') G.g[l][c] = ch === '*' ? '~' : '.';
      }
      pz.portas = pecas.D.map(p => ({ ...p, aberta: false }));
      if (!TIPOS[pz.tipo]) return null;
      TIPOS[pz.tipo].montar(pz, pecas, def, api);
      if (['alavancas'].includes(pz.tipo)) pz.fixas = pecas.Y;
      if (api.jaResolvido(k)) { pz.resolvido = true; for (const p of pz.portas) { p.aberta = true; api.abrirPorta(p.c, p.l); } }
      return pz;
    }).filter(Boolean);
  }

  const daquele = (G, c, l) => G.puzzles.find(pz => na(pz, c, l));
  return {
    montar,
    solido: (G, c, l) => G.puzzles.some(pz => TIPOS[pz.tipo].solido && TIPOS[pz.tipo].solido(pz, c, l)),
    pedra: (G, c, l) => G.puzzles.some(pz => TIPOS[pz.tipo].pedra && TIPOS[pz.tipo].pedra(pz, c, l)),
    bater(G, c, l, dir, api) { for (const pz of G.puzzles) { const tp = TIPOS[pz.tipo]; if (tp.bater && tp.bater(pz, c, l, VET[dir] || [0, 0], api)) return true; } return false; },
    pisou(G, c, l, api) { for (const pz of G.puzzles) { const tp = TIPOS[pz.tipo]; if (!pz.resolvido && tp.pisou && na(pz, c, l)) tp.pisou(pz, c, l, api); } },
    atualizar(G, dt, api) {
      const P = api.heroi(), c = Math.floor(P.x), l = Math.floor(P.y);
      for (const pz of G.puzzles) {
        const tp = TIPOS[pz.tipo];
        if (tp.atualizar) tp.atualizar(pz, dt, api);
        if (pz.destaque) { pz.destaque.t -= dt; if (pz.destaque.t <= 0) pz.destaque = null; }
        if (pz.resolvido || !na(pz, c, l)) continue;
        pz.parado += dt;
        if (pz.parado >= C.dica) { pz.parado = 0; api.toast(`💡 ${tp.dica(pz, api)}`); }
      }
    },
    desenhar(G, g, t, api) {
      for (const pz of G.puzzles) {
        TIPOS[pz.tipo].desenhar(pz, g, t, api);
        if (!TIPOS[pz.tipo].portasProprias) for (const p of pz.portas) if (!p.aberta) porta(g, p.c, p.l, pz.resolvido ? '#3DDC84' : '#FFD43B');
      }
    },
    rotulos(G, g, t, api) {
      for (const pz of G.puzzles) {
        const tp = TIPOS[pz.tipo];
        if (tp.rotulos) tp.rotulos(pz, g, t, api);
        if (pz.destaque) { // dica: contorno que pulsa
          g.strokeStyle = '#FFE08A'; g.lineWidth = 2.5; g.globalAlpha = .6 + .4 * Math.sin(t * 8);
          g.strokeRect(pz.destaque.c * T + 2, pz.destaque.l * T + 2, T - 4, T - 4); g.globalAlpha = 1;
        }
      }
    },
    reiniciar(G, x, y, api) { const pz = daquele(G, Math.floor(x), Math.floor(y)); if (!pz || pz.resolvido) return false; TIPOS[pz.tipo].reiniciar(pz, api); pz.parado = 0; api.som('clique'); return true; },
    atual: (G, x, y) => { const pz = daquele(G, Math.floor(x), Math.floor(y)); return pz && !pz.resolvido ? pz : null; },
    todosResolvidos: G => G.puzzles.every(pz => pz.resolvido),
    hud: G => G.puzzles.map(pz => (TIPOS[pz.tipo].hud ? TIPOS[pz.tipo].hud(pz) : '')).join(''),
    luzes: G => G.puzzles.map(pz => ({ x: (pz.area[0] + pz.area[2] + 1) / 2, y: (pz.area[1] + pz.area[3] + 1) / 2, r: Math.max(pz.area[2] - pz.area[0], pz.area[3] - pz.area[1]) / 2 + 1.5 }))
  };
})();
