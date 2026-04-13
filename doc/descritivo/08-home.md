# home

## **rota:** /home
## **path:** app/routes/private/home/index.tsx
## **component únicos:** app/routes/private/home/components/index.tsx
## **api route:** PrivateApi.home(), ApiPage.getBanner()
## **Type:** private

**descritivo:** 
- rota interna para marketing place de startups dividido por setores
    a. Rodadas de captação
    b. Startups Verificadas
    c. Startups Aceleradas
    d. Startups em Fase de Aprovação
    e. Oportunidades de investimento
- no topo vai ter um banner rotativo automático, onde vai informar eventos e avisos
- o banner ele deve esperar 5segundos para mudar
- o banner não deve ter botoes
- o banner deve ter um indicador de progresso
- o banner deve ocupar 95% da largura da tela
- o banner deve vir de ApiPage.getBanner()

## **funcionalidade:**
- layout geral em blocos (ordem de cima para baixo)
  1. **Header interno**
     - logo iSelfToken à esquerda
     - busca por startups (input de pesquisa)
     - atalhos rápidos: Perfil, Notificações, Logout
  2. **Banner rotativo (topo)**
     - slider automático com tempo de 5s entre banners
     - largura 95% da tela e centralizado
     - indicador de progresso por banner (barra/bolinhas)
     - sem botões de navegação
     - dados vindos de `ApiPage.getBanner()`
  3. **Seções de startups (carrossel horizontal)**
     - Rodadas de captação
     - Startups Verificadas
     - Startups Aceleradas
     - Startups em Fase de Aprovação
     - Oportunidades de investimento (grade 4x4)
  4. **Cards de startups**
     - imagem/logo, nome, categoria/segmento
     - selo conforme seção (verificada, acelerada, aprovação)
     - botão **Ver mais** com rota `/startup/:id`
  5. **Filtros e ordenação (opcional)**
     - filtro por categoria/segmento
     - ordenação por relevância, captação ou novidade
  6. **Footer interno**
     - links rápidos e informações institucionais
