# Vet Home

Site de apresentação da **Vet Home**, serviço de atendimento veterinário domiciliar para cães e gatos. O projeto apresenta os serviços oferecidos, conta um pouco sobre a trajetória da Dra. Maria Gabriela e reúne avaliações de tutores.

**Acesse o site:** [Vet Home no GitHub Pages](https://leanmist.github.io/VetHome_site_anuncio/)

## O que você encontra no site

- Informações sobre atendimento a domicílio, exames e vacinas.
- Apresentação da veterinária e da proposta de cuidado da Vet Home.
- Resumos e links para avaliações públicas na Petlove e na PetLife.
- Avaliações enviadas pelos visitantes, com nota de uma a cinco estrelas e comentário opcional.
- Uma página para consultar mais avaliações e uma média geral ponderada pelas quantidades de avaliações de cada fonte.
- Layout adaptado para celulares e computadores.

As notas e quantidades da Petlove e da PetLife são referências registradas no site, não dados atualizados automaticamente pelas plataformas.

## Tecnologias

- **HTML5:** estrutura e conteúdo das páginas.
- **CSS3:** estilos e layout responsivo.
- **JavaScript:** navegação, detalhes dos serviços e interação com as avaliações.
- **Supabase:** banco de dados PostgreSQL, funções e atualização em tempo real das avaliações. O cliente JavaScript é carregado por CDN.
- **Google Fonts:** fontes utilizadas na interface.
- **GitHub Pages:** hospedagem atual do site.

## Organização dos arquivos

```text
VetHome_site_anuncio/
├── index.html                       # Página principal
├── avaliacoes.html                  # Página com as avaliações do site
├── css/
│   └── style.css                    # Estilos das páginas
├── js/
│   ├── main.js                      # Menu e detalhes dos serviços
│   └── site-reviews.js              # Integração e interação com as avaliações
├── images/                          # Logo, fotos e imagens do site
├── supabase/
│   ├── site-reviews.sql             # Configuração inicial das avaliações
│   └── optional-review-comment.sql  # Atualização para bancos existentes
└── README.md
```

## Como o site foi feito

O site foi desenvolvido como um projeto estático: as páginas HTML, os estilos CSS e os scripts JavaScript são publicados sem uma etapa de build. O GitHub Pages hospeda a versão disponível na internet.

As avaliações do próprio site são armazenadas no Supabase e exibidas por meio do cliente JavaScript. O banco utiliza uma tabela, funções e políticas de acesso; os arquivos SQL do repositório registram sua configuração inicial e uma atualização para permitir comentários opcionais. As avaliações são atualizadas em tempo real quando essa conexão está disponível e também verificadas periodicamente.

A exclusão de uma avaliação depende de uma chave guardada no navegador de quem a enviou. Se os dados do navegador forem apagados ou outro aparelho for usado, essa opção não estará disponível.

Alterações no site e na configuração do banco devem ser feitas apenas por pessoas autorizadas. Avaliações enviadas ou excluídas em uma cópia conectada ao Supabase atual também afetam os dados do site publicado.
