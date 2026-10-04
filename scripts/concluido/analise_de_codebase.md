# Análise, Comparação e Migração Incremental de Codebase

## 📌 Mapeamento de Repositórios

### **Repositório Base (Alvo da Migração)**
- `frontend`: `/home/kingdev/Documentos/GitHub/Iselftokenv2/frontend`
- `backend`: `/home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode`

### **Repositório Alterado (Fonte das Modificações)**
- `frontend`: `/home/kingdev/Documentos/GitHub/Iselftokenv2/ronaldo/frontend-main`
- `backend`: `/home/kingdev/Documentos/GitHub/Iselftokenv2/ronaldo/backendnode-main`
- `root`: `/home/kingdev/Documentos/GitHub/Iselftokenv2/ronaldo`

---

## 🚀 Prompt de Instrução para Agente / IA

Você atuará como um **Engenheiro de Software Principal** responsável por analisar, comparar e portar incrementalmente as alterações do **Repositório Alterado** para o **Repositório Base**.

---

### 🎯 **Objetivo Principal**
Identificar **todas as adições, melhorias, novas rotas, componentes, dependências e correções de bugs** presentes no `Repositório Alterado` em relação ao `Repositório Base` e **implementá-las de forma incremental** no `Repositório Base`, garantindo a estabilidade e sem sobrescrever código legítimo da base.

---

### 📋 **Diretrizes e Workflow de Execução**

#### **Fase 1: Auditoria e Mapeamento de Diferenças (Diff Audit)**
1. **Estrutura de Arquivos e Pastas**:
   - Compare as árvores de diretórios do `frontend` e do `backend` entre a fonte (Alterado) e o alvo (Base).
   - Identifique arquivos novos, deletados ou renomeados.
2. **Gerenciamento de Dependências**:
   - Compare `package.json` de ambos os repositórios (frontend e backend).
   - Identifique bibliotecas novas, atualizações de versões relevantes e scripts customizados.
3. **Mapeamento de Funcionalidades e APIs**:
   - **Backend**: Identifique novos endpoints, controladores, middlewares, serviços, rotas, schemas/modelos e variáveis de ambiente.
   - **Frontend**: Identifique novos componentes, páginas/rotas, hooks, contextos, estilos (CSS/Tailwind/Glassmorphism) e utilitários.

#### **Fase 2: Relatório de Impacto e Planejamento**
Apresente um plano claro contendo:
- 🟢 **Adições (Novas Features / Arquivos)**: O que existe apenas no Alterado e deve ser adicionado à Base.
- 🟡 **Modificações (Refatorações / Fixes)**: Trechos de código modificados que devem ser mesclados à Base.
- ⚙️ **Configurações e Env**: Dependências e variáveis de ambiente necessárias.
- ⚠️ **Riscos / Conflitos**: Pontos de atenção onde a Base e o Alterado possuem abordagens concorrentes.

#### **Fase 3: Implementação Incremental e Cirúrgica**
1. **Adição Incremental**:
   - Adicione os novos arquivos e recursos mantendo a estrutura arquitetural da Base.
   - Atualize `package.json` da Base apenas com as novas dependências necessárias (utilizando instalações limpas).
2. **Mesclagem Inteligente (Merge Cirúrgico)**:
   - Para arquivos modificados em ambos os lados, mescle as alterações preservando a lógica existente na Base e incorporando as novidades do Alterado.
   - **NÃO** remova comentários explicativos nem apague código funcional da Base sem justificativa técnica.
3. **Ajuste de Configurações**:
   - Atualize arquivos de ambiente (`.env.example`), rotas e arquivos de exportação/indexação.

#### **Fase 4: Validação, Testes e Qualidade**
1. **Verificação de Compilação e Erros**:
   - Execute checagens de tipagem e build no Frontend e Backend.
2. **Testes de Unidade / Regressão**:
   - Escreva ou execute testes de unidade para assegurar que as novas funcionalidades integradas funcionem perfeitamente e não quebrem o código existente.
3. **Padrões de Qualidade e SEO**:
   - Garanta que as páginas Frontend sigam boas práticas visuais e de SEO (meta tags, HTML semântico, acessibilidade e IDs únicos).

---

### 🛡️ **Restrições Obrigatórias (Guardrails)**
- ❌ **Não sobrescreva o Repositório Base completamente**: A migração deve ser estritamente incremental e auditada.
- 💬 **Preserve Comentários**: Não remova comentários explicativos existentes na base de código.
- 🇧🇷 **Idioma**: Toda a análise, planejamento e comunicação devem ser realizados em Português Brasileiro.
- 🧪 **Garantia de Testes**: Escreva ou execute testes de unidade para verificar a estabilidade das novas implementações.
 