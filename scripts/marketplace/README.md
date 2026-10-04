# Marketplace

Documentação do módulo de marketplace da iSelfToken.

## 📁 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `marketplace.md` | Especificação de regras básicas de exibição de startups nas páginas "/" e "/home" |
| `PRD_MARKETPLACE_REGRAS.md` | PRD de análise com racional detalhado, diagnóstico do estado atual e algoritmo proposto |
| `PRD_MARKETPLACE_IMPL.md` | PRD de implementação técnica com contratos de API, migration Prisma e sequência de sprints |

## 🔄 Fluxo de Documentação

```
marketplace.md (regras básicas)
    ↓
PRD_MARKETPLACE_REGRAS.md (análise + racional)
    ↓
PRD_MARKETPLACE_IMPL.md (plano de execução técnica)
    ↓
backendnode/docs/migration-marketplace-pin-spec.md (spec detalhada da migration)
```

## 📋 Contexto

O módulo marketplace é responsável por listar startups nas páginas públicas e autenticadas, obedecendo critérios de exibição e regras individuais para cada seção:

### Seção "/"
- Rodadas em Destaque
- Recém-Adicionadas
- Oportunidades de Investimento

### Seção "/home"
- Rodadas Quentes
- Acesso Antecipado
- Todas as Rodadas Abertas
- Picks da Semana
- Startups por Categorias

## 🎯 Objetivo

Criar uma única regra de posicionamento que seja:
1. **Transparente** — founder entende olhando o painel dele
2. **Educacional** — founder sabe exatamente o que fazer para subir
3. **Auditável** — DPO/Compliance conseguem explicar qualquer posição
4. **Justa** — combina "qualidade automática" + "human-curated"
5. **Estável** — não oscila diariamente, founder consegue planejar
