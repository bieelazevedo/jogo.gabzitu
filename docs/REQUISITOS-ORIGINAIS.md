Quero que desenvolvas um jogo completo de tower defense para navegador chamado **Muralhas & Bigodes**.

Assume o papel de programador de jogos, game designer e designer de interface. Implementa o projeto, não te limites a explicar como o fazer.

O jogo deve ter personalidade, estratégia, progressão, história com humor e boa apresentação. Deve funcionar em computador e telemóvel desde a primeira versão. O objetivo final inclui uma campanha individual, modo infinito e cooperativo online para dois jogadores.

## 1. Forma de trabalhar

Antes de alterar ficheiros:
- Inspeciona o projeto existente e quaisquer instruções do repositório.
- Se já existir implementação, aproveita-a e evita reescritas desnecessárias.
- Apresenta um plano curto, com etapas verificáveis.
- Depois começa a implementar sem esperar por aprovação para decisões técnicas rotineiras.

Trabalha por etapas jogáveis. Não entregues apenas um esqueleto, uma landing page ou uma interface com funcionalidades simuladas.

A primeira prioridade é uma versão com três fases completas, divertida e funcional. Depois expande para a campanha e restantes modos.

Mantém um ficheiro de progresso com decisões, etapas concluídas, problemas conhecidos e próximos passos. Atualiza-o para permitir continuar noutra sessão sem perder contexto.

Se não conseguires concluir tudo numa sessão, deixa a versão atual funcional e descreve exatamente o que está concluído e o que falta. Não apresentes funcionalidades incompletas como terminadas.

## 2. Tecnologia e estrutura

Preferência técnica:
- TypeScript.
- Vite.
- Canvas 2D para o campo de jogo.
- HTML/CSS para menus e interface.
- Node.js e WebSocket para o cooperativo, numa etapa posterior.

Podes ajustar esta escolha se o projeto existente justificar outra solução, explicando brevemente a decisão.

Requisitos:
- Sem backend obrigatório para jogar individualmente.
- Sem contas, publicidade, compras ou serviços pagos obrigatórios.
- Sem frameworks pesados desnecessários.
- Sem dependência de CDN para recursos essenciais.
- Projeto modular, fácil de executar e expandir.
- Dados de unidades, inimigos, mapas e ondas separados da lógica.
- Scripts claros para desenvolvimento, build e testes.
- Dependências e recursos com licenças adequadas.

Cria as instruções de execução para alguém que não é programador.

## 3. Conceito e história

O Império dos Ratos tomou os armazéns de ração da cidade.

Um grupo de gatos funda a **Ordem do Novelo**, com o objetivo de recuperar os bairros e proteger o último refúgio felino.

Durante a campanha, descobrem referências a uma entidade lendária: um gato que desafia as leis da física e derrota inimigos a girar.

Essa entidade é o **Supremo Uia**.

Tom:
- Engraçado, expressivo e acolhedor.
- Humor absurdo, mas sem interromper constantemente a ação.
- Diálogos curtos, dispensáveis e com opção de saltar.
- Personagens com personalidades reconhecíveis.
- Nada de grandes blocos de texto durante o combate.

Todo o conteúdo visível deve estar em português de Portugal.

## 4. Direção visual e áudio

Estilo:
- 2D visto de cima.
- Fantasia urbana acolhedora.
- Gatos expressivos, silhuetas legíveis e equipamentos distintos.
- Cenários com profundidade visual suficiente para parecerem acabados.
- Paleta harmoniosa e bom contraste entre cenário, caminhos, unidades e inimigos.

Não quero que a versão final pareça um conjunto de círculos e quadrados de cores diferentes.

Podes usar desenhos vetoriais, sprites originais ou ilustrações procedurais. Formas geométricas são aceitáveis durante o desenvolvimento, mas devem evoluir para personagens e cenários reconhecíveis.

Diferencia unidades por forma, equipamento, movimento e cor.

Inclui:
- Animações de ataque.
- Feedback de impacto.
- Projéteis legíveis.
- Pequenas animações de derrota.
- Efeitos de estado identificáveis.
- Sons curtos para compras, ataques, melhorias e habilidades.
- Controlos separados de volume e opção de silenciar.

O áudio só começa após interação do utilizador. O jogo deve continuar funcional se o áudio não puder ser iniciado.

Evita flashes intensos, excesso de partículas e tremores fortes. Disponibiliza efeitos reduzidos.

## 5. Loop principal

O jogador:
1. Escolhe uma fase no mapa da campanha.
2. Consulta objetivos, caminhos e ameaças.
3. Escolhe a sua equipa de gatos.
4. Constrói as primeiras defesas.
5. Inicia as ondas.
6. Ganha moedas com inimigos derrotados.
7. Compra e melhora gatos durante a partida.
8. Usa habilidades em momentos críticos.
9. Conclui a fase e recebe estrelas.
10. Desbloqueia novas fases e opções.

A vitória exige concluir todas as ondas e derrotar os inimigos restantes.

A derrota acontece quando a vida do objetivo chega a zero.

## 6. Campanha

Cria 15 fases divididas em três capítulos.

Cada fase deve durar aproximadamente 8–15 minutos em velocidade normal, com cerca de 10–15 ondas. Ajusta estes valores através de testes de ritmo.

Capítulo 1 — A Revolta da Ração:
- Fases 1–5.
- Quintais, ruas e mercado.
- Introdução gradual às mecânicas.
- Chefe: Ratazão, o Devorador.

Capítulo 2 — Operação Patinha:
- Fases 6–10.
- Telhados, esgotos e fábrica.
- Caminhos divididos e inimigos mais especializados.
- Chefe: Aspirador Autónomo.
- Desbloqueio do Supremo Uia no final.

Capítulo 3 — A Profecia do Uia:
- Fases 11–15.
- Laboratório e fortaleza dos ratos.
- Combinações avançadas de inimigos.
- Chefe final: Rei Roedor e a sua máquina.

As fases devem variar de forma jogável, não apenas através da decoração.

Inclui variações como:
- Um caminho sinuoso.
- Dois caminhos que se cruzam.
- Entradas alternadas.
- Uma ponte que abre durante a fase.
- Dois depósitos a proteger.

Quando existirem dois depósitos, usa uma regra clara: ambos contribuem para uma vida partilhada do refúgio, indicada na interface.

Mudanças de caminho devem ser anunciadas com antecedência. Não surpreendas o jogador de forma injusta.

Cada fase deve ter:
- Nome.
- Pequena introdução.
- Mapa próprio.
- Posições de construção definidas.
- Ondas próprias.
- Recursos iniciais.
- Objetivo e condição de vitória.
- Recompensas.
- Novidades apresentadas de forma clara.

No início, implementa três fases distintas e completas. Planeia as restantes no formato de dados, mas não marques fases vazias como disponíveis.

## 7. Progressão

Distingue claramente:

A. Progresso de campanha:
- Fases concluídas.
- Estrelas obtidas.
- Gatos e habilidades desbloqueados.
- Capítulos abertos.

B. Progresso dentro da partida:
- Moedas.
- Gatos construídos.
- Melhorias.
- Recargas.
- Vida do refúgio.

As moedas e construções reiniciam em cada fase.

Estrelas:
- 1 estrela por concluir.
- 2 estrelas por concluir com pelo menos 60% da vida.
- 3 estrelas por concluir com pelo menos 90% da vida.

Repetir uma fase atualiza o melhor resultado, sem duplicar recompensas já recebidas. Para desbloqueios, usa o total das melhores estrelas de cada fase.

As estrelas desbloqueiam alternativas de equipamento e habilidades, com vantagens e contrapartidas. Evita aumentos permanentes enormes de dano e a necessidade de repetir fases para conseguir vencer.

Desbloqueia os seis gatos comuns progressivamente durante o primeiro capítulo. O Supremo Uia fica disponível após a fase 10.

Antes de cada partida, o jogador escolhe até cinco dos gatos comuns disponíveis. O Supremo Uia tem um espaço lendário separado após ser desbloqueado.

Cada fase deve ser vencível com os desbloqueios disponíveis nesse momento.

Após concluir cada capítulo, desbloqueia a dificuldade **Caos Felino** das suas fases, com ondas revistas e combinações mais difíceis. Não uses apenas multiplicadores enormes de vida.

## 8. Construção e seleção

Usa posições fixas de construção, adequadas a toque e rato.

Os mapas podem ter aproximadamente 12–20 posições, conforme o tamanho e o equilíbrio.

Ao selecionar uma posição:
- Mostra os gatos disponíveis.
- Mostra custo e função.
- Apresenta o alcance antes da confirmação.
- Permite cancelar.

Ao selecionar um gato construído:
- Mostra nome, nível e atributos reais.
- Mostra alcance.
- Mostra melhorias e custos.
- Permite escolher prioridade de alvo.
- Permite vender.

Prioridades de alvo:
- Primeiro no caminho.
- Mais forte.
- Mais próximo.

“Primeiro” deve corresponder ao maior progresso normalizado no respetivo caminho, com desempate estável.

A venda devolve 70% do total investido, arredondado para baixo. Mostra o valor antes de confirmar.

Impede compras sem moedas, construções duplicadas e ações inválidas.

## 9. Seis gatos comuns

### Gato Arqueiro
- Barato.
- Dano físico individual.
- Alcance médio.
- Especialização A: disparos rápidos.
- Especialização B: sniper de longo alcance e maior dano por disparo.

### Gato Mago de Gelo
- Dano mágico baixo.
- Aplica lentidão.
- Especialização A: controlo em área.
- Especialização B: lentidão mais forte num alvo.

### Gato Bombardeiro
- Ataque lento.
- Dano físico em área.
- Especialização A: maior área de explosão.
- Especialização B: queimadura com dano ao longo do tempo.

### Gato Cavaleiro
- Curto alcance.
- Dano físico eficaz contra armadura.
- Ataca inimigos que passam no caminho ao seu alcance.
- Não se desloca nem bloqueia inimigos.
- Especialização A: quebra de armadura.
- Especialização B: ataques em arco contra vários alvos.

### Gato Bruxo
- Dano mágico e veneno.
- Especialmente útil contra inimigos resistentes.
- Especialização A: veneno prolongado.
- Especialização B: propagação para alvos próximos.

### Gato Comandante
- Suporte.
- Aumenta a velocidade de ataque dos gatos próximos.
- Especialização A: maior alcance de suporte.
- Especialização B: acrescenta um bónus moderado de dano.

Melhorias:
- Nível 1: versão inicial.
- Nível 2: melhoria geral.
- Nível 3: escolha entre duas especializações exclusivas.

As melhorias devem mudar atributos e aparência.

Define regras explícitas:
- Bónus de comandantes não se acumulam indefinidamente; prevalece o mais forte de cada categoria.
- Comandantes não aumentam os próprios bónus através de outros comandantes.
- Lentidões não se somam; prevalece a mais forte.
- Define um limite máximo de lentidão.
- Reaplicar um efeito de dano do mesmo tipo atualiza a duração e mantém a intensidade mais forte, sem acumulação ilimitada.
- Chefes têm resistência a controlo claramente comunicada.
- Dano físico respeita armadura.
- Dano mágico ignora armadura física, salvo resistência específica indicada.

Centraliza as fórmulas e mostra descrições coerentes com o comportamento real.

## 10. Supremo Uia

Unidade lendária cómica inspirada no meme do gato a girar “Uia Uia”.

Cria uma interpretação original, com expressão impassível e rotação engraçada. Não dependas de imagens ou gravações originais do meme. Usa sons originais com energia semelhante.

Preparação narrativa:
- Pistas durante os primeiros capítulos.
- Marcas circulares no chão.
- Cartazes: “ELE GIRA”.
- Ratos assustados com a profecia.

Na fase 10, após derrotar o chefe, apresenta uma sequência curta e dispensável em que o gato desperta. Não alteres subitamente o equilíbrio da batalha com uma mecânica incompreensível.

Depois fica desbloqueado para compra nas partidas.

Regras:
- Apenas um por partida, incluindo no cooperativo.
- Custo elevado.
- Especialista contra enxames.
- Menos eficiente contra chefes.
- Campanha vencível sem ele.

Progressão:
- Nível 1 — Gato Suspeito: pequenos pulsos sonoros.
- Nível 2 — Uia Desperto: gira ao atacar e causa dano em área.
- Nível 3 — Supremo Uia: aura e ondas de choque.

Tem evolução final única, sem duas especializações.

Habilidade própria:
**Ascensão U I I I A**

Botão:
**Deixar acontecer**

Durante alguns segundos:
- Gira mais depressa.
- Emite pulsos de dano em área.
- Ativa um pequeno efeito sonoro rítmico original.
- Inimigos derrotados podem sair disparados como efeito visual.

A animação de derrota não altera recompensas, colisões ou estado de combate.

No fim, o gato lambe a pata como se nada tivesse acontecido.

Descrições possíveis:
- “Não sabemos por que gira. Os ratos também não.”
- “A física apresentou queixa.”
- “Ele não persegue inimigos. O universo é que roda.”

Recarga, duração e alcance devem ser visíveis e respeitar a simulação.

## 11. Inimigos e chefes

Inimigos comuns:
- Rato comum: fraco e numeroso.
- Rato corredor: rápido e frágil.
- Cão robusto: lento e resistente.
- Rato blindado: armadura contra dano físico.
- Enxame: muitos inimigos pequenos.
- Elite: maior resistência e velocidade.

Introduz variantes adicionais apenas se tiverem uma função estratégica clara.

Cada tipo precisa de:
- Silhueta reconhecível.
- Vida e velocidade.
- Recompensa.
- Dano causado ao chegar ao refúgio.
- Resistências visíveis.
- Apresentação curta na primeira aparição.

Chefes:
- Ratazão: ameaça resistente com reforços limitados.
- Aspirador Autónomo: avanço por impulsos, anunciados visualmente.
- Rei Roedor: combate com fases e uma máquina que muda o padrão de ameaça.

As habilidades dos chefes precisam de antecipação e possibilidade de resposta.

Inimigos invocados por chefes devem ter recompensas reduzidas ou nulas para impedir exploração económica.

Evita invulnerabilidades longas, roubo arbitrário de moedas ou desativação prolongada das defesas.

## 12. Ondas e economia

Ondas definidas em dados, com:
- Grupos.
- Quantidades.
- Intervalos.
- Caminhos.
- Atrasos.
- Eventos especiais.

Combina inimigos de forma intencional.

Economia:
- Moedas por inimigo derrotado.
- Recompensa por onda concluída.
- Recursos iniciais suficientes para diferentes aberturas.
- Sem rendimento infinito por esperar.
- Sem recompensas duplicadas por eventos repetidos.

Entre ondas:
- Tempo de preparação.
- Botão para iniciar antecipadamente.
- Previsão da próxima composição.

Permite antecipar uma onda durante o combate:
- Apenas uma antecipação pendente de cada vez.
- Bónus limitado e indicado.
- No máximo duas ondas ativas em simultâneo.
- Ondas de chefe não podem ser sobrepostas.
- A conclusão e a recompensa de cada onda são controladas separadamente.

## 13. Habilidades do jogador

O jogador leva duas habilidades por partida.

Iniciais:
- **Chuva de Novelos:** dano em área num ponto escolhido.
- **Miau de Guerra:** aumento temporário da velocidade de ataque.

Alternativa desbloqueável:
- **Entrega de Emergência:** recupera uma pequena quantidade de vida do refúgio, com utilizações limitadas.

A habilidade do Supremo Uia pertence à unidade e é separada destas duas.

Requisitos:
- Recargas visíveis.
- Descrição de efeito e duração.
- Seleção e confirmação de alvo quando necessário.
- Possibilidade de cancelar.
- Sem ativação acidental ao navegar na interface.
- Regras consistentes de combinação com suporte.

## 14. Computador e telemóvel

A compatibilidade com telemóvel é obrigatória desde a primeira etapa.

Computador:
- Rato.
- Atalhos opcionais.
- Interface que se adapta a portáteis.

Telemóvel:
- Jogo em orientação horizontal.
- Em vertical, mostra uma indicação elegante para rodar o dispositivo.
- Botões com áreas de toque de pelo menos 44 CSS px.
- Nenhuma interação depende de hover.
- Toque para selecionar.
- Confirmação para compras, venda e habilidades direcionadas.
- Painéis compactos que não tapam continuamente o mapa.
- Respeito por safe areas e recortes do ecrã.
- Sem scroll involuntário durante a partida.
- Sem bloquear zoom ou gestos fora da área de jogo desnecessariamente.

Usa um sistema de coordenadas lógicas independente da resolução. Corrige a transformação entre coordenadas de toque/rato e mapa após redimensionamento ou rotação.

Controla a resolução interna e o devicePixelRatio para não sobrecarregar dispositivos com ecrãs de alta densidade.

Inclui:
- Qualidade baixa, média e alta.
- Modo de efeitos reduzidos.
- Limites de partículas.
- Feedback imediato ao toque.

Não prometas compatibilidade com hardware muito antigo sem testar. Mede o desempenho nos ambientes disponíveis e documenta limitações reais.

## 15. Menus e interface

Ecrã inicial:
- Continuar.
- Campanha.
- Modo infinito, quando desbloqueado.
- Cooperativo, quando implementado.
- Como jogar.
- Definições.

Mapa da campanha:
- Três regiões.
- Fases bloqueadas e disponíveis.
- Melhores estrelas.
- Chefes identificados.
- Progresso guardado.

Durante a partida:
- Vida.
- Moedas.
- Número de onda.
- Inimigos ativos.
- Previsão da próxima onda.
- Loja.
- Painel da unidade selecionada.
- Habilidades.
- Pausa.
- Velocidade 1x e 2x.
- Botão para iniciar ou antecipar onda.

No modo individual, abrir o menu de pausa congela toda a simulação.

Velocidade 2x afeta consistentemente:
- Movimento.
- Ataques.
- Projéteis.
- Spawns.
- Efeitos.
- Recargas.
- Temporizadores.

Vitória e derrota:
- Resultado.
- Estrelas.
- Estatísticas relevantes.
- Repetir.
- Próxima fase, quando aplicável.
- Voltar à campanha.

O tutorial deve ser curto, interativo e dispensável.

## 16. Persistência e PWA

Guarda localmente:
- Progresso.
- Estrelas.
- Desbloqueios.
- Preferências.
- Recordes.

Usa um formato versionado, com validação e migração simples.

Dados ausentes ou corrompidos não devem impedir o jogo de abrir.

Inclui:
- Exportar progresso para JSON.
- Importar progresso validado.
- Repor progresso com confirmação explícita.

Não é obrigatório guardar uma partida a meio na primeira versão.

Após o modo individual estar estável:
- Adiciona manifesto e ícones de PWA.
- Permite instalar no ecrã inicial quando suportado.
- Disponibiliza o modo individual offline após o carregamento dos recursos necessários.
- Evita versões incompatíveis entre código e recursos em cache.
- O cooperativo continua a exigir ligação à internet.

## 17. Modo infinito

Desbloqueado após concluir a campanha.

Inclui:
- Seleção de mapas compatíveis.
- Dificuldade crescente.
- Chefes periódicos.
- Recorde local.
- Estatísticas finais.

Escala não apenas vida, mas também composição, ritmo e combinações de inimigos.

Evita aumentar indefinidamente a quantidade simultânea de entidades. Usa limites e substitui quantidade excessiva por inimigos mais fortes.

Sem classificação global na primeira versão.

## 18. Cooperativo online

Implementa numa etapa posterior ao modo individual estar sólido.

Escopo inicial:
- Dois jogadores.
- Criar sala.
- Entrar por código.
- Nome curto.
- Escolha de equipa.
- Estado “pronto”.
- Um mapa cooperativo completo.
- Sem matchmaking público, chat ou contas.

Cada jogador escolhe três gatos comuns.
O Supremo Uia ocupa um espaço partilhado e só pode existir um.

Ambos defendem o mesmo objetivo.

Economia:
- Cada jogador tem a sua carteira.
- Recompensas repartidas igualmente, independentemente do último golpe.
- Mantém internamente valores fracionários ou uma regra de distribuição justa para evitar perdas por arredondamento.
- Cada jogador controla e vende apenas as próprias unidades.
- Unidades de suporte podem beneficiar ambos.

O Supremo Uia é comprado por um jogador, pertence-lhe e ocupa o limite global. A compra deve ser validada atomicamente para impedir dois em simultâneo.

Pausa e velocidade:
- Pausa por acordo dos dois jogadores.
- Pedido de pausa expira se não for aceite.
- Velocidade 2x apenas quando ambos concordam.

Arquitetura:
- Servidor autoritativo.
- Clientes enviam intenções, não resultados.
- Servidor valida moedas, construção, propriedade, recargas, limites e progressão.
- Estado sincronizado através de snapshots e eventos.
- Renderização suave no cliente.
- Códigos de sala gerados no servidor.
- Limites de frequência e tamanho das mensagens.
- Validação de nomes e ações.
- Limpeza de salas inativas.
- Tratamento de versão incompatível.

Reconexão:
- Identidade temporária por sessão, sem contas.
- Reserva do lugar durante um intervalo limitado.
- Ao desligar um jogador, pausa temporariamente e informa o outro.
- Permite reconectar.
- Depois do prazo, permite ao jogador restante continuar e assumir as defesas abandonadas, ou sair.

Os dois jogadores usam o conjunto de conteúdo disponível no modo cooperativo. O cooperativo não concede estrelas nem altera desbloqueios da campanha individual.

A versão inicial deve funcionar com servidor local e dois clientes. Documenta como executar na rede local e como configurar alojamento com HTTPS/WSS para jogar pela internet.

Não publiques serviços nem contrates alojamento automaticamente. Distingue claramente testes locais de testes reais pela internet.

Não mostres um botão de cooperativo funcional se ainda for uma simulação.

## 19. Arquitetura da simulação

Separa:
- Estado.
- Regras.
- Comandos.
- Atualização da simulação.
- Renderização.
- Interface.
- Áudio.
- Persistência.
- Transporte de rede.

A simulação não deve depender do DOM, permitindo reutilizá-la no servidor.

Usa:
- Passo de simulação fixo.
- Renderização independente.
- Aleatoriedade com seed quando necessária.
- Identificadores estáveis.
- Ordem previsível de processamento.
- Limite de recuperação de tempo após atrasos.

No modo individual, ao ocultar a página, pausa automaticamente e pede interação para retomar.

No cooperativo, o servidor mantém a autoridade sobre o tempo; regressar à página provoca resincronização.

Mantém o estado serializável. Não precisas de implementar lockstep determinístico: o servidor é a fonte de verdade no cooperativo.

Evita:
- Um ficheiro gigante com toda a lógica.
- Dependência da taxa de frames para dano.
- Temporizadores dispersos sem relação com a simulação.
- Duplicação das regras entre cliente e servidor.
- Acumulação de objetos, listeners e efeitos ao reiniciar.

## 20. Equilíbrio

Centraliza parâmetros de:
- Custos.
- Dano.
- Alcance.
- Cadência.
- Vida.
- Velocidade.
- Armadura.
- Recompensas.
- Efeitos e recargas.

Define primeiro uma base simples e ajusta através de partidas.

Objetivos:
- Mais de uma abertura viável.
- Cada gato com função útil.
- Melhorar e construir devem ser escolhas competitivas.
- Nenhuma estratégia única deve resolver todos os mapas.
- As primeiras fases ensinam sem exigir reflexos rápidos.
- As últimas exigem combinação e planeamento.
- Habilidades ajudam a recuperar de erros, sem garantir vitória automática.
- Supremo Uia poderoso e engraçado, mas opcional.

Não afirmes que a campanha está equilibrada só porque os valores parecem razoáveis. Regista o que foi efetivamente testado.

## 21. Etapas e critérios de conclusão

### Etapa 1 — Primeira versão completa
- Três fases distintas.
- Quatro gatos: Arqueiro, Gelo, Bombardeiro e Comandante.
- Melhorias e especializações.
- Pelo menos quatro tipos de inimigo.
- Um chefe na terceira fase como encontro introdutório do Ratazão.
- Duas habilidades.
- Economia.
- Vitória e derrota.
- Guardar progresso.
- Controlos de computador e telemóvel.
- Arte e feedback suficientes para avaliar a experiência.

Este encontro introdutório não substitui o combate principal contra o Ratazão na fase 5.

### Etapa 2 — Campanha
- Quinze fases.
- Seis gatos comuns.
- Três chefes principais.
- História.
- Supremo Uia.
- Estrelas e desbloqueios.
- Dificuldade Caos Felino.
- Melhorias visuais e de equilíbrio.

### Etapa 3 — Longevidade
- Modo infinito.
- Exportação/importação de progresso.
- PWA.
- Modo individual offline.
- Otimizações e acessibilidade.

### Etapa 4 — Cooperativo
- Servidor.
- Salas por código.
- Lobby.
- Um mapa cooperativo completo.
- Sincronização.
- Reconexão.
- Instruções de execução e alojamento.

Estas etapas são a ordem de implementação do projeto completo, não autorização para entregar apenas a primeira e dar o projeto por concluído.

## 22. Testes e verificação

Testa automaticamente as regras centrais quando apropriado:
- Compras e saldo insuficiente.
- Venda e reembolso.
- Melhorias exclusivas.
- Dano e armadura.
- Efeitos e limites de acumulação.
- Recompensas atribuídas uma única vez.
- Fim de onda.
- Vitória e derrota.
- Estrelas sem duplicação.
- Pausa e velocidade.
- Limite do Supremo Uia.
- Validação de comandos cooperativos.

Faz verificações práticas no navegador, se houver ferramentas:
- Jogar do início ao fim.
- Comprar, melhorar e vender.
- Usar habilidades.
- Reiniciar várias vezes.
- Redimensionar.
- Rodar entre vertical e horizontal.
- Verificar toque e coordenadas.
- Verificar erros de consola.
- Verificar legibilidade em ecrãs pequenos.

No cooperativo:
- Dois clientes simultâneos.
- Compras concorrentes.
- Desconexão e reconexão.
- Entrada numa sala inválida ou cheia.
- Tentativas de controlar unidades alheias.
- Comandos inválidos.
- Consistência de moedas e resultado.

Emulação de viewport não equivale a teste num telemóvel real. Indica o que foi efetivamente verificado.

## 23. Entrega

Entrega:
- Código implementado e organizado.
- README com comandos exatos.
- Instruções dos controlos.
- Resumo das funcionalidades concluídas.
- Ficheiro de progresso atualizado.
- Testes executados e resultados.
- Limitações conhecidas.
- Próxima etapa concreta, se ainda houver trabalho.

Não quero funcionalidades falsas, botões decorativos, promessas de desempenho sem medições nem descrições de sistemas que ainda não existem.

Quero um tower defense com gatos que seja agradável de jogar, tenha escolhas estratégicas reais, funcione por toque e tenha personalidade suficiente para dar vontade de jogar mais uma fase.

Começa agora pela inspeção do projeto, um plano curto e a implementação da primeira etapa.