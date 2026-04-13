# page startup id

## **rota:** /startup/:id
## **path:** /app/routes/page/startup/index.tsx
## **component únicos:** /app/routes/page/startup/components/index.tsx
## **api route:** ApiPage.StartupIdPublic()
## **Type:** public

## **funcionalidade:**
- página de detalhes da startup com foco em captação/investimento
- descrição por blocos (ordem visual de cima para baixo):
  1. **Header fixo**
     - header minimalista com logo "iSelfToken" à esquerda
     - ações no canto direito:
       - seletor de idioma/país (ex: "BR")
       - botão **Cadastre-se**
  2. **Hero da oferta**
     - nome da startup e slogan/descrição curta
     - botão principal **Investir**
     - botão secundário **Falar com a plataforma** (WhatsApp/contato)
     - link de documento essencial (PDF de informações da oferta)
     - bloco de compartilhamento social
  2.1 **Apresentação aos investidores**
      - banner grande com imagem da startup
      - resumo do negócio em texto curto
      - cards de métricas rápidas (ex: MRR, crescimento, NPS)
      - botão **Baixar apresentação**
  3. **Resumo/Análise da oferta**
     - card ou box informativo
     - call-to-action para login/cadastro antes de ver detalhes
     - bloco “Resumo” com texto corrido explicando o negócio
     - **regra de acesso**: a partir desta seção, o conteúdo abaixo fica com blur médio
     - **liberação**: remover o blur somente após login/cadastro do usuário
     - **modal obrigatório**: exibir modal fixo informando que é necessário fazer login ou se registrar
  4. **Seção O Negócio**
     - texto explicativo sobre produto, proposta e diferenciais
  5. **Seção Realizações (métricas)**
     - lista de números-chave (ex: receita recorrente, crescimento, LTV/CAC, prêmios)
  6. **Seção Mercado Potencial**
     - dados de mercado e estatísticas em lista
  7. **Seção Metas com investimento (12 meses)**
     - lista de objetivos e expansão
  8. **Seção Equipe Executiva**
     - cards/descrições dos fundadores com cargo e mini-bio
  9. **Seção Fatores de Risco**
     - resumo por categorias (investimento, negócio, conversibilidade)
     - link para documento completo
  9.1 **Informações essenciais sobre a oferta pública**
      - grid de links para documentos principais (site oficial, termos, análise, jurídico, financeiro)
  10. **Seção Galeria**
      - fotos da startup, produto, time e bastidores
      - thumbnails em grid com abertura em modal
  11. **Seção Perguntas Frequentes (FAQ)**
      - perguntas sobre investimento, riscos e operação
      - respostas curtas para indexação semântica
  12. **Seção Atualizações/Novidades**
      - timeline com marcos recentes e releases
      - ajuda a manter conteúdo atualizado para SEO
  13. **Seção Depoimentos**
      - relatos de clientes ou parceiros
      - nome, cargo e empresa para contexto semântico
  14. **Seção Documentos**
      - lista de links para PDFs (termos, análise, jurídico, financeiro, apresentação)
  15. **Seção Comentários/Fórum**
      - texto de regras do fórum
      - lista de comentários
      - CTA para login/registro para comentar
      - botão **Ver mais / Postar**
  15.1 **Seção Investidores**
      - lista de avatares dos investidores
      - link **Ver todos**
  16. **Footer institucional**
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
