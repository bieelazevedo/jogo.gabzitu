# Melhorias em curso — Dungeon Nightreign e Quinta do Caos

Novas mensagens acrescentam requisitos; não substituem os pedidos anteriores. Ordem: Nightreign, depois Quinta do Caos. Preferência por recursos gratuitos e licença verificável.

## Publicado antes desta revisão
- Cloudflare Pages segue visual-overhaul. Registo sem convite e modo convidado sem guardar progresso.
- Mapa de 160 × 160 m, módulos medievais Quaternius, árvores altas, quintas e campos de inimigos, vegetação interior e texturas fotográficas.
- NPC com missões, recompensas e talentos, menus e progresso de campanha incompleta; vitória limpa o checkpoint.
- Monumentos com áreas de 36–40 m: vagas, participantes fechados, pausa do boss e recompensa por sobrevivência.
- Identidade Dungeon Nightreign e ícone de instalação; heróis sem traços de gato.
- Bastião e Carmesim com modelos completos; magia escarlate nas mãos, armas e partículas suaves; poses por classe.
- Segunda revisão do joystick: dono do gesto touch/pointer, multitouch, recuperação de cancelamento Safari e zona maior. Confirmação física ainda pendente.

## Correção de estabilidade de 27/10
- Safari usa texturas HTMLImageElement em vez de ImageBitmap; até três GLB em carregamento simultâneo.
- Tower Defense carrega apenas os seus pacotes, sem heróis modernos nem arquitetura/armas exclusivas do Nightreign.
- Instalação offline guarda apenas interface/código; modelos são guardados conforme o uso. Até três transferências, sem cópias ArrayBuffer de todos os modelos em paralelo.
- Resolução e sombras limitadas no toque; contextos WebGL libertados ao sair. Tower Defense regressa ao renderizador 2D se perder o contexto.
- Email: reproduzido redirecionamento inválido sem https no Site URL do Supabase. Nova consulta confirmou destino HTTPS correto após alteração do utilizador. Botão Reenviar confirmação acrescentado. Não foram enviados emails de teste nem reutilizados tokens reais.
- Estas medidas tratam causas plausíveis e reproduzíveis de pressão de memória; não constituem confirmação de que o crash no Safari real desapareceu.

## Trabalho visual preparado — publicação autorizada
- Quatro trajes completos: LunarKnight (DJMaesen), AstralMage (rSquare), ForestArcher (outcast945), ReaverKnight (Angy97); CC BY 4.0, com créditos, compressão e animações Quaternius CC0 adaptadas.
- Modelos ligados ao jogo e enviados para publicação na visual-overhaul por pedido expresso do utilizador; validação numérica de deformação. Avaliação visual/animações em combate e ajustes dos acessórios pendentes.
- Candidata necromante rejeitada por escala/exportação inconsistente; Umbra continua com o modelo anterior até encontrar substituto fiável.
- Cobertura baixa nas clareiras e entre lugares; quintais de terra mais pequenos e mistura de relva mais irregular. Rever custo gráfico antes de publicar.

## Ainda a concluir
- Confirmação física de estabilidade, texturas e joystick no Safari. Controlo do navegador indisponível nas definições Work, portanto não há QA visual automatizado.
- Emails de novos utilizadores para azevedo-biel@live.com: fila privada e função notify-signup aplicadas; serviço de envio, segredos e agendamento continuam por configurar. Não confundir com emails de confirmação do Supabase.
- Umbra e restantes ajustes de trajes/poses/armas; desempenho em telemóvel e qualidade do mapa.
- Melhorias visuais completas da Quinta do Caos, depois do Nightreign; pedidos de campanha e recompensas permanecem no âmbito.

## Validação
- Testes direcionados de contas, convidado, joystick e carregamento por modo. Repetir build no estado final.
- Suite completa anterior: 161 passaram e um teste longo antigo excedeu 120 s; não declarar suite integral aprovada.

## Retorno involuntário ao menu
- Identificada sincronização inicial que, ao terminar, navegava para home mesmo após o início de um modo.
- Época de navegação protege a escolha atual; carregamentos dinâmicos antigos são descartados e callbacks de sessões anteriores não se aplicam à nova sessão.
- Acrescentados testes de resposta tardia e troca de conta durante a sincronização.
