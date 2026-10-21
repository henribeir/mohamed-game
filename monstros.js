/* Mohamed — monstros.js: monstros originais de cada bioma, mini-chefes e chefões.
   Cada monstro tem um jeito de agir no mapa, vida, tema das perguntas e uma fraqueza:
   usar o poder certo na batalha dá dano extra. A batalha por turnos continua igual.
   Todos os números da furtividade e da visão ficam em CONFIG_MONSTROS. */

const CONFIG_MONSTROS = {
  visao: { alcance: 3.6, angulo: 40, colado: .85 },        // casas · graus para cada lado · encostado (emboscador nota até no mato)
  ouvido: { andando: 1.2, correndo: 4.2 },                   // correr faz barulho: percebem de mais longe
  correr: { joystick: .92, velocidade: 1.5 },                // joystick na borda (ou Shift) corre
  desconfiado: { tempo: 1.6, confirma: .5 },                 // "?" dura até 1,6 s; ver por 0,5 s vira perseguição
  perder: 3,                                                 // sem ver o aluno por 3 s, volta a patrulhar
  dormindo: { acorda: 2.4 },                                 // dormindo só acorda com corrida bem perto
  espreita: { distancia: 2.2, aviso: .3 },                   // emboscador: olhos acendem e treme 0,3 s
  mato: { alfa: .5 },                                        // no mato: herói meio transparente e invisível
  furtivo: { vidaMenos: .25, primeiroGolpe: 2 },             // ataque furtivo: −25% de vida e 1º acerto em dobro
  fraqueza: { bonus: .5 },                                   // poder certo: +50% de dano no resto da batalha
  tiro: { vel: 4.2, carga: .6, intervalo: 2.6, alcance: 6 }, // atirador: avisa brilhando antes de atirar
  corredor: { cansa: 2.2, descanso: .8 },                    // corre 2,2 s e para para respirar
  voador: { onda: .35, freq: 2.2 },                          // ondula sobre a água
  investida: { intervalo: 4, carga: .6, vel: 6, dura: .45 }, // mini-chefe: avisa e avança
  tamanho: { normal: 1.1, mini: 1.45, chefe: 1.7 },
  vidaMini: 90
};

const PODER_ICONE = { nove: '⚡', escudo: '🛡️', dica: '💡' };

// jeitos de agir: velocidade passeando e perseguindo, tipo de patrulha e manias
const JEITOS = {
  patrulheiro: { vel: .8, caca: 1.7, patrulha: 'linha' },               // lento e resistente, vai e volta
  corredor: { vel: 1.6, caca: 3.1, patrulha: 'solto', cansa: true },     // rápido e frágil, cansa
  emboscador: { vel: .7, caca: 2.4, patrulha: 'parado', espreita: true }, // escondido no mato
  atirador: { vel: .9, caca: .7, patrulha: 'solto', atira: true },        // atira de longe e mantém distância
  voador: { vel: 1.3, caca: 1.9, patrulha: 'onda', voa: true },           // passa por cima da água
  golem: { vel: 1.4, caca: 1.8, patrulha: 'linha', soComHeroi: true }      // só anda quando o aluno anda
};

// ---------- arte em SVG simples (traço escuro, cores chapadas) ----------
const ARTE_MONSTRO = (() => {
  const K = '#1E1240', CT = `stroke="${K}" stroke-width="4" stroke-linejoin="round"`;
  const olho = (x, y, r = 9, iris = K) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${CT}/><circle cx="${x - 1.5}" cy="${y + 1}" r="${r * .5}" fill="${iris}"/>`;
  const traco = d => `<path d="${d}" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const forma = (d, cor) => `<path d="${d}" fill="${cor}" ${CT}/>`;
  const bola = (cx, cy, rx, ry, cor) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${cor}" ${CT}/>`;
  const coroa = `<path d="M28 4 L34 -18 L44 -6 L50 -22 L56 -6 L66 -18 L72 4Z" fill="#FFC531" ${CT}/><circle cx="50" cy="-9" r="3.5" fill="#FF4B5C"/>`;
  const faixa = cor => `<path d="M16 34 Q50 22 84 34 L84 42 Q50 30 16 42Z" fill="${cor}" ${CT}/>`;
  return {
    brotao: () => forma('M50 26 Q38 6 22 12 Q32 28 50 26Z M50 26 Q62 4 80 10 Q70 28 50 26Z', '#86EFAC') + traco('M50 26 V36') + bola(50, 64, 38, 32, '#22C55E') + olho(50, 56, 14) + traco('M38 76 Q50 84 62 76'),
    saltito: () => bola(36, 22, 7, 20, '#FFF1C9') + bola(64, 22, 7, 20, '#FFF1C9') + bola(50, 64, 34, 30, '#FFE08A') + olho(38, 58, 8) + olho(62, 58, 8) + `<circle cx="50" cy="70" r="4" fill="#FF8FB1"/>` + traco('M44 78 Q50 82 56 78'),
    moitinha: () => [[30, 58], [50, 46], [70, 58], [38, 74], [62, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#3E9B45" ${CT}/>`).join('') + `<circle cx="50" cy="64" r="22" fill="#4CAF50"/>` + olho(40, 62, 7) + olho(60, 62, 7) + forma('M50 30 Q58 18 66 24 Q58 30 50 30Z', '#86EFAC'),
    espantalho: () => forma('M10 40 L50 8 L90 40Z', '#8A5A2B') + bola(50, 64, 30, 30, '#E8C27A') + `<rect x="34" y="50" width="12" height="10" rx="2" fill="${K}"/>` + olho(62, 56, 7) + traco('M36 76 L42 72 L48 76 L54 72 L60 76 L66 72') + traco('M20 92 L50 88 L80 92'),
    raizao: () => forma('M50 26 Q34 0 14 8 Q28 30 50 26Z M50 26 Q66 -2 86 6 Q72 30 50 26Z', '#86EFAC') + bola(50, 64, 42, 34, '#16A34A') + olho(36, 56, 11) + olho(64, 56, 11) + traco('M24 40 L42 46 M76 40 L58 46') + traco('M36 78 Q50 86 64 78'),

    musguento: () => forma('M14 80 Q10 40 50 30 Q90 40 86 80 Q50 92 14 80Z', '#2F6B3A') + `<circle cx="34" cy="52" r="6" fill="#5FAF5A"/><circle cx="68" cy="46" r="5" fill="#5FAF5A"/><circle cx="60" cy="76" r="4" fill="#5FAF5A"/>` + olho(40, 62, 8, '#C9A100') + olho(62, 62, 8, '#C9A100'),
    cogumago: () => `<rect x="34" y="50" width="32" height="40" rx="12" fill="#F4E9D0" ${CT}/>` + forma('M8 56 Q12 12 50 10 Q88 12 92 56Z', '#E2453C') + `<circle cx="30" cy="34" r="6" fill="#fff"/><circle cx="56" cy="24" r="5" fill="#fff"/><circle cx="74" cy="40" r="5" fill="#fff"/>` + olho(42, 68, 6) + olho(58, 68, 6) + traco('M44 82 H56'),
    tronculho: () => `<rect x="18" y="30" width="64" height="62" rx="10" fill="#7A5534" ${CT}/>` + bola(50, 30, 32, 10, '#B08458') + traco('M40 30 Q50 34 60 30') + forma('M18 40 Q4 30 10 18 Q20 26 18 40Z', '#4CAF50') + olho(38, 56, 8) + olho(62, 56, 8) + traco('M40 76 Q50 70 60 76'),
    coruja: () => forma('M16 92 Q12 30 30 18 L36 6 L44 18 H56 L64 6 L70 18 Q88 30 84 92Z', '#6B4FA0') + bola(50, 70, 20, 16, '#B9A2E8') + olho(36, 42, 12, '#C9A100') + olho(64, 42, 12, '#C9A100') + forma('M46 54 L54 54 L50 62Z', '#FFB347'),
    anciaBosque: () => `<circle cx="30" cy="34" r="24" fill="#1F7A3A" ${CT}/><circle cx="70" cy="34" r="24" fill="#1F7A3A" ${CT}/><circle cx="50" cy="20" r="24" fill="#2E9B4A" ${CT}/>` + `<rect x="28" y="40" width="44" height="56" rx="14" fill="#8A6440" ${CT}/>` + olho(40, 60, 8) + olho(60, 60, 8) + traco('M42 80 Q50 86 58 80'),

    aguaviva: () => forma('M14 54 Q14 12 50 12 Q86 12 86 54Z', '#FF9ED1') + traco('M24 56 Q20 70 28 84 M42 56 Q38 72 46 90 M58 56 Q62 72 54 90 M76 56 Q80 70 72 84') + olho(38, 36, 7) + olho(62, 36, 7),
    pincudo: () => traco('M28 72 L14 86 M72 72 L86 86 M36 78 L28 92 M64 78 L72 92') + bola(50, 64, 30, 20, '#E4553F') + `<circle cx="14" cy="44" r="12" fill="#E4553F" ${CT}/><circle cx="86" cy="44" r="12" fill="#E4553F" ${CT}/>` + traco('M40 46 V30 M60 46 V30') + olho(40, 28, 7) + olho(60, 28, 7),
    ourico: () => `<path d="${Array.from({ length: 24 }, (_, k) => { const r = k % 2 ? 26 : 44, a = (k * Math.PI) / 12; return `${k ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(56 + Math.sin(a) * r).toFixed(1)}`; }).join(' ')}Z" fill="#8E44AD" ${CT}/>` + `<circle cx="50" cy="56" r="22" fill="#A55BC8"/>` + olho(42, 54, 7) + olho(58, 54, 7) + traco('M44 68 Q50 72 56 68'),
    polvo: () => traco('M24 70 Q14 86 22 94 M40 74 Q36 90 44 96 M60 74 Q64 90 56 96 M76 70 Q86 86 78 94') + bola(50, 46, 34, 32, '#FF8A3D') + faixa('#C0392B') + `<path d="M32 54 L48 54" stroke="${K}" stroke-width="4"/><circle cx="40" cy="58" r="7" fill="${K}"/>` + olho(62, 58, 8) + traco('M44 72 Q50 76 56 72'),
    mare: () => forma('M50 4 Q72 36 84 56 Q94 94 50 96 Q6 94 16 56 Q28 36 50 4Z', '#22D3EE') + traco('M20 70 Q32 62 44 70 T68 70 T90 66') + olho(38, 52, 10) + olho(62, 52, 10) + traco('M24 36 L42 44 M76 36 L58 44') + traco('M40 82 H60'),

    rochedo: () => forma('M14 84 L10 50 L26 22 L58 12 L84 30 L90 66 L76 90 L30 92Z', '#7A7486') + traco('M30 40 L40 52 L36 64') + `<path d="M62 66 L70 56 L80 60" stroke="#FF7A2E" stroke-width="3" fill="none"/>` + olho(40, 58, 8) + olho(64, 50, 8) + traco('M44 76 H62'),
    brasinha: () => forma('M50 6 Q66 26 74 34 Q92 52 84 74 Q76 96 50 96 Q24 96 16 74 Q8 52 26 34 Q34 26 50 6Z', '#F97316') + forma('M50 42 Q62 56 60 70 Q56 84 50 84 Q44 84 40 70 Q38 56 50 42Z', '#FDE047') + olho(36, 56, 9) + olho(64, 56, 9) + traco('M44 76 Q50 80 56 76'),
    magmao: () => forma('M10 84 Q8 40 50 26 Q92 40 90 84 Q50 96 10 84Z', '#B4361E') + `<circle cx="30" cy="62" r="6" fill="#FFB347"/><circle cx="70" cy="70" r="5" fill="#FFB347"/><circle cx="56" cy="40" r="4" fill="#FFB347"/>` + olho(38, 56, 9) + olho(62, 56, 9) + traco('M26 42 L44 50 M74 42 L56 50') + traco('M40 78 H60'),
    salamandra: () => forma('M8 70 Q20 40 50 36 Q80 40 92 70 Q80 92 50 92 Q20 92 8 70Z', '#FF7A1A') + `<circle cx="30" cy="70" r="5" fill="${K}"/><circle cx="70" cy="74" r="5" fill="${K}"/><circle cx="52" cy="80" r="4" fill="${K}"/>` + faixa('#7A1F2B') + olho(38, 56, 9) + olho(62, 56, 9),
    vulcao: () => forma('M8 94 L36 22 H64 L92 94Z', '#6B4A3A') + forma('M36 22 Q50 6 64 22 Q56 30 50 24 Q44 30 36 22Z', '#FF5A1F') + olho(40, 56, 9) + olho(62, 56, 9) + traco('M26 42 L44 48 M74 42 L56 48') + traco('M40 76 L50 70 L60 76'),

    armadura: () => forma('M50 4 Q60 6 62 18 Q52 12 50 22Z', '#E2453C') + forma('M20 92 L20 44 Q20 16 50 16 Q80 16 80 44 L80 92Z', '#9CA3AF') + `<rect x="28" y="46" width="44" height="12" rx="5" fill="${K}"/><circle cx="40" cy="52" r="3.5" fill="#7DF9FF"/><circle cx="60" cy="52" r="3.5" fill="#7DF9FF"/>` + traco('M50 64 V88 M36 70 V86 M64 70 V86'),
    fantasminha: () => forma('M16 92 L16 44 Q16 10 50 10 Q84 10 84 44 L84 92 L72 82 L60 92 L50 82 L40 92 L28 82Z', '#F1F5FF') + olho(38, 46, 8) + olho(62, 46, 8) + `<circle cx="30" cy="60" r="5" fill="#FF8FB1" opacity=".6"/><circle cx="70" cy="60" r="5" fill="#FF8FB1" opacity=".6"/>` + traco('M44 66 Q50 72 56 66'),
    gargula: () => forma('M50 40 L6 20 L18 60Z M50 40 L94 20 L82 60Z', '#5E6474') + bola(50, 64, 28, 28, '#868C9C') + forma('M30 42 L24 22 L40 36Z M70 42 L76 22 L60 36Z', '#5E6474') + olho(40, 60, 7) + olho(60, 60, 7) + traco('M42 76 L50 72 L58 76'),
    cavaleiro: () => forma('M22 30 L12 6 L32 22Z M78 30 L88 6 L68 22Z', '#E9E1CF') + forma('M20 92 L20 44 Q20 16 50 16 Q80 16 80 44 L80 92Z', '#3F4552') + `<rect x="26" y="46" width="48" height="12" rx="5" fill="${K}"/><circle cx="40" cy="52" r="4" fill="#FF5A6E"/><circle cx="60" cy="52" r="4" fill="#FF5A6E"/>` + traco('M50 64 V88'),
    reiEsquecido: () => forma('M14 94 L14 44 Q14 8 50 8 Q86 8 86 44 L86 94 L72 84 L58 94 L50 84 L42 94 L28 84Z', '#BFD7FF') + forma('M30 66 Q50 96 70 66 Q50 76 30 66Z', '#E9F2FF') + olho(38, 44, 9) + olho(62, 44, 9) + traco('M26 30 L42 36 M74 30 L58 36'),
    svg: (nome, chefe) => `<svg viewBox="0 ${chefe ? -24 : 0} 100 ${chefe ? 124 : 100}" xmlns="http://www.w3.org/2000/svg">${ARTE_MONSTRO[nome]()}${chefe ? coroa : ''}</svg>`
  };
})();

// ---------- 3 monstros por bioma ----------
// tema: de onde saem as perguntas · fraqueza: poder que dá dano extra (⚡ nove, 🛡️ escudo, 💡 dica)
const TIPOS_MONSTRO = {
  brotao: { nome: 'Brotão', jeito: 'patrulheiro', vida: 60, tema: 'Natural', fraqueza: 'nove', arte: 'brotao' },
  saltito: { nome: 'Saltito', jeito: 'corredor', vida: 30, tema: 'Natural', fraqueza: 'escudo', arte: 'saltito' },
  moitinha: { nome: 'Moitinha', jeito: 'emboscador', vida: 40, tema: 'Natural', fraqueza: 'dica', arte: 'moitinha' },
  musguento: { nome: 'Musguento', jeito: 'emboscador', vida: 40, tema: 'Negativo', fraqueza: 'dica', arte: 'musguento' },
  cogumago: { nome: 'Cogumago', jeito: 'atirador', vida: 35, tema: 'Negativo', fraqueza: 'escudo', arte: 'cogumago' },
  tronculho: { nome: 'Tronculho', jeito: 'golem', vida: 75, tema: 'Negativo', fraqueza: 'nove', arte: 'tronculho' },
  aguaviva: { nome: 'Águaviva', jeito: 'voador', vida: 35, tema: 'Tabuada', fraqueza: 'escudo', arte: 'aguaviva' },
  pincudo: { nome: 'Pinçudo', jeito: 'corredor', vida: 30, tema: 'Tabuada', fraqueza: 'nove', arte: 'pincudo' },
  ourico: { nome: 'Ouriço', jeito: 'atirador', vida: 40, tema: 'Tabuada', fraqueza: 'dica', arte: 'ourico' },
  rochedo: { nome: 'Rochedo', jeito: 'golem', vida: 80, tema: 'Divisão', fraqueza: 'dica', arte: 'rochedo' },
  brasinha: { nome: 'Brasinha', jeito: 'atirador', vida: 35, tema: 'Divisão', fraqueza: 'escudo', arte: 'brasinha' },
  magmao: { nome: 'Magmão', jeito: 'patrulheiro', vida: 65, tema: 'Divisão', fraqueza: 'nove', arte: 'magmao' },
  armadura: { nome: 'Armadura Oca', jeito: 'patrulheiro', vida: 70, tema: 'Tabuada', fraqueza: 'dica', arte: 'armadura' },
  fantasminha: { nome: 'Fantasminha', jeito: 'voador', vida: 35, tema: 'Negativo', fraqueza: 'nove', arte: 'fantasminha' },
  gargula: { nome: 'Gárgula', jeito: 'golem', vida: 80, tema: 'Divisão', fraqueza: 'escudo', arte: 'gargula' }
};
const MONSTROS_DO_BIOMA = {
  campo: ['brotao', 'saltito', 'moitinha'],
  floresta: ['musguento', 'cogumago', 'tronculho'],
  praia: ['aguaviva', 'pincudo', 'ourico'],
  vulcao: ['rochedo', 'brasinha', 'magmao'],
  castelo: ['armadura', 'fantasminha', 'gargula']
};

// mini-chefe: 2 fases na batalha; no mapa avisa e dá uma investida
const MINICHEFES = {
  campo: { nome: 'Espantalhão', tema: 'Natural', fraqueza: 'escudo', arte: 'espantalho' },
  floresta: { nome: 'Coruja Sombria', tema: 'Negativo', fraqueza: 'nove', arte: 'coruja' },
  praia: { nome: 'Polvo Pirata', tema: 'Tabuada', fraqueza: 'dica', arte: 'polvo' },
  vulcao: { nome: 'Salamandra', tema: 'Divisão', fraqueza: 'escudo', arte: 'salamandra' },
  castelo: { nome: 'Cavaleiro Sem Nome', tema: 'Tabuada', fraqueza: 'nove', arte: 'cavaleiro' }
};

// chefão: 3 fases na batalha; antes dela, ataca o mapa com um padrão que o aluno aprende
const CHEFOES = {
  campo: { nome: 'Rei Raizão', tema: 'Natural', fraqueza: 'nove', arte: 'raizao', padrao: 'espinhosCruz' },
  floresta: { nome: 'Anciã do Bosque', tema: 'Negativo', fraqueza: 'dica', arte: 'anciaBosque', padrao: 'galhos' },
  praia: { nome: 'Maré Gigante', tema: 'Tabuada', fraqueza: 'escudo', arte: 'mare', padrao: 'ondas' },
  vulcao: { nome: 'Vulcão Supremo', tema: 'Divisão', fraqueza: 'escudo', arte: 'vulcao', padrao: 'anelFogo' },
  castelo: { nome: 'Rei Esquecido', tema: 'Tabuada', fraqueza: 'nove', arte: 'reiEsquecido', padrao: 'setasCruz' }
};

// padrões do chefão no mapa (api.marcar avisa a casa antes de ferir; api.disparar lança um projétil)
const PADROES_CHEFE = {
  // campo: espinhos em cruz, depois em X
  espinhosCruz: { intervalo: 2.4, executar(b, k, api) {
    const c0 = Math.floor(b.x), l0 = Math.floor(b.y);
    const dirs = k % 2 ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) for (let s = 1; s <= 5; s++) api.marcar(c0 + dx * s, l0 + dy * s, 'espinhos', .7 + s * .06);
  } },
  // floresta: galhos caem perto do aluno (a sombra avisa)
  galhos: { intervalo: 1.9, executar(b, k, api) {
    const P = api.heroi();
    for (let n = 0; n < 4; n++) api.marcar(Math.floor(P.x) + Math.round(Math.random() * 4 - 2), Math.floor(P.y) + Math.round(Math.random() * 4 - 2), 'galho', .9);
  } },
  // praia: ondas varrem fileiras, uma de cada vez
  ondas: { intervalo: 2.6, executar(b, k, api) {
    const l0 = Math.floor(b.y) + 2 + (k % 3) * 2, c0 = Math.floor(b.x);
    for (let dc = -6; dc <= 6; dc++) api.marcar(c0 + dc, l0, 'onda', .7 + Math.abs(dc) * .05);
  } },
  // vulcão: anéis de fogo que crescem em volta do chefão
  anelFogo: { intervalo: 2.2, executar(b, k, api) {
    const r = 2 + (k % 3), n = Math.round(r * 7);
    const vistos = new Set();
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2, c = Math.round(b.x - .5 + Math.cos(a) * r), l = Math.round(b.y - .5 + Math.sin(a) * r);
      if (!vistos.has(c + ':' + l)) { vistos.add(c + ':' + l); api.marcar(c, l, 'fogo', .75); }
    }
  } },
  // castelo: setas em 8 direções, girando um pouco a cada vez
  setasCruz: { intervalo: 1.7, executar(b, k, api) {
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4 + (k % 2) * (Math.PI / 8);
      api.disparar(b.x, b.y, Math.cos(a), Math.sin(a), 'seta');
    }
  } }
};
