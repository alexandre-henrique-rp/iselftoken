# Backlog do Produto

## Épicos
### Épico: Autenticação e A2F
**Valor de negócio:** Segurança e conformidade
**Estimativa:** 20 pts

- [ ] Expiração de código A2F e limite de tentativas - prioridade: alta
- [ ] Remover código A2F da resposta em produção - prioridade: alta

### Épico: Internacionalização
**Valor de negócio:** Alcance global
**Estimativa:** 13 pts

- [ ] Propagar i18n para todas as rotas públicas/protegidas - prioridade: alta
- [ ] Testes de consistência i18n - prioridade: média

## Bugs Conhecidos
- [ ] Garantir que layouts dinâmicos não quebrem cache em páginas estáticas - severidade: média

## Melhorias Técnicas
- [ ] Automatizar verificação de chaves i18n faltantes em CI
- [ ] Storybook para componentes UI
