/* Mohamed — sprites_jogo.js: liga os sprites desenhados por código ao jogo, sem mexer em regras nem em dados salvos.
   · Masmorra: SpritesJogo.monstroMapa(ctx, m, x, y, tam, { estado, dir, bioma })
   · Batalha:  SpritesJogo.batalha.abrir(el, mon) · evento('ferido' | 'ataque' | 'ataqueForte' | 'morrendo') · fase(n) · carga(k) · fechar()
   · Aliados:  SpritesJogo.aliado(ctx, nome, x, y, tam, { falando, feliz, trabalhando, ent }) · SpritesJogo.retrato(el, nome, info)
   · Reações:  SpritesJogo.evento(nome, 'feliz' | 'erro' | ...)
   O id sai da arte do monstro (cada bioma tem os seus 3 monstros, o mini-chefe e o chefão).
   Toda função devolve false se o sprite não existir: aí o desenho antigo continua. */
const SpritesJogo = (() => {
  // arte do monstro (monstros.js) → id do sprite
  const DA_ARTE = {
    brotao: 'folhito', saltito: 'zerinho', moitinha: 'espantoso',
    musguento: 'olhudo', cogumago: 'sombrinha', tronculho: 'tronquelo',
    aguaviva: 'medusinha', pincudo: 'caranguejoVezes', ourico: 'polvinhoOito',
    rochedo: 'magmito', brasinha: 'fagulhao', magmao: 'meioAMeio',
    armadura: 'armadurao', fantasminha: 'fantasmaErros', gargula: 'grimorio',
    espantalho: 'girassolFurioso', coruja: 'corujaTrevas', polvo: 'rainhaMare', salamandra: 'capitaoBrasa', cavaleiro: 'cavaleiroEclipse',
    raizao: 'grandeContador', anciaBosque: 'senhorAbismo', mare: 'krakenMultiplicador', vulcao: 'dragaoPartido', reiEsquecido: 'apagador'
  };
  const MONSTROS = {
    campo: ['folhito', 'zerinho', 'espantoso'], floresta: ['olhudo', 'sombrinha', 'tronquelo'], praia: ['medusinha', 'caranguejoVezes', 'polvinhoOito'],
    vulcao: ['magmito', 'fagulhao', 'meioAMeio'], castelo: ['armadurao', 'fantasmaErros', 'grimorio']
  };
  const MINI = { campo: 'girassolFurioso', floresta: 'corujaTrevas', praia: 'rainhaMare', vulcao: 'capitaoBrasa', castelo: 'cavaleiroEclipse' };
  const CHEFE = { campo: 'grandeContador', floresta: 'senhorAbismo', praia: 'krakenMultiplicador', vulcao: 'dragaoPartido', castelo: 'apagador' };
  const ALIADOS = { troco: 'seuTroco', mercador: 'seuTroco', anciao: 'anciao', cartas: 'anciao', broto: 'seuBroto', jardim: 'seuBroto', construtor: 'construtor', fagulha: 'fagulha', vagalume: 'fagulha', atrapalhado: 'ze', ze: 'ze' };
  const ALIAS = { atacando: ['ataque1'], ataque1: ['atacando'], ataque2: ['atacando', 'ataque1'], feliz: ['vitoria'], errando: ['ferido'], martelando: ['falando'] };
  const TEMPO = { ferido: .45, ataque: .9, morte: 1, fase: .6, feliz: 1.6, erro: 1.4, andar: .25 };
  const vis = new WeakMap(), nomes = {};
  const agora = () => performance.now() / 1000;
  const lim = v => Math.max(0, Math.min(1, v));
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const def = id => (id && window.Sprites && (typeof Sprites.def === 'function' ? Sprites.def(id) : Sprites.lista && Sprites.lista[id])) || null;

  function v(e) {
    const k = e && typeof e === 'object' ? e : nomes[norm(e)] || (nomes[norm(e)] = {});
    let s = vis.get(k);
    if (!s) vis.set(k, s = { x: null, y: null, dir: 'baixo', anda: -9, ataque: -9, feliz: -9, erro: -9 });
    return s;
  }
  function movimento(s, x, y, t) {
    if (x == null || y == null) return false;
    if (s.x != null) {
      const dx = x - s.x, dy = y - s.y;
      if (Math.abs(dx) + Math.abs(dy) > .001) { s.anda = t; s.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esquerda' : 'lado') : (dy < 0 ? 'cima' : 'baixo'); }
    }
    s.x = x; s.y = y;
    return t - s.anda < TEMPO.andar;
  }
  // primeiro estado que o sprite conhece: o pedido, um parecido ou idle
  function valido(id, est) {
    const lista = (def(id) || {}).estados;
    for (const e of [est, ...(ALIAS[est] || []), 'idle']) if (!lista || lista.includes(e)) return e;
    return 'idle';
  }
  function qualBioma(b) { const n = norm(b); return Object.keys(MINI).find(k => n.includes(k)) || 'campo'; }
  function idDoMonstro(m, bioma) {
    if (!m) return null;
    const arte = (m.def && m.def.arte) || (typeof m.img === 'string' ? m.img.replace('👑', '') : '');
    if (DA_ARTE[arte]) return DA_ARTE[arte];
    const b = qualBioma(bioma);
    if (m.chefe) return CHEFE[b];
    if (m.mini) return MINI[b];
    const l = MONSTROS[b];
    return l[[...norm(m.nome)].reduce((a, c) => a + c.charCodeAt(0), 0) % l.length];
  }
  function idAliado(nome) { if (def(nome)) return nome; const n = norm(nome); for (const k in ALIADOS) if (n.includes(k)) return ALIADOS[k]; return null; }

  // ---------- masmorra ----------
  function monstroMapa(ctx, m, x, y, tam, info = {}) {
    const id = idDoMonstro(m, info.bioma), d = def(id);
    if (!d) return false;
    const s = v(m), t = agora(), anda = movimento(s, m.x, m.y, t);
    const est = info.estado || (t - s.ataque < TEMPO.ataque ? 'atacando' : m.estado === 'dormindo' ? 'dormindo' : anda ? 'andando' : 'idle');
    if (d.escala) tam /= d.escala; // no mapa o tamanho do mini-chefe e do chefão já vem do jogo
    return Sprites.desenhar(ctx, id, x, y, tam, { estado: valido(id, est), vista: 'mapa', dir: info.dir || s.dir, t, fase: 1 });
  }

  // ---------- batalha: um canvas dentro da caixa do monstro ----------
  let leve = false;
  const B = { ativo: false, el: null, cv: null, g: null, id: null, raf: 0, ult: 0, quadro: 0, media: 1 / 60, ferido: -9, ataque: -9, forte: false, trocou: -9, morte: null, fase: 1, carga: 0 };
  const batalha = {
    abrir(el, mon) {
      batalha.fechar();
      const id = idDoMonstro(mon), d = def(id);
      if (!el || !d) return false;
      el.innerHTML = '';
      el.classList.add('sprite');
      el.classList.toggle('mini', !!d.minichefe);
      el.classList.toggle('chefao', !!d.chefao);
      const cv = document.createElement('canvas');
      el.appendChild(cv);
      Object.assign(B, { ativo: true, el, cv, g: cv.getContext('2d'), id, quadro: agora(), media: 1 / 60, ferido: -9, ataque: -9, forte: false, trocou: -9, morte: null, fase: 1, carga: 0 });
      B.raf = requestAnimationFrame(quadro);
      return true;
    },
    evento(nome) {
      if (!B.ativo) return false;
      const t = agora();
      if (nome === 'ferido') B.ferido = t;
      else if (nome === 'ataque' || nome === 'ataqueForte') { B.ataque = t; B.forte = nome === 'ataqueForte'; B.carga = 0; }
      else if (nome === 'morrendo' && B.morte == null) B.morte = t;
      return true;
    },
    fase(n) { if (B.ativo && n > B.fase) { B.fase = n; B.trocou = agora(); } },
    carga(k) { B.carga = lim(+k || 0); },
    fechar() {
      cancelAnimationFrame(B.raf);
      if (B.el) B.el.classList.remove('sprite', 'mini', 'chefao');
      if (B.cv) B.cv.remove();
      Object.assign(B, { ativo: false, el: null, cv: null, g: null, id: null });
    }
  };
  function quadro() {
    if (!B.ativo) return;
    B.raf = requestAnimationFrame(quadro);
    const el = B.el, cw = el.clientWidth, ch = el.clientHeight, t = agora();
    B.media = B.media * .92 + Math.min(.2, t - B.quadro) * .08; // celular lento (quadros longos): resolução menor dali em diante
    B.quadro = t;
    if (B.media > .045) leve = true;
    if (cw < 2 || ch < 2 || t - B.ult < .03) return; // até ~30 quadros por segundo: leve para celulares simples
    B.ult = t;
    const W = cw * 1.5, H = ch * 1.5, dpr = leve ? Math.min(1, 520 / Math.max(W, H)) : Math.min(window.devicePixelRatio || 1, 1.5, 820 / Math.max(W, H)); // o canvas sobra 25% em volta para os golpes
    if (B.cv.width !== Math.round(W * dpr) || B.cv.height !== Math.round(H * dpr)) { B.cv.width = Math.round(W * dpr); B.cv.height = Math.round(H * dpr); }
    const g = B.g, d = def(B.id);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    let est = 'idle', prog;
    if (B.morte != null) { est = 'morrendo'; prog = lim((t - B.morte) / TEMPO.morte); }
    else if (t - B.ferido < TEMPO.ferido || t - B.trocou < TEMPO.fase) est = 'ferido';
    else if (t - B.ataque < TEMPO.ataque) est = B.forte ? 'ataque2' : 'ataque1';
    else if (B.carga >= .5) { est = 'carregando'; prog = (B.carga - .5) / .5; }
    const alt = Math.min(ch * .96, cw * .96 * d.h / d.w) / (d.escala || 1);
    Sprites.desenhar(g, B.id, W / 2, ch * 1.25, alt, { estado: valido(B.id, est), vista: 'batalha', t, prog, fase: B.fase });
  }

  // ---------- aliados ----------
  function aliado(ctx, nome, x, y, tam, info = {}) {
    const id = idAliado(nome);
    if (!def(id)) return false;
    const s = v(id), t = agora(), anda = info.ent ? movimento(s, info.ent.x, info.ent.y, t) : false;
    const est = info.estado || (t - s.erro < TEMPO.erro ? 'errando' : (info.feliz || t - s.feliz < TEMPO.feliz) ? 'feliz' : info.trabalhando ? 'martelando' : info.falando ? 'falando' : 'idle');
    return Sprites.desenhar(ctx, id, x, y, tam, { estado: valido(id, est), vista: anda || info.lado ? 'lado' : 'frente', espelho: info.espelho != null ? !!info.espelho : anda && s.dir === 'esquerda', t });
  }
  // reações: 'feliz', 'erro', 'ataque'
  function evento(e, nome) {
    const s = v(e), t = agora(), n = norm(nome);
    if (n === 'feliz' || n === 'vitoria') s.feliz = t;
    else if (n === 'erro' || n === 'errou') s.erro = t;
    else if (n === 'ataque') s.ataque = t;
  }
  // telas em HTML (mercador, loja, desafios): canvas pequeno que se anima sozinho e para quando sai da tela
  function retrato(el, nome, info = {}) {
    if (!el || !def(idAliado(nome))) return null;
    let cv = el.querySelector(`canvas[data-sprite="${nome}"]`);
    if (cv) { cv._info = info; return cv; }
    const w = info.w || 72, h = info.h || 72, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv = document.createElement('canvas');
    cv.dataset.sprite = nome;
    cv.className = 'retrato-sprite';
    cv._info = info;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    if (info.antes) el.prepend(cv); else el.appendChild(cv);
    const g = cv.getContext('2d');
    const passo = () => {
      if (!cv.isConnected) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const d = def(idAliado(nome)), alt = Math.min(h * .9, w * .92 * d.h / d.w);
      aliado(g, nome, w / 2, h * .96, alt, cv._info);
      requestAnimationFrame(passo);
    };
    passo();
    return cv;
  }

  return { idDoMonstro, monstroMapa, batalha, aliado, evento, retrato };
})();
