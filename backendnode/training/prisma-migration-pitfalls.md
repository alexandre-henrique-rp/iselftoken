---
title: "Prisma Migrations — Lições Aprendidas (Erros Reais)"
category: lesson
tags: [prisma, migration, mysql, debugging, database]
project: backendnode
created: 2026-07-13
author: orchestrator
severity: critical
---

# Prisma Migrations — Erros Reais e Como Evitá-los

## Contexto

Durante o refactor do módulo uploads, encontramos **5 erros encadeados** de migrations Prisma que consumiram ~30min de debug. Todos eram preveníveis com conhecimento adequado. Este documento documenta cada erro, sua causa raiz e a solução.

---

## Erro 1: Migrations Duplicadas no Histórico

### Sintoma

```
Migration `20260707231210_init` failed to apply cleanly.
Table 'User' already exists (error 1050)
```

### Causa Raiz

O projeto tinha **31 migrations antigas** (de Jan a Jun 2026) que criavam tabelas incrementalmente, E uma migration `20260707231210_init` que recriava **todas as tabelas de uma vez** (um "init paralelo"). Ambas as cadeias estavam no diretório `prisma/migrations/`.

### Por que aconteceu

Alguém gerou um `init` novo pensando em "limpar" o histórico, mas não removeu as migrations antigas. O Prisma aplica em ordem cronológica — quando chegava no `init` novo, as tabelas já existiam.

### Solução

1. Mover as 31 migrations antigas para **fora** do diretório `prisma/migrations/`
2. **Atenção:** prefixo `_skip_*` NÃO funciona — o Prisma conta todos os subdiretórios
3. Precisa mover para `/tmp` ou deletar

### Regra de Ouro

> **NUNCA crie um "init" novo para substituir migrations antigas.** Use `prisma migrate reset` para recomeçar do zero, ou delete as migrations antigas antes.

---

## Erro 2: `cuid()` no SQL Raw do MySQL

### Sintoma

```sql
You have an error in your SQL syntax near 'cuid(), startup_id VARCHAR...'
```

### Causa Raiz

A migration SQL usou `DEFAULT cuid()`:
```sql
`id` VARCHAR(191) NOT NULL DEFAULT cuid(),
```

**`cuid()` NÃO é função nativa do MySQL.** É uma função do Prisma Client que gera o ID no código (Node.js), não no banco.

### Padrão correto no Prisma

| Prisma Schema | Migration SQL |
|---|---|
| `@default(cuid())` | `VARCHAR(191) NOT NULL` **(sem DEFAULT!)** |
| `@default(uuid())` | `VARCHAR(191) NOT NULL DEFAULT (UUID())` |
| `@default(now())` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `@default(autoincrement())` | `INTEGER NOT NULL AUTO_INCREMENT` |

### Regra de Ouro

> **NUNCA use `DEFAULT cuid()` em migration SQL.** O CUID é gerado pelo Prisma Client. Se está escrevendo migration manualmente, omita o DEFAULT para campos `@default(cuid())`.

---

## Erro 3: Tabela Referenciada Não Criada (FK Orphan)

### Sintoma

```
Failed to open the referenced table 'digital_certificate' (error 1824)
```

### Causa Raiz

A migration `20260710171423` criava tabelas com FK para `digital_certificate`:
```sql
ALTER TABLE `signed_document` ADD CONSTRAINT `...`
  FOREIGN KEY (...) REFERENCES `digital_certificate`(`id`)
```

Mas a tabela `digital_certificate` **nunca foi criada** em nenhuma migration anterior.

### Por que aconteceu

O model `DigitalCertificate` foi adicionado ao schema mas a migration correspondente foi perdida (squash incorreto ou migration descartada).

### Solução

Adicionar o `CREATE TABLE` na migration anterior que deveria criá-la.

### Regra de Ouro

> **SEMPRE verifique que tabelas referenciadas por FK existem na cadeia de migrations.**

**Checklist antes de commitar migration com FK:**
```bash
# Listar tabelas que a migration referencia
grep "REFERENCES" prisma/migrations/NOVA_MIGRATION/migration.sql

# Verificar se cada tabela foi criada antes
for table in $(grep -oP 'REFERENCES `\K[^`]+' prisma/migrations/NOVA_MIGRATION/migration.sql); do
  grep -l "CREATE TABLE.*\`$table\`" prisma/migrations/*/migration.sql
done
```

---

## Erro 4: Shadow Database + Histórico Inconsistente

### Sintoma

```
Migration failed to apply cleanly to the shadow database. (P3006)
```

### Causa Raiz

`prisma migrate dev` cria um **banco shadow** temporário e aplica todas as migrations nele. Se QUALQUER migration falha no shadow, o comando trava.

### Solução

```bash
# Drop manual + deploy
npx prisma db execute --stdin <<< "
  DROP DATABASE IF EXISTS fintech_db;
  CREATE DATABASE fintech_db;
"
npx prisma migrate deploy

# Ou db push para dev (mais rápido)
npx prisma db push
```

### Regra de Ouro

> **Para dev, `db push` é mais rápido que `migrate deploy` quando o histórico está quebrado.**

---

## Erro 5: `_skip_*` e `_archived` Contam como Migration

### Sintoma

```
Could not find the migration file at migration.sql. (P3015)
```

### Causa Raiz

O Prisma conta **TODOS** os subdiretórios dentro de `prisma/migrations/`, incluindo `_skip_*` e `_archived`. Se eles não têm `migration.sql`, o Prisma falha.

### Solução

Mover para **fora** de `prisma/migrations/` (ex: `/tmp/`):
```bash
mv prisma/migrations/_archived /tmp/migrations_archived
```

### Regra de Ouro

> **Dentro de `prisma/migrations/`, só deve existir diretórios de migration + `migration_lock.toml`.** Nada de `_skip`, `_archived`, `_backup`.

---

## Checklist de Migrations (Antes de Commitar)

```bash
# 1. Verificar que schema está sincronizado
npx prisma migrate dev --create-only
# Deve dizer "No migration generated"

# 2. Verificar FKs
grep "REFERENCES" prisma/migrations/NOVA_MIGRATION/migration.sql

# 3. Verificar que NÃO há DEFAULT cuid() em SQL
grep -r "DEFAULT cuid()" prisma/migrations/
# Deve retornar vazio!

# 4. Verificar integridade do histórico
npx prisma migrate status
# Deve dizer "Database schema is up to date!"

# 5. Testar no shadow DB
npx prisma migrate dev
# Deve funcionar sem erros
```

---

## Fluxo Correto

```
Modelo no schema.prisma
        │
        ▼
prisma migrate dev --name minha_migration
        │
        ▼
Verificar migration.sql gerada:
  ✅ Sem DEFAULT cuid()
  ✅ FKs apontam para tabelas existentes
  ✅ Tipos corretos (VARCHAR, DATETIME(3), TEXT)
        │
        ▼
Commitar migration.sql + schema.prisma
        │
        ▼
npx prisma migrate status  → "up to date!"
```

---

## Referências

- [Prisma Migrations Docs](https://www.prisma.io/docs/orm/prisma-migrate)
- [P3006 Error](https://pris.ly/d/migrate-resolve)
- [P3015 Error](https://pris.ly/d/migrate-deploy)
- [P3018 Error](https://pris.ly/d/migrate-deploy)
