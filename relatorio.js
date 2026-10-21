// Mohamed — relatorio.js: tempo ativo, relatório ao professor, placar e ranking da turma

// ⚙️ Cole aqui a URL do App da Web do Google Apps Script (termina em /exec)
const URL_RELATORIO = 'https://script.google.com/macros/s/COLE_AQUI_O_ID/exec';
const MINUTOS_MINIMOS = 15; // tempo ativo para liberar o envio
const PAUSA_INATIVO = 30;   // segundos sem tocar → o cronômetro pausa

const Relatorio = (() => {
  const CHAVE_R = 'mohamed.relatorio.v1';
  const novo = () => ({ segundos: 0, acertos: 0, erros: 0, erradas: {}, monstros: 0, dano: 0, temas: {}, dia: null, licao: '', fila: [], ranking: [], rankingEm: 0 });
  let R = ler(), ultimo = 0, enviando = false; // só conta depois do 1º toque

  function ler() {
    try { return { ...novo(), ...JSON.parse(localStorage.getItem(CHAVE_R) || '{}') }; }
    catch (e) { return novo(); }
  }
  function gravar() { try { localStorage.setItem(CHAVE_R, JSON.stringify(R)); } catch (e) {} }

  const id = x => document.getElementById(x);
  const dois = n => String(n).padStart(2, '0');
  const relogio = s => (s >= 3600 ? `${Math.floor(s / 3600)}:` : '') + `${dois(Math.floor(s / 60) % 60)}:${dois(s % 60)}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ativo = () => !document.hidden && Date.now() - ultimo < PAUSA_INATIVO * 1000;
  const top3 = () => Object.entries(R.erradas).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const falta = () => Math.max(0, MINUTOS_MINIMOS * 60 - R.segundos);
  // acertos e erros por tema da masmorra: "Natural 5✔ 1✘ · Negativo 3✔ 2✘"
  const porTema = () => Object.entries(R.temas).map(([t, v]) => `${t} ${v.a}✔ ${v.e}✘`).join(' · ');
  const novoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // fetch com limite de tempo: uma rede travada não prende a fila
  const comTempo = (url, op = {}, ms = 15000) => {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    return fetch(url, { ...op, signal: c.signal }).finally(() => clearTimeout(t));
  };

  // conta 1 segundo só com o app visível e o aluno interagindo
  function tique() {
    if (ativo()) { R.segundos++; gravar(); }
    pintar();
  }

  // tempo no topo das telas (elementos com a classe .tempo)
  function pintar() {
    const on = ativo();
    document.querySelectorAll('.tempo').forEach(t => {
      t.textContent = `${on ? '⏱' : '⏸'} ${relogio(R.segundos)}`;
      t.classList.toggle('pausado', !on);
    });
    if (id('t-relatorio').classList.contains('ativa')) pintarTela();
  }

  function pintarTela() {
    const f = falta();
    id('rel-tempo').textContent = relogio(R.segundos);
    id('rel-estado').textContent = ativo() ? '⏱ Tempo ativo' : '⏸ Pausado';
    id('rel-barra').style.width = Math.min(100, (R.segundos / (MINUTOS_MINIMOS * 60)) * 100) + '%';
    id('rel-fila').hidden = !R.fila.length;
    id('rel-fila').textContent = `📮 ${R.fila.length}`;
    const bt = id('bt-enviar'), txt = f > 0 ? `🔒 Finalizar e enviar relatório<small>⏳ faltam ${relogio(f)}</small>` : '📤 Finalizar e enviar relatório';
    bt.disabled = f > 0;
    if (bt.dataset.txt !== txt) { bt.dataset.txt = txt; bt.innerHTML = txt; }
  }

  // tela do relatório (chamada por irPara em app.js)
  function tela() {
    id('rel-licao').textContent = R.dia ? `📍 Dia ${R.dia} · ${R.licao}` : '📍 Comece uma lição';
    id('rel-stats').innerHTML = `<div class="stat">👾 ${R.monstros}<small>monstros</small></div><div class="stat">💥 ${R.dano}<small>dano</small></div>` +
      `<div class="stat">✅ ${R.acertos}<small>acertos</small></div>` +
      `<div class="stat">❌ ${R.erros}<small>erros</small></div><div class="stat">⚡ ${estado.xp}<small>XP</small></div>`;
    const t = top3();
    id('rel-erradas').innerHTML = t.length
      ? '<p class="secao">🎯 Mais erradas</p>' + t.map(([c, n]) => `<p class="errada"><span>${esc(c)}</span><b>${n}×</b></p>`).join('')
      : '';
    pintarTela();
  }

  // acertos, erros e as contas mais erradas
  function registrar(certo, conta, tema) {
    if (tema) {
      const t = (R.temas[tema] = R.temas[tema] || { a: 0, e: 0 });
      if (certo) t.a++;
      else t.e++;
    }
    if (certo) R.acertos++;
    else {
      R.erros++;
      const c = String(conta).slice(0, 60);
      R.erradas[c] = (R.erradas[c] || 0) + 1;
    }
    gravar();
  }

  function licao(dia, titulo) {
    R.dia = dia;
    R.licao = titulo;
    gravar();
  }

  // relatório da sessão (tipo: 'relatorio' ou 'final')
  function montarRelatorio(tipo) {
    return {
      tipo, id: novoId(),
      nome: estado.nome, apelido: estado.apelido, turma: estado.turma,
      dataHora: new Date().toLocaleString('pt-BR'),
      tempoAtivo: relogio(R.segundos), segundos: R.segundos,
      dia: R.dia || '', licao: R.licao || '',
      acertos: R.acertos, erros: R.erros, xp: estado.xp,
      maisErradas: top3().map(([c, n]) => `${c} (${n}×)`).join(' | '),
      monstros: R.monstros, dano: R.dano, porTema: porTema()
    };
  }
  const zerar = () => { Object.assign(R, { segundos: 0, acertos: 0, erros: 0, erradas: {}, monstros: 0, dano: 0, temas: {} }); gravar(); };
  // masmorra: dano causado e monstros derrotados
  const golpe = dano => { R.dano += dano; gravar(); };
  const monstro = () => { R.monstros++; gravar(); };
  const MSG = { ok: '✅ Enviado ao professor', offline: '📶 Sem internet: envio depois', config: '⚙️ Falta a URL no relatorio.js', fila: '📮 Na fila, enviando…' };

  // botão "Finalizar e enviar": põe na fila, zera a sessão e tenta enviar
  function enviar() {
    if (falta() > 0) return;
    R.fila.push(montarRelatorio('relatorio'));
    zerar();
    dispatchEvent(new CustomEvent('mohamed:relatorio')); // a vila ganha +1 nível de produção hoje e chove nas plantas
    som('vitoria');
    confete();
    const s = document.createElement('div');
    s.className = 'sobre';
    s.innerHTML = '<div class="caixa"><div class="trofeu">📤</div><h2 class="titulo">Relatório pronto!</h2><p class="sub" id="rel-msg">Enviando…</p><button class="btn" id="bt-rel-ok">Ok ▶</button></div>';
    document.body.appendChild(s);
    s.querySelector('#bt-rel-ok').onclick = () => { som('clique'); s.remove(); irPara('t-mapa'); };
    enviarFila().then(r => { const m = s.querySelector('#rel-msg'); if (m) m.textContent = MSG[r]; });
  }

  // prova final concluída: envia sozinho, sem esperar os 15 minutos
  function enviarFinal() {
    R.fila.push(montarRelatorio('final'));
    zerar();
    enviarFila().then(r => toast(r === 'ok' ? '📤 Relatório final enviado' : MSG[r]));
  }

  // placar do ranking: só o último fica na fila
  function placar() {
    if (!estado.apelido) return;
    R.fila = R.fila.filter(f => f.tipo !== 'placar');
    R.fila.push({ tipo: 'placar', id: novoId(), apelido: estado.apelido, turma: estado.turma, xp: estado.xp, dia: Math.min(estado.diaAtual, 20) });
    gravar();
    enviarFila();
  }

  // ranking da turma: GET no Apps Script (no máximo a cada 1 min)
  async function atualizarRanking(depois) {
    if (URL_RELATORIO.includes('COLE_AQUI') || !navigator.onLine || !estado.turma || Date.now() - R.rankingEm < 60000) return;
    R.rankingEm = Date.now();
    try {
      const resp = await comTempo(`${URL_RELATORIO}?turma=${encodeURIComponent(estado.turma)}`);
      const dados = await resp.json();
      R.ranking = (dados.top || []).slice(0, 10).map(p => ({
        apelido: String(p.apelido || '?').slice(0, 12), xp: Math.max(0, Math.round(+p.xp) || 0), dia: Math.min(20, Math.max(1, Math.round(+p.dia) || 1))
      }));
      gravar();
      if (depois) depois();
    } catch (e) { /* sem rede: fica o ranking guardado */ }
  }

  // envia a fila em ordem; sem internet, guarda e tenta de novo depois
  async function enviarFila() {
    if (!R.fila.length) return 'ok';
    if (URL_RELATORIO.includes('COLE_AQUI')) return 'config';
    if (enviando) return 'fila';
    if (!navigator.onLine) return 'offline';
    enviando = true;
    try {
      while (R.fila.length) {
        // text/plain + no-cors: pedido simples, sem bloqueio de CORS (o script ignora repetidos pelo id)
        await comTempo(URL_RELATORIO, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(R.fila[0]) });
        R.fila.shift();
        gravar();
      }
    } catch (e) { /* sem rede: fica na fila */ }
    enviando = false;
    pintar();
    return R.fila.length ? 'offline' : 'ok';
  }

  function iniciar() {
    const marcar = () => { ultimo = Date.now(); };
    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => addEventListener(ev, marcar, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) enviarFila(); pintar(); });
    addEventListener('online', enviarFila);
    id('bt-enviar').onclick = enviar;
    setInterval(tique, 1000);
    setInterval(enviarFila, 60000);
    enviarFila();
    pintar();
  }

  return { iniciar, registrar, golpe, monstro, licao, tela, enviarFinal, placar, atualizarRanking, ranking: () => R.ranking };
})();
