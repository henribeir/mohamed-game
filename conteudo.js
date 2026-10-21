// Mohamed — conteudo.js: mundos, dias e exercícios (formato no topo de app.js)

const MUNDOS = [
  { nome: 'Naturais', emoji: '🌿', cor: '#22C55E' },
  { nome: 'Inteiros', emoji: '❄️', cor: '#38BDF8' },
  { nome: 'Multiplicação', emoji: '🌋', cor: '#F97316' },
  { nome: 'Divisão', emoji: '🌊', cor: '#06B6D4' },
  { nome: 'Revisão', emoji: '🌌', cor: '#A855F7' }
];

const DIAS = [
  'Naturais', 'Ordem nos naturais', 'Soma e subtração', 'Inteiros', 'Reta dos inteiros',
  'ℕ dentro de ℤ', 'Soma de inteiros', 'Subtração de inteiros', 'Tabuada 1, 2 e 10', 'Tabuada 3, 4 e 5',
  'Tabuada 6 e 7', 'Tabuada 8 e 9', 'Tabuada completa', 'Regra dos sinais', 'Divisão',
  'Divisão com resto', 'Divisão de inteiros', 'Operações misturadas', 'Revisão', 'Prova final'
].map((titulo, i) => ({ n: i + 1, titulo, mundo: i < 3 ? 0 : i < 8 ? 1 : i < 14 ? 2 : i < 17 ? 3 : 4 }));

// ---------- utilidades para geradores ----------
const fmt = n => (n < 0 ? '−' + -n : String(n));      // −3 com o sinal tipográfico
const ent = n => (n < 0 ? `(${fmt(n)})` : String(n)); // negativo entre parênteses
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
function embaralhar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const distintos = (gerar, qtd) => { const s = new Set(); while (s.size < qtd) s.add(gerar()); return [...s]; };

const vf = (pergunta, resposta, dica, extra) => ({ tipo: 'vf', pergunta, resposta, dica, ...extra });
const fixa = (pergunta, opcoes, resposta, dica, extra) => ({ tipo: 'escolha', pergunta, opcoes, resposta, dica, ...extra });
const escolha = (pergunta, opcoes, resposta, dica, extra) => fixa(pergunta, embaralhar(opcoes), resposta, dica, extra);
const digitar = (pergunta, resposta, dica, extra) => ({ tipo: 'digitar', pergunta, resposta, dica, ...extra });

// números próximos e distintos do certo (sem negativos)
function vizinhos(certo, qtd = 2, raio = 3) {
  const s = new Set([certo]);
  while (s.size < qtd + 1) { const v = certo + rnd(-raio, raio); if (v >= 0) s.add(v); }
  return [...s];
}

// número fora de ℕ: negativo, decimal ou fração
const naoNatural = () => sortear([
  () => '−' + rnd(1, 30),
  () => rnd(0, 9) + ',' + rnd(1, 9),
  () => rnd(1, 4) + '/' + rnd(5, 9)
])();
const naoNaturais = qtd => distintos(naoNatural, qtd);

// dica visual: reta numérica com 11 marcas (destaca "marca"; "de" desenha o salto)
function reta(marca, ini = Math.max(0, marca - 5), de) {
  const X = v => 15 + (v - ini) * 30;
  let s = '<svg viewBox="0 0 330 60"><line x1="10" y1="22" x2="320" y2="22" stroke="#B9B5C9" stroke-width="4" stroke-linecap="round"/>';
  if (de !== undefined) s += `<path d="M${X(de)} 22Q${(X(de) + X(marca)) / 2} -14 ${X(marca)} 22" fill="none" stroke="#FF9F1C" stroke-width="3" stroke-dasharray="5 4"/><circle cx="${X(de)}" cy="22" r="8" fill="#FF9F1C"/>`;
  for (let k = 0; k <= 10; k++) {
    const v = ini + k, d = v === marca;
    s += `<circle cx="${X(v)}" cy="22" r="${d ? 10 : 5}" fill="${d ? '#7B2FF7' : '#B9B5C9'}"/>` +
      `<text x="${X(v)}" y="52" font-size="${Math.abs(v) > 99 ? 11 : 14}" font-weight="800" text-anchor="middle" fill="${d ? '#7B2FF7' : '#7A7396'}">${fmt(v)}</text>`;
  }
  return s + '</svg>';
}
// salto na reta: de "a" até "b" (|b − a| ≤ 10)
const salto = (a, b) => reta(b, Math.min(a, b) - Math.floor((10 - Math.abs(b - a)) / 2), a);

// dica visual: bolinhas em pares; a que sobra fica vermelha
function pares(n) {
  if (n < 1 || n > 20) return '';
  let s = `<svg viewBox="0 0 ${Math.ceil(n / 2) * 28 + 8} 64">`;
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${18 + Math.floor(i / 2) * 28}" cy="${18 + (i % 2) * 28}" r="10" fill="${n % 2 && i === n - 1 ? '#FF4B5C' : '#7B2FF7'}"/>`;
  }
  return s + '</svg>';
}
const dicaPar = n => `Último algarismo ${n % 10}: ${n % 2 ? 'ímpar' : 'par'}`;

// monta a lição: sorteia modelos sem repetir pergunta e encaixa o desafio-surpresa
function montar(modelos, surpresa, total = 8) {
  const lista = [], vistas = new Set();
  let fila = [], tentativas = 0;
  while (lista.length < total - 1) {
    if (!fila.length) fila = embaralhar(modelos);
    const ex = fila.pop()();
    const chave = ex.pergunta + JSON.stringify(ex.pares || ex.itens || ex.linhas || ex.tokens || [ex.a, ex.b, ex.n, ex.atual, ex.de, ex.resposta]);
    if (vistas.has(chave) && tentativas++ < 50) continue;
    vistas.add(chave);
    lista.push(ex);
  }
  lista.splice(rnd(2, lista.length - 1), 0, { ...surpresa(), surpresa: true });
  return lista;
}

// ---------- tipos novos (painéis) ----------
// conjunto: cada número vai para ℕ (naturais) ou só para ℤ (negativos)
const conjunto = (pergunta, nums, dica, extra) => ({ tipo: 'conjunto', pergunta, itens: nums.map(n => ({ t: fmt(n), alvo: n >= 0 ? 'ℕ' : 'ℤ' })), dica, visual: bonecas(), ...extra });
// ligar: pares [texto da conta, resultado]
const ligar = (pergunta, pares, dica, extra) => ({ tipo: 'ligar', pergunta, pares, dica, ...extra });
const ordenar = (pergunta, itens, decrescente, dica, extra) => ({
  tipo: 'ordenar', pergunta, itens, decrescente, dica,
  gabarito: itens.slice().sort((a, b) => (decrescente ? b - a : a - b)).map(fmt).join(decrescente ? ' > ' : ' < '), ...extra
});
// reta: tocar na posição do número (máx. 13 marcas)
const naReta = (pergunta, resposta, min, max, dica, extra) => ({ tipo: 'reta', pergunta, resposta, min, max, dica, ...extra });
// padrão: linhas prontas + última com "?" (ou "?" no fim)
const padrao = (linhas, ultima, resposta, dica, extra) => ({ tipo: 'padrao', pergunta: 'Complete o padrão 🧩', linhas, ultima, resposta, dica, ...extra });
const rapido = (ex, seg = 7) => ({ ...ex, limite: seg, pergunta: '⏱ ' + ex.pergunta });

// pares de números com soma/sub/produto distintos para "ligar"
function paresUnicos(gerar, qtd = 3) {
  const vistos = new Set(), lista = [];
  let t = 0;
  while (lista.length < qtd && t++ < 200) {
    const [c, r] = gerar();
    if (!vistos.has(r)) { vistos.add(r); lista.push([c, r]); }
  }
  return lista;
}
// 3 opções de inteiros perto do certo (inclui o erro de sinal), já com "−"
function perto(certo, raio = 3, qtd = 2) {
  const s = new Set([certo]);
  for (const v of embaralhar([-certo, certo + 1, certo - 1, certo + raio, certo - raio])) if (s.size < qtd + 1) s.add(v);
  return [...s].map(fmt);
}

// ---------- visuais ----------
const bonecas = () => '<svg viewBox="0 0 300 110"><rect x="4" y="4" width="292" height="102" rx="40" fill="#7B2FF714" stroke="#7B2FF7" stroke-width="4"/><text x="268" y="36" font-size="24" font-weight="900" fill="#7B2FF7" text-anchor="middle">ℤ</text><rect x="22" y="20" width="160" height="72" rx="30" fill="#1FC46B1f" stroke="#1FC46B" stroke-width="4"/><text x="46" y="48" font-size="20" font-weight="900" fill="#129A52">ℕ</text><text x="112" y="76" font-size="17" font-weight="800" fill="#1E1240" text-anchor="middle">0 · 1 · 2 · 3…</text><text x="240" y="84" font-size="17" font-weight="800" fill="#1E1240" text-anchor="middle">−1 · −2…</text></svg>';
function bolinhas(a, b) {
  let s = `<svg viewBox="0 0 ${b * 14 + 6} ${a * 14 + 6}">`;
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) s += `<circle cx="${10 + j * 14}" cy="${10 + i * 14}" r="5" fill="#7B2FF7"/>`;
  return s + '</svg>';
}
// truque dos dedos do 9: abaixe o dedo k → dezenas à esquerda, unidades à direita
function dedos(k) {
  let s = '<svg viewBox="0 0 250 96">';
  for (let i = 1; i <= 10; i++) {
    const x = 10 + (i - 1) * 22 + (i > 5 ? 12 : 0), baixo = i === k;
    s += `<rect x="${x}" y="${baixo ? 46 : 8}" width="16" height="${baixo ? 18 : 56}" rx="8" fill="${baixo ? '#FF4B5C' : i < k ? '#7B2FF7' : '#FFC531'}"/>`;
  }
  return s + `<text x="125" y="88" text-anchor="middle" font-size="15" font-weight="900" fill="#1E1240">9 × ${k}: ${k - 1} | ${10 - k} → ${9 * k}</text></svg>`;
}

// carta rara da regra dos sinais (dia 14) — vira power-up 🌟 no dia 17
const CARTA_SINAIS = 'd14l4';
const cartaSinais = () => '<svg viewBox="0 0 220 96"><rect width="220" height="96" rx="16" fill="#FFF3C4" stroke="#FFC531" stroke-width="4"/>' +
  [['(+)·(+) = +', 14, 38, '#129A52'], ['(−)·(−) = +', 114, 38, '#129A52'], ['(+)·(−) = −', 14, 76, '#D12C3D'], ['(−)·(+) = −', 114, 76, '#D12C3D']]
    .map(([t, x, y, c]) => `<text x="${x}" y="${y}" font-size="19" font-weight="900" fill="${c}">${t}</text>`).join('') + '</svg>';

// divisão: n bolinhas repartidas entre k amigos (painel com teclado)
const repartir = (n, k, pergunta, resposta, rotulo, extra) => ({
  tipo: 'repartir', pergunta, n, k, resposta, rotulo, conta: `${n} ÷ ${k}`,
  dica: `${n} ÷ ${k} = ${Math.floor(n / k)}${n % k ? `, sobra ${n % k}` : ''}`, visual: bolinhas(k, Math.max(1, Math.floor(n / k))), ...extra
});

// Extra A: o chão vira reta com casas; soma anda ➡️, subtração ⬅️ (11 casas)
function casas(de, passo, pergunta, piso = -Infinity) {
  const ate = de + passo, min = Math.max(piso, Math.min(de, ate) - rnd(0, 10 - Math.abs(passo)));
  return {
    tipo: 'casas', pergunta, de, resposta: ate, min, max: min + 10, conta: pergunta.replace(' = ?', ''),
    dica: `${Math.abs(passo)} casas para a ${passo > 0 ? 'direita ➡️' : 'esquerda ⬅️'}: ${fmt(ate)}`
  };
}

// fila das operações (dia 18): ( ) primeiro, depois × ÷, depois + −, da esquerda para a direita
function analisar(lista) {
  let id = 0;
  const tokens = lista.map(x => (typeof x === 'number' ? { t: ent(x) } : '+−×÷'.includes(x) ? { op: x, id: id++ } : { t: x }));
  const pilha = lista.map((x, i) => (typeof x === 'number' ? { n: x } : tokens[i].op ? { op: x, id: tokens[i].id } : { p: x }));
  const conta = (a, op, b) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b);
  const ordem = [], passos = [];
  while (pilha.length > 1) {
    const abre = pilha.map(x => x.p).lastIndexOf('(');
    const ini = abre + 1, fim = abre >= 0 ? pilha.findIndex((x, i) => i > abre && x.p === ')') : pilha.length;
    const trecho = pilha.slice(ini, fim);
    if (trecho.length === 1) { pilha.splice(abre, 3, trecho[0]); continue; }
    let k = trecho.findIndex(x => x.op === '×' || x.op === '÷');
    if (k < 0) k = trecho.findIndex(x => x.op);
    const a = trecho[k - 1].n, b = trecho[k + 1].n, r = conta(a, trecho[k].op, b);
    ordem.push(trecho[k].id);
    passos.push(`${ent(a)} ${trecho[k].op} ${ent(b)} = ${fmt(r)}`);
    pilha.splice(ini + k - 1, 3, { n: r });
  }
  return { tokens, ordem, passos, valor: pilha[0].n };
}
const textoExpr = lista => lista.map(x => (typeof x === 'number' ? ent(x) : x)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
function fila(lista, extra) {
  const { tokens, ordem, passos } = analisar(lista);
  return {
    tipo: 'fila', pergunta: 'Toque na ordem das contas 🚦', tokens, ordem, passos, conta: textoExpr(lista),
    gabarito: passos.map(x => x.split(' = ')[0]).join(' → '), dica: '( ) primeiro, depois × ÷, depois + −', ...extra
  };
}
const contaExpr = (lista, extra) => { const { passos, valor } = analisar(lista); return digitar(`${textoExpr(lista)} = ?`, valor, passos.join(' → '), extra); };

// ---------- montar dias ----------
// lic(título, ícone, [título da carta, regra, rara?], modelos, surpresa, gerar?)
const lic = (titulo, icone, carta, modelos, surpresa, gerar) => ({ titulo, icone, carta: { emoji: icone, titulo: carta[0], regra: carta[1], rara: !!carta[2] }, modelos, surpresa, gerar });
function criarDia(n, licoes, cartaChefao, surpresaChefao, totalChefao = 15) {
  DIAS[n - 1].licoes = [
    ...licoes.map((l, i) => ({ ...l, id: `d${n}l${i + 1}`, gerar: l.gerar || (() => montar(l.modelos, l.surpresa)) })),
    {
      id: `d${n}boss`, titulo: 'Chefão', icone: '👑', chefao: true,
      carta: { emoji: '👑', titulo: cartaChefao[0], regra: cartaChefao[1] },
      gerar: () => montar(licoes.flatMap(l => l.modelos), surpresaChefao, totalChefao)
    }
  ];
}

// ---------- gerador de tabuada ----------
const dicaTab = (a, b) => (a <= 4 && b > 1 ? `${Array(a).fill(b).join(' + ')} = ${a * b}` : `${a} fileiras de ${b} = ${a * b}`);
function opcoesProduto(a, b) {
  const s = new Set([a * b]);
  for (const v of embaralhar([a * (b + 1), a * (b - 1), (a + 1) * b, a * b + 1, a * b - 2])) if (s.size < 3 && v >= 0) s.add(v);
  return [...s];
}
// modos: conta, escolha, falta, grade, ligar, vf, padrao, tempo, tempoLigar; opções: { dedos: true } liga o power-up do 9
function tabuada(fatores, modos, op = {}) {
  const par = () => { const a = sortear(fatores), b = rnd(1, 10); return Math.random() < .5 ? [a, b] : [b, a]; };
  const extra = (a, b, semDedos) => ({ conta: `${a} × ${b}`, visual: a * b <= 60 ? bolinhas(Math.min(a, b), Math.max(a, b)) : '', ...(!semDedos && op.dedos && (a === 9 || b === 9) ? { dedos: a === 9 ? b : a } : {}) });
  const M = {
    conta: () => { const [a, b] = par(); return digitar(`${a} × ${b} = ?`, a * b, dicaTab(a, b), extra(a, b)); },
    escolha: () => { const [a, b] = par(); return escolha(`${a} × ${b}`, opcoesProduto(a, b), a * b, dicaTab(a, b), extra(a, b)); },
    falta: () => { const a = sortear(fatores), b = rnd(1, 10); return digitar(`${a} × ? = ${a * b}`, b, `${a} × ${b} = ${a * b}`, extra(a, b, true)); },
    grade: () => { const a = sortear(fatores), b = rnd(2, 10); return { tipo: 'grade', pergunta: 'Conte rápido! 👀', a: Math.min(a, b), b: Math.max(a, b), resposta: a * b, dica: dicaTab(a, b), ...extra(a, b) }; },
    ligar: () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const [a, b] = par(); return [`${a} × ${b}`, a * b]; }), 'Uma conta de cada vez'),
    vf: () => { const [a, b] = par(), c = a * b + sortear([0, 0, a, -a, 1]); return vf(`${a} × ${b} = ${c}?`, c === a * b, `${a} × ${b} = ${a * b}`, extra(a, b)); },
    padrao: () => { const a = sortear(fatores), k = rnd(1, 6); return padrao([0, 1, 2].map(i => `${a} × ${k + i} = ${a * (k + i)}`), `${a} × ${k + 3} =`, a * (k + 3), `Cada linha soma mais ${a}`); },
    tempo: () => { const [a, b] = par(); return rapido(escolha(`${a} × ${b}`, opcoesProduto(a, b), a * b, dicaTab(a, b), extra(a, b))); },
    tempoLigar: () => ({ ...M.ligar(), limite: 20, pergunta: '⏱ Ligue rápido! 🔗' })
  };
  return modos.map(m => M[m]);
}
// lição de tabuleiro: as contas da tabuada do n preenchem o tabuleiro
function tabuleiro(n, surpresa) {
  const feitos = [];
  const lista = embaralhar([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 7).map(k => {
    const ex = { tipo: 'tabuleiro', pergunta: `${n} × ${k} = ?`, n, atual: k, feitos: feitos.slice(), resposta: n * k, dica: dicaTab(n, k), conta: `${n} × ${k}` };
    feitos.push(k);
    return ex;
  });
  lista.splice(rnd(2, lista.length - 1), 0, { ...surpresa(), surpresa: true });
  return lista;
}

// ---------- DIA 1 · Naturais ----------
(() => {
  const SIM = 'ℕ ✔', NAO = 'Não';
  const par = () => rnd(1, 49) * 2;
  const impar = () => rnd(0, 49) * 2 + 1;

  // 1. O que são naturais e o zero
  const L1 = [
    () => vf('0 é um número natural?', true, 'ℕ começa no zero 🎯', { visual: reta(0) }),
    () => escolha('Menor número natural?', [0, 1, '−1'], 0, 'O primeiro de ℕ é o 0', { visual: reta(0) }),
    () => { const n = rnd(3, 60); return digitar(`Sucessor de ${n}?`, n + 1, `Sucessor: ${n} + 1 ➡️`, { visual: reta(n + 1) }); },
    () => { const n = rnd(2, 60); return digitar(`Antecessor de ${n}?`, n - 1, `Antecessor: ${n} − 1 ⬅️`, { visual: reta(n - 1) }); },
    () => vf('ℕ tem um último número?', false, 'Sempre cabe mais 1 ♾️'),
    () => { const k = rnd(1, 20); return vf(`−${k} é natural?`, false, 'Negativo fica fora de ℕ 🚫'); },
    () => { const n = rnd(1, 99); return vf(`${n} é natural?`, true, 'Inteiro sem sinal é ℕ ✔'); },
    () => { const n = rnd(2, 9); return escolha(`Quantos naturais antes de ${n}?`, vizinhos(n, 2, 2), n, `Conte de 0 até ${n - 1} 👆`, { visual: reta(n - 1, 0) }); }
  ];
  const S1 = () => digitar('Antecessor de 1?', 0, 'Antes do 1 vem o 0 👀', { visual: reta(0) });

  // 2. Caça ao natural
  const L2 = [
    () => { const n = rnd(0, 99); return escolha('Qual é natural?', [n, ...naoNaturais(2)], n, 'Sem −, vírgula ou barra 🔍'); },
    () => { const n = rnd(0, 20); return escolha('Toque no natural 👆', [n, naoNatural()], n, 'Sem −, vírgula ou barra 🔍'); },
    () => { const x = naoNatural(); return escolha('Qual NÃO é natural?', [x, rnd(0, 50), rnd(51, 999)], x, 'Tem −, vírgula ou barra 🚫'); },
    () => { const x = naoNatural(); return vf(`${x} é natural?`, false, 'Tem −, vírgula ou barra 🚫'); },
    () => { const n = rnd(100, 9999); return vf(`${n} é natural?`, true, 'Grande também é natural 💪'); },
    () => { const a = rnd(1, 5), b = a + rnd(3, 5); return digitar(`Quantos naturais de ${a} a ${b}?`, b - a + 1, `Conte: ${a}, ${a + 1}, … ${b}`, { visual: reta(b, a) }); },
    () => {
      const lista = embaralhar([...distintos(() => rnd(0, 60), rnd(1, 3)), ...naoNaturais(rnd(1, 2))]);
      return digitar(`Quantos naturais? ${lista.join(' · ')}`, lista.filter(v => typeof v === 'number').length, 'Conte só os sem − e vírgula');
    }
  ];
  const S2 = () => { const n = rnd(4, 9); return digitar(`Quantos naturais de 0 a ${n}?`, n + 1, 'O zero também conta! 0️⃣', { visual: reta(n, 0) }); };

  // 3. Pares e ímpares
  const L3 = [
    () => { const n = rnd(1, 20); return vf(`${n} é par?`, n % 2 === 0, dicaPar(n), { visual: pares(n) }); },
    () => { const n = rnd(21, 999); return fixa(`${n} é…`, ['Par', 'Ímpar'], n % 2 ? 'Ímpar' : 'Par', dicaPar(n)); },
    () => { const p = par(); return escolha('Qual é par?', [p, ...distintos(impar, 2)], p, 'Par termina em 0, 2, 4, 6, 8'); },
    () => { const i = impar(); return escolha('Qual é ímpar?', [i, ...distintos(par, 2)], i, 'Ímpar termina em 1, 3, 5, 7, 9'); },
    () => { const n = rnd(1, 60), r = n % 2 ? n + 1 : n + 2; return digitar(`Próximo par depois de ${n}?`, r, 'Pares vão de 2 em 2 👣', { visual: reta(r) }); },
    () => { const n = rnd(1, 60), r = n % 2 ? n + 2 : n + 1; return digitar(`Próximo ímpar depois de ${n}?`, r, 'Ímpares: 1, 3, 5, 7…', { visual: reta(r) }); },
    () => { const a = rnd(1, 9), b = rnd(1, 9); return vf(`${a} + ${b} dá par?`, (a + b) % 2 === 0, `${a} + ${b} = ${a + b}`, { visual: pares(a + b) }); }
  ];
  const S3 = () => vf('0 é par?', true, '0 ÷ 2 = 0, sem sobra ✔');

  // 4. Natural ou não
  const L4 = [
    () => { const x = naoNatural(); return fixa(`É natural? ${x}`, [SIM, NAO], NAO, 'Negativo, decimal ou fração: fora 🚫'); },
    () => { const n = rnd(0, 999); return fixa(`É natural? ${n}`, [SIM, NAO], SIM, 'Inteiro e sem sinal: é ℕ ✔'); },
    () => { const a = rnd(1, 9), b = a + rnd(1, 9); return fixa(`É natural? ${a} − ${b}`, [SIM, NAO], NAO, `${a} − ${b} = −${b - a} 🚫`); },
    () => { const a = rnd(5, 20), b = rnd(0, a - 1); return fixa(`É natural? ${a} − ${b}`, [SIM, NAO], SIM, `${a} − ${b} = ${a - b} ✔`); },
    () => { const a = rnd(0, 50), b = rnd(0, 50); return vf(`${a} + ${b} é natural?`, true, `${a} + ${b} = ${a + b} ✔`); },
    () => { const n = rnd(1, 9) * 2; return fixa(`É natural? ${n} ÷ 2`, [SIM, NAO], SIM, `${n} ÷ 2 = ${n / 2} ✔`, { visual: pares(n) }); },
    () => { const n = rnd(1, 9) * 2 + 1; return fixa(`É natural? ${n} ÷ 2`, [SIM, NAO], NAO, `${n} ÷ 2 = ${String(n / 2).replace('.', ',')} 🚫`, { visual: pares(n) }); }
  ];
  const S4 = () => fixa('É natural? 7 − 7', [SIM, NAO], SIM, '7 − 7 = 0, e 0 é ℕ 🎯');

  // 5. Classificar números
  const CLASSES = ['Par', 'Ímpar', 'Não ℕ'];
  const classe = x => typeof x === 'string' ? 'Não ℕ' : x % 2 ? 'Ímpar' : 'Par';
  const dicaClasse = x => typeof x === 'string' ? 'Tem −, vírgula ou barra: Não ℕ' : dicaPar(x);
  const contar = () => Array.from({ length: 5 }, () => rnd(1, 30));
  const L5 = [
    () => { const x = rnd(0, 99); return fixa(`Classifique: ${x}`, CLASSES, classe(x), dicaClasse(x)); },
    () => { const x = naoNatural(); return fixa(`Classifique: ${x}`, CLASSES, classe(x), dicaClasse(x)); },
    () => { const i = impar(); return escolha('Natural e ímpar?', [i, par(), '−' + impar()], i, 'Sem − e termina em 1, 3, 5, 7, 9'); },
    () => { const p = par(); return escolha('Natural e par?', [p, impar(), '−' + par()], p, 'Sem − e termina em 0, 2, 4, 6, 8'); },
    () => vf('Todo natural é par ou ímpar?', true, 'Ou sobra 1, ou não sobra 🧦'),
    () => { const l = contar(); return digitar(`Quantos pares? ${l.join(' · ')}`, l.filter(v => v % 2 === 0).length, 'Par termina em 0, 2, 4, 6, 8'); },
    () => { const l = contar(); return digitar(`Quantos ímpares? ${l.join(' · ')}`, l.filter(v => v % 2).length, 'Ímpar termina em 1, 3, 5, 7, 9'); },
    () => { const n = rnd(1, 50); return vf(`${n} é natural e par?`, n % 2 === 0, dicaPar(n)); }
  ];
  const S5 = () => { const a = impar(), b = par(), c = impar(); return digitar(`Some os ímpares: ${a} · ${b} · ${c}`, a + c, `${a} + ${c} = ${a + c}`); };

  // Chefão: 15 questões misturando tudo
  const SB = () => { const n = rnd(20, 99); return digitar(`Quantos naturais antes de ${n}?`, n, `De 0 a ${n - 1}: são ${n} 🎯`); };
  const TODOS = [...L1, ...L2, ...L3, ...L4, ...L5];

  DIAS[0].licoes = [
    { id: 'd1l1', titulo: 'O que são naturais', icone: '🌱', carta: { emoji: '🌱', titulo: 'Naturais', regra: 'ℕ = {0, 1, 2, 3, …}' }, modelos: L1, gerar: () => montar(L1, S1) },
    { id: 'd1l2', titulo: 'Caça ao natural', icone: '🔍', carta: { emoji: '🔍', titulo: 'Caça ao natural', regra: 'Sem sinal de menos e sem vírgula' }, modelos: L2, gerar: () => montar(L2, S2) },
    { id: 'd1l3', titulo: 'Pares e ímpares', icone: '⚖️', carta: { emoji: '⚖️', titulo: 'Par ou ímpar', regra: 'Par termina em 0, 2, 4, 6 ou 8' }, modelos: L3, gerar: () => montar(L3, S3) },
    { id: 'd1l4', titulo: 'Natural ou não', icone: '🚫', carta: { emoji: '🚫', titulo: 'Fora de ℕ', regra: 'Negativos, decimais e frações não são naturais' }, modelos: L4, gerar: () => montar(L4, S4) },
    { id: 'd1l5', titulo: 'Classificar números', icone: '🗂️', carta: { emoji: '🗂️', titulo: 'Classificar', regra: 'Todo natural é par ou ímpar' }, modelos: L5, gerar: () => montar(L5, S5) },
    { id: 'd1boss', titulo: 'Chefão', icone: '👑', chefao: true, carta: { emoji: '👑', titulo: 'Mestre dos naturais', regra: 'ℕ não tem fim: sempre há +1' }, gerar: () => montar(TODOS, SB, 15) }
  ];
})();

// ---------- comparar (dias 2 e 5) ----------
const relacao = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const comparar = (a, b) => fixa(`${fmt(a)} ? ${fmt(b)}`, ['<', '=', '>'], relacao(a, b),
  `${fmt(a)} ${relacao(a, b)} ${fmt(b)}: a boca abre para o maior 🐊`, { conta: `${fmt(a)} ? ${fmt(b)}` });

// ---------- DIA 2 · Ordem nos naturais ----------
(() => {
  const L1 = [
    () => comparar(rnd(0, 99), rnd(0, 99)),
    () => { const a = rnd(100, 999); return comparar(a, a + sortear([-10, -1, 1, 10])); },
    () => { const a = rnd(10, 99); return comparar(a, a); },
    () => { const a = rnd(12, 98), b = +String(a).split('').reverse().join(''); return comparar(a, a === b ? a + 1 : b); },
    () => { const [a, b] = distintos(() => rnd(0, 99), 2); return vf(`${a} > ${b}?`, a > b, `${a} ${relacao(a, b)} ${b}`); },
    () => { const l = distintos(() => rnd(0, 999), 3); return escolha('Qual é o maior?', l, Math.max(...l), 'Compare da esquerda para a direita'); },
    () => { const l = distintos(() => rnd(0, 999), 3); return escolha('Qual é o menor?', l, Math.min(...l), 'Compare da esquerda para a direita'); }
  ];
  const S1 = () => digitar('Maior natural de 2 algarismos?', 99, 'Depois do 99 vem o 100 (3 algarismos)');

  const L2 = [
    () => { const n = rnd(10, 999); return digitar(`Sucessor de ${n}?`, n + 1, `Sucessor: ${n} + 1`, { visual: reta(n + 1) }); },
    () => { const n = rnd(10, 999); return digitar(`Antecessor de ${n}?`, n - 1, `Antecessor: ${n} − 1`, { visual: reta(n - 1) }); },
    () => { const n = rnd(1, 9) * 10 + 9; return escolha(`Sucessor de ${n}?`, [n + 1, n - 9, n + 10], n + 1, `Depois do ${n} vira a dezena: ${n + 1}`); },
    () => { const n = rnd(1, 9) * 100; return escolha(`Antecessor de ${n}?`, [n - 1, n - 10, n + 1], n - 1, `${n} − 1 = ${n - 1}`); },
    () => { const n = rnd(2, 98); return digitar(`Quem está entre ${n - 1} e ${n + 1}?`, n, 'O vizinho do meio 👀', { visual: reta(n) }); },
    () => { const n = rnd(5, 99), d = sortear([0, 2, -1]); return vf(`O sucessor de ${n} é ${n + 1 + d}?`, d === 0, `Sucessor de ${n} = ${n + 1}`); }
  ];
  const S2 = () => fixa('Antecessor de 0 em ℕ?', ['Não tem', '−1', '1'], 'Não tem', 'ℕ começa no 0: não tem antes 👀');

  const L3 = [
    () => ordenar('Do menor ao maior ⬆️', distintos(() => rnd(0, 99), 4), false, 'Ache o menor primeiro'),
    () => ordenar('Do maior ao menor ⬇️', distintos(() => rnd(0, 99), 4), true, 'Ache o maior primeiro'),
    () => { const [a, b, c] = distintos(() => rnd(1, 9), 3); return ordenar('Do menor ao maior ⬆️', [a * 100 + b * 10 + c, b * 100 + c * 10 + a, c * 100 + a * 10 + b], false, 'Olhe primeiro as centenas'); },
    () => { const l = distintos(() => rnd(0, 99), 3); return escolha('Quem abre a ordem crescente?', l, Math.min(...l), 'Crescente começa no menor'); },
    () => { const l = distintos(() => rnd(0, 99), 3), m = l.slice().sort((a, b) => a - b)[1]; return digitar(`Quem fica no meio? ${l.join(' · ')}`, m, 'Ordene e pegue o do meio'); }
  ];
  const S3 = () => { const d = distintos(() => rnd(1, 9), 3); return digitar(`Maior número com ${d.join(', ')}?`, +d.slice().sort((x, y) => y - x).join(''), 'Maior algarismo na frente 💪'); };

  const L4 = [
    () => { const n = rnd(1, 9); return naReta(`Toque no ${n} 👆`, n, 0, 10, 'Conte os tracinhos desde o 0'); },
    () => { const b = rnd(1, 8) * 10, n = b + rnd(1, 9); return naReta(`Toque no ${n} 👆`, n, b, b + 10, `Conte a partir do ${b}`, { rotulos: [b, b + 10] }); },
    () => { const n = rnd(2, 8), d = rnd(1, 2); return naReta(`Toque ${d} depois do ${n}`, n + d, 0, 10, `${n} + ${d} = ${n + d}`, { rotulos: [0, n, 10] }); },
    () => { const [a, b] = distintos(() => rnd(0, 10), 2); return escolha(`Mais à direita: ${a} ou ${b}?`, [a, b], Math.max(a, b), 'Na reta, o maior fica à direita ➡️', { visual: reta(Math.max(a, b), 0) }); },
    () => vf('Na reta, o maior fica à direita?', true, 'Andar ➡️ é aumentar')
  ];
  const S4 = () => naReta('Toque no meio entre 0 e 10', 5, 0, 10, 'O meio de 10 é 5', { rotulos: [0, 10] });

  const verdade = () => { const [a, b] = distintos(() => rnd(0, 99), 2); return `${a} ${relacao(a, b)} ${b}`; };
  const mentira = () => { const [a, b] = distintos(() => rnd(0, 99), 2); return `${a} ${relacao(b, a)} ${b}`; };
  const L5 = [
    () => { const e = mentira(); return escolha('O Zé errou uma. Qual? 🔎', [...distintos(verdade, 2), e], e, 'A boca abre para o maior 🐊'); },
    () => { const n = rnd(10, 99), r = n + sortear([1, 1, 10, -1]); return vf(`Zé: "sucessor de ${n} é ${r}". Certo?`, r === n + 1, `Sucessor de ${n} = ${n + 1}`); },
    () => { const n = rnd(10, 99), r = n - sortear([1, 1, 10, -1]); return vf(`Zé: "antecessor de ${n} é ${r}". Certo?`, r === n - 1, `Antecessor de ${n} = ${n - 1}`); },
    () => { const l = distintos(() => rnd(0, 50), 3), o = Math.random() < .5 ? l.slice().sort((a, b) => a - b) : l; return vf(`Zé ordenou: ${o.join(' < ')}. Certo?`, o.every((v, i) => !i || o[i - 1] < v), 'Confira número por número'); },
    () => { const a = rnd(10, 40), b = rnd(10, 40), r = a + b + sortear([0, 10, -1]); return vf(`Zé: ${a} + ${b} = ${r}. Certo?`, r === a + b, `${a} + ${b} = ${a + b}`); }
  ];
  const S5 = () => vf('Zé: "0 não é natural". Certo?', false, 'O Zé errou: ℕ começa no 0 🎯');

  criarDia(2, [
    lic('Comparar', '🐊', ['Comparar', 'A boca do sinal abre para o maior'], L1, S1),
    lic('Antecessor e sucessor', '👣', ['Vizinhos', 'Antes: n − 1 · Depois: n + 1'], L2, S2),
    lic('Ordenar', '📶', ['Ordenar', 'Crescente: do menor ao maior'], L3, S3),
    lic('Reta numérica', '📏', ['Reta numérica', 'Mais à direita, maior o número'], L4, S4),
    lic('O Zé errou', '🔎', ['Detetive', 'Confira cada passo do Zé'], L5, S5)
  ], ['Mestre da ordem', 'Todo natural tem sucessor'], () => digitar('Sucessor de 999?', 1000, '999 + 1 = 1000'));
})();

// ---------- DIA 3 · Soma e subtração ----------
(() => {
  const L1 = [
    () => { const a = rnd(10, 60), b = rnd(10, 39); return digitar(`${a} + ${b} = ?`, a + b, 'Some unidades, depois dezenas'); },
    () => { const a = rnd(5, 50), b = rnd(5, 49); return escolha(`${a} + ${b}`, vizinhos(a + b, 2, 10), a + b, `${a} + ${b} = ${a + b}`); },
    () => { const a = rnd(10, 50), b = rnd(10, 49), r = a + b + sortear([0, 10, -10, 1]); return vf(`${a} + ${b} = ${r}?`, r === a + b, `${a} + ${b} = ${a + b}`); },
    () => { const a = rnd(2, 9), b = rnd(10, 40); return padrao([0, 1, 2].map(i => `${b} + ${a * i} = ${b + a * i}`), `${b} + ${a * 3} =`, b + a * 3, `Cada linha soma mais ${a}`); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(1, 20), b = rnd(1, 20); return [`${a} + ${b}`, a + b]; }), 'Uma conta de cada vez'),
    () => { const a = rnd(1, 9), b = rnd(10, 30); return vf(`${a} + ${b} = ${b} + ${a}?`, true, 'A ordem não muda a soma 🔄'); }
  ];
  const S1 = () => { const n = rnd(10, 99); return digitar(`0 + ${n} = ?`, n, 'Somar 0 não muda nada'); };

  const L2 = [
    () => { const a = rnd(20, 99), b = rnd(1, a); return digitar(`${a} − ${b} = ?`, a - b, 'Confira: resposta + tirado = início'); },
    () => { const a = rnd(20, 99), b = rnd(1, 19); return escolha(`${a} − ${b}`, vizinhos(a - b, 2, 10), a - b, `${a} − ${b} = ${a - b}`); },
    () => { const r = rnd(1, 30), b = rnd(1, 20); return digitar(`? − ${b} = ${r}`, r + b, `${r} + ${b} = ${r + b}`); },
    () => { const a = rnd(20, 60), b = rnd(1, 19), r = a - b + sortear([0, 1, -10]); return vf(`${a} − ${b} = ${r}?`, r === a - b, `${a} − ${b} = ${a - b}`); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(10, 30), b = rnd(1, 10); return [`${a} − ${b}`, a - b]; }), 'Uma conta de cada vez'),
    () => { const a = rnd(30, 60), k = rnd(2, 9); return padrao([0, 1, 2].map(i => `${a} − ${k * i} = ${a - k * i}`), `${a} − ${k * 3} =`, a - k * 3, `Cada linha tira mais ${k}`); }
  ];
  const S2 = () => { const n = rnd(10, 99); return digitar(`${n} − ${n} = ?`, 0, 'Tirar tudo deixa 0'); };

  const ITENS = ['🍞', '🧃', '🍎', '🍫', '🥛', '🍌'];
  const L3 = [
    () => { const [x, y] = distintos(() => sortear(ITENS), 2), a = rnd(2, 15), b = rnd(2, 15); return digitar(`${x} R$${a} e ${y} R$${b}. Total?`, a + b, `${a} + ${b} = ${a + b}`, { conta: `${a} + ${b}` }); },
    () => { const pago = sortear([10, 20, 50]), g = rnd(1, pago - 1); return digitar(`Paguei R$${pago}, gastei R$${g}. Troco?`, pago - g, `Troco = ${pago} − ${g}`, { conta: `${pago} − ${g}` }); },
    () => { const t = rnd(10, 30), v = rnd(1, t); return digitar(`Tinha ${t} 🍎, vendi ${v}. Restam?`, t - v, `${t} − ${v} = ${t - v}`); },
    () => { const c = rnd(5, 40), a = rnd(2, 20); return digitar(`Tenho R$${c}, ganho R$${a}. Fico com?`, c + a, `${c} + ${a} = ${c + a}`); },
    () => { const p = rnd(5, 20), d = rnd(1, 20); return vf(`R$${d} paga um 🍫 de R$${p}?`, d >= p, d >= p ? `${d} ≥ ${p}: dá!` : `Faltam R$${p - d}`); },
    () => ligar('Ligue compra e total 🛒', paresUnicos(() => { const a = rnd(1, 9), b = rnd(1, 9); return [`🍞${a} + 🧃${b}`, a + b]; }), 'Some os dois preços')
  ];
  const S3 = () => { const a = rnd(3, 9), b = rnd(3, 9); return digitar(`Gastei ${a} e ${b}. Paguei 20. Troco?`, 20 - a - b, `20 − ${a} − ${b} = ${20 - a - b}`); };

  const dez = a => `<svg viewBox="0 0 290 34">${Array.from({ length: 10 }, (_, i) => `<circle cx="${17 + i * 29}" cy="17" r="12" fill="${i < a ? '#7B2FF7' : '#fff'}" stroke="#7B2FF7" stroke-width="3"/>`).join('')}</svg>`;
  const L4 = [
    () => { const a = rnd(1, 9); return digitar(`${a} + ? = 10`, 10 - a, `Amigos do 10: ${a} e ${10 - a}`, { visual: dez(a) }); },
    () => { const a = rnd(1, 9); return escolha(`Quem leva o ${a} até 10?`, vizinhos(10 - a, 2, 2), 10 - a, `${a} + ${10 - a} = 10`, { visual: dez(a) }); },
    () => ligar('Ligue os amigos do 10 🤝', paresUnicos(() => { const a = rnd(1, 9); return [`${a} + ?`, 10 - a]; }), 'Os dois juntos dão 10'),
    () => { const k = rnd(1, 3); return padrao([0, 1, 2].map(i => `${k + i} + ${10 - k - i} = 10`), `${k + 3} + ? = 10`, 7 - k, 'Um sobe, o outro desce'); },
    () => { const a = rnd(11, 19); return digitar(`${a} + ? = 20`, 20 - a, `Amigos do 10: ${a - 10} e ${20 - a}`); },
    () => { const a = rnd(1, 9) * 10; return digitar(`${a} + ? = 100`, 100 - a, `Amigos do 100: ${a} e ${100 - a}`); }
  ];
  const S4 = () => digitar('? + 0 = 10', 10, 'Somar 0 não muda: é o 10');

  const L5 = [
    () => { const a = rnd(1, 9), b = rnd(1, 9); return fixa(`${a} − ${b} dá em ℕ?`, ['Sim', 'Não'], a >= b ? 'Sim' : 'Não', a >= b ? `${a} − ${b} = ${a - b} ✔` : `Faltam ${b - a}: sai de ℕ 🚫`, a >= b ? {} : { visual: salto(a, a - b) }); },
    () => { const a = rnd(5, 20), b = rnd(1, a); return digitar(`${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}`); },
    () => {
      const ok = () => { const a = rnd(5, 9), b = rnd(1, a); return `${a} − ${b}`; };
      const a = rnd(1, 5), ruim = `${a} − ${a + rnd(1, 4)}`;
      return escolha('Qual NÃO dá em ℕ?', [...distintos(ok, 2), ruim], ruim, 'Menor menos maior sai de ℕ');
    },
    () => { const a = rnd(1, 50), b = rnd(1, 50); return vf(`${a} + ${b} dá em ℕ?`, true, 'Soma de naturais é natural ✔'); },
    () => { const a = rnd(10, 30), b = a + rnd(1, 9); return vf(`Tenho R$${a}. Pago R$${b}?`, false, `Faltam R$${b - a} 💸`); }
  ];
  const S5 = () => fixa('3 − 5 dá para fazer em ℕ?', ['Sim', 'Não'], 'Não', 'Faltam 2! Precisamos dos negativos: ℤ 👀', { visual: salto(3, -2) });

  criarDia(3, [
    lic('Somar naturais', '➕', ['Somar', 'A ordem não muda a soma'], L1, S1),
    lic('Subtrair naturais', '➖', ['Subtrair', 'Confira: resposta + tirado = início'], L2, S2),
    lic('Mercadinho', '🛒', ['Mercadinho', 'Troco = pago − gasto'], L3, S3),
    lic('Completar 10', '🔟', ['Amigos do 10', '1+9 · 2+8 · 3+7 · 4+6 · 5+5'], L4, S4),
    lic('Dá em ℕ?', '🤔', ['Limite de ℕ', '3 − 5 não cabe em ℕ… ainda! 👀'], L5, S5)
  ], ['Mestre das contas', 'Somar junta, subtrair tira'], () => fixa('2 − 9 dá para fazer em ℕ?', ['Sim', 'Não'], 'Não', 'Hora de conhecer os inteiros 🚀', { visual: salto(2, -7) }));
})();

// ---------- DIA 4 · Inteiros ----------
(() => {
  const L1 = [
    () => { const a = rnd(0, 5), b = a + rnd(1, 4); return digitar(`🛗 No ${a}, desço ${b}. Paro no?`, a - b, `${a} − ${b} = ${fmt(a - b)}`, { visual: salto(a, a - b) }); },
    () => { const s = rnd(1, 4), b = rnd(1, 6); return digitar(`🛗 No ${fmt(-s)}, subo ${b}. Paro no?`, b - s, `${fmt(-s)} + ${b} = ${fmt(b - s)}`, { visual: salto(-s, b - s) }); },
    () => { const s = rnd(1, 4); return escolha(`🚗 Garagem ${s} andares abaixo. Andar?`, perto(-s, 2), fmt(-s), 'Abaixo do térreo é negativo', { visual: reta(-s, -5) }); },
    () => vf('🛗 O térreo é o andar 0?', true, 'Térreo = 0; acima +, abaixo −'),
    () => { const [a, b] = distintos(() => rnd(-4, 6), 2); return escolha('🛗 Qual andar é mais baixo?', [a, b], Math.min(a, b), 'Mais baixo = menor número', { visual: reta(Math.min(a, b), -5) }); }
  ];
  const S1 = () => { const a = rnd(2, 4), b = rnd(3, 6); return digitar(`🛗 Do ${fmt(-a)} ao ${b}: quantos andares?`, a + b, `${a} até o 0, mais ${b}`, { visual: salto(-a, b) }); };

  const graus = n => `${fmt(n)}°`;
  const L2 = [
    () => { const t = rnd(0, 8), c = t + rnd(1, 6); return digitar(`🌡️ Faz ${t}°C e cai ${c}°. Fica?`, t - c, `${t} − ${c} = ${fmt(t - c)}`, { visual: salto(t, t - c) }); },
    () => { const t = rnd(1, 8), c = rnd(1, 9); return digitar(`🌡️ Faz ${fmt(-t)}°C e sobe ${c}°. Fica?`, c - t, `${fmt(-t)} + ${c} = ${fmt(c - t)}`, { visual: salto(-t, c - t) }); },
    () => { const l = distintos(() => rnd(-12, 10), 3); return escolha('❄️ Qual é mais frio?', l.map(graus), graus(Math.min(...l)), 'Mais frio = menor número'); },
    () => { const [a, b] = distintos(() => -rnd(1, 10), 2); return vf(`${graus(a)} é mais frio que ${graus(b)}?`, a < b, `${fmt(a)} ${relacao(a, b)} ${fmt(b)}`); },
    () => { const t = rnd(1, 15); return digitar(`🌡️ ${t} graus abaixo de zero. Número?`, -t, `Abaixo de zero: ${fmt(-t)}`); }
  ];
  const S2 = () => { const a = rnd(2, 6), b = rnd(2, 4); return digitar(`🌡️ De ${fmt(-a)}°C para ${b}°C: subiu?`, a + b, `${a} até o 0, mais ${b}`, { visual: salto(-a, b) }); };

  const L3 = [
    () => { const a = rnd(5, 30), b = rnd(5, 40); return digitar(`💰 Tinha R$${a}, gastei R$${b}. Saldo?`, a - b, `${a} − ${b} = ${fmt(a - b)}`); },
    () => { const d = rnd(2, 50); return digitar(`💸 Devo R$${d}. Meu saldo?`, -d, `Dívida é negativo: ${fmt(-d)}`); },
    () => { const d = rnd(5, 30), r = rnd(5, 40); return digitar(`💰 Saldo ${fmt(-d)}, recebo ${r}. Fica?`, r - d, `${fmt(-d)} + ${r} = ${fmt(r - d)}`); },
    () => { const l = distintos(() => rnd(-30, 30), 3); return escolha('😬 Quem está pior?', l, Math.min(...l), 'Pior saldo = menor número'); },
    () => { const d = rnd(1, 50), s = sortear([d, -d]); return vf(`Saldo ${fmt(s)} é dívida?`, s < 0, s < 0 ? 'Negativo = deve 💸' : 'Positivo = tem dinheiro 💰'); }
  ];
  const S3 = () => { const d = rnd(5, 20); return digitar(`Devo ${d} e pago ${d}. Saldo?`, 0, 'Pagou tudo: saldo 0 ✔'); };

  const L4 = [
    () => { const d = rnd(2, 40); return digitar(`🤿 ${d} m abaixo do mar. Número?`, -d, `Abaixo do mar: ${fmt(-d)}`); },
    () => { const h = rnd(10, 900); return digitar(`🦅 ${h} m acima do mar. Número?`, h, 'Acima do mar: positivo'); },
    () => { const d = rnd(5, 30), s = rnd(1, 40); return digitar(`🤿 Em ${fmt(-d)} m, subo ${s} m. Fico?`, s - d, `${fmt(-d)} + ${s} = ${fmt(s - d)}`); },
    () => { const l = distintos(() => -rnd(1, 50), 3); return escolha('🐟 Quem está mais fundo?', l, Math.min(...l), 'Mais fundo = mais negativo'); },
    () => vf('🌊 O nível do mar é 0?', true, 'Acima +, abaixo −')
  ];
  const S4 = () => { const a = rnd(2, 6), b = rnd(2, 4); return digitar(`🤿 De ${fmt(-a)} m até ${b} m: subiu?`, a + b, `${a} até o 0, mais ${b}`, { visual: salto(-a, b) }); };

  const PAL = 'zero um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete dezoito dezenove vinte'.split(' ');
  const L5 = [
    () => { const n = rnd(1, 20); return escolha(`"menos ${PAL[n]}" é…`, perto(-n, 10), fmt(-n), 'menos = sinal −'); },
    () => { const n = rnd(1, 20); return digitar(`Escreva: menos ${PAL[n]}`, -n, `menos ${PAL[n]} = ${fmt(-n)}`); },
    () => ligar('Ligue palavra e número 🔗', paresUnicos(() => { const n = rnd(1, 10), s = sortear([1, -1]); return [`${s < 0 ? 'menos ' : ''}${PAL[n]}`, s * n]; }), 'menos = sinal −'),
    () => { const n = rnd(1, 19), m = sortear([n, n, n + 1]); return vf(`${fmt(-n)} se lê "menos ${PAL[m]}"?`, m === n, `${fmt(-n)} = menos ${PAL[n]}`); }
  ];
  const S5 = () => digitar('Escreva: menos zero', 0, '−0 é o próprio 0 😉');

  criarDia(4, [
    lic('Elevador', '🛗', ['Elevador', 'Térreo é 0; subsolo é negativo'], L1, S1),
    lic('Temperatura', '🌡️', ['Termômetro', 'Abaixo de zero: negativo ❄️'], L2, S2),
    lic('Saldo e dívida', '💰', ['Saldo', 'Dívida é saldo negativo 💸'], L3, S3),
    lic('Altitude', '⛰️', ['Altitude', 'Nível do mar é 0 🌊'], L4, S4),
    lic('Ler negativos', '🔤', ['Ler negativos', '−5 se lê "menos cinco"'], L5, S5)
  ], ['Mestre dos inteiros', 'ℤ = {…, −2, −1, 0, 1, 2, …}'], () => digitar('🛗 No 5, desço 9. Paro no?', -4, '5 − 9 = −4', { visual: salto(5, -4) }));
})();

// ---------- DIA 5 · Reta dos inteiros ----------
(() => {
  const L1 = [
    () => { const n = rnd(-6, 6); return naReta(`Toque no ${fmt(n)} 👆`, n, -6, 6, 'Negativos à esquerda do 0'); },
    () => { const n = rnd(-9, -1); return naReta(`Toque no ${fmt(n)} 👆`, n, -10, 0, 'Conte para a esquerda do 0', { rotulos: [-10, -5, 0] }); },
    () => { const a = rnd(-3, 4), d = rnd(1, 4); return digitar(`Quem está ${d} à esquerda do ${fmt(a)}?`, a - d, `${fmt(a)} − ${d} = ${fmt(a - d)}`, { visual: salto(a, a - d) }); },
    () => { const a = rnd(-6, 2), d = rnd(1, 4); return digitar(`Quem está ${d} à direita do ${fmt(a)}?`, a + d, `${fmt(a)} + ${d} = ${fmt(a + d)}`, { visual: salto(a, a + d) }); },
    () => vf('Os negativos ficam à esquerda do 0?', true, 'Esquerda −, direita +')
  ];
  const S1 = () => { const n = rnd(2, 5); return naReta(`Toque no oposto do ${n}`, -n, -6, 6, `Oposto do ${n} é ${fmt(-n)}`); };

  const L2 = [
    () => comparar(rnd(-20, 20), rnd(-20, 20)),
    () => { const [a, b] = distintos(() => -rnd(1, 20), 2); return comparar(a, b); },
    () => { const a = rnd(1, 20); return comparar(-a, a); },
    () => { const l = distintos(() => rnd(-30, 30), 3); return escolha('Qual é o maior?', l, Math.max(...l), 'Mais à direita na reta'); },
    () => { const l = distintos(() => -rnd(1, 30), 3); return escolha('Qual é o menor?', l, Math.min(...l), 'Mais longe do 0 à esquerda'); },
    () => { const [a, b] = distintos(() => -rnd(1, 9), 2); return vf(`${fmt(a)} > ${fmt(b)}?`, a > b, `${fmt(a)} ${relacao(a, b)} ${fmt(b)}`, { visual: reta(Math.max(a, b), -10) }); }
  ];
  const S2 = () => comparar(0, -rnd(50, 999));

  const espelho = n => (Math.abs(n) <= 5 ? { visual: salto(n, -n) } : {});
  const L3 = [
    () => { const n = rnd(-15, 15) || 7; return digitar(`Oposto de ${fmt(n)}?`, -n, 'Mesma distância do 0, outro lado 🪞', espelho(n)); },
    () => ligar('Ligue cada um ao oposto 🪞', paresUnicos(() => { const n = rnd(-12, 12) || 3; return [`oposto de ${fmt(n)}`, -n]; }), 'Troque o sinal'),
    () => { const n = rnd(1, 15), m = sortear([n, n + 1]); return vf(`${n} e ${fmt(-m)} são opostos?`, m === n, `Oposto de ${n} é ${fmt(-n)}`, espelho(n)); },
    () => { const n = rnd(1, 20) * sortear([1, -1]); return escolha(`Oposto de ${fmt(n)}`, perto(-n, 2), fmt(-n), 'Troque o sinal 🪞'); },
    () => { const n = rnd(1, 5); return naReta(`Toque no oposto do ${fmt(-n)}`, n, -6, 6, `Oposto de ${fmt(-n)} é ${n}`); }
  ];
  const S3 = () => digitar('Oposto de 0?', 0, 'O 0 é o espelho dele mesmo');

  const L4 = [
    () => { const n = rnd(-20, 20) || -4; return digitar(`|${fmt(n)}| = ?`, Math.abs(n), `Passos do ${fmt(n)} até o 0`, Math.abs(n) <= 10 ? { visual: salto(n, 0) } : {}); },
    () => { const n = rnd(1, 10); return digitar(`Passos do ${fmt(-n)} até o 0?`, n, 'Módulo = distância até o 0', { visual: salto(-n, 0) }); },
    () => { const n = rnd(1, 15); return vf(`|${fmt(-n)}| = |${n}|?`, true, 'Opostos têm o mesmo módulo'); },
    () => { const n = rnd(1, 20); return escolha(`|${fmt(-n)}|`, [n, -n, 0], n, 'Módulo nunca é negativo'); },
    () => { const a = rnd(-15, 15), b = Math.abs(a) + rnd(1, 5); const l = embaralhar([a, sortear([b, -b])]); return escolha('Mais longe do 0?', l, Math.abs(l[0]) > Math.abs(l[1]) ? l[0] : l[1], 'Compare os módulos'); }
  ];
  const S4 = () => { const n = rnd(5, 9), p = rnd(1, n - 1); return escolha('Qual tem módulo maior?', [-n, p], -n, `|${fmt(-n)}| = ${n} > ${p}`); };

  const L5 = [
    () => ordenar('Do menor ao maior ⬆️', distintos(() => rnd(-15, 15), 4), false, 'Comece pelo mais negativo'),
    () => ordenar('Do maior ao menor ⬇️', distintos(() => rnd(-15, 15), 4), true, 'Comece pelo maior positivo'),
    () => ordenar('Do menor ao maior ⬆️', distintos(() => -rnd(1, 20), 3), false, 'Mais negativo vem primeiro'),
    () => { const l = distintos(() => rnd(-20, 20), 3), m = l.slice().sort((a, b) => a - b)[1]; return digitar(`Quem fica no meio? ${l.map(fmt).join(' · ')}`, m, 'Ordene e pegue o do meio'); },
    () => { const l = distintos(() => rnd(-9, 9), 3); return escolha('Quem abre a ordem crescente?', l, Math.min(...l), 'Crescente começa no menor'); }
  ];
  const S5 = () => ordenar('Do menor ao maior ⬆️', [-10, -1, 0, 10], false, '−10 < −1 < 0 < 10');

  criarDia(5, [
    lic('Reta com negativos', '📏', ['Reta de ℤ', 'Esquerda do 0: negativos'], L1, S1),
    lic('Comparar inteiros', '🐊', ['Comparar em ℤ', 'Mais à direita na reta é maior'], L2, S2),
    lic('Oposto', '🪞', ['Espelho do zero', 'Oposto: mesma distância, outro lado'], L3, S3),
    lic('Módulo', '📐', ['Módulo', '|−5| = 5: passos até o 0'], L4, S4),
    lic('Ordenar inteiros', '📶', ['Ordenar em ℤ', '−9 < −2 < 0 < 3'], L5, S5)
  ], ['Mestre da reta', 'Todo inteiro tem lugar na reta'], () => naReta('Toque no oposto do −3', 3, -6, 6, 'Oposto de −3 é 3'));
})();

// ---------- DIA 6 · ℕ dentro de ℤ ----------
(() => {
  const mistura = q => embaralhar([...distintos(() => rnd(0, 30), Math.ceil(q / 2)), ...distintos(() => -rnd(1, 30), Math.floor(q / 2))]);
  const L1 = [
    () => vf('ℕ = {0, 1, 2, 3, …}?', true, 'ℕ: os naturais, a partir do 0'),
    () => fixa('Qual conjunto tem os negativos?', ['ℕ', 'ℤ'], 'ℤ', 'ℤ: naturais e negativos', { visual: bonecas() }),
    () => {
      const l = (Math.random() < .5 ? distintos(() => rnd(0, 20), 3) : mistura(3)).sort((a, b) => a - b), neg = l.some(v => v < 0);
      return fixa(`Menor conjunto com {${l.map(fmt).join(', ')}}?`, ['ℕ', 'ℤ'], neg ? 'ℤ' : 'ℕ', neg ? 'Tem negativo: só em ℤ' : 'Todos naturais: cabe em ℕ', { visual: bonecas() });
    },
    () => { const n = rnd(0, 50); return vf(`${n} está em ℕ e em ℤ?`, true, 'Todo natural também é inteiro'); },
    () => { const q = rnd(2, 5), l = distintos(() => rnd(-9, 9), q); return digitar(`Quantos elementos em {${l.map(fmt).join(', ')}}?`, q, 'Conte os números entre { }'); }
  ];
  const S1 = () => vf('ℤ tem um menor número?', false, 'Sempre dá para descer mais 1 ♾️');

  const L2 = [
    () => conjunto('Leve cada um ao seu lugar', mistura(4), 'Natural no ℕ; negativo só no ℤ'),
    () => conjunto('Leve cada um ao seu lugar', mistura(3), 'Natural no ℕ; negativo só no ℤ'),
    () => conjunto('Arraste ou toque e toque 👆', embaralhar([0, ...distintos(() => -rnd(1, 9), 2)]), 'O 0 é natural'),
    () => { const n = -rnd(1, 30); return fixa(`${fmt(n)} vai para…`, ['ℕ', 'ℤ'], 'ℤ', 'Negativo fica fora do ℕ', { visual: bonecas() }); }
  ];
  const S2 = () => conjunto('Leve cada um ao seu lugar', [0, -1, 1000], 'Até o 1000 cabe no ℕ');

  const L3 = [
    () => vf('Todo natural é inteiro?', true, 'ℕ mora dentro de ℤ 🪆', { visual: bonecas() }),
    () => vf('Todo inteiro é natural?', false, '−1 é inteiro, mas não natural', { visual: bonecas() }),
    () => fixa('Quem mora dentro de quem?', ['ℕ ⊂ ℤ', 'ℤ ⊂ ℕ'], 'ℕ ⊂ ℤ', 'ℕ é a boneca menor 🪆', { visual: bonecas() }),
    () => conjunto('Coloque nas bonecas 🪆', mistura(4), 'Naturais na boneca menor'),
    () => { const n = rnd(-20, 20); return fixa(`${fmt(n)} está em…`, ['Só ℤ', 'ℕ e ℤ'], n < 0 ? 'Só ℤ' : 'ℕ e ℤ', n < 0 ? 'Negativo: só em ℤ' : 'Natural: em ℕ e em ℤ', { visual: bonecas() }); }
  ];
  const S3 = () => vf('Existe natural negativo?', false, 'Natural nunca é negativo');

  const decimal = () => sortear([() => rnd(0, 9) + ',' + rnd(1, 9), () => rnd(1, 4) + '/' + rnd(5, 9), () => '−' + rnd(0, 9) + ',' + rnd(1, 9)])();
  const L4 = [
    () => { const n = rnd(-20, 20); return fixa(`${fmt(n)} ? ℕ`, ['∈', '∉'], n >= 0 ? '∈' : '∉', n >= 0 ? `${fmt(n)} é natural: ∈` : 'Negativo não pertence a ℕ: ∉'); },
    () => { const n = rnd(-20, 20); return fixa(`${fmt(n)} ? ℤ`, ['∈', '∉'], '∈', 'Todo inteiro pertence a ℤ'); },
    () => fixa(`${decimal()} ? ℤ`, ['∈', '∉'], '∉', 'Decimal e fração ficam fora de ℤ'),
    () => { const n = rnd(1, 20); return vf(`${fmt(-n)} ∈ ℕ?`, false, '∈ = pertence; negativo não está em ℕ'); },
    () => { const n = rnd(0, 20); return vf(`${n} ∈ ℤ?`, true, 'Natural também é inteiro'); }
  ];
  const S4 = () => fixa('0 ? ℕ', ['∈', '∉'], '∈', 'O 0 é natural 🎯');

  const CL = ['ℕ e ℤ', 'Só ℤ', 'Fora'];
  const L5 = [
    () => { const x = rnd(0, 99); return fixa(`Classifique: ${x}`, CL, 'ℕ e ℤ', 'Natural: está em ℕ e em ℤ'); },
    () => { const x = -rnd(1, 99); return fixa(`Classifique: ${fmt(x)}`, CL, 'Só ℤ', 'Inteiro negativo: só ℤ'); },
    () => fixa(`Classifique: ${decimal()}`, CL, 'Fora', 'Decimal e fração: fora de ℤ'),
    () => conjunto('Leve cada um ao seu lugar', mistura(4), 'Natural no ℕ; negativo só no ℤ'),
    () => {
      const l = embaralhar([...distintos(() => rnd(-9, 9), rnd(2, 3)), ...distintos(decimal, rnd(1, 2))]);
      return digitar(`Quantos inteiros? ${l.map(v => (typeof v === 'number' ? fmt(v) : v)).join(' · ')}`, l.filter(v => typeof v === 'number').length, 'Conte os sem vírgula e sem barra');
    }
  ];
  const S5 = () => fixa('Classifique: 8/2', CL, 'ℕ e ℤ', '8/2 = 4: é natural! 😮');

  criarDia(6, [
    lic('Conjuntos', '🧺', ['Conjuntos', 'Conjunto é uma coleção: { }'], L1, S1),
    lic('Arrastar para ℕ ou ℤ', '🫳', ['Arrastar', 'Negativo vai para ℤ, fora do ℕ'], L2, S2),
    lic('ℕ dentro de ℤ', '🪆', ['Bonecas russas', 'ℕ ⊂ ℤ: ℕ mora dentro de ℤ'], L3, S3),
    lic('Pertence ou não', '🔑', ['Pertence', '∈ pertence · ∉ não pertence'], L4, S4),
    lic('Classificação mista', '🗂️', ['Classificar', 'Decimal e fração ficam fora de ℤ'], L5, S5)
  ], ['Mestre dos conjuntos', 'ℕ ⊂ ℤ'], () => conjunto('Leve cada um ao seu lugar', [-100, 0, 100], 'O sinal decide o lugar'));
})();

// ---------- DIA 7 · Soma de inteiros ----------
(() => {
  const soma = (a, b) => `${ent(a)} + ${ent(b)}`;
  const L1 = [
    () => { const a = -rnd(1, 20), b = -rnd(1, 20); return digitar(`${soma(a, b)} = ?`, a + b, 'Sinais iguais: some e repita o −'); },
    () => { const a = rnd(1, 30), b = rnd(1, 30); return digitar(`${soma(a, b)} = ?`, a + b, 'Sinais iguais: some e repita o +'); },
    () => { const a = -rnd(1, 15), b = -rnd(1, 15); return escolha(soma(a, b), perto(a + b, 2), fmt(a + b), `${-a} + ${-b} = ${-(a + b)}, com sinal −`); },
    () => { const a = -rnd(1, 9), b = -rnd(1, 9), r = sortear([a + b, -(a + b)]); return vf(`${soma(a, b)} = ${fmt(r)}?`, r === a + b, `Dá ${fmt(a + b)}: sinal −`, { visual: salto(a, a + b) }); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = -rnd(1, 9), b = -rnd(1, 9); return [soma(a, b), a + b]; }), 'Some e mantenha o −')
  ];
  const S1 = () => digitar('(−50) + (−50) = ?', -100, '50 + 50 = 100, com sinal −');

  const dif = () => { const a = rnd(1, 20), b = -rnd(1, 20); return Math.random() < .5 ? [a, b] : [b, a]; };
  const L2 = [
    () => { const [a, b] = dif(); return digitar(`${soma(a, b)} = ?`, a + b, 'Subtraia e fique com o sinal do maior', Math.abs(b) <= 10 ? { visual: salto(a, a + b) } : {}); },
    () => { const [a, b] = dif(); return escolha(soma(a, b), perto(a + b, 2), fmt(a + b), 'Subtraia; vence o sinal do maior'); },
    () => { const a = rnd(1, 9), b = -rnd(1, 9), r = sortear([a + b, a - b]); return vf(`${soma(a, b)} = ${fmt(r)}?`, r === a + b, `Dá ${fmt(a + b)}`, { visual: salto(a, a + b) }); },
    () => { const a = rnd(1, 9), b = -rnd(1, 9); return fixa(`${soma(a, b)} dá…`, ['+', '0', '−'], a + b > 0 ? '+' : a + b < 0 ? '−' : '0', 'O maior módulo decide o sinal'); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const [a, b] = dif(); return [soma(a, b), a + b]; }), 'Subtraia; vence o sinal do maior')
  ];
  const S2 = () => { const n = rnd(2, 20); return digitar(`${soma(-n, n)} = ?`, 0, 'Opostos se anulam: 0'); };

  const passo = b => `${Math.abs(b)} ${b > 0 ? '➡️' : '⬅️'}`;
  const L3 = [
    () => { const a = rnd(-4, 4); let b = 0; while (!b) b = rnd(-6 - a, 6 - a); return naReta(`Do ${fmt(a)}, ande ${passo(b)}`, a + b, -6, 6, `${soma(a, b)} = ${fmt(a + b)}`, { rotulos: [...new Set([-6, 0, 6, a])], conta: soma(a, b) }); },
    () => { const a = rnd(-5, 5), b = sortear([1, -1]) * rnd(1, 5); return digitar(`Do ${fmt(a)}, ando ${passo(b)}. Chego?`, a + b, `${soma(a, b)} = ${fmt(a + b)}`, { visual: salto(a, a + b) }); },
    () => { const a = rnd(-5, 5), b = sortear([1, -1]) * rnd(1, 5); return fixa(`${soma(a, b)}: ando para…`, ['⬅️', '➡️'], b > 0 ? '➡️' : '⬅️', 'Somar + vai ➡️; somar − vai ⬅️'); },
    () => vf('Somar negativo é andar ⬅️?', true, '+ vai ➡️, − vai ⬅️')
  ];
  const S3 = () => naReta('Do 0, ande 3 ⬅️ e 3 ➡️', 0, -6, 6, '−3 + 3 = 0: voltou ao início');

  const L4 = [
    () => { const l = rnd(5, 40), p = rnd(5, 40); return digitar(`🏪 Lucro ${l}, prejuízo ${p}. Saldo?`, l - p, `${soma(l, -p)} = ${fmt(l - p)}`, { conta: soma(l, -p) }); },
    () => { const s = rnd(5, 30), v = rnd(1, 40); return digitar(`🏪 Saldo ${fmt(-s)}, vendo ${v}. Fica?`, v - s, `${soma(-s, v)} = ${fmt(v - s)}`); },
    () => { const s = rnd(5, 30), p = rnd(1, 20); return digitar(`🏪 Saldo ${fmt(-s)}, prejuízo ${p}. Fica?`, -s - p, `${soma(-s, -p)} = ${fmt(-s - p)}`); },
    () => { const d = [rnd(1, 9), -rnd(1, 9), sortear([1, -1]) * rnd(1, 9)]; return digitar(`🏪 Dias: ${d.map(v => (v > 0 ? '+' : '') + fmt(v)).join(', ')}. Total?`, d[0] + d[1] + d[2], 'Some os ganhos, tire as perdas'); },
    () => { const l = rnd(10, 30), p = rnd(10, 30); return fixa(`🏪 Lucro ${l}, prejuízo ${p}. Saldo é…`, ['+', '0', '−'], l > p ? '+' : l < p ? '−' : '0', 'O maior decide o sinal'); }
  ];
  const S4 = () => { const a = rnd(3, 9), b = rnd(3, 9); return digitar(`🏪 Seg +${a}, ter −${a + b}, qua +${b}. Total?`, 0, 'Ganhos e perdas se anularam: 0'); };

  const L5 = [
    () => { const a = rnd(-15, 15), b = rnd(-15, 15); return digitar(`${soma(a, b)} = ?`, a + b, 'Iguais: some · Diferentes: subtraia'); },
    () => { const a = rnd(-9, 9), b = rnd(-9, 9); return escolha(soma(a, b), perto(a + b, 2), fmt(a + b), 'Iguais: some · Diferentes: subtraia'); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(-9, 9), b = rnd(-9, 9); return [soma(a, b), a + b]; }), 'Uma conta de cada vez'),
    () => { const a = rnd(-9, -1), k = rnd(1, 3); return padrao([0, 1, 2].map(i => `${ent(a)} + ${k * i} = ${fmt(a + k * i)}`), `${ent(a)} + ${k * 3} =`, a + 3 * k, `Cada linha anda ${k} ➡️`); },
    () => { const n = rnd(1, 20); return digitar(`${n} + ? = 0`, -n, 'O oposto anula: soma 0'); }
  ];
  const S5 = () => digitar('(−1) + (−2) + (−3) + 6 = ?', 0, '−6 + 6 = 0');

  criarDia(7, [
    lic('Sinais iguais', '🟰', ['Sinais iguais', 'Some e repita o sinal'], L1, S1),
    lic('Sinais diferentes', '⚖️', ['Sinais diferentes', 'Subtraia; fica o sinal do maior'], L2, S2),
    lic('Andar na reta', '👣', ['Andar na reta', 'Somar + vai ➡️, somar − vai ⬅️'], L3, S3),
    lic('Saldo da loja', '🏪', ['Saldo da loja', 'Lucro é +, prejuízo é −'], L4, S4),
    lic('Mistura de somas', '🎲', ['Soma em ℤ', 'Opostos somados dão 0'], L5, S5)
  ], ['Mestre da soma', 'Na reta, a soma é um passeio'], () => digitar('(−7) + 10 + (−3) = ?', 0, '−7 − 3 = −10; −10 + 10 = 0'));
})();

// ---------- DIA 8 · Subtração de inteiros ----------
(() => {
  const menos = (a, b) => `${fmt(a)} − ${ent(b)}`;
  const L1 = [
    () => { const a = rnd(-9, 9), b = rnd(-9, 9) || 4; return digitar(`${menos(a, b)} = ${fmt(a)} + ?`, -b, `Troque − por + e use o oposto de ${fmt(b)}`); },
    () => { const a = rnd(-9, 9), b = rnd(1, 9); return digitar(`${menos(a, -b)} = ?`, a + b, `${fmt(a)} + ${b} = ${fmt(a + b)}`); },
    () => { const a = rnd(2, 9); return padrao([2, 1, 0].map(i => `${a} − ${i} = ${a - i}`), `${a} − (−1) =`, a + 1, 'Tira menos, sobra mais: +1 por linha'); },
    () => vf('Subtrair é somar o oposto?', true, 'a − b = a + (−b)'),
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(-9, 9), b = rnd(-9, 9); return [menos(a, b), a - b]; }), 'Some o oposto')
  ];
  const S1 = () => { const n = rnd(2, 9); return digitar(`0 − (−${n}) = ?`, n, `0 + ${n} = ${n}`); };

  const L2 = [
    () => { const s = rnd(-20, -1), d = rnd(1, 15); return digitar(`💸 Saldo ${fmt(s)}. Perdoam ${d} de dívida. Fica?`, s + d, `${menos(s, -d)} = ${fmt(s + d)}`, { conta: menos(s, -d) }); },
    () => { const n = rnd(1, 20); return escolha(`Tirar ${fmt(-n)} é o mesmo que…`, [`+${n}`, fmt(-n), '0'], `+${n}`, `− (−${n}) = +${n} 🎉`); },
    () => { const s = rnd(-15, 15), d = rnd(1, 10); return digitar(`💰 Tenho ${fmt(s)}. Apagam dívida de ${d}. Fico?`, s + d, `${menos(s, -d)} = ${fmt(s + d)}`); },
    () => vf('Tirar uma dívida é ganhar?', true, 'Tirar − é somar + 🎉'),
    () => { const s = rnd(-10, -1), g = rnd(1, 10); return digitar(`💸 Saldo ${fmt(s)}. Tiram ${g} reais. Fica?`, s - g, `${menos(s, g)} = ${fmt(s - g)}`); }
  ];
  const S2 = () => { const d = rnd(3, 9); return digitar(`Saldo 0. Perdoam ${d} de dívida. Fica?`, d, `0 − (−${d}) = ${d}`); };

  const L3 = [
    () => { const a = rnd(1, 20); return digitar(`−(−${a}) = ?`, a, 'Menos do menos vira mais'); },
    () => { const a = rnd(-9, 9), b = rnd(-9, 9); return digitar(`(${fmt(a)}) − (${fmt(b)}) = ?`, a - b, `${fmt(a)} + ${ent(-b)} = ${fmt(a - b)}`); },
    () => { const a = rnd(-9, 9), b = rnd(-9, 9), c = rnd(1, 9); return digitar(`${ent(a)} − ${ent(b)} + ${c} = ?`, a - b + c, 'Da esquerda para a direita'); },
    () => { const a = rnd(1, 9); return escolha(`−(${fmt(-a)})`, [a, -a, 0], a, '−(−a) = a'); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(1, 9), s = sortear([1, -1]); return [`−(${fmt(s * a)})`, -s * a]; }), 'O menos troca o sinal')
  ];
  const S3 = () => digitar('−(−(−2)) = ?', -2, 'Três menos: o sinal fica −');

  const L4 = [
    () => { const t1 = rnd(-10, 5), t2 = rnd(-10, 10); return digitar(`🌡️ De ${fmt(t1)}° para ${fmt(t2)}°. Variação?`, t2 - t1, `Final − inicial: ${menos(t2, t1)}`); },
    () => { const a = rnd(5, 40), b = rnd(100, 900); return digitar(`🤿 ${fmt(-a)} m e 🦅 ${b} m. Distância?`, a + b, `${b} − (−${a}) = ${a + b}`); },
    () => { const h = rnd(-20, 20), o = rnd(-20, 20); return digitar(`💰 Hoje ${fmt(h)}, ontem ${fmt(o)}. Mudou quanto?`, h - o, `Hoje − ontem: ${menos(h, o)}`); },
    () => { const a = rnd(-8, -1), b = rnd(-15, a - 1); return digitar(`❄️ Máx ${fmt(a)}°, mín ${fmt(b)}°. Diferença?`, a - b, `${menos(a, b)} = ${a - b}`); },
    () => vf('Variação = final − inicial?', true, 'Sempre: final menos inicial')
  ];
  const S4 = () => digitar('🌡️ De −5° para 3°. Variação?', 8, '3 − (−5) = 8');

  const L5 = [
    () => { const a = rnd(-12, 12), b = rnd(-12, 12); return digitar(`${menos(a, b)} = ?`, a - b, `${fmt(a)} + ${ent(-b)} = ${fmt(a - b)}`); },
    () => { const a = rnd(-9, 9), b = rnd(-9, 9); return escolha(menos(a, b), perto(a - b, 2), fmt(a - b), 'Some o oposto'); },
    () => { const a = rnd(-9, 9), b = rnd(-9, 9), r = sortear([a - b, a + b]); return vf(`${menos(a, b)} = ${fmt(r)}?`, r === a - b, `Dá ${fmt(a - b)}`); },
    () => { const b = rnd(-9, 9), r = rnd(-9, 9); return digitar(`? − ${ent(b)} = ${fmt(r)}`, r + b, `${fmt(r)} + ${ent(b)} = ${fmt(r + b)}`); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(-9, 9), b = rnd(-9, 9); return [menos(a, b), a - b]; }), 'Some o oposto')
  ];
  const S5 = () => digitar('(−3) − (−3) = ?', 0, 'Igual menos igual dá 0');

  criarDia(8, [
    lic('Soma do oposto', '🔄', ['Soma do oposto', 'a − b = a + (−b)'], L1, S1),
    lic('Tirar uma dívida', '💸', ['Tirar dívida', 'Tirar −3 é ganhar +3 🎉'], L2, S2),
    lic('Parênteses', '🧮', ['Parênteses', '−(−a) = a'], L3, S3),
    lic('Contexto', '🌍', ['Variação', 'Variação = final − inicial'], L4, S4),
    lic('Mistura', '🎲', ['Troca de sinal', 'Troque − por + e use o oposto'], L5, S5)
  ], ['Mestre da subtração', 'Subtrair é somar o oposto'], () => digitar('10 − (−10) = ?', 20, '10 + 10 = 20'));
})();

// ---------- DIA 9 · Tabuada do 1, 2 e 10 ----------
(() => {
  const T = [1, 2, 10];
  criarDia(9, [
    lic('Tabuada do 1', '1️⃣', ['×1', 'Vezes 1 é ele mesmo'],
      [...tabuada([1], ['conta', 'escolha', 'falta', 'grade']), () => { const n = rnd(11, 99); return digitar(`1 × ${n} = ?`, n, 'Vezes 1 não muda nada'); }],
      () => digitar('1 × 999 = ?', 999, 'Vezes 1 é ele mesmo')),
    lic('Tabuada do 2', '2️⃣', ['×2', 'Vezes 2 é o dobro'],
      [...tabuada([2], ['conta', 'escolha', 'falta', 'grade', 'padrao']), () => { const n = rnd(1, 10); return vf(`2 × ${n} = ${n} + ${n}?`, true, 'Vezes 2 = dobro'); }],
      () => digitar('2 × 50 = ?', 100, 'O dobro de 50 é 100')),
    lic('Tabuada do 10', '🔟', ['×10', 'Vezes 10: põe um zero no fim'],
      [...tabuada([10], ['conta', 'escolha', 'falta', 'padrao']), () => { const n = rnd(11, 99); return digitar(`10 × ${n} = ?`, 10 * n, `Põe um 0: ${n}0`); }],
      () => digitar('10 × 25 = ?', 250, 'Põe um 0 no fim: 250')),
    lic('Grade de bolinhas', '🟣', ['Fileiras', 'a × b = a fileiras de b'], tabuada(T, ['grade', 'grade', 'ligar', 'vf']), () => tabuada([10], ['grade'])[0]()),
    lic('Contra o tempo', '⏱', ['Relâmpago', 'Treino deixa a conta automática ⚡'], tabuada(T, ['tempo', 'tempo', 'tempoLigar']), () => rapido(digitar('10 × 10 = ?', 100, 'Põe um 0: 100'), 8))
  ], ['Mestre do 1, 2 e 10', '×1 igual · ×2 dobro · ×10 põe 0'], () => digitar('2 × 10 × 1 = ?', 20, '2 × 10 = 20; vezes 1 = 20'));
})();

// ---------- DIA 10 · Tabuada do 3, 4 e 5 ----------
(() => {
  const T = [3, 4, 5];
  criarDia(10, [
    lic('Tabuada do 3', '3️⃣', ['×3', '3 × n = dobro de n + n'],
      [...tabuada([3], ['conta', 'escolha', 'falta', 'grade', 'padrao']), () => { const n = rnd(2, 10); return digitar(`2 × ${n} + ${n} = ?`, 3 * n, `É o mesmo que 3 × ${n}`); }],
      () => digitar('3 × 33 = ?', 99, '3 × 30 + 3 × 3 = 99')),
    lic('Tabuada do 4', '4️⃣', ['×4', 'Dobro do dobro'],
      [...tabuada([4], ['conta', 'escolha', 'falta', 'grade', 'padrao']), () => { const n = rnd(2, 10); return digitar(`Dobro do dobro de ${n}?`, 4 * n, `${n} → ${2 * n} → ${4 * n}`); }],
      () => digitar('4 × 25 = ?', 100, 'Dobro de 25 = 50; dobro de 50 = 100')),
    lic('Tabuada do 5', '5️⃣', ['×5', 'Metade do ×10'],
      [...tabuada([5], ['conta', 'escolha', 'falta', 'grade']), () => { const n = rnd(1, 10) * 2; return digitar(`5 × ${n} = ?`, 5 * n, `10 × ${n} = ${10 * n}; metade = ${5 * n}`); }],
      () => digitar('5 × 12 = ?', 60, '10 × 12 = 120; metade = 60')),
    lic('Pula de 5 em 5', '🦘', ['Pulos', 'Tabuada do 5 termina em 0 ou 5'],
      [...tabuada(T, ['padrao', 'ligar', 'grade']), () => { const n = rnd(1, 20) * 5 + sortear([0, 0, 1, 3]); return vf(`${n} está na tabuada do 5?`, n % 5 === 0, 'Termina em 0 ou 5? Está!'); }],
      () => padrao(['5, 10, 15', '20, 25, 30'], '35, ?', 40, 'De 5 em 5 🦘')),
    lic('Contra o tempo', '⏱', ['Relâmpago 3, 4 e 5', 'Comece pelo que você já sabe'], tabuada(T, ['tempo', 'tempo', 'tempoLigar']), () => rapido(digitar('5 × 5 = ?', 25, '5 × 5 = 25'), 8))
  ], ['Mestre do 3, 4 e 5', '×4 = dobro do dobro · ×5 = metade do ×10'], () => digitar('3 × 4 × 5 = ?', 60, '3 × 4 = 12; 12 × 5 = 60'));
})();

// ---------- DIA 11 · Tabuada do 6 e 7 (tabuleiro que se preenche) ----------
(() => {
  const T = [6, 7];
  const S6 = () => digitar('6 × 5 + 6 = ?', 36, 'É o mesmo que 6 × 6');
  const S7 = () => digitar('7 × 8 = ?', 56, '5, 6, 7, 8: 56 = 7 × 8 🎵');
  criarDia(11, [
    lic('Tabuleiro do 6', '6️⃣', ['×6', '6 × n = 5 × n + n'], tabuada([6], ['conta', 'escolha', 'falta']), S6, () => tabuleiro(6, S6)),
    lic('Tabuleiro do 7', '7️⃣', ['×7', '7 × 8 = 56: 5, 6, 7, 8 🎵'], tabuada([7], ['conta', 'escolha', 'falta']), S7, () => tabuleiro(7, S7)),
    lic('Par vezes 6', '🎯', ['Par × 6', '6 × par termina igual: 6 × 4 = 24'],
      [...tabuada(T, ['ligar', 'vf', 'escolha']), () => { const n = sortear([2, 4, 6, 8]); return digitar(`6 × ${n} = ?`, 6 * n, `Termina em ${n}: ${6 * n}`); }],
      () => vf('6 × 8 termina em 8?', true, '6 × 8 = 48 ✔')),
    lic('Grade de bolinhas', '🟣', ['Grade some', 'Imagine as fileiras de bolinhas'], tabuada(T, ['grade', 'grade', 'conta']),
      () => ({ tipo: 'grade', pergunta: 'Conte rápido! 👀', a: 7, b: 7, resposta: 49, dica: '7 fileiras de 7 = 49', conta: '7 × 7' })),
    lic('Contra o tempo', '⏱', ['Relâmpago 6 e 7', '6 × 7 = 42 · 7 × 7 = 49'], tabuada(T, ['tempo', 'tempo', 'tempoLigar']), () => rapido(digitar('7 × 7 = ?', 49, '7 × 7 = 49'), 8))
  ], ['Mestre do 6 e 7', '7 × 8 = 56 🎵'], () => digitar('6 × 7 + 7 = ?', 49, 'É 7 × 7 = 49'));
})();

// ---------- DIA 12 · Tabuada do 8 e 9 (power-up dos dedos) ----------
(() => {
  const D = { dedos: true };
  const somaDig = n => String(n).split('').join(' + ') + ' = ' + String(n).split('').reduce((s, d) => s + +d, 0);
  criarDia(12, [
    lic('Tabuada do 8', '8️⃣', ['×8', 'Dobro, dobro, dobro'],
      [...tabuada([8], ['conta', 'escolha', 'falta', 'grade', 'padrao']), () => { const n = rnd(2, 10); return digitar(`Dobro do dobro do dobro de ${n}?`, 8 * n, `${n} → ${2 * n} → ${4 * n} → ${8 * n}`); }],
      () => digitar('8 × 8 = ?', 64, '8 × 8 = 64')),
    lic('Dedos do 9', '🖐️', ['Dedos do 9', 'Abaixe o dedo n: dezenas | unidades'],
      tabuada([9], ['conta', 'escolha', 'conta', 'falta'], D), () => digitar('9 × 9 = ?', 81, 'Abaixe o 9º dedo: 8 | 1 → 81', { dedos: 9 })),
    lic('Soma 9', '🔢', ['Soma 9', 'Em 9 × n, os algarismos somam 9'],
      [...tabuada([9], ['vf', 'padrao', 'escolha'], D), () => { const n = sortear([9 * rnd(2, 10), 9 * rnd(2, 10) + sortear([1, -1, 2])]); return vf(`${n} está na tabuada do 9?`, n % 9 === 0, `Some os algarismos: ${somaDig(n)}`); }],
      () => digitar('9 × 11 = ?', 99, '9 × 10 + 9 = 99')),
    lic('×9 = ×10 − n', '🔟', ['×9 truque', '9 × 6 = 60 − 6'],
      [...tabuada([8, 9], ['ligar', 'conta'], D),
        () => { const n = rnd(2, 10); return digitar(`10 × ${n} − ${n} = ?`, 9 * n, `É 9 × ${n}`); },
        () => { const n = rnd(2, 10); return digitar(`9 × ${n} = ${10 * n} − ?`, n, `9 × ${n} = 10 × ${n} − ${n}`); }],
      () => digitar('9 × 12 = ?', 108, '120 − 12 = 108')),
    lic('Contra o tempo', '⏱', ['Relâmpago 8 e 9', '8 × 7 = 56 · 9 × 7 = 63'], tabuada([8, 9], ['tempo', 'tempo', 'tempoLigar'], D), () => rapido(digitar('8 × 9 = ?', 72, '8 × 9 = 72', { dedos: 8 }), 8))
  ], ['Mestre do 8 e 9', '9 × n: os algarismos somam 9'], () => digitar('9 × 8 = ?', 72, 'Abaixe o 8º dedo: 7 | 2 → 72', { dedos: 8 }));
})();

// ---------- DIA 13 · Tabuada completa ----------
(() => {
  const T = [2, 3, 4, 5, 6, 7, 8, 9];
  criarDia(13, [
    lic('Tabuada mista', '🎲', ['Mista', 'Comece pela conta que você sabe'], tabuada(T, ['conta', 'escolha', 'falta', 'vf', 'grade']), () => digitar('7 × 8 = ?', 56, '5, 6, 7, 8 🎵')),
    lic('Ordem não importa', '🔄', ['Ordem', 'a × b = b × a 🔄'], [
      () => { const a = rnd(2, 9), b = rnd(2, 9); return digitar(`${a} × ${b} = ${b} × ?`, a, 'Trocar a ordem não muda 🔄'); },
      () => { const a = rnd(2, 9), b = rnd(2, 9); return vf(`${a} × ${b} = ${b} × ${a}?`, true, 'A ordem não importa 🔄', { visual: bolinhas(a, b) }); },
      () => { const a = rnd(2, 9), b = rnd(2, 9), c = a + sortear([1, -1]); return vf(`${a} × ${b} = ${b} × ${c}?`, false, `${a} × ${b} = ${b} × ${a}`); },
      () => ligar('Ligue as contas iguais 🔄', paresUnicos(() => { const a = rnd(2, 5), b = rnd(6, 9); return [`${a} × ${b}`, a * b]; }).map(([c]) => [c, c.split(' × ').reverse().join(' × ')]), 'Mesma conta, ordem trocada'),
      () => { const a = rnd(2, 9), b = rnd(2, 9); return fixa(`${a} × ${b} ? ${b} × ${a}`, ['<', '=', '>'], '=', 'A ordem não importa 🔄'); }
    ], () => vf('9 × 7 × 0 = 0 × 7 × 9?', true, 'Ordem não importa: os dois dão 0')),
    lic('×0 e ×1', '0️⃣', ['Zero e um', '× 0 dá 0 · × 1 dá ele mesmo'], [
      () => { const n = rnd(2, 99); return digitar(`${n} × 0 = ?`, 0, 'Vezes 0 dá sempre 0'); },
      () => { const n = rnd(2, 99); return digitar(`1 × ${n} = ?`, n, 'Vezes 1 é ele mesmo'); },
      () => { const n = rnd(2, 99); return escolha(`0 × ${n}`, [0, n, 1], 0, `Nenhuma vez o ${n} = 0`); },
      () => { const n = rnd(2, 20); return vf(`${n} × 1 = ${n} × 0?`, false, `${n} × 1 = ${n}; ${n} × 0 = 0`); },
      () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const n = rnd(2, 9), z = Math.random() < .5; return [z ? `${n} × 0` : `${n} × 1`, z ? 0 : n]; }), 'Vezes 0 dá 0; vezes 1 não muda')
    ], () => digitar('123 × 0 = ?', 0, 'Vezes 0 dá 0, até para 123')),
    lic('Quebrar a conta', '🔨', ['Quebrar', '7 × 8 = 7 × 5 + 7 × 3'], [
      () => { const a = rnd(6, 9), b = rnd(6, 9); return digitar(`${a} × ${b} = ${a} × 5 + ${a} × ?`, b - 5, `${b} = 5 + ${b - 5}`); },
      () => { const a = rnd(6, 9), b = rnd(6, 9); return digitar(`${a} × 5 + ${a} × ${b - 5} = ?`, a * b, `É ${a} × ${b} = ${a * b}`); },
      () => { const a = rnd(3, 9), b = rnd(11, 19); return digitar(`${a} × ${b} = ${a} × 10 + ${a} × ?`, b - 10, `${b} = 10 + ${b - 10}`); },
      () => { const a = rnd(3, 9), b = rnd(11, 15); return digitar(`${a} × ${b} = ?`, a * b, `${a} × 10 + ${a} × ${b - 10} = ${a * 10} + ${a * (b - 10)}`); },
      () => { const a = rnd(6, 9), b = rnd(6, 9); return padrao([`${a} × 5 = ${a * 5}`, `${a} × ${b - 5} = ${a * (b - 5)}`], `${a} × ${b} =`, a * b, 'Some as duas partes'); }
    ], () => digitar('8 × 12 = ?', 96, '8 × 10 + 8 × 2 = 80 + 16')),
    lic('Contra o tempo', '⏱', ['Relâmpago final', 'Rapidez vem do treino diário ⚡'], tabuada(T, ['tempo', 'tempo', 'tempoLigar'], { dedos: true }), () => rapido(digitar('6 × 8 = ?', 48, '6 × 8 termina em 8: 48'), 8))
  ], ['Mestre da tabuada', 'Toda conta se quebra em partes'], () => digitar('9 × 9 − 9 × 8 = ?', 9, '81 − 72 = 9'));
})();

// ---------- DIA 14 · Regra dos sinais (multiplicação de inteiros) ----------
(() => {
  const vezes = (a, b) => `${ent(a)} · ${ent(b)}`;
  const sinalDe = n => (n > 0 ? '+' : n < 0 ? '−' : '0');
  const nz = () => sortear([1, -1]) * rnd(1, 9);
  // descobrir pelo padrão: (−2)·3, (−2)·2, (−2)·1, (−2)·0, (−2)·(−1)…
  const L1 = [
    () => { const a = rnd(2, 5), f = sortear([0, -1, -2]); return padrao([f + 3, f + 2, f + 1].map(k => `${vezes(-a, k)} = ${fmt(-a * k)}`), `${vezes(-a, f)} =`, -a * f, `Cada linha soma ${a}`, { conta: vezes(-a, f) }); },
    () => { const a = rnd(2, 5), f = sortear([0, -1, -2]); return padrao([f + 3, f + 2, f + 1].map(k => `${vezes(a, k)} = ${fmt(a * k)}`), `${vezes(a, f)} =`, a * f, `Cada linha tira ${a}`, { conta: vezes(a, f) }); },
    () => { const a = rnd(2, 5); return padrao([2, 1, 0].map(k => `${vezes(-a, k)} = ${fmt(-a * k)}`), `${vezes(-a, -1)} =`, a, 'O padrão sobe e passa para o +!'); },
    () => { const a = rnd(2, 9), k = rnd(1, 9); return digitar(`${vezes(-a, k)} = ?`, -a * k, `${a} · ${k} = ${a * k}, com sinal −`); }
  ];
  const S1 = () => padrao(['(−1) · 2 = −2', '(−1) · 1 = −1', '(−1) · 0 = 0'], '(−1) · (−1) =', 1, 'Seguiu o padrão: +1 🎉');

  // positivo vezes negativo: dívida repetida
  const L2 = [
    () => { const n = rnd(2, 6), d = rnd(2, 9); return digitar(`💸 ${n} dívidas de R$${d}. Saldo?`, -n * d, `${vezes(n, -d)} = ${fmt(-n * d)}`, { conta: vezes(n, -d) }); },
    () => { const n = rnd(2, 9), d = rnd(2, 9); return digitar(`${vezes(n, -d)} = ?`, -n * d, `${n} dívidas de ${d}: ${fmt(-n * d)}`); },
    () => { const n = rnd(2, 4), d = rnd(2, 9); return digitar(`${Array(n).fill(ent(-d)).join(' + ')} = ${n} · ?`, -d, `Somar ${n} vezes o ${fmt(-d)}`); },
    () => { const n = rnd(2, 9), d = rnd(2, 9); return escolha(vezes(n, -d), perto(-n * d, n), fmt(-n * d), 'Positivo · negativo = negativo'); },
    () => { const n = rnd(2, 9), d = rnd(2, 9); return fixa(`${vezes(n, -d)} dá…`, ['+', '−'], '−', 'Dívida repetida continua dívida 💸'); }
  ];
  const S2 = () => digitar('💸 10 dívidas de R$10. Saldo?', -100, '10 · (−10) = −100');

  // negativo vezes negativo
  const L3 = [
    () => { const a = rnd(2, 9), b = rnd(2, 9); return digitar(`${vezes(-a, -b)} = ?`, a * b, `Menos com menos dá +: ${a * b}`); },
    () => { const n = rnd(2, 5), d = rnd(2, 9); return digitar(`Apagam ${n} dívidas de R$${d}. Ganho?`, n * d, `${vezes(-n, -d)} = ${n * d} 🎉`, { conta: vezes(-n, -d) }); },
    () => { const a = rnd(2, 9), b = rnd(2, 9); return vf(`${vezes(-a, -b)} é positivo?`, true, '(−) · (−) = (+)'); },
    () => { const a = rnd(2, 9), b = rnd(2, 9); return escolha(vezes(-a, -b), perto(a * b, a), fmt(a * b), '(−) · (−) = (+)'); },
    () => { const a = rnd(2, 4); return padrao([1, 0, -1].map(k => `${vezes(-a, k)} = ${fmt(-a * k)}`), `${vezes(-a, -2)} =`, 2 * a, `Cada linha soma ${a}`); }
  ];
  const S3 = () => digitar('(−1) · (−1) · (−1) = ?', -1, '(−1)·(−1) = 1; 1 · (−1) = −1');

  // a regra (carta rara)
  const L4 = [
    () => { const a = nz(), b = nz(); return fixa(`${vezes(a, b)} dá…`, ['+', '−'], sinalDe(a * b), 'Iguais dão + · diferentes dão −', { visual: cartaSinais() }); },
    () => { const a = nz(), b = nz(); return digitar(`${vezes(a, b)} = ?`, a * b, 'Sinal primeiro, depois a tabuada'); },
    () => vf('Sinais iguais dão +?', true, '(+)·(+) = + · (−)·(−) = +', { visual: cartaSinais() }),
    () => vf('Sinais diferentes dão +?', false, '(+)·(−) = − · (−)·(+) = −', { visual: cartaSinais() }),
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = nz(), b = nz(); return [vezes(a, b), a * b]; }), 'Sinal primeiro, depois a tabuada')
  ];
  const S4 = () => digitar('(−2) · (−3) · (−1) = ?', -6, 'Três sinais −: o resultado é −');

  // sinais + tabuada
  const L5 = [
    () => { const a = nz(), b = nz(); return rapido(escolha(vezes(a, b), perto(a * b, Math.abs(a)), fmt(a * b), 'Sinal primeiro, depois a tabuada'), 8); },
    () => { const a = nz(), b = nz(); return digitar(`${vezes(a, b)} = ?`, a * b, 'Sinal primeiro, depois a tabuada'); },
    () => { const a = nz(), b = nz(); return digitar(`${ent(a)} · ? = ${fmt(a * b)}`, b, `${vezes(a, b)} = ${fmt(a * b)}`); },
    () => ({ ...ligar('⏱ Ligue rápido! 🔗', paresUnicos(() => { const a = nz(), b = nz(); return [vezes(a, b), a * b]; }), 'Sinal primeiro'), limite: 25 })
  ];
  const S5 = () => digitar('(−7) · 8 = ?', -56, '5, 6, 7, 8 🎵 com sinal −');

  criarDia(14, [
    lic('Descobrir o padrão', '🧩', ['Padrão', 'Siga o padrão: o sinal aparece sozinho'], L1, S1),
    lic('Dívida repetida', '💸', ['Dívida repetida', '3 · (−4) = −12: três dívidas de 4'], L2, S2),
    lic('Menos com menos', '✨', ['Menos com menos', '(−) · (−) = (+)'], L3, S3),
    lic('Regra dos sinais', '🌟', ['Regra dos sinais', 'Iguais dão + · diferentes dão −', true], L4, S4),
    lic('Sinais e tabuada', '⚡', ['Sinal + tabuada', 'Primeiro o sinal, depois a tabuada'], L5, S5)
  ], ['Mestre dos sinais', 'Sinal certo + tabuada certa'], () => digitar('(−9) · (−9) = ?', 81, 'Iguais dão +: 81'), 20);
})();

// ---------- DIA 15 · Divisão ----------
(() => {
  const div = () => { const k = rnd(2, 9), q = rnd(1, 10); return [k * q, k, q]; };
  const COISAS = ['🍬', '🍪', '⚽', '🍓'];
  const L1 = [
    () => { const k = rnd(2, 5), q = rnd(2, 6); return repartir(k * q, k, `${sortear(COISAS)} ${k * q} para ${k} amigos. Cada um?`, q, `${k * q} ÷ ${k} =`); },
    () => { const [n, k, q] = div(); return digitar(`${n} ÷ ${k} = ?`, q, `${k} × ${q} = ${n}`, { visual: bolinhas(k, q) }); },
    () => { const [n, k, q] = div(); return escolha(`${n} ÷ ${k}`, vizinhos(q, 2, 2), q, `${k} × ${q} = ${n}`); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const [n, k, q] = div(); return [`${n} ÷ ${k}`, q]; }), 'Pense na tabuada ao contrário'),
    () => { const [n, k, q] = div(), r = q + sortear([0, 0, 1, -1]); return vf(`${n} ÷ ${k} = ${r}?`, r === q, `${n} ÷ ${k} = ${q}`); }
  ];
  const S1 = () => digitar('🍕 12 fatias para 4 amigos. Cada um?', 3, '12 ÷ 4 = 3', { visual: bolinhas(4, 3) });

  const L2 = [
    () => { const [n, k, q] = div(); return digitar(`${k} × ? = ${n}`, q, `${n} ÷ ${k} = ${q}`); },
    () => { const [n, k, q] = div(); return digitar(`${n} ÷ ${k} = ?`, q, `Pense: ${k} × ? = ${n}`); },
    () => { const [n, k, q] = div(); return padrao([`${k} × ${q} = ${n}`, `${n} ÷ ${k} = ${q}`], `${n} ÷ ${q} =`, k, '÷ desfaz o ×'); },
    () => { const [n, k, q] = div(); return vf(`Se ${k} × ${q} = ${n}, ${n} ÷ ${q} = ${k}?`, true, '÷ desfaz o ×'); },
    () => { const [n, k, q] = div(), e = k + sortear([1, -1]); return vf(`Se ${k} × ${q} = ${n}, ${n} ÷ ${q} = ${e}?`, false, `${n} ÷ ${q} = ${k}`); }
  ];
  const S2 = () => { const k = rnd(2, 9); return digitar(`0 ÷ ${k} = ?`, 0, 'Nada para repartir: 0 para cada'); };

  const familia = () => { const a = rnd(2, 9), b = rnd(2, 9); return [a, b, a * b]; };
  const L3 = [
    () => ligar('Ligue as cartas da família 🃏', paresUnicos(() => { const [a, b, c] = familia(); return [`${a} × ${b} = ${c}`, `${c} ÷ ${a} = ${b}`]; }), 'Mesmos 3 números, contas irmãs'),
    () => { const [a, b, c] = familia(); return digitar(`Família ${a}, ${b}, ${c}: ${c} ÷ ${a} = ?`, b, `${a} × ${b} = ${c}`); },
    () => { const [a, b, c] = familia(), e = c + sortear([a, -a, 1]); return escolha(`Qual é da família ${a}, ${b}, ${c}?`, [`${c} ÷ ${a}`, `${e} ÷ ${a}`, `${c} ÷ ${a + 1}`], `${c} ÷ ${a}`, 'Use só os 3 números da família'); },
    () => { const [a, b, c] = familia(); return vf(`${c} ÷ ${b} = ${a} é da família ${a}, ${b}, ${c}?`, true, `${b} × ${a} = ${c}`); }
  ];
  const S3 = () => digitar('Quantos fatos na família 2, 5, 10?', 4, '2×5, 5×2, 10÷2 e 10÷5');

  const L4 = [
    () => { const [n, k, q] = div(); return digitar(`${n} ÷ ${k} = ?`, q, `${k} × ${q} = ${n}`); },
    () => { const [n, k, q] = div(); return rapido(escolha(`${n} ÷ ${k}`, vizinhos(q, 2, 2), q, `${k} × ${q} = ${n}`), 7); },
    () => ({ ...ligar('⏱ Ligue rápido! 🔗', paresUnicos(() => { const [n, k, q] = div(); return [`${n} ÷ ${k}`, q]; }), 'Tabuada ao contrário'), limite: 20 }),
    () => { const k = rnd(2, 9); return padrao([1, 2, 3].map(q => `${k * q} ÷ ${k} = ${q}`), `${k * 4} ÷ ${k} =`, 4, `De ${k} em ${k}`); }
  ];
  const S4 = () => digitar('81 ÷ 9 = ?', 9, '9 × 9 = 81');

  const L5 = [
    () => { const k = rnd(2, 6), q = rnd(2, 9); return digitar(`📦 ${k * q} livros em ${k} caixas. Cada caixa?`, q, `${k * q} ÷ ${k} = ${q}`); },
    () => { const k = rnd(2, 6), q = rnd(2, 9); return digitar(`👥 ${k * q} alunos, grupos de ${k}. Grupos?`, q, `${k * q} ÷ ${k} = ${q}`); },
    () => { const k = rnd(2, 6), q = rnd(2, 9); return digitar(`🍪 ${k} amigos, ${q} para cada. Total?`, k * q, `${k} × ${q} = ${k * q}`); },
    () => { const k = rnd(2, 5), q = rnd(2, 5); return repartir(k * q, k, `⚽ ${k * q} bolas para ${k} times. Cada?`, q, `${k * q} ÷ ${k} =`); }
  ];
  const S5 = () => digitar('👥 30 alunos, grupos de 5. Grupos?', 6, '30 ÷ 5 = 6');

  criarDia(15, [
    lic('Dividir é repartir', '🍬', ['Repartir', 'Dividir é repartir em partes iguais'], L1, S1),
    lic('Inverso da multiplicação', '↩️', ['Inverso', '÷ desfaz o ×: 12 ÷ 4 = 3'], L2, S2),
    lic('Famílias de fatos', '🃏', ['Família de fatos', '3 × 4 = 12 · 12 ÷ 3 = 4'], L3, S3),
    lic('Tabuada ao contrário', '🔁', ['Tabuada ao contrário', 'Para dividir, pense na tabuada'], L4, S4),
    lic('Problemas de repartir', '📦', ['Repartir ou agrupar', 'Quanto em cada? Quantos grupos? ÷'], L5, S5)
  ], ['Mestre da divisão', '÷ é o caminho de volta do ×'], () => digitar('100 ÷ 10 = ?', 10, '10 × 10 = 100'));
})();

// ---------- DIA 16 · Divisão com resto ----------
(() => {
  const comResto = () => { const k = rnd(2, 9), q = rnd(1, 9), r = rnd(1, k - 1); return [k * q + r, k, q, r]; };
  const exata = () => { const k = rnd(2, 9), q = rnd(1, 9); return [k * q, k, q, 0]; };
  const qualquer = () => (Math.random() < .5 ? comResto() : exata());
  const L1 = [
    () => { const [n, k, q, r] = qualquer(); return fixa(`${n} ÷ ${k} é exata?`, ['Sim', 'Não'], r ? 'Não' : 'Sim', r ? `Sobra ${r}: não é exata` : `${k} × ${q} = ${n}: exata ✔`); },
    () => { const [n, k, q, r] = comResto(); return digitar(`${n} ÷ ${k} = ? e sobra ${r}`, q, `${k} × ${q} + ${r} = ${n}`); },
    () => { const k = rnd(2, 4), q = rnd(2, 5), r = rnd(1, k - 1); return repartir(k * q + r, k, `🍬 ${k * q + r} balas para ${k}. Cada um?`, q, 'Cada um:'); },
    () => { const [n, k, , r] = qualquer(); return vf(`${n} ÷ ${k} tem resto?`, r > 0, r ? `Sobra ${r}` : 'Resto 0: exata'); }
  ];
  const S1 = () => digitar('🍬 7 balas para 10 amigos. Cada um?', 0, 'Não dá 1 para cada: 0, sobram 7');

  const L2 = [
    () => { const k = rnd(2, 4), q = rnd(2, 5), r = rnd(1, k - 1); return repartir(k * q + r, k, `🍪 ${k * q + r} biscoitos para ${k}. Sobra?`, r, 'Sobra:'); },
    () => { const [n, k, q, r] = comResto(); return digitar(`Resto de ${n} ÷ ${k}?`, r, `${n} = ${k} × ${q} + ${r}`); },
    () => vf('O resto pode ser maior que o divisor?', false, 'Se sobra mais, dá mais 1 para cada'),
    () => { const [n, k, q, r] = comResto(); return escolha(`Resto de ${n} ÷ ${k}`, vizinhos(r, 2, 2), r, `${n} = ${k} × ${q} + ${r}`); }
  ];
  const S2 = () => digitar('Resto de 100 ÷ 10?', 0, '10 × 10 = 100: resto 0');

  const L3 = [
    () => { const [n, k, q, r] = comResto(); return digitar(`${k} × ${q} + ${r} = ?`, n, `É o número do início: ${n}`); },
    () => { const [n, k, q, r] = comResto(); return padrao([`${n} ÷ ${k} = ${q}, resto ${r}`], `Prova: ${k} × ${q} + ${r} =`, n, 'Volte ao número do início'); },
    () => { const [n, k, q, r] = comResto(), e = sortear([r, r, r + 1]); return vf(`${n} ÷ ${k} = ${q}, resto ${e}. Certo?`, k * q + e === n, `${k} × ${q} + ${e} = ${k * q + e}`); },
    () => { const [n, k, q, r] = comResto(); return digitar(`${k} × ${q} + ? = ${n}`, r, `${n} − ${k * q} = ${r}`); }
  ];
  const S3 = () => vf('Zé: 20 ÷ 6 = 3, resto 2. Certo?', true, '6 × 3 + 2 = 20 ✔');

  const L4 = [
    () => { const [n, k, , r] = qualquer(); return fixa(`${n} ÷ ${k} dá exato em ℕ?`, ['Sim', 'Não'], r ? 'Não' : 'Sim', r ? `Sobra ${r}` : 'Resto 0 ✔'); },
    () => { const n = rnd(1, 50); return fixa(`${n} ÷ 0 dá para fazer?`, ['Sim', 'Não'], 'Não', 'Dividir por 0 não existe 🚫'); },
    () => { const k = rnd(1, 9); return vf(`0 ÷ ${k} = 0?`, true, 'Nada para repartir: 0'); },
    () => { const k = rnd(2, 9), n = rnd(k + 1, 60), m = k * Math.floor(n / k); return digitar(`Maior múltiplo de ${k} até ${n}?`, m, `${k} × ${m / k} = ${m}`); }
  ];
  const S4 = () => fixa('7 ÷ 0 dá para fazer?', ['Sim', 'Não'], 'Não', 'Ninguém reparte para 0 amigos 🚫');

  const L5 = [
    () => { const k = rnd(4, 10), q = rnd(2, 6), r = rnd(1, k - 1); return digitar(`🚌 ${k * q + r} alunos, vans de ${k}. Vans?`, q + 1, `${q} vans cheias + 1 para quem sobrou`); },
    () => { const k = rnd(3, 8), q = rnd(2, 9), r = rnd(1, k - 1); return digitar(`🍪 ${k * q + r} biscoitos, pacotes de ${k}. Pacotes cheios?`, q, `Sobram ${r} de fora`); },
    () => { const k = rnd(3, 8), q = rnd(2, 9), r = rnd(1, k - 1); return digitar(`🍪 ${k * q + r} biscoitos, pacotes de ${k}. Sobram?`, r, `${k} × ${q} = ${k * q}; sobram ${r}`); },
    () => { const k = rnd(2, 5), q = rnd(2, 6), r = rnd(1, k - 1); return digitar(`🎈 ${k * q + r} balões para ${k}. Cada um?`, q, `Sobram ${r}`); }
  ];
  const S5 = () => digitar('🚌 41 alunos, vans de 10. Vans?', 5, '4 cheias + 1 para quem sobrou');

  criarDia(16, [
    lic('Exata ou com resto', '🍬', ['Resto', 'O que sobra é o resto'], L1, S1),
    lic('Bolinhas que sobram', '🔵', ['Resto pequeno', 'Resto < divisor, sempre'], L2, S2),
    lic('Conferir a divisão', '✅', ['Prova real', 'divisor × quociente + resto = dividendo'], L3, S3),
    lic('Dá em ℕ?', '🚫', ['Divisível', 'Exato quando o resto é 0 · ÷ 0 não existe'], L4, S4),
    lic('Problemas com resto', '🚌', ['Resto no problema', 'Sobrou gente? Mais uma van!'], L5, S5)
  ], ['Mestre do resto', 'dividendo = divisor × quociente + resto'], () => digitar('Resto de 50 ÷ 7?', 1, '7 × 7 = 49; sobra 1'));
})();

// ---------- DIA 17 · Divisão de inteiros (com a carta rara dos sinais) ----------
(() => {
  const S = { sinais: true }; // power-up 🌟 para quem tem a carta rara
  const divi = () => { const k = rnd(2, 9) * sortear([1, -1]), q = rnd(1, 9) * sortear([1, -1]); return [k * q, k, q]; };
  const barra = (a, b) => `${ent(a)} ÷ ${ent(b)}`;
  const sinalDe = n => (n > 0 ? '+' : '−');
  const L1 = [
    () => { const [n, k, q] = divi(); return fixa(`${barra(n, k)} dá…`, ['+', '−'], sinalDe(q), 'Mesma regra da ×: iguais +, diferentes −', { ...S, visual: cartaSinais() }); },
    () => vf('Na ÷ vale a mesma regra dos sinais?', true, 'Iguais +, diferentes −', { ...S, visual: cartaSinais() }),
    () => { const [n, k, q] = divi(); return digitar(`${barra(n, k)} = ?`, q, `${Math.abs(n)} ÷ ${Math.abs(k)} = ${Math.abs(q)}; sinal ${sinalDe(q)}`, S); }
  ];
  const S1 = () => fixa('(−100) ÷ (−10) dá…', ['+', '−'], '+', 'Iguais dão +', { ...S, visual: cartaSinais() });

  const L2 = [
    () => { const k = rnd(2, 9), q = rnd(1, 9); return digitar(`${barra(-k * q, k)} = ?`, -q, `Diferentes dão −: ${fmt(-q)}`, S); },
    () => { const k = rnd(2, 6), q = rnd(2, 9); return digitar(`💸 Dívida de ${k * q} para ${k}. Cada um?`, -q, `${barra(-k * q, k)} = ${fmt(-q)}`, { ...S, conta: barra(-k * q, k) }); },
    () => { const k = rnd(2, 9), q = rnd(1, 9); return escolha(barra(k * q, -k), perto(-q, 2), fmt(-q), 'Diferentes dão −', S); },
    () => { const k = rnd(2, 9), q = rnd(1, 9); return vf(`${barra(-k * q, k)} = ${q}?`, false, `É ${fmt(-q)}: diferentes dão −`, S); }
  ];
  const S2 = () => digitar('💸 Dívida de 100 para 4. Cada um?', -25, '(−100) ÷ 4 = −25', S);

  const L3 = [
    () => { const k = rnd(2, 9), q = rnd(1, 9); return digitar(`${barra(-k * q, -k)} = ?`, q, 'Menos ÷ menos dá +', S); },
    () => { const k = rnd(2, 9), q = rnd(1, 9); return padrao([`${ent(-k)} · ${q} = ${fmt(-k * q)}`], `${barra(-k * q, -k)} =`, q, '÷ desfaz o ·', S); },
    () => { const k = rnd(2, 9), q = rnd(1, 9); return escolha(barra(-k * q, -k), perto(q, 2), fmt(q), '(−) ÷ (−) = (+)', S); },
    () => { const k = rnd(2, 6), q = rnd(2, 9); return digitar(`Quantas dívidas de ${k} dão ${fmt(-k * q)}?`, q, `${barra(-k * q, -k)} = ${q}`, S); }
  ];
  const S3 = () => digitar('(−1) ÷ (−1) = ?', 1, 'Iguais dão +', S);

  const L4 = [
    () => { const [n, k, q] = divi(); return digitar(`${ent(k)} · ? = ${fmt(n)}`, q, `${barra(n, k)} = ${fmt(q)}`, S); },
    () => ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const [n, k, q] = divi(); return [barra(n, k), q]; }), 'Sinal primeiro, depois a tabuada', S),
    () => { const [n, k, q] = divi(); return vf(`Se ${ent(k)} · ${ent(q)} = ${fmt(n)}, ${barra(n, k)} = ${fmt(q)}?`, true, '÷ desfaz o ·', S); }
  ];
  const S4 = () => digitar('? · (−5) = 35', -7, '35 ÷ (−5) = −7', S);

  const L5 = [
    () => { const [n, k, q] = divi(); return rapido(escolha(barra(n, k), perto(q, 2), fmt(q), 'Sinal primeiro', S), 8); },
    () => { const a = sortear([1, -1]) * rnd(2, 9), b = sortear([1, -1]) * rnd(2, 9); return digitar(`${ent(a)} · ${ent(b)} = ?`, a * b, 'Sinal primeiro, depois a tabuada', S); },
    () => { const [n, k, q] = divi(); return digitar(`${barra(n, k)} = ?`, q, 'Sinal primeiro, depois a tabuada', S); },
    () => ({ ...ligar('⏱ Ligue rápido! 🔗', paresUnicos(() => { const [n, k, q] = divi(); return Math.random() < .5 ? [barra(n, k), q] : [`${ent(k)} · ${ent(q)}`, n]; }), 'Sinal primeiro', S), limite: 25 })
  ];
  const S5 = () => digitar('(−63) ÷ 9 = ?', -7, '9 × 7 = 63; diferentes dão −', S);

  criarDia(17, [
    lic('Sinal da divisão', '➗', ['Sinais na ÷', 'Mesma regra da ×'], L1, S1),
    lic('Negativo ÷ positivo', '💸', ['Dívida repartida', '(−12) ÷ 3 = −4'], L2, S2),
    lic('Negativo ÷ negativo', '✨', ['Menos ÷ menos', '(−) ÷ (−) = (+)'], L3, S3),
    lic('Inverso em ℤ', '↩️', ['Inverso em ℤ', '÷ desfaz o ·, com sinal e tudo'], L4, S4),
    lic('× e ÷ com sinais', '⚡', ['Sinal primeiro', 'Sinal primeiro, conta depois'], L5, S5)
  ], ['Mestre da ÷ em ℤ', 'A carta rara dos sinais vale na ÷ 🌟'], () => digitar('(−81) ÷ (−9) = ?', 9, 'Iguais dão +', S));
})();

// ---------- DIA 18 · Operações misturadas ----------
(() => {
  const n = () => rnd(1, 9);
  const z = () => sortear([1, -1]) * rnd(1, 9);
  const exprs = [
    () => [n(), '+', n(), '×', n()],
    () => [n(), '×', n(), '−', n()],
    () => { const c = rnd(2, 5); return [n(), '+', c * n(), '÷', c]; },
    () => ['(', n(), '+', n(), ')', '×', n()],
    () => [n(), '×', '(', rnd(5, 9), '−', rnd(1, 4), ')'],
    () => [n(), '+', n(), '×', n(), '−', n()],
    () => { const c = rnd(2, 5); return [c * n(), '÷', c, '+', n(), '×', n()]; }
  ];
  const tres = (certo, ...outros) => [...new Set([certo, ...outros, ...vizinhos(certo, 2, 3)])].slice(0, 3);

  // arrastar as operações na fila (toque na ordem)
  const L1 = [
    () => fila(sortear(exprs)()),
    () => fila(sortear(exprs)()),
    () => contaExpr(sortear(exprs)()),
    () => { const a = n(), b = n(), c = n(); return fixa(`${a} + ${b} × ${c}: primeiro…`, ['+', '×'], '×', '× e ÷ vêm antes de + e −'); },
    () => { const a = n(), b = n(), c = n(); return fixa(`(${a} + ${b}) × ${c}: primeiro…`, ['( )', '×'], '( )', 'Parênteses mandam primeiro'); }
  ];
  const S1 = () => fila(['(', n(), '+', n(), ')', '×', '(', rnd(5, 9), '−', rnd(1, 4), ')']);

  const L2 = [
    () => contaExpr([n(), '+', n(), '×', n()]),
    () => { const c = rnd(2, 5); return contaExpr([rnd(10, 30), '−', c * n(), '÷', c]); },
    () => { const a = n(), b = n(), c = n(); return vf(`${a} + ${b} × ${c} = ${(a + b) * c}?`, a + b * c === (a + b) * c, `${b} × ${c} primeiro: ${a + b * c}`); },
    () => contaExpr([n(), '×', n(), '+', n(), '×', n()]),
    () => { const a = n(), b = n(), c = n(); return escolha(`${a} + ${b} × ${c}`, tres(a + b * c, (a + b) * c), a + b * c, '× antes do +'); }
  ];
  const S2 = () => contaExpr([2, '+', 3, '×', 4], { dica: '3 × 4 = 12; 2 + 12 = 14 (não 20!)' });

  const L3 = [
    () => contaExpr([z(), '+', z(), '×', z()], { sinais: true }),
    () => contaExpr([z(), '×', z(), '−', z()], { sinais: true }),
    () => fila([z(), '+', z(), '×', z()]),
    () => contaExpr(['(', z(), '−', z(), ')', '×', z()], { sinais: true }),
    () => { const c = sortear([2, 3, -2, -3]); return contaExpr([z(), '+', c * z(), '÷', c], { sinais: true }); }
  ];
  const S3 = () => contaExpr([-3, '×', -4, '−', 12], { sinais: true });

  const L4 = [
    () => { const q = rnd(2, 5), p = rnd(2, 9), c = rnd(1, 9); return digitar(`🛒 ${q} cadernos de R$${p} e caneta de R$${c}. Total?`, q * p + c, `${q} × ${p} + ${c} = ${q * p + c}`, { conta: `${q} × ${p} + ${c}` }); },
    () => { const t = rnd(30, 60), q = rnd(2, 4), p = rnd(2, 9); return digitar(`💰 Tinha R$${t}, comprei ${q} de R$${p}. Sobrou?`, t - q * p, `${t} − ${q} × ${p} = ${t - q * p}`, { conta: `${t} − ${q} × ${p}` }); },
    () => { const pz = rnd(2, 4), k = sortear([2, 4, 8]); return digitar(`🍕 ${pz} pizzas de 8 fatias, ${k} amigos. Cada?`, (pz * 8) / k, `${pz} × 8 = ${pz * 8}; ${pz * 8} ÷ ${k} = ${(pz * 8) / k}`); },
    () => { const a = rnd(2, 6), d = rnd(2, 5), g = rnd(1, a * d); return digitar(`⭐ ${a} pontos por dia, ${d} dias. Gasto ${g}. Fico?`, a * d - g, `${a} × ${d} − ${g} = ${a * d - g}`); }
  ];
  const S4 = () => digitar('🍕 3 pizzas de 8 fatias, 6 amigos. Cada?', 4, '3 × 8 = 24; 24 ÷ 6 = 4');

  const L5 = [
    () => fila(sortear(exprs)()),
    () => contaExpr(sortear(exprs)()),
    () => { const e = sortear(exprs)(), a = analisar(e), r = a.valor + sortear([0, 1, -1, 2]); return vf(`${textoExpr(e)} = ${fmt(r)}?`, r === a.valor, a.passos.join(' → ')); },
    () => fila([z(), '×', '(', n(), '−', z(), ')'])
  ];
  const S5 = () => fila([n(), '+', n(), '×', '(', n(), '+', n(), ')']);

  criarDia(18, [
    lic('Fila das operações', '🚦', ['Fila das operações', '( ) → × ÷ → + −, da esquerda p/ direita'], L1, S1),
    lic('× e ÷ primeiro', '✖️', ['× e ÷ primeiro', '2 + 3 × 4 = 14, não 20'], L2, S2),
    lic('Expressões com inteiros', '🧮', ['Expressões em ℤ', 'Ordem certa + regra dos sinais'], L3, S3),
    lic('Problemas em 2 passos', '🪜', ['Dois passos', 'Resolva uma parte, depois a outra'], L4, S4),
    lic('Mistura', '🎯', ['Expressão completa', 'Parênteses mandam primeiro'], L5, S5)
  ], ['Mestre das expressões', 'Ordem + sinais = resposta certa'], () => contaExpr(['(', 2, '+', 3, ')', '×', '(', 4, '−', 6, ')'], { sinais: true }));
})();

// modelos de exercício dos dias pedidos (para revisão e prova)
const modelosDos = dias => dias.flatMap(n => (DIAS[n - 1].licoes || []).flatMap(l => l.modelos || []));

// ---------- DIA 19 · Revisão montada com os erros do aluno ----------
(() => {
  // pega até (total − 3) contas da lista de erros do aluno e completa com sorteio dos mesmos dias
  const revisar = (dias, total) => {
    const meus = typeof errosParaRevisar === 'function' ? errosParaRevisar(dias, total - 3) : [];
    const pool = modelosDos(dias), lista = montar(pool, () => sortear(pool)(), total - meus.length);
    meus.forEach(m => lista.splice(rnd(0, lista.length), 0, m));
    return lista;
  };
  const GRUPOS = [
    ['Revisão de naturais', '🌿', [1, 2, 3], 'Quem revisa, lembra'],
    ['Revisão de inteiros', '❄️', [4, 5, 6, 7, 8], 'Erro é pista, não é fim'],
    ['Revisão de tabuada', '🌋', [9, 10, 11, 12, 13, 14], 'Treino deixa fácil'],
    ['Revisão de divisão', '🌊', [15, 16, 17], 'Cada erro vira acerto'],
    ['Revisão de expressões', '🧮', [18], 'Persistência é superpoder']
  ];
  DIAS[18].licoes = [
    ...GRUPOS.map(([titulo, icone, dias, regra], i) => ({
      id: `d19l${i + 1}`, titulo, icone, semReforco: true, modelos: modelosDos(dias),
      carta: { emoji: icone, titulo, regra }, gerar: () => revisar(dias, 8)
    })),
    {
      id: 'd19boss', titulo: 'Chefão', icone: '👑', chefao: true, semReforco: true,
      carta: { emoji: '👑', titulo: 'Mestre da revisão', regra: 'Seus erros viraram treino' }, gerar: () => revisar(Array.from({ length: 18 }, (_, i) => i + 1), 15)
    }
  ];
})();

// ---------- DIA 20 · Prova final (20 questões, uma de cada dia + extras) ----------
(() => {
  const SF = () => contaExpr([-2, '×', '(', 3, '+', -5, ')', '+', 10, '÷', 2], { sinais: true });
  DIAS[19].licoes = [{
    id: 'd20prova', titulo: 'Prova final', icone: '🎓', chefao: true, prova: true, semReforco: true,
    carta: { emoji: '🎓', titulo: 'Mestre Mohamed', regra: 'Você dominou a matemática básica!', rara: true },
    gerar: () => {
      const lista = Array.from({ length: 18 }, (_, i) => sortear(modelosDos([i + 1]))());
      lista.push(sortear(modelosDos([13, 14, 18]))());
      const prova = embaralhar(lista);
      prova.splice(rnd(5, 15), 0, { ...SF(), surpresa: true });
      return prova;
    }
  }];
})();

// ---------- Extra A: casas no chão nas lições de soma e subtração ----------
[
  [3, 0, () => { const a = rnd(0, 5), b = rnd(1, 5); return casas(a, b, `${a} + ${b} = ?`, 0); }],
  [3, 1, () => { const a = rnd(3, 10), b = rnd(1, a); return casas(a, -b, `${a} − ${b} = ?`, 0); }],
  [7, 2, () => { const a = rnd(-5, 5), b = sortear([1, -1]) * rnd(1, 6); return casas(a, b, `${ent(a)} + ${ent(b)} = ?`); }],
  [7, 4, () => { const a = rnd(-5, 5), b = sortear([1, -1]) * rnd(1, 6); return casas(a, b, `${ent(a)} + ${ent(b)} = ?`); }],
  [8, 0, () => { const a = rnd(-4, 4), b = rnd(1, 6); return casas(a, -b, `${fmt(a)} − ${b} = ?`); }],
  [8, 4, () => { const a = rnd(-5, 3), b = rnd(1, 6); return casas(a, b, `${fmt(a)} − (−${b}) = ?`); }]
].forEach(([d, i, modelo]) => DIAS[d - 1].licoes[i].modelos.push(modelo, modelo));

// ---------- Puzzles de matemática da masmorra: placas, balança e ponte (sem tela de pergunta) ----------
// puzzlesDoDia(n) → { tema, regra: { texto, testa, faixa }, sequencia: { texto, termos }, balanca: { min, max } }
// O tema segue o dia (como os duelos): naturais, inteiros, tabuada, divisão; a revisão sorteia um deles.
function puzzlesDoDia(n) {
  const TAB = { 9: [2, 10], 10: [3, 4, 5], 11: [6, 7], 12: [8, 9], 13: [3, 4, 6, 7, 8, 9], 14: [2, 3, 4, 5] };
  if (n >= 18) return puzzlesDoDia(sortear([2, 3, 6, 7, 11, 12, 15, 16, 17]));
  const pa = (a, passo, qtd = 8) => Array.from({ length: qtd }, (_, i) => a + i * passo);
  const seq = termos => ({ texto: termos.slice(0, 3).map(fmt).join(', ') + '…', termos });
  if (n <= 3) {
    const r = sortear([
      { texto: 'Números pares', testa: x => x % 2 === 0, faixa: [0, 30] },
      { texto: 'Números ímpares', testa: x => x % 2 === 1, faixa: [0, 30] },
      { texto: 'Maiores que 12', testa: x => x > 12, faixa: [0, 25] },
      { texto: 'Menores que 8', testa: x => x < 8, faixa: [0, 20] }
    ]);
    return { tema: 'Natural', regra: r, sequencia: seq(pa(rnd(0, 5), sortear([2, 3, 5, 10]))), balanca: { min: 1, max: 9 } };
  }
  if (n <= 8) {
    const r = sortear([
      { texto: 'Números negativos', testa: x => x < 0, faixa: [-12, 12] },
      { texto: 'Maiores que −3', testa: x => x > -3, faixa: [-10, 8] },
      { texto: 'Menores que −2', testa: x => x < -2, faixa: [-10, 8] }
    ]);
    const s = sortear([pa(rnd(4, 9), -2), pa(rnd(5, 9), -3), pa(-rnd(6, 9), 3)]);
    return { tema: 'Negativo', regra: r, sequencia: seq(s), balanca: { min: -9, max: 9 } };
  }
  if (n <= 14) {
    const k = sortear(TAB[n]), sinal = n === 14;
    const r = { texto: `Múltiplos de ${k}`, testa: x => x % k === 0, faixa: sinal ? [-5 * k, 5 * k] : [1, 10 * k] };
    const s = sinal ? Array.from({ length: 6 }, (_, i) => (-2) ** i) : pa(k * rnd(1, 2), k);
    return { tema: 'Tabuada', regra: r, sequencia: seq(s), balanca: sinal ? { min: -9, max: 9 } : { min: 1, max: 12 } };
  }
  const k = rnd(2, 6), neg = n === 17;
  const r = n === 16
    ? { texto: `Resto 1 na divisão por ${k}`, testa: x => x % k === 1, faixa: [1, 9 * k] }
    : { texto: `Divisões exatas por ${k}`, testa: x => x % k === 0, faixa: neg ? [-6 * k, 6 * k] : [1, 9 * k] };
  const base = sortear([2, 3]), vezes = sortear([1, 3]), s = Array.from({ length: 6 }, (_, i) => base ** (5 - i) * vezes);
  return { tema: 'Divisão', regra: r, sequencia: { texto: `${s.slice(0, 3).map(fmt).join(', ')}… (÷${base})`, termos: s }, balanca: neg ? { min: -9, max: 9 } : { min: 1, max: 12 } };
}
