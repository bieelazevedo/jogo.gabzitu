# Muralhas & Bigodes

Tower defense para navegador, com interface a ocupar o ecrã, controlo por toque, arrasto e rato. Português de Portugal, com contas privadas por convite, sem anúncios ou compras ou recursos essenciais em CDN.

## Abrir no computador

É necessário Node.js 22.12 ou superior (neste ambiente: 24). Dentro desta pasta:

```powershell
npm install
npm run dev
```

Abre a ligação `Local` apresentada no terminal, normalmente `http://localhost:5173`. Mantém o terminal aberto enquanto jogas. `Ctrl+C` termina o servidor local.

Também podes usar `JOGAR.cmd`. A aplicação abre num navegador; o botão de ecrã inteiro retira a moldura quando o navegador o permite.

## Telemóvel

Os menus funcionam na vertical e na horizontal. O combate usa a horizontal. Não é preciso fazer zoom ou percorrer uma página para encontrar o botão Jogar.

Para experimentar na mesma rede Wi-Fi, abre no telemóvel o endereço `Network` que o Vite apresenta. O computador deve permitir essa ligação na firewall. Nunca partilhes o endereço do servidor de desenvolvimento na internet.

PWA, instalação e algumas APIs exigem HTTPS fora de `localhost`. O teste em viewport móvel no computador **não substitui** um teste num telemóvel físico.

## Controlos

- Arrasta um gato da barra para um `+`; vê o alcance e larga para comprar. Largar fora de uma posição cancela.
- Alternativa: toca num gato da barra e depois num `+`. Também podes tocar no `+` e escolher na janela local.
- Toca num gato construído para melhorar, escolher especialização, prioridade ou vender. Tocar fora fecha a janela. A venda pede confirmação e devolve 70% do investimento.
- Habilidades de área: escolhe, toca no mapa e confirma. As restantes apresentam a descrição antes da ativação.
- Espaço: onda; P: pausa; X: 1×/2×; Esc: cancelar.
- O menu de pausa congela a simulação individual, incluindo recargas. Esconder a página pausa o individual.
- Som e música têm controlos separados; áudio só após interação, sem dependência de microfone ou serviço externo.

## Conteúdo e regras

15 fases com percursos, posições e ondas em dados; três capítulos; chefes; especializações exclusivas; estrelas; Caos Felino após cada capítulo; infinito após a campanha. Nove gatos comuns e o Supremo Uia num espaço lendário separado. O Uia desbloqueia **após a fase 3**, conforme a revisão do pedido.

As primeiras três fases têm prioridade de verificação. A existência de uma campanha técnica completa não significa que o equilíbrio esteja fechado. Os relatórios registam o que foi realmente testado.

O combate físico usa `dano × 100 / (100 + 4 × armadura)`. Magia ignora armadura física e respeita resistência mágica explícita (Elite: 25%). Cavaleiros atravessam 70% da armadura; a quebra de armadura deixa 35% da armadura original durante o efeito.

Lentidão máxima: 70%; prevalece a mais forte. Chefes recebem só 40% da lentidão aplicada. Veneno e queimadura mantêm a intensidade mais forte e renovam a duração, sem empilhar ilimitadamente. Apoio de comandantes/fadistas usa o maior bónus de cada categoria; a cadência total é limitada a 1,8×. O apoio não aumenta o próprio valor de apoio.

Estrelas: vitória = 1; vida ≥60% = 2; ≥90% = 3. Só o melhor resultado de cada fase conta. Moedas e torres reiniciam por partida. Não há recompensa por esperar. Ondas antecipadas dão 15 moedas, no máximo duas em simultâneo; chefes nunca se sobrepõem.

## Cooperativo WebRTC, custo zero

Não há servidor de jogo obrigatório. O criador é o **host autoritativo**: executa a mesma simulação do individual e valida saldo, propriedade, equipa, posições, recargas e limite global do Uia. O convidado envia intenções, nunca resultados. Carteiras separadas, recompensas divididas sem perder frações, apoio partilhado, pausa e velocidade por acordo. O cooperativo não altera estrelas individuais.

Há dois modos de estabelecer a mesma ligação direta:

1. **Manual**, sem serviços: Cooperativo → Manual → Criar convite. Envia o código à outra pessoa por um canal à tua escolha; ela escolhe Tenho um convite e devolve a resposta. O host cola a resposta e prime Ligar. Nenhuma mensagem é enviada automaticamente a contactos.
2. **Supabase Realtime Free**, para ligação de convite: configura um projeto gratuito uma vez. Os jogadores continuam sem contas.

### Configurar a sinalização gratuita

1. No [Supabase](https://supabase.com), cria uma organização e projeto **Free**. Não adiciones cartão, Pro, extras, domínio personalizado nem recursos pagos. Se o fluxo exigir pagamento, interrompe e usa o modo manual.
2. Em Realtime, confirma que o serviço está ativo e que canais públicos são permitidos. Usamos apenas Broadcast público num tópico aleatório de 128 bits; não são necessárias tabelas, Auth, SQL ou funções.
3. Em Connect/API Keys, copia o URL HTTPS do projeto e a chave **publishable**. Nunca uses `service_role`, `sb_secret_` ou uma chave privada no navegador.
4. No jogo: Cooperativo → Configuração, guarda URL e chave pública. Para uma instalação partilhada, podes criar `.env.local` com `VITE_SIGNAL_URL` e `VITE_SIGNAL_KEY` e reiniciar o Vite. Os valores são públicos no cliente; não são credenciais administrativas.
5. Ambos os clientes precisam da mesma configuração. O host cria a sala e envia o convite; a outra pessoa abre-o e entra. Em produção, usa a mesma versão e HTTPS.

Limites consultados em **25/10/2026**, nas fontes oficiais: 200 ligações simultâneas, 100 mensagens/s, 2 milhões de mensagens por mês, 256 KB por broadcast, dois projetos Free ativos e pausa após uma semana de inatividade. Broadcast conta envio e receções. O Free não apresenta cobrança de excesso na tabela de preços; o serviço pode recusar/desligar ligações ao atingir limites. O código não faz upgrades nem contrata recursos. O plano do projeto deve continuar Free; o cliente não consegue comprovar o plano de faturação através de uma chave pública.

Fontes: [preços Realtime](https://supabase.com/docs/guides/realtime/pricing), [limites](https://supabase.com/docs/guides/realtime/limits), [planos e pausa](https://supabase.com/pricing), [protocolo](https://supabase.com/docs/guides/realtime/protocol), [Broadcast](https://supabase.com/docs/guides/realtime/broadcast).

O host conserva uma ligação de sinalização para recusar terceiros; o convidado fecha-a após ligar. A simulação viaja por DataChannels, não pelo Supabase. Projeto Supabase Free criado na Irlanda: ubijdcdrfwyebwtfoeyv. A chave publicável fica em src/public-config.ts; nunca colocar service_role ou SMTP no cliente.

### Limitações reais da rede

- Usamos STUN público Google/Cloudflare e **nenhum TURN**, pago ou gratuito. STUN descobre rotas; não retransmite o jogo.
- NAT simétrico, CGNAT, redes empresariais ou móveis podem impedir uma ligação direta. Nesse caso, há uma mensagem clara e a tentativa termina em 25 s depois da negociação; não há ciclo infinito de tentativas. Convites expiram em 10 minutos.
- Interrupções transitórias podem recuperar no mesmo `RTCPeerConnection`, com pausa e janela de 20 s. Recarregar a página perde a identidade da partida; não existe reconexão completa após refresh nem migração do host.
- Se o host sair ou deixar de responder, a sessão termina de forma controlada. Se só o convidado sair, o host pode assumir as defesas e continuar como treino, sem estrelas.
- O host deve manter a página aberta e em primeiro plano. Sistemas móveis podem suspender separadores e interromper a sessão.
- Snapshots a 10 Hz, canal não ordenado sem retransmissões e limite de buffer; comandos num canal fiável. O convidado interpola posições visualmente. Não há promessa de ausência de lag.
- Controlo limitado a 8 KB, snapshots a 256 KB, comandos com bucket de 30/s e limite de entidades. Convite não é uma conta; quem possuir o convite pode tentar entrar. Não existe proteção contra um host malicioso alterar o seu próprio programa.

## Build, testes e offline

```powershell
npm test
npm run build
npm run preview
```

O build gera manifesto, ícones e um service worker com a lista dos recursos locais e cache versionada. O modo individual funciona offline depois de o build ter sido carregado e os recursos guardados. O service worker não corre no desenvolvimento. Para instalar, usa o comando de instalação do navegador quando suportado. Uma versão nova aguarda o fecho das janelas antigas antes de substituir a cache; não há troca de ficheiros durante a partida.

`test-results/campaign.json` regista simulações com comandos e economia reais. `PROGRESSO.md` distingue testes automáticos, testes no navegador e os que faltam. Há recuperação individual no último ponto guardado após uma onda concluída; a onda interrompida pode ter de ser repetida. O cooperativo não é retomado depois de fechar a página.

## Organização

`src/data.ts`: conteúdo; `types.ts`: estado serializável; `simulation.ts`: regras e passo fixo de 30 Hz; `render.ts` e `art.ts`: Canvas e atlas; `ui/screens.ts`: menus; `main.ts`: interação; `audio.ts`: áudio; `persistence.ts`: validação e migração; `network.ts`: transporte WebRTC e sinalização; `skills.ts`: descrições de habilidades. Não há DOM na simulação.

Ver `docs/ARTE.md` para origem dos recursos e prompts. Não são usados sons originais do meme. TypeScript: Apache-2.0; Vite e Vitest: MIT; dependências detalhadas em `package-lock.json`.


## Contas privadas e publicação

Entrada por email e palavra-passe antes do menu. Gmail, Outlook e iCloud são fornecedores de email aceites; isto não significa botões OAuth Google/Apple. O email azevedo-biel@live.com já está autorizado a criar conta, mas não foi criada uma palavra-passe pelo agente. Responsável: Gabriel Azevedo. Cada membro pode gerar até cinco convites ativos, de utilização única e válidos por sete dias. O token é aleatório e só o hash fica na base de dados; a transação de registo consome-o. A data de nascimento é validada no dispositivo; só a declaração de maioridade é enviada. É autodeclaração, não verificação documental.

A página de entrada pode ser aberta por qualquer pessoa com a ligação; o acesso às contas/progresso exige autenticação e autorização no Supabase. Recursos estáticos do jogo são descarregáveis pelo navegador: o login não torna imagens ou código confidenciais. RLS restringe cada gravação ao seu utilizador; não se usa a chave service_role. Migrações em supabase/migrations. Os RPCs SECURITY DEFINER intencionais verificam o utilizador antes de gerir convites ou eliminar a própria conta, com search_path fixo.

Origem configurada: https://muralhas-e-bigodes.decentcalf18.chatgpt.site . A publicação só está confirmada quando a ferramenta Sites devolver sucesso. URL Configuration do Auth deve usar esta origem e permitir /?conta=confirmar e /?conta=recuperar. O utilizador confirmou a configuração destes três campos em 25/10/2026.

**Email pendente:** o SMTP padrão Supabase restringe entregas à equipa da organização, atualmente dois emails/hora. Para amigos com qualquer email, configurar Custom SMTP; não desligar confirmação como atalho. Brevo Free anuncia 300 emails/dia e sem cartão; remetentes gratuitos podem ser substituídos por um endereço técnico e a entrega precisa de teste. Inserir credenciais apenas no painel Supabase. Não contratar plano pago nem fornecer cartão. Fontes: https://supabase.com/docs/guides/auth/auth-smtp e https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans .

A política em seis ecrãs descreve os dados, finalidades, responsável, exportação, eliminação e limitações dos prestadores; não constitui parecer jurídico nem certificação RGPD. O alojamento é Sites/OpenAI/Cloudflare e a base Supabase está na Irlanda; não se promete residência europeia exclusiva de todos os metadados.

No iPhone: abrir a ligação publicada no Safari, Partilhar → Adicionar ao ecrã principal. O manifesto permite orientação livre nos menus; a partida pede horizontal. Ativa Manter sessão apenas num dispositivo teu. Para jogar offline é necessário um primeiro acesso online, sessão guardada e cache completa; a nuvem e o cooperativo precisam de rede.

QA de navegador: scripts/browser-qa.mjs requer MB_QA_ACCOUNTS em memória com um array de duas contas de teste autorizadas; não grava palavras-passe no relatório. As contas sintéticas criadas durante o desenvolvimento são removidas após os testes.

## Atualização 2.0
31 fases em quatro mundos (8/7/8/8), 93 estrelas. Oito gatos adicionais; Gabriel, o Admin, custa 420 moedas depois da fase 10, quatro feitiços automáticos, uma unidade. Onze chefes recrutáveis após a fase correspondente; identidades escondidas no elenco antes da vitória. Apenas moedas da partida.
Conta → Modo administrador, exclusivo de azevedo-biel@live.com: vida protegida e dinheiro infinito em todos os modos. Com ajudas não há estrelas nem recordes. O mago jogável é independente destes privilégios.
Fechar todas as janelas antigas e reabrir para atualizar a cache. Progresso anterior mantém os IDs. Login/SMTP confirmado funcional pelo utilizador; nota anterior de SMTP pendente é histórica.

## Equipas e ritmo
Velocidades 1×/2×/3×/4×/5×; no cooperativo exigem acordo dos dois. A simulação continua em passos fixos; em dispositivos lentos a velocidade real pode ser inferior para manter o limite de trabalho por frame.
Até oito aliados escolhidos e o espaço lendário Uia; barra de combate em páginas de cinco. Formação individual e cooperativa guardadas por conta e sincronizadas no progresso. Filtros por dano/apoio/chefes e equipa sugerida segundo resistências, área, rotas e dificuldade. A sugestão só substitui a tua seleção ao aceitares. Gravações antigas migram automaticamente.

Coop: Criar sala → Partilhar convite → o amigo entra → ambos Estou pronto → criador Começar partida. Os dois precisam de contas autorizadas; o criador mantém a página aberta. Sem TURN: algumas redes bloqueiam a ligação; não há garantia em todas as redes.
Corpo a corpo avança até 32 unidades e os magos até 16, regressando à base. Suportes permanecem fixos; seleção mostra beneficiários. Novas bases próximas e alcances revistos aumentam as opções de colocação.


## Gato Nightreign — Expedição da Coroa Partida

Modo cooperativo de ação 3D para telemóvel (1–5 jogadores, vagas preenchidas com bots): santuário → exploração → chefe, em três luas.

### Visual
- Personagens, inimigos, chefes, edifícios, natureza e adereços são modelos 3D prontos com licença CC0 (KayKit de Kay Lousberg e Kenney Nature Kit), em `public/models` (~4 MB, compressão meshopt e texturas WebP). Gerados por `node scripts/build-models.mjs`.
- Efeitos de magia e impacto usam o Kenney Particle Pack (CC0) em `public/fx`.
- Ícones de habilidades: game-icons.net (CC BY 3.0), extraídos por `node scripts/build-icons.mjs` para `src/night-skill-icons.ts`.
- Interface com Kenney Fantasy UI Borders e UI Pack RPG Expansion (CC0); lua com o mapa LRO da NASA (domínio público).
- Créditos completos em `public/CREDITS.md` e no menu do modo.
- Se os modelos não carregarem, o jogo volta automaticamente à geometria simples original.

### Heróis
Garra Lunar (duelista), Astral (curandeiro), Bastião (guardião), Rubro (duelista vampírico), Umbra (mago drenador), Íris (arqueira) e **Carmesim** (feiticeira do caos):
- Feixe do caos: segurar Atacar canaliza um feixe que drena vida, fica mais forte no mesmo alvo e ramifica nos níveis 5 e 10 (e com a melhoria Fio carmesim).
- Onda do caos, Levitação carmesim, Prisão de runas e passiva Caos instável (cada 4.º feitiço +40%).
- Especial **Realidade reescrita**: zona de 10 m durante 8 s com dano contínuo; aliados lá dentro ficam invulneráveis e recuperam vida.

### Controlos (telemóvel deitado)
- **Joystick flutuante**: toca em qualquer ponto da metade esquerda; **dois toques rápidos = esquiva** (na direção do arrasto); empurrar até ao limite por um instante **corre** sozinho.
- **Polegar direito**: Atacar no canto (segurar = ataque contínuo / feixe da Carmesim); habilidades da classe em arco à volta; magias compradas no arco exterior. Só ícones; a recarga aparece no anel.
- **Manter premida uma habilidade** mostra o que faz, o dano/cura base e o atual (com atributos, melhorias e efeitos) e a recarga, sem a lançar.
- **Minimapa** (fotografia aérea do próprio mundo) no canto superior esquerdo; tocar abre o mapa completo, onde se toca num portal para viajar.
- Poção junto à barra de vida; Atributos, Equipa e Menu no canto superior direito. Ao alto aparece um aviso para rodar o telemóvel.
- Teclado: WASD ou setas, J atacar, E poder, Espaço saltar, Z esquivar, Shift correr.

### Missões
Cada lua tem três missões opcionais durante a exploração (acampamentos, portais, relíquias, elites, esquivas perfeitas). Completar dá ouro a toda a equipa e, nas mais difíceis, pontos de atributo e uma poção. As relíquias estão marcadas no mapa com um feixe de luz dourada.

### Dificuldade
Inimigos com sequências de golpes (comuns a partir da 2.ª lua, elites sempre), no máximo dois a atacar o mesmo herói, castigo a quem ataca sem parar, arqueiros que antecipam o movimento e acampamentos maiores nas luas seguintes. O chefe encadeia mais golpes com preparação variável. Esquiva perfeita dá energia e vigor. Medição com uma equipa de três bots: Aventura 5/5 vitórias, Normal 5/5, Caçada 2/5.

### Publicar (Netlify, gratuito)
1. netlify.com → entrar com o GitHub → **Add new site → Import from Git** → escolher este repositório → **Deploy** (o `netlify.toml` já define `npm run build` e a pasta `dist`).
2. Supabase → Authentication → URL Configuration: acrescentar o novo endereço (ex.: `https://nome.netlify.app`) em *Site URL* e *Redirect URLs*.
A base de dados não muda. Os links de convite e emails usam automaticamente o endereço onde o jogo está aberto.

### Desenvolvimento
`npm run dev` e abrir `/dev/night.html` (expedição sem conta) ou `/dev/showcase.html` (vitrine de heróis, inimigos e chefes). Estas páginas não entram na build.

## Caçada 3D clássica (modo original)
Modo independente da campanha: menu Gato Nightreign → criar/entrar numa caçada → ambos prontos → iniciar. O criador controla Garra Lunar (corpo a corpo + golpe forte); o convidado controla Astral (ataque à distância + cura em área). Treino com aliado IA disponível. Arrastar o analógico move; ataque básico automático, esquiva com invulnerabilidade breve e poder com recarga. Teclado: WASD/setas, Espaço, E. Ficar perto do parceiro caído durante 3 segundos reanima-o.

Uma arena original e um chefe, Devorador de Sachês, com duas fases e três padrões sinalizados. Sem copiar personagens ou recursos de outros jogos. Geometria 3D estilizada procedural com Three.js, carregado num módulo separado, resolução limitada e desenho a até 30 fps. Não é ainda uma campanha de ação completa nem arte final.

A simulação corre no anfitrião a 30 passos/s; os clientes enviam intenções e recebem estados compactos aproximadamente 14 vezes/s. Posições suavizadas visualmente; não há ainda previsão completa com reconciliação no convidado. A latência afeta a esquiva. O transporte existente usa WebRTC direto, sem TURN pago ou novo serviço. Ausência de entrada por 500 ms zera o movimento remoto. Sair termina a sessão; não há migração de host, reconexão ou checkpoint desta arena. Não atribui estrelas nem altera a campanha. Sessão limitada a 8 minutos. O 3D requer WebGL2; falha retorna ao menu com mensagem. Teste físico em iPhone e afinação humana do chefe ainda necessários.


### Atualização do combate 3D
Ataque manual (segurar botão ou J/F), combo de três golpes, projéteis do Astral, esquiva com vigor, poderes com entrada em fila e especial carregado por dano (Q). O chefe possui cinco padrões sinalizados, investida/salto, postura quebrável e fase de fúria. Modelos articulados com passos, rotação de braços/armas, capa, cauda e animações de preparação/impacto; partículas, indicadores de dano e áudio próprio. Geometria do cenário e partes estáticas dos modelos agrupadas por material. Estados enviados no canal de frames, inputs no canal de controlo; protocolo mb-6 exige ambos atualizados. Treze testes de combate incluem vitória de dupla coordenada. Sem teste físico de iPhone.


### Três caçadas
Claustro da Lua (4800 PV), Pátio das Cinzas (5400 PV, mais investidas/saltos) e Santuário do Eclipse (6000 PV, alternância de marés/explosões). Ambientes e variantes de cor do chefe atual; não são modelos novos. Após vencer, o host abre a próxima arena e ambos confirmam a entrada. Em treino, as caçadas 2/3 podem ser abertas diretamente na introdução. Restaura a dupla ao iniciar outra arena; progressão das caçadas dura a sessão. Protocolo mb-7.


## Quinta do Caos
Modo independente de caça/disfarce 3D: 2–10 participantes (5 recomendados), 25/30/40 NPC, rondas de 2/3/4/5 minutos. O host preenche vagas com IA, escolhe dificuldade e cada pessoa declara preferência de papel. Espécies dos participantes são únicas; há vários NPC por espécie. O caçador começa com quatro confetes de captura, limite quatro, recolhas de uma munição e armazém que repõe duas com recarga. Acertar num NPC desperdiça o tiro e causa uma breve penalização. Tempo esgotado favorece os animais.

Arrastar analógico move, segurar Correr acelera com vigor, arrastar o cenário orienta a câmara. Teclado: WASD/setas, Shift, Espaço (voz/disparo), E (habilidade), F (natural/investigação). Moitas ocultam animais distantes, incluindo NPC. Todas as espécies têm animações e habilidades com recarga. Cada animal grava a sua frase inicial (2–5 segundos); os NPC da mesma espécie repetem exatamente essa gravação. O jogador volta a falar ao vivo: após 27 segundos, o microfone abre por até oito segundos, com indicação visível e opção de fechar o automático. Silêncio a partir dos 35 segundos gera peidos espaciais a cada oito segundos; replay não reduz a pressão. Fala livre também conta. O host mede energia vocal sustentada por 1,2 segundos, sem transcrever nem comparar palavras. A biblioteca serve apenas os bots sem gravações de jogadores. A gravação pode ser ouvida e refeita antes de confirmar.

### Voz e limites
As gravações ficam apenas na memória da ronda, em PCM mono 12 kHz (máximo 125 KB), transferidas por partes via WebRTC. O serviço Supabase recebe só SDP/convites, não gravações nem estados. Sem TURN pago; redes incompatíveis falham após 25 segundos com opção de tentativa manual. O host precisa ficar na sala; não há migração de host. Reconexão conserva a identidade de sessão do navegador, com lugar reservado por 90 segundos e bot temporário enquanto possível. Fechar o navegador, perder a sessão do host ou mudar de dispositivo não garante reconexão.

Web Audio usa PannerNode HRTF, distância inversa, orientação da câmara e filtros/ganho por interseções com paredes/obstáculos. Até oito fontes simultâneas, com compressor; gravações e sons naturais passam pelo mesmo percurso espacial. É uma aproximação acústica, sem simulação de difração/reverberação física completa. O navegador pode exigir toque para desbloquear som e permissão para microfone; os animais humanos precisam do microfone; bots usam sons próprios. Não há áudio automático de atores, novelas ou músicas protegidas. São 22 falas originais sintetizadas localmente com a voz instalada Microsoft Helia (pt-PT), dez efeitos naturais originais e um catálogo de referências sem ficheiros. Não se imitam vozes reais. Participantes podem captar o que ouvem por outros meios; não inclua dados pessoais.

Free verificado em 25/10/2026: 200 ligações Realtime simultâneas, 100 mensagens/s, 2 milhões de mensagens/mês. O jogo usa sinalização pontual e P2P para a partida, sem ativar Pro/cartão/extras. Fontes: https://supabase.com/docs/guides/realtime/limits e https://supabase.com/docs/guides/realtime/pricing . O host envia estados individuais sem identificação secreta dos animais, a 5–8 Hz, e executa regras a 20 Hz. Dez participantes podem exigir dispositivo/rede mais fortes. Os bots usam regras locais, não IA generativa; o caçador bot não lê identidades ocultas.

Resultados concedem pontos cosméticos, chapéus e estatísticas guardadas com a conta; nada pago ou com vantagem competitiva. O arredondamento entre cópias de progresso usa máximos, podendo não somar duas sessões simultâneas em dispositivos diferentes. O estado de uma ronda ativa não é checkpoint de campanha. Não há promessa de ausência de lag ou de suporte idêntico entre todos os aparelhos. Validação física de Safari/iPhone permanece necessária.

Validação desta entrega: 78 testes automatizados; cinco pares/participantes de navegador reais em estrela WebRTC; comando remoto, transporte de gravação de 100 KB e reconexão; interface real com dois amigos + bots, microfone sintético de teste, envio/confirmar e encerramento do host. WebKit Windows testa interface/WebGL e fallback sem áudio, pois este motor de teste não expõe Web Audio/MediaRecorder. Não substitui teste físico em iPhone. Contas privadas existentes continuam necessárias; convite da sala não substitui convite de registo.

Retoma de convidado: o lugar usa um identificador aleatório persistido por conta/sala no mesmo navegador. Ao reabrir o convite, o host devolve o controlo do mesmo animal, preservando capturas, munições e posição; capturas ocorridas enquanto esteve com bot não são revertidas. A identidade Auth não é enviada pela ligação P2P. Outro dispositivo ou limpeza do armazenamento não recuperam automaticamente esse lugar. Migração de anfitrião não implementada.

### Menu e conversa ao vivo — atualização
Entrada da Quinta com mapa 3D ao fundo; escolha no celeiro por arrasto/setas, usando os mesmos dez modelos da partida. Autoria e licenças em public/farm-models/animals/CREDITS.txt e no painel de créditos. Ganso, pato e cabra receberam animação adaptada; os outros modelos usam clips próprios.

Salas da Quinta têm código de seis caracteres: Criar sala → partilhar código → Entrar com código. O lookup efémero usa Realtime, sem tabela, gravação ou serviço adicional pago. O link continua disponível para partilha. O código expira quando o anfitrião fecha a sala; não é uma palavra-passe forte e deve circular só entre amigos. A autenticação existente continua a ser necessária na entrada do jogo.

Conversa WebRTC real: segurar para falar no celeiro; na ronda, voz espacial por distância 3D, direção e abafamento por paredes. O anfitrião retransmite uma mistura estéreo para cada convidado, excluindo a própria voz desse convidado. O caçador pode falar de microfone aberto e fechá-lo no botão 🎙. Megafones dourados recolhidos no cenário ampliam o alcance por 20 segundos, com reaparecimento controlado. Sons ao vivo não são gravados pelo jogo. Auscultadores evitam realimentação; permissões, interrupções do sistema e algumas redes podem impedir áudio. Não há migração de host nem TURN pago.
