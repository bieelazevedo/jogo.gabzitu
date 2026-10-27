# Pedidos acumulados — melhorias do jogo

Fonte de trabalho: GitHub `bieelazevedo/jogo.gabzitu`, main `c7cba54f3060ade931d47c9f39fa213adcba62ca`. As cópias locais antigas não são a base.

## Ordem combinada

1. Gato Nightreign: cenário, personagens e campanha.
2. Quinta do Caos: cenário e personagens, depois de concluir o primeiro modo.

## Direção e restrições

- Recursos gratuitos, licença verificável, sem compras ou serviços pagos.
- Fantasia mais realista e sombria, com estruturas detalhadas; evitar aparência de blocos/PS1.
- Quaternius Medieval Village MegaKit escolhido pelo utilizador.
- Pré-visualização ao vivo ao lado da conversa, com avaliação durante o desenvolvimento.
- Cada mensagem adicional acrescenta requisitos; preservar todos os pedidos anteriores.

## Implementado em desenvolvimento — sujeito a verificação

- Cópia atual do GitHub isolada em `github-current`.
- Vitrine `dev/night-art.html` e referências verificadas em `dev/medieval-references.html`.
- Subconjunto gratuito Quaternius: 25 módulos, pack local comprimido de aproximadamente 1,27 MB.
- Casas de dois pisos, rua mercantil, quintas, campos cultivados, cercas e áreas de trabalho.
- Limites de exploração de 96 × 96 para 160 × 160, mapa/minimapa correspondentes.
- Bosques mais altos, copas sobrepostas, vegetação em setores, caminhos e clareiras.
- Terra/pedra com texturas PBR locais CC0, alvenaria com mais segmentos e arestas arredondadas.
- Sombras suaves no desktop; iluminação e composição ainda em avaliação.
- NPCs Mara, Lio e Astra; missões de combate, visita e guardião; recompensas em moedas, XP e atributos.
- Diário, diálogo, talentos e treino; regras de compra/entrega validadas pelo anfitrião.
- Campanha individual guardada localmente por conta enquanto inacabada; continuação; limpeza após vitória.
- Acampamentos opcionais por proximidade, com orçamento de 40 inimigos.

## A implementar / concluir

- Monumentos de sobrevivência: participantes fixados na ativação, barreira nos dois sentidos, vagas, cronómetro, recompensa de sobrevivência e suspensão da contagem do boss.
- Refinar o interior do mapa: eliminar vazios sem função, integrar monumentos, vegetação e pontos de interesse.
- Verificar legibilidade, interação e responsividade dos novos menus e NPCs no jogo real.
- Rever e completar a melhoria visual dos personagens.
- Validar regressões da campanha, coop, checkpoints, barreiras e desempenho.
- Criar uma alteração revisável no GitHub após os testes; nenhuma publicação em produção efetuada.
- Trabalhar depois a Quinta do Caos com as mesmas prioridades visuais e económicas.

## Estado dos testes até agora

- Um build de produção passou antes das adições recentes à campanha; precisa de repetição no estado final.
- A primeira execução completa teve timeouts e uma inicialização de textura fora do browser; essa inicialização foi tornada lazy.
- Comparação com a versão original confirmou que o teste de vitória de equipa passa na base.
- Testes direcionados e novos testes de missões, talentos, limites e saves estão a ser executados; ainda sem conclusão global de aprovação.

Não confundir a vitrine com uma campanha publicada. Os painéis de demonstração indicam os dados fictícios utilizados; o jogo real usa o estado da partida.

## Revisão de personagens e identidade

- Nome do modo e instalação: Dungeon Nightreign; novo emblema vetorial, PNG 192/512, Apple 180 e maskable.
- Traços felinos retirados dos heróis Nightreign.
- Sobreposições de armadura geradas por código rejeitadas pelo utilizador e removidas.
- Bastião: The Forgotten Knight, modelo completo PBR, animações adaptadas; precisa de QA em movimento/combate.
- Carmesim: referência explícita Wanda Maximoff; modelo Scarlet Witch (3D Share), CC BY 4.0, animações adaptadas; validação visual pendente.
- Armas: espada/machados/escudo PBR Quaternius; cajados e arco completos CC BY 4.0.
- Partículas com máscaras suaves; corte geométrico antigo desativado no Nightreign. Atelier tem botões de ataque/poder/especial para avaliação.
- Ainda pendente: trajes completos próprios das restantes classes, desempenho em telemóvel e QA visual. Navegador deixou de permitir controlo nas definições Work.
- Suite completa: 161 testes passaram; um teste antigo que simula 31 fases excedeu 120 s. Não declarar suite integral aprovada.
- Monumentos já implementados: barreira, vagas, boss congelado e recompensa; círculos ampliados para 36–40 m de diâmetro.

- Magia Carmesim: aura em ambas as mãos, núcleo claro escarlate, partículas orbitais e fumo rubro; feixes ligados aos ossos reais das mãos. Typecheck e avaliação visual em curso.

- Poses individuais adicionadas às sete classes, com transição e remoção dos offsets antes da animação seguinte. Testes verificam ausência de acumulação e saída no combate.
- Joystick Nightreign: eventos pointer de toque aceites, lostpointercapture liberta, blur repõe o identificador do dedo. Quinta: prevenção de pan da página durante movimento. Verificação física no telemóvel pendente; controlo do browser indisponível.
