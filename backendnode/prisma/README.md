# Prisma Seed

Este diretório contém o arquivo de seed para popular o banco de dados com dados iniciais.

## O que o seed cria?

### 1. Usuário Administrador

- **Email:** `admin@iselftoken.com`
- **Senha:** `1234`
- **Role:** `ADMIN`
- Dados pessoais completos (endereço, telefone, documentos fictícios)

### 2. Planos de Assinatura

#### AFILIADO

- **Preço:** R$ 85,00/ano
- **Visível:** Não (plano oculto)
- **Benefícios:**
  - Compra de tokens para investimento
  - Revenda de tokens adquiridos com lucro
  - Recompensa por indicação de novos investidores
  - Programa de afiliação com comissões progressivas

#### INVESTIDOR (Recomendado)

- **Preço:** R$ 50,00/ano
- **Visível:** Sim
- **Benefícios:**
  - Compra de tokens para investimento
  - Revenda de tokens adquiridos com lucro
  - Acesso dashboard de investimentos

#### FUNDADOR

- **Preço:** R$ 100,00/ano
- **Visível:** Sim
- **Benefícios:**
  - Compra de tokens para investimento
  - Revenda de tokens adquiridos com lucro
  - Cadastro de startups para captação de investimento
  - Acesso exclusivo a oportunidades de fundador

## Como executar o seed

### Método 1: Com Prisma CLI (Recomendado)

```bash
npx prisma db seed
```

### Método 2: Executar diretamente

```bash
npx ts-node prisma/seed.ts
```

### Método 3: Com reset completo do banco

⚠️ **ATENÇÃO:** Este comando vai apagar TODOS os dados do banco!

```bash
npx prisma migrate reset
```

## Notas Importantes

- O seed é **não destrutivo**: não executa `delete`, `deleteMany`, reset ou limpeza automática de dados existentes.
- Registros já existentes são preservados; a execução pode apenas criar itens ausentes ou sincronizar campos explicitamente definidos pelo seed.
- O seed principal é retomável após uma falha, desde que a causa da falha seja corrigida.
- A senha do admin é hasheada com bcrypt (10 rounds)
- Os planos usam JSON para armazenar os benefícios
- Se quiser alterar dados existentes, faça isso por uma migration ou operação administrativa explícita — não pelo seed.

## Estrutura do Arquivo

```bash
prisma/
├── schema.prisma       # Schema do banco de dados
├── seed.ts            # Script de seed
└── migrations/        # Histórico de migrações
```
