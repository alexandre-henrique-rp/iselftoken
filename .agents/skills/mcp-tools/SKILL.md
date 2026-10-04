---
name: mcp-tools
description: >-
  Instruções para descoberta, configuração e execução de servidores e ferramentas MCP (Model Context Protocol).
---

# MCP Tools — Gerenciamento e Uso de Ferramentas MCP

O **Model Context Protocol (MCP)** conecta o agente a serviços e ferramentas externas através de transportes Stdio (locais via CLI) ou SSE (servidores remotos).

---

## 1. Localizações de Configuração

- **Projeto local**: `.agents/mcp_config.json`
- **Configuração global**: `~/.gemini/config/mcp_config.json`

## 2. Estrutura do `mcp_config.json`

```json
{
  "mcpServers": {
    "<nome-do-servidor>": {
      "command": "npx",
      "args": ["-y", "<pacote-mcp>"],
      "env": {
        "VARIAVEL_DE_AMBIENTE": "valor"
      }
    }
  }
}
```

---

## 3. Adicionando Novos Servidores MCP

Para adicionar um novo servidor MCP ao workspace:
1. Abra o arquivo [.agents/mcp_config.json](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/.agents/mcp_config.json).
2. Adicione a chave do servidor desejado dentro do objeto `"mcpServers"`.
3. Defina o comando (`command`), argumentos (`args`) e variáveis de ambiente (`env`).
4. Reinicie a sessão para que o agente recarregue os novos mapeamentos de ferramentas.
