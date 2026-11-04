# Auditoria do Mohamed (versão 334f879, antes das correções)

Números de linha referem-se à versão auditada. Nada foi alterado durante a auditoria.

## (a) Causas prováveis da tela preta na batalha (da mais para a menos provável)

### 1. Erro de JavaScript dentro do quadro da masmorra mata o loop, e se for na troca de mapa a tela fica presa no escuro
`jogo.js:984-992`: o próximo quadro só é agendado **depois** de `atualizar()` e `desenhar()`:
```js
function quadro(ms) { … atualizar(dt); desenhar(ms / 1000); raf = requestAnimationFrame(quadro); }
```
Não há try/catch. Qualquer exceção em `atualizar` (que chama `moverMonstros → batalha → app.js/batalhar`) ou em `desenhar` para o jogo para sempre.
O pior momento é a transição (depois de **perder uma batalha** ou ao **passar de mapa**): `montar()` roda no pico do escurecimento.
- `jogo.js:957`: `M.transicao = { … trocar: () => { montar(M.mapa.i); … } }`.
- `jogo.js:999`: `if (tr.t >= .14 && !tr.trocou) { tr.trocou = true; tr.trocar(); }`.
- `jogo.js:1135`: `a = tr.t < .14 ? tr.t / .14 : …`, de modo que na hora do `trocar()` a tela está ~100% `rgba(5,6,12)`.

Se `montar` lançar um erro nesse instante, o último quadro desenhado é quase preto e nada mais acontece: **tela preta sem saída**.

### 2. Erro ao abrir a batalha ou ao sortear a pergunta: painel escuro aberto, sem pergunta e sem botões
- `jogo.js:935`: `M.pausa = true` antes de chamar `M.op.aoBatalha`.
- `jogo.js:1559`: `b.hidden = false` é a **primeira** coisa de `Batalha.abrir`. Daí em diante, qualquer erro deixa o painel escuro (`.batalha{background:var(--fundo)}`) visível e vazio.
- `app.js:576-598` (`batalhar`) monta `B`, chama `efeitos() → cargas()`, e esta faz `estado.cartas.forEach(…)` e `RUN.extras`/`RUN.usados`. Um campo nulo no save derruba a abertura.
- `app.js:597` + `635-651`: a primeira pergunta vem num `setTimeout`. Se `B.gerar()` ou `Batalha.perguntar()` falhar, o erro some no timer e a batalha fica com o monstro e **nenhum botão**.
- `app.js:845` (`guardarErro`): `copia.pergunta.replace(…)` dentro de `levarGolpe`. Um item de revisão sem `pergunta` trava a batalha no primeiro erro, porque `B.travado` já é `true`.
- A tela de batalha **não tem botão de sair**: não há como voltar sem recarregar o app.

### 3. Versões misturadas pelo service worker
`service-worker.js:27-36` responde do cache e baixa **cada arquivo** em segundo plano para o mesmo cache. Se a rede cair no meio, ficam juntos `app.js` novo com `jogo.js` antigo (ou o contrário). O primeiro uso de uma função que não existe na outra versão dá `ReferenceError`, que cai nos casos 1 ou 2.
`service-worker.js:11`: `c.addAll(ARQUIVOS)` pode pegar arquivos velhos do cache HTTP do navegador.

### 4. Save corrompido no localStorage
`app.js:50-53`:
```js
try { return { ...novoEstado(), ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch (e) { return novoEstado(); }
```
- JSON inválido: começa do zero **e o próximo `salvar()` apaga o progresso antigo**, sem cópia.
- JSON válido com campo nulo (`"cartas": null`, `"revisao": null`): passa e quebra a batalha (caso 2).

### 5. Laço infinito nos geradores (página congela)
- `conteudo.js:36-40`, `vizinhos()`: `while (s.size < qtd + 1) { … if (v >= 0) s.add(v); }` não tem limite. Com um certo pequeno e um raio pequeno não existem valores distintos suficientes e o `while` nunca termina.
- `conteudo.js:28`, `distintos()`: mesmo padrão.

Não aconteceu nos 260 mil sorteios da sonda (todos os modelos usam faixas seguras hoje), mas não há proteção. No celular, um congelamento aparece como tela preta ou branca.

### 6. Pausa presa
`M.pausa = true` em `jogo.js:935` (batalha), `:659` (desafio) e `:703` (mercador). Ele só volta a `false` dentro do callback. Se a batalha, o desafio ou o mercador fecharem por erro ou por navegação, o herói e os monstros ficam parados.

### 7. Canvas com tamanho zero
- `jogo.js:430-441` (`ajustar`) só roda em `abrir()` e no `resize` da janela, sem `ResizeObserver`.
- `index.html:190`: `#t-masmorra{height:100dvh}` não tem alternativa para navegadores sem `dvh` (Chrome < 108, iOS < 15.4), e o palco pode medir 0.
- `index.html:203`: `.batalha{inset:0}` não tem alternativa para navegadores sem `inset`. O painel pode abrir fora da tela, com a masmorra pausada atrás.

### 8. Loops e timers
- **Verificado sem problema:** `abrir()` cancela o rAF anterior (`jogo.js:334`, `vila.js:245`); `relogioB` é limpo (`app.js:595`, `740`).
- **Risco:** o `setTimeout(proximaBatalha, …)` (`app.js:597`) e o `setTimeout(perguntarBatalha, 700)` (`app.js:629`) não conferem **qual** batalha os agendou. Se uma batalha termina e outra começa rápido, a nova recebe uma pergunta a mais.
- **Consumo:** os retratos do Ancião e do Zé no desafio (`sprites_jogo.js:152-175`) só param quando o canvas sai do DOM. O painel do desafio é **escondido**, não removido, e eles seguem desenhando a 60 qps em segundo plano.
- **Mesmo padrão da masmorra:** `vila.js:507-514`, que também morre num erro.

### 9. Áudio bloqueado
Não derruba nada. O contexto só é criado depois de um gesto (`audio.js:560-565`), está protegido por try/catch (`audio.js:247-267`, `629`) e `resume()` tem `.then(…, () => {})`.

### 10. Listeners repetidos
Não há acúmulo. Batalha, mercador e desafio usam `onclick` (que substitui o anterior), e `ligarControles` roda uma vez só (`jogo.js:317`, `vila.js:234`).

## (b) Como as perguntas são geradas hoje e por que repetem
- **Origem:** `app.js:524-541` (`geradorDoMonstro`) sorteia **com reposição** (`sortear`) um modelo do dia ou do tema e converte com `paraBatalha` (`app.js:501-520`).
- **Memória curta:** a única proteção é `vistas` (um `Set` de textos) **dentro da mesma batalha** (`app.js:527`, `537`). Ela zera a cada batalha, a cada fase do chefão (`app.js:626`) e quando o mutante troca de tema (`app.js:720`). Não há memória entre batalhas, mapas ou dias.
- **Perguntas sem números:** `vf('0 é um número natural?')`, `escolha('Menor número natural?', …)` e `vf('Todo natural é par ou ímpar?')` (`conteudo.js:251`, `252`, `311`) são sempre iguais. Modelos com faixas pequenas (`rnd(1, 9)`) repetem muito.
- **Peso dobrado:** `conteudo.js:1213` coloca o mesmo modelo duas vezes (`push(modelo, modelo)`).
- **Revisão de erros:** a cada pergunta há 20% de chance (`app.js:530`) de voltar **a mesma conta, com os mesmos números** (`errosParaRevisar`, `app.js:853-862`), inclusive na pergunta seguinte ao erro.
- **Plano B:** depois de 60 tentativas sem sucesso (por exemplo, a fase 3 do chefão num tema sem perguntas do tipo pedido) vem sempre `2 + 2 = ?` (`app.js:539`). Com `t > 50`, o filtro já aceita repetidas (`app.js:537`).

## (c) Geradores que podem ter mais de uma resposta correta
A causa principal está em `paraBatalha` (`app.js:510-517`). Toda pergunta de **escolha** com resposta numérica é completada até 4 opções com `n ± 1`, `n ± 2`, `n ± 10`, `−n` e `2n`. Isso vale também para perguntas de **seleção**, em que a resposta é a opção que cumpre uma regra, e não o resultado de uma conta.

Sonda com 300 sorteios por modelo (872 modelos):

| Pergunta (dia) | Sorteios ambíguos | Exemplo real |
|---|---|---|
| Qual é natural? / Toque no natural (1, 19) | 300 de 300 | `4,5 \| 4/9 \| 96 \| 98`, gabarito 96 |
| Qual é o maior? (2, 5, 19) | 176 a 350 por 300* | `359 \| 890 \| 891 \| 71`, gabarito 890 |
| Qual é o menor? / Quem abre a ordem crescente? (5, 19) | 160 a 287 | `741 \| 877 \| 336 \| 338`, gabarito 338 |
| Mais à direita: a ou b? (2, 19) | 284 | `8 \| 10 \| 1 \| 20`, gabarito 10 |
| Qual é par? / Natural e par? (1, 19) | 204 a 230 | `40 \| 80 \| 79 \| 27`, gabarito 40 |
| Qual é ímpar? / Natural e ímpar? (1, 19) | 163 a 174 | `16 \| 20 \| 3 \| 1`, gabarito 3 |
| Qual andar é mais baixo? (4, 19) | 195 a 202 | `15 \| 3 \| 6 \| 5`, gabarito 5 |
| Quem está pior? / Quem está mais fundo? (4, 19) | 151 a 161 | `0 \| −15 \| 19 \| −25`, gabarito −15 |

\* O dia 19 junta vários modelos do mesmo texto.

Outras ambiguidades:
- `naoNaturais()` (`conteudo.js:43-48`) evita textos iguais, mas não valores iguais. Podem aparecer `2/5` e `0,4`, ou `3/6` e `4/8`, como distratores equivalentes.
- Nenhuma pergunta sem gabarito (`certa = −1`) nem com opções de texto duplicadas apareceu na sonda.

## (d) Outros riscos
- **Toque duplo:** `responderBatalha` tem trava (`B.travado`, `app.js:654`) e os botões são desativados.
  - **Furo:** responder **antes de o texto terminar de aparecer** dá o bônus de rapidez. Com `B.t0 = Infinity`, `seg` vale `-Infinity` e `rapido = seg <= 5` dá verdadeiro (`app.js:641`, `670`).
- **Botões depois do fim:** dica e poder conferem `B.travado` (`app.js:756`, `769`), o que está certo. Os timers da batalha anterior não conferem qual batalha os criou (item a.8).
- **Vidas negativas:** não acontece (`Math.max(0, …)` em `app.js:700` e `jogo.js:615`).
- **Joystick que gruda:** `jogo.js:523-560` e `vila.js:340-362` tratam `pointerup`/`pointercancel`, mas não `lostpointercapture`, nem a perda de foco da janela (`blur`), nem o app indo para segundo plano. As setas do teclado ficam presas em `teclas` depois de um alt-tab, e o joystick fica preso quando a tela muda com o dedo encostado.
- **Botão voltar do Android:** não há `history`/`popstate`. O voltar fecha o app (PWA) ou sai do site, inclusive no meio de uma batalha.
- **Cronômetro de tempo ativo:** `relatorio.js:36-39` conta 1 s sempre que o aluno tocou nos últimos 30 s. Numa tela travada, os toques tentando sair contam como estudo. Na batalha, o bônus e a carga param corretamente nas telas de erro (`app.js:605`, `657`).
- **Fila do relatório:** o servidor ignora ids repetidos (`apps-script.gs:37`).
  - **Bug:** `placar()` substitui a lista (`R.fila = R.fila.filter(…)`, `relatorio.js:143`) enquanto `enviarFila` está no meio de um envio. Depois do `await`, `R.fila.shift()` (`relatorio.js:175`) remove **outro item**. Isso pode apagar um relatório que ainda não foi enviado.
- **Cache do service worker:** versões misturadas (a.3). Não há aviso de versão nova, e a página continua com o JS antigo até ser recarregada.
- **Desempenho e memória em sessões longas:**
  - Os retratos escondidos continuam desenhando (a.8).
  - `tique()` grava o relatório no localStorage a cada segundo.
  - `estado.revisao` guarda até 60 exercícios **com o SVG da dica** e é serializado a cada `salvar()`.
  - O resto é limpo: textos, partículas, canvases de cada mapa e o loop do sprite da batalha.
- **ℕ com zero:** o conteúdo é coerente (`conteudo.js:251`, `323`, `387`, `583`, `619`). Não há perguntas com "positivo" no lugar de "natural".

## Tabela

| Problema | Causa | Gravidade | Como corrigir |
|---|---|---|---|
| Tela preta depois de perder a batalha ou ao trocar de mapa | Erro no quadro mata o loop, que fica parado no fade escuro (`jogo.js:984`, `999`, `1135`) | Alta | try/catch no quadro (o loop continua) e tela de recuperação |
| Batalha aberta sem pergunta e sem saída | Erro ao abrir ou ao sortear, sem proteção (`app.js:576-651`, `jogo.js:1559`) | Alta | try/catch no início, na pergunta e na resposta; tela "Algo deu errado. Toque para voltar ao mapa" |
| Duas respostas certas, ou gabarito errado | Opções de seleção completadas com n±1… (`app.js:510-517`) | Alta | Não completar perguntas de seleção; validador que recalcula e regenera |
| Perguntas repetidas | Memória só dentro da batalha; modelos fixos; revisão com os mesmos números (`app.js:527`, `530`, `853`) | Alta | Chave normalizada, histórico de 40, saco por dia, reforço com espaçamento e números novos |
| Versões misturadas | Cache por arquivo em segundo plano (`service-worker.js:27`) | Média | Cache atômico por VERSAO, `cache:'reload'` na instalação, aviso de versão nova |
| Progresso apagado ou batalha quebrada por save ruim | `carregar()` sem cópia nem validação (`app.js:50`) | Média | Guardar cópia do save ruim, validar e reparar os campos |
| Relatório perdido na fila | `filter` + `shift` concorrentes (`relatorio.js:143`, `175`) | Média | Remover o item enviado pelo id |
| Joystick ou teclas presos | Sem `blur`/`lostpointercapture`/`visibilitychange` (`jogo.js:523`) | Média | Soltar tudo nesses eventos |
| Voltar do Android fecha o app | Sem `history` (`app.js:163`) | Média | `pushState` nas telas internas e `popstate` que volta ao mapa |
| Página congela | `while` sem limite (`conteudo.js:28`, `36`) | Baixa | Limite de tentativas |
| Pausa presa | `M.pausa` só sai pelo callback (`jogo.js:935`) | Baixa | A tela de recuperação fecha painéis e reabre a masmorra limpa |
| Pergunta a mais na batalha seguinte | Timers sem id da batalha (`app.js:597`, `629`) | Baixa | Conferir o id da batalha nos timers |
| Bônus de rapidez antes de a pergunta aparecer | `seg = -Infinity` conta como rápido (`app.js:670`) | Baixa | Exigir `seg >= 0` |
| Consumo em segundo plano | Retratos escondidos desenhando (`sprites_jogo.js:168`) | Baixa | Pausar o retrato quando estiver invisível |
| Tempo ativo contado com o app travado | `tique()` não sabe da tela de erro (`relatorio.js:36`) | Baixa | Pausar o tempo enquanto a recuperação estiver na tela |
| Layout quebrado em navegador antigo | `100dvh`/`inset` sem alternativa (`index.html:190`, `203`) | Baixa | `100vh` e `top/right/bottom/left` antes |

## Correções aplicadas (versão mohamed-v19)

- **Tela preta:**
  - Quadro da masmorra e da vila com try/catch.
  - Início da batalha, pergunta, resposta e callbacks protegidos por `Seguranca.proteger`.
  - Tela "Algo deu errado. Toque para voltar ao mapa" (`seguranca.js`), que fecha batalha e painéis, salva e volta ao mapa.
  - Os timers da batalha conferem o id da batalha.
  - A camada preta do chefão nasce invisível (`opacity:0`).
  - Sprite com erro volta para a arte antiga.
- **Erros e diagnóstico:**
  - `window.onerror`, `unhandledrejection` e falha ao carregar arquivo guardam os últimos 20 erros em `mohamed.erros`.
  - Os últimos 40 passos ficam em `mohamed.passos`.
  - Botão "Copiar diagnóstico" em Ajustes.
- **Save:**
  - `carregar()` guarda uma cópia do JSON ruim (`mohamed.v1.corrompido.<data>`).
  - `reparar()` devolve ao padrão os campos de tipo errado.
- **Toque duplo e fim da batalha:**
  - As respostas travam no primeiro toque.
  - `B.acabou` bloqueia prêmio repetido, dica, poder e resposta.
  - Dica e poder ficam desligados na vitória ou na derrota.
  - O bônus de rapidez exige que a pergunta já tenha aparecido.
- **Limpeza ao sair das telas:**
  - `sairDaTela` para a masmorra, a batalha, os painéis e a vila.
  - Os retratos dos aliados param quando ficam escondidos.
  - O joystick e as teclas soltam em `blur`, `visibilitychange` e `lostpointercapture`.
  - `ResizeObserver` cuida do canvas (masmorra e vila).
- **Voltar do Android:** uma entrada "armadilha" no histórico.
  - Na batalha: avisa e fica.
  - Com uma janela aberta: fecha a janela.
  - Numa tela interna: volta ao mapa.
  - No mapa: sai do app.
- **Service worker:**
  - Cache atômico por VERSAO, com `cache:'reload'` na instalação.
  - Aviso "Nova versão disponível, tocar para atualizar".
  - `reg.update()` ao voltar para o app.
- **Relatório:**
  - O item enviado sai da fila pelo id.
  - O tempo ativo pausa durante a recuperação.
  - Grava a cada 5 s, e não mais a cada segundo.
- **Geradores:** `distintos`/`vizinhos` com limite; `naoNaturais` sem valores equivalentes.
- **Banco de questões (`questoes.js`):**
  - Chave normalizada, histórico de 40 + do dia, saco embaralhado.
  - Juiz que recalcula 100% dos formatos de batalha.
  - Validação com exatamente uma certa, opções distintas no valor e distratores plausíveis.
  - Distratores de erros comuns.
  - Reforço espaçado (3+ perguntas) com números novos.
  - Teste `?teste=questoes`.
- **Ambiguidades de conteúdo achadas pelo validador e corrigidas:**
  - "90 está na tabuada do 5?" agora sorteia até 5 × 10.
  - "Qual é da família a, b, c?": o divisor errado podia ser o próprio b, e então havia duas respostas certas.
