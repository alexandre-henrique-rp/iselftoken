# SKIP LOCKED para geração de tokens: quando faz sentido substituir o Redis

## Contexto

Este documento resume um padrão de arquitetura para sistemas que precisam
**gerar ou reservar um recurso durante o processamento de um pagamento**,
confirmando (ou descartando) esse recurso apenas quando o pagamento é
aprovado. É o mesmo problema que a Shopify resolveu para reservas de
estoque, aplicado aqui a geração de tokens.

Referência original: [Shopify Engineering — We replaced Redis with MySQL
for inventory reservations](https://shopify.engineering/scaling-inventory-reservations)

---

## 1. Dois problemas diferentes que o Redis resolve

Antes de decidir se dá para substituir o Redis, é importante separar dois
usos que costumam ser confundidos:

### a) Redis como coordenador de concorrência (mutex, reservas, filas)
Problema: "como evito que duas transações concorrentes peguem o mesmo
recurso ao mesmo tempo?"

➡️ **Isso pode ser resolvido nativamente pelo banco relacional**, com
`SELECT ... FOR UPDATE SKIP LOCKED` (MySQL 8+ ou PostgreSQL 9.5+).

### b) Redis como cache (leitura rápida, TTL, reduzir carga do banco)
Problema: "como sirvo leituras rápidas sem bater no banco toda hora, com
expiração automática?"

➡️ **`SKIP LOCKED` não resolve isso.** Não tem TTL, não é in-memory, não
desacopla a carga de leitura do banco principal. Para cache, Redis
continua sendo a ferramenta certa.

O caso de geração de tokens amarrada a confirmação de pagamento se
encaixa no grupo **(a)** — é coordenação de concorrência, não cache.

---

## 2. O padrão Reserve → Claim → Release

| Etapa | Quando acontece | O que faz |
|---|---|---|
| **Reserve** | Início da compra (antes de saber se paga) | Separa um token/slot do pool, associa à compra |
| **Claim** | Pagamento confirmado (webhook) | Torna o token válido/ativo definitivamente |
| **Release** | Pagamento falhou ou expirou | Devolve o slot ao pool, sem deixar lixo |

A vantagem central: reserva e confirmação ficam **no mesmo banco**, dentro
de transações ACID. Isso elimina a classe de bugs que existe quando
reserva vive em um sistema (Redis) e o estado definitivo vive em outro
(banco relacional) — cenários onde o pagamento é aprovado mas o token não
é gerado, ou vice-versa.

---

## 3. Schema de exemplo

```sql
CREATE TABLE token_pool (
    id          BIGINT AUTO_INCREMENT,
    status      ENUM('available','reserved','claimed') DEFAULT 'available',
    purchase_id BIGINT NULL,
    PRIMARY KEY (id)
);
```

### Reserve (início da compra)

```sql
SELECT id FROM token_pool
WHERE status = 'available'
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE token_pool
SET status = 'reserved', purchase_id = ?
WHERE id = ?;
```

`SKIP LOCKED` garante que, se outra transação concorrente já travou uma
linha, o banco simplesmente pula para a próxima disponível — sem fila,
sem espera pela mesma linha.

### Claim (webhook de pagamento confirmado)

```sql
UPDATE token_pool
SET status = 'claimed'
WHERE id = ? AND purchase_id = ?;

-- gerar o valor real do token aqui, na mesma transação
```

### Release (pagamento falhou/expirou)

```sql
UPDATE token_pool
SET status = 'available', purchase_id = NULL
WHERE id = ? AND purchase_id = ?;
```

---

## 4. Antes de implementar: duas perguntas

### Existe contenção real?
O padrão de pool com `SKIP LOCKED` só compensa quando há **muitas
compras simultâneas competindo pelo mesmo recurso limitado**. Se o volume
é baixo, um simples fluxo `INSERT status='pending'` → `UPDATE
status='confirmed'` no webhook já resolve, sem a complexidade extra.

### O token é escasso ou só precisa de estado?
- **Escasso** (ex: cupom com quantidade limitada) → o padrão de pool com
  `SKIP LOCKED` se aplica.
- **Não escasso** (ex: identificador gerado sempre via UUID, o problema
  é só controlar `pending → confirmed`) → não precisa de pool nem de
  `SKIP LOCKED`. Um `UPDATE` simples de status resolve.

---

## 5. MySQL vs PostgreSQL

| Aspecto | MySQL (InnoDB) | PostgreSQL |
|---|---|---|
| `SKIP LOCKED` desde | 8.0 (2018) | 9.5 (2016) |
| Isolamento padrão | `REPEATABLE READ` | `READ COMMITTED` |
| Gap locks | Existem — podem travar reabastecimento do pool em tabela vazia | Não existem (MVCC puro) |

No Postgres, o padrão migra quase 1:1 e você evita de largada um dos
problemas que a Shopify teve (gap locks bloqueando o reabastecimento do
pool em `REPEATABLE READ`), já que `READ COMMITTED` já é o padrão.

---

## 6. Resumo

- Se o problema é **concorrência/coordenação** (não vender o mesmo token
  duas vezes, não confirmar duas vezes o mesmo pagamento) → `SKIP LOCKED`
  no MySQL/Postgres é um substituto real e mais seguro que Redis, porque
  reserva e confirmação ficam na mesma transação ACID.
- Se o problema é **cache/leitura rápida** → Redis continua sendo a
  ferramenta certa; trocar por banco relacional tende a devolver carga
  exatamente para onde o cache existia para tirar.
- Avalie volume de concorrência e se o recurso é realmente escasso antes
  de adotar o padrão de pool — para baixo volume, um fluxo simples de
  status já resolve.