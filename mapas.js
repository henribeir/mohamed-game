/* Mohamed — mapas.js: tipos de mapa, receitas dos 20 dias e a legenda dos mapas em texto.
   Os mapas em grade ficam em mapas1.js, mapas2.js, mapas3.js... (4 por arquivo).

   LEGENDA (uma letra por casa; todas as linhas de um mapa com o mesmo tamanho)
   #  parede                 .  chão                   ~  água (no vulcão é lava): não passa
   =  ponte                  M  mato alto: passa e esconde o herói dos monstros
   S  espinhos: não passa    o  moeda                  B  baú com desafio     G  baú dourado (tesouro)
   P  porta trancada com desafio                       T  tocha na parede     F  braseiro no chão
   R  fogueira de descanso (cura 1 coração, uma vez)   N  mercador
   @  início                 X  saída: abre quando o objetivo do mapa é cumprido
   m  monstro                E  emboscador (escondido)  Z  monstro dormindo
   H  mini-chefe             C  chefão
   Peças de puzzle (dentro da área do puzzle, veja puzzles.js):
   K bloco ou saco · _ placa · D porta do puzzle · L alavanca · Q cristal · Y totem · k chave · [ ] pratos · * pedra

   CADA MAPA: { nome, tipo, mapa: [...linhas], perigos?: [...] (perigos.js), puzzles?: [...] (puzzles.js),
                monstros?: { 'c:l': 'corredor' } (jeito ou nome do monstro), fuga?: { tipo: 'auto', dir: 'cima' } }
   TAMANHO: de 1,5 a 3 telas (a tela mostra 11 casas de largura e uns 16 de altura); no máximo 40 × 30.
   Tochas, braseiros e fogueiras salvam o ponto de volta quando o herói chega perto. */

const MAPAS = {};

// ---------- tipos de mapa ----------
// objetivo: 'monstros' (derrotar todos) · 'chegar' (a saída já está aberta) · 'puzzle' (resolver todos)
//           'minichefe' (vencer o mini-chefe) · 'chefe' (vencer o chefão termina o dia)
const TIPOS_MAPA = {
  combate: { icone: '⚔️', nome: 'Combate', objetivo: 'monstros', dica: 'Derrote os monstros' },
  furtividade: { icone: '🌿', nome: 'Furtividade', objetivo: 'chegar', dica: 'Passe sem ser visto', bonus: 3 },
  armadilhas: { icone: '⚠️', nome: 'Armadilhas', objetivo: 'chegar', dica: 'Observe o ritmo' },
  puzzle: { icone: '🧩', nome: 'Puzzle', objetivo: 'puzzle', dica: 'Resolva para abrir' },
  fuga: { icone: '🏃', nome: 'Fuga', objetivo: 'chegar', dica: 'Corra até a saída' },
  descanso: { icone: '🔥', nome: 'Descanso', objetivo: 'chegar', dica: 'A fogueira cura' },
  mercador: { icone: '🛒', nome: 'Mercador', objetivo: 'chegar', dica: 'Troque suas moedas' },
  tesouro: { icone: '💎', nome: 'Tesouro', objetivo: 'chegar', dica: 'Abra os baús' },
  minichefe: { icone: '😈', nome: 'Mini-chefe', objetivo: 'minichefe', dica: 'Vença o mini-chefe' },
  chefao: { icone: '👑', nome: 'Chefão', objetivo: 'chefe', dica: 'Desvie e encoste no chefão' }
};

// ---------- receitas dos 20 dias (fácil de editar) ----------
// tipo:mapa em ordem, separados por ">"; de 3 a 5 mapas, sempre terminando no chefão.
// Se o mapa ainda não existir (chega nos próximos arquivos), entra outro mapa do mesmo tipo.
//  dia  receita                                                                              bioma
const RECEITAS = {
  1: 'combate:clareira > puzzle:sabedoria > armadilhas:trilha > chefao:fortaleza', //          campo
  2: 'furtividade:toca > mercador:bazar > combate:ilhas > chefao:cripta', //                     campo
  3: 'armadilhas:corredeira > descanso:acampamento > puzzle:galeria > minichefe:arena > chefao:fortaleza', // campo
  4: 'furtividade:juncal > combate:clareira > chefao:cripta', //                                 floresta
  5: 'combate:ilhas > armadilhas:trilha > mercador:tenda > chefao:fortaleza', //                 floresta
  6: 'puzzle:sabedoria > fuga:escape > descanso:gruta > minichefe:covil > chefao:cripta', //     floresta
  7: 'tesouro:cofre > furtividade:toca > combate:clareira > chefao:fortaleza', //                floresta
  8: 'armadilhas:corredeira > puzzle:galeria > mercador:bazar > chefao:cripta', //               floresta
  9: 'combate:ilhas > tesouro:naufragio > chefao:fortaleza', //                                  praia
  10: 'puzzle:sabedoria > furtividade:juncal > descanso:acampamento > chefao:cripta', //         praia
  11: 'fuga:desmoronamento > combate:clareira > mercador:tenda > minichefe:arena > chefao:fortaleza', // praia
  12: 'armadilhas:trilha > puzzle:galeria > chefao:cripta', //                                   praia
  13: 'furtividade:toca > tesouro:cofre > combate:ilhas > chefao:fortaleza', //                  praia
  14: 'puzzle:sabedoria > armadilhas:corredeira > descanso:gruta > minichefe:covil > chefao:cripta', // praia
  15: 'combate:clareira > fuga:escape > mercador:bazar > chefao:fortaleza', //                   vulcão
  16: 'armadilhas:trilha > puzzle:galeria > descanso:acampamento > chefao:cripta', //            vulcão
  17: 'furtividade:juncal > combate:ilhas > tesouro:naufragio > minichefe:arena > chefao:fortaleza', // vulcão
  18: 'puzzle:sabedoria > fuga:desmoronamento > mercador:tenda > chefao:cripta', //              castelo
  19: 'combate:clareira > armadilhas:corredeira > descanso:gruta > minichefe:covil > chefao:fortaleza', // castelo
  20: 'tesouro:cofre > puzzle:galeria > fuga:escape > chefao:cripta' //                          castelo
};

// receita do dia → [{ tipo, id }], trocando o mapa que ainda não existe por outro do mesmo tipo
function receitaDoDia(n) {
  const texto = RECEITAS[n] || RECEITAS[1];
  return texto.split('>').map(p => p.trim()).filter(Boolean).map(p => {
    const [tipo, pedido] = p.split(':').map(s => s.trim());
    if (MAPAS[pedido]) return { tipo, id: pedido };
    const mesmos = Object.keys(MAPAS).filter(id => MAPAS[id].tipo === tipo);
    return { tipo, id: mesmos[n % Math.max(1, mesmos.length)] || Object.keys(MAPAS)[0] };
  });
}
