/* Mohamed — audio.js: trilha sonora e efeitos gerados na hora com Web Audio (nenhum arquivo de áudio).
   API global:
     Audio2.musica('mapa' | 'aldeia' | 'masmorra' | 'furtividade' | 'batalha' | 'chefao')   troca com fade de 0,6 s
     Audio2.bioma('campo' | 'floresta' | 'praia' | 'vulcao' | 'castelo' | null)   masmorra, furtividade, batalha e chefão
                                                                                   passam a tocar a versão do bioma
     Audio2.ambiente('campo' | … | null)   sons ambientes baixos (grilos, vento, ondas, estalos de fogo)
     Audio2.sfx('clique' | 'acerto' | 'erro' | 'golpe' | 'moeda' | 'porta' | 'vitoria' | 'derrota')  (+ 'bau' e 'chefe')
     Audio2.mudo(true | false) · Audio2.volume(0..1)
   O som começa no primeiro toque (regra dos navegadores), pausa com a aba oculta
   e o botão do canto guarda a escolha (ligado, baixo, mudo) no aparelho. */
const Audio2 = (() => {
  const CHAVE = 'mohamed.som', FADE = .6, VOL_PADRAO = .35, VOL_BAIXO = .15;
  let cfg = { mudo: false, vol: VOL_PADRAO };
  try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch (e) {}
  let ctx = null, mestre, busMusica, busSfx, eco, ruido, pedida = null, atual = null, trilhas = [], pintarBotao = () => {};
  let bioma = null, ambPedido = null, amb = null, ambVelhos = [];
  const nota = m => 440 * Math.pow(2, (m - 69) / 12);
  const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) {} };
  const pronto = () => ctx && !cfg.mudo && !document.hidden;

  // ---------- faixas: sempre em tom menor; 16 passos por compasso, 1 acorde por compasso ----------
  // acordes: semitons a partir da tônica · baixo: 1 tônica, 5 quinta, 8 oitava · arpejo: 0-2 notas do acorde, 3 oitava
  // bateria: x toca, . pausa · bat: volume de bumbo, caixa e chimbal
  const FAIXAS = {
    mapa: { // calma e misteriosa: Ré dórico, i · VI · IV · v
      bpm: 76, tonica: 50, acordes: [[0, 3, 7], [-4, 0, 3], [5, 9, 12], [7, 10, 14]],
      baixo: '1.......1...5...', som: { tipo: 'triangle', corte: 700, vol: .2 },
      arpejo: '0..1..2..3..2.1.', arp: { tipo: 'triangle', oitava: 1, vol: .06, corte: 2600, envio: .55 },
      pad: { vol: .018, corte: 800 },
      bumbo: 'x.......x.......', caixa: '................', chimbal: '....x.......x...', bat: [.35, 0, .025]
    },
    aldeia: { // aconchegante: Fá menor com acordes maiores, i · VI · III · VII, caixinha de música
      bpm: 70, tonica: 53, acordes: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
      baixo: '1.....1.5.......', som: { tipo: 'sine', corte: 0, vol: .16 },
      arpejo: '0.2.3.2.1.2.3...', arp: { tipo: 'sine', oitava: 2, vol: .06, corte: 0, solta: .45, envio: .5 },
      pad: { vol: .014, corte: 650 },
      bumbo: 'x.......x.......', caixa: '................', chimbal: '..x...x...x...x.', bat: [.22, 0, .015]
    },
    masmorra: { // tensa e rítmica: Mi frígio, i · bII · i · bVII
      bpm: 100, tonica: 52, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]],
      baixo: '1.1.8.1.1.1.8.1.', som: { tipo: 'sawtooth', corte: 520, vol: .13 },
      arpejo: '0..2..1..3..2...', arp: { tipo: 'square', oitava: 1, vol: .028, corte: 1500, envio: .45 },
      pad: { vol: .016, corte: 600 },
      bumbo: 'x.......x..x....', caixa: '........x.......', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.6, .2, .03]
    },
    batalha: { // rápida e intensa: Lá menor harmônica, i · VI · iv · V
      bpm: 138, tonica: 57, acordes: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],
      baixo: '1.8.1.8.1.8.1.8.', som: { tipo: 'sawtooth', corte: 850, vol: .12 },
      arpejo: '0123210301232103', arp: { tipo: 'square', oitava: 1, vol: .026, corte: 3000, envio: .3 },
      pad: { vol: .012, corte: 900 },
      bumbo: 'x...x...x...x...', caixa: '....x.......x...', chimbal: 'xxxxxxxxxxxxxxxx', bat: [.7, .26, .022]
    },
    chefao: { // grave, épica e urgente: Dó menor com bII e V maior, ritmo 3-3-2
      bpm: 150, tonica: 48, acordes: [[0, 3, 7], [-4, 0, 3], [1, 5, 8], [7, 11, 14]],
      baixo: '1..1..1.1..1..8.', som: { tipo: 'sawtooth', corte: 700, vol: .14, desafina: 10 },
      arpejo: '0.3.2.3.1.3.2.3.', arp: { tipo: 'sawtooth', oitava: 1, vol: .022, corte: 2200, envio: .35 },
      pad: { vol: .022, corte: 1300 },
      bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x.xx', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.8, .28, .03]
    }
  };

  // ---------- faixas por bioma: cada um com escala, andamento e timbres próprios ----------
  // melodia: 64 passos (4 compassos); 1-9 = grau da escala (8 = oitava), '-' segura, '.' pausa
  // extras: tom (tambores graves), chocalho, ondas (ruído que sobe e desce a cada compasso), pad.tipo (órgão = square)
  const MAIOR = [0, 2, 4, 5, 7, 9, 11], DORICA = [0, 2, 3, 5, 7, 9, 10], MENOR = [0, 2, 3, 5, 7, 8, 10], HARMONICA = [0, 2, 3, 5, 7, 8, 11], MIXO = [0, 2, 4, 5, 7, 9, 10];
  const BIOMAS_SOM = {
    campo: { // alegre e leve: Sol maior, flauta doce, caixinha e palmas
      exploracao: {
        bpm: 108, tonica: 55, escala: MAIOR, acordes: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]],
        baixo: '1...5...1...5.8.', som: { tipo: 'triangle', corte: 900, vol: .15 },
        arpejo: '0.1.2.1.0.1.2.3.', arp: { tipo: 'triangle', oitava: 1, vol: .04, corte: 3000, solta: .15, envio: .4 },
        melodia: '3-5-8---6-5-3---6-8-6-4---3-4---3-5-6---5-3-2---2-5-7-5-2-------', canto: { tipo: 'sine', oitava: 1, vol: .06, vibrato: 6, envio: .4 },
        pad: { vol: .008, corte: 900, tipo: 'triangle' },
        bumbo: 'x.......x.......', caixa: '....x.......x...', chimbal: '..x...x...x...x.', bat: [.28, .1, .018]
      },
      furtividade: { // mesma luz, passos na ponta dos pés: pizzicato e acordes suspensos
        bpm: 94, tonica: 55, escala: MAIOR, acordes: [[0, 5, 7], [-3, 0, 4], [5, 9, 12], [7, 12, 14]],
        baixo: '1.......5.......', som: { tipo: 'triangle', corte: 700, vol: .14 },
        arpejo: '0.....2.....1...', arp: { tipo: 'triangle', oitava: 1, vol: .045, corte: 2400, solta: .05, envio: .5 },
        pad: { vol: .01, corte: 700, tipo: 'triangle' },
        bumbo: '................', caixa: '................', chimbal: 'x...x...x...x...', bat: [0, 0, .012]
      },
      batalha: {
        bpm: 146, tonica: 55, escala: MAIOR, acordes: [[0, 4, 7], [7, 11, 14], [-3, 0, 4], [5, 9, 12]],
        baixo: '1.8.1.8.5.8.5.8.', som: { tipo: 'square', corte: 900, vol: .09 },
        arpejo: '0123210301232103', arp: { tipo: 'square', oitava: 1, vol: .022, corte: 3200, envio: .3 },
        melodia: '8.8.7.8.5---3---7.7.5.7.9---7---6.6.5.6.8---6---6-5-4-3-2---5---', canto: { tipo: 'triangle', oitava: 1, vol: .07, envio: .3 },
        pad: { vol: .008, corte: 1000, tipo: 'triangle' },
        bumbo: 'x...x...x...x...', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.6, .22, .02]
      },
      chefao: { // Mi menor, o campo escurece
        bpm: 154, tonica: 52, escala: MENOR, acordes: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
        baixo: '1..1..1.1..1..8.', som: { tipo: 'sawtooth', corte: 750, vol: .12, desafina: 8 },
        arpejo: '0.3.2.3.1.3.2.3.', arp: { tipo: 'square', oitava: 1, vol: .022, corte: 2600, envio: .3 },
        melodia: '1-3-5-8-7-5-3---6-8-6-3-1---3---3-5-7-5-3---5---7-9-7-4-2---7---', canto: { tipo: 'square', oitava: 1, vol: .035, corte: 2800, envio: .3 },
        pad: { vol: .018, corte: 1200 },
        bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x.xx', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.8, .26, .026]
      }
    },
    floresta: { // grave e misteriosa: Ré dórico, marimba de madeira, flauta distante, baixo fundo
      exploracao: {
        bpm: 84, tonica: 50, escala: DORICA, acordes: [[0, 3, 7], [5, 9, 12], [0, 3, 7], [-2, 2, 5]],
        baixo: '1.......1...5...', som: { tipo: 'sine', corte: 0, vol: .2 },
        arpejo: '0..2..1..3..2...', arp: { tipo: 'sine', oitava: 1, vol: .06, corte: 0, solta: .25, envio: .55 },
        melodia: '8-------5---3-4-6-------4---2---5---3-----1-----7-------4---2---', canto: { tipo: 'sine', oitava: 1, vol: .035, vibrato: 9, ataque: .08, envio: .7 },
        pad: { vol: .016, corte: 520 },
        bumbo: 'x.......x.......', caixa: '................', chimbal: '......x.......x.', bat: [.28, 0, .012]
      },
      furtividade: { // bordão e batida de coração
        bpm: 72, tonica: 50, escala: HARMONICA, acordes: [[0, 3, 7], [-4, 0, 3], [0, 3, 7], [-5, -1, 2]],
        baixo: '1...............', som: { tipo: 'sine', corte: 0, vol: .2 },
        arpejo: '0.......2.......', arp: { tipo: 'sine', oitava: 0, vol: .05, corte: 0, solta: .4, envio: .6 },
        pad: { vol: .018, corte: 450 },
        bumbo: 'x..x............', caixa: '................', chimbal: '................', bat: [.34, 0, 0]
      },
      batalha: {
        bpm: 132, tonica: 50, escala: HARMONICA, acordes: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],
        baixo: '1.8.1.8.1.8.5.8.', som: { tipo: 'sawtooth', corte: 700, vol: .11 },
        arpejo: '0123210301232103', arp: { tipo: 'triangle', oitava: 1, vol: .04, corte: 0, solta: .08, envio: .3 },
        melodia: '8-7-5-3-5-7-8---6-8-6-3-1---3---4-6-8-6-4---6---5-7-9-7-5---7---', canto: { tipo: 'sine', oitava: 1, vol: .06, vibrato: 7, envio: .4 },
        pad: { vol: .012, corte: 700 },
        bumbo: 'x...x...x...x...', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.62, .2, .018]
      },
      chefao: {
        bpm: 144, tonica: 50, escala: HARMONICA, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [7, 11, 14]],
        baixo: '1..1..1.1..1..8.', som: { tipo: 'sawtooth', corte: 650, vol: .13, desafina: 10 },
        arpejo: '0.3.2.3.1.3.2.3.', arp: { tipo: 'triangle', oitava: 1, vol: .04, corte: 0, envio: .35 },
        melodia: '8---7---5---3---2---3---5---2---8---7---5---3---7---9---7---5---', canto: { tipo: 'sine', oitava: 1, vol: .06, vibrato: 8, envio: .5 },
        pad: { vol: .022, corte: 1000 },
        bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x.xx', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.8, .26, .026]
      }
    },
    praia: { // acordes suaves com sétima, piano elétrico, chocalho e ondas de ruído
      exploracao: {
        bpm: 86, tonica: 53, escala: MAIOR, acordes: [[0, 4, 7, 11], [4, 7, 11, 14], [5, 9, 12, 16], [7, 11, 14, 17]],
        baixo: '1.....5.....8...', som: { tipo: 'sine', corte: 0, vol: .18 },
        arpejo: '0...1...2...3...', arp: { tipo: 'sine', oitava: 1, vol: .05, corte: 0, solta: .5, envio: .6 },
        melodia: '7-----5-----3---9-----7-----5---8-----6-----4---9-----7-----5-4-', canto: { tipo: 'triangle', oitava: 1, vol: .05, ataque: .02, solta: .4, envio: .5 },
        pad: { vol: .016, corte: 1300, tipo: 'triangle' },
        bumbo: 'x.........x.....', caixa: '................', chimbal: '................', chocalho: '..x...x...x...x.', ondas: .05, bat: [.25, 0, 0, 0, .02]
      },
      furtividade: {
        bpm: 76, tonica: 53, escala: MAIOR, acordes: [[-3, 0, 4, 7], [5, 9, 12, 16], [2, 5, 9, 12], [4, 8, 11, 14]],
        baixo: '1...............', som: { tipo: 'sine', corte: 0, vol: .17 },
        arpejo: '0.......2.......', arp: { tipo: 'sine', oitava: 1, vol: .045, corte: 0, solta: .6, envio: .7 },
        pad: { vol: .018, corte: 900, tipo: 'triangle' },
        bumbo: '................', caixa: '................', chimbal: '................', chocalho: '......x.......x.', ondas: .06, bat: [0, 0, 0, 0, .014]
      },
      batalha: { // Fá mixolídio com "tambor de aço"
        bpm: 128, tonica: 53, escala: MIXO, acordes: [[0, 4, 7], [-2, 2, 5], [5, 9, 12], [0, 4, 7]],
        baixo: '1..1..5.1..1..8.', som: { tipo: 'triangle', corte: 0, vol: .17 },
        arpejo: '0.2.1.2.0.2.1.2.', arp: { tipo: 'sine', oitava: 1, vol: .045, corte: 0, solta: .1, envio: .3 },
        melodia: '8.8.5.3.5.8.5.3.7.7.4.2.4.7.4.2.6.6.4.8.6.4.8.6.5.3.1.3.5---8---', canto: { tipo: 'triangle', oitava: 1, vol: .06, solta: .12, envio: .35 },
        pad: { vol: .01, corte: 1200, tipo: 'triangle' },
        bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x...', chimbal: '................', chocalho: 'xxxxxxxxxxxxxxxx', bat: [.55, .18, 0, 0, .014]
      },
      chefao: { // a maré vira: Ré menor harmônica, ondas fortes
        bpm: 140, tonica: 50, escala: HARMONICA, acordes: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [7, 11, 14]],
        baixo: '1..1..1.1..1..8.', som: { tipo: 'sawtooth', corte: 700, vol: .12, desafina: 8 },
        arpejo: '0123210301232103', arp: { tipo: 'sine', oitava: 1, vol: .045, corte: 0, envio: .35 },
        melodia: '8---7---5---3---6---8---6---3---7---5---4---2---5---7---9---7---', canto: { tipo: 'triangle', oitava: 1, vol: .06, envio: .4 },
        pad: { vol: .02, corte: 1100 },
        bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x.xx', chimbal: 'x.x.x.x.x.x.x.x.', ondas: .07, bat: [.8, .26, .024]
      }
    },
    vulcao: { // percussão pesada e baixo em Dó menor
      exploracao: {
        bpm: 96, tonica: 48, escala: MENOR, acordes: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]],
        baixo: '1..1..1.1..1.5..', som: { tipo: 'sawtooth', corte: 480, vol: .14, desafina: 8 },
        arpejo: '0.......2.......', arp: { tipo: 'square', oitava: 1, vol: .02, corte: 1400, envio: .4 },
        pad: { vol: .014, corte: 520 },
        bumbo: 'x.......x..x....', caixa: '........x.......', chimbal: '................', tom: 'x.....x...x.....', bat: [.6, .14, 0, .5]
      },
      furtividade: { // coração batendo e chão que treme
        bpm: 84, tonica: 48, escala: MENOR, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [1, 5, 8]],
        baixo: '1...............', som: { tipo: 'sawtooth', corte: 320, vol: .15, desafina: 6 },
        arpejo: '................', arp: { tipo: 'square', oitava: 1, vol: 0, corte: 1000 },
        pad: { vol: .016, corte: 420 },
        bumbo: 'x.x.............', caixa: '................', chimbal: '................', tom: '........x.......', bat: [.5, 0, 0, .35]
      },
      batalha: {
        bpm: 140, tonica: 48, escala: HARMONICA, acordes: [[0, 3, 7], [-4, 0, 3], [-5, -1, 2], [0, 3, 7]],
        baixo: '1.1.8.1.1.1.8.1.', som: { tipo: 'sawtooth', corte: 650, vol: .12, desafina: 8 },
        arpejo: '0..1..2..1..0...', arp: { tipo: 'square', oitava: 1, vol: .022, corte: 2000, envio: .3 },
        melodia: '8...8...7.5.3...8...8...6.5.3...7...7...5.4.2...7...5...2...1...', canto: { tipo: 'sawtooth', oitava: 1, vol: .03, corte: 1800, envio: .3 },
        pad: { vol: .012, corte: 800 },
        bumbo: 'x...x...x...x...', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', tom: 'x.x.x...x.x.x...', bat: [.75, .22, .016, .45]
      },
      chefao: { // frígio, tambores em cima
        bpm: 158, tonica: 48, escala: MENOR, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]],
        baixo: '1..1..1.1..1..8.', som: { tipo: 'sawtooth', corte: 700, vol: .14, desafina: 12 },
        arpejo: '0.3.2.3.1.3.2.3.', arp: { tipo: 'sawtooth', oitava: 1, vol: .02, corte: 2200, envio: .35 },
        pad: { vol: .022, corte: 1200 },
        bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x.xx', chimbal: 'x.x.x.x.x.x.x.x.', tom: 'x.x.x.xxx.x.x.xx', bat: [.85, .26, .024, .5]
      }
    },
    castelo: { // arpejos tensos e órgão: Si menor harmônica e diminutos
      exploracao: {
        bpm: 100, tonica: 47, escala: HARMONICA, acordes: [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 6]],
        baixo: '1.......1.......', som: { tipo: 'square', corte: 380, vol: .1 },
        arpejo: '0123012301230123', arp: { tipo: 'square', oitava: 1, vol: .02, corte: 2200, envio: .4 },
        pad: { vol: .016, corte: 1500, tipo: 'square', desafina: 4 },
        bumbo: 'x.......x.......', caixa: '................', chimbal: '................', bat: [.3, 0, 0]
      },
      furtividade: { // relógio do castelo
        bpm: 84, tonica: 47, escala: HARMONICA, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-1, 2, 5]],
        baixo: '1...............', som: { tipo: 'square', corte: 300, vol: .1 },
        arpejo: '0.1.2.1.0.1.2.1.', arp: { tipo: 'triangle', oitava: 1, vol: .035, corte: 0, solta: .08, envio: .5 },
        pad: { vol: .014, corte: 900, tipo: 'square', desafina: 4 },
        bumbo: '................', caixa: '................', chimbal: 'x...x...x...x...', bat: [0, 0, .014]
      },
      batalha: {
        bpm: 138, tonica: 47, escala: HARMONICA, acordes: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],
        baixo: '1.8.1.8.1.8.5.8.', som: { tipo: 'square', corte: 600, vol: .09 },
        arpejo: '0123210301232103', arp: { tipo: 'square', oitava: 1, vol: .022, corte: 2800, envio: .3 },
        melodia: '8-7-8-5-3-5-1---6-8-6-3-1---3---4-6-8-6-4---6---5-7-9-7-5---7---', canto: { tipo: 'square', oitava: 1, vol: .03, corte: 2400, desafina: 5, envio: .4 },
        pad: { vol: .016, corte: 1600, tipo: 'square', desafina: 4 },
        bumbo: 'x...x...x...x...', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.6, .2, .018]
      },
      chefao: {
        bpm: 150, tonica: 47, escala: HARMONICA, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 6], [7, 11, 14]],
        baixo: '1..1..1.1..1..8.', som: { tipo: 'sawtooth', corte: 700, vol: .12, desafina: 10 },
        arpejo: '0123012301230123', arp: { tipo: 'square', oitava: 2, vol: .016, corte: 3000, envio: .35 },
        melodia: '8-------7-------6-------5-------8-------9-------7-------5-------', canto: { tipo: 'square', oitava: 1, vol: .03, corte: 2000, desafina: 6, envio: .5 },
        pad: { vol: .026, corte: 1800, tipo: 'square', desafina: 5 },
        bumbo: 'x..x..x.x..x..x.', caixa: '....x.......x.xx', chimbal: 'x.x.x.x.x.x.x.x.', bat: [.8, .26, .024]
      }
    }
  };
  for (const [b, vs] of Object.entries(BIOMAS_SOM)) for (const [v, F] of Object.entries(vs)) FAIXAS[`${b}:${v}`] = F;
  const VARIANTE = { masmorra: 'exploracao', furtividade: 'furtividade', batalha: 'batalha', chefao: 'chefao' };

  // sons ambientes baixos de cada bioma
  const AMBIENTES = {
    campo: { grilos: { freq: 4300, vol: .028, cada: [.35, 1.1] } },
    floresta: { vento: { freq: 360, vol: .045, varia: 150 }, grilos: { freq: 2900, vol: .018, cada: [.9, 2.4] } },
    praia: { ondas: { vol: .08, cada: [5, 8] } },
    vulcao: { fogo: { vol: .05, cada: [.05, .3] }, ronco: { vol: .05 } },
    castelo: { vento: { freq: 520, vol: .045, varia: 260 } }
  };

  // ---------- motor ----------
  function criar() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); // segura os picos: nada estoura na caixinha do celular
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
      mestre = ctx.createGain();
      mestre.gain.value = cfg.mudo ? 0 : 1;
      mestre.connect(comp);
      comp.connect(ctx.destination);
      busMusica = ctx.createGain();
      busSfx = ctx.createGain();
      busMusica.connect(mestre);
      busSfx.connect(mestre);
      eco = criarEco();
      eco.saida.connect(busMusica);
      ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      aplicarVolume();
      setInterval(agendar, 25);
      return true;
    } catch (e) { ctx = null; return false; }
  }

  // "reverb" leve: dois ecos com realimentação, um de cada lado, cada vez mais abafados
  function criarEco() {
    const entrada = ctx.createGain(), saida = ctx.createGain();
    saida.gain.value = .55;
    [[.23, -.5], [.37, .5]].forEach(([tempo, lado]) => {
      const atraso = ctx.createDelay(1), volta = ctx.createGain(), filtro = ctx.createBiquadFilter();
      atraso.delayTime.value = tempo;
      volta.gain.value = .38;
      filtro.type = 'lowpass';
      filtro.frequency.value = 2200;
      entrada.connect(atraso);
      atraso.connect(filtro);
      filtro.connect(volta);
      volta.connect(atraso);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (pan.pan) pan.pan.value = lado;
      filtro.connect(pan);
      pan.connect(saida);
    });
    return { entrada, saida };
  }

  const rampa = (p, v, s = .08) => { const t = ctx.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + s); };
  function aplicarVolume() {
    if (!ctx) return;
    rampa(busMusica.gain, cfg.vol);
    rampa(busSfx.gain, Math.min(1, cfg.vol * 1.45)); // efeitos um pouco acima da música
  }

  // uma nota: osciladores (2 levemente desafinados no pad), filtro e envelope sem estalos
  function voz(t, f, dur, o, saida) {
    const g = ctx.createGain(), solta = o.solta || .1, fim = t + dur + solta, ataque = Math.min(o.ataque || .005, dur);
    let alvo = g;
    if (o.corte) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.corte;
      fl.Q.value = o.q || .8;
      fl.connect(g);
      alvo = fl;
    }
    let lfo = null;
    if (o.vibrato) { // vibrato suave que entra depois do ataque
      lfo = ctx.createOscillator();
      const prof = ctx.createGain();
      lfo.frequency.value = 5.5;
      prof.gain.setValueAtTime(0, t);
      prof.gain.linearRampToValueAtTime(o.vibrato, t + Math.min(.25, dur));
      lfo.connect(prof);
      lfo.start(t);
      lfo.stop(fim + .02);
      lfo = prof;
    }
    for (const det of o.desafina ? [-o.desafina, o.desafina] : [0]) {
      const os = ctx.createOscillator();
      os.type = o.tipo || 'triangle';
      os.frequency.setValueAtTime(f, t);
      if (o.desliza) os.frequency.exponentialRampToValueAtTime(o.desliza, t + dur);
      os.detune.value = det;
      if (lfo) lfo.connect(os.detune);
      os.connect(alvo);
      os.start(t);
      os.stop(fim + .02);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol, t + ataque);
    g.gain.setValueAtTime(o.vol, t + dur);
    g.gain.exponentialRampToValueAtTime(.0001, fim);
    g.connect(saida.seco);
    if (o.envio && saida.molhado) {
      const e = ctx.createGain();
      e.gain.value = o.envio;
      g.connect(e);
      e.connect(saida.molhado);
    }
  }

  // ruído filtrado: chimbal, caixa, porta, golpe
  function chiado(t, dur, o, destino) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido;
    fl.type = o.tipo || 'highpass';
    fl.frequency.setValueAtTime(o.freq, t);
    if (o.ate) fl.frequency.exponentialRampToValueAtTime(o.ate, t + dur);
    fl.Q.value = o.q || .7;
    g.gain.setValueAtTime(o.vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(destino);
    s.start(t, Math.random() * .5);
    s.stop(t + dur + .02);
  }

  function bumbo(t, destino, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + .12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .004);
    g.gain.exponentialRampToValueAtTime(.0001, t + .28);
    o.connect(g);
    g.connect(destino);
    o.start(t);
    o.stop(t + .3);
    chiado(t, .02, { tipo: 'lowpass', freq: 3500, vol: vol * .2 }, destino); // o "toc" que se ouve no celular
  }

  function caixa(t, destino, vol) {
    chiado(t, .16, { tipo: 'bandpass', freq: 1800, q: .9, vol }, destino);
    voz(t, 190, .05, { tipo: 'triangle', vol: vol * .5, desliza: 120, solta: .05 }, { seco: destino });
  }

  // tambor grave (vulcão): seno que despenca e um toque de ruído
  function tambor(t, destino, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(58, t + .28);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t + .45);
    o.connect(g);
    g.connect(destino);
    o.start(t);
    o.stop(t + .5);
    chiado(t, .06, { tipo: 'lowpass', freq: 900, vol: vol * .25 }, destino);
  }

  // onda: ruído abafado que cresce e recua devagar (sem estalo: começa e termina em zero)
  function onda(t, dur, vol, destino) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido;
    s.loop = true;
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(380, t);
    fl.frequency.linearRampToValueAtTime(1300, t + dur * .4);
    fl.frequency.linearRampToValueAtTime(420, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * .4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(destino);
    s.start(t, Math.random() * .5);
    s.stop(t + dur + .05);
  }

  // ---------- sequenciador: agenda as notas um pouco à frente do relógio do áudio ----------
  function passo(tr, t) {
    const F = tr.F, k = tr.passo % 16, ac = F.acordes[Math.floor(tr.passo / 16) % F.acordes.length], d16 = 60 / F.bpm / 4;
    const saida = { seco: tr.seco, molhado: tr.molhado };
    if (k === 0 && F.pad) ac.forEach(n => voz(t, nota(F.tonica + n), d16 * 16, { tipo: F.pad.tipo || 'sawtooth', desafina: F.pad.desafina || 9, vol: F.pad.vol, corte: F.pad.corte, ataque: .4, solta: .7, envio: .6 }, saida));
    if (k === 0 && F.ondas) onda(t, d16 * 16, F.ondas, tr.seco);
    const b = F.baixo[k];
    if (b !== '.') {
      let n = 1;
      while (k + n < 16 && F.baixo[k + n] === '.') n++;
      const grau = b === '5' ? ac[2] : b === '8' ? ac[0] + 12 : ac[0];
      voz(t, nota(F.tonica - 12 + grau), d16 * n * .85, { ...F.som, ataque: .008, solta: .08 }, saida);
    }
    const a = F.arpejo[k];
    if (a !== '.') {
      const grau = +a < ac.length ? ac[+a] : ac[0] + 12; // além das notas do acorde: a oitava (3 nos acordes de 3 notas)
      voz(t, nota(F.tonica + 12 * F.arp.oitava + grau), d16 * .9, { tipo: F.arp.tipo, vol: F.arp.vol, corte: F.arp.corte, solta: F.arp.solta || .12, envio: F.arp.envio }, saida);
    }
    if (F.melodia) { // melodia do bioma: grau da escala, segura com '-'
      const L = F.melodia.length, i = tr.passo % L, m = F.melodia[i];
      if (m >= '1' && m <= '9') {
        let n = 1;
        while (n < 16 && F.melodia[(i + n) % L] === '-') n++;
        const g = +m - 1, semi = F.escala[g % 7] + 12 * Math.floor(g / 7), c = F.canto;
        voz(t, nota(F.tonica + 12 * (c.oitava || 1) + semi), d16 * n * .92, { tipo: c.tipo, vol: c.vol, corte: c.corte || 0, vibrato: c.vibrato, desafina: c.desafina, ataque: c.ataque || .01, solta: c.solta || .18, envio: c.envio }, saida);
      }
    }
    const [vb, vc, vh, vt = .5, vs = .015] = F.bat;
    if (F.tom && F.tom[k] === 'x') tambor(t, tr.seco, vt);
    if (F.chocalho && F.chocalho[k] === 'x') chiado(t, .05, { tipo: 'bandpass', freq: 6200, q: 1.4, vol: vs * (k % 4 === 2 ? 1.5 : 1) }, tr.seco);
    if (F.bumbo[k] === 'x') bumbo(t, tr.seco, vb);
    if (F.caixa[k] === 'x') caixa(t, tr.seco, vc);
    if (F.chimbal[k] === 'x') chiado(t, .045, { tipo: 'highpass', freq: 7500, vol: vh * (k % 4 === 2 ? 1.4 : 1) }, tr.seco);
  }

  function agendar() {
    if (!ctx || ctx.state !== 'running') return;
    const agora = ctx.currentTime, ate = agora + .15;
    if (amb) agendarAmbiente(agora);
    for (const tr of trilhas) {
      const d16 = 60 / tr.F.bpm / 4;
      while (tr.prox < ate && tr.prox < tr.fim) {
        if (tr.prox > agora - .05) passo(tr, Math.max(tr.prox, agora)); // atrasou demais? pula, sem rajada
        tr.prox += d16;
        tr.passo = (tr.passo + 1) % (16 * tr.F.acordes.length);
      }
    }
  }

  // troca de faixa: a antiga desce e a nova sobe em 0,6 s
  function trocar(nome) {
    const agora = ctx.currentTime;
    for (const tr of trilhas) {
      if (tr.fim !== Infinity) continue;
      tr.fim = agora + FADE;
      rampa(tr.seco.gain, 0, FADE);
      rampa(tr.molhado.gain, 0, FADE);
      setTimeout(() => { tr.seco.disconnect(); tr.molhado.disconnect(); trilhas = trilhas.filter(x => x !== tr); }, (FADE + 3) * 1000);
    }
    atual = nome;
    if (!nome) return;
    const tr = { F: FAIXAS[nome], seco: ctx.createGain(), molhado: ctx.createGain(), passo: 0, prox: agora + .06, fim: Infinity };
    tr.seco.connect(busMusica);
    tr.molhado.connect(eco.entrada);
    for (const g of [tr.seco.gain, tr.molhado.gain]) { g.setValueAtTime(0, agora); g.linearRampToValueAtTime(1, agora + FADE); }
    trilhas.push(tr);
  }

  const seguir = () => {
    if (!pronto() || ctx.state !== 'running') return;
    if (pedida !== atual) trocar(pedida);
    if ((amb ? amb.nome : null) !== ambPedido) trocarAmbiente(ambPedido);
  };

  // ---------- sons ambientes: fontes contínuas (vento, ronco) e eventos soltos (grilos, ondas, estalos) ----------
  const sorte = ([a, b]) => a + Math.random() * (b - a);
  function trocarAmbiente(nome) {
    const agora = ctx.currentTime;
    if (amb) { // o antigo some em 1,2 s
      const velho = amb;
      rampa(velho.saida.gain, 0, 1.2);
      velho.fontes.forEach(f => { try { f.stop(agora + 1.3); } catch (e) {} });
      setTimeout(() => velho.saida.disconnect(), 1600);
    }
    amb = null;
    const cfg = AMBIENTES[nome];
    if (!cfg) return;
    const saida = ctx.createGain();
    saida.gain.setValueAtTime(0, agora);
    saida.gain.linearRampToValueAtTime(1, agora + 1.2);
    saida.connect(busMusica);
    amb = { nome, cfg, saida, fontes: [], prox: { grilos: agora + .5, ondas: agora + .2, fogo: agora + .1 } };
    for (const tipo of ['vento', 'ronco']) {
      const o = cfg[tipo];
      if (!o) continue;
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = ruido;
      s.loop = true;
      fl.type = tipo === 'vento' ? 'bandpass' : 'lowpass';
      fl.frequency.value = tipo === 'vento' ? o.freq : 110;
      fl.Q.value = tipo === 'vento' ? 1.1 : .7;
      g.gain.value = o.vol;
      if (tipo === 'vento') { // rajadas lentas: o filtro passeia
        const lfo = ctx.createOscillator(), prof = ctx.createGain();
        lfo.frequency.value = .07 + Math.random() * .05;
        prof.gain.value = o.varia;
        lfo.connect(prof);
        prof.connect(fl.frequency);
        lfo.start(agora);
        amb.fontes.push(lfo);
      }
      s.connect(fl);
      fl.connect(g);
      g.connect(saida);
      s.start(agora, Math.random() * .5);
      amb.fontes.push(s);
    }
  }
  function agendarAmbiente(agora) {
    const A = amb, c = A.cfg, ate = agora + .2;
    if (c.grilos && A.prox.grilos < ate) {
      const t = Math.max(A.prox.grilos, agora), o = c.grilos, pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (pan.pan) pan.pan.value = Math.random() * 1.6 - .8;
      pan.connect(A.saida);
      for (let k = 0; k < 3; k++) voz(t + k * .065, o.freq * (1 + Math.random() * .04), .028, { tipo: 'sine', vol: o.vol, solta: .03 }, { seco: pan });
      setTimeout(() => pan.disconnect(), 1500);
      A.prox.grilos = t + sorte(o.cada);
    }
    if (c.ondas && A.prox.ondas < ate) {
      const t = Math.max(A.prox.ondas, agora), d = sorte(c.ondas.cada);
      onda(t, d, c.ondas.vol, A.saida);
      A.prox.ondas = t + d * .7;
    }
    if (c.fogo && A.prox.fogo < ate) {
      const t = Math.max(A.prox.fogo, agora);
      chiado(t, .012 + Math.random() * .02, { tipo: 'bandpass', freq: 1400 + Math.random() * 2600, q: 2, vol: c.fogo.vol * (.4 + Math.random()) }, A.saida);
      A.prox.fogo = t + sorte(c.fogo.cada);
    }
  }

  // primeiro toque: cria o áudio e começa a faixa pedida (o navegador só deixa tocar depois de um gesto)
  function liberar() {
    if (cfg.mudo || document.hidden || !criar()) return;
    if (ctx.state === 'running') seguir();
    else Promise.resolve(ctx.resume()).then(seguir, () => {});
  }
  ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'].forEach(ev => addEventListener(ev, liberar, { capture: true, passive: true }));

  // aba oculta: pausa tudo; ao voltar, continua de onde parou
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (!cfg.mudo) Promise.resolve(ctx.resume()).then(seguir, () => {});
  });

  // ---------- efeitos curtos ----------
  const S = () => ({ seco: busSfx, molhado: eco.entrada });
  const EFEITOS = {
    clique: t => voz(t, 1250, .025, { tipo: 'triangle', vol: .16, desliza: 880, solta: .04 }, S()),
    acerto: t => {
      voz(t, nota(79), .07, { tipo: 'square', vol: .05, corte: 4000, solta: .04 }, S());
      voz(t + .07, nota(86), .14, { tipo: 'square', vol: .05, corte: 4000, solta: .22, envio: .35 }, S());
      voz(t + .07, nota(91), .14, { tipo: 'sine', vol: .07, solta: .3 }, S());
    },
    erro: t => {
      voz(t, 196, .2, { tipo: 'sawtooth', vol: .1, corte: 1000, desliza: 92, desafina: 12, solta: .06 }, S());
      chiado(t, .08, { tipo: 'lowpass', freq: 1200, vol: .12 }, busSfx);
    },
    golpe: t => {
      bumbo(t, busSfx, .9);
      chiado(t, .14, { tipo: 'bandpass', freq: 2400, ate: 400, q: 1, vol: .45 }, busSfx);
    },
    moeda: t => {
      voz(t, nota(83), .055, { tipo: 'square', vol: .05, corte: 6000, solta: .02 }, S());
      voz(t + .055, nota(88), .2, { tipo: 'square', vol: .05, corte: 6000, solta: .18, envio: .25 }, S());
    },
    porta: t => {
      chiado(t, .38, { tipo: 'bandpass', freq: 260, ate: 1400, q: 3, vol: .5 }, busSfx);
      voz(t, 98, .3, { tipo: 'triangle', vol: .12, desliza: 70, solta: .1 }, S());
    },
    vitoria: t => { // arpejo menor que resolve em maior
      [69, 72, 76].forEach((n, i) => voz(t + i * .09, nota(n), .09, { tipo: 'square', vol: .045, corte: 4000, solta: .06 }, S()));
      [69, 73, 76, 81].forEach(n => voz(t + .27, nota(n), .45, { tipo: 'triangle', vol: .07, ataque: .01, solta: .5, envio: .45 }, S()));
    },
    derrota: t => [64, 63, 60, 57].forEach((n, i) => voz(t + i * .17, nota(n), i === 3 ? .5 : .15, { tipo: 'sawtooth', vol: .06, corte: 1100, desafina: 8, solta: i === 3 ? .6 : .08, envio: .3 }, S())),
    espreita: t => [45, 51].forEach((n, i) => voz(t + i * .08, nota(n), .3, { tipo: 'sine', vol: .05, ataque: .12, solta: .3 }, S())), // aviso baixo, sem susto
    bau: t => [72, 76, 79, 84, 88].forEach((n, i) => voz(t + i * .045, nota(n), .07, { tipo: 'triangle', vol: .09, solta: .25, envio: .45 }, S())),
    chefe: t => {
      bumbo(t, busSfx, 1);
      [43, 44].forEach(n => voz(t, nota(n), .8, { tipo: 'sawtooth', vol: .09, corte: 520, desafina: 15, ataque: .04, solta: .5 }, S()));
      chiado(t, .7, { tipo: 'lowpass', freq: 900, ate: 150, vol: .3 }, busSfx);
    }
  };

  // ---------- API ----------
  // dentro da masmorra, masmorra/furtividade/batalha/chefão viram a versão do bioma
  function musica(nome) {
    const doBioma = bioma && VARIANTE[nome] && `${bioma}:${VARIANTE[nome]}`;
    const chave = doBioma && FAIXAS[doBioma] ? doBioma : FAIXAS[nome] ? nome : nome === 'furtividade' ? 'masmorra' : null;
    if (!chave) return;
    pedida = chave;
    seguir();
  }
  function definirBioma(nome) { bioma = BIOMAS_SOM[nome] ? nome : null; }
  function ambiente(nome) {
    ambPedido = AMBIENTES[nome] ? nome : null;
    if (ctx && pronto() && ctx.state === 'running') seguir();
  }
  function sfx(nome) {
    if (!pronto() || !EFEITOS[nome]) return;
    try { EFEITOS[nome](ctx.currentTime + .005); } catch (e) {}
  }
  function mudo(sim) {
    cfg.mudo = !!sim;
    guardar();
    pintarBotao();
    if (cfg.mudo) {
      if (!ctx) return;
      rampa(mestre.gain, 0);
      setTimeout(() => { if (cfg.mudo) ctx.suspend(); }, 120);
    } else {
      liberar();
      if (ctx) rampa(mestre.gain, 1);
    }
  }
  function volume(v) {
    cfg.vol = Math.max(0, Math.min(1, Number(v) || 0));
    guardar();
    aplicarVolume();
    pintarBotao();
  }

  // ---------- botão do canto: 🔊 ligado → 🔉 baixo → 🔇 mudo ----------
  const ICONE = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/>${n === 0 ? '<path d="M16 9.5l5 5M21 9.5l-5 5"/>' : '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>' + (n > 1 ? '<path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '')}</svg>`;
  function botao() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'som-bt';
    pintarBotao = () => {
      const n = cfg.mudo ? 0 : cfg.vol < .25 ? 1 : 2;
      b.innerHTML = ICONE(n);
      b.setAttribute('aria-label', ['Som desligado', 'Som baixo', 'Som ligado'][n]);
      b.classList.toggle('mudo', n === 0);
    };
    b.onclick = () => {
      if (cfg.mudo) { volume(VOL_PADRAO); mudo(false); }
      else if (cfg.vol >= .25) volume(VOL_BAIXO);
      else mudo(true);
      sfx('clique');
    };
    pintarBotao();
    document.body.appendChild(b);
  }
  if (document.body) botao();
  else document.addEventListener('DOMContentLoaded', botao);

  return { musica, sfx, mudo, volume, bioma: definirBioma, ambiente, info: () => ({ estado: ctx ? ctx.state : 'sem áudio', tocando: atual, pedida, bioma, ambiente: amb ? amb.nome : null, ambPedido, mudo: cfg.mudo, volume: cfg.vol, faixas: trilhas.length }) };
})();
