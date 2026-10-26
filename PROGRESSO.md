# Muralhas & Bigodes — progresso

## Decisões
- Projeto vazio em 25/10/2026. TypeScript, Vite, Canvas 2D; recursos originais desenhados em código, sem CDN.
- Implementação local; não publicar serviços nem criar contas automaticamente.
- O requisito adicional substitui o servidor de jogo por WebRTC. Host executa a simulação e valida intenções. Sem TURN.
- Sinalização opcional Supabase Realtime Free; troca manual de convites como alternativa sem serviço. As regras não dependem da sinalização.
- Limites consultados em 25/10/2026: Free, 200 ligações simultâneas, 2 milhões de mensagens/mês; sem overage pago no Free. Documentar fontes e configuração.

## Implementado
- TypeScript + Vite + Canvas 2D, simulação serializável de passo fixo, comandos e regras separados do DOM.
- 15 fases com ondas e percursos definidos, três capítulos, chefes, desbloqueios, estrelas, Caos Felino e infinito. A campanha tem implementação; o equilíbrio continua em revisão.
- Nove gatos comuns, especializações exclusivas, Uia lendário, alvo por progresso normalizado, venda a 70%, economia sem rendimento por espera, máximo de duas ondas e chefes sem sobreposição.
- Habilidades: Novelos, Miau, Entrega, Caixa de Cartão e Banquete Falso. A Mestra dos Sachês alterna água, terra, ar, fogo e sachê com efeitos distintos.
- Menu de jogo animado; campanha por capítulos; preparação numa única janela de ecrã inteiro com separadores e paginação dos gatos. Sem página promocional.
- Arrasto por Pointer Events com confirmação ao largar, alternativa por toque, painel local de unidade, venda confirmada, áreas de toque de 44 px nos controlos principais.
- Arte raster original gerada e integrada: gatos, inimigos, cenário, 8 vistas do Uia tigrado, 8 poses do Legollas, 6 poses elementais. Respiração, recuo de ataque, marcha, projéteis e ambiente; efeitos reduzidos.
- Recursos principais convertidos para WebP com transparência: ~3,7 MB em vez dos PNG originais. Fontes PNG preservadas em assets/source.
- Áudio original por Web Audio: música, aves, miados, ataques distintos, compras, habilidades e resultados; sem microfone ou serviço.
- Progresso local validado/versionado, importação/exportação, reset confirmado, preferências, recordes.
- Manifesto, ícones PNG/SVG, build offline com cache versionada e atualização sem substituir ficheiros numa partida ativa.
- Cooperativo: dois jogadores reais por RTCPeerConnection, host autoritativo, DataChannels de comandos/snapshots, interpolação, carteiras separadas, propriedade, voto de pausa/velocidade, encerramento ao sair o host e treino sem estrelas se o convidado sair.
- Sinalização manual funcional e transporte Supabase Realtime configurável. Sem TURN, servidor de jogo ou contratação automática. Contas Supabase adicionadas por pedido posterior.

## Revisões pedidas durante a sessão
- WebRTC substitui o servidor WebSocket original.
- Legollas, baseado na imagem fornecida, é o primeiro chefe (fase 3). É uma surpresa: não aparece no menu ou no briefing; a previsão anuncia apenas uma presença desconhecida. Ratazão mantém a fase 5.
- Primeira fala: «Eu odeio carne de panelaaaaa.» Segunda fala proposta: «Ahhhh! Legumes, peixes, frutos do mar… EU DISSE QUE ERA SEM ISSO!» Em src/dialogue.ts, fácil de rever.
- Uia é o gato tigrado de quatro patas da segunda referência e desbloqueia após a fase 3, substituindo o plano inicial da fase 10.
- Gato Monge passou a Mestra dos Sachês; tom de humor para público adulto, sem infantilizar o texto.
- Menus mobile sem scroll de página; a preparação deixou de estar dividida em mapa/equipa. Mapa maior durante combate, controlos nas zonas dos polegares.

## Verificação
- Antes do projeto: Playwright 1.62.1 e Chromium instalados; clique, captura e WebGL funcionais.
- Build TypeScript/Vite passou nas revisões anteriores; repetir na versão final após todos os ajustes.
- 26 testes automáticos passaram, incluindo economia, propriedade/Uia, especializações, estrelas, pausa/velocidade, ondas, três partidas completas, caixa/isca, lentidão, veneno, apoio, derrota sem defesas e os cinco elementos.
- Jogador automatizado, sem alterar saldo/vida, percorreu as 15 fases; os relatórios ficam em test-results/campaign.json. O teste inicial demasiado fácil levou a reforçar armadura, vida, elites e combinações. Os capítulos finais passaram a perder mais vida. Ainda não é validação humana do equilíbrio.
- Após revisão de preparação: 844×390, 667×375, 390×844 e 360×640, todos os separadores e segunda página de gatos sem overflow ou controlos fora do viewport.
- Arrasto com eventos touch reais via CDP no Chromium, compra, coordenadas e painel flutuante verificados. Isto continua a ser emulação, não aparelho físico.
- Dois contextos Playwright estabeleceram WebRTC real por troca manual, construíram com carteiras separadas, receberam o mesmo número de inimigos e pausaram por acordo. Sem erros JavaScript nessa verificação.
- Suite de navegador reproduzível em scripts/browser-qa.mjs passou: login real, menus em quatro viewports, compra por arrasto, melhoria/venda, habilidades, WebRTC real, concorrência/propriedade, pausa e saída do host; nenhum erro JavaScript.

## Limitações e próximos passos
- Falta testar num telemóvel físico (iOS/Android), entre redes distintas e com a sinalização Supabase real. Projeto Supabase Free criado; SMTP e testes de entrega de email ainda pendentes.
- Reconexão transitória no mesmo peer tem janela limitada; refresh perde a partida. Não há migração do host.
- Balanceamento humano, estratégias alternativas, Caos e infinito longo precisam de mais partidas. Não declarar campanha «equilibrada» só com o bot.
- Algumas fases partilham o mesmo tema de terreno ilustrado, com percursos e decorações distintos; capítulos 2/3 usam matiz próprio. Cenários específicos de esgoto/fábrica/laboratório ainda podem receber arte individual.
- A primeira animação dos gatos comuns usa poses com respiração/recuo; Uia, Legollas e Elemental têm atlas específicos. Não prometer animação esquelética completa para todos.
- Estado de áudio verificado por execução sem erros; falta avaliação auditiva em hardware real e auscultadores.
- Manter o servidor de desenvolvimento local aberto para a prévia do utilizador; não expor na internet. README contém configuração e limites.


## Contas e convites — revisão de 25/10
- Supabase real Free na Irlanda, migrações aplicadas, RLS por utilizador, convites por email e links de utilização única/7 dias/5 ativos por membro.
- Login antes do menu; progresso por conta, cópia local, sincronização com revisão e recuperação individual por onda. Pausa e saída controladas.
- Gabriel Azevedo / azevedo-biel@live.com como responsável. Email autorizado para registo; não se escolheu palavra-passe pelo utilizador.
- Registo 18+ em dois passos, data não enviada, informação de privacidade paginada, exportação e eliminação da própria conta.
- URLs Auth configurados pelo utilizador. SMTP ainda por configurar/testar. Não prometer registo de amigos funcional antes disso.
- Entrada sem autorização ChatGPT extra aprovada pelo utilizador; jogo/dados atrás da conta e convites. Os ficheiros estáticos continuam públicos.
- Teste móvel com login real passou os menus em quatro viewports, arrasto, economia, habilidades e WebRTC/controlo por proprietário; saída do host passou.

- Arranque offline do build verificado com e sem sessão guardada. Corrigida correspondência da cache de ficheiros estáticos face ao cabeçalho Vary do servidor.
- API real: uma conta leu só a própria gravação; leitura de outro utilizador devolveu zero linhas; visitante anónimo recebeu 401; gravação devolveu revisão atualizada.

## Versão 2.0 — publicação prioritária
31 fases em quatro mundos (8/7/8/8); oito gatos novos, Gabriel Admin após fase 10, onze chefes recrutáveis após vencer a respetiva fase. Atlas, logo, ambientes, animações e sons originais integrados. Admin da conta: vida protegida e dinheiro infinito, sem estrelas/recordes, autorização Supabase e prova de sala cooperativa.
Verificações: TypeScript/Vite; testes de feitiços, recrutamento, economia e persistência; QA de interface com Auth simulado e WebRTC real entre dois contextos. Testes reais de Auth/RLS anteriores documentados acima.
Pendentes: equilíbrio fino das últimas fases com partidas humanas; teste num iPhone físico; avaliação auditiva em hardware. Publicação disponível priorizada a pedido do utilizador por limite de crédito.

Correção mobile: Fullscreen API detetada antes de chamar; alternativa guiada Adicionar ao ecrã principal. Navegação do service worker tenta resposta válida da rede e mantém fallback offline; atualização fora de partida, sem apagar gravações. Causa do erro de acesso reportado no iPhone ainda não reproduzida nesse dispositivo.

## Combate mobile — revisão de escala
HUD compacto, barra inferior única com cartas maiores e ícones de habilidades legíveis, menu de ferramentas, avisos de 6,5 s. Terreno e pavimento redesenhados segundo proporções do ecrã; personagens preservam proporções e crescem 40% no espaço do mapa. Seleção usa distância em píxeis para alvos de toque consistentes. QA em 667×375, 844×390 e 932×430: seis cartas, combate, ferramentas, botões >=44 px, sem scroll. Confirmação em iPhone físico ainda pendente.

Equipas: oito aliados + Uia; seleção persistida por conta e modo, timestamp para conflitos, filtros de papéis, substituição de lugar cheio e sugestões. Velocidades até 5× com acordo cooperativo; checkpoints aceitam nove lugares e 5×. Protocolo mb-4 evita misturar clientes antigos. 45 testes automáticos; QA de formação em quatro viewports verifica substituição, reload, filtros, páginas e alvos de toque.

Cooperativo simplificado: criar/partilhar/entrar, encaminhamento após login e hashchange para convites abertos com o jogo já ativo, seleção opcional de equipa e instruções por passo. QA com Supabase Realtime Free real + WebRTC passou criar sala, abrir convite e iniciar partida; contas simuladas apenas no Auth de teste.
Colocação: até quatro bases próximas adicionais por fase, máximo 24; alcances de melee e apoio revistos; Guardiã dá +10% alcance sem acumular; suportes indicam aliados abrangidos e ligações visuais. Mobilidade real limitada: melee 32, magos 16, suportes fixos, regresso à base; host calcula ataques. Testes de avanço, dano, regresso, limites, aura e posicionamento passaram.


## Caçada 3D experimental — 25 outubro 2026
Gato Nightreign: entrada separada, treino com IA, sala WebRTC reutilizada, host autoritativo, dois heróis 3D procedurais e chefe com três padrões/two fases, esquiva, cura e reanimação. Protocolo mb-5 exige ambos atualizados. 53 testes passaram; teste de dois navegadores com convite manual WebRTC confirmou início, input do convidado e fim ao sair host. A primeira tentativa de sinalização online expirou no ambiente de QA; caminho de sinalização existente sem alterações, mas não validado novamente nesta entrega. Captura real da arena inspecionada. Sem validação em iPhone físico, previsão completa no cliente ou arte final.


## Quinta do Caos — 25/10/2026
Modo 3D separado, sem reconstruir Tower Defense/Nightreign. Dez espécies distintas por participante, 25–40 NPC, 2–10 participantes (cinco recomendados), preferência de papel, bots, rondas configuráveis e repetição na sala. Captura por confete, quatro munições, recolhas/armazém, vigor, comportamentos naturais, habilidades, moitas e fase final. Gravação própria 2–5s com prévia, NPC da mesma espécie repetindo, silêncio gerando peidos espaciais. Voz só em memória/P2P, sem servidor de gravações. Biblioteca com 22 falas originais, dez sons naturais e referências culturais sem áudio protegido. Pontos/chapéus com a conta.

Rede nova isolada em estrela WebRTC, sinalização Supabase Free. Cinco navegadores reais testados com troca de estado, comandos, áudio de 100 KB e reconexão. Teste pela interface com dois amigos + bots confirmou gravação real via MediaRecorder de teste, envio, confirmação e entrada na ronda. Testes de áudio do Chromium utilizaram microfone sintético automatizado; nenhum áudio pessoal foi recolhido. Imagens reais em 390×844 e 844×390 inspecionadas. WebKit Windows validou interface/WebGL/ronda mas não dispõe de Web Audio/MediaRecorder neste ambiente; fallback explícito. Falta testar som e desempenho em Safari/iPhone físico e sala de dez participantes reais. Não prometer qualidade idêntica entre todos os aparelhos ou ausência de lag.

78 testes automatizados passaram; os 15 testes da Quinta foram repetidos após o ajuste da fuga extra. O teste final da interface confirmou gravação, transferência, entrada na ronda e encerramento controlado ao sair o host. Regras acústicas por distância, câmara/altura, paredes e filtros foram testadas. Novos prédios CC0 Quaternius, créditos em public/farm-models/CREDITS.txt. Geometrias agrupadas e sombras instanciadas para manter o mapa leve. Progressão dos modos anteriores preservada.

Retoma reforçada: identificador de lugar aleatório persistido por conta/sala no mesmo navegador, com novo teste de reabertura aprovado. Agora são 16 testes específicos da Quinta (mais os 63 dos modos/base existentes). Não há migração de anfitrião.

## Atualização do celeiro e voz ao vivo
Menu principal compacto com três modos; Quinta com cenário 3D, carrossel no celeiro, dez modelos locais e seleção de espécie livre. Código de sala curto testado via Realtime + WebRTC. Humanos gravam apenas a própria frase; NPC da espécie escolhida repetem essa gravação, biblioteca só para bots.

Voz ao vivo por WebRTC, mistura estéreo por convidado sem eco próprio, proximidade 3D/direção/paredes e megafone recolhível por 20s. Animal recebe chamada de microfone aos 27s por até 8s; fala sustentada detetada no host adia peidos, replay não conta. Não compara palavras. Caçador com microfone aberto e controlo de fechar; segurar para falar disponível. Foco perdido/saída termina captação. Chromium exige elemento de receção silenciado para ativar o PCM remoto; correção validada.

81 testes de lógica passaram. Teste real de dois navegadores confirmou código, áudio RTP com PCM recebido não nulo, voz host→convidado, gravação partilhada, partida com bots, chamada automática (pressão voltou a 0,65s) e encerramento ao sair host. Interface testada em 390×844, 360×640, 667×375, 844×390. Não houve teste físico em iPhone nem dez participantes com voz simultânea. Host migration continua ausente; sem TURN pago.

## Caçador por toque e IA — 25/10/2026
Seleção generosa de animais no ecrã, indicador sobre o alvo e botão Capturar. Arrastar continua a rodar a câmara; altura do caçador estabilizada e posição acompanha o modelo interpolado. Sem disparo involuntário ao tocar no cenário. A assistência usa apenas posição, alcance e obstáculos, com o mesmo tratamento para NPC e jogadores. A IA investiga sons e movimentos, persegue com corrida limitada por vigor, evita repetir tiros em NPC recentemente verificados e navega para reabastecer. 84 testes passaram, incluindo captura real pela IA e recuperação de munição; build aprovado. Validação visual nova indisponível porque a navegação local está desativada nas definições Work. Teste físico em telemóvel continua pendente.

Câmara e movimento: rotação horizontal contínua de 360°, sensibilidade proporcional à largura do ecrã, amortecimento angular curto e câmara orbital coerente. O analógico é recalculado a cada frame na orientação atual, incluindo durante rotação simultânea com o outro dedo. Renderização até 60 Hz, simulação mantida a 20 Hz. Testes de controlos, assistência e IA: 23 aprovados. Verificação visual nova bloqueada pela definição Work de navegação local desativada.

Captura à distância: o comando identifica o animal público selecionado e admite deslocação lateral moderada entre o toque e o processamento no host. Cone de tolerância de 0,44 rad apenas para esse alvo; assistência livre mantém 0,24 rad. Alcance mantém 26 unidades, paredes e moitas preservam as regras de visibilidade. A identidade escolhida não dá informação sobre ser jogador ou NPC. Novos testes verificam corrida lateral com comando atrasado, alcance, direção e parede. 25 testes específicos passaram.

## Quinta do Caos — marcação, rede e caça em equipa (25/10/2026)

Substitui as regras antigas de tiro/captura: alcance de marcação 24 unidades, alcance da rede 12, cinco redes por caçador. O jogador escolhe o alvo; o botão Capturar só fica disponível com seleção válida e no alcance. A captura não depende de precisão ou sorte. O host verifica alcance e obstáculos; conserva até oito poses recentes para tolerar até 350 ms de trânsito do comando, com margem máxima de duas unidades e sem atravessar paredes/moitas. Uma seleção que deixou de ser válida não gasta rede.

As duas primeiras capturas da ronda, sejam NPC ou jogadores, convertem o animal em caçador. NPC convertidos recebem IA própria; máximo de três caçadores. Humanos convertidos mantêm o seu lugar e passam aos controlos de caçador, com breve proteção de transição. Não precisam gravar frase nem manter microfone aberto. A marcação gera aviso visual/sonoro apenas no jogador animal marcado; o caçador acompanha o alvo com a câmara, conservando controlo manual. Moitas e obstáculos quebram a marcação conforme visibilidade.

Recarga: segurar 1,6 s na zona do armazém, com progresso, animação de recolha e reposição até cinco redes. Soltar, mover ou afastar cancela. Recolhas no mapa dão redes individuais. O armazém e os objetos do mapa mostram redes. Capturas, NPC e novos caçadores têm avisos para toda a sala e sons distintos. O caçador tem membros animados separadamente, marcha/corrida, lançamento de rede em arco e recolha; remove o antigo visual de arma/confetes. Animais têm nove ações, escolhidas num painel de toque: alimentação, alongamento, coçar, sacudir, passinho, ré, rebolado, drama e reverência. NPC usam o mesmo repertório. Mover cancela a ação.

Movimento visual local responde ao comando antes do próximo passo do host, com correção suave e colisões. Os outros atores têm extrapolação curta e interpolação. Comandos a 20 Hz e vistas até 12,5 Hz em salas pequenas, mantendo simulação a 20 Hz e apresentação até 60 Hz. Comandos de movimento não podem substituir alvo/direção de captura pendente. Botão de captura tratado no início do toque, sem aguardar desbloqueio do áudio; HUD preserva os botões estáveis. Câmara com seguimento de alvo, respeito por arrasto manual e orientação relativa do analógico. Novo terreno texturado com caminhos, zonas, cascalho e sombras de contacto desenhadas numa textura, iluminação ajustada e antialiasing; sem novas dependências/serviços.

98 testes em 14 ficheiros aprovados; build de produção aprovado. Inclui teste de captura com comando atrasado, rejeição de seleção expirada, conversões limitadas a duas, marcação privada, recarga interrompível e buffers sonoros não silenciosos. O navegador de testes está desativado nas definições Work: não foi feita nova validação visual/browser nem teste em iPhone físico. O utilizador fará o teste interativo. Protocolo Quinta atualizado para farm-3: fechar/reabrir o jogo e criar sala nova com todos na mesma versão.

O Nightreign não foi alterado nesta atualização; os requisitos estão em PROXIMAS-ETAPAS.md para depois da Quinta. Não há transferência de anfitrião: a sala termina se ele sair; lugares de convidados continuam com substituição por bot e reconexão conforme o sistema existente.


## 26/10/2026 — Cat Nightreign: Expedição da Coroa Partida

Implementação isolada em night.ts, night-simulation.ts, night-data.ts, night-world.ts e night-network.ts. O botão principal passa a abrir a nova expedição; o combate legado continua preservado. Reutiliza o renderizador/rigs de HuntScene e o transporte WebRTC existente numa namespace night-1 separada.

- 1–5 lugares, vagas preenchidas com bots, código de sala de seis caracteres e três dificuldades; host autoritativo. Convidados confirmam preparação e escolhem classe. Reconexão com identidade persistente; bots assumem quando deixam de chegar comandos. Host que sai termina a sessão.
- Exploração de 150 s em cada etapa; confronto com limite de 300 s; santuário de até 70 s (ou todos preparados). Três formas progressivas do Devorador, padrões diferentes e aparência alterada; vitória apenas após a terceira.
- Mapa 104 × 104: bosque, vila arruinada, criptas, coroa e santuário. Arquitetura agrupada por material, folhagem instanciada, textura de terreno gerada uma vez, neblina, lua e partículas limitadas. Dez acampamentos com três inimigos, XP/moedas e reaparecimento fora da proximidade dos jogadores após 30 s.
- Cinco classes: duelista, curandeiro, guardião, duelista vampírico e mago drenador. Loja de dano/vida/vampirismo/cura/recarga, três poderes alternativos equipáveis e poções. Vampirismo usa dano efetivo, com redução em área e limite por acerto. Cura máxima respeitada. Fontes com cargas e reanimação por proximidade.
- Botões seguir, atacar, defender, ajudar e reagrupar. Bots recebem ordens e priorizam reanimação; amigos recebem pedido e marcador, sem controlo forçado.
- Postura do boss com recuperação, janela de vulnerabilidade curta e imunidade temporária após quebra; evita bloqueio infinito. Ataques com avisos, esquiva e vigor, combos e especial.
- UI móvel em sobreposições, mapa, portal contextual, câmara orbitável e previsão visual do jogador remoto. Classes têm acessórios próprios (escudo, garras, halo), animações de golpes/esquiva/conjuração, raios mágicos, impactos e cura. História original em quatro passagens de texto.

Verificações: 113 testes distintos passaram (suite geral de 111 e depois os 15 testes da expedição, incluindo dois novos de dificuldade normal/limite de snapshots). Build final TypeScript + Vite passou, 102 módulos e 71 recursos offline. A equipa IA de três classes completou as três formas nas dificuldades Aventura e Caçada, sem modificar vida/moedas nos testes. Sem teste visual automatizado nem validação física iPhone/Android nesta sessão: browser local estava indisponível nas definições do Work. Não apresentar como desempenho/ligação comprovados em todos os aparelhos.

Sem serviços novos, cartão, cobrança ou TURN. Mesmos utilizadores e Supabase. Sem áudio protegido; sons sintéticos de combate existentes. O novo registo de vitórias é local por conta; a run não é retomável após fechar o host. Outros bosses do Tower Defense anotados para futura adaptação 3D, não incluídos agora.


## 26/10/2026 — Revisão da câmara, combate e santuário

- Câmara mais baixa e próxima, seguimento automático da direção de deslocação, estabilidade ao conjurar/parar, correção para obstáculos. O movimento conserva a direção de referência durante cada gesto, evitando rodar em círculos devido ao seguimento automático.
- Arrastar verticalmente no cenário, pinça de dois dedos e roda do rato ajustam zoom limitado; já não rodam a câmara. Atualizada ajuda.
- Ataque básico + quatro habilidades por classe: poder, defesa/suporte, controlo/debuff e especial. Recargas independentes. Lentidão, redução de dano, provocação do guardião e fúria/vampirismo do Rubro têm efeitos na simulação autoritativa.
- Magias meteor/jardim/manto compradas são habilidades adicionais no botão Extras, com recarga própria; não substituem a classe. Meteorito tem preparação e acerto em área de 4 unidades. Dano/cura/recarga beneficiam das melhorias existentes.
- Sexta classe jogável: Íris, arqueira de longo alcance, arco próprio e animação de puxar/soltar. Magos e arqueira disparam projéteis teleguiados simulados pelo host, com tempo de viagem; desaparecem se o alvo morrer. Ataque corpo a corpo mantém alcance curto.
- Novas animações de antecipação/golpe/recuperação, finalizador vertical, garras alternadas, conjuração, áreas visíveis de cura/proteção/controlo, meteorito, projéteis e reação de inimigos. Efeitos limitados com geometria partilhada.
- Santuário dividido em Melhorias, Magias extras e Curas; até quatro cartões por página, recomendações de classe, custo/falta de moedas, limite, confirmação de compra e botão separado Terminei as compras. Estado da compra sincronizado para convidados.
- Protocolo Nightreign alterado para night-2: fechar/reabrir e criar sala nova para todos usarem a mesma versão.
- Sem alteração das regras da Quinta ou Tower Defense. Continua pendente teste visual e de gestos em dispositivos físicos.

- Proteção contra zoom nativo por duplo toque/double click e gestos Safari nas superfícies dos três modos. Não bloqueia páginas de conta/login. O zoom de câmara Nightreign continua via pointer events. Requer confirmação prática no iPhone, sem automatização de navegador disponível.

Verificacao final desta revisao: 119 testes em 16 ficheiros passaram; build TypeScript/Vite concluido, 106 modulos e 71 recursos offline. Sem validacao visual em aparelho real nesta sessao.


## 26/10/2026 — Acampamentos, autonomia e confirmação de compras

- Inimigos com separação local, aproximação pelos flancos, desvio de obstáculos, visão bloqueada pela arquitetura e perseguição limitada ao território do acampamento.
- Atiradores mantêm distância e lançam projéteis não teleguiados, que podem ser esquivados e bloqueados por obstáculos. Magos anunciam o local da magia e deixam uma zona perigosa por 2,4 s. Corpo a corpo tem arco de ataque; elites têm mais vida, impacto amplo e recompensa dupla. Dano aumenta por lua e tamanho do grupo.
- Modelos de inimigos distinguem arco, cajado, arma e armadura de elite; animações dependem de deslocação real, preparação e recuperação do golpe. Avisos no chão correspondem à direção/posição do ataque; corrigida orientação do aviso de investida do boss.
- Companheiros têm autonomia por defeito para acampamentos próximos (até 30 unidades do líder); Explorar por perto amplia para 38, Seguir-me/Reagrupar mantêm a equipa junta. Feridos regressam para perto da equipa e aliados evitam áreas anunciadas. Não existe promessa de companheiros incapazes de vencer sem participação humana.
- Câmara com limite de velocidade angular, zona morta e sem rotação de 180 graus ao recuar; acompanhamento suave de alvos frontais ao combater.
- Santuário: três escolhas por página, detalhe ao selecionar, confirmação explícita antes de gastar e cancelamento sem compra. A transação só ocorre em Confirmar compra.
- Protocolo night-3: todos devem reabrir e criar sala nova. Sem mudanças nas regras da Quinta ou Tower Defense. Validação visual e de desempenho em aparelho físico continua pendente.

Verificacao final: 127 testes passaram em 17 ficheiros com dois workers. A primeira execucao em paralelo com o build excedeu 5 s num teste de simulacao longa; a mesma suite passou sem alterar as assercoes ao limitar concorrencia.

- Movimento: NippleJS 1.0.4 (MIT), joystick analógico com zona morta de 10%, integrado sem React/Rapier. Referências consultadas: https://github.com/yoannmoinet/nipplejs e https://github.com/pmndrs/ecctrl/blob/main/docs/api-reference.md . Ecctrl não instalado por exigir outra arquitetura.
- Correr por botão/Shift, consumo de vigor e recuperação; salto separado (Espaço, esquiva Z), gravidade no host, sem saltos infinitos nem passagem através de edifícios. Ícones SVG originais em botões circulares, ataque destacado, recarga em anel. Inspirado no padrão de controlos móvel MOBA, sem copiar recursos de Wild Rift/Mobile Legends.
- Protocolo final desta revisão: night-4. O pedido de publicar com economia de limite permanece prioritário; sem novas expansões nesta entrega.
