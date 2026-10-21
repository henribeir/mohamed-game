/**
 * Mohamed — recebe relatórios e placar do app (doPost), grava numa Planilha Google privada
 * e responde o ranking da turma (doGet ?turma=…) com o top 10 de XP por apelido.
 *
 * Publicar em 5 passos:
 * 1. Crie uma Planilha Google (ela continua privada, só sua).
 * 2. Na planilha: Extensões › Apps Script. Apague tudo, cole este código e salve.
 * 3. Implantar › Nova implantação › App da Web. Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 4. Autorize com sua conta e copie a URL que termina em /exec.
 * 5. Cole a URL em URL_RELATORIO, no topo de relatorio.js.
 *
 * A planilha não fica pública: o link só grava linhas e devolve apelido, XP e dia do ranking.
 * Mudou o código? Implantar › Gerenciar implantações › Editar › Nova versão.
 */

const ABA = 'Relatórios';
const COLUNAS = [
  'Recebido (servidor)', 'Tipo', 'Nome', 'Apelido', 'Turma', 'Data/hora (aparelho)', 'Tempo ativo', 'Segundos',
  'Dia', 'Lição', 'Acertos', 'Erros', 'XP', '3 mais erradas', 'Monstros derrotados', 'Dano causado', 'Acertos e erros por tema', 'ID'
];
const ABA_RANK = 'Ranking';
const COLUNAS_RANK = ['Turma', 'Apelido', 'XP', 'Dia', 'Atualizado (servidor)'];

function doPost(e) {
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.tipo === 'placar') {
      salvarPlacar_(d);
      return resposta_('ok');
    }
    const aba = pegarAba_(ABA, COLUNAS);
    // o app pode reenviar a fila: ignora o mesmo ID
    if (d.id && aba.getRange(1, COLUNAS.length, aba.getLastRow(), 1)
      .createTextFinder(String(d.id)).matchEntireCell(true).findNext()) {
      return resposta_('repetido');
    }
    aba.appendRow([
      new Date(), // horário do servidor
      d.tipo || 'relatorio', d.nome, d.apelido, d.turma, d.dataHora, d.tempoAtivo, d.segundos,
      d.dia, d.licao, d.acertos, d.erros, d.xp, d.maisErradas, d.monstros, d.dano, d.porTema, d.id
    ].map(limpar_));
    if (d.apelido) salvarPlacar_(d);
    return resposta_('ok');
  } catch (err) {
    return resposta_('erro: ' + err.message);
  } finally {
    trava.releaseLock();
  }
}

// ?turma=7A → { top: [{ apelido, xp, dia }] } · sem turma: mostra se o script está no ar
function doGet(e) {
  const turma = norm_(e && e.parameter && e.parameter.turma);
  if (!turma) return resposta_('Mohamed: relatório no ar ✔');
  const top = pegarAba_(ABA_RANK, COLUNAS_RANK).getDataRange().getValues().slice(1)
    .filter(l => norm_(l[0]) === turma)
    .sort((a, b) => (Number(b[2]) || 0) - (Number(a[2]) || 0))
    .slice(0, 10)
    .map(l => ({ apelido: String(l[1]), xp: Number(l[2]) || 0, dia: Number(l[3]) || 1 }));
  return ContentService.createTextOutput(JSON.stringify({ top })).setMimeType(ContentService.MimeType.JSON);
}

// uma linha por turma + apelido; guarda o maior XP e o maior dia
function salvarPlacar_(d) {
  const turma = String(d.turma || '').trim(), apelido = String(d.apelido || '').trim().slice(0, 12);
  if (!turma || !apelido) return;
  const aba = pegarAba_(ABA_RANK, COLUNAS_RANK), dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (norm_(dados[i][0]) === norm_(turma) && norm_(dados[i][1]) === norm_(apelido)) {
      aba.getRange(i + 1, 3, 1, 3).setValues([[
        Math.max(Number(dados[i][2]) || 0, Number(d.xp) || 0),
        Math.max(Number(dados[i][3]) || 0, Number(d.dia) || 0),
        new Date()
      ]]);
      return;
    }
  }
  aba.appendRow([limpar_(turma), limpar_(apelido), Number(d.xp) || 0, Number(d.dia) || 1, new Date()]);
}

function pegarAba_(nome, colunas) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(nome) || planilha.insertSheet(nome);
  if (aba.getLastRow() === 0) {
    aba.appendRow(colunas);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, colunas.length).setFontWeight('bold');
  }
  // colunas novas numa planilha antiga: atualiza o cabeçalho
  const cab = aba.getRange(1, 1, 1, colunas.length);
  if (cab.getValues()[0].join('|') !== colunas.join('|')) cab.setValues([colunas]).setFontWeight('bold');
  return aba;
}

function norm_(v) {
  return String(v === undefined || v === null ? '' : v).trim().toLowerCase();
}

// impede que um texto enviado vire fórmula na planilha
function limpar_(v) {
  if (v === undefined || v === null) return '';
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}

function resposta_(txt) {
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.TEXT);
}
