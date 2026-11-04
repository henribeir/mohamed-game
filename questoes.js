/* Mohamed — questoes.js: banco de questões sem repetição e sem ambiguidade (carrega depois de conteudo.js).
   · normalizar / iguais: resposta digitada (espaços, vírgula e ponto, todos os sinais de menos, "3 resto 1" = "3r1")
   · valor: valor de uma opção para achar equivalentes (6 = 6,0 · 2/4 = 1/2 · −0 = 0)
   · chave: chave única normalizada da pergunta (tipo + conta; 3 × 7 e 7 × 3 são a mesma)
   · juiz: recalcula a resposta sozinho, a partir do texto (sem olhar o gabarito do gerador)
   · paraBatalha: exercício → 4 respostas; perguntas de escolher ("qual é par?") ficam só com as opções do gerador
   · distratores: erros comuns (±1, sinal trocado, somar em vez de multiplicar, algarismos trocados, resto esquecido)
   · validar: exatamente uma opção certa, opções distintas (também no valor) e distratores plausíveis
   · historico: últimas 40 chaves + chaves do dia (fica salvo no estado do aluno)
   · testar: ?teste=questoes na URL — 3000 perguntas por dia da trilha, só no navegador, sem rede
   Convenção brasileira: ℕ = {0, 1, 2, 3, …} (o zero é natural). */
const Questoes = (() => {
  const MENOS = /[−‒–—‐‑﹣－-]/g; // −, ‒, –, —, ‐, ‑, ﹣, －, -
  const TIPOS_BATALHA = ['escolha', 'vf', 'digitar', 'padrao', 'grade', 'tabuleiro', 'repartir'];
  const PAL = 'zero um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete dezoito dezenove vinte'.split(' ');
  const mdc = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

  // ---------- valor de uma opção: inteiro, decimal (vírgula ou ponto), fração ou "q resto r" ----------
  function valor(x) {
    if (typeof x === 'number') return Number.isFinite(x) ? racional(x) : null;
    let s = String(x == null ? '' : x).normalize('NFC').replace(MENOS, '-').replace(/\s+/g, '').replace(/°c?$/i, '').replace(/^\+/, '');
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 1.000 = mil
    let m = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (m) { const d = +m[2]; return d === 0 ? null : fracao(+m[1], d); }
    m = s.match(/^(-?)(\d+)(?:[.,](\d+))?$/);
    if (!m) return null;
    const casas = m[3] ? m[3].length : 0, n = +(m[2] + (m[3] || '')) * (m[1] ? -1 : 1);
    return fracao(n, 10 ** casas);
  }
  function racional(v) { if (Number.isInteger(v)) return fracao(v, 1); for (let d = 2; d <= 1000; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return fracao(Math.round(v * d), d); return { num: v, n: v, d: 1, chave: String(+v.toFixed(9)) }; }
  function fracao(n, d) {
    if (d < 0) { n = -n; d = -d; }
    const g = mdc(n, d); n /= g; d /= g;
    if (n === 0) n = 0; // −0 vira 0
    return { num: n / d, n, d, chave: d === 1 ? String(n) : `${n}/${d}` };
  }

  // ---------- resposta digitada: tudo o que é igual vira o mesmo texto ----------
  function normalizar(x) {
    let s = String(x == null ? '' : x).normalize('NFC').toLowerCase().replace(MENOS, '-').replace(/\s+/g, ' ').trim();
    const r = s.match(/^(-?\d+)\s*,?\s*(?:r|resto|e resto|sobra|e sobra)\s*(\d+)$/); // 3 resto 1 · 3r1 · 3 r 1 · 3, resto 1
    if (r) return `${+r[1]}r${+r[2]}`;
    const v = valor(s);
    if (v) return v.chave;
    // acento só sai das letras (não = nao); símbolos como ∉ continuam diferentes de ∈
    return s.normalize('NFD').replace(/([a-z])[\u0300-\u036f]+/g, '$1').normalize('NFC').replace(/\s/g, '').replace(/[.!\u2026]+$/, '');
  }
  const iguais = (a, b) => normalizar(a) === normalizar(b);

  // ---------- texto limpo para reconhecer contas ----------
  const limpar = t => String(t == null ? '' : t).normalize('NFC').replace(MENOS, '−').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '').replace(/R\$\s*/g, '').replace(/\s+/g, ' ').replace(/\s+([,.!…])/g, '$1').replace(/\s+\?$/, '?').trim(); // "22 ? 6" fica como está

  // ---------- expressões: números, + − × · ÷, parênteses, |x| e "?" (incógnita) ----------
  function avaliar(texto, x) {
    const s = String(texto).replace(/\s+/g, '').replace(/[*x]/g, '×');
    let i = 0;
    const olha = () => s[i], come = c => (s[i] === c ? (i++, true) : false);
    function expr() { let v = termo(); for (;;) { if (come('+')) v += termo(); else if (come('−')) v -= termo(); else return v; } }
    function termo() { let v = unario(); for (;;) { if (come('×') || come('·')) v *= unario(); else if (come('÷') || come('/')) { const d = unario(); v = d === 0 ? NaN : v / d; } else return v; } }
    function unario() { if (come('−')) return -unario(); if (come('+')) return unario(); return atomo(); }
    function atomo() {
      if (come('(')) { const v = expr(); if (!come(')')) throw new Error(')'); return v; }
      if (come('|')) { const v = expr(); if (!come('|')) throw new Error('|'); return Math.abs(v); }
      if (come('?')) { if (x === undefined) throw new Error('?'); return x; }
      const m = s.slice(i).match(/^\d+/);
      if (!m) throw new Error('número');
      i += m[0].length;
      return +m[0];
    }
    try { const v = expr(); return i === s.length ? v : NaN; } catch (e) { return NaN; }
  }
  const ehConta = s => /^[\d\s+−×·÷()|?]+$/.test(s) && /\d/.test(s);
  // equação com um "?": f(x) = esquerda − direita é linear nestas contas; duas medidas acham x
  function resolver(esq, dir) {
    const f = x => avaliar(esq, x) - avaliar(dir, x), f0 = f(0), f1 = f(1);
    if (!Number.isFinite(f0) || !Number.isFinite(f1) || f1 === f0) return null;
    const x = -f0 / (f1 - f0);
    return Math.abs(f(x)) < 1e-9 ? x : null;
  }
  // valor de uma conta escrita (com ou sem "= ?"); null se não for conta
  function contaValor(t0) {
    let t = limpar(t0).replace(/^[^\d(−|?]*:\s*/, '').replace(/…$/, ''); // "Prova: 4 × 9 + 2 = ?" → a conta
    if (/\?$/.test(t) && !t.includes('=')) t = t.slice(0, -1).trim(); // "7 + 3?" sem incógnita (em "9 × ?" o ? é a incógnita)
    if (/=/.test(t)) {
      const [esq, dir, ...resto] = t.split('=');
      const lado = x => /^[\d\s+−×·÷()|?]+$/.test(x); // um lado pode ser só o "?"
      if (resto.length || !lado(esq) || !lado(dir) || !/\d/.test(esq + dir)) return null;
      const n = (esq + dir).split('?').length - 1;
      if (n !== 1) return null;
      if (dir.trim() === '?') { const v = avaliar(esq); return Number.isFinite(v) ? v : null; }
      return resolver(esq, dir);
    }
    if (!ehConta(t) || t.includes('?')) return null;
    const v = avaliar(t);
    return Number.isFinite(v) ? v : null;
  }
  const num = s => { const v = valor(s); return v ? v.num : contaValor(s); };
  const natural = v => v != null && Number.isInteger(v) && v >= 0; // ℕ começa no 0
  const inteiro = v => v != null && Number.isInteger(v);
  const par = v => inteiro(v) && v % 2 === 0;
  const impar = v => inteiro(v) && Math.abs(v % 2) === 1;
  const listaNums = s => s.split('·').map(x => x.trim()).filter(Boolean);
  const qualOpcao = (ops, teste) => ops.findIndex(o => teste(String(o)));

  // ---------- juiz: recalcula a resposta pelo texto ----------
  // devolve { v } (resposta é um valor), { melhor } (maior/menor entre as opções), { regra } (opção que cumpre a regra),
  // { certo } (índice da opção certa) ou null (formato que o juiz não conhece: aí vale a conferência de estrutura)
  function juiz(q) {
    const ex = q.ex || {}, ops = q.opcoes || [], T = limpar(q.texto).replace(/^🔁\s*/, '');
    let m;
    const sim = ok => ({ certo: qualOpcao(ops, o => (ok ? /ℕ|sim|✔|∈/i.test(o) && !/∉/.test(o) : /não|nao|✘|∉/i.test(o))) });
    if (ex.tipo === 'vf') {
      const vf = juizVF(T, q.texto);
      return vf === null ? null : { certo: vf ? 0 : 1 };
    }
    if (ex.tipo === 'repartir' && Number.isInteger(ex.n) && ex.k) return { v: /sobra/i.test(T) ? ex.n % ex.k : Math.floor(ex.n / ex.k) };
    // ---- valores ----
    if ((m = T.match(/^Sucessor de (−?\d+)\?$/))) return { v: num(m[1]) + 1 };
    if ((m = T.match(/^Antecessor de (−?\d+)\?$/))) return { v: num(m[1]) - 1 };
    if ((m = T.match(/^Próximo (par|ímpar) depois de (\d+)\?$/))) { const n = +m[2]; return { v: m[1] === 'par' ? (n % 2 ? n + 1 : n + 2) : (n % 2 ? n + 2 : n + 1) }; }
    if ((m = T.match(/^Quem está entre (−?\d+) e (−?\d+)\?$/))) return { v: (num(m[1]) + num(m[2])) / 2 };
    if ((m = T.match(/^Quantos naturais antes de (\d+)\?$/))) return { v: +m[1] }; // 0, 1, …, n − 1
    if ((m = T.match(/^Quantos naturais de (\d+) a (\d+)\?$/))) return { v: +m[2] - +m[1] + 1 };
    if ((m = T.match(/^Resto de (\d+) ÷ (\d+)\??$/))) return { v: +m[1] % +m[2] };
    if ((m = T.match(/^(\d+) ÷ (\d+) = \? e sobra (\d+)$/))) return { v: Math.floor(+m[1] / +m[2]) };
    if ((m = T.match(/^Oposto de (.+)$/)) && num(m[1]) != null) return { v: -num(m[1]) };
    if ((m = T.match(/^Quem leva o (\d+) até (\d+)\?$/))) return { v: +m[2] - +m[1] };
    if ((m = T.match(/^"menos (\S+)" é…$/) || T.match(/^Escreva: menos (\S+)$/)) && PAL.includes(m[1])) return { v: -PAL.indexOf(m[1]) };
    if ((m = T.match(/(\d+) (?:andares abaixo|graus abaixo de zero|m abaixo do mar)/))) return { v: -+m[1] };
    if ((m = T.match(/^(\d+) m acima do mar\. Número\?$/))) return { v: +m[1] };
    if (/^Menor número natural\?$/.test(T)) return { v: 0 };
    if ((m = T.match(/^Quem está (\d+) à (esquerda|direita) do (−?\d+)\?$/))) return { v: num(m[3]) + (m[2] === 'direita' ? 1 : -1) * +m[1] };
    if ((m = T.match(/^Maior múltiplo de (\d+) até (\d+)\?$/))) return { v: Math.floor(+m[2] / +m[1]) * +m[1] };
    if ((m = T.match(/^Dobro do dobro de (\d+)\?$/))) return { v: 4 * +m[1] };
    if ((m = T.match(/^Quantos (pares|ímpares|naturais|inteiros)\? (.+)$/))) {
      const l = listaNums(m[2]).map(num), f = { pares: v => natural(v) && par(v), 'ímpares': v => natural(v) && impar(v), naturais: natural, inteiros: inteiro }[m[1]];
      return { v: l.filter(f).length };
    }
    if ((m = T.match(/^Quantos elementos em \{(.+)\}\?$/))) return { v: m[1].split(',').length };
    if ((m = T.match(/^Quem fica no meio\? (.+)$/))) { const l = listaNums(m[1]).map(num).sort((a, b) => a - b); if (l.length % 2) return { v: l[(l.length - 1) / 2] }; }
    if ((m = T.match(/^Passos do (−?\d+) até o (−?\d+)\?$/))) return { v: Math.abs(num(m[2]) - num(m[1])) };
    if ((m = T.match(/^Dobro do dobro do dobro de (\d+)\?$/))) return { v: 8 * +m[1] };
    if ((m = T.match(/^Família .+?: (.+)$/))) { const v = contaValor(m[1]); if (v != null) return { v }; }
    if ((m = T.match(/^Do (−?\d+), ando (\d+)/))) return { v: num(m[1]) + (/⬅/.test(q.texto) ? -1 : 1) * +m[2] }; // a seta diz o lado
    if ((m = T.match(/^Dias: (.+)\. Total\?$/))) { const l = m[1].split(',').map(x => num(x.trim())); if (l.every(x => x != null)) return { v: l.reduce((a, b) => a + b, 0) }; }
    // problemas com história: a conta escondida no texto
    const H = [
      [/^Paguei (\d+), gastei (\d+)\. Troco\?$/, (a, b) => a - b], [/^Tinha (\d+), vendi (\d+)\. Restam\?$/, (a, b) => a - b],
      [/^Tenho (\d+), ganho (\d+)\. Fico com\?$/, (a, b) => a + b], [/^No (−?\d+), desço (\d+)\. Paro no\?$/, (a, b) => a - b],
      [/^No (−?\d+), subo (\d+)\. Paro no\?$/, (a, b) => a + b], [/^Faz (−?\d+)°C e cai (\d+)°\. Fica\?$/, (a, b) => a - b],
      [/^Faz (−?\d+)°C e sobe (\d+)°\. Fica\?$/, (a, b) => a + b], [/^Tinha (\d+), gastei (\d+)\. Saldo\?$/, (a, b) => a - b],
      [/^Devo (\d+)\. Meu saldo\?$/, a => -a], [/^Saldo (−?\d+), recebo (\d+)\. Fica\?$/, (a, b) => a + b],
      [/^Em (−?\d+) m, subo (\d+) m\. Fico\?$/, (a, b) => a + b], [/^Lucro (\d+), prejuízo (\d+)\. Saldo\?$/, (a, b) => a - b],
      [/^Saldo (−?\d+), vendo (\d+)\. Fica\?$/, (a, b) => a + b], [/^Saldo (−?\d+), prejuízo (\d+)\. Fica\?$/, (a, b) => a - b],
      [/^Saldo (−?\d+)\. Perdoam (\d+) de dívida\. Fica\?$/, (a, b) => a + b], [/^Tenho (−?\d+)\. Apagam dívida de (\d+)\. Fico\?$/, (a, b) => a + b],
      [/^Saldo (−?\d+)\. Tiram (\d+) reais\. Fica\?$/, (a, b) => a - b], [/^De (−?\d+)° para (−?\d+)°\. Variação\?$/, (a, b) => b - a],
      [/^(−?\d+) m e (−?\d+) m\. Distância\?$/, (a, b) => Math.abs(a - b)], [/^Hoje (−?\d+), ontem (−?\d+)\. Mudou quanto\?$/, (a, b) => a - b],
      [/^Máx (−?\d+)°, mín (−?\d+)°\. Diferença\?$/, (a, b) => a - b], [/^(\d+) dívidas de (\d+)\. Saldo\?$/, (a, b) => -a * b],
      [/^Apagam (\d+) dívidas de (\d+)\. Ganho\?$/, (a, b) => a * b], [/^(\d+) livros em (\d+) caixas\. Cada caixa\?$/, (a, b) => a / b],
      [/^(\d+) alunos, grupos de (\d+)\. Grupos\?$/, (a, b) => a / b], [/^(\d+) amigos, (\d+) para cada\. Total\?$/, (a, b) => a * b],
      [/^(\d+) alunos, vans de (\d+)\. Vans\?$/, (a, b) => Math.ceil(a / b)], [/^(\d+) biscoitos, pacotes de (\d+)\. Pacotes cheios\?$/, (a, b) => Math.floor(a / b)],
      [/^(\d+) biscoitos, pacotes de (\d+)\. Sobram\?$/, (a, b) => a % b], [/^(\d+) balões para (\d+)\. Cada um\?$/, (a, b) => Math.floor(a / b)],
      [/^Dívida de (\d+) para (\d+)\. Cada um\?$/, (a, b) => -a / b], [/^Quantas dívidas de (\d+) dão (−?\d+)\?$/, (a, b) => b / -a],
      [/^(\d+) cadernos de (\d+) e caneta de (\d+)\. Total\?$/, (a, b, c) => a * b + c], [/^Tinha (\d+), comprei (\d+) de (\d+)\. Sobrou\?$/, (a, b, c) => a - b * c],
      [/^(\d+) pizzas de (\d+) fatias, (\d+) amigos\. Cada\?$/, (a, b, c) => (a * b) / c], [/^(\d+) pontos por dia, (\d+) dias\. Gasto (\d+)\. Fico\?$/, (a, b, c) => a * b - c],
      [/^(\d+) e (\d+)\. Total\?$/, (a, b) => a + b]
    ];
    for (const [re, f] of H) if ((m = T.match(re))) { const v = f(...m.slice(1).map(num)); if (Number.isFinite(v)) return { v }; }
    // ---- escolher entre as opções ----
    if (/^Qual conjunto tem os negativos\?$/.test(T)) return { certo: ops.indexOf('ℤ') };
    if (/^Quem mora dentro de quem\?$/.test(T)) return { certo: ops.indexOf('ℕ ⊂ ℤ') };
    if ((m = T.match(/^(.+): primeiro…$/))) { // ordem das operações: ( ) primeiro, depois × ÷, depois + −
      const e = m[1], alvo = e.includes('(') ? '( )' : (e.match(/[×÷·]/) || e.match(/[+−]/) || [''])[0];
      return { certo: qualOpcao(ops, o => o.replace(/\s/g, '') === alvo.replace(/\s/g, '')) };
    }
    if ((m = T.match(/^Qual é da família (.+)\?$/))) { // família da divisão: os três números da família, numa divisão certa
      const F = m[1].split(',').map(x => num(x.trim())).sort((a, b) => a - b);
      return { regra: o => { const p = limpar(o).match(/^(\d+) ÷ (\d+)$/); if (!p) return false; const a = +p[1], b = +p[2], c = a / b; return [a, b, c].sort((x, y) => x - y).join() === F.join(); } };
    }
    if (/^(Qual é natural\?|Toque no natural)$/.test(T)) return { regra: o => natural(num(o)) };
    if (/^Qual NÃO é natural\?$/.test(T)) return { regra: o => !natural(num(o)) };
    if (/^Qual é par\?$/.test(T)) return { regra: o => par(num(o)) };
    if (/^Qual é ímpar\?$/.test(T)) return { regra: o => impar(num(o)) };
    if (/^Natural e par\?$/.test(T)) return { regra: o => natural(num(o)) && par(num(o)) };
    if (/^Natural e ímpar\?$/.test(T)) return { regra: o => natural(num(o)) && impar(num(o)) };
    if (/^(Qual é o maior\?|Mais à direita: .+)$/.test(T)) return { melhor: 'max' };
    if (/^(Qual é o menor\?|Quem abre a ordem crescente\?|Qual andar é mais baixo\?|Qual é mais frio\?|Quem está pior\?|Quem está mais fundo\?)$/.test(T)) return { melhor: 'min' };
    if (/^Mais longe do 0\?$/.test(T)) return { melhor: 'longe' };
    if (/^Qual NÃO dá em ℕ\?$/.test(T)) return { regra: o => { const v = contaValor(o); return v != null && v < 0; } };
    if (/^O Zé errou uma\. Qual\?/.test(T)) return { regra: o => { const r = relacaoTexto(o); return r !== null && !r; } };
    // ---- respostas em palavras ----
    if ((m = T.match(/^É natural\? (.+)$/))) { const v = num(m[1]); if (v != null) return sim(natural(v)); }
    if ((m = T.match(/^(.+) é…$/)) && ops.some(o => /par/i.test(o))) { const v = num(m[1]); if (inteiro(v)) return { certo: qualOpcao(ops, o => o === (par(v) ? 'Par' : 'Ímpar')) }; }
    if ((m = T.match(/^Classifique: (.+)$/))) {
      const v = num(m[1]);
      if (ops.includes('Só ℤ')) return { certo: ops.indexOf(natural(v) ? 'ℕ e ℤ' : inteiro(v) ? 'Só ℤ' : 'Fora') }; // dia 6: em quais conjuntos mora
      return { certo: qualOpcao(ops, o => o === (!natural(v) ? 'Não ℕ' : par(v) ? 'Par' : 'Ímpar')) };
    }
    if ((m = T.match(/^(.+) \? (.+)$/)) && ops.includes('<')) { const a = num(m[1]), b = num(m[2]); if (a != null && b != null) return { certo: ops.indexOf(a < b ? '<' : a > b ? '>' : '=') }; }
    if ((m = T.match(/^(.+) \? ℕ$/))) return { certo: ops.indexOf(natural(num(m[1])) ? '∈' : '∉') };
    if ((m = T.match(/^(.+) \? ℤ$/))) return { certo: ops.indexOf(inteiro(num(m[1])) ? '∈' : '∉') };
    if ((m = T.match(/^(.+) dá…$/))) { const v = contaValor(m[1]); if (v != null) return { certo: ops.indexOf(v > 0 ? '+' : v < 0 ? '−' : '0') }; }
    if ((m = T.match(/^(.+) \+ (.+): ando para…$/))) { const b = num(m[2]); if (b) return { certo: qualOpcao(ops, o => o.includes(b > 0 ? '➡' : '⬅')) }; }
    if ((m = T.match(/^(−?\d+) − (−?\d+) dá em ℕ\?$/))) return sim(+m[1].replace('−', '-') - +m[2].replace('−', '-') >= 0);
    if ((m = T.match(/^(\d+) ÷ (\d+) (?:é exata|dá exato em ℕ)\?$/))) return sim(+m[1] % +m[2] === 0);
    if ((m = T.match(/^(\d+) ÷ (\d+) dá para fazer\?$/))) return sim(+m[2] !== 0);
    if ((m = T.match(/Lucro (\d+), prejuízo (\d+)\. Saldo é…$/))) { const v = +m[1] - +m[2]; return { certo: ops.indexOf(v > 0 ? '+' : v < 0 ? '−' : '0') }; }
    if ((m = T.match(/^Menor conjunto com \{(.+)\}\?$/))) return { certo: ops.indexOf(m[1].split(',').every(x => natural(num(x))) ? 'ℕ' : 'ℤ') };
    if ((m = T.match(/^(.+) está em…$/))) return { certo: qualOpcao(ops, o => (natural(num(m[1])) ? /ℕ e ℤ/.test(o) : /Só ℤ/.test(o))) };
    if ((m = T.match(/^(.+) vai para…$/))) return { certo: ops.indexOf(natural(num(m[1])) ? 'ℕ' : 'ℤ') };
    if ((m = T.match(/^Tirar (.+) é o mesmo que…$/))) { const v = num(m[1]); if (v != null) return { v: -v }; }
    // ---- contas escritas (com "= ?", "? − 4 = 9", "6 × ? = 42", padrões linha a linha, ou a conta sozinha) ----
    const partes = String(q.texto).split(/\s{2,}·\s{2,}/), ult = partes[partes.length - 1];
    const v = contaValor(ult);
    if (v != null) return { v };
    return null;
  }
  // "a < b" é verdade?
  function relacaoTexto(t) {
    const m = limpar(t).match(/^(.+?) ([<>=]) (.+)$/);
    if (!m) return null;
    const a = num(m[1]), b = num(m[3]);
    if (a == null || b == null) return null;
    return m[2] === '<' ? a < b : m[2] === '>' ? a > b : a === b;
  }
  // verdadeiro ou falso: devolve true/false, ou null se não souber
  // afirmações sem números (conceitos): a resposta certa fica fixa aqui, conferida contra o gerador
  const FATOS = {
    '0 é um número natural?': true, 'ℕ tem um último número?': false, 'Todo natural é par ou ímpar?': true, 'Na reta, o maior fica à direita?': true,
    'O térreo é o andar 0?': true, 'O nível do mar é 0?': true, 'Os negativos ficam à esquerda do 0?': true, 'ℕ = {0, 1, 2, 3, …}?': true,
    'Todo natural é inteiro?': true, 'Todo inteiro é natural?': false, 'Somar negativo é andar ⬅?': true, 'Subtrair é somar o oposto?': true,
    'Tirar uma dívida é ganhar?': true, 'Variação = final − inicial?': true, 'Sinais iguais dão +?': true, 'Sinais diferentes dão +?': false,
    'O resto pode ser maior que o divisor?': false, 'Na ÷ vale a mesma regra dos sinais?': true
  };
  function juizVF(T, cru) {
    let m;
    const comSeta = String(cru || '').replace(/\uFE0F/g, '').replace(/^🔁\s*/, '').trim(); // a seta do texto original importa ("andar ⬅")
    const fato = FATOS[comSeta] !== undefined ? FATOS[comSeta] : FATOS[T];
    if (fato !== undefined) return fato;
    const n = s => num(s);
    if ((m = T.match(/^Zé: "sucessor de (−?\d+) é (−?\d+)"\. Certo\?$/)) || (m = T.match(/^O sucessor de (−?\d+) é (−?\d+)\?$/))) return n(m[2]) === n(m[1]) + 1;
    if ((m = T.match(/^Zé: "antecessor de (−?\d+) é (−?\d+)"\. Certo\?$/))) return n(m[2]) === n(m[1]) - 1;
    if ((m = T.match(/^Zé: (.+) = (−?\d+)\. Certo\?$/))) { const v = contaValor(m[1]); return v == null ? null : v === n(m[2]); }
    if ((m = T.match(/^Zé ordenou: (.+)\. Certo\?$/))) { const l = m[1].split('<').map(n); return l.every(x => x != null) ? l.every((x, i) => !i || l[i - 1] < x) : null; }
    if ((m = T.match(/^Se (.+?) = (.+?), (.+) = (.+)\?$/))) { const a = contaValor(m[3]), b = contaValor(m[4]); return a == null || b == null ? null : a === b; }
    if ((m = T.match(/^(\d+) ÷ (\d+) = (\d+), resto (\d+)\. Certo\?$/))) { const [a, b, q, r] = m.slice(1).map(Number); return b * q + r === a && r < b; }
    if ((m = T.match(/^(\d+) ÷ (\d+) tem resto\?$/))) return +m[1] % +m[2] !== 0;
    if ((m = T.match(/^(\d+) ÷ (\d+) = (\d+) é da família (.+)\?$/))) { const [a, b, c] = m.slice(1, 4).map(Number), F = m[4].split(',').map(x => +x.trim()).sort((x, y) => x - y); return a / b === c && [a, b, c].sort((x, y) => x - y).join() === F.join(); }
    if ((m = T.match(/^(.+) é natural e par\?$/))) { const v = n(m[1]); return natural(v) && par(v); }
    if ((m = T.match(/^(.+) é par\?$/))) { const v = n(m[1]); return v == null ? null : par(v); }
    if ((m = T.match(/^(.+) é ímpar\?$/))) { const v = n(m[1]); return v == null ? null : impar(v); }
    if ((m = T.match(/^(.+) é natural\?$/)) && !/um número/.test(m[1])) { const v = n(m[1]); return v == null ? null : natural(v); }
    if ((m = T.match(/^(.+) ∈ ℕ\?$/))) { const v = n(m[1]); return v == null ? null : natural(v); }
    if ((m = T.match(/^(.+) ∈ ℤ\?$/))) { const v = n(m[1]); return v == null ? null : inteiro(v); }
    if ((m = T.match(/^(.+) está em ℕ e em ℤ\?$/))) { const v = n(m[1]); return v == null ? null : natural(v); }
    if ((m = T.match(/^(\d+) está na tabuada do (\d+)\?$/))) { const a = +m[1], k = +m[2]; return a % k === 0 && a / k <= 10; }
    if ((m = T.match(/^(.+) e (.+) são opostos\?$/))) { const a = n(m[1]), b = n(m[2]); return a == null || b == null ? null : a === -b; }
    if ((m = T.match(/^(.+) dá par\?$/))) { const v = contaValor(m[1]); return v == null ? null : par(v); }
    if ((m = T.match(/^(.+) dá em ℕ\?$/))) { const v = contaValor(m[1]); return v == null ? null : natural(v); }
    if ((m = T.match(/^(.+) é positivo\?$/))) { const v = contaValor(m[1]); return v == null ? null : v > 0; }
    if ((m = T.match(/^(−?\d+)° é mais frio que (−?\d+)°\?$/))) return n(m[1]) < n(m[2]);
    if ((m = T.match(/^Saldo (−?\d+) é dívida\?$/))) return n(m[1]) < 0;
    if ((m = T.match(/^(\d+) paga um de (\d+)\?$/))) return +m[1] >= +m[2];
    if ((m = T.match(/^Tenho (\d+)\. Pago (\d+)\?$/))) return +m[1] >= +m[2];
    if ((m = T.match(/^(−?\d+) se lê "menos (\S+)"\?$/))) return PAL.indexOf(m[2]) === -n(m[1]);
    if ((m = T.match(/^(.+) ([<>]) (.+)\?$/))) { const a = contaValor(m[1]), b = contaValor(m[3]); return a == null || b == null ? null : m[2] === '<' ? a < b : a > b; }
    if ((m = T.match(/^(.+) = (.+)\?$/))) { const a = contaValor(m[1]), b = contaValor(m[2]); return a == null || b == null ? null : Math.abs(a - b) < 1e-9; }
    return null;
  }
  // quais opções o juiz considera certas
  function corretasPeloJuiz(j, ops) {
    if (j.certo !== undefined) return j.certo >= 0 ? [j.certo] : [];
    if (j.v !== undefined) return ops.map((o, i) => { const v = valor(o); return v && Math.abs(v.num - j.v) < 1e-9 ? i : -1; }).filter(i => i >= 0);
    if (j.regra) return ops.map((o, i) => (j.regra(o) ? i : -1)).filter(i => i >= 0);
    const vals = ops.map(o => num(o));
    if (vals.some(v => v == null)) return [];
    const alvo = j.melhor === 'max' ? Math.max(...vals) : j.melhor === 'min' ? Math.min(...vals) : Math.max(...vals.map(Math.abs));
    return vals.map((v, i) => ((j.melhor === 'longe' ? Math.abs(v) : v) === alvo ? i : -1)).filter(i => i >= 0);
  }

  // ---------- distratores: os erros que um aluno comete de verdade ----------
  function permiteNegativo(q, v) { const t = limpar(q.texto); return v < 0 || /−\s*\d|\(−|negativ|dívida|abaixo|desço|cai|saldo|prejuízo|devo/i.test(t); }
  const trocados = v => { const s = String(Math.abs(v)); return s.length > 1 && s[0] !== s[s.length - 1] ? Math.sign(v || 1) * +s.split('').reverse().join('') : null; };
  function errosDaConta(t) {
    const m = limpar(t).replace(/\s*=\s*\?$/, '').match(/^\(?(−?\d+)\)? ([+−×·÷]) \(?(−?\d+)\)?$/);
    if (!m) return [];
    const a = +m[1].replace('−', '-'), b = +m[3].replace('−', '-'), op = m[2], l = [];
    if (op === '×' || op === '·') l.push(a + b, a * (b + 1), a * (b - 1), (a + 1) * b, -a * b); // somou · tabuada do lado · sinal
    if (op === '+') l.push(a - b, b - a, a + b + 10, -(a + b));
    if (op === '−') l.push(a + b, b - a, -(a - b));
    if (op === '÷' && b) l.push(Math.ceil(a / b), a % b, a - b, Math.floor(a / b) + 1, -Math.trunc(a / b)); // resto esquecido · resto no lugar do quociente
    return l;
  }
  function distratores(v, q, qtd = 3) {
    const neg = permiteNegativo(q, v), vistos = new Set([valor(v).chave]), modelo = [], comum = [];
    const ok = x => x != null && Number.isInteger(x) && (neg || x >= 0) && Math.abs(x - v) <= Math.max(12, 2 * Math.abs(v)) && !vistos.has(String(x === 0 ? 0 : x));
    const por = (lista, x) => { if (ok(x)) { vistos.add(String(x === 0 ? 0 : x)); lista.push(x); } };
    errosDaConta((q.ex && q.ex.conta) || q.texto).forEach(x => por(modelo, x));
    if (neg) por(modelo, -v);
    por(modelo, trocados(v));
    [v + 1, v - 1, v + 10, v - 10, v + 2, v - 2, v + 5, v - 5, v + 3, v + 4].forEach(x => por(comum, x));
    const escolhidos = [...embaralhar(modelo).slice(0, Math.min(2, qtd)), ...embaralhar(comum)];
    return escolhidos.slice(0, qtd);
  }
  const plausivel = (d, v, q) => (permiteNegativo(q, v) || d >= 0) && (Math.abs(d - v) <= Math.max(12, 2 * Math.abs(v)) || errosDaConta((q.ex && q.ex.conta) || q.texto).includes(d));

  // ---------- exercício → pergunta de batalha ----------
  const txt = v => (typeof v === 'number' ? fmt(v) : String(v));
  function paraBatalha(ex) {
    if (!ex || !TIPOS_BATALHA.includes(ex.tipo)) return null; // arrastar, ligar, reta… ficam para baús e portas
    const texto = (ex.tipo === 'padrao' ? [...ex.linhas, ex.ultima.includes('?') ? ex.ultima : ex.ultima + ' ?'].join('  ·  ')
      : ex.tipo === 'grade' ? `${ex.a} × ${ex.b} = ?` : ex.pergunta).replace(/^(⏱ |🔁 )/, '');
    const base = { ex, texto, dica: ex.dica || 'Pense com calma', visual: ex.visual || '', conta: ex.conta || texto };
    if (ex.tipo === 'vf') return { ...base, opcoes: ['✔', '✘'], certa: ex.resposta ? 0 : 1 };
    let ops, certo;
    if (ex.tipo === 'escolha') {
      ops = ex.opcoes.map(txt);
      certo = ops.find(o => iguais(o, ex.resposta));
      const j = juiz({ ...base, opcoes: ops });
      // só pergunta de conta (a resposta é um valor) ganha opções a mais; pergunta de escolher ("qual é par?") fica com as do gerador
      if (j && j.v !== undefined && certo !== undefined && valor(certo) && ops.length < 4) ops = [...ops, ...distratores(valor(certo).num, base, 6).map(fmt).filter(o => !ops.some(x => iguais(x, o)))].slice(0, 4);
    } else {
      certo = txt(ex.resposta);
      const v = valor(certo);
      if (!v || v.d !== 1) return null;
      ops = [certo, ...distratores(v.num, base, 3).map(fmt)];
    }
    const lista = embaralhar(ops);
    return { ...base, opcoes: lista, certa: certo === undefined ? -1 : lista.findIndex(o => iguais(o, certo)) };
  }

  // ---------- validação ----------
  function validar(q) {
    const erros = [];
    if (!q || !Array.isArray(q.opcoes) || q.opcoes.length < 2) return { ok: false, erros: ['menos de 2 opções'], modo: '-' };
    const chaves = q.opcoes.map(normalizar);
    if (new Set(chaves).size !== chaves.length) erros.push('opções repetidas');
    if (!(q.certa >= 0 && q.certa < q.opcoes.length)) erros.push('sem gabarito');
    const j = juiz(q);
    let corretas, modo = 'recalculo';
    if (j) corretas = corretasPeloJuiz(j, q.opcoes);
    else { // formato desconhecido do juiz: confere a estrutura (só uma opção igual à resposta do gerador)
      modo = 'estrutura';
      corretas = q.ex && q.ex.tipo === 'vf' ? [q.ex.resposta ? 0 : 1] : q.opcoes.map((o, i) => (iguais(o, q.ex.resposta) ? i : -1)).filter(i => i >= 0);
    }
    if (corretas.length === 0) erros.push('0 corretas');
    else if (corretas.length > 1) erros.push('2+ corretas');
    else if (corretas[0] !== q.certa) erros.push('gabarito diferente do recálculo');
    // plausibilidade: só nos distratores que o jogo acrescentou (os do autor do conteúdo são erros escolhidos de propósito, como −1 em "menor natural")
    const doAutor = ((q.ex && q.ex.opcoes) || []).map(normalizar);
    if (j && j.v !== undefined) for (const o of q.opcoes) { const v = valor(o); if (v && Math.abs(v.num - j.v) > 1e-9 && !doAutor.includes(normalizar(o)) && !plausivel(v.num, j.v, q)) erros.push('distrator implausível'); }
    return { ok: !erros.length, erros, modo };
  }

  // ---------- chave única normalizada ----------
  function chaveConta(t) {
    let s = limpar(t).toLowerCase().replace(/^(zé: |zé ordenou: |se )/, '').replace(/[.?…!]+$/, '').replace(/\s+/g, '').replace(/·/g, '×');
    const m = s.match(/^(\(?−?\d+\)?)([+×])(\(?−?\d+\)?)(=\?)?$/); // 3×7 = 7×3 · 2+5 = 5+2
    if (m) { const [a, b] = [m[1], m[3]].sort(); s = `${a}${m[2]}${b}`; }
    return s;
  }
  function chave(q) {
    const ex = q.ex || {}, tipo = ex.tipo || '?';
    let base = ex.conta || q.texto;
    if (tipo === 'vf' && !ex.conta) { const m = limpar(q.texto).match(/^(?:Zé: )?(.+?) = (.+?)(?:\. Certo)?\?$/); if (m && ehConta(m[1])) base = m[1]; } // mesma conta com outro resultado: mesma chave
    base = chaveConta(base);
    if (!/\d/.test(base)) base += '|' + (q.opcoes || []).map(normalizar).sort().join(',');
    return `${tipo}:${base}`;
  }
  const chaveDesafio = ex => `${ex.tipo}:${chaveConta(ex.pergunta)}|${JSON.stringify(ex.pares || ex.itens || ex.tokens || [ex.resposta, ex.min, ex.max])}`;

  // ---------- histórico do aluno: últimas 40 + as do dia ----------
  const hojeTxt = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  function historico(h) {
    if (!h.recentes) Object.assign(h, { n: 0, recentes: [], dia: '', hoje: [] });
    if (h.dia !== hojeTxt()) { h.dia = hojeTxt(); h.hoje = []; }
    return {
      dados: h,
      n: () => h.n,
      usada: k => h.recentes.includes(k) || h.hoje.includes(k),
      recente: (k, janela = 40) => h.recentes.slice(-janela).includes(k),
      marcar(k) {
        h.n++;
        h.recentes.push(k);
        if (h.recentes.length > 40) h.recentes.splice(0, h.recentes.length - 40);
        h.hoje.push(k);
        if (h.hoje.length > 800) h.hoje.splice(0, h.hoje.length - 800);
      }
    };
  }

  // ---------- sorteador: saco embaralhado de modelos, sem repetir, sempre validado ----------
  // grupos: [{ modelos, peso }] · tipos: filtro de tipo (fases do chefão) · hist: historico() · reforco: () => q | null
  // estat (opcional): conta o que o validador recusou, para o teste
  function sorteador({ grupos, tipos, hist, reforco, plano, estat, origemDe }) {
    const vivos = grupos.filter(g => g.modelos && g.modelos.length), sacos = vivos.map(() => []);
    const somaPeso = vivos.reduce((s, g) => s + (g.peso || 1), 0);
    const tirar = () => {
      let x = Math.random() * somaPeso, gi = 0;
      while (gi < vivos.length - 1 && (x -= vivos[gi].peso || 1) > 0) gi++;
      if (!sacos[gi].length) sacos[gi] = embaralhar(vivos[gi].modelos);
      return sacos[gi].pop();
    };
    const recusa = motivo => { if (estat) estat.recusas[motivo] = (estat.recusas[motivo] || 0) + 1; };
    return function proxima() {
      const r = reforco && reforco();
      if (r) return r;
      let reserva = null;
      for (let t = 0; t < 160 && vivos.length; t++) {
        let ex;
        const m = tirar();
        try { ex = m(); } catch (e) { recusa('gerador falhou'); continue; }
        if (ex && origemDe) ex.origem = origemDe(m); // para o reforço sair do mesmo modelo, com números novos
        const q = paraBatalha(ex);
        if (!q) continue;
        if (tipos && !tipos.includes(ex.tipo) && t < 120) continue;
        const v = validar(q);
        if (!v.ok) { v.erros.forEach(recusa); continue; }
        const k = chave(q);
        if (hist.usada(k)) { if (!hist.recente(k, 40) && !reserva) reserva = q; continue; } // fora das 40 últimas: serve se acabarem as novas
        return q;
      }
      if (reserva) { if (estat) estat.repetidasDia++; return reserva; }
      if (estat) estat.planoB++;
      return plano ? plano() : null;
    };
  }

  // ---------- teste no navegador (?teste=questoes) ----------
  function testarNormalizacao() {
    const casos = [['3 resto 1', '3r1'], ['3r1', '3 r 1'], ['3 R 1', '3 resto 1'], ['−5', '-5'], ['–5', '-5'], ['—5', '−5'], ['−5', '-5'], ['6,0', '6'], ['6.0', '6'], ['2/4', '1/2'], ['0,5', '1/2'], ['−0', '0'], [' 1 2 ', '12'], ['007', '7'], ['1.000', '1000'], ['+2', '2']];
    return casos.map(([a, b]) => ({ a, b, ok: iguais(a, b) }));
  }
  function testar(gerarDia, pronto) {
    const dias = DIAS.length, porDia = 3000, linhas = [];
    let d = 1;
    const passo = () => {
      const r = gerarDia(d, porDia);
      linhas.push(r);
      if (pronto.progresso) pronto.progresso(d, dias);
      if (++d <= dias) setTimeout(passo, 0);
      else pronto({ linhas, normalizacao: testarNormalizacao() });
    };
    setTimeout(passo, 0);
  }

  return { normalizar, iguais, valor, chave, chaveDesafio, juiz, juizVF, validar, paraBatalha, distratores, historico, sorteador, testar, testarNormalizacao, contaValor, TIPOS_BATALHA };
})();
