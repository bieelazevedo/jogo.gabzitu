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
