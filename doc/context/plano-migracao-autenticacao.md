# Plano de Migração para Solução Própria de Autenticação - iSelfToken

## Objetivo

Documentar os passos necessários para migrar da solução atual de autenticação baseada em Firebase Authentication para uma solução própria de autenticação com banco de dados local no projeto iSelfToken.

## Contexto Atual

- **Provedor Atual**: Firebase Authentication, integrado via adaptador na camada de infraestrutura (`src/infrastructure/auth/firebase-adapter.ts`).
- **Arquitetura**: Segue Clean Architecture, com interface `AuthService` que permite substituição de provedores.
- **Endpoints**: Autenticação gerenciada em `src/app/api/auth/route.ts`, utilizando o adaptador.

## Motivações para Migração

- **Controle de Dados**: Armazenar dados de usuários localmente para conformidade com regulamentações como LGPD.
- **Personalização**: Adaptar fluxos de autenticação e papéis além das capacidades do Firebase.
- **Custo**: Reduzir despesas recorrentes com serviços externos.

## Passos para Migração

### 1. Planejamento e Design
- **Definir Requisitos**: Levantar necessidades específicas de autenticação (MFA, recuperação de senha, etc.).
- **Modelagem de Domínio**: Usar DDD para modelar entidades de usuário e autenticação na camada de domínio.
- **Escolha de Tecnologias**: Banco de dados relacional como PostgreSQL, ORM como Prisma, hashing com `bcrypt`.

### 2. Configuração de Infraestrutura
- **Banco de Dados**: Configurar PostgreSQL com schema para usuários e sessões.
- **Variáveis de Ambiente**: Definir variáveis para conexão com banco e segredos JWT.

### 3. Implementação do Novo Adaptador
- **Criar Adaptador Próprio**: Implementar `AuthService` em `src/infrastructure/auth/local-adapter.ts`.

### 4. Testes e Validação
- **Testes TDD**: Criar testes unitários e de integração para o novo adaptador.
- **Migração Gradual**: Implementar coexistência temporária entre Firebase e solução própria.

### 5. Atualização de Documentação
- **Documentar Mudanças**: Atualizar `doc/documentação/api-auth.md` com detalhes da solução própria.

## Riscos e Mitigações

- **Risco de Segurança**: Garantir hashing forte e proteção contra ataques como injeção de SQL.
- **Downtime**: Planejar migração em janela de baixa utilização ou com coexistência de sistemas.

## Conclusão

Este plano fornece uma visão geral para a migração a uma solução própria de autenticação, mantendo alinhamento com Clean Architecture, DDD e SOLID, garantindo controle total sobre os dados e personalização para o iSelfToken.
