# homepage

## **rota:** /
## **path:** /app/routes/page/index/index.tsx
## **component únicos:** /app/routes/page/index/components/index.tsx
## **api route:** ApiPage.get(), ApiPage.depoimentos(), ApiPage.fundadores()
## **Type:** public

## **componente shadcn:**
- theme: `npx shadcn@latest add @magicui/animated-theme-toggler`

## **funcionalidade:**
- apresentação básica da iSelfToken e listagem de startups por sessões:
    a. Rodadas de captação
    b. Startups Verificadas
    c. Startups Aceleradas
    d. Startups em Fase de Aprovação
    e. Oportunidades de investimento
    f. Depoimentos de quem já investe
    g. O que os fundadores de startups falam sobre nós
- cada sessão possui seu layout para os cards de startups 
- todas as sessões apresentara a startup em uma linha com carousel menos a sessão "Oportunidades de investimento" que apresentara a startup em uma grade 4x4
- carrossel horizontal com rolagem por botões na parte superior direita do container
- botões de navegação:
  - **front** (seta para avançar)
  - **back** (seta para voltar)
- regra de visibilidade dos botões:
  - quando o primeiro card estiver visível, ocultar o botão **back**
  - quando o último card estiver visível, ocultar o botão **front**

### 1. header e o hero
- header minimalista com logo "iSelfToken" à esquerda
- ações no canto direito:
  - seletor de idioma/país com as opções:
    - `<option value="pt-BR">BR 🇧🇷</option>`
    - `<option value="pt-PT">PT 🇵🇹</option>`
    - `<option value="en-US">EN 🇺🇸</option>`
    - `<option value="es-ES">ES 🇪🇸</option>`
    - ícone do botão do select (SVG):
      ```jsx
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      ```
  - botão **Entrar**
  - componente **animated-theme-toggler** ao lado do botão **Entrar**
- hero centralizado com tipografia grande:
  - título principal: "iSelfToken"
  - subtítulo: "Crowdfunding"
  - frase de valor: "Invista em startups promissoras via tokenização de equity"
  - texto de apoio explicando a conexão entre investidores e fundadores
- dois botões de ação logo abaixo:
  - **Captar Investimento** (primário para fundadores)
  - **Comece a Investir** (primário para investidores)

### 2. Rodada de Captação
- a sessão "Rodada de captação" deve apresentar a startup em uma linha com carousel
- a sessão "Rodada de captação" deve ter um botão que ao clicar e girar o carousel
- os cards da sessão "Rodada de captação" são maiores e devem conter: imagem de apresentação, nome da startup, breve descrição, selos aplicados pela plataforma, valuation ofertado (%), valor atual da startup, total de tokens e tokens vendidos, além do botão **ver mais** que direciona para a rota `/startup/:id`

### 3. call to action **Como Funciona?**
- seção com título "Como Funciona?" explicando a proposta para dois públicos:
  - **Para Fundadores**: mensagem de incentivo para captar investimento com solução segura, rápida e 100% digital
  - **Para Investidores**: mensagem de convite para investir em startups promissoras com liquidez via tokenização de equity
- badges informativos com benefícios (ex: "Startups verificadas" e "Investimento mínimo baixo")
- dois botões de ação à direita:
  - **comece a captar agora** (rota sugerida: `/captacao`)
  - **comece a investir agora** (rota sugerida: `/investimento/all`)

### 4. Startups Verificadas
- cards médios com: logo ou imagem, nome da startup, breve descrição, selos de verificação, categoria/segmento e botão **ver mais** para `/startup/:id`

### 5. Startups Aceleradas
- cards médios com: logo ou imagem, nome da startup, breve descrição, selo de aceleração, categoria/segmento e botão **ver mais** para `/startup/:id`

### 6. Startups em Fase de Aprovação
- cards médios com: logo ou imagem, nome da startup, breve descrição, selo "em aprovação", categoria/segmento e botão **ver mais** para `/startup/:id`

### 7. Oportunidades de investimento
- a sessão "Oportunidades de investimento" apresentara a startup em uma grade 4x4 com filtro por: 
    a. all 
    b. FinTech 
    c. HealthTech 
    d. EdTech 
    e. Tech / IA 
    f. SaaS 
    g. Outros 
- o filtro deve ser um botão que ao clicar ele deve ir para a rota `/investimento/:filter` onde :filter é o filtro selecionado
- a rota `/investimento/:filter` deve apresentar as startups filtradas por :filter
- cards deve conter o ícone do tipo de startup, nome da startup, tipo de startup, o botão de ver mais que ao clicar ira para a rota `/startup/:id`

### 8. Depoimentos de quem já investe
- seção com título centralizado "Depoimentos de quem já investe"
- layout em linha com cards horizontais (mínimo 3 visíveis no desktop)
- cada card apresenta:
  - texto curto do depoimento entre aspas
  - avatar circular com iniciais do investidor
  - nome do investidor em destaque
  - papel abaixo do nome (ex: "Investidor"/"Investidora")
- estilo com fundo escuro e bordas suaves, mantendo leitura confortável
- comportamento responsivo:
  - desktop: 3 cards visíveis por linha
  - tablet: 2 cards por linha
  - mobile: 1 card por linha com espaçamento vertical
- quantidade de conteúdo:
  - mínimo 3 depoimentos
  - ideal 6 a 8 depoimentos para rolagem horizontal


### 9. O que os fundadores de startups falam sobre nós
- seção com título centralizado "O que os fundadores de startups falam sobre nós"
- layout em linha com cards horizontais (mínimo 3 visíveis no desktop)
- cada card apresenta:
  - texto curto do depoimento entre aspas
  - avatar circular com iniciais do fundador
  - nome do fundador em destaque
  - cargo e empresa abaixo do nome (ex: "CEO, TechFlow")
  - ícones de redes sociais no rodapé do card: LinkedIn, YouTube e Website
  - cada ícone deve abrir o link correspondente do fundador (LinkedIn, YouTube e site)
- estilo com fundo escuro e bordas suaves, mantendo leitura confortável
- comportamento responsivo:
  - desktop: 3 cards visíveis por linha
  - tablet: 2 cards por linha
  - mobile: 1 card por linha com espaçamento vertical
- quantidade de conteúdo:
  - mínimo 3 depoimentos
  - ideal 6 a 8 depoimentos para rolagem horizontal

### 10. Footer
- layout em grade com 4 colunas no desktop
- coluna 1 (marca):
  - título "iSelfToken"
  - texto curto explicando a proposta (ex: conectar investidores e fundadores em uma plataforma segura e acessível)
- coluna 2 (Plataforma):
  - links: "Para Investidores", "Para Projetos", "iSelfToken Education"
- coluna 3 (Legal):
  - links: "Termos de Uso", "Privacidade"
- coluna 4 (Contato):
  - links: "Email", "Telefone"
- linha inferior com separador e texto de direitos autorais centralizado (ex: "© 2026 iSelfToken. Todos os direitos reservados.")
- comportamento responsivo:
  - tablet: 2 colunas por linha
  - mobile: 1 coluna por linha com espaçamento vertical
