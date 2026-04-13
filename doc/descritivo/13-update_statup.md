
# update startup

## **rota:** /dashboard/startups/:id
## **path:** app/routes/private/dashboard/startups/[id]/edit/index.tsx
## **component únicos:** app/routes/private/dashboard/startups/[id]/edit/components/index.tsx
## **api route:** StartupApi.getById(), StartupApi.update()
## **Type:** private

## **funcionalidade:**
- página de edição de startup dentro do painel administrativo
- área de conteúdo usa **abas internas** para organizar dados
- topo com título "Editar Startup: {nome}" e status atual (ex: Ativa)
- tabs sugeridas:
  - **Dados Gerais**
  - **Localização**
  - **Financeiro**
  - **Time**
  - **Config**
- conteúdo das abas com cards premium e transição suave

### **Aba Dados Gerais**
- card **Identidade**:
  - logo (avatar circular) + botão de upload
  - Nome fantasia, Razão social
  - CNPJ (com máscara)
  - Data de fundação, Área de atuação
- card **Descritivo**:
  - campos de texto para Problema, Solução, Diferencial
  - texto básico e modelo de receita

### **Aba Localização**
- seleção de país com busca (carrega lista via API)
- exibição do país como emoji + nome
- envio do objeto `{ iso3, nome, emoji }`

### **Aba Financeiro**
- campanha (meta, equity, datas)
- valuation calculado automaticamente
- recursos com sliders (marketing, desenvolvimento, etc)
- **regra**: soma dos recursos deve ser 100% (senão bloquear salvar)

### **Aba Time**
- listas dinâmicas para:
  - Sócios (nome, porcentagem, percentual_time)
  - Times (nome, cargo, foto_url)
- botões **Adicionar**, **Editar** e **Excluir**

### **Aba Config**
- flags de configurações:
  - participação de lucro, benefícios, termos, repasse
  - selos, prêmios e status (ativo/adm)

### **Ações finais**
- barra fixa com botões **Cancelar** e **Salvar**
- validações com feedback inline
- loading no salvar + toast de sucesso/erro
