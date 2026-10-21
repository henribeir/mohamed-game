/* Mohamed — app.js: estado, telas, personagem, mapa e motor da lição.

FORMATO DOS EXERCÍCIOS (usado em conteudo.js):
  {
    tipo: 'escolha' | 'digitar' | 'vf',
    pergunta: 'Texto curto, até 8 palavras',
    opcoes: [2 ou 3 valores curtos],   // só em 'escolha' (cada um vira um bloco "?")
    resposta: valor,                    // número ou texto; em 'vf' é true ou false
    dica: 'Frase curta',                // mostrada ao errar
    visual: '<svg>…</svg>',             // opcional: dica visual
    surpresa: true                      // opcional: desafio-surpresa (XP em dobro)
  }
LIÇÃO: { id, titulo, icone, chefao?, carta: { emoji, titulo, regra }, gerar: () => [exercícios] }
DIA:   { n, titulo, mundo, licoes?: [lições] }
*/

// ---------- catálogo ----------
const CORES = ['#7B2FF7', '#FF4B5C', '#1FC46B', '#38BDF8', '#FF9F1C', '#FF4FD8'];
const CORES_EXTRA = ['#FFD400', '#00D1B2', '#64748B', '#8B5E34'];
const ROSTOS = ['feliz', 'serio', 'piscando', 'surpreso', 'bravo'];
const ACESSORIOS = ['nenhum', 'bone', 'coroa', 'fone', 'laco', 'oculos'];
const ACESSORIOS_EXTRA = ['cartola', 'antena', 'capacete', 'flor'];
const MEDALHAS = [
  { id: 'seq10', emoji: '🔥', nome: '10 acertos seguidos' },
  { id: 'perfeita', emoji: '💎', nome: 'Sem errar nenhuma lição' },
  { id: 'dia', emoji: '🏆', nome: 'Dia concluído' },
  { id: 'mestre', emoji: '🎓', nome: 'Mestre Mohamed' }
];
const FRASES = [
  'Livro de matemática? Cheio de problemas! 📚',
  'O zero é natural. E bem tranquilo 😎',
  'Ímpar sempre sobra um. Igual meia! 🧦',
  'O infinito avisou: já volto! ♾️',
  'Dividir pizza é a melhor conta 🍕',
  'Calculadora? Meu cérebro é turbo! 🧠'
];

// ---------- estado salvo ----------
const CHAVE = 'mohamed.v1';
const novoEstado = () => ({
  nome: '', turma: '', apelido: '', criado: false,
  personagem: { cor: CORES[0], rosto: 'feliz', acessorio: 'nenhum' },
  xp: 0, diaAtual: 1, diasConcluidos: [], licoes: {},
  cartas: [], medalhas: [], erros: [], seguidos: 0,
  itens: { cores: [], acessorios: [] }, frases: [], andar: null,
  revisao: [], streak: { dias: 0, ultimo: '' }, moedas: 0, masmorras: {}, aldeia: { lotes: [] },
  gemas: 0, tempos: {}, config: { calmo: false }, extras: { coracao: 0, dica: 0, lanterna: 0 }
});
let estado = carregar();
function carregar() {
  try { return { ...novoEstado(), ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; }
  catch (e) { return novoEstado(); }
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {} }

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vibrar = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
function toast(txt) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = txt;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2700);
}

// sons curtos com Web Audio: [frequência, duração]
let audio = null;
const SONS = {
  ok: [[660, .09], [990, .16]], erro: [[220, .12], [160, .22]], moeda: [[988, .06], [1319, .18]],
  pulo: [[330, .05], [560, .1]], clique: [[620, .03]], vitoria: [[523, .1], [659, .1], [784, .1], [1047, .3]],
  bau: [[392, .07], [523, .07], [659, .07], [1047, .25]],
  chefe: [[147, .16], [123, .16], [98, .32]]
};
function som(tipo) {
  if (typeof Audio2 !== 'undefined') return Audio2.sfx({ ok: 'acerto', pulo: 'golpe' }[tipo] || tipo); // efeitos do audio.js (respeitam o botão de som)
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const onda = tipo === 'erro' || tipo === 'chefe' ? 'sawtooth' : tipo === 'moeda' ? 'square' : 'triangle';
    let t = audio.currentTime;
    for (const [f, d] of SONS[tipo]) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = onda;
      o.frequency.value = f;
      g.gain.setValueAtTime(onda === 'triangle' ? .25 : .08, t);
      g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g);
      g.connect(audio.destination);
      o.start(t);
      o.stop(t + d + .02);
      t += d * .85;
    }
  } catch (e) {}
}

// ---------- personagem (SVG reutilizável: telas, mapa e jogo) ----------
const TINTA = '#1E1240';
// dir: 'baixo' (de frente, padrão), 'cima' (de costas), 'esquerda', 'direita' · poses de andar: 'anda1', 'anda2'
function desenharPersonagem(p = {}, pose = 'parado', dir = 'baixo') {
  const cor = p.cor || CORES[0];
  const rosto = pose === 'tombo' ? 'tonto' : p.rosto || 'feliz';
  const pula = pose === 'pula', passo = pose === 'anda1' ? 1 : pose === 'anda2' ? -1 : 0;
  const svg = miolo => `<svg viewBox="0 -12 100 132" xmlns="http://www.w3.org/2000/svg">${miolo}</svg>`;
  const L = `stroke="${TINTA}" stroke-width="4" stroke-linecap="round" fill="none"`;
  const T = `stroke="${TINTA}" stroke-width="3" stroke-linejoin="round"`;
  const olho = (x, r = 11) => `<circle cx="${x}" cy="50" r="${r}" fill="#fff"/><circle cx="${x + 2}" cy="51" r="${r / 2}" fill="${TINTA}"/><circle cx="${x + 4}" cy="48" r="2" fill="#fff"/>`;
  const ROSTO = {
    feliz: olho(36) + olho(64) + `<path d="M40 66 Q50 76 60 66" ${L}/>`,
    serio: olho(36) + olho(64) + `<path d="M42 70 H58" ${L}/>`,
    piscando: olho(36) + `<path d="M56 51 Q64 44 72 51" ${L}/><path d="M39 65 Q50 79 61 65Z" fill="${TINTA}"/>`,
    surpreso: olho(36, 13) + olho(64, 13) + `<ellipse cx="50" cy="72" rx="6" ry="7" fill="${TINTA}"/>`,
    bravo: olho(36) + olho(64) + `<path d="M25 35 L45 41 M75 35 L55 41" ${L}/><path d="M40 69 Q50 74 60 69" ${L}/>`,
    tonto: `<path d="M30 44 L42 56 M42 44 L30 56 M58 44 L70 56 M70 44 L58 56" ${L}/><path d="M38 71 q6 -6 12 0 t12 0" ${L}/>`
  };
  const ACESS = {
    bone: `<path d="M22 32 Q22 8 50 8 Q78 8 78 32Z" fill="#FF4B5C" ${T}/><rect x="52" y="26" width="38" height="9" rx="4.5" fill="#FF4B5C" ${T}/>`,
    coroa: `<path d="M28 24 L31 2 L41 14 L50 -2 L59 14 L69 2 L72 24Z" fill="#FFC531" ${T}/>`,
    fone: `<path d="M17 50 Q17 6 50 6 Q83 6 83 50" fill="none" stroke="${TINTA}" stroke-width="6"/><rect x="6" y="40" width="16" height="26" rx="8" fill="#38BDF8" ${T}/><rect x="78" y="40" width="16" height="26" rx="8" fill="#38BDF8" ${T}/>`,
    laco: `<g transform="translate(68 22)" fill="#FF4FD8" ${T}><path d="M0 0 L-16 -11 L-16 11Z"/><path d="M0 0 L16 -11 L16 11Z"/><circle r="5"/></g>`,
    oculos: `<g fill="${TINTA}" ${T}><rect x="22" y="40" width="26" height="20" rx="8"/><rect x="52" y="40" width="26" height="20" rx="8"/><path d="M48 48 H52"/></g><path d="M27 45 l6 -2 M57 45 l6 -2" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    cartola: `<rect x="32" y="-8" width="36" height="30" rx="3" fill="${TINTA}"/><rect x="32" y="12" width="36" height="6" fill="#FF4B5C"/><rect x="20" y="20" width="60" height="8" rx="4" fill="${TINTA}"/>`,
    antena: `<path d="M50 22 V2" stroke="${TINTA}" stroke-width="4"/><circle cx="50" cy="0" r="7" fill="#FFC531" ${T}/>`,
    capacete: `<circle cx="50" cy="58" r="47" fill="#BFE9FF" fill-opacity=".35" stroke="#fff" stroke-width="4"/><path d="M18 44 Q22 24 40 16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    flor: `<g transform="translate(30 20)" ${T}>${[0, 72, 144, 216, 288].map(a => `<circle cy="-8" r="6" fill="#fff" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#FFC531"/></g>`
  };
  const tronco = `<rect x="14" y="22" width="72" height="80" rx="36" fill="${cor}"/>`, barriga = '<ellipse cx="50" cy="82" rx="22" ry="14" fill="#fff" opacity=".22"/>';

  // de lado: um olho grande, um pequeno, um braço na frente; a esquerda é o espelho da direita
  if (dir === 'esquerda' || dir === 'direita') {
    const perna = (x, giro) => `<rect x="${x}" y="92" width="14" height="22" rx="7" fill="${TINTA}" transform="rotate(${giro} ${x + 7} 94)"/>`;
    const cara = '<circle cx="62" cy="50" r="10" fill="#fff"/><circle cx="66" cy="51" r="5" fill="' + TINTA + '"/><circle cx="78" cy="50" r="6" fill="#fff"/><circle cx="80" cy="51" r="3" fill="' + TINTA + '"/>' +
      (rosto === 'surpreso' ? `<ellipse cx="72" cy="70" rx="5" ry="6" fill="${TINTA}"/>` : `<path d="M62 67 Q71 74 80 66" ${L}/>`) + '<circle cx="78" cy="63" r="5" fill="#FF7AA8" opacity=".5"/>';
    const braco = `<rect x="43" y="54" width="14" height="30" rx="7" fill="${cor}" stroke="#00000030" stroke-width="3" transform="rotate(${-28 * passo} 50 58)"/>`;
    const acc = p.acessorio === 'oculos' ? `<rect x="54" y="40" width="30" height="20" rx="8" fill="${TINTA}"/>` : ACESS[p.acessorio] || '';
    const tudo = perna(36, 22 * passo) + perna(50, -22 * passo) + tronco + barriga + braco + cara + acc;
    return svg(dir === 'esquerda' ? `<g transform="translate(100 0) scale(-1 1)">${tudo}</g>` : tudo);
  }

  const bracos = pula
    ? `<rect x="4" y="22" width="14" height="32" rx="7" fill="${cor}" transform="rotate(-30 11 50)"/><rect x="82" y="22" width="14" height="32" rx="7" fill="${cor}" transform="rotate(30 89 50)"/>`
    : `<rect x="6" y="${56 + 4 * passo}" width="14" height="28" rx="7" fill="${cor}"/><rect x="80" y="${56 - 4 * passo}" width="14" height="28" rx="7" fill="${cor}"/>`;
  const pernas = pula
    ? `<rect x="28" y="96" width="16" height="14" rx="7" fill="${TINTA}"/><rect x="56" y="96" width="16" height="14" rx="7" fill="${TINTA}"/>`
    : passo
      ? `<rect x="29" y="${passo > 0 ? 90 : 94}" width="14" height="${passo > 0 ? 20 : 22}" rx="7" fill="${TINTA}"/><rect x="57" y="${passo < 0 ? 90 : 94}" width="14" height="${passo < 0 ? 20 : 22}" rx="7" fill="${TINTA}"/>`
      : `<rect class="perna-a" x="29" y="94" width="14" height="22" rx="7" fill="${TINTA}"/><rect class="perna-b" x="57" y="94" width="14" height="22" rx="7" fill="${TINTA}"/>`;

  // de costas: sem rosto, só a nuca e os acessórios que aparecem por trás
  if (dir === 'cima') {
    const acc = p.acessorio === 'oculos' ? '' : p.acessorio === 'bone' ? ACESS.bone.split('<rect')[0] : ACESS[p.acessorio] || '';
    return svg(pernas + bracos + tronco + '<path d="M34 42 Q50 32 66 42" stroke="#00000022" stroke-width="6" fill="none" stroke-linecap="round"/>' + acc);
  }

  const corpo = tronco + barriga + '<circle cx="25" cy="64" r="6" fill="#FF7AA8" opacity=".5"/><circle cx="75" cy="64" r="6" fill="#FF7AA8" opacity=".5"/>';
  return svg(`${pernas}${bracos}${corpo}${ROSTO[rosto] || ROSTO.feliz}${ACESS[p.acessorio] || ''}`);
}

// ---------- navegação ----------
const TELAS = { 't-inicio': telaInicio, 't-personagem': telaPersonagem, 't-mapa': telaMapa, 't-aldeia': telaAldeia, 't-album': telaAlbum, 't-relatorio': () => Relatorio.tela(), 't-masmorra': telaMasmorra };
function irPara(id) {
  $$('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
  window.scrollTo(0, 0);
  if (TELAS[id]) TELAS[id]();
}

// ---------- tela inicial ----------
function telaInicio() {
  $('#logo-heroi').innerHTML = desenharPersonagem(estado.personagem);
  const nome = $('#in-nome'), turma = $('#in-turma'), apelido = $('#in-apelido'), bt = $('#bt-comecar');
  nome.value = estado.nome;
  turma.value = estado.turma;
  apelido.value = estado.apelido;
  const checar = () => { bt.disabled = !(nome.value.trim() && turma.value.trim() && apelido.value.trim()); };
  nome.oninput = turma.oninput = apelido.oninput = checar;
  apelido.onkeydown = e => { if (e.key === 'Enter' && !bt.disabled) bt.click(); };
  checar();
  bt.onclick = () => {
    estado.nome = nome.value.trim();
    estado.turma = turma.value.trim();
    estado.apelido = apelido.value.trim().slice(0, 12);
    salvar();
    som('ok');
    irPara(estado.criado ? 't-mapa' : 't-personagem');
  };
}

// ---------- criação do personagem ----------
let rascunho = null;
function telaPersonagem() {
  rascunho = { ...estado.personagem };
  desenharEditor();
}
function desenharEditor() {
  const op = (campo, v, miolo) => `<button class="op${rascunho[campo] === v ? ' sel' : ''}" data-c="${campo}" data-v="${v}">${miolo}</button>`;
  $('#pv-heroi').innerHTML = desenharPersonagem(rascunho);
  $('#op-cor').innerHTML = [...CORES, ...estado.itens.cores].map(c => op('cor', c, `<i class="cor" style="background:${c}"></i>`)).join('');
  $('#op-rosto').innerHTML = ROSTOS.map(r => op('rosto', r, desenharPersonagem({ ...rascunho, rosto: r, acessorio: 'nenhum' }))).join('');
  $('#op-acessorio').innerHTML = [...ACESSORIOS, ...estado.itens.acessorios]
    .map(a => op('acessorio', a, a === 'nenhum' ? '🚫' : desenharPersonagem({ ...rascunho, acessorio: a }))).join('');
}

// ---------- mapa de fases ----------
// posição dos nós: caminho sinuoso, com espaço extra para a placa de cada mundo
const POS = (() => {
  let y = 0;
  return DIAS.map((d, i) => {
    const novo = i === 0 || DIAS[i - 1].mundo !== d.mundo;
    y += (i ? 120 : 0) + (novo ? 110 : 0);
    return { x: 180 + Math.sin(i * 1.1 + .5) * 92, y: y + 60, novo };
  });
})();
function pontoCaminho(a, b, t) {
  const u = 1 - t, c1 = a.y + 60, c2 = b.y - 60;
  return {
    x: u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * b.y
  };
}
const ESTRELA = '<path d="M0 -16L4.1 -5.7L15.2 -4.9L6.7 2.2L9.4 12.9L0 7L-9.4 12.9L-6.7 2.2L-15.2 -4.9L-4.1 -5.7Z" fill="#FFC531" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>';
const CADEADO = '<g fill="#A29EB6"><rect x="-11" y="-3" width="22" height="17" rx="4"/><path d="M-7 -3V-8a7 7 0 0 1 14 0V-3" fill="none" stroke="#A29EB6" stroke-width="4"/></g>';

function noMapa(d, p, m) {
  const feito = estado.diasConcluidos.includes(d.n), atual = d.n === estado.diaAtual, bloq = !feito && !atual;
  const cor = bloq ? '#DAD7E4' : m.cor;
  const miolo = bloq ? CADEADO : feito ? ESTRELA : `<text y="11" text-anchor="middle" font-size="30" font-weight="900" fill="#fff">${d.n}</text>`;
  return `<g class="no${bloq ? ' bloq' : ''}" data-dia="${d.n}" transform="translate(${p.x} ${p.y})">
    ${atual ? `<circle r="34" fill="${cor}" class="pulso"/>` : ''}
    <circle r="34" cy="7" fill="#00000026"/><circle r="34" fill="${cor}"/><circle r="27" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="4"/>
    ${miolo}
    <text y="60" text-anchor="middle" font-size="14" font-weight="800" fill="${bloq ? '#A29EB6' : TINTA}">${d.titulo}</text>
  </g>`;
}

function telaMapa() {
  Audio2.musica('mapa');
  $('#chip-xp').textContent = `⚡ ${estado.xp}`;
  $('#bt-perfil').innerHTML = desenharPersonagem(estado.personagem);
  let estradas = '', faixas = '', placas = '', nos = '';
  DIAS.forEach((d, i) => {
    const p = POS[i], m = MUNDOS[d.mundo];
    if (i) {
      const a = POS[i - 1], dd = `M${a.x} ${a.y}C${a.x} ${a.y + 60} ${p.x} ${p.y - 60} ${p.x} ${p.y}`;
      estradas += `<path d="${dd}" stroke="${m.cor}" opacity="${d.n <= estado.diaAtual ? 1 : .3}"/>`;
      faixas += `<path d="${dd}"/>`;
    }
    if (p.novo) placas += `<g transform="translate(180 ${p.y - 125})"><rect x="-90" y="-19" width="180" height="38" rx="19" fill="${m.cor}"/><text y="7" text-anchor="middle" font-size="18" font-weight="900" fill="#fff">${m.emoji} ${m.nome}</text></g>`;
    nos += noMapa(d, p, m);
  });
  const alvo = Math.min(estado.diaAtual, DIAS.length) - 1;
  const ini = estado.andar ? estado.andar - 1 : alvo;
  const lugar = pt => `translate(${pt.x - 28}px,${pt.y - 100}px)`;
  const box = $('#mapa');
  box.innerHTML = `<div class="faixa" id="faixa"></div><svg viewBox="0 0 360 ${POS[POS.length - 1].y + 110}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-width="20" stroke-linecap="round">${estradas}</g>
    <g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 16" opacity=".7">${faixas}</g>
    ${placas}${nos}<g id="colegas"></g>
    <g id="mapa-heroi" style="transform:${lugar(POS[ini])}"><g class="heroi-mapa">${desenharPersonagem(estado.personagem).replace('<svg ', '<svg width="56" height="74" ')}</g></g>
  </svg>`;
  pintarRanking();
  Relatorio.atualizarRanking(pintarRanking);
  const svg = box.querySelector('svg');
  const rolar = (y, suave) => {
    const r = svg.getBoundingClientRect();
    box.scrollTo({ top: r.top - box.getBoundingClientRect().top + box.scrollTop + (y * r.width) / 360 - box.clientHeight / 2, behavior: suave ? 'smooth' : 'auto' });
  };
  if (estado.andar && ini !== alvo) {
    // dia concluído: o personagem anda até o próximo nó
    const a = POS[ini], b = POS[alvo], heroi = $('#mapa-heroi');
    estado.andar = null;
    salvar();
    rolar(a.y);
    const kf = Array.from({ length: 11 }, (_, k) => {
      const pt = pontoCaminho(a, b, k / 10);
      return { transform: `translate(${pt.x - 28}px,${pt.y - 100 - (k % 2 ? 14 : 0)}px)` };
    });
    setTimeout(() => {
      rolar(b.y, true);
      heroi.animate(kf, { duration: 1800, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => {
        heroi.style.transform = lugar(b);
        som('ok');
      };
    }, 450);
  } else {
    estado.andar = null;
    rolar(POS[alvo].y);
  }
}

// streak, ranking da turma (top 10 por apelido) e colegas na trilha
function pintarRanking() {
  const faixa = $('#faixa'), colegas = $('#colegas');
  if (!faixa || !colegas) return;
  const top = Relatorio.ranking(), s = streakAtivo();
  faixa.innerHTML = `<button class="chip aldeia" data-ir="t-aldeia">🏘️ 🪙 ${estado.moedas} 💎 ${estado.gemas}</button>` + (s ? `<span class="chip fogo">🔥 ${s} ${s > 1 ? 'dias' : 'dia'}</span>` : '') +
    (estado.apelido ? '' : '<button class="chip" data-ir="t-inicio">🦸 Apelido</button>') +
    top.map((p, i) => `<span class="chip${p.apelido === estado.apelido ? ' eu' : ''}">${['🥇', '🥈', '🥉'][i] || `${i + 1}º`} ${esc(p.apelido)} · ${p.xp}</span>`).join('');
  const porDia = {};
  colegas.innerHTML = top.filter(p => p.apelido !== estado.apelido).map(p => {
    const i = p.dia - 1, pos = POS[i], k = (porDia[i] = (porDia[i] || 0) + 1), lado = pos.x > 180 ? -1 : 1;
    return `<g transform="translate(${pos.x + lado * (36 + k * 16)} ${pos.y - 26})"><circle r="12" fill="#fff" stroke="${MUNDOS[DIAS[i].mundo].cor}" stroke-width="3"/><text y="4" text-anchor="middle" font-size="11" font-weight="900" fill="${TINTA}">${esc(p.apelido.slice(0, 2).toUpperCase())}</text></g>`;
  }).join('');
}

// ---------- masmorra do dia (jogo.js) ----------
// Ajuste fácil: dano, vida dos monstros e do chefão, prêmios
const CONFIG_BATALHA = {
  danoBase: 10,            // dano de cada acerto
  bonusSeguido: 5,         // + por acerto seguido…
  bonusSeguidoMax: 20,     // …até este limite
  vidaMonstro: [30, 60],   // sorteada de 5 em 5 (3 a 5 acertos)
  vidaChefe: 150,          // 3 fases de 50
  coracoes: 5,
  coracoesUltimaFase: 2,   // na última fase o chefão tira 2 corações
  melhoriaDano: 5,         // + de dano base por melhoria
  recompensa: { moedas: 3, xp: 15 },
  recompensaChefe: { moedas: 15, xp: 60 },
  custoDica: 2             // moedas por dica (as grátis vêm das melhorias)
};
// pressão de tempo gentil: ninguém perde por pensar devagar (tudo aqui é fácil de ajustar)
const CONFIG_PRESSAO = {
  rapido: { segundos: 5, bonus: 5 },                        // barra fina que esvazia: responder antes dá +5 de dano
  carga: { fator: 2, min: 8, max: 15, padrao: 5, amostras: 10, teto: 30 }, // mini-chefe e chefão: 2× a média do tema (8 a 15 s)
  enfurecido: { vida: .4, rapidez: 1.6, min: 6 },           // com 40% de vida carrega 1,6× mais rápido (nunca abaixo de 6 s)
  escudo: { acertos: 2 },                                   // precisa de 2 acertos seguidos para tirar vida
  mutante: { vida: .5 },                                    // troca de tema com metade da vida
  chanceComum: .35,                                         // monstro comum com modificador (enfurecido só em mini-chefe e chefão)
  porMundo: [[], ['escudo'], ['mutante'], ['enfurecido'], ['escudo', 'mutante', 'enfurecido']], // mundos 1 a 5
  diasNovos: 2                                              // 2 primeiros dias de cada mundo (conteúdo novo): nada disso
};
const ICONE_MOD = { escudo: '🧱', mutante: '🧬', enfurecido: '😡' };
// tema do monstro → dias de onde saem as perguntas (conteudo.js)
const DIAS_DO_TEMA = { Natural: [1, 2, 3], Negativo: [4, 5, 6, 7, 8], Tabuada: [9, 10, 11, 12, 13, 14], 'Divisão': [15, 16, 17] };
// chefão: cada fase usa um tipo de pergunta; a última bate mais forte
const FASES_CHEFE = [
  { rotulo: '✔✘', tipos: ['vf'] },
  { rotulo: '🔢', tipos: ['escolha'] },
  { rotulo: '✏️', tipos: ['digitar', 'padrao', 'grade', 'tabuleiro', 'repartir'] }
];
// mini-chefe: 2 fases (escolha → conta)
const FASES_MINI = [
  { rotulo: '🔢', tipos: ['escolha', 'vf'] },
  { rotulo: '✏️', tipos: ['digitar', 'padrao', 'grade', 'tabuleiro', 'repartir'] }
];
// mercador: preços em moedas e quanto a lanterna cresce
const CONFIG_MERCADOR = { poder: 5, dica: 3, lanterna: 8, lanternaMais: .5, lanternaMax: 1.5 };
const LANTERNA_BASE = CONFIG_LUZ.lanterna;
const lanternaTotal = () => LANTERNA_BASE + (estado.lanterna || 0) + estado.extras.lanterna * CONFIG_VILA.lanternaPasso;
// acertos e erros: relatório do professor e baldes de água da vila
function registrar(certo, conta, tema) {
  Relatorio.registrar(certo, conta, tema);
  Vila.estudo(certo);
}
// cartas viram poderes: a posição da lição no dia escolhe o poder (até 3 de cada por dia)
const PODERES = {
  nove: { icone: '⚡', nome: 'Poder do 9', efeito: 'Dano em dobro por 3 acertos' },
  escudo: { icone: '🛡️', nome: 'Escudo', efeito: 'Perdoa 1 erro' },
  dica: { icone: '💡', nome: 'Dica', efeito: 'Tira 1 resposta errada' }
};
const poderDaCarta = id => (/boss|prova/.test(id) ? 'nove' : ['dica', 'escudo', 'nove', 'dica', 'escudo'][(+((id.match(/l(\d+)$/) || [0, 1])[1]) - 1) % 5]);
// melhorias entre as salas
const MELHORIAS = [
  { id: 'dano', icone: '⚔️', txt: `+${CONFIG_BATALHA.melhoriaDano} de dano` },
  { id: 'coracoes', icone: '❤️', txt: '+1 coração' },
  { id: 'dicas', icone: '💡', txt: 'Dica grátis' }
];

let RUN = null; // progresso do dia na masmorra: salas, melhorias e poderes usados
function cargas() {
  const total = { nove: 0, escudo: 0, dica: 0 };
  estado.cartas.forEach(id => total[poderDaCarta(id)]++);
  const extras = RUN.extras || {}; // poderes comprados no mercador
  return Object.fromEntries(Object.keys(total).map(k => [k, Math.max(0, Math.min(3, total[k]) + (extras[k] || 0) - (RUN.usados[k] || 0))]));
}

function telaMasmorra() {
  const d = DIAS[diaAberto - 1];
  const p = (estado.masmorras[d.n] = estado.masmorras[d.n] || {});
  if (p.versao !== 2) Object.assign(p, { versao: 2, pegos: [], mapa: 0, vistos: {}, salvo: null }); // mapas grandes: progresso novo
  p.melhorias = p.melhorias || { dano: 0, coracoes: 0, dicas: 0 };
  p.usados = p.usados || { nove: 0, escudo: 0, dica: 0, dicasGratis: 0 };
  p.extras = p.extras || { nove: 0, escudo: 0, dica: 0 };
  RUN = p;
  B = null;
  CONFIG_LUZ.lanterna = lanternaTotal(); // lanterna do mercador e da loja da vila
  Batalha.fechar();
  $('#desafio').hidden = true;
  $('#melhoria').hidden = true;
  Relatorio.licao(d.n, '🏰 Masmorra');
  toast(`${MUNDOS[d.mundo].emoji} Dia ${d.n} · ${d.titulo}`);
  Masmorra.abrir({
    mundo: d.mundo, dia: d.n, personagem: estado.personagem, progresso: p, vidas: CONFIG_BATALHA.coracoes + p.melhorias.coracoes + estado.extras.coracao,
    aoRegistro: (certo, conta, tema) => { registrar(certo, conta, tema); salvar(); }, // puzzles de matemática
    aoGema: n => Vila.gemas(n),
    aoBau: ouro => Vila.bau(ouro),
    aoMercador: abrirMercador,
    aoMoeda: n => { estado.moedas += n; salvar(); },
    aoSalvar: salvar,
    aoBatalha: batalhar,
    aoDesafio: desafio,
    aoSalaLimpa: (i, semErro, chefe, n) => salaLimpa(d, i, semErro, chefe, n),
    aoSaida: () => concluirMasmorra(d)
  });
}

// mapa i de n: as lições do dia se dividem entre os mapas (as perguntas dos monstros saem delas)
function licoesDoMapa(d, i, n) {
  const comuns = d.licoes.filter(l => !l.chefao), a = Math.floor((i * comuns.length) / n);
  return comuns.slice(a, Math.max(a + 1, Math.floor(((i + 1) * comuns.length) / n)));
}

// objetivo do mapa cumprido: as cartas das lições do mapa; o chefão dá todas as que faltam e conclui o dia
function salaLimpa(d, i, semErro, chefe, n) {
  const lics = chefe ? d.licoes : licoesDoMapa(d, i, n);
  for (const lic of lics) {
    if (!lic || (lic.chefao && !chefe)) continue;
    estado.licoes[lic.id] = true;
    if (!estado.cartas.includes(lic.id)) { estado.cartas.push(lic.id); toast(`${lic.carta.rara ? '✨' : '🃏'} ${lic.carta.titulo}`); }
  }
  if (semErro) ganharMedalha('perfeita');
  salvar();
  Relatorio.placar();
  if (chefe) setTimeout(() => concluirMasmorra(d), 400);
  else escolherMelhoria();
}

// entre as salas: 1 de 3 melhorias para o resto do dia
function escolherMelhoria() {
  const caixa = $('#melhoria');
  Masmorra.pausar(true);
  caixa.hidden = false;
  $('#mel-opcoes').innerHTML = MELHORIAS.map(m => `<button class="mel" data-m="${m.id}"><span>${m.icone}</span><b>${m.txt}</b></button>`).join('');
  $('#mel-opcoes').onclick = e => {
    const b = e.target.closest('.mel');
    if (!b) return;
    RUN.melhorias[b.dataset.m]++;
    if (b.dataset.m === 'coracoes') Masmorra.coracao();
    salvar();
    som('bau');
    caixa.hidden = true;
    Masmorra.pausar(false);
  };
}

// chefão vencido (ou saída): conclui o dia, libera o próximo nó do mapa e dá o baú
function concluirMasmorra(d) {
  const novo = !estado.diasConcluidos.includes(d.n);
  if (novo) {
    estado.diasConcluidos.push(d.n);
    if (d.n === estado.diaAtual) { estado.andar = d.n; estado.diaAtual = d.n + 1; }
    ganharMedalha('dia');
    if (d.n === 20) { ganharMedalha('mestre'); Relatorio.enviarFinal(); }
  }
  salvar();
  Relatorio.placar();
  confete();
  Audio2.sfx('vitoria');
  if (novo) { toast('🏆 Dia concluído!'); setTimeout(abrirBau, 700); }
  else { toast('🏁 Masmorra concluída!'); irPara('t-mapa'); }
}

// ---------- mercador: troca moedas por poder, dica ou lanterna ----------
function abrirMercador(fim) {
  const C = CONFIG_MERCADOR, caixa = $('#melhoria');
  const ofertas = [
    { id: 'nove', icone: '⚡', txt: 'Poder do 9 +1', preco: C.poder },
    { id: 'escudo', icone: '🛡️', txt: 'Escudo +1', preco: C.poder },
    { id: 'dica', icone: '💡', txt: 'Dica grátis', preco: C.dica },
    { id: 'lanterna', icone: '🔦', txt: 'Lanterna maior', preco: C.lanterna, esgotou: (estado.lanterna || 0) >= C.lanternaMax }
  ];
  const pintar = () => {
    caixa.querySelector('.titulo').textContent = `🛒 Mercador · 🪙 ${estado.moedas}`;
    $('#mel-opcoes').innerHTML = ofertas.map(o => `<button class="mel" data-o="${o.id}"${o.esgotou || estado.moedas < o.preco ? ' disabled' : ''}><span>${o.icone}</span><b>${o.txt}</b><small>${o.esgotou ? 'esgotou' : '🪙 ' + o.preco}</small></button>`).join('') +
      '<button class="mel sair" data-o="sair"><span>👋</span><b>Até logo</b></button>';
  };
  caixa.hidden = false;
  caixa.classList.add('loja');
  pintar();
  const rosto = SJ() && SJ().retrato(caixa.querySelector('.mel-caixa'), 'seuTroco', { falando: true, antes: true, w: 104, h: 80 }); // Seu Troco atende
  $('#mel-opcoes').onclick = e => {
    const b = e.target.closest('.mel');
    if (!b || b.disabled) return;
    const o = ofertas.find(x => x.id === b.dataset.o);
    if (!o) { if (rosto) rosto.remove(); caixa.hidden = true; caixa.classList.remove('loja'); caixa.querySelector('.titulo').textContent = '✨ Escolha 1'; som('clique'); fim(); return; }
    estado.moedas -= o.preco;
    if (o.id === 'lanterna') { estado.lanterna = (estado.lanterna || 0) + C.lanternaMais; CONFIG_LUZ.lanterna = lanternaTotal(); o.esgotou = estado.lanterna >= C.lanternaMax; }
    else if (o.id === 'dica') RUN.melhorias.dicas++;
    else RUN.extras[o.id]++;
    salvar();
    som('bau');
    if (rosto) SJ().evento('seuTroco', 'feliz');
    toast(`${o.icone} ${o.txt}`);
    pintar();
  };
}

// ---------- perguntas da batalha: o motor atual vira 4 respostas ----------
const TIPOS_BATALHA = ['escolha', 'vf', 'digitar', 'padrao', 'grade', 'tabuleiro', 'repartir'];
function paraBatalha(ex) {
  if (!ex || !TIPOS_BATALHA.includes(ex.tipo)) return null; // arrastar, ligar, reta… ficam para baús e portas
  const texto = (ex.tipo === 'padrao' ? [...ex.linhas, ex.ultima.includes('?') ? ex.ultima : ex.ultima + ' ?'].join('  ·  ')
    : ex.tipo === 'grade' ? `${ex.a} × ${ex.b} = ?` : ex.pergunta).replace(/^(⏱ |🔁 )/, '');
  const base = { ex, texto, dica: ex.dica || 'Pense com calma', visual: ex.visual || '', conta: ex.conta || texto };
  if (ex.tipo === 'vf') return { ...base, opcoes: ['✔', '✘'], certa: ex.resposta ? 0 : 1 };
  const txt = v => (typeof v === 'number' ? fmt(v) : String(v));
  const certo = ex.tipo === 'escolha' ? txt(ex.opcoes.find(o => norm(o) === norm(ex.resposta))) : txt(ex.resposta);
  const ops = ex.tipo === 'escolha' ? ex.opcoes.map(txt) : [certo];
  // respostas numéricas: completa até 4 com números perto (inclui o erro de sinal)
  if (/^-?\d+$/.test(norm(certo))) {
    const n = Number(norm(certo)), neg = n < 0 || /−/.test(texto), usadas = new Set(ops.map(norm));
    for (const v of embaralhar([n + 1, n - 1, n + 2, n - 2, n + 10, n - 10, -n, n * 2])) {
      if (ops.length >= 4) break;
      if (v !== n && (neg || v >= 0) && !usadas.has(String(v))) { usadas.add(String(v)); ops.push(fmt(v)); }
    }
  }
  const lista = embaralhar(ops);
  return { ...base, opcoes: lista, certa: lista.findIndex(o => norm(o) === norm(certo)) };
}

// perguntas do monstro: o tema escolhe os dias; a sala puxa a lição do dia (o chefão, o dia todo);
// "tipos" filtra o tipo de pergunta (fases do chefão); erros antigos voltam às vezes
function geradorDoMonstro(tema, d, sala, tipos) {
  const lic = sala === null ? null : d.licoes[sala], dias = DIAS_DO_TEMA[tema].filter(n => n <= d.n);
  const doDia = DIAS_DO_TEMA[tema].includes(d.n) || d.mundo === 4 ? (lic && lic.modelos) || modelosDos([d.n]) : [];
  const doTema = modelosDos(dias.length ? dias : [DIAS_DO_TEMA[tema][0]]), vistas = new Set();
  const serve = q => q && (!tipos || tipos.includes(q.ex.tipo));
  return () => {
    const volta = Math.random() < .2 && errosParaRevisar(DIAS_DO_TEMA[tema], 1)[0];
    const qv = volta && paraBatalha(volta);
    if (serve(qv)) return qv;
    for (let t = 0; t < 60; t++) {
      const pool = doDia.length && Math.random() < .7 ? doDia : doTema;
      const q = paraBatalha(sortear(pool)());
      if (!q || (t < 45 && !serve(q))) continue;
      if (!vistas.has(q.texto) || t > 50) { vistas.add(q.texto); return q; }
    }
    return paraBatalha(digitar('2 + 2 = ?', 4, '2 + 2 = 4'));
  };
}

// ---------- batalha por turnos: a matemática vira dano ----------
let B = null;
// as perguntas do monstro saem de uma das lições do mapa onde ele mora
function salaDoMonstro(d, mon) {
  const lics = licoesDoMapa(d, mon.mapa || 0, mon.mapas || 1);
  return d.licoes.indexOf(sortear(lics.length ? lics : d.licoes));
}
// o tema do monstro só vale se já foi estudado; senão, vale o tema do dia
function temaValido(tema, d) {
  if (DIAS_DO_TEMA[tema] && DIAS_DO_TEMA[tema].some(n => n <= d.n)) return tema;
  return TEMAS_MONSTRO[d.mundo] || 'Natural';
}
// 2 primeiros dias de cada mundo: conteúdo novo, sem cronômetro nem modificadores
const diaNovo = d => DIAS.filter(x => x.mundo === d.mundo).findIndex(x => x.n === d.n) < CONFIG_PRESSAO.diasNovos;
// modificadores do mundo: mini-chefe e chefão levam todos; o comum, às vezes um (menos enfurecido, que precisa da barra de carga)
function modificadores(mon, d) {
  if (diaNovo(d)) return [];
  const lista = CONFIG_PRESSAO.porMundo[d.mundo] || [];
  if (mon.chefe || mon.mini) return lista.slice();
  const comuns = lista.filter(m => m !== 'enfurecido');
  return comuns.length && Math.random() < CONFIG_PRESSAO.chanceComum ? [sortear(comuns)] : [];
}
// tempo médio de resposta do aluno em cada tema (as últimas 10)
const mediaTempo = tema => { const l = estado.tempos[tema] || []; return l.length ? l.reduce((a, b) => a + b, 0) / l.length : CONFIG_PRESSAO.carga.padrao; };
function guardarTempo(tema, s) { const C = CONFIG_PRESSAO.carga; estado.tempos[tema] = [...(estado.tempos[tema] || []), Math.min(C.teto, s)].slice(-C.amostras); }
const furioso = () => B.mods.enfurecido && B.mon.vida / B.mon.max <= CONFIG_PRESSAO.enfurecido.vida;
function tempoCarga() {
  const P = CONFIG_PRESSAO, C = P.carga, s = Math.max(C.min, Math.min(C.max, C.fator * mediaTempo(B.mon.tema)));
  return furioso() ? Math.max(P.enfurecido.min, s / P.enfurecido.rapidez) : s;
}
const blindado = () => B.mods.escudo && B.trinca < CONFIG_PRESSAO.escudo.acertos - 1;

let relogioB = 0;
function batalhar(mon, coracoes, fim) {
  const d = DIAS[diaAberto - 1], CF = CONFIG_MONSTROS.furtivo;
  mon.tema = temaValido(mon.tema, d);
  // ataque furtivo: o monstro começa com 25% de vida a menos e o primeiro acerto vale dobrado
  if (coracoes.furtivo && mon.vida === mon.max) mon.vida = Math.round(mon.max * (1 - CF.vidaMenos));
  mon.mods = mon.mods || modificadores(mon, d);
  // cronômetro só fora do modo calmo, fora dos dias novos e fora dos mapas de fuga (lá a pressão é o mapa)
  const pressa = !estado.config.calmo && !diaNovo(d) && coracoes.mapa !== 'fuga';
  B = {
    mon, vidas: coracoes.vidas, max: coracoes.max, fim, seguidos: 0, erros: 0, q: null, t0: 0, travado: true, dica: false, fora: [], dobro: 0, escudo: false, fase: 0,
    primeiro: coracoes.furtivo ? CF.primeiroGolpe : 1, fraco: false, gerar: mon.chefe || mon.mini ? null : geradorDoMonstro(mon.tema, d, salaDoMonstro(d, mon)),
    pressa, temCarga: pressa && !!(mon.chefe || mon.mini), carga: 0, cargaMax: 0, ult: performance.now(),
    mods: Object.fromEntries(mon.mods.map(m => [m, true])), trinca: 0, mutou: false
  };
  Batalha.abrir({ monstro: mon, personagem: estado.personagem, vidas: B.vidas, maxVidas: B.max, carga: B.temCarga, aoResponder: responderBatalha, aoDica: dicaBatalha, aoPoder: abrirPoderes });
  Batalha.blindado(blindado());
  if (coracoes.furtivo) setTimeout(() => Batalha.banner('🗡️ Ataque furtivo!'), 150);
  if (mon.mods.length) setTimeout(() => B && Batalha.banner(mon.mods.map(m => ICONE_MOD[m]).join(' ')), coracoes.furtivo ? 1400 : 250);
  efeitos();
  clearInterval(relogioB);
  relogioB = setInterval(tiqueBatalha, 100);
  setTimeout(proximaBatalha, mon.chefe ? 1500 : mon.mini ? 900 : 500);
}

// barra de carga: enche enquanto a pergunta espera; pausa com a dica aberta, com a aba oculta e entre perguntas
function tiqueBatalha() {
  if (!B) return clearInterval(relogioB);
  const agora = performance.now(), dt = Math.min(.5, (agora - B.ult) / 1000);
  B.ult = agora;
  if (!B.temCarga || B.travado || B.t0 === Infinity || B.dica || document.hidden || !B.cargaMax) return;
  B.carga += dt;
  Batalha.carga(B.carga / B.cargaMax);
  if (B.carga >= B.cargaMax) ataqueCarregado();
}
// a barra encheu: o monstro solta o ataque forte, que conta como um erro (sem ir para a lista de erros)
function ataqueCarregado() {
  if (!B || B.travado) return;
  B.travado = true;
  Batalha.relogio(0);
  levarGolpe(-1, true);
}

// chefão: a fase muda com a vida (150 → 100 → 50) e traz outro tipo de pergunta
function proximaBatalha() {
  if (!B) return;
  if (B.mon.chefe || B.mon.mini) { // chefão: 3 fases · mini-chefe: 2 fases
    const fases = B.mon.chefe ? FASES_CHEFE : FASES_MINI, n = fases.length;
    const f = Math.min(n, n - Math.ceil((B.mon.vida / B.mon.max) * n) + 1);
    if (f !== B.fase) {
      B.fase = f;
      B.gerar = geradorDoMonstro(B.mon.tema, DIAS[diaAberto - 1], null, fases[f - 1].tipos);
      Batalha.fase(f, fases[f - 1].rotulo);
      if (f > 1) som('chefe');
      return setTimeout(perguntarBatalha, 700);
    }
  }
  perguntarBatalha();
}

function perguntarBatalha() {
  if (!B) return;
  B.q = B.gerar();
  B.travado = false;
  B.dica = false;
  B.fora = [];
  B.t0 = Infinity; // o relógio do "rápido" e a carga começam quando a pergunta termina de aparecer
  B.carga = 0;
  B.cargaMax = B.temCarga ? tempoCarga() : 0;
  Batalha.carga(0);
  Batalha.furia(furioso());
  Batalha.perguntar(B.q, () => {
    if (!B) return;
    B.t0 = B.ult = performance.now();
    if (B.pressa) Batalha.relogio(CONFIG_PRESSAO.rapido.segundos);
  });
}

function responderBatalha(i) {
  if (!B || B.travado) return;
  B.travado = true;
  const C = CONFIG_BATALHA, P = CONFIG_PRESSAO, q = B.q, certo = i === q.certa, seg = (performance.now() - B.t0) / 1000;
  Batalha.relogio(0);
  if (!B.dica && seg >= 0 && seg < Infinity) guardarTempo(B.mon.tema, seg); // com a dica aberta o tempo não conta na média
  registrar(certo, q.conta, B.mon.tema);
  if (certo && blindado()) { // escudo: o primeiro acerto só trinca; o próximo seguido já tira vida
    B.trinca++;
    B.seguidos++;
    estado.seguidos++;
    salvar();
    Batalha.blindado(blindado());
    Batalha.acerto(i, 0, B.mon.vida, B.mon.max, false, proximaBatalha, `${ICONE_MOD.escudo} Trincou!`);
    return;
  }
  if (certo) {
    const rapido = B.pressa && seg <= P.rapido.segundos;
    let dano = C.danoBase + C.melhoriaDano * RUN.melhorias.dano + Math.min(C.bonusSeguidoMax, C.bonusSeguido * B.seguidos) + (rapido ? P.rapido.bonus : 0);
    if (B.dobro > 0) { dano *= 2; B.dobro--; } // Poder do 9
    if (B.primeiro > 1) { dano *= B.primeiro; B.primeiro = 1; } // primeiro golpe do ataque furtivo
    if (B.fraco) dano = Math.round(dano * (1 + CONFIG_MONSTROS.fraqueza.bonus)); // usou o poder da fraqueza
    B.seguidos++;
    estado.seguidos++;
    if (q.ex.revisao) acertouRevisao(q.ex);
    if (estado.seguidos >= 10) ganharMedalha('seq10');
    B.mon.vida = Math.max(0, B.mon.vida - dano);
    Relatorio.golpe(dano);
    salvar();
    efeitos();
    Batalha.acerto(i, dano, B.mon.vida, B.mon.max, rapido, () => {
      if (!B) return; // a batalha fechou durante a animação
      if (B.mon.vida <= 0) return vencerBatalha();
      if (mutar()) setTimeout(proximaBatalha, 900);
      else proximaBatalha();
    });
  } else levarGolpe(i, false);
}

// erro ou ataque carregado: escudo do aluno perdoa; na última fase do chefão o golpe tira 2 corações
function levarGolpe(i, carregado) {
  const C = CONFIG_BATALHA, q = B.q, d = DIAS[diaAberto - 1];
  const perde = B.escudo ? 0 : B.mon.chefe && B.fase === 3 ? C.coracoesUltimaFase : 1;
  if (B.escudo) B.escudo = false;
  else B.seguidos = 0;
  B.trinca = 0; // o escudo do monstro volta inteiro
  B.erros++;
  B.vidas = Math.max(0, B.vidas - perde);
  estado.seguidos = 0;
  if (!carregado) {
    estado.erros = [...estado.erros, { dia: d.n, licao: 'masmorra', pergunta: q.texto, dada: q.opcoes[i], certa: q.opcoes[q.certa], quando: Date.now() }].slice(-200);
    guardarErro(q.ex, q.ex.diaOrigem || d.n);
  }
  salvar();
  efeitos();
  Batalha.blindado(blindado());
  Batalha.erro(i, q.certa, q, B.vidas, perde ? `${carregado ? '💢 ' : ''}−${perde} ❤️` : '🛡️ Defendido!', () => (B.vidas > 0 ? proximaBatalha() : Batalha.derrota(() => terminarBatalha(false))));
}

// mutante: com metade da vida troca para outro tema já estudado (uma vez por luta)
function mutar() {
  if (!B.mods.mutante || B.mutou || B.mon.vida / B.mon.max > CONFIG_PRESSAO.mutante.vida) return false;
  B.mutou = true;
  const d = DIAS[diaAberto - 1], outros = Object.keys(DIAS_DO_TEMA).filter(t => t !== B.mon.tema && DIAS_DO_TEMA[t].some(n => n <= d.n));
  if (!outros.length) return false;
  B.mon.tema = sortear(outros);
  const fases = B.mon.chefe ? FASES_CHEFE : B.mon.mini ? FASES_MINI : null;
  B.gerar = geradorDoMonstro(B.mon.tema, d, fases ? null : salaDoMonstro(d, B.mon), fases && B.fase ? fases[B.fase - 1].tipos : undefined);
  Batalha.mutou(B.mon);
  som('chefe');
  return true;
}

function vencerBatalha() {
  const P = B.mon.chefe ? CONFIG_BATALHA.recompensaChefe : CONFIG_BATALHA.recompensa, bonus = marcarStreak();
  estado.moedas += P.moedas;
  if (B.mon.chefe) Vila.chefao(); // chefão: gemas e sementes
  estado.xp += P.xp + bonus;
  Relatorio.monstro();
  salvar();
  Batalha.vitoria(`🎉 +${P.moedas} 🪙 +${P.xp + bonus} ⚡`, () => terminarBatalha(true), B.mon.chefe);
}

function terminarBatalha(venceu) {
  const b = B;
  if (!b) return;
  B = null;
  clearInterval(relogioB);
  Batalha.fechar();
  b.fim({ venceu, vidas: b.vidas, erros: b.erros });
}

// selos dos poderes ativos e rótulos dos botões
function efeitos() {
  if (!B) return;
  const gratis = dicasGratis(), c = cargas();
  Batalha.efeitos([B.dobro ? `⚡×2 · ${B.dobro}` : '', B.escudo ? '🛡️' : ''].filter(Boolean).join('  '),
    gratis > 0 ? `💡 Dica · grátis ${gratis}` : `💡 Dica · ${CONFIG_BATALHA.custoDica}🪙`, `⚡ Poder · ${c.nove + c.escudo + c.dica}`);
}

const dicasGratis = () => RUN.melhorias.dicas + estado.extras.dica - RUN.usados.dicasGratis;
// dica: mostra a dica visual (grátis pelas melhorias ou paga com moedas); a barra de carga pausa enquanto ela está aberta
function dicaBatalha() {
  if (!B || B.travado || B.dica) return;
  if (dicasGratis() > 0) RUN.usados.dicasGratis++;
  else if (estado.moedas >= CONFIG_BATALHA.custoDica) estado.moedas -= CONFIG_BATALHA.custoDica;
  else { toast(`🪙 A dica custa ${CONFIG_BATALHA.custoDica}`); return; }
  B.dica = true;
  salvar();
  som('clique');
  Batalha.dica(B.q.dica, B.q.visual);
  efeitos();
}

// poderes das cartas
function abrirPoderes() {
  if (!B || B.travado) return;
  const c = cargas();
  som('clique');
  Batalha.poderes(Object.entries(PODERES).map(([id, p]) => ({ id, ...p, qtd: c[id] })), usarPoder);
}

function usarPoder(id) {
  if (!B || B.travado || cargas()[id] <= 0) return;
  if (id === 'dica') {
    const erradas = B.q.opcoes.map((_, k) => k).filter(k => k !== B.q.certa && !B.fora.includes(k));
    if (B.q.opcoes.length - B.fora.length <= 2 || !erradas.length) { toast('💡 Já está fácil!'); return; }
    const k = sortear(erradas);
    B.fora.push(k);
    Batalha.eliminar(k);
  } else if (id === 'nove') B.dobro = 3;
  else {
    if (B.escudo) { toast('🛡️ Escudo já está ativo'); return; }
    B.escudo = true;
  }
  // fraqueza: o poder certo dá dano extra no resto da batalha
  if (id === B.mon.fraqueza && !B.fraco) { B.fraco = true; setTimeout(() => B && Batalha.banner('💥 Fraqueza!'), 120); }
  RUN.usados[id]++;
  salvar();
  som('bau');
  vibrar(30);
  efeitos();
}

// ---------- baús e portas trancadas: arrastar para ℕ ou ℤ, ligar pares, reta… ----------
const TIPOS_DESAFIO = ['conjunto', 'ligar', 'reta', 'ordenar', 'fila'];
function exercicioDeDesafio(d) {
  for (const pool of [modelosDos([d.n]), modelosDos(Array.from({ length: d.n }, (_, i) => i + 1))]) {
    for (let t = 0; t < 60 && pool.length; t++) { const ex = sortear(pool)(); if (TIPOS_DESAFIO.includes(ex.tipo)) return ex; }
  }
  return ligar('Ligue conta e resultado 🔗', paresUnicos(() => { const a = rnd(1, 9), b = rnd(1, 9); return [`${a} + ${b}`, a + b]; }), 'Uma conta de cada vez');
}

function desafio(tipo, fim) {
  const d = DIAS[diaAberto - 1], ex = exercicioDeDesafio(d), caixa = $('#desafio');
  caixa.hidden = false;
  $('#des-icone').textContent = tipo === 'bau' ? '🎁' : '🔒';
  if (SJ()) { // o Ancião das Cartas acompanha o desafio; o Zé se atrapalha junto quando erra
    let amigos = $('#des-amigos');
    if (!amigos) { amigos = document.createElement('span'); amigos.id = 'des-amigos'; amigos.className = 'des-amigos'; caixa.querySelector('.topo .espaco').before(amigos); }
    SJ().retrato(amigos, 'anciao', { falando: true, w: 52, h: 56 });
    SJ().retrato(amigos, 'ze', { w: 52, h: 56 });
  }
  $('#des-pergunta').textContent = ex.pergunta.replace(/^⏱ /, '');
  $('#des-volta').onclick = () => { som('clique'); caixa.hidden = true; fim({ aberto: false }); };
  Jogo.desafio($('#des-palco'), ex, (certo, det) => {
    registrar(certo, (det && det.conta) || ex.conta || ex.pergunta);
    if (!certo) guardarErro(ex, d.n);
    salvar();
    const aberto = certo || ex.tipo !== 'reta'; // completou o desafio (na reta, só vale acertando)
    som(aberto ? 'vitoria' : 'erro');
    if (SJ()) SJ().evento(aberto ? 'anciao' : 'ze', aberto ? 'feliz' : 'erro');
    $('#des-pergunta').textContent = aberto ? (tipo === 'bau' ? '🎉 Baú aberto!' : '🔓 Porta aberta!') : '😅 Quase! Vem outro';
    setTimeout(() => {
      if (caixa.hidden) return;
      if (aberto) { caixa.hidden = true; fim({ aberto, certo }); } else desafio(tipo, fim);
    }, 900);
  }, ok => { som(ok ? 'moeda' : 'erro'); vibrar(ok ? 20 : 60); if (!ok && SJ()) SJ().evento('ze', 'erro'); });
}

let diaAberto = 1;
const norm = v => {
  const s = String(v).replace(/−/g, '-').replace(/\s/g, '').toLowerCase();
  return /^-?\d+$/.test(s) ? String(Number(s)) : s; // "−0" = "0", "07" = "7"
};

// ---------- lista de erros: revisão (dia 19) e reforço nas batalhas ----------
const chaveEx = ex => ex.pergunta + JSON.stringify(ex.pares || ex.itens || ex.linhas || ex.tokens || [ex.a, ex.b, ex.n, ex.atual, ex.de, ex.resposta]);
function guardarErro(ex, dia) {
  const chave = ex.revisao || chaveEx(ex), item = estado.revisao.find(r => r.chave === chave);
  if (item) { item.vezes = Math.min(item.vezes + 1, 5); return; }
  const { surpresa, limite, revisao, diaOrigem, ...copia } = ex;
  copia.pergunta = copia.pergunta.replace(/^(⏱ |🔁 )/, '');
  estado.revisao = [...estado.revisao, { chave, dia, vezes: 2, ex: copia }].slice(-60);
}
function acertouRevisao(ex) {
  const i = estado.revisao.findIndex(r => r.chave === ex.revisao);
  if (i >= 0 && --estado.revisao[i].vezes <= 0) estado.revisao.splice(i, 1);
}
// sorteia contas da lista de erros: as mais erradas saem mais
function errosParaRevisar(dias, qtd) {
  const pool = estado.revisao.filter(r => !dias || dias.includes(r.dia)), lista = [];
  while (lista.length < qtd && pool.length) {
    let x = Math.random() * pool.reduce((t, r) => t + r.vezes, 0), k = 0;
    while (k < pool.length - 1 && (x -= pool[k].vezes) > 0) k++;
    const r = pool.splice(k, 1)[0];
    lista.push({ ...r.ex, revisao: r.chave, diaOrigem: r.dia, pergunta: '🔁 ' + r.ex.pergunta });
  }
  return lista;
}
// streak diário: bônus de 10 XP por dia seguido (máx. 70), no 1º acerto do dia
const diaTxt = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
function marcarStreak() {
  const s = estado.streak, hoje = diaTxt(new Date()), ontem = new Date();
  if (s.ultimo === hoje) return 0;
  ontem.setDate(ontem.getDate() - 1);
  s.dias = s.ultimo === diaTxt(ontem) ? s.dias + 1 : 1;
  s.ultimo = hoje;
  return 10 * Math.min(s.dias, 7);
}
function streakAtivo() {
  const s = estado.streak, ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  return s.ultimo === diaTxt(new Date()) || s.ultimo === diaTxt(ontem) ? s.dias : 0;
}

// ---------- medalhas ----------
function ganharMedalha(id) {
  if (estado.medalhas.includes(id)) return;
  estado.medalhas.push(id);
  salvar();
  const m = MEDALHAS.find(x => x.id === id);
  toast(`${m.emoji} ${m.nome}!`);
  Vila.gemas(CONFIG_VILA.gemas.medalha);
  confete();
  som('vitoria');
}

// ---------- cartas ----------
function cartaHTML(l, mundo, tem, extra = '') {
  const rara = l.carta.rara;
  if (!tem) return `<div class="carta falta${rara ? ' rara-falta' : ''}"><span class="em">?</span></div>`;
  const [c1, c2] = rara ? ['#FFD54A', '#FF4FD8'] : l.chefao ? ['#FFD54A', '#FF9F1C'] : [MUNDOS[mundo].cor, '#7B2FF7'];
  return `<div class="carta${rara ? ' rara' : ''}${extra}" style="--c1:${c1};--c2:${c2}">${rara ? '<small class="selo">✨ RARA</small>' : ''}<span class="em">${l.carta.emoji}</span><b>${l.carta.titulo}</b><p>${l.carta.regra}</p></div>`;
}

// ---------- baú surpresa (fim do dia) ----------
const BAU = `<svg viewBox="0 0 120 100"><g class="tampa"><path d="M12 46Q12 14 60 14T108 46Z" fill="#C2410C" stroke="${TINTA}" stroke-width="4" stroke-linejoin="round"/><rect x="54" y="16" width="12" height="30" fill="#FFC531"/></g><rect x="12" y="46" width="96" height="46" rx="8" fill="#9A3412" stroke="${TINTA}" stroke-width="4"/><rect x="54" y="48" width="12" height="42" fill="#FFC531"/><rect x="50" y="40" width="20" height="20" rx="5" fill="#FFC531" stroke="${TINTA}" stroke-width="4"/></svg>`;

function sortearPremio() {
  return sortear([
    ...ACESSORIOS_EXTRA.filter(a => !estado.itens.acessorios.includes(a)).map(v => ({ tipo: 'acessorio', v })),
    ...CORES_EXTRA.filter(c => !estado.itens.cores.includes(c)).map(v => ({ tipo: 'cor', v })),
    { tipo: 'frase', v: sortear(FRASES) }
  ]);
}

function abrirBau() {
  som('clique');
  const s = document.createElement('div');
  s.className = 'sobre';
  s.innerHTML = `<div class="caixa"><h2 class="titulo">🎁 Baú surpresa</h2><button class="bau" aria-label="Abrir">${BAU}</button><p class="sub">Toque para abrir 👆</p></div>`;
  document.body.appendChild(s);
  const bau = s.querySelector('.bau');
  bau.onclick = () => {
    bau.onclick = null;
    bau.classList.add('treme');
    vibrar(120);
    som('pulo');
    setTimeout(() => { bau.classList.replace('treme', 'aberto'); som('bau'); confete(); }, 900);
    setTimeout(() => revelar(s), 1700);
  };
}

function revelar(s) {
  const p = sortearPremio();
  let titulo, corpo;
  if (p.tipo === 'frase') {
    if (!estado.frases.includes(p.v)) estado.frases.push(p.v);
    titulo = '😂 Frase nova!';
    corpo = `<p class="frase">${p.v}</p>`;
  } else {
    estado.itens[p.tipo === 'cor' ? 'cores' : 'acessorios'].push(p.v);
    estado.personagem[p.tipo] = p.v;
    titulo = p.tipo === 'cor' ? '🎨 Cor nova!' : '✨ Acessório novo!';
    corpo = `<div class="premio">${desenharPersonagem(estado.personagem)}</div>`;
  }
  const semente = Vila.sementes(1); // o baú do fim do dia também traz uma semente
  salvar();
  s.querySelector('.caixa').innerHTML = `<h2 class="titulo">${titulo}</h2>${corpo}<p class="sub">${semente} +1</p><button class="btn" id="bt-oba">Oba! ▶</button>`;
  s.querySelector('#bt-oba').onclick = () => { som('clique'); s.remove(); irPara('t-mapa'); };
}

// ---------- vila (vila.js): construir, passear, produzir e plantar ----------
function telaAldeia() {
  Audio2.musica('aldeia');
  Vila.abrir();
}
function cartaPorId(id) {
  for (const d of DIAS) for (const l of d.licoes || []) if (l.id === id) return l;
  return null;
}

// ---------- ajustes: modo calmo (sem barras de tempo) ----------
function abrirAjustes() {
  som('clique');
  const s = document.createElement('div');
  s.className = 'sobre';
  const pintar = () => {
    const on = estado.config.calmo;
    s.innerHTML = `<div class="caixa"><h2 class="titulo">⚙️ Ajustes</h2>
      <button class="ajuste${on ? ' ligado' : ''}" id="aj-calmo" aria-pressed="${on}"><span>🧘</span><b>Modo calmo</b><i>${on ? 'Ligado' : 'Desligado'}</i></button>
      <p class="sub">${on ? 'Sem barras de tempo ⏳' : 'Barras de tempo gentis ⏱'}</p>
      <button class="btn" id="aj-ok">Ok ▶</button></div>`;
    s.querySelector('#aj-calmo').onclick = () => { estado.config.calmo = !estado.config.calmo; salvar(); som('clique'); pintar(); };
    s.querySelector('#aj-ok').onclick = () => { som('clique'); s.remove(); };
  };
  pintar();
  document.body.appendChild(s);
}

// ---------- álbum de cartas e medalhas ----------
function telaAlbum() {
  const dias = DIAS.filter(d => d.licoes);
  const total = dias.reduce((s, d) => s + d.licoes.length, 0);
  $('#album-xp').textContent = `⚡ ${estado.xp}`;
  $('#album-cont').textContent = `🃏 ${estado.cartas.length}/${total}`;
  $('#album-medalhas').innerHTML = MEDALHAS
    .map(m => `<div class="medalha${estado.medalhas.includes(m.id) ? '' : ' falta'}"><span class="m">${m.emoji}</span>${m.nome}</div>`).join('');
  $('#album-cartas').innerHTML = dias.map(d =>
    `<div class="secao">${MUNDOS[d.mundo].emoji} Dia ${d.n} · ${d.titulo}</div>
     <div class="grade">${d.licoes.map(l => cartaHTML(l, d.mundo, estado.cartas.includes(l.id))).join('')}</div>`).join('')
    + (estado.frases.length ? `<div class="secao">😂 Frases</div><div class="frases">${estado.frases.map(f => `<p>${f}</p>`).join('')}</div>` : '');
}

// ---------- início do app ----------
function iniciarApp() {
  Relatorio.iniciar();
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ir]');
    if (b) { som('clique'); irPara(b.dataset.ir); }
  });
  $('#t-personagem').addEventListener('click', e => {
    const b = e.target.closest('.op');
    if (!b) return;
    rascunho[b.dataset.c] = b.dataset.v;
    som('clique');
    desenharEditor();
    const pv = $('#pv-heroi');
    pv.classList.remove('pop');
    void pv.offsetWidth;
    pv.classList.add('pop');
  });
  $('#bt-pronto').onclick = () => {
    estado.personagem = { ...rascunho };
    estado.criado = true;
    salvar();
    som('ok');
    irPara('t-mapa');
  };
  $('#mapa').onclick = e => {
    const g = e.target.closest('.no');
    if (!g || g.classList.contains('bloq')) return;
    som('clique');
    diaAberto = +g.dataset.dia;
    irPara('t-masmorra'); // o mapa abre a masmorra do dia
  };
  $('#bt-ajustes').onclick = abrirAjustes;
  irPara(!estado.nome ? 't-inicio' : estado.criado ? 't-mapa' : 't-personagem');
}
iniciarApp();
