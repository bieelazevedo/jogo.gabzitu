# Arte e som

Os recursos em uso estão em `public/*.webp`. Os PNG de origem selecionados estão em `assets/source/`. Foi usada a ferramenta ImageGen integrada; não foi usada API paga externa, chave de API, imagem de CDN ou gravação do meme.

A referência do Legollas foi fornecida pelo utilizador; a referência do Uia é a fotografia do gato tigrado fornecida depois. A utilização dessas referências não cria uma afirmação de licença sobre os originais. A adaptação desenhada é específica deste projeto.

## Direção e conjunto de prompts

- **cats-atlas:** atlas transparente de quatro colunas por duas linhas. Arqueiro tabby de capuz verde, mago cinzento de gelo e cajado, bombardeiro ruivo com óculos e bomba, cavaleiro de armadura amolgada, bruxa preta de frasco verde, comandante de estandarte, dois estados de um gato lendário. Arte 2D pintada com contornos precisos, textura de pelo/equipamento, expressões absurdas e silhuetas legíveis. O lendário branco deste primeiro atlas foi substituído na implementação pelo tigrado pedido depois.
- **extra-cats:** três colunas, uma linha, transparência real. Fadista siamês com guitarra portuguesa e xaile; monge ruivo de túnica açafrão e contas de madeira; engenhocas cinzenta com óculos, chave e bobina de cobre. Mesmo estilo do atlas anterior como referência.
- **uia-spin:** referência exata do gato tigrado fornecido pelo utilizador; quatro colunas e duas linhas. O mesmo gato de quatro patas, pelo cinzento/castanho com riscas, peito branco, pontas das patas brancas, olhos escuros e expressão fixa. Oito vistas a 0°, 45°, 90°, 135°, 180°, 225°, 270° e 315°, escala e linha dos pés consistentes, fundo alfa. Sem roupas, coroa, texto, piso ou efeitos colados ao frame.
- **elemental-animation:** referência da gata ruiva do atlas extra; três colunas e duas linhas. Preservar rosto, túnica açafrão, contas e patas brancas; seis poses: espera, água em fita, pedras de terra, remoinho de ar, arco de fogo e um sachê vermelho com ícone de peixe elevado com absoluta seriedade. Personagem original, sem reproduzir personagem televisiva, logótipo, seta ou traje de uma série.
- **enemies-atlas:** nove personagens em grelha 3×3: rato com bolacha, corredor de lenço, bulldog perplexo, rato de panela/armadura, três ratinhos com milho, oficial de rapieira, Ratazão barrigudo de colher, aspirador possuído, rei em máquina de latão. Pelo, tecido e metal pintados, expressões cómicas. Foi feito um segundo passe de extração de fundo, preservando posições e desenhos; transparência validada nos ficheiros.
- **terrain:** prato de terreno largo visto de cima, pátio urbano português de fantasia acolhedora, telhados de terracota e pedra calcária nas margens, hera, roupa estendida, poço, hortas e caixas. Centro aberto, sem estradas, personagens, texto ou interface. Os percursos e posições são desenhados separadamente de acordo com os dados de cada mapa.
- **legollas:** adaptação da referência para personagem isolada com fundo transparente; preservar cabelo escuro ondulado, óculos retangulares, barba curta, capa preta forrada a carmesim, caveira/corrente douradas, cajado com olho rubi. Corpo inteiro e silhueta legível.
- **legollas-animation:** referência do corte anterior; grelha 4×2 com espera, capa ao vento, preparar cajado, lançar, indignação, transformação, pose transformada com magia e regresso à espera. Mesma identidade/equipamento, corpo inteiro, escala consistente, transparência e margens.

As conversões PNG → WebP não alteram desenhos, posições ou poses; preservam o alfa e reduzem os downloads. Os recortes dos atlas são feitos em Canvas a partir das divisões da grelha. As animações combinam frames, transformações, respiração, recuo e efeitos desenhados em código.

## Áudio

`src/audio.ts` sintetiza tudo com Web Audio: cordas dedilhadas, baixo, assobios de aves, miados sintéticos, arco, cristal de gelo, ruído filtrado de explosão, metal, eletricidade e pequenas frases de compra/vitória. Sem samples, vozes gravadas ou reprodução do som original do meme. A música e os efeitos têm volumes independentes e podem ser silenciados.

## Arte 2.0 — ImageGen integrado
Recursos finais em public/; originais em assets/source/. roster-v2: atlas 3×3 de oito gatos e Gabriel. admin-spells-v2: seis poses do mago. villains-v2: seis inimigos e três chefes; bosses-worlds-v2: Kraken, Juiz Pombo, Fénix e Arquivista. logo-v2: MURALHAS & BIGODES numa fortaleza felina dourada com novelo turquesa. terrain-town-v2, terrain-night-v2, terrain-coast-v2, terrain-archive-v2: mapas sem caminhos, margens ilustradas e centro desimpedido.
Prompts: arte pintada de fantasia cómica, figuras inteiras isoladas em grelha, alfa transparente; aldeia portuguesa costeira e biblioteca suspensa em vista superior sem personagens/UI. ImageGen integrado; conversão WebP preserva alfa. Áudio boom, bonk, scratch, trombone e celebração sintetizado originalmente com Web Audio, volume Humor & memes e recargas.
