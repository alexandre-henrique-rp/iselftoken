---
description: gerar documentação da rota
---

# Prompt para Documentação Automática de Rotas e APIs

## Objetivo
Analisar estrutura de páginas e APIs para criar/atualizar documentação completa das rotas, verificando requisições, restrições e fluxos de dados.

## Etapa 1: Análise da Estrutura de Rotas

### 1.1 Mapeamento de Páginas
**Escanear diretórios:**
- `@src/app/(protected)/` - Rotas autenticadas
- `@src/app/(public)/` - Rotas públicas
- `@src/app/api/` - Endpoints da API

**Para cada `page.tsx` encontrada:**
- Identificar rota baseada na estrutura de pastas
- Analisar imports e componentes utilizados
- Mapear props e parâmetros recebidos
- Identificar hooks e context utilizados
- Verificar chamadas para APIs (fetch, axios, etc.)

### 1.2 Análise de Componentes
**Para cada componente referenciado:**
- Localizar arquivo do componente
- Analisar props e interface TypeScript
- Identificar estados e efeitos
- Mapear eventos e handlers
- Verificar validações e restrições
- Documentar funcionalidades embarcadas

### 1.3 Rastreamento de APIs
**Para cada chamada de API identificada:**
- Verificar se é API interna (`/api/`) ou externa
- Localizar endpoint correspondente em `@src/app/api/`
- Analisar método HTTP (GET, POST, PUT, DELETE)
- Mapear request body e query parameters
- Documentar response structure
- Identificar middlewares e validações

## Etapa 2: Análise de APIs Internas

### 2.1 Estrutura de Endpoints
**Para cada arquivo em `@src/app/api/`:**
- Identificar rota da API
- Analisar exports (GET, POST, PUT, DELETE)
- Mapear request/response schemas
- Verificar autenticação/autorização
- Documentar validações de entrada
- Identificar conexões com banco de dados

### 2.2 Fluxo de Dados
**Rastrear:**
- Models/schemas utilizados
- Conexões com banco de dados
- Middlewares aplicados
- Tratamento de erros
- Logs e monitoring
- Rate limiting

## Etapa 3: Verificação de Documentação Existente

### 3.1 Comparação com `@doc/documentação/`
**Processo:**
```bash
# Listar documentações existentes
ls @doc/documentação/*.md

# Para cada documentação:
# 1. Extrair nome da rota do arquivo
# 2. Verificar se página correspondente existe
# 3. Se não existir → marcar para exclusão
# 4. Se existir → comparar com análise atual
```

### 3.2 Ações por Cenário
- **Documentação existe + Página existe:** Atualizar documentação
- **Documentação existe + Página não existe:** Excluir documentação
- **Documentação não existe + Página existe:** Criar nova documentação
- **Mudanças na API:** Atualizar requests/responses

## Etapa 4: Template de Documentação

### 4.1 Estrutura Padrão
```markdown
# **nome:** [Nome da Página]
# **rota:** [/caminho/da/rota]

## **descrição:**
- [Descrição funcional da página]

## **tipo de acesso:**
- [público/protegido/admin]

## **funcionalidades embarcadas:**
- [Lista de funcionalidades]
- [Componentes principais]
- [Ações disponíveis]

## **restrições:**
- [Regras de acesso]
- [Validações]
- [Limitações]

## **dependências:**
- [Context/Providers utilizados]
- [Hooks customizados]
- [Bibliotecas externas]

## **APIs utilizadas:**

### **API Interna:**
- **Endpoint:** `[METHOD] /api/endpoint`
- **Autenticação:** [sim/não]
- **Request:**
```json
{
  "campo": "tipo (descrição)"
}
```
- **Response:**
```json
{
  "status": "success",
  "data": {}
}
```

### **API Externa:**
- **Serviço:** [Nome do serviço]
- **Endpoint:** `[URL completa]`
- **Autenticação:** [tipo]

## **Navegação:**
- **Links de entrada:** [páginas que redirecionam para esta]
- **Links de saída:** [páginas para onde esta redireciona]
- **Parâmetros de rota:** [se dinâmica]

## **Estados e Dados:**
- **Estados locais:** [useState, useReducer]
- **Estados globais:** [Context, Zustand, Redux]
- **Cache:** [React Query, SWR]
- **Persistência:** [localStorage, sessionStorage]

## **Validações:**
- **Formulários:** [schema de validação]
- **Inputs:** [regras específicas]
- **Permissões:** [baseado em roles]

## **Tratamento de Erros:**
- **Errors boundaries:** [componentes]
- **Try/catch:** [async operations]
- **Fallbacks:** [estados de erro]

## **Performance:**
- **Loading states:** [skeletons, spinners]
- **Lazy loading:** [componentes, imagens]
- **Memoization:** [useMemo, useCallback]

## **SEO/Meta:**
- **Title:** [título da página]
- **Description:** [meta description]
- **Keywords:** [palavras-chave]
```

## Etapa 5: Análise de Código Automatizada

### 5.1 Padrões de Identificação
**Buscar por:**
```regex
# Chamadas de API
fetch\(['"`]([^'"`]+)['"`]
axios\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]
api\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]

# Hooks de autenticação
useAuth|useUser|useSession

# Redirects e navegação
router\.push|redirect|navigate

# Validações
yup|zod|joi|validate

# Estados globais
useContext|useStore|useSelector
```

### 5.2 Extração de Metadados
**Para cada página:**
- Extrair imports e suas origens
- Identificar props interface (TypeScript)
- Mapear exports e re-exports
- Documentar comment blocks existentes
- Verificar metadata Next.js

## Etapa 6: Automação e Validação

### 6.1 Script de Análise
```javascript
// Pseudo-código para análise
const analyzeRoute = async (routePath) => {
  const pageFile = findPageFile(routePath);
  const components = extractComponents(pageFile);
  const apiCalls = extractApiCalls(pageFile, components);
  const restrictions = analyzeRestrictions(routePath);
  
  return {
    route: routePath,
    type: getRouteType(routePath), // public/protected
    components,
    apiCalls,
    restrictions,
    dependencies: extractDependencies(pageFile)
  };
};
```

### 6.2 Validação de Documentação
**Verificar:**
- Todas as rotas têm documentação
- Documentação órfã (sem página correspondente)
- APIs documentadas existem
- Schemas estão atualizados
- Links internos funcionam

## Etapa 7: Manutenção e Sincronização

### 7.1 Triggers para Atualização
- Novos arquivos `page.tsx` criados
- Modificações em APIs existentes
- Mudanças em interfaces TypeScript
- Alterações em middlewares
- Updates em dependências

### 7.2 Processo de Sincronização
1. **Scan incremental:** Detectar mudanças desde última execução
2. **Impact analysis:** Identificar documentações afetadas
3. **Auto-update:** Atualizar documentações impactadas
4. **Validation:** Verificar consistência
5. **Cleanup:** Remover documentações órfãs

## Etapa 8: Critérios de Qualidade

### 8.1 Completude
- [ ] Todas as rotas documentadas
- [ ] APIs mapeadas completamente
- [ ] Restrições claramente definidas
- [ ] Examples de request/response

### 8.2 Precisão
- [ ] Schemas atualizados
- [ ] Endpoints corretos
- [ ] Tipos TypeScript consistentes
- [ ] Links funcionais

### 8.3 Manutenibilidade
- [ ] Processo automatizado
- [ ] Documentação versionada
- [ ] Sincronização contínua
- [ ] Validação automática

---

**Saída esperada:** Documentação completa e atualizada de todas as rotas, com mapeamento preciso de APIs, restrições e fluxos de dados, mantida automaticamente em sincronia com o código.