---
name: google-stitch
description: >-
  Utilize esta skill para integrar com o Google Stitch (Google Labs UI/UX AI), extrair protótipos de interface, design tokens e converter telas/componentes para React 19 e Tailwind CSS.
---

# Google Stitch — Integração de Design e Código

O **Google Stitch** é uma ferramenta experimental do Google Labs que permite gerar protótipos multi-tela, sistemas de design e componentes de interface a partir de comandos de voz, texto ou imagens utilizando os modelos Gemini.

Esta skill orienta o agente a utilizar o servidor MCP do Google Stitch (`stitch-mcp`) e a aplicar as melhores práticas para converter os protótipos gerados pelo Stitch em código de produção React 19 + Tailwind CSS 4 na estrutura do projeto.

---

## 1. Servidor MCP do Google Stitch (`stitch-mcp`)

O agente comunica-se com os projetos do Stitch por meio do Model Context Protocol (MCP).

### Configuração no `mcp_config.json`

Verifique se a configuração do MCP está presente em `.agents/mcp_config.json` ou em `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "<seu-project-id>",
        "STITCH_API_KEY": "<sua-api-key-do-stitch>"
      }
    }
  }
}
```

> **Autenticação Alternativa**: Caso prefira autenticação via GCP CLI, execute no terminal:
> `gcloud auth application-default login`

---

## 2. Ferramentas Disponíveis no Stitch MCP

Quando o servidor `stitch` estiver ativo, utilize as seguintes ferramentas para interagir com os protótipos:

1. **`list_projects`**: Lista todos os projetos disponíveis na sua conta do Google Stitch.
2. **`get_project_screens`**: Obtém a lista de telas, metadados e componentes de um projeto específico.
3. **`get_screen_details`**: Retorna os detalhes de layout, HTML/CSS gerado e especificação visual de uma tela.
4. **`export_design_tokens`**: Extrai cores, tipografia, espaçamentos e bordas definidos no Stitch.

---

## 3. Fluxo de Trabalho: Do Stitch ao Frontend React

Ao receber a instrução para converter uma tela ou componente do Stitch para o codebase:

### Passo 1: Inspecionar o Projeto e as Telas
- Utilize o MCP do Stitch para listar o projeto e obter a estrutura da tela solicitada pelo usuário.
- Analise os componentes visuais, hierarquia de elementos e fluxo de dados.

### Passo 2: Atualizar a Fonte da Verdade do Design (`DESIGN.md`)
- Se houver novos tokens visuais (paleta de cores, sombras, fontes), documente ou atualize o arquivo `DESIGN.md` na raiz ou em `frontend/`.

### Passo 3: Gerar Componentes React 19 + Tailwind CSS 4
- Crie ou atualize os componentes em `frontend/app/components/<feature>/`.
- Utilize **Tailwind CSS 4** e componentes **shadcn/ui** sempre que aplicável.
- Garanta suporte a acessibilidade (ARIA labels, estados de foco e navegação via teclado).
- Mantenha a separação de responsabilidades (UI limpa vs. estado/lógica de dados via TanStack Query).

### Passo 4: Validação
- Escreva testes unitários com **Vitest** para os componentes ou hooks criados.
- Verifique a responsividade e o alinhamento com as especificações do Stitch.
