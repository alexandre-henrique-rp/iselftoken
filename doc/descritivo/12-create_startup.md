
# create startup

## **rota:** /dashboard/startups/create
## **path:** app/routes/private/dashboard/startups/create/index.tsx
## **component únicos:** app/routes/private/dashboard/startups/create/components/index.tsx
## **api route:** StartupApi.create()
## **Type:** private

## **funcionalidade:**
- página de cadastro de startups com formulário multi-etapas
- breadcrumb/topo com botão **Voltar para Dashboard**
- cabeçalho com título "Nova Startup" e descrição de orientação
- formulário dividido em etapas:
  1. **Informações Básicas**
     - nome fantasia, razão social, CNPJ
     - país (busca de países via API externa)
     - área de atuação e estágio
     - data de fundação, site e descrição básica
  2. **Captação e Valuation**
     - meta de captação
     - equity oferecido
     - valuation calculado automaticamente (meta ÷ equity × 100)
     - total captado (informativo)
  3. **Mídias e Redes Sociais**
     - URL do logo
     - URL do pitch deck (PDF)
     - URL do vídeo (YouTube)
     - lista dinâmica de redes sociais (adicionar/remover)
  4. **Informações Bancárias**
     - banco, agência, conta, tipo de conta, titular
- validações obrigatórias com mensagens inline
- máscara para CNPJ e valores monetários
- botão **Salvar** e **Cancelar**
- loading no envio e feedback de sucesso/erro
