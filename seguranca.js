/* Mohamed — seguranca.js: carrega antes de tudo.
   · guarda os últimos 20 erros (window.onerror e promessas rejeitadas) e os últimos 40 passos no localStorage
   · Seguranca.recuperar(onde, erro): em vez de tela preta, mostra "Algo deu errado. Toque para voltar ao mapa"
   · Seguranca.diagnostico(): texto para o aluno copiar e mandar ao professor (botão em Ajustes)
   · aviso de versão nova quando o service worker novo assume ("Nova versão disponível, tocar para atualizar") */
const VERSAO_APP = 'mohamed-v19'; // igual à VERSAO do service-worker.js

const Seguranca = (() => {
  const CHAVE_E = 'mohamed.erros', CHAVE_P = 'mohamed.passos', MAX_E = 20, MAX_P = 40;
  const ler = k => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const hora = () => new Date().toLocaleTimeString('pt-BR', { hour12: false });
  const telaAtual = () => { const t = document.querySelector('.tela.ativa'); return t ? t.id : '?'; };
  let passos = ler(CHAVE_P), emRecuperacao = false, aoRestaurar = null, ultimoErro = '';

  // ---------- erros e passos ----------
  function erro(msg, onde = '', pilha = '') {
    const txt = String(msg && msg.message ? msg.message : msg).slice(0, 300);
    if (txt + onde === ultimoErro) return; // o mesmo erro em todo quadro conta uma vez
    ultimoErro = txt + onde;
    const lista = ler(CHAVE_E);
    lista.push({ quando: new Date().toISOString(), versao: VERSAO_APP, tela: telaAtual(), onde: String(onde).slice(0, 120), msg: txt, pilha: String(pilha || '').split('\n').slice(0, 4).map(s => s.trim()).join(' | ').slice(0, 600) });
    gravar(CHAVE_E, lista.slice(-MAX_E));
  }
  function passo(txt) {
    passos.push(`${hora()} ${txt}`);
    if (passos.length > MAX_P) passos = passos.slice(-MAX_P);
    gravar(CHAVE_P, passos);
  }
  window.onerror = (msg, arquivo, linha, coluna, e) => {
    erro(msg, `${String(arquivo || '').split('/').pop()}:${linha}:${coluna}`, e && e.stack);
    return false;
  };
  addEventListener('unhandledrejection', e => { const r = e.reason; erro('Promessa: ' + (r && r.message ? r.message : r), '', r && r.stack); });
  // arquivo que não carregou (script ou estilo): sem ele o jogo quebra no meio
  addEventListener('error', e => { const t = e.target; if (t && t !== window && (t.src || t.href)) erro('Não carregou: ' + String(t.src || t.href).split('/').pop(), 'carregar'); }, true);

  // ---------- tela de recuperação ----------
  function recuperar(onde, e) {
    erro(e || 'falha', onde, e && e.stack);
    passo(`⚠️ recuperação: ${onde}`);
    if (emRecuperacao) return;
    emRecuperacao = true;
    const s = document.createElement('div');
    s.className = 'recupera';
    s.setAttribute('role', 'alertdialog');
    s.innerHTML = '<div class="caixa"><div class="trofeu">😵</div><h2 class="titulo">Algo deu errado.</h2><p class="sub">Toque para voltar ao mapa.<br>Seu progresso está salvo.</p></div>';
    const voltar = () => {
      s.onclick = null;
      try {
        if (aoRestaurar) aoRestaurar();
        s.remove();
        emRecuperacao = false;
      } catch (e2) { // nem a volta ao mapa funcionou: recarrega o app (o progresso está no localStorage)
        erro(e2, 'restaurar', e2 && e2.stack);
        location.reload();
      }
    };
    s.onclick = voltar;
    (document.body || document.documentElement).appendChild(s);
  }
  // roda fn protegida: se falhar, mostra a recuperação em vez de deixar a tela travada
  function proteger(onde, fn) {
    return function (...args) {
      try { return fn.apply(this, args); } catch (e) { recuperar(onde, e); return undefined; }
    };
  }

  // ---------- diagnóstico para copiar ----------
  function diagnostico() {
    const est = (() => { try { return JSON.parse(localStorage.getItem('mohamed.v1') || '{}'); } catch (e) { return { corrompido: true }; } })();
    const n = navigator, tela = `${screen.width}×${screen.height} · janela ${innerWidth}×${innerHeight} · dpr ${devicePixelRatio || 1}`;
    const erros = ler(CHAVE_E).map(x => `- ${x.quando} [${x.versao}] ${x.tela} ${x.onde}: ${x.msg}${x.pilha ? `\n    ${x.pilha}` : ''}`);
    return [
      'Mohamed · diagnóstico',
      `Versão: ${VERSAO_APP} · service worker: ${n.serviceWorker && n.serviceWorker.controller ? 'ativo' : 'não'}`,
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      `Aparelho: ${n.userAgent}`,
      `Tela: ${tela} · idioma ${n.language} · ${n.onLine ? 'online' : 'offline'}${n.deviceMemory ? ` · memória ${n.deviceMemory} GB` : ''} · toque ${n.maxTouchPoints || 0}`,
      `Aluno: ${est.apelido || '?'} · turma ${est.turma || '?'} · dia ${est.diaAtual || '?'} · concluídos ${(est.diasConcluidos || []).length}${est.corrompido ? ' · SAVE CORROMPIDO' : ''}`,
      `Tela atual: ${telaAtual()}`,
      '',
      `Últimos erros (${erros.length}):`, ...(erros.length ? erros : ['- nenhum']),
      '',
      `Passos recentes (${passos.length}):`, ...passos.map(p => `- ${p}`)
    ].join('\n');
  }
  // copia para a área de transferência; sem permissão, mostra o texto selecionado para copiar à mão
  async function copiarDiagnostico() {
    const txt = diagnostico();
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(txt); return true; } } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    if (ok) return true;
    const s = document.createElement('div');
    s.className = 'sobre';
    s.innerHTML = '<div class="caixa diag"><h2 class="titulo">📋 Diagnóstico</h2><p class="sub">Copie o texto abaixo e mande ao professor.</p><textarea readonly></textarea><button class="btn">Ok ▶</button></div>';
    s.querySelector('textarea').value = txt;
    s.querySelector('.btn').onclick = () => s.remove();
    document.body.appendChild(s);
    s.querySelector('textarea').select();
    return false;
  }

  // ---------- versão nova ----------
  function avisoVersao() {
    if (document.querySelector('.aviso-versao')) return;
    const b = document.createElement('button');
    b.className = 'aviso-versao';
    b.textContent = '✨ Nova versão disponível, tocar para atualizar';
    b.onclick = () => { b.disabled = true; location.reload(); };
    document.body.appendChild(b);
  }
  if ('serviceWorker' in navigator) {
    const tinha = !!navigator.serviceWorker.controller; // na primeira instalação não há o que avisar
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinha) avisoVersao(); });
    addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').then(reg => {
        // app aberto por muito tempo (celular na escola): procura versão nova ao voltar para o app
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      }).catch(() => {}); // aberto direto do arquivo (file://) não tem service worker: o jogo funciona igual
    });
  }

  return {
    erro, passo, recuperar, proteger, diagnostico, copiarDiagnostico, avisoVersao,
    emErro: () => emRecuperacao,
    aoRestaurar: fn => { aoRestaurar = fn; },
    erros: () => ler(CHAVE_E)
  };
})();
